import * as vscode from "vscode";
import { DashboardPanel } from "./DashboardPanel";
import { SidebarViewProvider } from "./SidebarViewProvider";
import { salesforceService } from "./services/SalesforceService";

export function activate(context: vscode.ExtensionContext) {
  console.log("Salesforce Lens is now active!");

  // Enable persistent caching for faster cold-start DevHub loading
  salesforceService.setStorageDir(context.globalStorageUri.fsPath);

  // Register the sidebar view provider
  const sidebarProvider = new SidebarViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarViewProvider.viewType,
      sidebarProvider
    )
  );

  // Register the dashboard command
  const dashboardCommand = vscode.commands.registerCommand(
    "salesforce-lens.dashboard",
    () => {
      console.log("Dashboard command executed");
      try {
        DashboardPanel.createOrShow(context.extensionUri);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error executing dashboard command:", errorMessage);
        vscode.window.showErrorMessage(
          `Failed to open dashboard: ${errorMessage}`
        );
      }
    }
  );

  context.subscriptions.push(dashboardCommand);

  // Register command to open DevHub details.
  // If DevHub details are provided as arguments, use them directly;
  // otherwise, prompt the user to select a DevHub.
  const openDevHubDetailsCommand = vscode.commands.registerCommand(
    "salesforce-lens.openDevHubDetails",
    async (
      devHubUsername?: string,
      devHubAliases?: string[],
      orgType?: string
    ) => {
      try {
        // If all required arguments are provided, skip the QuickPick and
        // open the scratch orgs view directly for the specified DevHub.
        if (devHubUsername && devHubAliases && orgType) {
          console.log(
            "Open DevHub details command executed for:",
            devHubUsername
          );
          await DashboardPanel.showScratchOrgsForDevHub(
            context.extensionUri,
            devHubUsername,
            devHubAliases,
            orgType
          );
          return;
        }

        // Otherwise, prompt the user to pick a DevHub.
        const devHubs = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Salesforce Lens: Loading DevHubs...",
            cancellable: false,
          },
          async () => salesforceService.getDevHubsList()
        );

        if (!devHubs || devHubs.length === 0) {
          vscode.window.showWarningMessage(
            "No DevHubs found. Make sure you have authorized a DevHub with the Salesforce CLI (sf)."
          );
          return;
        }

        type DevHubPickItem = vscode.QuickPickItem & {
          username: string;
          aliases: string[];
          orgType: string;
        };

        const items: DevHubPickItem[] = devHubs
          .slice()
          .sort((a, b) => a.username.localeCompare(b.username))
          .map((hub) => {
            const hasAlias = hub.aliases && hub.aliases.length > 0;
            const primaryAlias = hasAlias ? hub.aliases[0] : undefined;
            const label = primaryAlias ?? hub.username;
            const description = primaryAlias ? hub.username : undefined;
            const detail =
              hasAlias && hub.aliases.length > 1
                ? `Aliases: ${hub.aliases.join(", ")}`
                : undefined;

            return {
              label,
              description,
              detail,
              username: hub.username,
              aliases: hub.aliases ?? [],
              orgType: hub.orgType,
            };
          });

        const selected = await vscode.window.showQuickPick(items, {
          title: "Select a DevHub (alias or username)",
          placeHolder: "Choose a DevHub to open its details",
          matchOnDescription: true,
          matchOnDetail: true,
        });

        if (!selected) return;

        await DashboardPanel.showScratchOrgsForDevHub(
          context.extensionUri,
          selected.username,
          selected.aliases,
          selected.orgType
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error opening DevHub details:", errorMessage);
        vscode.window.showErrorMessage(
          `Failed to open DevHub details: ${errorMessage}`
        );
      }
    }
  );

  context.subscriptions.push(openDevHubDetailsCommand);

  // Register webview panel serializer for persistence
  if (vscode.window.registerWebviewPanelSerializer) {
    vscode.window.registerWebviewPanelSerializer(DashboardPanel.viewType, {
      async deserializeWebviewPanel(
        webviewPanel: vscode.WebviewPanel,
        state: unknown
      ) {
        DashboardPanel.revive(webviewPanel, context.extensionUri);
      },
    });
  }
}

export function deactivate() {}
