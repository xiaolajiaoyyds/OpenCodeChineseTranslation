module.exports = {
  rules: {
    "header-max-length": [2, "always", 100],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "subject-empty": [2, "never"],
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case"]],
  },
};
