import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { salesforceService, OrgInfo } from "./services/SalesforceService";

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "salesforce-lens.dashboardView";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * Gets the webview output path, checking both production (webviews/out)
   * and development (../webviews/out) locations
   */
  private getWebviewOutPath(): vscode.Uri {
    // First, try production path (webviews/out inside extension package)
    const productionPath = vscode.Uri.joinPath(
      this._extensionUri,
      "webviews",
      "out"
    );
    if (fs.existsSync(productionPath.fsPath)) {
      return productionPath;
    }

    // Fall back to development path (../webviews/out - monorepo structure)
    const developmentPath = vscode.Uri.joinPath(
      this._extensionUri,
      "..",
      "webviews",
      "out"
    );
    if (fs.existsSync(developmentPath.fsPath)) {
      return developmentPath;
    }

    // If neither exists, return production path (will throw error with better message)
    return productionPath;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    const webviewsOutUri = this.getWebviewOutPath();

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [webviewsOutUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      console.log("Sidebar received message:", message.command);
      switch (message.command) {
        case "openDashboard":
          console.log("Executing dashboard command from sidebar");
          vscode.commands.executeCommand("salesforce-lens.dashboard").then(
            () => {
              console.log("Dashboard command executed successfully");
            },
            (error) => {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              console.error("Error executing dashboard command:", errorMessage);
              vscode.window.showErrorMessage(
                `Failed to open dashboard: ${errorMessage}`
              );
            }
          );
          break;

        case "getDevHubs":
          await this._sendDevHubs(message.forceRefresh);
          break;

        case "openScratchOrgs":
          console.log("Opening scratch orgs for:", message.username);
          vscode.commands.executeCommand(
            "salesforce-lens.openDevHubDetails",
            message.username,
            message.aliases,
            message.orgType
          );
          break;
      }
    });

    // Initial load of DevHubs
    this._sendDevHubs();
  }

  private async _sendDevHubs(forceRefresh = false): Promise<void> {
    if (!this._view) {
      return;
    }

    try {
      this._view.webview.postMessage({ command: "devHubsLoading" });

      // Invalidate cache if force refresh requested
      if (forceRefresh) {
        salesforceService.invalidateCache();
      }

      // Use streaming for progressive loading - sidebar only needs DevHubs + editions
      await salesforceService.streamDevHubsData({
        onDevHubsLoaded: (devHubs) => {
          // Send DevHubs immediately
          this._view?.webview.postMessage({ command: "devHubsData", devHubs });
        },
        onEditionLoaded: (username, edition) => {
          // Update edition progressively
          this._view?.webview.postMessage({
            command: "devHubEditionLoaded",
            username,
            edition,
          });
        },
        // We don't need limits/snapshots in sidebar, but callbacks are required
        onLimitsLoaded: () => {},
        onSnapshotsInfoLoaded: () => {},
        onComplete: () => {
          // Signal that all loading is complete
          this._view?.webview.postMessage({ command: "loadingComplete" });
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this._view?.webview.postMessage({
        command: "devHubsError",
        error: errorMessage,
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    try {
      // Get webview path (checks both production and development locations)
      const webviewOutPath = this.getWebviewOutPath();

      // Read the built sidebar.html
      const indexPath = path.join(webviewOutPath.fsPath, "sidebar.html");
      if (!fs.existsSync(indexPath)) {
        throw new Error(
          `Sidebar HTML not found: ${indexPath}. Make sure webviews are built.`
        );
      }
      let html = fs.readFileSync(indexPath, "utf8");

      // Get the base URI for assets
      const assetsUri = webview.asWebviewUri(
        vscode.Uri.joinPath(webviewOutPath, "assets")
      );

      // Generate a nonce for CSP
      const nonce = getNonce();

      // Replace all asset paths with webview URIs
      // Handle both ./assets/ and /assets/ patterns
      html = html.replace(/(?:src|href)="\.\/assets\//g, (match) => {
        return match.replace("./assets/", `${assetsUri}/`);
      });
      html = html.replace(/(?:src|href)="\/assets\//g, (match) => {
        return match.replace("/assets/", `${assetsUri}/`);
      });

      // Remove crossorigin attribute (not needed/supported in webviews)
      html = html.replace(/ crossorigin/g, "");

      // Process CSS files to fix font URLs and inline them
      const assetsDir = path.join(webviewOutPath.fsPath, "assets");
      if (fs.existsSync(assetsDir)) {
        const cssFiles = fs
          .readdirSync(assetsDir)
          .filter((file) => file.endsWith(".css"));
        for (const cssFile of cssFiles) {
          try {
            const cssPath = path.join(assetsDir, cssFile);
            let cssContent = fs.readFileSync(cssPath, "utf8");

            // Fix font URLs in CSS
            cssContent = cssContent.replace(
              /url\(["']?([^"')]+\.(ttf|woff|woff2|eot))(\?[^"')]*)?["']?\)/g,
              `url("${assetsUri}/$1")`
            );

            // Replace the CSS link with inline style
            const cssUri = `${assetsUri}/${cssFile}`;
            const cssLinkPattern = new RegExp(
              `<link[^>]*href="${cssUri.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              )}"[^>]*>`,
              "g"
            );
            html = html.replace(cssLinkPattern, `<style>${cssContent}</style>`);
          } catch (error) {
            console.error(`Error processing CSS file ${cssFile}:`, error);
          }
        }
      }

      // Add CSP meta tag
      const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource};">`;
      html = html.replace("<head>", `<head>\n    ${csp}`);

      // Add nonce to script tags
      html = html.replace(/<script /g, `<script nonce="${nonce}" `);
      html = html.replace(/<script>/g, `<script nonce="${nonce}">`);

      return html;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error loading sidebar webview:", errorMessage);
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body {
      padding: 12px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
    }
    h1 { font-size: 14px; margin: 0 0 8px; }
    p { font-size: 12px; margin: 0; color: var(--vscode-errorForeground); }
  </style>
</head>
<body>
  <h1>Error loading sidebar</h1>
  <p>${errorMessage}</p>
</body>
</html>`;
    }
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
