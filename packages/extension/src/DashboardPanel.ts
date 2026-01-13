import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import {
  salesforceService,
  DevHubInfo,
  ScratchOrgInfo,
  OrgInfo,
  SnapshotInfo,
} from "./services/SalesforceService";

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  public static readonly viewType = "scratchOrgLens.dashboard";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _isWebviewReady: boolean = false;
  private _pendingMessages: object[] = [];
  private _readyResolvers: Array<() => void> = [];

  /**
   * Gets the webview output path, checking both production (webviews/out)
   * and development (../webviews/out) locations
   */
  private static getWebviewOutPath(extensionUri: vscode.Uri): vscode.Uri {
    // First, try production path (webviews/out inside extension package)
    const productionPath = vscode.Uri.joinPath(extensionUri, "webviews", "out");
    if (fs.existsSync(productionPath.fsPath)) {
      return productionPath;
    }

    // Fall back to development path (../webviews/out - monorepo structure)
    const developmentPath = vscode.Uri.joinPath(
      extensionUri,
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

  public static createOrShow(extensionUri: vscode.Uri) {
    try {
      console.log("DashboardPanel.createOrShow called");
      const column = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;

      // If we already have a panel, show it
      if (DashboardPanel.currentPanel) {
        console.log("Revealing existing panel");
        DashboardPanel.currentPanel._panel.reveal(column);
        return;
      }

      console.log("Creating new dashboard panel");
      // Otherwise, create a new panel
      const webviewsOutUri = DashboardPanel.getWebviewOutPath(extensionUri);

      const panel = vscode.window.createWebviewPanel(
        DashboardPanel.viewType,
        "Salesforce Lens",
        column || vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [webviewsOutUri],
          retainContextWhenHidden: true,
        }
      );

      console.log("Panel created, initializing DashboardPanel");
      DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
      console.log("DashboardPanel initialized successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error creating dashboard panel:", errorMessage);
      vscode.window.showErrorMessage(
        `Failed to open dashboard: ${errorMessage}`
      );
    }
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri);
  }

  /**
   * Show scratch orgs for a specific DevHub
   */
  public static async showScratchOrgsForDevHub(
    extensionUri: vscode.Uri,
    devHubUsername: string,
    devHubAliases: string[],
    orgType: string
  ): Promise<void> {
    // Create or show the panel
    DashboardPanel.createOrShow(extensionUri);

    // Wait for webview to be ready
    if (DashboardPanel.currentPanel) {
      await DashboardPanel.currentPanel._waitForReady();
      DashboardPanel.currentPanel._postMessage({
        command: "showScratchOrgsView",
        devHub: {
          username: devHubUsername,
          aliases: devHubAliases,
          orgType,
        },
      });
    }
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    // Assign properties first to satisfy TypeScript
    this._panel = panel;
    this._extensionUri = extensionUri;

    try {
      // Set the webview's initial html content
      this._update();

      // Listen for when the panel is disposed
      // This happens when the user closes the panel or when the panel is closed programmatically
      this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

      // Handle messages from the webview
      this._panel.webview.onDidReceiveMessage(
        async (message) => {
          await this._handleMessage(message);
        },
        null,
        this._disposables
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error in DashboardPanel constructor:", errorMessage);
      // Set error HTML
      this._panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
</head>
<body>
  <h1>Error loading dashboard</h1>
  <p>${errorMessage}</p>
  <p>Please check the extension logs for more details.</p>
</body>
</html>`;
      vscode.window.showErrorMessage(
        `Failed to initialize dashboard: ${errorMessage}`
      );
    }
  }

  private async _handleMessage(message: {
    command: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }): Promise<void> {
    switch (message.command) {
      case "webviewReady":
        this._onWebviewReady();
        return;

      case "alert":
        vscode.window.showInformationMessage(message.text);
        return;

      case "getDevHubs":
        await this._sendDevHubs(message.forceRefresh);
        return;

      case "getScratchOrgs":
        await this._sendScratchOrgs(message.devHubUsername);
        return;

      case "deleteScratchOrgs":
        await this._deleteScratchOrgs(message.scratchOrgs);
        return;

      case "refreshDevHub":
        await this._refreshDevHub(message.devHubUsername);
        return;

      case "getSnapshots":
        await this._sendSnapshots(message.devHubUsername);
        return;

      case "deleteSnapshots":
        await this._deleteSnapshots(message.snapshots);
        return;

      case "exportScratchOrgs":
        await this._exportScratchOrgsToFile({
          format: message.format,
          fileName: message.fileName,
          content: message.content,
        });
        return;
    }
  }

  private async _exportScratchOrgsToFile(input: {
    format: "json" | "csv";
    fileName: string;
    content: string;
  }): Promise<void> {
    try {
      const format = input.format === "csv" ? "csv" : "json";
      const suggestedName =
        typeof input.fileName === "string" && input.fileName.trim()
          ? input.fileName.trim()
          : `scratch-orgs.${format}`;

      const defaultUri = vscode.Uri.file(
        path.join(os.homedir(), suggestedName)
      );

      const uri = await vscode.window.showSaveDialog({
        defaultUri,
        saveLabel: "Export",
        filters:
          format === "json"
            ? { JSON: ["json"] }
            : { CSV: ["csv"] },
      });

      if (!uri) return; // cancelled

      const content = typeof input.content === "string" ? input.content : "";
      const bytes = new TextEncoder().encode(content);
      await vscode.workspace.fs.writeFile(uri, bytes);

      vscode.window.showInformationMessage(
        `Exported scratch orgs to ${path.basename(uri.fsPath)}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Failed to export scratch orgs: ${errorMessage}`
      );
    }
  }

  private _onWebviewReady(): void {
    console.log("Webview reported ready");
    this._isWebviewReady = true;

    // Resolve all pending ready promises
    for (const resolve of this._readyResolvers) {
      resolve();
    }
    this._readyResolvers = [];

    // Send any pending messages
    for (const message of this._pendingMessages) {
      this._panel.webview.postMessage(message);
    }
    this._pendingMessages = [];
  }

  private _waitForReady(): Promise<void> {
    if (this._isWebviewReady) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this._readyResolvers.push(resolve);
      // Timeout after 5 seconds as fallback
      setTimeout(() => {
        if (!this._isWebviewReady) {
          console.warn("Webview ready timeout - forcing ready state");
          this._onWebviewReady();
        }
      }, 5000);
    });
  }

  private async _sendDevHubs(forceRefresh = false): Promise<void> {
    try {
      this._postMessage({ command: "devHubsLoading" });

      // Invalidate cache if force refresh requested
      if (forceRefresh) {
        salesforceService.invalidateCache();
      }

      // Use the streaming method for progressive loading
      // This sends cached data immediately if available, then updates progressively
      await salesforceService.streamDevHubsData({
        onDevHubsLoaded: (devHubs) => {
          // Send DevHubs immediately with placeholder limits
          const initialDevHubs: DevHubInfo[] = devHubs.map((hub) => ({
            ...hub,
            limits: {
              activeScratchOrgs: -1, // -1 indicates loading
              maxActiveScratchOrgs: -1,
              dailyScratchOrgs: -1,
              maxDailyScratchOrgs: -1,
            },
          }));
          this._postMessage({
            command: "devHubsData",
            devHubs: initialDevHubs,
          });
        },
        onEditionLoaded: (username, edition) => {
          this._postMessage({
            command: "devHubEditionLoaded",
            username,
            edition,
          });
        },
        onLimitsLoaded: (username, limits, error) => {
          this._postMessage({
            command: "devHubLimitsLoaded",
            username,
            limits,
            error,
          });
        },
        onSnapshotsInfoLoaded: (username, snapshotsInfo) => {
          this._postMessage({
            command: "devHubSnapshotsInfoLoaded",
            username,
            snapshotsInfo,
          });
        },
        onComplete: () => {
          // Signal that all loading is complete
          this._postMessage({ command: "loadingComplete" });
        },
        onError: (errorMessage) => {
          this._postMessage({
            command: "devHubsError",
            error: errorMessage,
          });
          vscode.window.showErrorMessage(
            `Failed to fetch DevHub information: ${errorMessage}`
          );
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this._postMessage({
        command: "devHubsError",
        error: errorMessage,
      });
      vscode.window.showErrorMessage(
        `Failed to fetch DevHub information: ${errorMessage}`
      );
    }
  }

  private async _sendScratchOrgs(devHubUsername: string): Promise<void> {
    try {
      this._postMessage({
        command: "scratchOrgsLoading",
        devHubUsername,
      });
      const scratchOrgs: ScratchOrgInfo[] =
        await salesforceService.getAllScratchOrgsForDevHub(devHubUsername);
      this._postMessage({
        command: "scratchOrgsData",
        devHubUsername,
        scratchOrgs,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this._postMessage({
        command: "scratchOrgsError",
        devHubUsername,
        error: errorMessage,
      });
      vscode.window.showErrorMessage(
        `Failed to fetch scratch orgs: ${errorMessage}`
      );
    }
  }

  private async _sendSnapshots(devHubUsername: string): Promise<void> {
    try {
      this._postMessage({
        command: "snapshotsLoading",
        devHubUsername,
      });
      const result = await salesforceService.getAllSnapshotsForDevHub(
        devHubUsername
      );
      this._postMessage({
        command: "snapshotsData",
        devHubUsername,
        snapshots: result.snapshots,
        status: result.status,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this._postMessage({
        command: "snapshotsError",
        devHubUsername,
        error: errorMessage,
      });
    }
  }

  private async _deleteScratchOrgs(
    scratchOrgs: Array<{ id: string; devHubUsername: string }>
  ): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete ${scratchOrgs.length} scratch org(s)?`,
        { modal: true },
        "Delete"
      );

      if (confirm !== "Delete") {
        this._postMessage({
          command: "deleteCancelled",
        });
        return;
      }

      this._postMessage({ command: "deleteStarted" });
      const result = await salesforceService.deleteScratchOrgs(scratchOrgs);

      if (result.success.length > 0) {
        vscode.window.showInformationMessage(
          `Successfully deleted ${result.success.length} scratch org(s)`
        );
      }

      if (result.failed.length > 0) {
        vscode.window.showWarningMessage(
          `Failed to delete ${result.failed.length} scratch org(s)`
        );
      }

      this._postMessage({
        command: "deleteCompleted",
        success: result.success,
        failed: result.failed,
      });

      // Refresh the DevHub data
      if (scratchOrgs.length > 0) {
        await this._refreshDevHub(scratchOrgs[0].devHubUsername);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this._postMessage({
        command: "deleteError",
        error: errorMessage,
      });
      vscode.window.showErrorMessage(
        `Failed to delete scratch orgs: ${errorMessage}`
      );
    }
  }

  private async _deleteSnapshots(
    snapshots: Array<{ id: string; devHubUsername: string }>
  ): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete ${snapshots.length} snapshot(s)?`,
        { modal: true },
        "Delete"
      );

      if (confirm !== "Delete") {
        this._postMessage({
          command: "snapshotsDeleteCancelled",
        });
        return;
      }

      // Non-modal toast so the user knows work has started
      vscode.window.showInformationMessage(
        `Deleting ${snapshots.length} snapshot(s)...`
      );

      this._postMessage({ command: "snapshotsDeleteStarted" });
      const result = await salesforceService.deleteSnapshots(snapshots);

      if (result.success.length > 0) {
        vscode.window.showInformationMessage(
          `Successfully deleted ${result.success.length} snapshot(s)`
        );
      }

      if (result.failed.length > 0) {
        vscode.window.showWarningMessage(
          `Failed to delete ${result.failed.length} snapshot(s)`
        );
      }

      this._postMessage({
        command: "snapshotsDeleteCompleted",
        success: result.success,
        failed: result.failed,
      });
      // Note: we rely on the webview to optimistically remove deleted
      // snapshots from its local state, instead of reloading the full
      // list here for a smoother UX.
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this._postMessage({
        command: "snapshotsDeleteError",
        error: errorMessage,
      });
      vscode.window.showErrorMessage(
        `Failed to delete snapshots: ${errorMessage}`
      );
    }
  }

  private async _refreshDevHub(devHubUsername: string): Promise<void> {
    try {
      const limits = await salesforceService.getDevHubLimits(devHubUsername);
      this._postMessage({
        command: "devHubRefreshed",
        devHubUsername,
        limits,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to refresh DevHub ${devHubUsername}:`,
        errorMessage
      );
    }
  }

  private _postMessage(message: object): void {
    this._panel.webview.postMessage(message);
  }

  public dispose() {
    DashboardPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    try {
      const webview = this._panel.webview;
      const html = this._getHtmlForWebview(webview);
      this._panel.webview.html = html;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error updating webview:", errorMessage);
      this._panel.webview.html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
</head>
<body>
  <h1>Error loading dashboard</h1>
  <p>${errorMessage}</p>
  <p>Please check the extension logs for more details.</p>
</body>
</html>`;
      vscode.window.showErrorMessage(
        `Failed to update dashboard: ${errorMessage}`
      );
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    try {
      // Get webview path (checks both production and development locations)
      const webviewOutPath = DashboardPanel.getWebviewOutPath(
        this._extensionUri
      );

      // Read the built index.html
      const indexPath = path.join(webviewOutPath.fsPath, "index.html");
      if (!fs.existsSync(indexPath)) {
        throw new Error(
          `Index file not found: ${indexPath}. Make sure webviews are built.`
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
      // Return a basic error page if something goes wrong
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Error loading webview:", errorMessage);
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
</head>
<body>
  <h1>Error loading dashboard</h1>
  <p>${errorMessage}</p>
  <p>Please check the extension logs for more details.</p>
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
