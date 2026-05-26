export default {
  // Global options
  ignoreFiles: [
    "README.md",
    "firefox-open-tab-on-the-right.zip",
    ".gitignore",
    ".git",
    "web-ext-artifacts",
    ".github",
    "package.json",
    "package-lock.json",
    "web-ext-config.mjs"
  ],
  // Command-specific options
  build: {
    overwriteDest: true,
  }
};
