/**
 * Token detection patterns and URL utilities.
 *
 * Handles two URL formats:
 *   https://ghp_xxxxx@github.com/user/repo
 *   https://username:ghp_xxxxx@github.com/user/repo
 *
 * Always extracts only the ghp_ token part.
 */

// Matches credentials block before @github.com
// Group 1 = full credentials (could be "token" or "user:token")
const CREDENTIALS_RE = /https:\/\/([^@\s]+)@github\.com/;

// GitHub token prefix
const TOKEN_PREFIX_RE = /^ghp_/;

/**
 * Extract the ghp_ token from a git remote URL.
 * Handles both:
 *   https://ghp_xxx@github.com/...
 *   https://username:ghp_xxx@github.com/...
 */
export function extractToken(url) {
  const match = url.match(CREDENTIALS_RE);
  if (!match) return null;

  const credentials = match[1];

  // Format: username:token
  if (credentials.includes(":")) {
    const parts = credentials.split(":");
    const tokenPart = parts.find((p) => TOKEN_PREFIX_RE.test(p));
    return tokenPart || null;
  }

  // Format: token only
  if (TOKEN_PREFIX_RE.test(credentials)) {
    return credentials;
  }

  return null;
}

/**
 * Extract the username from a git remote URL (if present).
 * Returns null if URL uses token-only format.
 */
export function extractUsername(url) {
  const match = url.match(CREDENTIALS_RE);
  if (!match) return null;

  const credentials = match[1];
  if (credentials.includes(":")) {
    return credentials.split(":")[0];
  }
  return null;
}

export function maskToken(token) {
  if (token.length <= 10) return "****";
  const start = token.slice(0, 6);
  const end = token.slice(-4);
  return `${start}****${end}`;
}

/**
 * Build a new URL by replacing the old token with a new one,
 * preserving the username if present.
 */
export function replaceTokenInUrl(url, oldToken, newToken) {
  return url.replace(oldToken, newToken);
}

/**
 * Strip all credentials from URL (clean URL).
 */
export function cleanUrl(url) {
  return url.replace(/https:\/\/[^@]+@github\.com\//, "https://github.com/");
}
