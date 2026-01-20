# Salesforce Lens

Salesforce Lens is a Dashboard for Salesforce DevOps Managers and Engineers, Developers and Admins that provides a view of the state of your Salesforce orgs, sandboxes and scratch orgs

## Features

### System Dashboard

Quick view of the state of your DevHub orgs with information about:

- The active Scratch Orgs created in them (comparing with the limit of daily active scratch orgs)
- The Snapshots created on those DevHub orgs (showing the active vs expired numbers)

When clicking on one of the DevHub cards, it navigates to a DevHub detail page with more detailed information:

- List of Scratch Orgs with more information about them like duration, expiry date, ...
- List of Snapshots

### Scratch Orgs Tab

Displays a list of the Scratch Orgs existing in the selected DevHub org with useful information like who created it, what was the duration selected when it was created, expiry date and how long until it's going to expire, and more...

This tab also allows us to filter the Scratch Orgs, export the list to JSON or CSV and select them so we can (bulk) delete them.

#### Scratch Org Pool Integration

If you're using [sfp](https://docs.flxbl.io/sfp) (the flxbl.io CLI plugin) for scratch org pooling, the extension will automatically detect pool membership and display:

- **Pool name** - Which pool the scratch org belongs to
- **Pool status** - Whether the org is "Available" or "In use"

This works out of the box for any DevHub that has sfp's scratch org pooling configured. If a DevHub doesn't use pools, the column simply won't show any pool data for those orgs.

### Snapshots Tab

Displays a list with all the Snapshots created in the selected DevHub org, with all the information about them.
We can filter them by their status: Active or Expired, search by name/owner, and select one or more snapshots to (bulk) delete them.

## Prerequisites

- Visual Studio Code `1.99.3` or Cursor.
- Salesforce CLI (`sf`) installed.
- (Optional) [sfp CLI plugin](https://docs.flxbl.io/sfp) for scratch org pool integration.

## Usage

- Open the **Salesforce Lens** view from the Activity Bar (cloud icon) or run `Salesforce Lens: Dashboard` from the Command Palette.
- To open a DevHub details page directly from the Command Palette, run `Salesforce Lens: Open DevHub Details` and select the DevHub by **alias or username**.
- Browse DevHub cards to see active/daily scratch‑org usage; click a card to drill into its scratch orgs.
- In the scratch org list:
  - Search by username, alias, creator, edition, or pool name.
  - Sort by clicking any column header (click again to toggle ascending/descending).
  - Select multiple rows and click **Delete** to bulk-remove; confirmations and results are shown in-place.

## License

GPL v3. See `LICENSE` in the repository.
