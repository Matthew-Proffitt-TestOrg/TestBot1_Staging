#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();
program.name("bot-cli").description("Trading Bot CLI").version("0.1.0");

program.command("quote")
  .requiredOption("--chain <id>")
  .requiredOption("--in <token>")
  .requiredOption("--out <token>")
  .requiredOption("--amt <amount>")
  .action(async (opts) => {
    console.log(JSON.stringify({ ok: true, quote: "mock", opts }, null, 2));
  });

program.parseAsync(process.argv);
