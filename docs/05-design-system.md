# 05 — Design System

A quiet operations screen. One column, near-black surfaces, hairline rules, square controls, flat orange for the primary action. The same token family as the FX Target Payment demo, with the chart, the grain aurora, and the trading chrome left out. Numbers are tabular. Colour is status, not decoration.

Tune the orange to Airwallex brand guidance before the demo if a brand sheet is provided. Change it in the token file only.

## 1. Principles

1. The table is the product. Chrome stays out of the way.
2. One primary button per screen: it names the outcome and the amount (`Pay 6 contractors · USD 18,960.00`).
3. Green means money saved or paid. Red means a row or a run failed. Amber means the user must act (fix, requote, approval). Orange is the action, not a status.
4. Muted text is for labels and excluded rows, not for errors.
5. Motion shows a change of step. The marker travels once, the sentence under it crossfades, and a completed step draws its check once. Nothing loops.

## 2. Colour tokens

CSS variables in `src/ui/tokens/tokens.css`, exposed to Tailwind v4 via `@theme`. Components use the variables. No hex in components.

### Surfaces

| Token | Value | Use |
| --- | --- | --- |
| `--bg-0` | `#07070A` | Page |
| `--bg-1` | `#0C0C11` | Sheet |
| `--bg-2` | `#121219` | Inputs, table header |
| `--bg-3` | `#1A1A23` | Hover row |
| `--line-1` | `rgba(255,255,255,0.06)` | Hairline |
| `--line-2` | `rgba(255,255,255,0.10)` | Input border |
| `--line-3` | `rgba(255,255,255,0.16)` | Hover border |

### Text

| Token | Value |
| --- | --- |
| `--fg-1` | `#F4F4F6` |
| `--fg-2` | `#A6A6B3` |
| `--fg-3` | `#6B6B78` |
| `--fg-4` | `#45454F` |

`--fg-1` and `--fg-2` on `--bg-1` must clear 4.5:1. `--fg-3` is labels only.

### Accent

| Token | Value | Use |
| --- | --- | --- |
| `--orange-300` | `#FFB27A` | Links |
| `--orange-500` | `#FF6A1A` | Primary button, focus ring |
| `--orange-600` | `#E5520A` | Pressed |

Focus is a 1px `--orange-500` outline, offset 2px. No glow.

### Semantic

| Token | Value | Meaning |
| --- | --- | --- |
| `--up` | `#2BD9A0` | Paid, savings > 0 |
| `--down` | `#FF4D6A` | Failed, invalid |
| `--warn` | `#FFC24B` | Needs fix, quote expired, approval |
| `--info` | `#6EA8FF` | Ready, in flight |
| `--muted` | `#6B6B78` | Excluded, pricing, discarded |

Each has a 10% wash (`--up-wash`, and so on) for badge backgrounds.

## 3. Type

- UI: Inter, via `next/font`.
- Identifiers (`shortReference`, transfer id): JetBrains Mono, 12px.
- Money and counts: `font-variant-numeric: tabular-nums`, `whitespace-nowrap`.

| Role | Size / line | Weight |
| --- | --- | --- |
| Screen title | 20 / 28 | 560 |
| Section | 14 / 20 | 560 |
| Body | 14 / 20 | 440 |
| Label | 12 / 16 | 500, `--fg-3`, tracking 0.02em |
| Money in the pay bar | 20 / 28 | 560 |

## 4. Space and shape

- 4px grid. Sheet padding 24px. Row height 52px.
- Radius: 0 on inputs, buttons, and the sheet. The product is a ruled sheet, not a card stack.
- Content width 1120px, centered. Below 800px the table becomes one card per contractor (same fields, stacked).
- One density. No theme switch.

## 5. Motion

Animation uses [Motion](https://motion.dev) (`motion` on npm, imported from `motion/react`). One `MotionConfig` wraps the app. `reducedMotion` follows `prefers-reduced-motion`. The kit toolbar sets `data-motion="off"` and forces `reducedMotion="always"` for that subtree. There is no second animation library.

| Moment | Motion | Duration |
| --- | --- | --- |
| Stepper marker | `layoutId` slides to the new current step | 220ms, ease-out |
| Stepper detail | `AnimatePresence` crossfade when the sentence changes. The marker does not replay if only the sentence changed | 160ms |
| Step completed | Check icon `pathLength` from 0 to 1, once | 200ms |
| Dialog, toast | Enter and exit, opacity and 4px translate | 160ms |
| Run page first paint | Rows stagger 30ms, opacity only. A poll that returns the same rows does not stagger again | — |
| Pricing skeleton | CSS shimmer 1.2s | — |
| Row status change | Background wash, then settle | 400ms |

Under reduced motion every one of these jumps to the end state. No travel, no draw, no shimmer, no wash.

Do not animate the width of a money figure. Do not put a looping pulse on the current step. The changing sentence is the live signal.

## 6. Formatters

`formatMoney(currency, value, { signed?: boolean })` → `USD 4,200.00`, `INR 185,000.00`, `+USD 15.00`.

- Group thousands with a comma. Always show the currency precision (2 for the demo corridors, 0 for a JPY fixture: `JPY 240,000`).
- `signed` prefixes `+` when the value is greater than zero. Zero stays unsigned.
- Savings tone: greater than zero → `up`; zero → `muted` and the text `Same price`; null → the text `Only rail` in `--fg-3`.

`formatCountdown(iso)` → `58:12` while over a minute, `45s` under a minute, `Expired` at zero. The kit freezes this with the toolbar clock so screenshots are stable.

## 7. Copy

- Screen title: `Contractor payouts`.
- Upload: `Drop a contractor CSV`.
- Sample link: `Use the sample file`.
- Pay: `Pay {n} contractors · {money}`.
- Discard: `Discard draft`.
- Exclude: `Exclude`.
- Requote: `Refresh quote`.
- Advance (demo only): `Advance statuses`.
- Empty home: `No payouts yet`.
- Env chip: `Sandbox` when `flags.demo` or the server reports sandbox. Always visible so a live key is not mistaken for a toy.

Disabled pay explains why, in `--fg-2`, next to the button:

| Flag | Text |
| --- | --- |
| `needsAttention` | `Exclude the rows with errors first.` |
| `quoteExpired` | `Quote expired.` (the button is Refresh quote) |
| `insufficientBalance` | `{currency} wallet is short by {delta}.` |
| `approvalHold` | `Waiting for approval in Airwallex. This demo cannot approve it.` |
