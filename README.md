# git-token-scanner

A CLI tool to find, replace, and clean GitHub personal access tokens (`ghp_`) embedded in local git remote URLs.

## The Problem

When cloning repos with a PAT in the URL, the token gets stored in `.git/config`:

```
# Token only
url = https://ghp_abc123...@github.com/user/repo.git

# Username + Token
url = https://myuser:ghp_abc123...@github.com/user/repo.git
```

These tokens persist across all your local repos and are easy to forget about when you rotate tokens. This tool finds them all and lets you replace or remove them in bulk.

## Features

- **Scan** - Recursively find all repos with exposed `ghp_` tokens
- **Replace** - Find repos using a specific token and replace it with a new one
- **Clean** - Remove tokens entirely from remote URLs
- **Smart detection** - Handles both `ghp_token@` and `username:ghp_token@` URL formats
- **Fast** - Reads `.git/config` directly instead of spawning git processes
- **Safe** - Dry-run mode, confirmation prompts, masked token display
- **Full-width tables** - Adapts to your terminal width

## Installation

```bash
# Clone and install
git clone https://github.com/Snehal018/git-token-scanner
cd git-token-scanner
npm install

# Optional: link globally
npm link
```

**Requires Node.js >= 18**

## Usage

```bash
# Interactive mode (default scans from home directory)
node bin/git-token-scanner.js

# Scan a specific directory
node bin/git-token-scanner.js --path ~/Projects

# Dry run (no changes made)
node bin/git-token-scanner.js --dry-run

# JSON output (for scripting)
node bin/git-token-scanner.js --json

## Interactive Modes

### Scan

Finds all repos with any `ghp_` token in their remote URLs and displays them in a table. You can then choose to remove tokens from all or selected repos.

```

What would you like to do?

> Scan — Find all repos with exposed tokens

    Replace  — Find & replace a specific token
    Exit

```

### Replace

Prompts for an old token, finds all repos using it, then prompts for a new token and replaces it across all matching repos. Preserves the `username:` prefix if present.

```

? Enter the token to search for (ghp*...): **\*\*\*\***
✔ Scan complete. Checked 53 repo(s) — found 5 with matching token.
? Enter the new token to replace with (ghp*...): **\*\*\*\***
? Replace token in which repos?

> Replace all (5 repos)

    Select — choose which repos
    Cancel

```

## CLI Options

| Option             | Description                     | Default              |
| ------------------ | ------------------------------- | -------------------- |
| `-p, --path <dir>` | Root directory to scan          | Home directory (`~`) |
| `--dry-run`        | Preview changes without writing | `false`              |
| `--json`           | Output scan results as JSON     | `false`              |
| `-v, --verbose`    | Show detailed scan progress     | `false`              |
| `-V, --version`    | Show version number             |                      |
| `-h, --help`       | Show help                       |                      |

## How It Works

1. Recursively walks directories from the scan root
2. Skips known unproductive directories (`node_modules`, `Library`, `.cache`, `vendor`, etc.)
3. When a `.git` directory is found, reads `.git/config` directly
4. Parses all remote URLs (including `pushurl`) from all remotes
5. Extracts only `ghp_` tokens, correctly handling `username:token` format
6. Displays results with masked tokens and offers to fix them

## License

MIT
```
