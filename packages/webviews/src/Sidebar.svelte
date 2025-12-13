<script lang="ts">
  import { postMessage } from "./lib/vscode";
  import type { SidebarDevHubInfo } from "./lib/parseUtils";
  import SidebarDevHubItem from "./components/SidebarDevHubItem.svelte";
  import { LoadingState, ErrorState, EmptyState } from "./components/common";

  let devHubs = $state<SidebarDevHubInfo[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let isLoadingEditions = $state(false);

  function loadDevHubs(forceRefresh = false) {
    loading = true;
    error = null;
    devHubs = [];
    postMessage({ command: "getDevHubs", forceRefresh });
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
          isLoadingEditions = true;
          break;

        case "devHubsData":
          // Mark all DevHubs as loading editions initially (always show skeleton first)
          devHubs = message.devHubs.map((hub: SidebarDevHubInfo) => ({
            ...hub,
            editionLoading: true, // Always start with loading state
          }));
          loading = false;
          isLoadingEditions = true;
          break;

        case "devHubEditionLoaded":
          // Update the specific DevHub's edition progressively and mark as not loading
          devHubs = devHubs.map((hub) =>
            hub.username === message.username
              ? { ...hub, edition: message.edition, editionLoading: false }
              : hub
          );
          // Check if all editions are loaded
          if (devHubs.every(hub => !hub.editionLoading)) {
            isLoadingEditions = false;
          }
          break;

        case "devHubsError":
          error = message.error;
          loading = false;
          isLoadingEditions = false;
          break;

        case "loadingComplete":
          isLoadingEditions = false;
          break;
      }
    };

    // Handle visibility changes - refresh when becoming visible if data might be stale
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Request fresh data when becoming visible
        postMessage({ command: "getDevHubs", forceRefresh: false });
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    loadDevHubs();

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
      onclick={() => loadDevHubs(true)}
      disabled={loading}
      title="Refresh"
    >
      <span class="codicon codicon-refresh" class:spinning={loading || isLoadingEditions}></span>
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
      <EmptyState
        icon="codicon-inbox"
        title="No DevHubs found."
      >
        {#snippet children()}
          <code>sf org login web</code>
          <span class="hint">to authorize a DevHub</span>
        {/snippet}
      </EmptyState>
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

  .content :global(.empty-state) {
    padding: 24px 12px;
  }

  .content :global(.empty-state .state-icon) {
    font-size: 32px;
    opacity: 0.6;
  }

  .content :global(.empty-state h3) {
    font-size: 12px;
  }

  .content code {
    display: block;
    padding: 6px 10px;
    background: var(--vscode-textCodeBlock-background);
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    color: var(--vscode-foreground);
  }

  .hint {
    margin-top: 4px;
    font-size: 10px;
    opacity: 0.8;
    color: var(--vscode-descriptionForeground);
  }
</style>
