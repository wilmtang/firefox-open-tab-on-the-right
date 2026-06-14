export default {
  // Global options
  ignoreFiles: [
    "README.md",
    "*.zip",
    ".gitignore",
    ".git",
    ".githooks",
    "web-ext-artifacts",
    "node_modules",
    ".github",
    "package.json",
    "package-lock.json",
    "web-ext-config.mjs",
    "tabmove.test.js",
    "e2e"
  ],
  // Command-specific options
  build: {
    overwriteDest: true,
  }
};
