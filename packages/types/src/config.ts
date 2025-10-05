import { parse as parseEnvFile } from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

/**
 * Shared schema that models the environment variables used throughout the MVP
 * toolchain. Each property is optional so the wallet helper can gracefully
 * synthesize missing values, yet the schema still validates the shape and
 * encoding of any provided entries.
 */
export const BaseEnvironmentSchema = z
  .object({
    SEPOLIA_RPC_URL: z
      .string()
      .trim()
      .url({ message: "SEPOLIA_RPC_URL must be a valid URL." })
      .refine(
        (value) => value.startsWith("http://") || value.startsWith("https://"),
        {
          message:
            "SEPOLIA_RPC_URL must begin with an http:// or https:// scheme.",
        },
      )
      .optional(),
    PRIVATE_KEY: z
      .string()
      .trim()
      .regex(/^0x[0-9a-fA-F]{64}$/, {
        message:
          "PRIVATE_KEY must be a 32-byte hex string prefixed with 0x (64 hex chars).",
      })
      .optional(),
    WALLET_ADDRESS: z
      .string()
      .trim()
      .regex(/^0x[0-9a-fA-F]{40}$/, {
        message:
          "WALLET_ADDRESS must be a 20-byte hex string prefixed with 0x.",
      })
      .optional(),
    ETHERSCAN_API_KEY: z
      .string()
      .trim()
      .min(1, "ETHERSCAN_API_KEY cannot be empty when provided.")
      .optional(),
  })
  .passthrough();

export type BaseEnvironment = z.infer<typeof BaseEnvironmentSchema>;

/**
 * Schema variant that enforces the presence of all critical secrets. This is
 * used by deployment tooling that cannot operate without complete context.
 */
export const StrictEnvironmentSchema = BaseEnvironmentSchema.superRefine(
  (environment, context) => {
    const requiredKeys: Array<keyof BaseEnvironment> = [
      "SEPOLIA_RPC_URL",
      "PRIVATE_KEY",
      "WALLET_ADDRESS",
      "ETHERSCAN_API_KEY",
    ];

    for (const key of requiredKeys) {
      if (!environment[key]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} is required. Populate it in .env.local or regenerate via the wallet helper.`,
          path: [key],
        });
      }
    }
  },
);

/**
 * Historical alias retained for compatibility with earlier tooling that
 * directly imported {@code EnvironmentSchema}. It maps to the stricter variant
 * that requires all secrets to be configured.
 */
export const EnvironmentSchema = StrictEnvironmentSchema;

export type StrictEnvironment = z.infer<typeof StrictEnvironmentSchema>;
export type Environment = StrictEnvironment;

/**
 * Internal helper that merges runtime and file-based environment variables
 * while preserving the precedence rules documented for the project:
 *
 * 1. Process-level variables (already present in {@link process.env}).
 * 2. Values from `.env.local`.
 * 3. Values from `.env`.
 *
 * Later sources never override keys that have already been defined by earlier
 * ones, ensuring that secrets sourced from `.env.local` remain authoritative.
 */
function collectEnvironment(cwd: string): Record<string, string> {
  const merged: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.length > 0) {
      merged[key] = value;
    }
  }

  for (const fileName of [".env.local", ".env"]) {
    const absolutePath = resolve(cwd, fileName);
    if (!existsSync(absolutePath)) {
      continue;
    }

    const parsed = parseEnvFile(
      readFileSync(absolutePath, { encoding: "utf-8" }),
    );
    for (const [key, value] of Object.entries(parsed)) {
      if (!(key in merged) && value !== undefined) {
        merged[key] = value;
      }
    }
  }

  return merged;
}

/**
 * Parse the configured environment using the permissive schema, allowing
 * callers such as the wallet helper to inspect or repair missing values.
 */
export function loadEnvironment(cwd: string = process.cwd()): BaseEnvironment {
  return BaseEnvironmentSchema.parse(collectEnvironment(cwd));
}

/**
 * Parse the configured environment using the strict schema and surface
 * actionable validation errors when required secrets are missing.
 */
export function loadStrictEnvironment(
  cwd: string = process.cwd(),
): StrictEnvironment {
  return StrictEnvironmentSchema.parse(collectEnvironment(cwd));
}

/**
 * Read the raw text of an environment file without mutating {@link process.env}
 * for use in tests and diagnostics.
 */
export function loadEnvironmentFile(path: string): string | undefined {
  if (!existsSync(path)) {
    return undefined;
  }

  return readFileSync(path, { encoding: "utf-8" });
}
