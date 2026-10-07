# 08 — Demo Plan

## 1. Simulation mode

`NEXT_PUBLIC_DATA_SOURCE=mock`.

The browser uses `src/mocks/data-source.ts`. No MongoDB, no Airwallex, no `.env` secrets. The mock speaks [03](./03-contracts.md) only. Illegal actions return the error envelope.

The mock clock is frozen at `2026-04-02T18:00:00.000Z` unless a test or the kit toolbar moves it. `run_ready` expires one hour later. `run_expired` expired one minute earlier.

`createRun` waits 400ms in the browser and 0ms under Vitest, then the next `getRun` returns `run_ready` for the sample file. Until that read, the run is `PRICING` and the stepper sits on Price. Any other CSV is parsed with `src/contracts/csv.ts`. A file-level failure throws the 400 envelope and does not add a run.

## 2. Sample file

[`samples/contractors.csv`](./samples/contractors.csv). Seven contractors:

| Row   | Person        | Corridor | Role in the demo                                     |
| ----- | ------------- | -------- | ---------------------------------------------------- |
| row_1 | Maya Chen     | US/USD   | Local wins against SWIFT                             |
| row_2 | Owen Blake    | GB/GBP   | Faster Payments wins                                 |
| row_3 | Lena Hoffmann | DE/EUR   | SEPA wins                                            |
| row_4 | Noah Walsh    | AU/AUD   | Bank transfer wins                                   |
| row_5 | Aisha Rahman  | SG/SGD   | FAST wins                                            |
| row_6 | Priya Nair    | IN/INR   | Only rail. Later the staged failure                  |
| row_7 | Sam Rivera    | US/USD   | Empty postcode. `invalid`. Blocks pay until excluded |

Bank details are shapes from Airwallex's own examples and well-known test IBANs. They are not real people. The GB local sort code and account number are Airwallex's example `040568` / `10006132`; the sandbox rejected `601613`.

Home, before any upload, lists `run_inflight` and `run_done` so the screen is not empty on arrival.

## 3. Script (mock and, later, sandbox)

1. Open `/`. Point at the balance and the two existing runs.
2. `Use the sample file`. The stepper is on Price (`Comparing local and SWIFT for each contractor.`), then moves to Review. Walk the rail column: cheapest chip, the "instead of SWIFT" line, Priya `Only rail`, Sam's error. Pay is absent.
3. Exclude Sam. Pay becomes `Pay 6 contractors · USD 18,960.00`.
4. Confirm pay. The run is in flight.
5. `Advance statuses` twice. The stepper stays on Pay and the sentence changes.
   - First advance: every included row → `sent`. Sentence: `6 of 6 sent.`
   - Second advance: Maya, Owen, Lena, Noah, Aisha → `paid`. Priya → `failed` with `The beneficiary bank rejected the payout.` Stepper moves to Done, state `failed`, sentence `5 of 6 paid.`
6. Badge reads Paid with failures. `5 of 6 paid`. Advance disappears (`settled`).

The sandbox path uses the same clicks. Advance calls the transfer simulation endpoint (V10) instead of editing fixtures. If simulation is unavailable, the presenter stays on the in-flight run and says the payout is with Airwallex.

```ts
// DEMO-ONLY: Advance jumps transfer statuses for the talk track.
// PROD: no advance control; status comes from webhooks and retrieve.
```

## 4. Tagged shortcuts

Keep this table current when adding a `DEMO-ONLY:` or `SANDBOX:` comment.

| Location                                             | Tag                     | What                                                                                         |
| ---------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `src/server/services/runs.ts` price and pay          | `DEMO-ONLY`             | Inline work. Production queues it                                                            |
| Open routes, no session                              | `DEMO-ONLY`             | The API-key account is the operator                                                          |
| 25-row and six-corridor cap                          | `DEMO-ONLY`             | Production takes any schema-supported corridor up to Airwallex's 1,000-item batch limit      |
| `POST /api/demo/runs/:id/advance`                    | `DEMO-ONLY` + `SANDBOX` | Simulation transition                                                                        |
| `src/mocks/data-source.ts` advance                   | `DEMO-ONLY`             | Jumps transfer statuses for the talk track. Production reads webhooks and retrieve           |
| `src/mocks/fixtures.ts`                              | `DEMO-ONLY`             | Teaching amounts, not a live quote                                                           |
| `src/mocks/data-source.ts` createRun                 | `DEMO-ONLY`             | Only the sample file is priced into the ready fixture. Production prices every accepted file |
| `src/server/adapters/airwallex/client.ts` transition | `SANDBOX`               | Sandbox transfer simulation. Production waits for webhooks and retrieve                      |
| `scripts/airwallex-smoke.test.ts`                    | `SANDBOX`               | Draft batches plus one 10 USD sandbox submit. Production does not run this script            |
| Webhook optional                                     | `DEMO-ONLY`             | Polling is enough for the demo. Production relies on webhooks plus reconcile                 |

## 5. Run of show timing

About four minutes. The quote validity requested from Airwallex is one hour so a stalled rehearsal does not expire mid-sentence. If the quote does expire, the button becomes Refresh quote; press it and pay.
