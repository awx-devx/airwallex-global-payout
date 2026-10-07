# 05 — Design System

A light payout desk. One column, a gray canvas, white sheets, pill controls, and an ink pay button. Numbers are tabular. Lime means money saved or paid. Purple means in flight. Colour is status, not decoration.

## 1. Principles

1. The table is the product. Chrome stays out of the way.
2. One primary button per screen: it names the outcome and the amount (`Pay 6 contractors · USD 189.60`).
3. Green means money saved or paid. Red means a row or a run failed. Amber means the user must act (fix, requote, approval). Purple means in flight, links, and the focus ring. The pay button is ink, not a status.
4. Muted text is for labels and excluded rows, not for errors.
5. Motion shows a change of step. The marker travels once, the sentence under it crossfades, and a completed step draws its check once. The stepper does not loop. The edge atmosphere is the only slow drift.

## 2. Colour tokens

CSS variables in `src/ui/tokens/tokens.css`, exposed to Tailwind v4 via `@theme`. Components use the variables. No hex in components.

### Surfaces

| Token      | Value                 | Use                  |
| ---------- | --------------------- | -------------------- |
| `--bg-0`   | `#F4F5F7`             | Page                 |
| `--bg-1`   | `#FFFFFF`             | Sheet                |
| `--bg-2`   | `#F7F7F8`             | Inputs, table header |
| `--bg-3`   | `#EEF0F3`             | Hover row            |
| `--line-1` | `rgba(17,17,17,0.08)` | Hairline             |
| `--line-2` | `rgba(17,17,17,0.14)` | Input border         |
| `--line-3` | `rgba(17,17,17,0.22)` | Hover border         |

### Text

| Token          | Value     |
| -------------- | --------- |
| `--fg-1`       | `#111111` |
| `--fg-2`       | `#5C5C66` |
| `--fg-3`       | `#6B6B76` |
| `--fg-4`       | `#9A9AA3` |
| `--fg-inverse` | `#FFFFFF` |

`--fg-1` and `--fg-2` on `--bg-1` must clear 4.5:1. `--fg-3` is labels only. `--fg-inverse` is the label on the ink pay button and on danger.

### Accent

| Token      | Value     | Use                                 |
| ---------- | --------- | ----------------------------------- |
| `--lime`   | `#C6F135` | Saved and paid fills. Not body text |
| `--purple` | `#A855F7` | Focus ring, current-step marker     |

Focus is a 1px `--purple` outline, offset 2px. No glow. The pay button uses `--fg-1` with `--fg-inverse` type.

### Semantic

| Token     | Value     | Meaning                                                            |
| --------- | --------- | ------------------------------------------------------------------ |
| `--up`    | `#3C6B12` | Paid, savings > 0. Text on white and on the lime wash              |
| `--down`  | `#C81E3A` | Failed, invalid                                                    |
| `--warn`  | `#8A5A00` | Needs fix, quote expired, approval                                 |
| `--info`  | `#7C3AED` | Ready, in flight, links. Darker than `--purple` so it clears 4.5:1 |
| `--muted` | `#6B6B76` | Excluded, pricing, discarded                                       |

`--up-wash` is lime mixed 55% with white. The other washes are a light tint of the text colour. `--scrim` is `rgba(17,17,17,0.48)` behind the dialog.

## 3. Type

- UI: Space Grotesk, via `next/font`.
- Identifiers (`shortReference`, transfer id): JetBrains Mono, 12px.
- Money and counts: `font-variant-numeric: tabular-nums`, `whitespace-nowrap`.

| Role                 | Size / line | Weight                         |
| -------------------- | ----------- | ------------------------------ |
| Screen title         | 20 / 28     | 560                            |
| Section              | 14 / 20     | 560                            |
| Body                 | 14 / 20     | 440                            |
| Label                | 12 / 16     | 500, `--fg-3`, tracking 0.02em |
| Money in the pay bar | 20 / 28     | 560                            |

## 4. Space and shape

- 4px grid. Sheet padding 24px. Row height 52px.
- Radius: `--radius-pill` (999px) on buttons, badges, and the balance pill. `--radius-sheet` (20px) on sheets, dialogs, toasts, and the dropzone. `--radius-input` (12px) on inputs. The contractor table stays a ruled grid. Rows are not separate bubbles.
- Content width 1120px, centered. Tables keep their columns down to 375px. The table region scrolls sideways and the first column stays put. The page itself does not scroll sideways. At 800px and below the stepper is vertical.
- The canvas has an edge atmosphere: white capsules, a lime arc, a purple pill, and an ink pill. Shapes sit fully in the gutter outside the 1120 column, with no fade. They drift and lean with the cursor, staying anchored in the gutter. Below 1248px there is not enough gutter for a whole cap, so the atmosphere is hidden. The centre stays clear so the table is readable. Reduced motion holds the shapes still.
- One density. No theme switch.

## 5. Motion

Animation uses [Motion](https://motion.dev) (`motion` on npm, imported from `motion/react`). One `MotionConfig` wraps the app. `reducedMotion` follows `prefers-reduced-motion`. The kit toolbar sets `data-motion="off"` and forces `reducedMotion="always"` for that subtree. There is no second animation library.

| Moment               | Motion                                                                                                                   | Duration                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| Stepper marker       | `layoutId` slides to the new current step                                                                                | 220ms, ease-out                |
| Stepper detail       | `AnimatePresence` crossfade when the sentence changes. The marker does not replay if only the sentence changed           | 160ms                          |
| Step completed       | Check icon `pathLength` from 0 to 1, once                                                                                | 200ms                          |
| Dialog, toast        | Enter and exit, opacity and 4px translate                                                                                | 160ms                          |
| Run page first paint | Rows stagger 30ms, opacity only. A poll that returns the same rows does not stagger again                                | —                              |
| Pricing skeleton     | CSS shimmer 1.2s                                                                                                         | —                              |
| Row status change    | Background wash, then settle                                                                                             | 400ms                          |
| Payout row           | Arrow fades and slides in at the row end on hover or focus. On a touch screen it stays visible                           | 160ms                          |
| Balance drop         | After a payout is paid, or as soon as pay succeeds, the header refetches. If available fell, the pill washes `--down` and returns | 180ms each way, hold 280ms     |
| Dropzone             | On hover the arrow bobs down toward the line; border and fill settle. While a file is over it the target scales slightly | 160ms, bob 850ms while hovered |
| Atmosphere           | Cursor parallax, plus a slow drift on each shape                                                                         | drift 5–8s                     |

Under reduced motion every one of these jumps to the end state. No travel, no draw, no shimmer, no wash, no drift, no parallax. The row arrow still appears, without the slide. The drop arrow still lowers, without the bob. The balance pill updates the figure without the red wash.

Do not animate the width of a money figure. Do not put a looping pulse on the current step. The changing sentence is the live signal.

## 6. Formatters

`formatMoney(currency, value, { signed?: boolean })` → `USD 4,200.00`, `INR 185,000.00`, `+USD 15.00`.

- Group thousands with a comma. Always show the currency precision (2 for the demo corridors, 0 for a JPY fixture: `JPY 240,000`).
- `signed` prefixes `+` when the value is greater than zero. Zero stays unsigned.
- Savings tone: greater than zero → `up`; zero → `muted` and the text `Same price`; null → the text `Only rail` in `--fg-3`.

`formatCountdown(iso)` → `58:12` while over a minute, `45s` under a minute, `Expired` at zero. The kit freezes this with the toolbar clock so screenshots are stable. On a live `READY` run the page ticks that clock once a second against the quote's `expiresAt`. The mock clock stays frozen. After submit the countdown is hidden. `QuoteCountdown` shows the time beside a clock, with `Time left before this price expires.` When it has expired, the line is `This price has expired. Refresh the quote to pay.`

## 7. Copy

- Header mark: `public/assets/logomark.png` beside the wordmark `Global Payouts`. One link, home. Below 800px the bar is a single row and the wordmark is visually hidden. The favicon is the same mark centered in a square (`public/assets/favicon.png`) so the browser does not stretch it.
- Upload: `Drop a contractor CSV`.
- Sample control: a `Sample file` menu. Each row uses that file. A download mark on the row fades in on hover and focus, the same way the payout-list arrow does, and saves that file. `Download template` saves `contractors-template.csv`, the header row only.
- Pay: `Pay {n} contractors · {money}`.
- Discard: `Discard draft`.
- Exclude: `Exclude`.
- Requote: `Refresh quote`.
- Advance (demo only): `Advance statuses`.
- Empty home: `No payouts yet`.
- Env chip: `Sandbox` when `flags.demo` or the server reports sandbox. Always visible so a live key is not mistaken for a toy.

Disabled pay explains why, in `--fg-2`, next to the button:

| Flag                  | Text                                                              |
| --------------------- | ----------------------------------------------------------------- |
| `needsAttention`      | `Exclude the rows with errors first.`                             |
| `quoteExpired`        | `Quote expired.` (the button is Refresh quote)                    |
| `insufficientBalance` | `{currency} wallet is short by {delta}.`                          |
| `approvalHold`        | `Waiting for approval in Airwallex. This demo cannot approve it.` |
