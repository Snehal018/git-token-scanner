import { Command } from "commander";
import { homedir } from "node:os";

export function createCli() {
  const program = new Command();

  program
    .name("git-token-scanner")
    .description("Find & replace GitHub tokens embedded in git remote URLs")
    .version("1.0.0")
    .option("-p, --path <directory>", "Root directory to scan", homedir())
    .option("--dry-run", "Show what would change without making changes", false)
    .option("--json", "Output results as JSON", false)
    .option("-v, --verbose", "Show detailed scan progress", false);

  program.parse();
  return program.opts();
}
