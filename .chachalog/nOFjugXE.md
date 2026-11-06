---
# Allowed version bumps: patch, minor, major
jahia-reporter: minor
---

Added the `github:annotations` command, which writes an error annotation of GitHub Actions for each failed test.

Each annotation names the test, its error message and its spec file, with the line of the test when the stack names it.
