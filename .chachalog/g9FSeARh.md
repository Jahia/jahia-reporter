---
# Allowed version bumps: patch, minor, major
jahia-reporter: minor
---

Changed `github:incident` so a test service with no row in the incident spreadsheet gets a new row with the project status `In Progress` and the priority `Now`. The new row also copies the assignee, the project number and the project team from another row of the same repository.
