#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";

import { createWalletCommand } from "./commands/wallet.js";

/**
 * Entry point for the @org CLI. Additional command groups (e.g. execution,
 * deployment) can be registered here as the MVP evolves.
 */
export async function main(argv: string[] = process.argv): Promise<void> {
  const program = new Command();
  program
    .name("@org/cli")
    .description("Tooling for the Sepolia MVP pipeline")
    .version("0.1.0");

  program.addCommand(createWalletCommand());

  try {
    await program.parseAsync(argv);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown CLI error encountered.";
    console.error(chalk.red(message));
    process.exitCode = 1;
  }
}

void main();
