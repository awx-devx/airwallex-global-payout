# 04 — Airwallex Integration

The UI never sees these payloads. Services call the adapter. The adapter returns [03](./03-contracts.md) types. Field names below are Airwallex's. If a smoke test (V1–V12) disagrees with this file, record the response and update both files in the same commit.

Base URL: `AIRWALLEX_BASE_URL`. Every call except login sends `Authorization: Bearer <token>` and `x-api-version: ${AIRWALLEX_API_VERSION}`.

## 1. Client

`src/server/adapters/airwallex/client.ts` is the only `fetch` to Airwallex.

- Login: `POST /api/v1/authentication/login` with headers `x-client-id` and `x-api-key`. Cache the token. Refresh 60 seconds before `expires_at`, single-flight. On 401, log in once and retry the call once.
- Rate limit: 15 requests/second global, 8 per endpoint path. Retry `429`, `5xx`, and timeouts with exponential backoff and jitter, up to 5 attempts.
- **Never retry a create or add-items without the same `request_id`.**
- Parse bodies losslessly: Airwallex sends amounts as JSON numbers. Convert them to decimal strings at the boundary. Do not `JSON.parse` a body and then do arithmetic on the numbers.
- Throw `AirwallexError { status, code, message, source, fieldErrors, traceId }`. Log method, path, status, `trace_id`, latency, and `runId`. Redact the API key, the bearer token, account numbers, IBANs, and routing values.

## 2. Id builders

```
batch:  b:{runId}                  # 38 chars
local:  i:{runId}:{rowIndex}:L     # rowIndex is 1..25
swift:  i:{runId}:{rowIndex}:S
```

`runId` is a UUID. All three fit the 64-character `request_id` limit. The winner keeps the id it was probed with. Deleted probes are not reused.

Metadata on every item: `{ "row": "<rowIndex>", "candidate": "L" | "S" }`.

Batch metadata: `{ "run_id": "<runId>" }`.

## 3. Calls in order

### 3.1 Create

`POST /api/v1/batch_transfers/create`

```json
{
  "request_id": "b:{runId}",
  "name": "{fileName}",
  "metadata": { "run_id": "{runId}" }
}
```

Do not send `funding_source` (wallet default). Do not send `transfer_date`.

Expect `status: DRAFTING`, `id`, `short_reference_id`.

### 3.2 Add probes

`POST /api/v1/batch_transfers/{id}/add_items`

Up to 100 items per call. We send at most 50 (25 × 2).

Each item:

| Field | Value |
| --- | --- |
| `request_id` | builder |
| `transfer_method` | `LOCAL` or `SWIFT` |
| `source_currency` | `SOURCE_CURRENCY` |
| `transfer_currency` | CSV currency |
| `transfer_amount` | CSV amount, string, at currency precision |
| `reason` | `wages_salary` |
| `reference` | `PAY-{rowIndex}` (statement text) |
| `fee_paid_by` | `PAYER` |
| `swift_charge_option` | `PAYER` on SWIFT items only |
| `metadata` | row + candidate |
| `beneficiary.entity_type` | `PERSONAL` |
| `beneficiary.first_name` / `last_name` | split name |
| `beneficiary.additional_info.personal_email` | email |
| `beneficiary.date_of_birth` | CSV date (drop if V8 says the schema rejects it — Q-02) |
| `beneficiary.address` | street, city, state, postcode, country_code |
| `beneficiary.bank_details.account_name` | full contractor name |
| `beneficiary.bank_details.account_currency` | CSV currency |
| `beneficiary.bank_details.bank_country_code` | CSV country |
| bank fields | corridor table in [03](./03-contracts.md) |

Do not set `local_clearing_system` on the local probe. Do not set `quote_id` on items; the batch quote covers them.

Add-items returns counts, not the per-item draft. Always follow with list.

### 3.3 List, choose, delete

`GET /api/v1/batch_transfers/{id}/items?page_size=1000`

Item fields we read:

| Airwallex | Contract |
| --- | --- |
| `id` | stored on the probe so we can delete it; not shown in the UI |
| `request_id`, `metadata.row`, `metadata.candidate` | match to a row |
| `status` | `VALIDATED` or `VALIDATION_FAILED` while drafting |
| `errors[].code`, `errors[].source` | mapped through [03 §7](./03-contracts.md#7-airwallex-path--csv-path) |
| `transfer_draft.amount_payer_pays` | `amountPayerPays` |
| `transfer_draft.amount_beneficiary_receives` | `amountBeneficiaryReceives` |
| `transfer_draft.fee_amount` | `feeAmount` |
| `transfer_draft.fee_currency` | `feeCurrency` |
| `transfer_draft.source_currency` | `sourceCurrency` |
| `transfer_draft.transfer_currency` | `transferCurrency` |
| `transfer_draft.transfer_method` | `transferMethod` |
| `transfer_draft.beneficiary.bank_details.local_clearing_system` | `localClearingSystem` or null |
| `transfer_draft.short_reference_id` | `shortReference` |

`POST /api/v1/batch_transfers/{id}/delete_items` with `{ "item_ids": ["..."] }` while `DRAFTING`. Delete every loser and every `VALIDATION_FAILED` probe. A row whose remaining probes are all failures becomes `needs_fix` and is not in the quote.

### 3.4 Quote

`POST /api/v1/batch_transfers/{id}/quote` with `{ "validity": "HR_1" }`.

If Airwallex rejects `HR_1`, retry once with `MIN_15` and record that in Q-01. Map `quote_summary` to `QuoteSummary`. Sum line `amount_payer_pays` into `payerPays` (same source currency). `client_rate` null means no conversion (USD→USD).

### 3.5 Pay

Before submit, `GET /api/v1/balances/current`. Require `available_amount` for `SOURCE_CURRENCY` ≥ `quote.payerPays`. Otherwise return `INSUFFICIENT_BALANCE` and set the flag. Do not submit.

`POST /api/v1/batch_transfers/{id}/submit` with an empty JSON body.

Then `GET` the batch and items and map statuses (section 4).

### 3.6 Later reads

`GET /api/v1/batch_transfers/{id}` on each poll.

`GET /api/v1/transfers/{transferId}` once an item is `BOOKED` and we have an id.

Q-03: the list-item field that becomes `transferId` is unconfirmed. The mapper checks, in order: `transfer_id`, `transfer_draft.id` after booking, then a lookup the smoke test records. The DTO field stays `transferId`.

### 3.7 Discard

`POST /api/v1/batch_transfers/{id}/delete` only while our status is `PRICING` or `READY` (Airwallex `DRAFTING`). Then mark `DISCARDED`.

### 3.8 Simulation

`POST /api/v1/simulation/transfers/{id}/transition` with `{ "next_status": "PROCESSING" | "SENT" | "PAID" | "FAILED" }`.

```ts
// SANDBOX: forces the next transfer status. The endpoint does not exist in production.
// PROD: wait for webhooks and retrieve.
```

Throw if `AIRWALLEX_ENV !== 'sandbox'`. Only the demo advance service calls this.

## 4. Status map

Batch `airwallexStatus` is stored verbatim.

| Item `status` | Transfer status | `RowStatus` |
| --- | --- | --- |
| `VALIDATION_FAILED` | — | `needs_fix` |
| `VALIDATED` | — | `ready` |
| `BOOKING` | — | `booking` |
| `BOOKING_FAILED` | — | `booking_failed` |
| `BOOKED` | none yet, or `SCHEDULED`, `PROCESSING`, `IN_APPROVAL`, `OVERDUE` | `processing` |
| `BOOKED` | `SENT` | `sent` |
| `BOOKED` | `PAID` | `paid` |
| `BOOKED` | `FAILED` | `failed` |
| `BOOKED` | `CANCELLED` | `cancelled` |

Our parser `invalid` and user `excluded` are not Airwallex statuses. They are never overwritten by a poll.

Transfer `FAILED` stays `failed` even if a later event says `CANCELLED`.

## 5. Webhooks

Optional. Route `POST /api/webhooks/airwallex`.

- Read `await req.text()`. Verify HMAC-SHA256 of `x-timestamp + rawBody` with `AIRWALLEX_WEBHOOK_SECRET` using `crypto.timingSafeEqual`. Timestamp tolerance 5 minutes. Invalid → 400.
- Insert `{ _id: event.id }` in `webhook_events`. Duplicate key → 200, stop.
- Handle `payout.batch_transfers.*` and `payout.transfer.*` whose batch or transfer id we stored. Apply the same mapper as retrieve. Return 200.
- Ignore events for unknown ids with 200.

Polling remains correct if no webhook is configured.

## 6. Reason and payer

`reason` is `wages_salary` ([reason list](https://www.airwallex.com/docs) as recorded in the FX demo's contract notes: `audio_visual_services`, `bill_payment`, `business_expenses`, `construction`, `donation_charitable_contribution`, `education_training`, `freight`, `goods_purchased`, `investment_capital`, `investment_proceeds`, `living_expenses`, `loan_credit_repayment`, `medical_services`, `pension`, `professional_business_services`, `real_estate`, `taxes`, `technical_services`, `transfer_to_own_account`, `travel`, `wages_salary`, `other_services`). Israel-registered payers use a different list; out of scope.

We do not send `payer` or `payer_id`. The account on the API key is the payer.

## 7. Mock gateway

`PAYMENTS_GATEWAY=mock` implements the same service methods against the fixtures in [03 §8](./03-contracts.md#8-fixtures-the-kit-and-the-mock-both-use). `pnpm test` uses it. No network.
