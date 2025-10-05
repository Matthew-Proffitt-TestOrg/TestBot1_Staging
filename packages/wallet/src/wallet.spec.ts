/**
 * Integration-style unit tests validating the wallet provisioning helper. The
 * scenarios cover first-run initialization, idempotent reuse, address repair,
 * and forced rotation to guarantee the circuit breaker functions as designed.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseEnv } from "dotenv";

import { loadEnv } from "./env.js";
import { ensureWallet } from "./wallet.js";

const ENV_FILENAME = ".env.local";

describe("ensureWallet", () => {
  let workingDirectory: string;

  beforeEach(() => {
    workingDirectory = mkdtempSync(join(tmpdir(), "wallet-tests-"));
  });

  afterEach(() => {
    rmSync(workingDirectory, { recursive: true, force: true });
  });

  it("creates a new wallet when no secrets exist", () => {
    const result = ensureWallet({ cwd: workingDirectory });

    expect(result.created).toBe(true);
    expect(result.rotated).toBe(false);
    expect(result.wroteEnv).toBe(true);

    const envPath = resolve(workingDirectory, ENV_FILENAME);
    const envContents = readFileSync(envPath, { encoding: "utf-8" });
    const parsed = parseEnv(envContents);

    expect(parsed.PRIVATE_KEY).toBe(result.privateKey);
    expect(parsed.WALLET_ADDRESS).toBe(result.address);
  });

  it("reuses existing wallet material without forcing rotation", () => {
    const first = ensureWallet({ cwd: workingDirectory });
    const second = ensureWallet({ cwd: workingDirectory });

    expect(second.created).toBe(false);
    expect(second.rotated).toBe(false);
    expect(second.privateKey).toBe(first.privateKey);
    expect(second.address).toBe(first.address);
  });

  it("repairs a missing wallet address when only the private key is present", () => {
    const initial = ensureWallet({ cwd: workingDirectory });
    const envPath = resolve(workingDirectory, ENV_FILENAME);

    writeFileSync(envPath, `PRIVATE_KEY=${initial.privateKey}\n`, {
      encoding: "utf-8",
      mode: 0o600,
    });
    chmodSync(envPath, 0o600);

    const repaired = ensureWallet({ cwd: workingDirectory });
    const reloaded = loadEnv({ cwd: workingDirectory });

    expect(repaired.address).toBe(initial.address);
    expect(repaired.privateKey).toBe(initial.privateKey);
    expect(repaired.wroteEnv).toBe(true);
    expect(reloaded.WALLET_ADDRESS).toBe(initial.address);
  });

  it("rotates key material when --force semantics are requested", () => {
    const first = ensureWallet({ cwd: workingDirectory });
    const rotated = ensureWallet({ cwd: workingDirectory, force: true });

    expect(rotated.rotated).toBe(true);
    expect(rotated.created).toBe(true);
    expect(rotated.privateKey).not.toBe(first.privateKey);
    expect(rotated.address).not.toBe(first.address);
  });
});
