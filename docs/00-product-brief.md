# 00 — Product Brief

## One sentence

Upload a contractor payment file, pay everyone in their local currency through the cheapest rail.

## Who it's for

A demo audience watching a single operator pay a small contractor roster from one Airwallex wallet. The operator already has an Airwallex account. The API key is configured on the server. The screen has no sign-in, no org switcher, and no "connected account".

## The job

1. Drop `contractors.csv` (or use the sample).
2. See each person, the amount they receive, the rail we chose, the fee, what the wallet pays, and the saving versus the other rail.
3. Exclude a bad row if there is one.
4. Press Pay. One batch goes out. The same screen moves from review to progress until each payout is paid or failed.

## What "cheapest rail" means

For each contractor we price two candidates when both exist:

- the default **local** payout for that country and currency
- **SWIFT**, when SWIFT can deliver that same currency

We keep the candidate with the lower `amount_payer_pays` (source currency, fees included, payer pays the fee). The other price stays on the row as the comparison. If only one rail can pay that currency, the row says **Only rail** and savings are blank.

India/INR is the sample of "only rail": Airwallex local payouts deliver INR, and SWIFT into India does not list INR. We do not convert the contractor onto a different currency to manufacture a comparison.

## What the file promises

The amount column is what the contractor receives, not what we debit. `fee_paid_by` is `PAYER`. On SWIFT we set `swift_charge_option` to `PAYER` so shared intermediary charges do not shrink the receive amount.

## Screens

Two product screens, plus the dev kit:

| Screen | Route | Job |
| --- | --- | --- |
| Home | `/` | Balance, upload, recent runs |
| Run | `/runs/[id]` | Review while draft; progress after pay |
| UI kit | `/dev/ui-kit` | Review gate. Not part of the demo script |

## Scope

- One wallet, one source currency, one API-key account.
- CSV only. Header required. At most 25 data rows.
- Six corridors: `US/USD`, `GB/GBP`, `DE/EUR`, `AU/AUD`, `SG/SGD`, `IN/INR`.
- Personal contractors (`entity_type: PERSONAL`), reason `wages_salary`.
- Wallet funding. Omit `transfer_date` so the batch dispatches as soon as Airwallex can.
- Draft pricing, then an explicit Pay.
- Mock data source so the UI runs with the backend unfinished.
- Sandbox transfer simulation to walk item statuses on stage.

## Non-goals

- Login, users, roles, SSO, or connected accounts.
- Inline editing of a row. A bad row is excluded, or the file is re-uploaded.
- Beneficiary form schemas rendered as a dynamic form.
- Linked-account direct debit, scheduled `transfer_date`, FX forwards.
- Approval workflow inside this app. The sandbox account must have transfer approval off (D-06). If Airwallex still returns `IN_APPROVAL`, the screen says so and stops.
- Charts, command palettes, multi-step wizards, notifications center.
- Redis, a worker process, or a queue.
- Production hardening, SCA, or hosting. The user deploys by hand if they want to.

## Done looks like

On mock data, with no backend: upload the sample, read the rail column, exclude the broken row, pay, and advance statuses to paid / one failure.

On the sandbox, the same clicks create a real draft batch, delete the losing probes, quote, submit, and reach `BOOKED`, then simulated or real transfer statuses.
