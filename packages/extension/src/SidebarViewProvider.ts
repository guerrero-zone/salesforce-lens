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
      const devHubs: OrgInfo[] = await salesforceService.getDevHubsList();
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

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    
    .refresh-btn.spinning svg {
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
      width: 16px;
      height: 16px;
      margin-right: 8px;
      flex-shrink: 0;
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
      width: 12px;
      height: 12px;
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
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2.5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2h-11zm5 5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1zm-2.5.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm2.5 2.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1zm-2.5.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm2.5 2.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1 0-1zm-2.5.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
      </svg>
      Open Dashboard
    </button>
  </div>
  
  <div class="section-title">
    <span>DevHub Organizations</span>
    <button class="refresh-btn" id="refreshBtn" title="Refresh">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
      </svg>
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
        
        html += \`
          <li class="devhub-item" data-username="\${hub.username}" data-aliases='\${JSON.stringify(hub.aliases || [])}' data-orgtype="\${hub.orgType}">
            <svg class="devhub-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.707 1.5zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5 5 5z"/>
            </svg>
            <div class="devhub-info">
              <div class="devhub-name">\${displayName}</div>
              <div class="devhub-username">\${hub.username}</div>
            </div>
            <span class="devhub-badge \${badgeClass}">\${badgeText}</span>
            <svg class="chevron" viewBox="0 0 16 16" fill="currentColor">
              <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
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
