import { resolve } from "node:path";
import { createCli } from "./cli.js";
import { scan } from "./scanner.js";
import { replaceTokenInRepos, removeTokenFromRepos } from "./fixer.js";
import {
  showBanner,
  createSpinner,
  showResults,
  promptMainMenu,
  promptScanAction,
  promptOldToken,
  promptNewToken,
  showReplacePreview,
  promptReplaceAction,
  confirmAction,
  showFixResults,
  showSummary,
} from "./ui.js";

function makeScanCallbacks(spinner, verbose) {
  return {
    onRepoFound(count, path) {
      spinner.text = `Found ${count} repo(s)... checking ${path.split("/").slice(-2).join("/")}`;
    },
    onProgress(dirs, repos) {
      if (verbose) {
        spinner.text = `Checked ${dirs} directories, found ${repos} repos...`;
      }
    },
  };
}

// Scan Flow
async function runScan(scanPath, opts) {
  const spinner = createSpinner(`Scanning ${scanPath}...`);
  spinner.start();

  const { results, reposScanned } = await scan(
    scanPath,
    makeScanCallbacks(spinner, opts.verbose),
  );

  spinner.succeed(
    `Scan complete. Checked ${reposScanned} repo(s) — found ${results.length} with exposed token(s).`,
  );
  showResults(results, reposScanned);

  if (results.length === 0) return;

  const selected = await promptScanAction(results);
  if (selected.length === 0) {
    console.log("  No changes made.\n");
    return;
  }

  const proceed = await confirmAction(
    `Remove tokens from ${selected.length} repo(s)? (URLs will become clean https://github.com/... URLs)`,
    opts.dryRun,
  );
  if (!proceed) {
    console.log("  Aborted.\n");
    return;
  }

  const outcomes = await removeTokenFromRepos(selected, {
    dryRun: opts.dryRun,
  });
  showFixResults(outcomes);

  const updated = outcomes.filter((o) => o.success).length;
  showSummary({
    reposScanned,
    tokensFound: results.length,
    updated,
    failed: selected.length - updated,
  });
}

// Replace Flow
async function runReplace(scanPath, opts) {
  const oldToken = await promptOldToken();

  const spinner = createSpinner(`Searching for repos with this token...`);
  spinner.start();

  const { results, reposScanned } = await scan(scanPath, {
    targetToken: oldToken,
    ...makeScanCallbacks(spinner, opts.verbose),
  });

  spinner.succeed(
    `Scan complete. Checked ${reposScanned} repo(s) — found ${results.length} with matching token.`,
  );

  if (results.length === 0) {
    console.log();
    console.log("  No repos found using that token.\n");
    return;
  }

  const newToken = await promptNewToken();

  showReplacePreview(results, oldToken, newToken);

  const selected = await promptReplaceAction(results);
  if (selected.length === 0) {
    console.log("  No changes made.\n");
    return;
  }

  const proceed = await confirmAction(
    `Replace token in ${selected.length} repo(s)?`,
    opts.dryRun,
  );
  if (!proceed) {
    console.log("  Aborted.\n");
    return;
  }

  const outcomes = await replaceTokenInRepos(selected, newToken, {
    dryRun: opts.dryRun,
  });
  showFixResults(outcomes);

  const updated = outcomes.filter((o) => o.success).length;
  showSummary({
    reposScanned,
    tokensFound: results.length,
    updated,
    failed: selected.length - updated,
  });
}

// Entry Point
export async function run() {
  const opts = createCli();
  const scanPath = resolve(opts.path);

  // JSON mode — non-interactive scan
  if (opts.json) {
    const { results } = await scan(scanPath);
    const output = results.map((r) => ({
      repo: r.repoPath,
      remote: r.remoteName,
      token: r.maskedToken,
      username: r.username,
      cleanUrl: r.cleanUrl,
    }));
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  showBanner();

  const action = await promptMainMenu();

  switch (action) {
    case "scan":
      await runScan(scanPath, opts);
      break;
    case "replace":
      await runReplace(scanPath, opts);
      break;
    case "exit":
      console.log("  Bye!\n");
      break;
  }
}
