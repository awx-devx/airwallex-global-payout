# AGENTS.md

Guidance for AI coding agents (and humans) working in this repo.

## What this is

A **demo** of Airwallex Global Payout. The user uploads a contractor CSV. Each contractor receives the file amount in their local currency. The server prices the valid rails on a **draft** batch (no money moves), keeps the cheapest, and submits one wallet-funded batch on confirmation. There is no login and no user model: every call uses the Airwallex account for `AIRWALLEX_API_KEY`.

Stack: Next.js (App Router, TypeScript strict), MongoDB 7 via Mongoose, Tailwind v4, Motion (`motion/react`), TanStack Query, zod, decimal.js, Vitest, Playwright, pnpm. No Redis, no worker process, no chart library.

We build **contract-first**. `docs/03-contracts.md` is frozen before UI kit work. The UI runs entirely on `NEXT_PUBLIC_DATA_SOURCE=mock` while the backend is in progress. Pages are not assembled until the `/dev/ui-kit` review gate is signed off.

## Read before coding

| Need | Read |
| --- | --- |
| Overview, reading order, sequencing | `docs/README.md` |
| What Airwallex can do here, and the sandbox checklist | `docs/01-feasibility-airwallex.md` |
| Topology, layering, env | `docs/02-architecture.md` |
| **Frozen DTOs, CSV, states, REST, errors, actions** | `docs/03-contracts.md` |
| Endpoint-by-endpoint Airwallex map | `docs/04-airwallex-integration.md` |
| Tokens, type, copy tone | `docs/05-design-system.md` |
| UI kit inventory and the review gate | `docs/06-ui-kit-spec.md` |
| Screens, flows, edge states | `docs/07-pages-spec.md` |
| Sample file, mock runs, simulate script | `docs/08-demo-plan.md` |
| Decisions (D-xx) and open questions (Q-xx) | `docs/09-decisions.md` |
| Task IDs and exit criteria | `docs/tracks/U-track.md`, `docs/tracks/B-track.md` |

Focused rules live in `.cursor/rules/*.mdc`.

## Hard rules

1. **Airwallex is server-side only.** Only `src/server/**` talks to Airwallex, and only through `src/server/adapters/airwallex/client.ts`. Never expose keys or tokens to the browser. No `x-on-behalf-of` and no `x-login-as` (D-02).
2. **No JS numbers for money.** Use `decimal.js` in code, `Decimal128` in Mongo, and decimal strings in contracts. Round to `payoutPrecision` in `src/contracts/currencies.ts` at the Airwallex boundary. Never multiply by 100.
3. **`docs/03-contracts.md` is the API.** UI and backend both implement it. A contract change updates that doc in the same commit. After the UI kit gate, contract changes need a D-xx and a kit update.
4. **The UI does not invent status rules.** Buttons come from `allowedActions`. Polling follows `poll`. Rail names come from `railLabel`. Field errors arrive as `{ path, message }` already mapped to CSV columns.
5. **`src/ui/**` is props-only.** No fetching, no stores, no imports from `server/`, `features/`, or `mocks/` (showcase fixtures may import `src/mocks`).
6. **Nothing is paid without the Pay action.** Pricing uses a `DRAFTING` batch only. `submit` runs only from `POST /api/runs/:id/pay`.
7. **Deterministic `request_id`s.** Builders in `src/server/airwallex/ids.ts`: `b:{runId}`, `i:{runId}:{rowIndex}:L`, `i:{runId}:{rowIndex}:S`. A retry reuses the same id. Loser probes are deleted, never submitted.
8. **Don't invent Airwallex endpoints or enum values.** Check `docs/04`, then the markdown API reference or https://www.airwallex.com/docs/llms.txt. Unverified behaviour goes in `docs/09` as a Q-xx.
9. **Demo cap is 25 data rows and six corridors** (D-04, D-05). Do not generalise the CSV or add a beneficiary form builder in this demo.
10. **No login, no sessions, no route protection beyond `DEMO_MODE`.** `/dev/*` and `/api/demo/*` return 404 when `DEMO_MODE` is not true.

## Comment tags (required)

Tag shortcuts where they live, and keep the inventory in `docs/08-demo-plan.md` in sync:

- `DEMO-ONLY:` unsafe or incorrect in production, always followed by `PROD:`
- `SANDBOX:` relies on sandbox-only Airwallex behaviour
- `AIRWALLEX:` non-obvious API constraint, with a docs link

Audit with `rg -n "DEMO-ONLY:|SANDBOX:" src scripts`.

## Commits

**Ask the user before every commit** unless they have explicitly said to keep committing without asking in the current conversation. Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/). One logical unit per commit. Reference track IDs (`Refs: U3.2`). Never commit secrets or `.env*` (except `.env.example`). Don't push unless asked.

## Commands (once scaffolded)

```bash
pnpm dev                  # Next.js
pnpm test                 # Vitest — no credentials, no Docker
pnpm typecheck && pnpm lint
pnpm airwallex:smoke      # B2 sandbox checklist
pnpm test:visual          # Playwright screenshots of /dev/ui-kit
```
