# B — Backend Track

**Goal:** the same contracts the UI already renders, backed by MongoDB and a real Airwallex draft batch.

**References:** [01](../01-feasibility-airwallex.md) · [02](../02-architecture.md) · [03](../03-contracts.md) · [04](../04-airwallex-integration.md) · [08](../08-demo-plan.md)

**Rules**

- Domain code is pure and unit-tested. I/O stays in the adapter and the repositories.
- Services return contract DTOs. Routes validate with the contract zod schemas.
- `decimal.js` for money. Decimal strings on the way out.
- `PAYMENTS_GATEWAY=mock` is the default in tests. `pnpm test` needs no credentials and no database the user started.
- Do not add Redis, BullMQ, Docker, or a worker.
- Do not change [03](../03-contracts.md) silently. A mismatch found in the sandbox updates 03, 04, and 09 together.

## Environment

Ask the user, and wait, only at these rows. Do not invent credentials. Do not install MongoDB to unblock a test; tests use `mongodb-memory-server`.

| Before | Ask for | If they defer |
| --- | --- | --- |
| B2.1 | `AIRWALLEX_CLIENT_ID` and `AIRWALLEX_API_KEY` in `.env` | Stop sandbox work. B0, B1 unit tests, and B3–B5 with the mock gateway continue |
| B5.2 live check | `AIRWALLEX_WEBHOOK_SECRET` and a tunnel they have already started | Skip the live delivery check. Signature tests still use a fixture secret |
| B6 sandbox walk | The values above, plus `MONGODB_URI` if they want it against their own database | Walk it with `PAYMENTS_GATEWAY=mock` |

Estimates are for one engineer.

---

## B0 — Foundations · ~1 day

| ID | Task | Done when |
| --- | --- | --- |
| B0.1 | `.env.example` matches [02](../02-architecture.md). Zod env at boot. Vitest starts `mongodb-memory-server` and never reads the user's `.env` | A missing `MONGODB_URI` fails boot. Tests inject the memory URI |
| B0.2 | Mongoose connection safe for Next.js hot reload. `Decimal128` ↔ string on the run document. One `runs` collection, rows embedded. `webhook_events` with `_id` = event id | Index on `createdAt`. A round-trip preserves `18960.00` exactly |
| B0.3 | pino JSON logs, redaction of keys, tokens, account numbers, IBANs | A test asserts a routing value does not appear |

## B1 — Airwallex client · ~1.5 days

| ID | Task | Done when |
| --- | --- | --- |
| B1.1 | `client.ts`: base URL, version header, lossless amounts, `AirwallexError`, login cache, single-flight refresh, 401 retry once | Unit test with a stub HTTP |
| B1.2 | Limiter and backoff per [04 §1](../04-airwallex-integration.md#1-client) | A 429 then a 200 succeeds. A create retry sends the same `request_id` |
| B1.3 | Methods: login, balances, batch create / add items / list items / delete items / quote / submit / get / delete, transfer get, simulation transition | Types compile against the recorded shapes in 04 |
| B1.4 | Mappers: batch → `RunDetail` fields, item → `RunRow`, quote → `QuoteSummary`, errors → `FieldError` via [03 §7](../03-contracts.md#7-airwallex-path--csv-path), status map [04 §4](../04-airwallex-integration.md#4-status-map) | Fixture JSON from B2 feeds these tests. Until B2, use a hand-written fixture marked as unverified |
| B1.5 | `mock` gateway implementing the same interface, returning [03 §8](../03-contracts.md#8-fixtures-the-kit-and-the-mock-both-use) | Service tests run on it |
| B1.6 | Webhook signature helper | Tampered body fails. Duplicate event id is a no-op |

## B2 — Sandbox gate · ~1 day

Ask for credentials first.

| ID | Task | Done when |
| --- | --- | --- |
| B2.1 | `pnpm airwallex:smoke` runs V1–V12 in [01](../01-feasibility-airwallex.md). Writes `docs/verification-results.md` and redacted fixtures | V1, V3, V4, V5, V6, V8 pass, or the failure is written down and the contract is updated |
| B2.2 | Answer Q-01 through Q-06 in [09](../09-decisions.md) from those fixtures | Each Q has a resolution line |
| B2.3 | If sample bank details were rejected, replace values in `docs/samples/contractors.csv` and `public/samples/contractors.csv`. Columns stay | The smoke script can add the sample's six valid rows |

Do not continue to a live pay of the full sample until V6 has shown submit does not stick in `IN_APPROVAL`.

## B3 — Domain · ~1 day

| ID | Task | Done when |
| --- | --- | --- |
| B3.1 | CSV parser is the one in `src/contracts/csv.ts` (C0.3). Service wraps file-level failures in the error envelope | Same cases as C0.3 |
| B3.2 | Rail picker: given two `RailQuote`s, apply [03 §3](../03-contracts.md#3-rails) including the INR "no SWIFT" rule and the tie-break | Property test: the winner's `amountPayerPays` is the minimum |
| B3.3 | `allowedActions` / `poll` / `settled` are imported from contracts, not reimplemented | A READY run with `needsAttention` has no `pay` |
| B3.4 | Id builders [04 §2](../04-airwallex-integration.md#2-id-builders) | Length ≤ 64. Stable across calls |

## B4 — Pricing and pay · ~2 days

| ID | Task | Done when |
| --- | --- | --- |
| B4.1 | `POST /api/runs`: parse, persist `PRICING`, create batch, add probes, list, delete losers, quote, persist `READY`, return `RunDetail` | On the mock gateway, the sample file matches `run_ready` aside from ids and the illustrative rates (live rates differ; the **shape** and the winner rule are what the test asserts) |
| B4.2 | A row that fails both probes is `needs_fix` with mapped `fieldErrors`, and is not in the quote | Pay stays absent |
| B4.3 | `exclude`, `discard`, `requote` | Discard calls batch delete only while `DRAFTING`. Requote uses the same batch id |
| B4.4 | `pay`: balance check, submit, map the next status. `QUOTE_EXPIRED` and `INSUFFICIENT_BALANCE` per [03 §6](../03-contracts.md#6-rest) | A second pay returns `INVALID_STATE` |
| B4.5 | `GET /api/runs`, `GET /api/runs/:id`, `GET /api/balance` | List is newest first |

Idempotency: creating the batch with `b:{runId}` means a retried request after a timeout loads the existing batch instead of inserting another. Test that.

## B5 — Status sync · ~1 day

| ID | Task | Done when |
| --- | --- | --- |
| B5.1 | `GET /api/runs/:id` refreshes from Airwallex when `poll` would be true, then recomputes `poll` and `settled` | A `BOOKED` item with transfer `PAID` becomes row `paid` |
| B5.2 | Webhook route per [04 §5](../04-airwallex-integration.md#5-webhooks), using the same mapper as retrieve | Duplicate event does not double-apply. Failed signature is 400 |
| B5.3 | `FAILED` on a transfer is not replaced by a later `CANCELLED` | Unit test |

## B6 — Demo wiring and conformance · ~1 day

| ID | Task | Done when |
| --- | --- | --- |
| B6.1 | Every route's JSON passes the contract zod schema before it is sent | A mapper bug fails the test, not the browser |
| B6.2 | `POST /api/demo/runs/:id/advance` and `POST /api/demo/reset`, 404 when `DEMO_MODE` is not true. Advance uses simulation only when `AIRWALLEX_ENV=sandbox` and `PAYMENTS_GATEWAY=airwallex`; otherwise it steps the mock gateway the same way the UI mock does | The two-step script in [08](../08-demo-plan.md) holds |
| B6.3 | End-to-end with the UI on `api` and the gateway `mock` | The pages do not need a code change |
| B6.4 | Optional sandbox rehearsal of [08 §3](../08-demo-plan.md) once B2 passed and the user agrees to a real submit of the sample (small) or of a one-row stand-in | Note the result in [09](../09-decisions.md) sign-off |

## Test strategy

| Layer | Tool | Scope |
| --- | --- | --- |
| Contracts and picker | Vitest | CSV, rail winner, permissions, money precision |
| Services | Vitest + mongodb-memory-server + mock gateway | Pricing, exclude, pay, duplicate `request_id`, status map |
| Adapter | Vitest, manual `pnpm airwallex:smoke` | V1–V12 |
| UI | Playwright on the U track | Mock script |
