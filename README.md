# TestBot1 Staging Monorepo

This staging repository mirrors the structure of the production monorepo and is
used to validate the Sepolia MVP rollout. All code landed here is thoroughly
documented so it can be promoted to production with minimal delta.

## Quickstart

1. Install dependencies using pnpm:

   ```bash
   pnpm install
   ```

2. Populate secrets in `.env.local` (never commit this file). The wallet
   commands below create or update `.env.local` with strict `0600` permissions
   so that only your user can read or write the file.

### Wallet lifecycle commands

After building the CLI package you can manage the Sepolia wallet using the
following commands:

```bash
pnpm --filter @org/cli build
node packages/cli/dist/index.js wallet init
node packages/cli/dist/index.js wallet status
node packages/cli/dist/index.js wallet rotate --force
node packages/cli/dist/index.js wallet export --keystore
```

Each command respects the circuit breaker that prevents accidental key
regeneration. The export command produces a `keystore.json` marked as a demo
artifact; do not use it for production custody.

## Repository layout

- `config/` — Shared configuration such as chain metadata.
- `packages/types` — Shared Zod schemas and environment helpers.
- `packages/wallet` — Safe wallet management utilities.
- `packages/cli` — Operator-facing CLI commands wrapping the wallet helpers.

## Conventions

- Secrets live exclusively in `.env.local` (gitignored by default).
- TypeScript is the primary language across packages. Solidity, Rust, or other
  languages may be introduced only where necessary.
- Project planning is tracked in GitHub Projects alongside this staging branch.
