import * as vscode from "vscode";
import { salesforceService, OrgInfo } from "./services/SalesforceService";

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
          await this._sendDevHubs();
          break;

        case "openScratchOrgs":
          console.log("Opening scratch orgs for:", message.username);
          vscode.commands.executeCommand(
            "salesforce-lens.openScratchOrgs",
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

  private async _sendDevHubs(): Promise<void> {
    if (!this._view) return;

    try {
      this._view.webview.postMessage({ command: "devHubsLoading" });
      const devHubs: OrgInfo[] =
        await salesforceService.getDevHubsListWithEdition();
      this._view.webview.postMessage({ command: "devHubsData", devHubs });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this._view.webview.postMessage({
        command: "devHubsError",
        error: errorMessage,
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();

    // Get the codicon stylesheet URI
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "node_modules",
        "@vscode/codicons",
        "dist",
        "codicon.css"
      )
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${codiconsUri}" rel="stylesheet" />
  <title>Salesforce Lens</title>
  <style>
    body {
      padding: 0;
      margin: 0;
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    
    .header {
      padding: 12px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    
    .header h3 {
      margin: 0 0 4px 0;
      font-size: 13px;
      font-weight: 600;
    }
    
    .header p {
      margin: 0;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    
    .actions {
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    
    .open-btn {
      width: 100%;
      padding: 6px 12px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    
    .open-btn:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    
    .section-title {
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .refresh-btn {
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      color: var(--vscode-descriptionForeground);
      display: flex;
      align-items: center;
    }
    
    .refresh-btn:hover {
      color: var(--vscode-foreground);
    }
    
    .refresh-btn.spinning .codicon {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .devhub-list {
      padding: 0;
      margin: 0;
      list-style: none;
    }
    
    .devhub-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid var(--vscode-widget-border);
      transition: background-color 0.1s;
    }
    
    .devhub-item:hover {
      background-color: var(--vscode-list-hoverBackground);
    }
    
    .devhub-icon {
      font-size: 16px;
      margin-right: 8px;
      flex-shrink: 0;
      color: var(--vscode-foreground);
    }
    
    .devhub-info {
      flex: 1;
      min-width: 0;
    }
    
    .devhub-name {
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .devhub-username {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: var(--vscode-editor-font-family);
    }
    
    .devhub-edition {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }
    
    .devhub-badge {
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 2px;
      font-weight: 500;
      margin-left: 8px;
      flex-shrink: 0;
    }
    
    .badge-production {
      background-color: var(--vscode-testing-iconPassed);
      color: white;
    }
    
    .badge-sandbox {
      background-color: var(--vscode-editorWarning-foreground);
      color: black;
    }
    
    .badge-unknown {
      background-color: var(--vscode-descriptionForeground);
      color: white;
    }
    
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      color: var(--vscode-descriptionForeground);
    }
    
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--vscode-widget-border);
      border-top-color: var(--vscode-button-background);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 8px;
    }
    
    .error {
      padding: 12px;
      color: var(--vscode-errorForeground);
      font-size: 12px;
    }
    
    .empty {
      padding: 20px 12px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }
    
    .chevron {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h3>Salesforce Lens</h3>
    <p>Manage your Scratch Orgs</p>
  </div>
  
  <div class="actions">
    <button class="open-btn" id="openDashboardBtn">
      <span class="codicon codicon-dashboard"></span>
      Open Dashboard
    </button>
  </div>
  
  <div class="section-title">
    <span>DevHub Organizations</span>
    <button class="refresh-btn" id="refreshBtn" title="Refresh">
      <span class="codicon codicon-refresh"></span>
    </button>
  </div>
  
  <div id="content">
    <div class="loading">
      <div class="spinner"></div>
      <span>Loading DevHubs...</span>
    </div>
  </div>
  
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const contentEl = document.getElementById('content');
    const refreshBtn = document.getElementById('refreshBtn');
    let isLoading = false;
    
    document.getElementById('openDashboardBtn').addEventListener('click', function() {
      vscode.postMessage({ command: 'openDashboard' });
    });
    
    refreshBtn.addEventListener('click', function() {
      if (!isLoading) {
        vscode.postMessage({ command: 'getDevHubs' });
      }
    });
    
    function renderDevHubs(devHubs) {
      if (devHubs.length === 0) {
        contentEl.innerHTML = '<div class="empty">No DevHubs found.<br>Use <code>sf org login web</code> to authorize a DevHub.</div>';
        return;
      }
      
      let html = '<ul class="devhub-list">';
      for (const hub of devHubs) {
        const displayName = hub.aliases && hub.aliases.length > 0 ? hub.aliases[0] : hub.username.split('@')[0];
        const badgeClass = hub.orgType === 'Production' ? 'badge-production' : 
                          hub.orgType === 'Sandbox' ? 'badge-sandbox' : 'badge-unknown';
        const badgeText = hub.orgType === 'Production' ? 'PROD' : 
                         hub.orgType === 'Sandbox' ? 'SBX' : 'ORG';
        const editionText = hub.edition || '';
        
        html += \`
          <li class="devhub-item" data-username="\${hub.username}" data-aliases='\${JSON.stringify(hub.aliases || [])}' data-orgtype="\${hub.orgType}">
            <span class="devhub-icon codicon codicon-home"></span>
            <div class="devhub-info">
              <div class="devhub-name">\${displayName}</div>
              <div class="devhub-username">\${hub.username}</div>
              \${editionText ? '<div class="devhub-edition">' + editionText + '</div>' : ''}
            </div>
            <span class="devhub-badge \${badgeClass}">\${badgeText}</span>
            <span class="chevron codicon codicon-chevron-right"></span>
          </li>
        \`;
      }
      html += '</ul>';
      contentEl.innerHTML = html;
      
      // Add click handlers
      document.querySelectorAll('.devhub-item').forEach(item => {
        item.addEventListener('click', function() {
          const username = this.dataset.username;
          const aliases = JSON.parse(this.dataset.aliases || '[]');
          const orgType = this.dataset.orgtype;
          vscode.postMessage({ 
            command: 'openScratchOrgs',
            username,
            aliases,
            orgType
          });
        });
      });
    }
    
    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.command) {
        case 'devHubsLoading':
          isLoading = true;
          refreshBtn.classList.add('spinning');
          contentEl.innerHTML = '<div class="loading"><div class="spinner"></div><span>Loading DevHubs...</span></div>';
          break;
          
        case 'devHubsData':
          isLoading = false;
          refreshBtn.classList.remove('spinning');
          renderDevHubs(message.devHubs);
          break;
          
        case 'devHubsError':
          isLoading = false;
          refreshBtn.classList.remove('spinning');
          contentEl.innerHTML = '<div class="error">Failed to load DevHubs: ' + message.error + '</div>';
          break;
      }
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
