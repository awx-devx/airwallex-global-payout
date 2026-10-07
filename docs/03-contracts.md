# 03 — Contracts

Frozen API between the UI and the backend. Both tracks implement this document. Mock fixtures and the REST handlers return the same shapes. After the UI kit gate ([06](./06-ui-kit-spec.md), sign-off in [09](./09-decisions.md)), a change here is a breaking change: update the kit fixtures in the same commit.

Money fields are **decimal strings** (`"42.00"`, `"0.00"`). Never JSON numbers. Timestamps are ISO-8601 UTC (`2026-04-02T18:00:02.000Z`). Ids are UUID strings. Row ids are `row_1` … `row_n` in file order, starting at 1.

## 1. Money

- Parse and compare with `decimal.js`. Persist with Mongo `Decimal128`. Transport as strings.
- Round to the currency's payout precision at the Airwallex boundary. Demo corridors are all 2 decimal places: USD, GBP, EUR, AUD, SGD, INR.
- `src/contracts/currencies.ts` also lists the 0 dp and 3 dp codes from the [payout precision table](https://www.airwallex.com/docs/payouts/how-airwallex-payouts-work/currency-precision.md) so `formatMoney` is right for a JPY fixture. KES and SAR are 0 dp in that table.
- The UI formats through `src/ui/format/money.ts` only. No `Number()`, no `toFixed()` on a money string.
- Sums happen in one currency only. Never add a USD amount to an INR amount. The screen total is source currency.

## 2. CSV

UTF-8, comma-separated, one header row, CRLF or LF. Max 1 MB. Max 25 data rows. Any other extension or a missing header is a file-level error and does not create a run.

Header (order fixed, extra columns rejected):

```
contractor_name,email,date_of_birth,country,currency,amount,street,city,state,postcode,account_number,iban,routing_type,routing_value,swift_bic
```

| Column                          | Required                          | Rule                                                                                                          |
| ------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `contractor_name`               | yes                               | At least two words. First word is `first_name`, the remainder is `last_name`. Also the default `account_name` |
| `email`                         | yes                               | Contains `@`                                                                                                  |
| `date_of_birth`                 | yes                               | `YYYY-MM-DD`                                                                                                  |
| `country`                       | yes                               | ISO-3166 alpha-2. One of the demo corridors                                                                   |
| `currency`                      | yes                               | ISO-4217. Must match the corridor                                                                             |
| `amount`                        | yes                               | Positive decimal, at most the currency precision. This is what they receive                                   |
| `street`, `city`, `postcode`    | yes                               | Non-empty                                                                                                     |
| `state`                         | when country is `US` or `AU`      | Non-empty                                                                                                     |
| `account_number`                | see corridor                      |                                                                                                               |
| `iban`                          | see corridor                      |                                                                                                               |
| `routing_type`, `routing_value` | see corridor                      | Sent as `account_routing_type1` / `account_routing_value1`                                                    |
| `swift_bic`                     | on every corridor except `IN/INR` | Sent as `bank_details.swift_code` on both probes. FAST (SG) also needs it for the local default               |

Demo corridors (closed set, D-05):

| country | currency | Local probe | SWIFT probe | Required bank columns                                                            |
| ------- | -------- | ----------- | ----------- | -------------------------------------------------------------------------------- |
| `US`    | `USD`    | yes         | yes         | `account_number`, `routing_type=aba`, `routing_value`, `swift_bic`               |
| `GB`    | `GBP`    | yes         | yes         | `account_number`, `routing_type=sort_code`, `routing_value`, `iban`, `swift_bic` |
| `DE`    | `EUR`    | yes         | yes         | `iban`, `swift_bic`                                                              |
| `AU`    | `AUD`    | yes         | yes         | `account_number`, `routing_type=bsb`, `routing_value`, `swift_bic`               |
| `SG`    | `SGD`    | yes         | yes         | `account_number`, `swift_bic`                                                    |
| `IN`    | `INR`    | yes         | **no**      | `account_number`, `routing_type=bank_code`, `routing_value`                      |

A row outside this table is `invalid` with code `UNSUPPORTED_CORRIDOR`. The file still creates a run.

File-level errors (HTTP 400, no run):

| code               | When                                         |
| ------------------ | -------------------------------------------- |
| `UNSUPPORTED_FILE` | Not `.csv` or missing header / wrong columns |
| `EMPTY_FILE`       | Header only                                  |
| `FILE_TOO_LARGE`   | Over 1 MB                                    |
| `TOO_MANY_ROWS`    | Over 25 data rows                            |

Row-level codes (the run is created, the row is `invalid`):

| code                   | path                               |
| ---------------------- | ---------------------------------- |
| `MISSING_VALUE`        | the column                         |
| `BAD_AMOUNT`           | `amount`                           |
| `BAD_DATE`             | `date_of_birth`                    |
| `BAD_NAME`             | `contractor_name`                  |
| `BAD_EMAIL`            | `email`                            |
| `UNSUPPORTED_CORRIDOR` | `country`                          |
| `MISSING_BANK_FIELD`   | the bank column the corridor needs |

Parser output is a `ParsedRow` before any Airwallex call. Airwallex field errors use the same `path` vocabulary (section 7). The UI binds errors by `path` and never sees `beneficiary.address.postcode`.

Sample file: [`samples/contractors.csv`](./samples/contractors.csv).

## 3. Rails

```ts
type TransferMethod = 'LOCAL' | 'SWIFT'

type Rail = {
  transferMethod: TransferMethod
  /** Airwallex `local_clearing_system`, echoed back. Null when omitted or SWIFT. */
  localClearingSystem: string | null
  /** Display only. From `railLabel()` below. */
  railLabel: string
}
```

`railLabel(method, system, currency)`:

| method  | system            | currency | label                       |
| ------- | ----------------- | -------- | --------------------------- |
| `LOCAL` | `ACH`             | *        | ACH                         |
| `LOCAL` | `FASTER_PAYMENTS` | *        | Faster Payments             |
| `LOCAL` | `BANK_TRANSFER`   | *        | Bank transfer               |
| `LOCAL` | `FAST`            | *        | FAST                        |
| `LOCAL` | `GIRO`            | *        | GIRO                        |
| `LOCAL` | `NPP`             | *        | NPP                         |
| `LOCAL` | `FEDWIRE`         | *        | Fedwire                     |
| `LOCAL` | `FEDNOW`          | *        | FedNow                      |
| `LOCAL` | `CHAPS`           | *        | CHAPS                       |
| `LOCAL` | `null`            | `EUR`    | SEPA                        |
| `LOCAL` | `null`            | other    | Local                       |
| `LOCAL` | anything else     | *        | the system string unchanged |
| `SWIFT` | *                 | *        | SWIFT                       |

Probes:

- Local probe: `transfer_method: LOCAL`, do not send `local_clearing_system`. Airwallex applies the corridor default and echoes it.
- SWIFT probe: `transfer_method: SWIFT`, `swift_charge_option: PAYER`. Not sent for `IN/INR`.
- Quote once so list items include `transfer_draft`. Winner = lowest `amountPayerPays`. Tie-break: lower `feeAmount`, then `LOCAL` before `SWIFT`.
- Delete the losers, then quote again. The second quote is the one on the run. Losers appear on the row as `alternatives`, not as extra rows.

```ts
type RailQuote = Rail & {
  amountPayerPays: string
  feeAmount: string
  feeCurrency: string // source currency
  amountBeneficiaryReceives: string
  sourceCurrency: string
  transferCurrency: string
}

type RowPricing = {
  chosen: RailQuote | null
  /** The priced rails we did not keep. Length 0 or 1 in this demo. */
  alternatives: RailQuote[]
  /** chosen vs the single alternative, source currency. Null when there is no alternative. */
  savings: string | null
}
```

`savings` is `alternative.amountPayerPays - chosen.amountPayerPays`. Zero is `"0.00"`, not null. Null means only one rail was priced.

## 4. Status

### Run

```ts
type RunStatus = 'PRICING' | 'READY' | 'SUBMITTED' | 'FAILED' | 'DISCARDED'
```

| Status      | Meaning                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| `PRICING`   | File accepted. Batch is being created, probed, trimmed, or quoted         |
| `READY`     | Quote is on the draft. The user may pay, requote, exclude, or discard     |
| `SUBMITTED` | `submit` was accepted. Progress comes from `airwallexStatus` and the rows |
| `FAILED`    | We could not finish pricing, or Airwallex batch status is `FAILED`        |
| `DISCARDED` | User discarded a draft. Airwallex batch deleted                           |

`airwallexStatus` is the batch status string or `null` before create returns. The UI does not switch on it for buttons. It is shown as secondary text and used by the status badge map below.

Airwallex batch statuses (verbatim): `DRAFTING`, `IN_APPROVAL`, `APPROVAL_RECALLED`, `APPROVAL_REJECTED`, `APPROVAL_BLOCKED`, `SCHEDULED`, `OVERDUE`, `BOOKING`, `PARTIALLY_BOOKED`, `BOOKED`, `FAILED`, `CANCELLATION_REQUESTED`, `CANCELLED`.

Funding statuses, shown only as detail text: `SCHEDULED`, `PROCESSING`, `FUNDED`, `FAILED`, `REVERSED`, or `null`.

### Row

```ts
type RowStatus =
  | 'invalid' // our parser, never sent
  | 'pricing'
  | 'ready' // winner VALIDATED, still draft
  | 'needs_fix' // every probe VALIDATION_FAILED, or the only probe failed
  | 'excluded'
  | 'booking'
  | 'booked'
  | 'booking_failed'
  | 'processing' // transfer in flight (SCHEDULED, PROCESSING, IN_APPROVAL, OVERDUE)
  | 'sent'
  | 'paid'
  | 'failed' // transfer FAILED
  | 'cancelled'
```

Badge map (one component, this table):

| RowStatus        | Label          | Tone  |
| ---------------- | -------------- | ----- |
| `invalid`        | Invalid        | down  |
| `pricing`        | Pricing        | muted |
| `ready`          | Ready          | info  |
| `needs_fix`      | Needs fix      | warn  |
| `excluded`       | Excluded       | muted |
| `booking`        | Booking        | info  |
| `booked`         | Booked         | info  |
| `booking_failed` | Booking failed | down  |
| `processing`     | Processing     | info  |
| `sent`           | Sent           | info  |
| `paid`           | Paid           | up    |
| `failed`         | Failed         | down  |
| `cancelled`      | Cancelled      | muted |

Run badge:

| Condition                                                              | Label                | Tone  |
| ---------------------------------------------------------------------- | -------------------- | ----- |
| `PRICING`                                                              | Pricing              | muted |
| `READY` and `quoteExpired`                                             | Quote expired        | warn  |
| `READY`                                                                | Ready to pay         | info  |
| `SUBMITTED` and `airwallexStatus=IN_APPROVAL`                          | Waiting for approval | warn  |
| `SUBMITTED` and not settled                                            | Paying               | info  |
| `SUBMITTED` and `settled` and every included row is `paid`             | Paid                 | up    |
| `SUBMITTED` and `settled` and every included row is `cancelled`        | Cancelled            | muted |
| `SUBMITTED` and `settled` and some included row is `failed`, `booking_failed`, or `cancelled` | Paid with failures | warn |
| `FAILED`                                                               | Failed               | down  |
| `DISCARDED`                                                            | Discarded            | muted |

`settled` is true when the run is `SUBMITTED` and every non-excluded row is `paid`, `failed`, `cancelled`, or `booking_failed`.

### Progress stepper

The run screen shows five steps. They are not stored and they are not a new Airwallex status. `runProgress(run)` in `src/contracts/progress.ts` derives them from the fields already on `RunDetail`. Components render the result. They do not switch on `status` or `airwallexStatus` to place the marker.

```ts
type ProgressStepId = 'upload' | 'price' | 'review' | 'pay' | 'done'
type StepState = 'complete' | 'current' | 'upcoming' | 'failed'

type ProgressStep = {
  id: ProgressStepId
  label: 'Upload' | 'Price' | 'Review' | 'Pay' | 'Done'
  state: StepState
  /** Set on the current step, and on Done when the run is settled. Null on the others. */
  detail: string | null
}

type RunProgress = {
  steps: [ProgressStep, ProgressStep, ProgressStep, ProgressStep, ProgressStep]
  currentId: ProgressStepId
}
```

`upload` is `complete` whenever a run exists. Later steps:

| Run                                                                                    | Current step | Its state  | Detail                                                              |
| -------------------------------------------------------------------------------------- | ------------ | ---------- | ------------------------------------------------------------------- |
| `PRICING`                                                                              | Price        | `current`  | `Comparing local and SWIFT for each contractor.`                    |
| `READY`, `needsAttention`                                                              | Review       | `current`  | `Exclude the rows with errors before paying.`                       |
| `READY`, `quoteExpired`                                                                | Review       | `current`  | `Quote expired. Refresh it to pay.`                                 |
| `READY` otherwise                                                                      | Review       | `current`  | `Cheapest rail is selected. Nothing has been paid.`                 |
| `SUBMITTED`, not settled, `approvalHold` or `airwallexStatus=IN_APPROVAL`              | Pay          | `current`  | `Waiting for approval in Airwallex.`                                |
| `SUBMITTED`, not settled, `OVERDUE`                                                    | Pay          | `current`  | `The wallet did not cover the batch. Airwallex will retry funding.` |
| `SUBMITTED`, not settled, some included row `paid`                                     | Pay          | `current`  | `{paid} of {included} paid.`                                        |
| `SUBMITTED`, not settled, some included row `sent`                                     | Pay          | `current`  | `{sent} of {included} sent.`                                        |
| `SUBMITTED`, not settled, `BOOKING`, `PARTIALLY_BOOKED`, or any included row `booking` | Pay          | `current`  | `Booking each payout.`                                              |
| `SUBMITTED`, not settled, `SCHEDULED`                                                  | Pay          | `current`  | `Submitted. Waiting for the wallet to fund the batch.`              |
| `SUBMITTED`, not settled, otherwise                                                    | Pay          | `current`  | `Payouts are booked and processing.`                                |
| `SUBMITTED`, settled, every included row `paid`                                        | Done         | `complete` | `All contractors are paid.`                                         |
| `SUBMITTED`, settled, any included row `failed` or `booking_failed`                    | Done         | `failed`   | `{paid} of {included} paid.`                                        |
| `FAILED` and `airwallexStatus=FAILED`                                                  | Pay          | `failed`   | `error.message`                                                     |
| `FAILED` otherwise                                                                     | Price        | `failed`   | `error.message`, or `Pricing failed.` when `error` is null          |
| `DISCARDED`                                                                            | Review       | `current`  | `Draft discarded. Nothing was paid.`                                |

Steps before the current one are `complete`. Steps after it are `upcoming`. `included` counts non-excluded rows. `{paid}` and `{sent}` count those rows. The first matching `SUBMITTED` row in the table wins.

`run_pricing` sits on Price. `run_ready` sits on Review. `run_inflight` sits on Pay. Its sentence follows the first matching Pay row above (`Booking each payout.` while any included row is `booking` and none are `sent` or `paid`). `run_done` sits on Done, state `failed`, detail `5 of 6 paid.` `run_approval` uses the approval sentence.

## 5. DTOs

```ts
type FieldError = { path: string; message: string }

type RunSummary = {
  id: string
  fileName: string
  createdAt: string
  status: RunStatus
  airwallexStatus: string | null
  sourceCurrency: string
  rowCount: number
  includedCount: number // not excluded, not invalid
  needsAttentionCount: number // invalid + needs_fix that are not excluded
  totalPayerPays: string | null
  totalSavings: string | null
  settled: boolean
  quoteExpired: boolean
}

type RunRow = {
  id: string // row_1
  index: number // 1-based
  contractorName: string
  email: string
  country: string
  currency: string
  amount: string // they receive
  status: RowStatus
  pricing: RowPricing // chosen/alternatives null/[] until priced
  fieldErrors: FieldError[]
  transferId: string | null
  shortReference: string | null
}

type QuoteSummary = {
  expiresAt: string
  validity: string // echoed, e.g. HR_1
  payerPays: string // sum of quote lines, source currency
  feeAmount: string
  sourceCurrency: string
  lines: Array<{
    sourceCurrency: string
    transferCurrency: string
    amountPayerPays: string
    amountBeneficiaryReceives: string
    feeAmount: string
    clientRate: string | null // null when no conversion
    currencyPair: string | null
  }>
}

type RunDetail = RunSummary & {
  rows: RunRow[]
  quote: QuoteSummary | null
  poll: boolean
  flags: {
    insufficientBalance: boolean
    quoteExpired: boolean
    needsAttention: boolean
    approvalHold: boolean // airwallexStatus === IN_APPROVAL
    demo: boolean
    sandbox: boolean // AIRWALLEX_ENV === sandbox at read time. Not stored.
  }
  allowedActions: Array<'pay' | 'discard' | 'exclude' | 'requote' | 'advance'>
  balance: Balance | null // snapshot at last read
  error: { code: string; message: string } | null
  shortReference: string | null
  airwallexBatchId: string | null
}

type Balance = {
  currency: string
  available: string
  pending: string
}
```

`totalPayerPays` is `quote.payerPays` when a quote exists, otherwise the sum of chosen rails of included rows, otherwise `null` while pricing.

`totalSavings` is the sum of `pricing.savings` over included rows that have a savings string. `null` when none of them do.

`poll` is true when status is `PRICING`, `READY`, or (`SUBMITTED` and not `settled`).

### allowedActions

Computed in `src/contracts/permissions.ts`. Components do not re-derive this.

| Action    | Present when                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------ |
| `pay`     | `READY`, not `quoteExpired`, `needsAttention` is false, `includedCount > 0`, not `insufficientBalance` |
| `requote` | `READY` and `quoteExpired`                                                                             |
| `discard` | `PRICING` or `READY`                                                                                   |
| `exclude` | `READY` or `PRICING`, and the row is `invalid` or `needs_fix`                                          |
| `advance` | `flags.demo` and `SUBMITTED` and not `settled`. Sandbox still auto-advances when `flags.demo` is false. |

`exclude` is a run-level capability meaning "exclude is allowed on eligible rows". The row control is shown only on `invalid` and `needs_fix` rows. The server rejects exclude on any other row with `INVALID_STATE`.

## 6. REST

JSON except the upload. Error envelope everywhere:

```ts
type ErrorEnvelope = {
  error: {
    code: string
    message: string
    fieldErrors?: FieldError[]
  }
}
```

| Method | Path                                | Body                               | Success                               |
| ------ | ----------------------------------- | ---------------------------------- | ------------------------------------- |
| `GET`  | `/api/runs`                         | —                                  | `{ runs: RunSummary[] }` newest first |
| `GET`  | `/api/runs/:id`                     | —                                  | `RunDetail`                           |
| `POST` | `/api/runs`                         | `multipart/form-data` field `file` | `201 RunDetail`                       |
| `POST` | `/api/runs/:id/pay`                 | —                                  | `RunDetail`                           |
| `POST` | `/api/runs/:id/requote`             | —                                  | `RunDetail`                           |
| `POST` | `/api/runs/:id/discard`             | —                                  | `RunDetail`                           |
| `POST` | `/api/runs/:id/rows/:rowId/exclude` | —                                  | `RunDetail`                           |
| `GET`  | `/api/balance`                      | —                                  | `Balance`                             |
| `POST` | `/api/demo/runs/:id/advance`        | —                                  | `RunDetail`                           |
| `POST` | `/api/demo/reset`                   | —                                  | `{ ok: true }`                        |

Static sample: `GET /samples/contractors.csv`.

`POST /api/runs` returns as soon as the run row exists. Status may already be `READY` (mock, and the server when pricing finishes inside the same request). If pricing is still going, status is `PRICING` and `poll` is true. This demo's server finishes pricing before it responds (D-08); the `PRICING` DTO still exists so the kit and a slow mock can render it.

### Error codes

| HTTP | code                                                                | When                                                                  |
| ---- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 400  | `UNSUPPORTED_FILE`, `EMPTY_FILE`, `FILE_TOO_LARGE`, `TOO_MANY_ROWS` | Upload                                                                |
| 404  | `NOT_FOUND`                                                         | Unknown run or row                                                    |
| 409  | `INVALID_STATE`                                                     | Action not in `allowedActions`                                        |
| 409  | `QUOTE_EXPIRED`                                                     | Pay after expiry. Client should have seen `requote`; this is the race |
| 409  | `INSUFFICIENT_BALANCE`                                              | Pay when the wallet is short                                          |
| 502  | `AIRWALLEX_ERROR`                                                   | Upstream failure after retries. `message` is safe to show             |

`fieldErrors` on a **row** are part of `RunDetail`, not the envelope. The envelope uses `fieldErrors` only if a future request validates a JSON body. Upload row problems are not a 400.

## 7. Airwallex path → CSV path

The server maps item `errors[].source` through this table before the DTO. Unmapped sources use path `row` and the Airwallex message.

| Airwallex `source` suffix                   | `path`            |
| ------------------------------------------- | ----------------- |
| `first_name`, `last_name`, `account_name`   | `contractor_name` |
| `personal_email`                            | `email`           |
| `date_of_birth`                             | `date_of_birth`   |
| `address.country_code`, `bank_country_code` | `country`         |
| `account_currency`, `transfer_currency`     | `currency`        |
| `transfer_amount`                           | `amount`          |
| `address.street_address`                    | `street`          |
| `address.city`                              | `city`            |
| `address.state`                             | `state`           |
| `address.postcode`                          | `postcode`        |
| `account_number`                            | `account_number`  |
| `iban`                                      | `iban`            |
| `account_routing_type1`                     | `routing_type`    |
| `account_routing_value1`                    | `routing_value`   |
| `swift_code`                                | `swift_bic`       |

Messages for our parser codes are fixed:

| code                   | message                                     |
| ---------------------- | ------------------------------------------- |
| `MISSING_VALUE`        | `{column} is required.`                     |
| `BAD_AMOUNT`           | `Amount must be a positive number.`         |
| `BAD_DATE`             | `Date of birth must be YYYY-MM-DD.`         |
| `BAD_NAME`             | `Use a first and last name.`                |
| `BAD_EMAIL`            | `Email is invalid.`                         |
| `UNSUPPORTED_CORRIDOR` | `{country}/{currency} is not in this demo.` |
| `MISSING_BANK_FIELD`   | `{column} is required for {country}.`       |

## 8. Fixtures the kit and the mock both use

Ids are stable.

| id                | What the kit binds to                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run_pricing`     | `PRICING`, six skeleton rows, `poll: true`, no totals                                                                                                                       |
| `run_ready`       | Sample file result: five ready rows, one `invalid` (empty postcode), savings on every dual-rail row, INR savings `null`, quote not expired, pay **absent**, exclude present |
| `run_ready_clean` | Same as ready after the bad row is excluded. `pay` present. Totals match the quote                                                                                          |
| `run_expired`     | Ready shape with `quoteExpired: true`, action `requote`                                                                                                                     |
| `run_short`       | Ready clean with `insufficientBalance: true`, pay absent                                                                                                                    |
| `run_inflight`    | `SUBMITTED`, `airwallexStatus: BOOKING`, mixed `processing` / `sent` / `booking`, `advance` present                                                                         |
| `run_approval`    | `SUBMITTED`, `IN_APPROVAL`, `flags.approvalHold`                                                                                                                            |
| `run_done`        | Settled, five `paid`, one `failed`                                                                                                                                          |
| `run_failed`      | `FAILED` with `error.message`                                                                                                                                               |
| `balance_ok`      | available covers `run_ready_clean`                                                                                                                                          |
| `balance_short`   | available below that total                                                                                                                                                  |

Illustrative money (source USD, fixtures only — live numbers come from Airwallex):

| Row           | Receives       | Chosen          | You pay  | Alternative    | Savings |
| ------------- | -------------- | --------------- | -------- | -------------- | ------- |
| Maya Chen     | USD 42.00      | ACH             | 42.00    | SWIFT 42.15    | 0.15    |
| Owen Blake    | GBP 31.00      | Faster Payments | 39.80    | SWIFT 40.03    | 0.23    |
| Lena Hoffmann | EUR 28.00      | SEPA            | 30.60    | SWIFT 30.78    | 0.18    |
| Noah Walsh    | AUD 36.00      | Bank transfer   | 24.10    | SWIFT 24.30    | 0.20    |
| Aisha Rahman  | SGD 41.00      | FAST            | 30.90    | SWIFT 31.12    | 0.22    |
| Priya Nair    | INR 1,850.00   | Local           | 22.20    | —              | null    |
| Sam Rivera    | USD 9.00       | —               | —        | —              | —       | invalid, empty postcode |

Clean total payer pays: `189.60`. Clean total savings: `0.98`. Fee on local rows in the fixture is `0.00`; SWIFT fee is the difference. These numbers are a teaching fixture, not a rate sheet.

`run_done` fails Priya Nair (`failed`, message `The beneficiary bank rejected the payout.`). Everyone else is `paid`.

## 9. DataSource

```ts
type DataSource = {
  listRuns(): Promise<RunSummary[]>
  getRun(id: string): Promise<RunDetail>
  createRun(file: File): Promise<RunDetail>
  pay(id: string): Promise<RunDetail>
  requote(id: string): Promise<RunDetail>
  discard(id: string): Promise<RunDetail>
  excludeRow(id: string, rowId: string): Promise<RunDetail>
  getBalance(): Promise<Balance>
  advance(id: string): Promise<RunDetail>
  reset(): Promise<void>
}
```

The mock starts with `run_inflight` and `run_done` on the home list. `createRun` of `contractors.csv` inserts a `PRICING` run (`poll: true`) and the following `getRun`, after the mock delay, returns that same id as `run_ready`. `excludeRow` on it returns `run_ready_clean`. `pay` returns `run_inflight` (new id `run_live`, same rows moved forward). `advance` follows the script in [08](./08-demo-plan.md). Illegal actions reject with `INVALID_STATE`.

Hooks live in `src/features/data`: `useRuns`, `useRun`, `useBalance`, `useCreateRun`, `usePay`, `useRequote`, `useDiscard`, `useExcludeRow`, `useAdvance`. Query keys come from one `qk` factory. `useRun` sets `refetchInterval: 2000` when `poll` is true. `usePay` refetches `useBalance`. `useRun` refetches it again when the number of `paid` rows increases.
