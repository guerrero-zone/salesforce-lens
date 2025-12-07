import * as vscode from "vscode";

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "salesforce-lens.dashboardView";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((message) => {
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
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Salesforce Lens</title>
	<style>
		body {
			padding: 10px;
			color: var(--vscode-foreground);
			font-family: var(--vscode-font-family);
		}
		h3 {
			margin-top: 0;
		}
		.open-btn {
			width: 100%;
			padding: 8px 16px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 2px;
			cursor: pointer;
			font-size: 13px;
		}
		.open-btn:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		p {
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
		}
	</style>
</head>
<body>
	<h3>Salesforce Lens</h3>
	<p>Manage your Salesforce Scratch Orgs</p>
	<button class="open-btn" id="openDashboardBtn">Open Dashboard</button>
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		document.getElementById('openDashboardBtn').addEventListener('click', function() {
			vscode.postMessage({ command: 'openDashboard' });
		});
	</script>
</body>
</html>`;
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
