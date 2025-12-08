# Salesforce Lens (VS Code Extension)

Manage Salesforce DevHubs and scratch orgs without leaving VS Code. Salesforce Lens surfaces your DevHub limits, lets you drill into every scratch org, and bulk‑delete expired ones with a couple of clicks.

![Salesforce Lens preview](resources/icon-marketplace.png)

## Features

- DevHub overview cards with active/daily scratch‑org usage, editions, aliases, and org‑type badges.
- One-click navigation from the Activity Bar sidebar into a full dashboard webview.
- Scratch org table with search, Active/Expired/All filters, sortable columns, and inline expiration cues.
- Multi-select bulk delete with confirmation, progress updates, and per-org success/failure feedback.
- Uses the Salesforce CLI (`sf`) under the hood so data stays in sync with your authenticated orgs.

## Prerequisites

- Visual Studio Code `^1.99.3`.
- Salesforce CLI (`sf`) installed and on your PATH.
- At least one authenticated DevHub (`sf org login web --set-default-dev-hub`).

## Usage

- Open the **Salesforce Lens** view from the Activity Bar (cloud icon) or run `Salesforce Lens: Dashboard` from the Command Palette.
- Browse DevHub cards to see active/daily scratch‑org usage; click a card to drill into its scratch orgs.
- In the scratch org view:
  - Search by username, alias, creator, or edition.
  - Toggle **Active / Expired / All** filters.
  - Select multiple rows and click **Delete** to bulk-remove; confirmations and results are shown in-place.
  - Refresh at any time to re-query the DevHub.

### Commands

- `Salesforce Lens: Dashboard` (`salesforce-lens.dashboard`) — opens or focuses the main dashboard webview.
- `Salesforce Lens: Open Scratch Orgs` (`salesforce-lens.openScratchOrgs`) — internal command used by the sidebar to open a specific DevHub’s scratch org list.

## License

GPL v3. See `LICENSE` in the repository.
