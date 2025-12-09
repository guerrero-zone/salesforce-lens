import * as vscode from "vscode";
import { DashboardPanel } from "./DashboardPanel";
import { SidebarViewProvider } from "./SidebarViewProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("Salesforce Lens is now active!");

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

  // Register command to open scratch orgs for a specific DevHub
  const openScratchOrgsCommand = vscode.commands.registerCommand(
    "salesforce-lens.openScratchOrgs",
    async (
      devHubUsername: string,
      devHubAliases: string[],
      orgType: string
    ) => {
      console.log("Open scratch orgs command executed for:", devHubUsername);
      try {
        await DashboardPanel.showScratchOrgsForDevHub(
          context.extensionUri,
          devHubUsername,
          devHubAliases,
          orgType
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error opening scratch orgs:", errorMessage);
        vscode.window.showErrorMessage(
          `Failed to open scratch orgs: ${errorMessage}`
        );
      }
    }
  );

  context.subscriptions.push(openScratchOrgsCommand);

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
