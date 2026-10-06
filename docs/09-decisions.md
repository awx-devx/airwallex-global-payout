# 09 — Decisions and Open Questions

## Decisions

| ID   | Decision                                                                                                                                                                                                                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | Visual language is the light neo-bank sheet in [05](./05-design-system.md): Space Grotesk, ink pay button, lime for money saved, purple for in flight and links, plus an edge atmosphere that drifts with the cursor. No chart, aurora, or trading chrome.                                     |
| D-02 | No login, no `x-login-as`, no `x-on-behalf-of`. The API key's account is the payer.                                                                                                                                                                                                            |
| D-03 | Stack is Next.js, MongoDB, Airwallex. No Redis, no BullMQ, no worker.                                                                                                                                                                                                                          |
| D-04 | Demo file cap is 25 data rows. Airwallex's own cap is 1,000 items.                                                                                                                                                                                                                             |
| D-05 | Corridor set is closed: US/USD, GB/GBP, DE/EUR, AU/AUD, SG/SGD, IN/INR.                                                                                                                                                                                                                        |
| D-06 | Sandbox transfer-approval workflow stays off. The UI has a banner if `IN_APPROVAL` happens anyway. There is no approve API in this demo.                                                                                                                                                       |
| D-07 | The receive amount is the CSV amount. `fee_paid_by=PAYER`. SWIFT uses `swift_charge_option=PAYER`.                                                                                                                                                                                             |
| D-08 | Pricing finishes inside `POST /api/runs` for this demo. The `PRICING` status is still a real DTO so the kit can show it.                                                                                                                                                                       |
| D-09 | Cheapest rail is the lowest `amount_payer_pays` among a default local probe and a SWIFT probe, SWIFT omitted when it cannot deliver the currency (INR). A quote is required before list items include `transfer_draft`. Losers are deleted, then the batch is quoted again for the pay screen. |
| D-10 | No inline row edit. Exclude or re-upload.                                                                                                                                                                                                                                                      |
| D-11 | UI buttons come only from `allowedActions`. The page polls only when `poll` is true.                                                                                                                                                                                                           |
| D-12 | Contracts in [03](./03-contracts.md) freeze before the kit. After kit sign-off they change only with a new D-xx.                                                                                                                                                                               |
| D-13 | `reason` is `wages_salary`.                                                                                                                                                                                                                                                                    |
| D-14 | Quote validity requested is `HR_1`, with one retry at `MIN_15` if rejected (Q-01).                                                                                                                                                                                                             |
| D-15 | Hosting is out of scope.                                                                                                                                                                                                                                                                       |
| D-16 | The run screen stepper is `runProgress(run)` over the existing DTO. No new status field and no new endpoint. Animation is Motion (`motion` / motion.dev) as specified in [05 §5](./05-design-system.md#5-motion).                                                                              |
| D-17 | Client cache is `@tanstack/react-query`, the library named for `src/features` in [02](./02-architecture.md).                                                                                                                                                                                   |
| D-18 | Server foundations use `mongoose` (MongoDB 7), `mongodb-memory-server` in Vitest, and `pino` JSON logs with redaction. Tests do not read `.env`. No extra log transport.                                                                                                                       |

## Open questions

Resolved by B2. Do not guess a code path around these; branch on the recorded result and update [04](./04-airwallex-integration.md).

| ID   | Question                                                                                                                         | Blocks                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Q-01 | Does `POST .../quote` accept `validity: HR_1` for this account and these pairs?                                                  | Pay-bar countdown. Fallback `MIN_15` is already specified                                                              |
| Q-02 | For `PERSONAL`, which of `date_of_birth`, `state`, and address fields does the beneficiary schema require on each demo corridor? | CSV column stays either way. Payload drops a field the schema rejects                                                  |
| Q-03 | After `BOOKED`, which list-item field is the transfer id?                                                                        | Mapper only. DTO field is already `transferId`                                                                         |
| Q-04 | Are the sample account numbers accepted by the sandbox, or do we substitute the values V8 records?                               | Sample CSV values, not columns                                                                                         |
| Q-05 | Default local echo for DE/EUR: empty `local_clearing_system` (we display SEPA) or a named system?                                | `railLabel` already has both branches                                                                                  |
| Q-06 | GBP SWIFT probe: is `iban` sufficient, with local account fields also present?                                                   | GB row already carries both                                                                                            |
| Q-07 | Does this account accept `reason=wages_salary` on a `PERSONAL` beneficiary?                                                      | If not, switch the constant to `professional_business_services` and record it here. The UI does not display the reason |

## Resolutions

Recorded by `pnpm airwallex:smoke` on 2026-10-06. Fixtures are in `src/server/adapters/airwallex/__fixtures__/`.

- Q-01: `validity: HR_1` is accepted. `expires_at` uses a `+0000` offset.
- Q-02: `date_of_birth` is optional and was accepted. `street_address`, `city`, `postcode`, and `country_code` are required. `state` is required for US (`US-XX`) and AU (`AU-XX`), absent for GB, DE, and SG, and `KA` was accepted for IN. US local also requires `bank_account_category`; we send `Checking`.
- Q-03: after `BOOKED`, the list-item field is `transfer_id`. `transfer_draft` is gone. `GET /transfers/{id}` returns the status.
- Q-04: US, DE, AU, SG, and IN sample bank details validated. GB sort code `601613` was rejected (`010` on `account_routing_value1`). The sample now uses Airwallex's example `040568` / `10006132`. The previous IBAN stays, because SWIFT already accepted it and the local probe does not send it.
- Q-05: DE/EUR local echoes an empty `local_clearing_system`. The UI keeps the SEPA label.
- Q-06: a GB SWIFT item with `iban` plus the local account fields validates.
- Q-07: `reason: wages_salary` was accepted on the priced drafts.

## Sign-offs

| Gate                                                                               | Who | Date | Notes                              |
| ---------------------------------------------------------------------------------- | --- | ---- | ---------------------------------- |
| UI kit ([06 §5](./06-ui-kit-spec.md#5-review-gate))                                |     |      |                                    |
| Mock demo walkthrough ([08 §3](./08-demo-plan.md#3-script-mock-and-later-sandbox)) |     |      |                                    |
| Sandbox V1–V8                                                                      |     |      | See `docs/verification-results.md` |
