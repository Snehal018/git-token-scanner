import { readFile, writeFile } from "node:fs/promises";
import { replaceTokenInUrl } from "./patterns.js";

/**
 * Replace the old token with a new token in a repo's .git/config.
 * Preserves username if the URL has username:token format.
 */
export async function replaceToken(
  scanResult,
  newToken,
  { dryRun = false } = {},
) {
  const { configPath, url, token } = scanResult;

  try {
    const content = await readFile(configPath, "utf-8");
    const newUrl = replaceTokenInUrl(url, token, newToken);
    const newContent = content.replace(url, newUrl);

    if (content === newContent) {
      return {
        ...scanResult,
        success: false,
        reason: "URL not found in config",
      };
    }

    if (!dryRun) {
      await writeFile(configPath, newContent, "utf-8");
    }

    return { ...scanResult, success: true, dryRun, oldUrl: url, newUrl };
  } catch (err) {
    return { ...scanResult, success: false, reason: err.message };
  }
}

/**
 * Remove the token entirely from a repo's .git/config (clean URL).
 */
export async function removeToken(scanResult, { dryRun = false } = {}) {
  const { configPath, url, cleanUrl } = scanResult;

  try {
    const content = await readFile(configPath, "utf-8");
    const newContent = content.replace(url, cleanUrl);

    if (content === newContent) {
      return {
        ...scanResult,
        success: false,
        reason: "URL not found in config",
      };
    }

    if (!dryRun) {
      await writeFile(configPath, newContent, "utf-8");
    }

    return {
      ...scanResult,
      success: true,
      dryRun,
      oldUrl: url,
      newUrl: cleanUrl,
    };
  } catch (err) {
    return { ...scanResult, success: false, reason: err.message };
  }
}

export async function replaceTokenInRepos(scanResults, newToken, options = {}) {
  const outcomes = [];
  for (const result of scanResults) {
    const outcome = await replaceToken(result, newToken, options);
    outcomes.push(outcome);
  }
  return outcomes;
}

export async function removeTokenFromRepos(scanResults, options = {}) {
  const outcomes = [];
  for (const result of scanResults) {
    const outcome = await removeToken(result, options);
    outcomes.push(outcome);
  }
  return outcomes;
}
