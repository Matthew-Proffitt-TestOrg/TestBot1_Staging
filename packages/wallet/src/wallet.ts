import { parse as parseEnvFile } from "dotenv";
import {
  chmodSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import type { BaseEnvironment } from "@org/types";

import { loadEnv } from "./env.js";

/**
 * Structured result returned by {@link ensureWallet} describing the wallet that
 * will be used by subsequent tooling.
 */
export interface WalletMaterialized {
  /** Ethereum address associated with the wallet. */
  readonly address: `0x${string}`;
  /** Private key (0x-prefixed 32-byte hex string). */
  readonly privateKey: `0x${string}`;
  /** Whether a new key pair was generated during this invocation. */
  readonly created: boolean;
  /** Whether the existing key material was forcibly rotated. */
  readonly rotated: boolean;
  /** Indicates if `.env.local` was modified to repair missing data. */
  readonly wroteEnv: boolean;
}

/**
 * Options for {@link ensureWallet}.
 */
export interface EnsureWalletOptions {
  /** Custom working directory that contains environment files. */
  readonly cwd?: string;
  /**
   * When set to `true`, forces regeneration of the wallet even if secrets are
   * already present. This is intentionally opt-in to prevent accidental loss of
   * funded keys.
   */
  readonly force?: boolean;
  /**
    * Provide a pre-loaded environment to avoid re-reading from disk. Primarily
    * useful in tests.
    */
  readonly environment?: BaseEnvironment;
}

/**
 * Ensure that a wallet exists for the current environment while respecting the
 * overwrite circuit breaker. The helper behaves as follows:
 *
 * - If both `PRIVATE_KEY` and `WALLET_ADDRESS` are configured, the values are
 *   returned as-is without modifying `.env.local`.
 * - If only `PRIVATE_KEY` exists, the corresponding address is derived and
 *   patched into `.env.local`.
 * - If neither secret exists, a new key pair is generated and written to
 *   `.env.local` with 0600 permissions.
 * - When `force` is `true`, the existing key material is rotated regardless of
 *   current state.
 */
export function ensureWallet(options: EnsureWalletOptions = {}): WalletMaterialized {
  const { cwd = process.cwd(), force = false } = options;
  const environment = options.environment ?? loadEnv({ cwd });
  const envLocalPath = resolve(cwd, ".env.local");
  const envLocal = readEnvLocal(envLocalPath);

  if (force) {
    return rotateWallet(envLocalPath, envLocal);
  }

  const existingPrivateKey = environment.PRIVATE_KEY as `0x${string}` | undefined;
  const existingAddress = environment.WALLET_ADDRESS as `0x${string}` | undefined;

  if (existingPrivateKey && existingAddress) {
    return {
      address: existingAddress,
      privateKey: existingPrivateKey,
      created: false,
      rotated: false,
      wroteEnv: false,
    };
  }

  if (existingPrivateKey && !existingAddress) {
    const derivedAccount = privateKeyToAccount(existingPrivateKey);
    const updatedEnv = {
      ...envLocal,
      PRIVATE_KEY: existingPrivateKey,
      WALLET_ADDRESS: derivedAccount.address,
    };
    const wroteEnv = writeEnvLocal(envLocalPath, updatedEnv);

    return {
      address: derivedAccount.address,
      privateKey: existingPrivateKey,
      created: false,
      rotated: false,
      wroteEnv,
    };
  }

  return provisionWallet(envLocalPath, envLocal);
}

/**
 * Rotate the wallet key material regardless of prior state.
 */
function rotateWallet(
  envLocalPath: string,
  envLocal: Record<string, string>,
): WalletMaterialized {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const wroteEnv = writeEnvLocal(envLocalPath, {
    ...envLocal,
    PRIVATE_KEY: privateKey,
    WALLET_ADDRESS: account.address,
  });

  return {
    address: account.address,
    privateKey,
    created: true,
    rotated: true,
    wroteEnv,
  };
}

/**
 * Generate and persist a wallet when no secrets are currently configured.
 */
function provisionWallet(
  envLocalPath: string,
  envLocal: Record<string, string>,
): WalletMaterialized {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const wroteEnv = writeEnvLocal(envLocalPath, {
    ...envLocal,
    PRIVATE_KEY: privateKey,
    WALLET_ADDRESS: account.address,
  });

  return {
    address: account.address,
    privateKey,
    created: true,
    rotated: false,
    wroteEnv,
  };
}

/**
 * Load the current contents of `.env.local` as a key-value map.
 */
function readEnvLocal(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }

  const contents = readFileSync(path, { encoding: "utf-8" });
  return parseEnvFile(contents);
}

/**
 * Persist the provided environment map back to `.env.local` using strict file
 * permissions (0600).
 */
function writeEnvLocal(path: string, values: Record<string, string>): boolean {
  const serialized = serializeEnvMap(values);
  writeFileSync(path, serialized, { encoding: "utf-8", mode: 0o600 });
  chmodSync(path, 0o600);
  return true;
}

/**
 * Convert an environment map to the canonical string representation expected by
 * dotenv loaders.
 */
function serializeEnvMap(values: Record<string, string>): string {
  const lines: string[] = [
    "# Managed by @org/wallet. Never commit this file.",
    `# Updated at ${new Date().toISOString()}`,
    "",
  ];

  for (const key of Object.keys(values).sort()) {
    const value = values[key];
    if (typeof value === "string" && value.length > 0) {
      lines.push(`${key}=${value}`);
    }
  }

  if (typeof values.WALLET_ADDRESS === "string") {
    if (!lines.some((line) => line.startsWith("WALLET_ADDRESS="))) {
      lines.push(`WALLET_ADDRESS=${values.WALLET_ADDRESS}`);
    }
  }

  if (lines[lines.length - 1] !== "") {
    lines.push("");
  }

  return lines.join("\n");
}
