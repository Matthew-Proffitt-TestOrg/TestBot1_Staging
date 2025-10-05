/**
 * Public entry point for the shared type utilities package. This module
 * re-exports the environment schemas and helpers so that other packages can
 * consume validated configuration data without needing to understand the
 * underlying implementation details.
 */
export {
  BaseEnvironmentSchema,
  EnvironmentSchema,
  StrictEnvironmentSchema,
  loadEnvironment,
  loadStrictEnvironment,
  loadEnvironmentFile,
} from "./config.js";

export type {
  BaseEnvironment,
  Environment,
  StrictEnvironment,
} from "./config.js";
