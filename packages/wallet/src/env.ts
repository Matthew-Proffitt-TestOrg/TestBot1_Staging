import type { BaseEnvironment } from "@org/types";
import { loadEnvironment } from "@org/types";

/**
 * Options accepted by {@link loadEnv} to customize how configuration values are
 * resolved from disk.
 */
export interface LoadEnvOptions {
  /**
   * Working directory that contains the environment files. Defaults to the
   * current process directory.
   */
  readonly cwd?: string;
}

/**
 * Load the current environment configuration while applying the repository's
 * precedence rules (`process.env` → `.env.local` → `.env`). The permissive schema
 * allows callers to inspect and repair missing secrets without throwing.
 */
export function loadEnv(options: LoadEnvOptions = {}): BaseEnvironment {
  const { cwd = process.cwd() } = options;
  return loadEnvironment(cwd);
}
