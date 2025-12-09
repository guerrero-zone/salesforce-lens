# Salesforce Lens

Salesforce Lens is a Dashboard for Salesforce DevOps Managers and Engineers, Developers and Admins that provides a view of the state of your Salesforce orgs, sandboxes and scratch orgs

## Features

### System Dashboard

Quick view of the state of your Salesforce systems:

- Scratch Orgs Status

### Scratch Orgs Dashboard

Provides a list of all the DevHub orgs authenticated in the system with information about how many scratch orgs are currently active.

By clicking on any DevHub org, it opens a list with information about all the scratch orgs in it (not only the ones created locally), and gives the chance to delete them.

## Prerequisites

- Visual Studio Code `1.99.3` or Cursor.
- Salesforce CLI (`sf`) installed.

## Usage

- Open the **Salesforce Lens** view from the Activity Bar (cloud icon) or run `Salesforce Lens: Dashboard` from the Command Palette.
- Browse DevHub cards to see active/daily scratch‑org usage; click a card to drill into its scratch orgs.
- In the scratch org list:
  - Search by username, alias, creator, or edition.
  - Toggle **Active / Expired / All** filters.
  - Select multiple rows and click **Delete** to bulk-remove; confirmations and results are shown in-place.

## License

GPL v3. See `LICENSE` in the repository.
