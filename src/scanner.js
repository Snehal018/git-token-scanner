import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { SKIP_DIRS } from "./constants.js";
import {
  extractToken,
  extractUsername,
  maskToken,
  cleanUrl,
} from "./patterns.js";

function parseRemoteUrls(configContent) {
  const results = [];
  const lines = configContent.split("\n");
  let currentRemote = null;

  for (const line of lines) {
    const remoteMatch = line.match(/^\[remote "(.+)"\]/);
    if (remoteMatch) {
      currentRemote = remoteMatch[1];
      continue;
    }
    if (/^\[/.test(line)) {
      currentRemote = null;
      continue;
    }
    if (currentRemote) {
      const urlMatch = line.match(/^\s*(?:url|pushurl)\s*=\s*(.+)$/);
      if (urlMatch) {
        results.push({ remoteName: currentRemote, url: urlMatch[1].trim() });
      }
    }
  }
  return results;
}

async function checkRepoForTokens(repoPath, { targetToken } = {}) {
  const configPath = join(repoPath, ".git", "config");
  try {
    const content = await readFile(configPath, "utf-8");
    const remoteUrls = parseRemoteUrls(content);
    const findings = [];

    for (const { remoteName, url } of remoteUrls) {
      const token = extractToken(url);
      if (!token) continue;

      // If searching for a specific token, skip non-matches
      if (targetToken && token !== targetToken) continue;

      const username = extractUsername(url);

      findings.push({
        repoPath,
        remoteName,
        url,
        token,
        username,
        maskedToken: maskToken(token),
        cleanUrl: cleanUrl(url),
        configPath,
      });
    }
    return findings;
  } catch {
    return [];
  }
}

/**
 * Scan directories for git repos.
 * @param {string} rootPath - Directory to scan from
 * @param {object} opts
 * @param {string} [opts.targetToken] - If set, only return repos using this exact token
 * @param {Function} [opts.onProgress] - Progress callback (dirsChecked, reposScanned)
 * @param {Function} [opts.onRepoFound] - Called when a repo is found (count, path)
 */
export async function scan(
  rootPath,
  { targetToken, onProgress, onRepoFound } = {},
) {
  const results = [];
  const queue = [rootPath];
  let reposScanned = 0;
  let dirsChecked = 0;

  while (queue.length > 0) {
    const batch = queue.splice(0, 50);

    await Promise.allSettled(
      batch.map(async (dirPath) => {
        let entries;
        try {
          entries = await readdir(dirPath, { withFileTypes: true });
        } catch {
          return;
        }

        dirsChecked++;

        const hasGitDir = entries.some(
          (e) => e.name === ".git" && e.isDirectory(),
        );

        if (hasGitDir) {
          reposScanned++;
          onRepoFound?.(reposScanned, dirPath);

          const findings = await checkRepoForTokens(dirPath, { targetToken });
          if (findings.length > 0) {
            results.push(...findings);
          }
          return;
        }

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.isSymbolicLink?.()) continue;
          if (entry.name.startsWith(".")) continue;
          if (SKIP_DIRS.has(entry.name)) continue;
          queue.push(join(dirPath, entry.name));
        }
      }),
    );

    onProgress?.(dirsChecked, reposScanned);
  }

  return { results, reposScanned, dirsChecked };
}
