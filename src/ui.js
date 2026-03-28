import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import inquirer from "inquirer";
import { homedir } from "node:os";
import { BANNER } from "./constants.js";
import { maskToken } from "./patterns.js";

export function showBanner() {
  console.log(chalk.cyan.bold(BANNER));
}

export function createSpinner(text) {
  return ora({
    text,
    color: "cyan",
    spinner: "dots",
  });
}

function getTermWidth() {
  return process.stdout.columns || 120;
}

function shortenPath(fullPath) {
  const home = homedir();
  if (fullPath.startsWith(home)) {
    return "~" + fullPath.slice(home.length);
  }
  return fullPath;
}

// Main Menu
export async function promptMainMenu() {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        {
          name:
            chalk.cyan("🔍  Scan") +
            chalk.dim(" — Find all repos with exposed tokens"),
          value: "scan",
        },
        {
          name:
            chalk.green("🔄  Replace") +
            chalk.dim(" — Find & replace a specific token"),
          value: "replace",
        },
        { name: chalk.dim("👋  Exit"), value: "exit" },
      ],
    },
  ]);
  return action;
}

// Scan Results
export function showResults(results, reposScanned) {
  console.log();

  if (results.length === 0) {
    console.log(chalk.green.bold("  ✔ All clear! No embedded tokens found."));
    console.log(chalk.dim(`    Scanned ${reposScanned} repositories.\n`));
    return;
  }

  console.log(
    chalk.red.bold(`  ⚠ Found ${results.length} exposed token(s):\n`),
  );
  showResultsTable(results);
}

export function showResultsTable(results) {
  // Dynamic widths: #(4) + Remote(10) + Token(18) + borders(16) = 48 fixed
  // Remaining split: 40% repo, 60% URL
  const tw = getTermWidth();
  const fixed = 48;
  const remaining = Math.max(tw - fixed, 30);
  const repoW = Math.max(Math.floor(remaining * 0.4), 15);
  const urlW = Math.max(remaining - repoW, 15);

  const table = new Table({
    head: [
      chalk.white.bold("#"),
      chalk.white.bold("Repository"),
      chalk.white.bold("Remote"),
      chalk.white.bold("Token"),
      chalk.white.bold("URL (masked)"),
    ],
    style: {
      head: [],
      border: ["dim"],
    },
    colWidths: [4, repoW, 10, 18, urlW],
    wordWrap: true,
  });

  results.forEach((r, i) => {
    const maskedUrl = r.url.replace(r.token, r.maskedToken);
    table.push([
      chalk.yellow(i + 1),
      chalk.red(shortenPath(r.repoPath)),
      chalk.dim(r.remoteName),
      chalk.red.bold(r.maskedToken),
      chalk.dim(maskedUrl),
    ]);
  });

  console.log(table.toString());
  console.log();
}

// Scan Fix Prompts
export async function promptScanAction(results) {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do with these?",
      choices: [
        {
          name: chalk.green("Remove all tokens — clean URLs for all repos"),
          value: "remove_all",
        },
        {
          name: chalk.yellow("Select — choose which repos to clean"),
          value: "select",
        },
        { name: chalk.dim("Skip — do nothing"), value: "skip" },
      ],
    },
  ]);

  if (action === "skip") return [];
  if (action === "remove_all") return results;

  const { selected } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selected",
      message: "Select repositories to clean:",
      choices: results.map((r, i) => ({
        name: `${shortenPath(r.repoPath)} (${r.maskedToken})`,
        value: i,
        checked: true,
      })),
    },
  ]);

  return selected.map((i) => results[i]);
}

// Replace Token Prompts
export async function promptOldToken() {
  const { token } = await inquirer.prompt([
    {
      type: "password",
      name: "token",
      message: "Enter the token to search for (ghp_...)  :",
      mask: "*",
      validate: (val) => {
        if (!val.startsWith("ghp_")) return "Token must start with ghp_";
        if (val.length < 10) return "Token seems too short";
        return true;
      },
    },
  ]);
  return token;
}

export async function promptNewToken() {
  const { token } = await inquirer.prompt([
    {
      type: "password",
      name: "token",
      message: "Enter the new token to replace with (ghp_...)  :",
      mask: "*",
      validate: (val) => {
        if (!val.startsWith("ghp_")) return "Token must start with ghp_";
        if (val.length < 10) return "Token seems too short";
        return true;
      },
    },
  ]);
  return token;
}

export function showReplacePreview(results, oldToken, newToken) {
  console.log();
  console.log(
    chalk.cyan.bold(
      `  Found ${results.length} repo(s) using token ${maskToken(oldToken)}:\n`,
    ),
  );

  // Dynamic widths: #(4) + Remote(10) + borders(13) = 27 fixed
  // Remaining split: 35% repo, 65% URL
  const tw = getTermWidth();
  const fixed = 27;
  const remaining = Math.max(tw - fixed, 30);
  const repoW = Math.max(Math.floor(remaining * 0.35), 15);
  const urlW = Math.max(remaining - repoW, 15);

  const table = new Table({
    head: [
      chalk.white.bold("#"),
      chalk.white.bold("Repository"),
      chalk.white.bold("Remote"),
      chalk.white.bold("Current URL (masked)"),
    ],
    style: {
      head: [],
      border: ["dim"],
    },
    colWidths: [4, repoW, 10, urlW],
    wordWrap: true,
  });

  results.forEach((r, i) => {
    const maskedUrl = r.url.replace(r.token, maskToken(r.token));
    table.push([
      chalk.yellow(i + 1),
      chalk.cyan(shortenPath(r.repoPath)),
      chalk.dim(r.remoteName),
      chalk.dim(maskedUrl),
    ]);
  });

  console.log(table.toString());
  console.log();
  console.log(
    chalk.dim(`  Token: ${maskToken(oldToken)}  →  ${maskToken(newToken)}`),
  );
  console.log();
}

export async function promptReplaceAction(results) {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Replace token in which repos?",
      choices: [
        {
          name: chalk.green(`Replace all (${results.length} repos)`),
          value: "all",
        },
        { name: chalk.yellow("Select — choose which repos"), value: "select" },
        { name: chalk.dim("Cancel"), value: "cancel" },
      ],
    },
  ]);

  if (action === "cancel") return [];
  if (action === "all") return results;

  const { selected } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selected",
      message: "Select repositories:",
      choices: results.map((r, i) => ({
        name: `${shortenPath(r.repoPath)} (${r.remoteName})`,
        value: i,
        checked: true,
      })),
    },
  ]);

  return selected.map((i) => results[i]);
}

// Confirmation
export async function confirmAction(message, dryRun) {
  if (dryRun) {
    console.log(
      chalk.yellow.bold("\n  Dry run mode — no changes will be made.\n"),
    );
    return true;
  }

  const { proceed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "proceed",
      message,
      default: true,
    },
  ]);

  return proceed;
}

// Results Display
export function showFixResults(outcomes) {
  console.log();
  for (const o of outcomes) {
    if (o.success) {
      console.log(chalk.green(`  ✔ ${shortenPath(o.repoPath)}`));
      console.log(
        chalk.dim(`    ${maskUrlToken(o.oldUrl)} → ${maskUrlToken(o.newUrl)}`),
      );
    } else {
      console.log(chalk.red(`  ✘ ${shortenPath(o.repoPath)} — ${o.reason}`));
    }
  }
  console.log();
}

function maskUrlToken(url) {
  return url.replace(
    /(ghp_[a-zA-Z0-9]{2})[a-zA-Z0-9]+([a-zA-Z0-9]{4})/,
    "$1****$2",
  );
}

export function showSummary(stats) {
  const box = new Table({
    style: { border: ["cyan"] },
    colWidths: [22, 10],
  });

  box.push(
    [chalk.bold("Repos scanned"), chalk.cyan(stats.reposScanned)],
    [
      chalk.bold("Tokens found"),
      stats.tokensFound > 0
        ? chalk.red(stats.tokensFound)
        : chalk.green(stats.tokensFound),
    ],
    [chalk.bold("Updated"), chalk.green(stats.updated)],
    [
      chalk.bold("Failed"),
      stats.failed > 0
        ? chalk.red.bold(stats.failed)
        : chalk.green(stats.failed),
    ],
  );

  console.log(chalk.bold("  Summary:\n"));
  console.log(box.toString());
  console.log();
}
