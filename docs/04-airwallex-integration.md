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

A second create with the same `request_id` returns HTTP 400 `batch_request_id_duplicate` and does not include the existing batch id. It does not create a second batch. Load the existing batch with `GET /api/v1/batch_transfers?request_id={request_id}` and continue with that `id`. [List batch transfers](https://www.airwallex.com/docs/api/payouts/batch_transfers/list).

Metadata on every item: `{ "row": "<rowIndex>", "candidate": "L" | "S" }`. After a quote, that object is on `transfer_draft.metadata`, not on the list item itself. The `request_id` still encodes the row and the candidate.

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

Do not send `funding_source` (wallet default). Do not send `transfer_date`. The create response may still echo `transfer_date` as today. That echo is not a field we send.

Expect `status: DRAFTING`, `id`, `short_reference_id`. `total_item_count` and `valid_item_count` are on the batch. Login returns HTTP 201.

### 3.2 Add probes

`POST /api/v1/batch_transfers/{id}/add_items`

Up to 100 items per call. We send at most 50 (25 × 2).

Each item:

| Field                                            | Value                                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `request_id`                                     | builder                                                                                                                |
| `transfer_method`                                | `LOCAL` or `SWIFT`                                                                                                     |
| `source_currency`                                | `SOURCE_CURRENCY`                                                                                                      |
| `transfer_currency`                              | CSV currency                                                                                                           |
| `transfer_amount`                                | CSV amount, string, at currency precision                                                                              |
| `reason`                                         | `wages_salary`                                                                                                         |
| `reference`                                      | `PAY-{rowIndex}` (statement text)                                                                                      |
| `fee_paid_by`                                    | `PAYER`                                                                                                                |
| `swift_charge_option`                            | `PAYER` on SWIFT items only                                                                                            |
| `metadata`                                       | row + candidate                                                                                                        |
| `beneficiary.entity_type`                        | `PERSONAL`                                                                                                             |
| `beneficiary.first_name` / `last_name`           | split name                                                                                                             |
| `beneficiary.additional_info.personal_email`     | email                                                                                                                  |
| `beneficiary.date_of_birth`                      | CSV date. The schema marks it optional. Sending it was accepted                                                        |
| `beneficiary.address`                            | street, city, postcode, country_code. `state` is `US-XX` or `AU-XX`. Omit an empty state. IN `KA` was accepted as sent |
| `beneficiary.bank_details.account_name`          | full contractor name                                                                                                   |
| `beneficiary.bank_details.account_currency`      | CSV currency                                                                                                           |
| `beneficiary.bank_details.bank_country_code`     | CSV country                                                                                                            |
| `beneficiary.bank_details.bank_account_category` | `Checking` on US items. The CSV has no column for it                                                                   |
| bank fields                                      | corridor table in [01](./01-feasibility-airwallex.md)                                                                  |

Do not set `local_clearing_system` on the local probe. Do not send `iban` on a local item that already has `account_number` (GB). DE local is IBAN-only, so the IBAN stays. Do not set `quote_id` on items; the batch quote covers them.

Add-items returns counts, not the per-item draft. Always follow with list.

### 3.3 List, choose, delete

Quote first. `GET /api/v1/batch_transfers/{id}/items?page_size=1000` before a quote returns `id`, `request_id`, `status`, `updated_at`, and `errors` on failures. `transfer_draft` appears after the quote.

Item fields we read after that quote:

| Airwallex                                                                        | Contract                                                                                                                                             |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                                             | stored on the probe so we can delete it; not shown in the UI                                                                                         |
| `request_id`, `transfer_draft.metadata.row`, `transfer_draft.metadata.candidate` | match to a row. Fall back to parsing `request_id`                                                                                                    |
| `status`                                                                         | `VALIDATED` or `VALIDATION_FAILED` while drafting                                                                                                    |
| `errors[].code`, `errors[].source`                                               | mapped through [03 §7](./03-contracts.md#7-airwallex-path--csv-path)                                                                                 |
| `transfer_draft.amount_payer_pays`                                               | `amountPayerPays`                                                                                                                                    |
| `transfer_draft.amount_beneficiary_receives`                                     | `amountBeneficiaryReceives`                                                                                                                          |
| `transfer_draft.fee_amount`                                                      | `feeAmount`                                                                                                                                          |
| `transfer_draft.fee_currency`                                                    | `feeCurrency`                                                                                                                                        |
| `transfer_draft.source_currency`                                                 | `sourceCurrency`                                                                                                                                     |
| `transfer_draft.transfer_currency`                                               | `transferCurrency`                                                                                                                                   |
| `transfer_draft.transfer_method`                                                 | `transferMethod`                                                                                                                                     |
| `transfer_draft.beneficiary.bank_details.local_clearing_system`                  | `localClearingSystem` or null. Empty for DE/EUR (shown as SEPA) and for IN/INR. US echoes `ACH`, GB `FASTER_PAYMENTS`, AU `BANK_TRANSFER`, SG `FAST` |
| `transfer_draft.short_reference_id`                                              | `shortReference`                                                                                                                                     |

`POST /api/v1/batch_transfers/{id}/delete_items` with `{ "item_ids": ["..."] }` while `DRAFTING`. Delete every loser and every `VALIDATION_FAILED` probe. `valid_item_count` drops with `total_item_count`. A row whose remaining probes are all failures becomes `needs_fix` and is not in the quote.

### 3.4 Quote

`POST /api/v1/batch_transfers/{id}/quote` with `{ "validity": "HR_1" }`.

`HR_1` is accepted on this sandbox account. `expires_at` uses an offset of `+0000`; normalize it to ISO before it hits a contract timestamp. A same-currency line omits `client_rate` and `currency_pair`. Treat a missing `client_rate` as null. Amounts arrive as JSON numbers and may be `4225`, `4200.0`, or `0`; the lossless parser plus `toMoneyString` restores payout precision.

The first quote exists so list items grow a `transfer_draft`. After losers are deleted, quote again. Map that second `quote_summary` to `QuoteSummary`. Sum line `amount_payer_pays` into `payerPays` (same source currency).

If a future account rejects `HR_1`, retry once with `MIN_15`.

### 3.5 Pay

Before submit, `GET /api/v1/balances/current`. Require `available_amount` for `SOURCE_CURRENCY` ≥ `quote.payerPays`. Otherwise return `INSUFFICIENT_BALANCE` and set the flag. Do not submit.

`POST /api/v1/batch_transfers/{id}/submit` with an empty JSON body.

Then `GET` the batch and items and map statuses (section 4).

### 3.6 Later reads

`GET /api/v1/batch_transfers/{id}` on each poll.

`GET /api/v1/transfers/{transferId}` once an item is `BOOKED` and we have an id.

After `BOOKED`, the list item's `transfer_id` is the transfer id. `transfer_draft` is no longer on the item. `GET /api/v1/transfers/{id}` returns the transfer status.

### 3.7 Discard

`POST /api/v1/batch_transfers/{id}/delete` only while our status is `PRICING` or `READY` (Airwallex `DRAFTING`). Then mark `DISCARDED`.

### 3.8 Simulation

`POST /api/v1/simulation/transfers/{id}/transition` with `{ "next_status": "PROCESSING" | "SENT" | "PAID" | "FAILED" }`.

From `PROCESSING`, `SENT` then `PAID` reaches `PAID`. A direct `PAID` while the transfer was `PROCESSING` returned HTTP 500 `operation_failed`.

```ts
// SANDBOX: forces the next transfer status. The endpoint does not exist in production.
// PROD: wait for webhooks and retrieve.
```

Throw if `AIRWALLEX_ENV !== 'sandbox'`. Only the demo advance service calls this.

### 3.9 Beneficiary schema (smoke only)

`POST /api/v1/beneficiary_api_schemas/generate`

[API schema](https://www.airwallex.com/docs/payouts/beneficiaries/using-api-and-form-schemas.md). `pnpm airwallex:smoke` calls this for Q-02. Pricing does not. Do not send `x-on-behalf-of`.

```json
{
  "account_currency": "USD",
  "bank_country_code": "US",
  "country_code": "US",
  "entity_type": "PERSONAL",
  "transfer_method": "LOCAL"
}
```

Omit `local_clearing_system` so the response is the default local schema. Read `fields[].path` and `fields[].required`.

## 4. Status map

Batch `airwallexStatus` is stored verbatim.

| Item `status`       | Transfer status                                                  | `RowStatus`      |
| ------------------- | ---------------------------------------------------------------- | ---------------- |
| `VALIDATION_FAILED` | —                                                                | `needs_fix`      |
| `VALIDATED`         | —                                                                | `ready`          |
| `BOOKING`           | —                                                                | `booking`        |
| `BOOKING_FAILED`    | —                                                                | `booking_failed` |
| `BOOKED`            | none yet, or `SCHEDULED`, `PROCESSING`, `IN_APPROVAL`, `OVERDUE` | `processing`     |
| `BOOKED`            | `SENT`                                                           | `sent`           |
| `BOOKED`            | `PAID`                                                           | `paid`           |
| `BOOKED`            | `FAILED`                                                         | `failed`         |
| `BOOKED`            | `CANCELLED`                                                      | `cancelled`      |

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
