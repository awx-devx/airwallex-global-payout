# 01 — Feasibility (Airwallex)

Verdict: **yes, with a draft batch as the price probe.** Airwallex Batch Transfers is the product that matches this demo. There is no public "compare rails" endpoint and no CSV upload endpoint. We parse the CSV ourselves and use the batch API.

Sources checked while writing this pack:

- [Create a batch transfer](https://www.airwallex.com/docs/payouts/batch-transfers/create-a-batch-transfer.md)
- [Batch transfer statuses](https://www.airwallex.com/docs/payouts/batch-transfers/create-a-batch-transfer/batch-transfer-statuses.md)
- [Create a batch transfer (API)](https://www.airwallex.com/docs/api/payouts/batch_transfers/create.md)
- [Validate a transfer](https://www.airwallex.com/docs/payouts/transfers/validate-a-transfer.md)
- [Currency precision](https://www.airwallex.com/docs/payouts/how-airwallex-payouts-work/currency-precision.md)
- Country payout guides for [United States](https://www.airwallex.com/docs/payouts/payout-network/united-states), [United Kingdom](https://www.airwallex.com/docs/payouts/payout-network/bank-accounts/united-kingdom), [India](https://www.airwallex.com/docs/payouts/payout-network/bank-accounts/india), [Singapore](https://www.airwallex.com/docs/payouts/payout-network/bank-accounts/singapore)
- [Payout webhook events](https://www.airwallex.com/docs/developer-tools/webhooks/listen-for-webhook-events/transfers)
- [Sandbox payouts](https://www.airwallex.com/docs/developer-tools/sandbox-environment/payouts.md)

## What we use

| Need | Airwallex | Notes |
| --- | --- | --- |
| Auth | `POST /api/v1/authentication/login` | Client id + API key. Cache the token. |
| One debit, many payouts | Batch Transfers | Create → add items → quote → submit. |
| Price a rail before paying | Add items while status is `DRAFTING`, read `transfer_draft.amount_payer_pays` and `fee_amount` from List items | Validate does **not** return fees. Money moves at submit, not at add. |
| Drop the expensive rail | `POST /batch_transfers/{id}/delete_items` | Only while `DRAFTING`. |
| Lock FX for the review screen | `POST /batch_transfers/{id}/quote` | Optional on the API. We always quote before showing Pay. |
| Pay | `POST /batch_transfers/{id}/submit` | Valid items only. Invalid items are excluded by Airwallex if we left them; we do not leave them. |
| Wallet balance | `GET /api/v1/balances/current` | Pre-flight before submit. |
| Progress | `GET /batch_transfers/{id}` and `GET .../items`, then `GET /api/v1/transfers/{id}` | Webhooks are an accelerator, not the only path. |
| Stage the demo | `POST /api/v1/simulation/transfers/{id}/transition` | Sandbox only. |

`transfer_method` is `LOCAL` or `SWIFT`. Local scheme (ACH, Faster Payments, FAST, …) is `beneficiary.bank_details.local_clearing_system`. When it is omitted, Airwallex picks the default local scheme for that corridor.

## Cheapest-rail procedure

Documented as the implementation, not as an Airwallex feature name:

1. Create a wallet-funded batch. Do not send `funding_source`. Do not send `transfer_date` (setting it, even to today, switches the batch onto scheduled-transfer logic).
2. For each valid row add up to two items: default local (`transfer_method: LOCAL`, no `local_clearing_system`) and SWIFT. Skip SWIFT when the currency is not in the SWIFT list for that country. INR is the sample case.
3. List items. Among `VALIDATED` candidates for the row, keep the lowest `amount_payer_pays`. Tie-break: lower `fee_amount`, then `LOCAL` before `SWIFT`.
4. Delete the losers.
5. Quote. The Pay button shows the quote total.
6. Submit only after the user presses Pay, and only before `expires_at`.

Amounts on a draft are what we show. Airwallex confirms the rate when the batch becomes `SCHEDULED` if an approval flow re-quotes. With approval off, the quote we submit is the rate.

## Constraints that shape the demo

| Constraint | Consequence |
| --- | --- |
| Max 100 items per add call, 1,000 per batch | Demo cap is 25 rows × 2 probes. |
| `request_id` required, deduped | Stable ids. A retry must not create a second batch or a second item. |
| Fees and FX are account-specific | The UI renders returned decimals. Fixtures are illustrative and labelled as fixtures. |
| `Validate a transfer` returns 200 or field errors, not a price | Do not use it as the price source. |
| Approval statuses exist (`IN_APPROVAL`, …) | Sandbox workflow must be off (D-06). The UI still has a banner for `IN_APPROVAL` so a misconfigured account is visible. |
| Item status stops at `BOOKED` | "Paid" is the underlying transfer status, read after booking. |
| Personal beneficiaries | Country guides specify bank fields. Extra schema fields (date of birth is in our CSV) are confirmed in B2 (Q-02). |
| Currency precision | Follow the payouts table, not a guess. Demo currencies are all 2 dp. `currencies.ts` still carries 0 dp and 3 dp entries so formatters are correct if a fixture uses JPY. |
| Sandbox simulation | Transfer transition endpoint only. Tag callers `SANDBOX:`. |

## Corridor facts used to draw the sample

These are from the country guides. B2 records the raw schema response; if a guide and the schema disagree, the schema wins and [03](./03-contracts.md) is updated.

| Corridor | Local | SWIFT in the same currency | Bank fields we send |
| --- | --- | --- | --- |
| US / USD | Default local is ACH | Yes | `account_number`, `routing_type=aba`, `routing_value` (9 digits), `swift_bic` |
| GB / GBP | Default local is Faster Payments | Yes | `account_number` (8), `routing_type=sort_code`, `routing_value` (6), `iban`, `swift_bic` |
| DE / EUR | Local (displayed as SEPA when the system comes back empty) | Yes | `iban`, `swift_bic` |
| AU / AUD | Default local is bank transfer | Yes | `account_number`, `routing_type=bsb`, `routing_value` (6), `swift_bic` |
| SG / SGD | Default local is FAST | Yes | `account_number`, `swift_bic`. Guide: FAST's default routing type is `swift_code`, and the BIC is sent as `swift_code` plus `account_number`, not as `account_routing_value1` |
| IN / INR | Local only | SWIFT guide does not list INR | `account_number` (9–18), `routing_type=bank_code`, `routing_value` (11-char IFSC). No `swift_bic` |

Address fields (`street`, `city`, `state`, `postcode`, `country`) and `date_of_birth` are on every row. Q-02 confirms which of those the schema marks required for `PERSONAL`.

## Verification checklist

Run in B2 as `pnpm airwallex:smoke`. Write the pass/fail table to `docs/verification-results.md`. Store redacted JSON under `src/server/adapters/airwallex/__fixtures__/`. Do not call the sandbox until the user has put credentials in `.env`.

| ID | Check | Blocking |
| --- | --- | --- |
| V1 | Login returns a bearer token | Yes |
| V2 | `GET /balances/current` includes `SOURCE_CURRENCY` and `available_amount` | Yes |
| V3 | Create batch with no `funding_source` and no `transfer_date` → `DRAFTING` | Yes |
| V4 | Add a US local item and a US SWIFT item. List items. Both `VALIDATED` or the failure is recorded. `amount_payer_pays` is present. Delete the loser. `valid_item_count` drops by one | Yes |
| V5 | Quote. Record the accepted `validity` (`HR_1` requested; see Q-01) and a sample `quote_summary` | Yes |
| V6 | Submit a one-row batch of the smallest sensible amount → `SCHEDULED` or `BOOKING`, not `IN_APPROVAL` | Yes |
| V7 | After `BOOKED`, the item exposes a transfer id (field name recorded, Q-03) and `GET /transfers/{id}` returns a status | Yes |
| V8 | Each sample corridor's local payload validates via add-item on a draft that is then deleted | Yes |
| V9 | INR + `transfer_method: SWIFT` is rejected | No |
| V10 | `POST /simulation/transfers/{id}/transition` moves a sandbox transfer to `PAID` | No |
| V11 | Duplicate `request_id` on create does not create a second batch | No |
| V12 | Webhook `payout.batch_transfers.scheduled` verifies, if the user has a tunnel and a secret | No |

V6 uses a throwaway draft, not the sample file's full total. Delete unused drafts at the end of the script.
