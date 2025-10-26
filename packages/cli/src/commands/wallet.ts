import { Command } from "commander";
import chalk from "chalk";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

import {
  checkSepoliaBalance,
  ensureWallet,
  loadEnv,
} from "@org/wallet";

/**
 * Construct the nested `wallet` command group and all sub-commands required for
 * the MVP workflow.
 */
export function createWalletCommand(): Command {
  const wallet = new Command("wallet");
  wallet.description("Inspect and manage the Sepolia wallet credentials");

  wallet
    .command("init")
    .description(
      "Generate a wallet if missing, or repair metadata without overwriting existing keys.",
    )
    .option("--cwd <path>", "Directory containing .env.local", process.cwd())
    .action(async (options: { cwd: string }) => {
      const cwd = resolve(options.cwd ?? process.cwd());
      const environment = loadEnv({ cwd });
      const result = ensureWallet({ cwd, force: false, environment });
      await reportWallet("Initialized", cwd, result, environment.SEPOLIA_RPC_URL);
    });

  wallet
    .command("status")
    .description("Print wallet details and optional Sepolia balance")
    .option("--cwd <path>", "Directory containing .env.local", process.cwd())
    .action(async (options: { cwd: string }) => {
      const cwd = resolve(options.cwd ?? process.cwd());
      const environment = loadEnv({ cwd });
      const privateKey = environment.PRIVATE_KEY as `0x${string}` | undefined;

      if (!privateKey) {
        console.log(
          chalk.yellow(
            "No PRIVATE_KEY configured. Run `wallet init` to generate a managed wallet.",
          ),
        );
        return;
      }

      const address = environment.WALLET_ADDRESS as `0x${string}` | undefined;
      const materialized = address
        ? {
            address,
            privateKey,
            created: false,
            rotated: false,
            wroteEnv: false,
          }
        : ensureWallet({ cwd, force: false, environment });

      await reportWallet("Status", cwd, materialized, environment.SEPOLIA_RPC_URL);
    });

  wallet
    .command("rotate")
    .description("Rotate the wallet key pair. Requires explicit --force acknowledgement.")
    .option("--cwd <path>", "Directory containing .env.local", process.cwd())
    .option("--force", "Acknowledge rotation and overwrite existing key material")
    .action(async (options: { cwd: string; force?: boolean }) => {
      if (!options.force) {
        throw new Error(
          "Refusing to rotate wallet without --force. Backup funds or export the key first.",
        );
      }

      const cwd = resolve(options.cwd ?? process.cwd());
      const environment = loadEnv({ cwd });
      const result = ensureWallet({ cwd, force: true, environment });
      await reportWallet("Rotated", cwd, result, environment.SEPOLIA_RPC_URL);
    });

  wallet
    .command("export")
    .description("Export managed secrets to local artifacts (demo only)")
    .option("--cwd <path>", "Directory containing .env.local", process.cwd())
    .option("--keystore", "Write a non-production keystore.json alongside .env.local")
    .option("--out <path>", "Override export path", "keystore.json")
    .action((options: { cwd: string; keystore?: boolean; out?: string }) => {
      const cwd = resolve(options.cwd ?? process.cwd());
      const environment = loadEnv({ cwd });
      const privateKey = environment.PRIVATE_KEY as `0x${string}` | undefined;
      const address = environment.WALLET_ADDRESS as `0x${string}` | undefined;

      if (!privateKey || !address) {
        throw new Error("Wallet secrets are missing. Run `wallet init` first.");
      }

      if (options.keystore) {
        const outputPath = resolve(cwd, options.out ?? "keystore.json");
        writeDemoKeystore(outputPath, address, privateKey);
        console.log(
          chalk.green(
            `Demo keystore (NOT FOR PRODUCTION) written to ${outputPath}. Protect and delete after use.`,
          ),
        );
      } else {
        console.log(
          chalk.yellow(
            "No export format selected. Pass --keystore to generate a demo keystore.json.",
          ),
        );
      }
    });

  return wallet;
}

/**
 * Print a structured summary of the wallet materialization outcome and, when
 * possible, include the Sepolia balance fetched via viem.
 */
async function reportWallet(
  action: string,
  cwd: string,
  result: {
    address: `0x${string}`;
    privateKey: `0x${string}`;
    created: boolean;
    rotated: boolean;
    wroteEnv: boolean;
  },
  rpcUrl?: string,
): Promise<void> {
  const header = chalk.bold(`${action} wallet at ${cwd}`);
  console.log(header);
  console.log(`  Address: ${chalk.cyan(result.address)}`);
  console.log(`  Private key stored in: ${chalk.cyan(resolve(cwd, ".env.local"))}`);
  console.log(`  Generated this run: ${result.created}`);
  console.log(`  Rotated: ${result.rotated}`);
  console.log(`  Updated .env.local: ${result.wroteEnv}`);

  if (rpcUrl) {
    const balance = await checkSepoliaBalance(rpcUrl, result.address);
    if (balance) {
      console.log(`  Sepolia balance: ${chalk.green(balance.ether)} ETH`);
    } else {
      console.log(`  Sepolia balance: ${chalk.yellow("unavailable (RPC error)")}`);
    }
  }
}

/**
 * Emit a simple JSON file containing the wallet credentials. This helper is for
 * demonstration purposes only and is intentionally marked as unsafe for
 * production custody scenarios.
 */
function writeDemoKeystore(path: string, address: `0x${string}`, privateKey: `0x${string}`) {
  const payload = {
    note: "DEMO ONLY - DO NOT USE FOR PRODUCTION CUSTODY",
    address,
    privateKey,
    generatedAt: new Date().toISOString(),
  } satisfies Record<string, string>;

  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf-8",
    mode: 0o600,
  });
}
