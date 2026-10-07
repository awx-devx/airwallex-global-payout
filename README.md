# <img src="public/assets/logomark.png" alt="" width="56" height="28" style="height: 28px; width: auto; vertical-align: middle;"> Global Payout Demo

<p>
  <a href="https://nextjs.org/"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://mongoosejs.com/"><img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white"></a>
  <a href="https://tailwindcss.com/"><img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white"></a>
  <a href="https://www.airwallex.com/docs"><img alt="Airwallex sandbox" src="https://img.shields.io/badge/Airwallex-sandbox-6C47FF?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iNTc4IiBoZWlnaHQ9IjM4NSIgdmlld0JveD0iMCAwIDU3OCAzODUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI%2BCjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNTU1LjgwNyAxNTEuMjg3QzU2NS43OTUgMTYxLjAwOSA1NzIuNzIzIDE3My40MzkgNTc1LjczOCAxODcuMDQ3QzU3OC43NTQgMjAwLjY1NiA1NzcuNzI1IDIxNC44NDggNTcyLjc3OSAyMjcuODhMNTM1LjA5MyAzMzAuMjZDNTI1LjIwMiAzNTcuMTQgNTAyLjY1OCAzNzcuOTM0IDQ3NC43OTkgMzgzLjM2MUM0NjAuODYzIDM4Ni4xNSA0NDYuNDMyIDM4NS4wOTkgNDMzLjA0OCAzODAuMzE5QzQxOS42NjUgMzc1LjUzOSA0MDcuODMyIDM2Ny4yMSAzOTguODE2IDM1Ni4yMjRMMTcyLjgyOCA4NS40Njg5QzE3Mi4yNjYgODQuODAyNiAxNzEuNTM5IDg0LjI5NTUgMTcwLjcyIDgzLjk5ODNDMTY5LjkwMSA4My43MDExIDE2OS4wMTggODMuNjI0MyAxNjguMTU5IDgzLjc3NTVDMTY3LjMwMSA4My45MjY3IDE2Ni40OTcgODQuMzAwNiAxNjUuODI5IDg0Ljg1OThDMTY1LjE2IDg1LjQxOTEgMTY0LjY1IDg2LjE0NDEgMTY0LjM1IDg2Ljk2MjJMOTkuODI0MiAyODUuODNDODkuMjk4OCAyODkuOTQxIDkzLjM0NTIgMjkzLjkyMyA5Ny4zNTk1IDI5Mi4yODVMMTg3LjU4NSAyNTUuNDM0QzE5Mi42NzEgMjUzLjM3MiAxOTguMTI5IDI1Mi4zODMgMjAzLjYxNiAyNTIuNTNDMjA5LjEwMyAyNTIuNjc2IDIxNC41IDI1My45NTUgMjE5LjQ2OSAyNTYuMjg2QzIyNC40MzggMjU4LjYxNyAyMjguODcyIDI2MS45NDkgMjMyLjQ5MyAyNjYuMDc0QzIzNi4xMTMgMjcwLjIgMjM4Ljg0MiAyNzUuMDI4IDI0MC41MDkgMjgwLjI1OEMyNDcuMTczIDMwMC42OTkgMjM1Ljk2NSAzMjIuNzc3IDIxNi4yMyAzMzAuODM4TDk4LjM3MSAzNzguOTYxQzc2LjU0OTQgMzg3Ljg3MyA1MS40ODQyIDM4Ni4zIDMxLjgzMDIgMzczLjE4MUMxOC40MzY3IDM2NC4yMyA4LjQ1MTE5IDM1MS4wMjYgMy40ODY1NiAzMzUuNzAxQy0xLjQ3ODA2IDMyMC4zNzYgLTEuMTMyIDMwMy44MjQgNC40Njg4NyAyODguNzJMOTkuMzM4IDUzLjgzNjRDMTAxLjYzMSAyNS45OTMzIDEyNS4wNzQgNi4zMzkzMyAxNTQuMDU3IDEuMjY1MjdDMTY4LjE3MiAtMS4yNjQxMSAxODIuNzA1IDAuMDEzNDc2NiAxOTYuMTYxIDQuOTY2NTRDMjA5LjYxOCA5LjkxOTU5IDIyMS41MTEgMTguMzY5MiAyMzAuNjE4IDI5LjQ0NTZMMzYwLjMyNyAxODQuODc5TDQ3OS42MzIgMTM2LjE0NUM1MDYuMTQyIDEyNS4zMjMgNTM1LjMzNCAxMzEuMTE5IDU1NS44MDcgMTUxLjI4N1pNNDg3LjAwMiAyMjkuMzU3QzQ4OC41MTEgMjI1LjI0NiA0ODQuNDY1IDIyMS4yNjQgNDgwLjQ1MSAyMjIuOTE4TDQxNC41MzYgMjQ5LjgzTDQ1NC4wNjkgMjk3LjIxNEM0NTQuNjMgMjk3Ljg4OSA0NTUuMzU4IDI5OC40MDMgNDU2LjE4MiAyOTguNzA1QzQ1Ny4wMDUgMjk5LjAwNyA0NTcuODkzIDI5OS4wODcgNDU4Ljc1NyAyOTguOTM1QzQ1OS42MjEgMjk4Ljc4NCA0NjAuNDI5IDI5OC40MDcgNDYxLjEgMjk3Ljg0MkM0NjEuNzcyIDI5Ny4yNzggNDYyLjI4MiAyOTYuNTQ2IDQ2Mi41NzkgMjk1LjcyMUw0ODYuOTg2IDIyOS4zNTdINDg3LjAwMloiIGZpbGw9IndoaXRlIi8%2BCjwvc3ZnPgo%3D&logoColor=white"></a>
</p>

## What this is

Upload a contractor payment file. Each person is paid the amount on the file in their local currency. The app prices the available rails, keeps the cheapest, and submits one wallet-funded batch.

There is no login. Every call uses the Airwallex account for `AIRWALLEX_API_KEY`.

This is a demo on an Airwallex **sandbox** account, not a production system. Shortcuts are tagged in code and listed in [docs/08-demo-plan.md](docs/08-demo-plan.md). Product scope is in [docs/00-product-brief.md](docs/00-product-brief.md).

## Stack

Next.js App Router, MongoDB via Mongoose, Tailwind CSS. Airwallex is called from the server only.

## Deploy on Replit

Replit imports this repo and publishes the Next.js server. MongoDB stays on Atlas. The server reads [`.env.example`](.env.example).

1. Create a MongoDB Atlas cluster. Allow Replit’s egress (`0.0.0.0/0` is the usual sandbox choice) and copy `MONGODB_URI`. The process refuses to boot without it.
2. Import the repo: [replit.com/github/HeimLabs/airwallex-global-payout](https://replit.com/github/HeimLabs/airwallex-global-payout).
3. Set secrets in **both** the workspace Secrets tool and the deployment’s Secrets. Workspace secrets are not copied into a deployment. `NEXT_PUBLIC_*` must be present at build time.
4. For a real demo set `NEXT_PUBLIC_DATA_SOURCE=api` and `PAYMENTS_GATEWAY=airwallex`, plus `MONGODB_URI`, `SOURCE_CURRENCY=USD`, and the Airwallex values from [`.env.example`](.env.example) (`AIRWALLEX_ENV=sandbox`, `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY`). Set `DEMO_MODE=true` when you want the Advance control and `/dev/ui-kit`. Leave `NEXT_PUBLIC_DATA_SOURCE=mock` to click through the scripted file with no Airwallex keys.
5. Publish. Autoscale (the `.replit` default) can scale to zero and miss a webhook on a cold start. Choose a **Reserved VM** if webhooks must land while the app is idle. Opening the run still refreshes status from Airwallex.
6. In the Airwallex sandbox, set the webhook URL to `https://<slug>.replit.app/api/webhooks/airwallex`. Use the published host, not the `*.replit.dev` editor URL. The webhook secret is optional; the run page polls while a payout is in flight.

## Run locally

Node 22 or newer. Copy the example env, then start the dev server. With `NEXT_PUBLIC_DATA_SOURCE=mock` the pages do not call MongoDB or Airwallex. The example `MONGODB_URI` still has to be present, because the server checks it at boot.

```bash
cp .env.example .env
pnpm install
pnpm dev                  # http://localhost:3000
```

Set `NEXT_PUBLIC_DATA_SOURCE=api` and `PAYMENTS_GATEWAY=airwallex` when you want the real API, and fill in Mongo and Airwallex values.

The rest of the docs — contracts, Airwallex map, pages — start at [docs/README.md](docs/README.md).
