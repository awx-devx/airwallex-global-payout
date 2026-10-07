# 06 — UI Kit Spec

Every component lives in `src/ui`, is props-only, and ships with a `showcase.tsx` on `/dev/ui-kit` in the same change. Fixtures come from [03 §8](./03-contracts.md#8-fixtures-the-kit-and-the-mock-both-use). The kit does not fetch.

Layers, low to high. A lower layer never imports a higher one.

`tokens` → `format` → `primitives` → `payout` → `patterns`

## The kit page

`/dev/ui-kit` (404 unless `DEMO_MODE`).

- Left nav, one anchor per section below.
- Toolbar: reduced motion, freeze clock (countdown), width presets `800` and `1120`.
- Each section shows the variant × state matrix, including long names (`Aisha Rahman binte …` truncated with title tooltip), `0.00`, a 0 dp fixture (`JPY 240,000`), and a 3 dp fixture (`BHD 1.234`).

## 1. Tokens

Swatches for every token in [05](./05-design-system.md). Type ramp. A money sample line. Contrast pairs listed as text under the swatches (`--fg-1 on --bg-1`, `--fg-2 on --bg-1`).

## 2. Primitives

| Component      | Variants / states                                                              |
| -------------- | ------------------------------------------------------------------------------ |
| `Button`       | primary, secondary, danger, ghost × default, hover, pressed, disabled, loading |
| `IconButton`   | ghost, disabled. Used for copy-id                                              |
| `TextInput`    | default, focus, error, disabled                                                |
| `FileDropzone` | idle, drag, loading, error (`UNSUPPORTED_FILE` message)                        |
| `Table`        | header, row, hover, numeric column alignment                                   |
| `Badge`        | tones `up`, `down`, `warn`, `info`, `muted`                                    |
| `Dialog`       | default, danger (discard confirm)                                              |
| `Toast`        | info, down. One at a time                                                      |
| `Banner`       | warn, down, info                                                               |
| `Skeleton`     | text, money, table row × 6                                                     |
| `EmptyState`   | title + one action                                                             |
| `Tooltip`      | label overflow                                                                 |
| `KeyValue`     | label left, value right, mono value option                                     |

Buttons and menu items use the pointer cursor. Disabled stays the default cursor. Focus ring is the token outline.

## 3. Payout components

| Component        | Props                                                                                              | Must show                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Money`          | `currency`, `value`, `signed?`, `size: body \| bar`                                                | Tabular, nowrap. Signed savings. Zero. JPY 0 dp                                                                                                             |
| `RailChip`       | `railLabel`, `chosen: boolean`                                                                     | Chosen has an `info` badge `Cheapest`. SWIFT alternative is text, not a second chosen badge                                                                 |
| `Savings`        | `savings: string \| null`                                                                          | `+USD 15.00` in `--up`; `Same price`; `Only rail`                                                                                                           |
| `StatusBadge`    | `kind: 'run' \| 'row'` plus the status fields the maps in [03 §4](./03-contracts.md#4-status) need | Every row status. Every run condition, including approval and "paid with failures"                                                                          |
| `FieldErrors`    | `FieldError[]`                                                                                     | One line per error, `path` not shown raw if the message already names the column                                                                            |
| `QuoteCountdown` | `expiresAt`, `expired`                                                                             | Clock icon and the remaining time. The line is the price window. `Expired` tone `warn`                                                                      |
| `BalancePill`    | `Balance`                                                                                          | `USD available 40,000.00`. A lower available amount washes the pill red, then it settles. Reduced motion skips the wash                                       |
| `CostSummary`    | payer pays, fee, savings, source currency                                                          | Three figures. Fee `USD 0.00` still shown                                                                                                                   |
| `ContractorRow`  | `RunRow`                                                                                           | Table row. The table scrolls inside itself below the content width. States: pricing skeleton, ready, invalid, needs_fix, excluded, processing, paid, failed |
| `PayBar`         | totals, `allowedActions`, `flags`, balance                                                         | Pay, Refresh quote, Discard, the disabled sentences in [05 §7](./05-design-system.md#7-copy), Advance                                                       |
| `ProcessStepper` | `RunProgress` from `runProgress()`                                                                 | Five steps. Horizontal at 1120, vertical list at 800. States below                                                                                          |

`ContractorRow` shows: name, email in `--fg-3`, receives (`Money`), rail (`RailChip` plus "instead of {alt label}" when an alternative exists), fee, you pay, savings, status, and Exclude when the row is `invalid` or `needs_fix`.

`ProcessStepper` is props-only. It does not call `runProgress`. The showcase passes the progress objects for `run_pricing`, `run_ready`, `run_ready_clean`, `run_inflight`, `run_approval`, `run_done`, `run_failed`, and `run_discarded` if that fixture exists — otherwise a discarded progress built by the helper from a `DISCARDED` run. One story plays Price → Review once; the freeze switch jumps that story to Review. Marker, detail, and check use Motion as in [05 §5](./05-design-system.md#5-motion).

## 4. Patterns

| Pattern                                | Built from                                                     | States                                                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppHeader`                            | logomark + `Global Payouts`, `BalancePill`, env chip `Sandbox` | balance loading, balance error. Below 800px the wordmark is hidden and the bar stays one row                                                                            |
| `UploadPanel`                          | `FileDropzone`, sample menu, template download, file-level error | idle, loading, `UNSUPPORTED_FILE`, `TOO_MANY_ROWS`. Opening `Sample file` lists the four files. Choosing a row uploads it. The row's download mark appears on hover and focus. `Download template` saves the header CSV |
| `RunList`                              | table of `RunSummary`                                          | empty, two runs (`run_inflight`, `run_done`), loading. The whole row is the link; an arrow fades in on hover. Scrolls inside itself when the row is wider than the page |
| `ReviewTable`                          | header + `ContractorRow`                                       | `run_pricing`, `run_ready`, `run_ready_clean`                                                                                                                           |
| `ProcessStepper` on the review pattern | the helper output for that fixture                             | pricing, review, paying, done with a failure                                                                                                                            |

Patterns are still props-only. They do not call hooks.

## 5. Review gate

No page work (U5) starts until this list is checked and the sign-off line in [09](./09-decisions.md) is filled.

- [ ] Tokens section matches [05](./05-design-system.md). No hex in components.
- [ ] Every primitive matrix is on the page.
- [ ] Every `RowStatus` and every run badge condition is on the page.
- [ ] `run_ready` shows five cheapest chips, INR `Only rail`, and Sam Rivera's invalid postcode error. Pay is not shown. Exclude is.
- [ ] `run_ready_clean` pay label reads `Pay 6 contractors · USD 189.60`.
- [ ] `run_expired`, `run_short`, and `run_approval` show the sentences in [05 §7](./05-design-system.md#7-copy).
- [ ] `run_done` shows Paid with failures and Priya Nair failed.
- [ ] Width 800 and width 1120 both use the table. The table scrolls inside itself when it is wider than the stage. No page-level horizontal scroll.
- [ ] `ProcessStepper` shows Price, Review, Pay (processing), Pay (approval), Done with `5 of 6 paid.`, and a failed Price. Reduced motion cuts the marker travel, the check draw, and the detail crossfade.
- [ ] Reduced motion kills the skeleton shimmer and the status flash.
- [ ] Keyboard: upload, Pay, Discard, Exclude, and both dialogs are reachable. Focus is visible. Dialogs trap focus.
- [ ] Playwright baseline captured (`pnpm test:visual`).

Sign-off is a human check of `/dev/ui-kit`, not a screenshot of one happy row.
