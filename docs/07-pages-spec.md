# 07 — Pages Spec

Two screens. Both are assemblies of [06](./06-ui-kit-spec.md). They contain no layout invention beyond this document. Data comes from the hooks in [03 §9](./03-contracts.md#9-datasource).

Desktop first. Check at 1120 and 800. Below 800 the review table is stacked cards. There is no third breakpoint.

## 1. Home `/`

```
AppHeader
UploadPanel
RunList
```

- Header balance is `useBalance`.
- Dropping a file or activating the sample link calls `useCreateRun`, then routes to `/runs/{id}`.
- The sample link fetches `/samples/contractors.csv` and uploads that file. It does not skip the parser.
- `RunList` rows link to `/runs/{id}`. Columns: file name, created (absolute date, `2 Apr 2026`), status badge, contractors (`includedCount`), you pay (or `—` while null).
- Empty copy: `No payouts yet`.
- File-level errors stay on `UploadPanel`. No run is created.
- Loading: dropzone shows its loading state and ignores a second drop.

## 2. Run `/runs/[id]`

```
AppHeader (back link "Payouts" to /)
title: fileName + StatusBadge
ProcessStepper       # runProgress(run); the sentence under the current step
CostSummary          # hidden while PRICING
QuoteCountdown       # only when quote is non-null
Banner               # flags, one at a time, priority below
ReviewTable | skeleton
PayBar
```

The screen calls `runProgress(run)` and passes the result into `ProcessStepper`. When a poll returns a new sentence or a new current step, Motion plays the transition in [05 §5](./05-design-system.md#5-motion). The page does not keep its own step index.

Banner priority, highest first: `error.message` (down), `approvalHold`, `insufficientBalance`, `needsAttention`. Quote expiry is the pay bar, not a second banner.

### PRICING

Skeleton rows equal to `rowCount` when it is already known, otherwise six. Pay bar shows Discard only. `poll` is true.

### READY

`ReviewTable` of every row, excluded rows last, dimmed. Pay bar per `allowedActions`.

Exclude asks for no confirm. The row updates from the returned `RunDetail`.

Discard opens the danger dialog: `Discard this draft? Nothing has been paid.` Confirm calls discard and routes home.

Pay opens a confirm dialog: `Pay {includedCount} contractors · {totalPayerPays} from the {sourceCurrency} wallet?` Confirm calls pay. The button in the dialog is the same label as the pay bar. On `QUOTE_EXPIRED` or `INSUFFICIENT_BALANCE`, close the dialog and show the pay-bar sentence from the returned run (the hook refetches). On `AIRWALLEX_ERROR`, toast the message and stay on the page.

### SUBMITTED

Same table. Status column moves. Pay bar drops Pay and Discard. If `advance` is present, show `Advance statuses` as a secondary button. The stepper stays on Pay and its sentence follows [03](./03-contracts.md) until Done.

`IN_APPROVAL` keeps the table and shows the approval banner. No approve button.

### FAILED

Banner is `error.message`. Discard is available only if `allowedActions` says so. Otherwise the only control is the back link.

### DISCARDED

If the user lands here by URL: badge Discarded, table as last stored, no pay bar.

### Missing run

`NOT_FOUND` renders `EmptyState` `This payout does not exist` and a link home.

## 3. Demo advance

Visible only when `advance` is in `allowedActions`. One click runs the scripted step in [08](./08-demo-plan.md). The button reads `Advance statuses`. It is not shown when `NEXT_PUBLIC_DATA_SOURCE=api` unless the server returned the action (demo mode and not settled).

## 4. Edge states (both screens)

| State | What the user sees |
| --- | --- |
| Balance loading | Pill skeleton |
| Balance request failed | Pill text `Balance unavailable`. Pay stays governed by `allowedActions` |
| `poll` true | No spinner in the header. The stepper sentence is the signal |
| Long name | Truncate with tooltip |
| All rows excluded | `includedCount` 0, pay absent, helper `Nothing to pay.` |
| Reduced motion | No shimmer, no status flash |

## 5. What pages must not do

- Compute savings, totals, whether Pay is legal, or which stepper step is current.
- Map Airwallex statuses. The stepper sentence comes from `runProgress`.
- Call `fetch` except through the DataSource hooks.
- Add a third screen, a drawer, or a row editor.
