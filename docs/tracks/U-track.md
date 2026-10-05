# U — UI Track

**Goal:** a reviewed kit, then the two screens running entirely on mock data, then a swap onto the real API without changing components.

**References:** [05](../05-design-system.md) · [06](../06-ui-kit-spec.md) · [07](../07-pages-spec.md) · [03](../03-contracts.md) · [08](../08-demo-plan.md)

**Rules**

- `src/ui/**` is props-only. No `fetch`, no TanStack Query, no imports from `server/`, `features/`, or `mocks/` except `*.fixtures.ts` files that feed a showcase.
- Domain types come from `src/contracts`. Do not redeclare `RunDetail` inside a component.
- Money goes through `formatMoney`.
- Every component and every state lands on `/dev/ui-kit` in the same change.
- Do not start U5 until the review gate is signed in [09](../09-decisions.md).

The backend track can run at the same time. It is not allowed to change [03](../03-contracts.md) to fit a shortcut. If it must, stop and update the contract, the fixtures, and the kit together.

Estimates are for one engineer.

---

## Phase 0 — Contracts and mocks (shared with B) · ~1 day

Blocks U2. Do this before building components.

| ID | Task | Done when |
| --- | --- | --- |
| C0.1 | `src/contracts`: zod schemas and types for every DTO in [03 §5](../03-contracts.md#5-dtos), plus `permissions.ts` (`allowedActions`, `poll`, `settled`), `progress.ts` (`runProgress`), and `railLabel()` | `pnpm test contracts` accepts the fixtures and checks `allowedActions` and `runProgress` for `run_pricing`, `run_ready`, `run_ready_clean`, `run_expired`, `run_short`, `run_inflight`, `run_approval`, `run_done`, `run_failed` |
| C0.2 | `src/contracts/currencies.ts` payout precision, including 0 dp and 3 dp codes | Formatter tests use USD, INR, JPY, BHD |
| C0.3 | `src/contracts/csv.ts` parser. Pure. Browser-safe | Accepts `docs/samples/contractors.csv`. Rejects a bad header, 26 rows, empty amount, single-word name, and `FR/EUR`. Sam Rivera is `invalid` / `MISSING_VALUE` on `postcode` |
| C0.4 | `src/mocks/fixtures.ts` the runs in [03 §8](../03-contracts.md#8-fixtures-the-kit-and-the-mock-both-use), money strings exact | Kit sections import these ids |
| C0.5 | Mock `DataSource`: list, get, create, exclude, pay, requote, discard, advance, reset. Advance follows [08 §3](../08-demo-plan.md#3-script-mock-and-later-sandbox) | Same sequence as the script. Second `pay` on an already submitted run returns `INVALID_STATE` |

## Phase 1 — App scaffold · ~0.5 day

| ID | Task | Done when |
| --- | --- | --- |
| U0.1 | Next.js App Router, TypeScript strict, pnpm, ESLint, Prettier, aliases `@/ui` `@/contracts` `@/mocks` `@/features` `@/server` | `pnpm dev` runs |
| U0.2 | Tailwind v4, `tokens.css` wired, Inter and JetBrains Mono via `next/font`, and the `motion` package (Motion, [05 §5](../05-design-system.md#5-motion)) | Tokens visible in devtools. `motion/react` imports |
| U0.3 | `/dev/ui-kit` shell: nav, section registry, toolbar (reduced motion, freeze clock, widths 800 and 1120). 404 when `DEMO_MODE` is not set | Empty sections render |
| U0.4 | ESLint `no-restricted-imports` for `src/ui` | A deliberate bad import fails lint |
| U0.5 | Playwright screenshot spec per kit anchor | `pnpm test:visual` runs |

Copy `docs/samples/contractors.csv` to `public/samples/contractors.csv` in U5, not before. The kit does not need it.

## Phase 2 — Tokens · ~0.5 day

| ID | Task | Done when |
| --- | --- | --- |
| U1.1 | Colour, text, semantic tokens ([05 §2](../05-design-system.md#2-colour-tokens)) | Swatches on the kit |
| U1.2 | Type roles and tabular number utility | Type ramp on the kit |
| U1.3 | `formatMoney`, `formatCountdown`, savings tone helper, unit tests | USD, INR, JPY, BHD, signed savings, zero, null |
| U1.4 | `MotionConfig` at the app root. Reduced motion from `prefers-reduced-motion` and from `data-motion="off"` | Toolbar toggle stops shimmer, marker travel, and the check draw |

**Exit:** glance at the tokens section. Contrast pairs are written under the swatches. This is not the kit gate.

## Phase 3 — Primitives · ~1.5 days

Everything in [06 §2](../06-ui-kit-spec.md#2-primitives).

| ID | Group |
| --- | --- |
| U2.1 | Button, IconButton |
| U2.2 | TextInput, FileDropzone |
| U2.3 | Table, Badge, KeyValue |
| U2.4 | Dialog, Toast, Banner, Tooltip |
| U2.5 | Skeleton, EmptyState |

**Exit:** each matrix is on the kit. Focus and keyboard checked for Button and Dialog.

## Phase 4 — Payout components and patterns · ~2 days

[06 §3](../06-ui-kit-spec.md#3-payout-components) and [06 §4](../06-ui-kit-spec.md#4-patterns).

| ID | Group |
| --- | --- |
| U3.1 | Money, RailChip, Savings, StatusBadge (every row status and every run condition) |
| U3.2 | FieldErrors, QuoteCountdown, BalancePill, CostSummary |
| U3.3 | ContractorRow desktop and stacked, driven by the fixtures |
| U3.4 | PayBar for pay, requote, short balance, needs-attention, approval, advance |
| U3.5 | `ProcessStepper` for every `runProgress` case in [03](../03-contracts.md), horizontal and vertical, including the one-shot Price → Review story |
| U4.1 | AppHeader, UploadPanel, RunList |
| U4.2 | ReviewTable for `run_pricing`, `run_ready`, `run_ready_clean`, with the stepper above it |
| U4.3 | Pay and Done stepper sentences for `run_inflight`, `run_approval`, and `run_done` |

## Phase 5 — Review gate · ~0.5 day

| ID | Task | Done when |
| --- | --- | --- |
| U4.4 | Walk [06 §5](../06-ui-kit-spec.md#5-review-gate) with a reviewer. Fix what they mark. Capture the Playwright baseline. Write the sign-off row in [09](../09-decisions.md) | The sign-off table has a name and a date |

**Stop.** Do not build `/` or `/runs/[id]` before that row is filled.

## Phase 6 — Pages on mocks · ~1.5 days

| ID | Task | Done when |
| --- | --- | --- |
| U5.1 | `src/features/data`: DataSource selection from `NEXT_PUBLIC_DATA_SOURCE`, hooks, `qk` factory, `refetchInterval` when `poll` | Hooks return fixture shapes unchanged |
| U5.2 | Home per [07 §1](../07-pages-spec.md#1-home-) | Sample upload routes to the new run. The stepper is on Price, then on Review when the mock promotes it. A `.png` stays on the page with `UNSUPPORTED_FILE` |
| U5.3 | Run page per [07 §2](../07-pages-spec.md#2-run-runsid) | Exclude Sam, confirm pay, land on in-flight |
| U5.4 | Advance button runs the two-step script. The stepper sentence moves from processing, to sent, to `5 of 6 paid.` The Done step is `failed` | Matches [08 §3](../08-demo-plan.md#3-script-mock-and-later-sandbox) |
| U5.5 | Edge states in [07 §4](../07-pages-spec.md#4-edge-states-both-screens), including unknown id | Empty state renders |
| U5.6 | Playwright: the script in [08 §3](../08-demo-plan.md#3-script-mock-and-later-sandbox) against the mock | Green without a backend |

**Exit:** the demo can be performed with `NEXT_PUBLIC_DATA_SOURCE=mock` and no MongoDB.

## Phase 7 — Integration (with B6) · ~1 day

| ID | Task | Done when |
| --- | --- | --- |
| U6.1 | `api` DataSource: the REST table in [03 §6](../03-contracts.md#6-rest). Map the error envelope to the upload panel, the pay-bar flags, or a toast | `AIRWALLEX_ERROR` toasts and stays on the run |
| U6.2 | No optimistic pay. The returned `RunDetail` replaces the cache | A failed pay does not flip the badge locally |
| U6.3 | Walk the script against `PAYMENTS_GATEWAY=mock` on the server, then against sandbox once B2 has passed | Record drift as a contract fix, not a one-off UI branch |

## Phase 8 — Polish · ~0.5 day

Pass for focus order, reduced motion, truncation, and the 800px cards. Confirm the stepper marker and the check draw are transform/opacity/`pathLength` only. Update the visual baseline in its own commit if pixels moved. The baseline is shot with motion frozen.
