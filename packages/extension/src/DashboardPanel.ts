import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class DashboardPanel {
  public static currentPanel: DashboardPanel | undefined;
  public static readonly viewType = "scratchOrgLens.dashboard";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

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
        (message) => {
          switch (message.command) {
            case "alert":
              vscode.window.showInformationMessage(message.text);
              return;
          }
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

      // Get asset URIs
      const assetsUri = webview.asWebviewUri(
        vscode.Uri.joinPath(webviewOutPath, "assets")
      );
      const baseUri = webview.asWebviewUri(webviewOutPath);
      const viteSvgUri = webview.asWebviewUri(
        vscode.Uri.joinPath(webviewOutPath, "vite.svg")
      );

      // Generate a single nonce for this webview
      const nonce = getNonce();

      // IMPORTANT: Process JavaScript files BEFORE replacing HTML paths
      // because we need to match the original /assets/ paths in the HTML
      const assetsDir = path.join(webviewOutPath.fsPath, "assets");
      if (fs.existsSync(assetsDir)) {
        const jsFiles = fs
          .readdirSync(assetsDir)
          .filter((file) => file.endsWith(".js"));
        for (const jsFile of jsFiles) {
          try {
            const jsPath = path.join(assetsDir, jsFile);
            if (!fs.existsSync(jsPath)) {
              console.warn(`JavaScript file not found: ${jsPath}`);
              continue;
            }
            let jsContent = fs.readFileSync(jsPath, "utf8");

            // Replace /vite.svg string literals in JavaScript
            jsContent = jsContent.replace(
              /\/vite\.svg/g,
              viteSvgUri.toString()
            );

            // Replace /assets/ paths in JavaScript
            jsContent = jsContent.replace(/\/assets\//g, `${assetsUri}/`);

            // Replace the script src with inline script (match the original /assets/ path in HTML)
            // Match script tag with src pointing to this JS file, handling any attributes
            const escapedJsFile = jsFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            // Try multiple regex patterns to match the script tag
            const patterns = [
              // Pattern 1: With whitespace before closing tag
              `<script[^>]*src=["']/assets/${escapedJsFile}["'][^>]*>\\s*</script>`,
              // Pattern 2: Without whitespace
              `<script[^>]*src=["']/assets/${escapedJsFile}["'][^>]*></script>`,
            ];

            let replaced = false;
            for (const patternStr of patterns) {
              const pattern = new RegExp(patternStr, "g");
              const originalHtml = html;
              html = html.replace(
                pattern,
                `<script nonce="${nonce}" type="module">${jsContent}</script>`
              );
              if (html !== originalHtml) {
                replaced = true;
                break;
              }
            }

            if (!replaced) {
              console.warn(`Could not find script tag for ${jsFile} in HTML`);
            }
          } catch (error) {
            console.error(`Error processing JavaScript file ${jsFile}:`, error);
            // Continue with other files
          }
        }
      }

      // Replace asset paths in HTML (after processing JS files)
      html = html.replace(/href="\/assets\//g, `href="${assetsUri}/`);
      html = html.replace(/src="\/assets\//g, `src="${assetsUri}/`);
      html = html.replace(/href="\/vite\.svg"/g, `href="${viteSvgUri}"`);

      // Add CSP
      const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-inline'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource};">`;

      // Insert CSP and add nonce to any remaining scripts
      html = html.replace("<head>", `<head>\n    ${csp}`);
      html = html.replace(
        /<script(?![^>]*nonce)/g,
        `<script nonce="${nonce}" `
      );

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
