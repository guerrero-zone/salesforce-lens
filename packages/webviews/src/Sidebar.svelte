<script lang="ts">
  import { postMessage } from "./lib/vscode";
  import SidebarDevHubItem from "./components/SidebarDevHubItem.svelte";

  interface SidebarDevHubInfo {
    username: string;
    orgId: string;
    instanceUrl: string;
    aliases: string[];
    isDevHub: boolean;
    connectedStatus: string;
    orgType: string;
    edition?: string;
  }

  let devHubs = $state<SidebarDevHubInfo[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  function loadDevHubs() {
    loading = true;
    error = null;
    devHubs = [];
    postMessage({ command: "getDevHubs" });
  }

  function openDashboard() {
    postMessage({ command: "openDashboard" });
  }

  function openScratchOrgs(devHub: SidebarDevHubInfo) {
    postMessage({
      command: "openScratchOrgs",
      username: devHub.username,
      aliases: JSON.parse(JSON.stringify(devHub.aliases)),
      orgType: devHub.orgType,
    });
  }

  // Listen for messages from extension
  $effect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "devHubsLoading":
          loading = true;
          error = null;
          devHubs = [];
          break;

        case "devHubsData":
          devHubs = message.devHubs;
          loading = false;
          break;

        case "devHubsError":
          error = message.error;
          loading = false;
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    loadDevHubs();

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  });
</script>

<div class="sidebar">
  <div class="header">
    <h3>Salesforce Lens</h3>
    <p>Manage your Scratch Orgs</p>
  </div>

  <div class="actions">
    <button class="open-btn" onclick={openDashboard}>
      <span class="codicon codicon-dashboard"></span>
      Open Dashboard
    </button>
  </div>

  <div class="section-title">
    <span>DevHub Organizations</span>
    <button
      class="refresh-btn"
      onclick={loadDevHubs}
      disabled={loading}
      title="Refresh"
    >
      <span class="codicon codicon-refresh" class:spinning={loading}></span>
    </button>
  </div>

  <div class="content">
    {#if loading && devHubs.length === 0}
      <div class="loading">
        <div class="spinner"></div>
        <span>Loading DevHubs...</span>
      </div>
    {:else if error}
      <div class="error">
        <span class="codicon codicon-warning"></span>
        <span>Failed to load DevHubs: {error}</span>
        <button class="retry-btn" onclick={loadDevHubs}>Retry</button>
      </div>
    {:else if devHubs.length === 0}
      <div class="empty">
        <span class="codicon codicon-inbox empty-icon"></span>
        <p>No DevHubs found.</p>
        <code>sf org login web</code>
        <span class="hint">to authorize a DevHub</span>
      </div>
    {:else}
      <div class="devhub-list">
        {#each devHubs as devHub (devHub.username)}
          <SidebarDevHubItem {devHub} onclick={() => openScratchOrgs(devHub)} />
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .sidebar {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .header {
    padding: 12px;
    border-bottom: 1px solid var(--vscode-widget-border);
  }

  .header h3 {
    margin: 0 0 4px 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
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
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-weight: 500;
    transition: background-color 0.1s;
  }

  .open-btn:hover {
    background-color: var(--vscode-button-hoverBackground);
  }

  .open-btn:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
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
    border-bottom: 1px solid var(--vscode-widget-border);
  }

  .refresh-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--vscode-descriptionForeground);
    display: flex;
    align-items: center;
    border-radius: 3px;
    transition: color 0.1s, background-color 0.1s;
  }

  .refresh-btn:hover:not(:disabled) {
    color: var(--vscode-foreground);
    background-color: var(--vscode-toolbar-hoverBackground);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .refresh-btn .codicon.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .content {
    flex: 1;
    overflow-y: auto;
  }

  .devhub-list {
    display: flex;
    flex-direction: column;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    color: var(--vscode-descriptionForeground);
    gap: 12px;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--vscode-widget-border);
    border-top-color: var(--vscode-button-background);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 12px;
    color: var(--vscode-errorForeground);
    font-size: 12px;
    gap: 8px;
    text-align: center;
  }

  .error .codicon {
    font-size: 24px;
  }

  .retry-btn {
    margin-top: 4px;
    padding: 4px 12px;
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
  }

  .retry-btn:hover {
    background-color: var(--vscode-button-secondaryHoverBackground);
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 12px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
  }

  .empty-icon {
    font-size: 32px;
    margin-bottom: 8px;
    opacity: 0.6;
  }

  .empty p {
    margin: 0 0 8px 0;
    font-size: 12px;
  }

  .empty code {
    display: block;
    padding: 6px 10px;
    background: var(--vscode-textCodeBlock-background);
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    color: var(--vscode-foreground);
  }

  .empty .hint {
    margin-top: 4px;
    font-size: 10px;
    opacity: 0.8;
  }
</style>

