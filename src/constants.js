export const SKIP_DIRS = new Set([
  "node_modules",
  ".Trash",
  "Library",
  ".cache",
  ".npm",
  ".yarn",
  "vendor",
  ".venv",
  "venv",
  "__pycache__",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  "bower_components",
  ".cocoapods",
  "Pods",
  "DerivedData",
  ".gradle",
  ".m2",
  ".cargo",
  ".rustup",
  "target",
  ".docker",
  ".local",
  ".nvm",
  ".pyenv",
  ".rbenv",
]);

export const BANNER = `
  ╔═══════════════════════════════════════════════╗
  ║         Git Token Scanner  v1.0.0             ║
  ║  Find, replace & clean tokens in git repos    ║
  ╚═══════════════════════════════════════════════╝
`;
