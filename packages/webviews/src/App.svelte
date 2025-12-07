<script lang="ts">
  import type { DevHubInfo } from "./lib/types";
  import { postMessage } from "./lib/vscode";
  import DevHubCard from "./lib/DevHubCard.svelte";
  import ScratchOrgList from "./lib/ScratchOrgList.svelte";

  type View = "dashboard" | "scratchOrgs";

  let currentView = $state<View>("dashboard");
  let devHubs = $state<DevHubInfo[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selectedDevHub = $state<DevHubInfo | null>(null);

  function showScratchOrgs(devHub: DevHubInfo) {
    selectedDevHub = devHub;
    currentView = "scratchOrgs";
  }

  function goBackToDashboard() {
    currentView = "dashboard";
    selectedDevHub = null;
  }

  function loadDevHubs() {
    loading = true;
    error = null;
    postMessage({ command: "getDevHubs" });
  }

  // Listen for messages from extension
  $effect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "devHubsLoading":
          loading = true;
          error = null;
          break;

        case "devHubsData":
          devHubs = message.devHubs;
          loading = false;
          break;

        case "devHubsError":
          error = message.error;
          loading = false;
          break;

        case "devHubRefreshed":
          // Update the specific DevHub's limits
          devHubs = devHubs.map((hub) =>
            hub.username === message.devHubUsername
              ? { ...hub, limits: message.limits }
              : hub
          );
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

<div class="app">
  {#if currentView === "dashboard"}
    <header class="dashboard-header">
      <div class="header-content">
        <div class="logo">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484-.08.08-.162.158-.242.234-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3-1.5 3-2.5 0-1.5-1.5-2-2.5-2-.77 0-1.5 0-1.5-.5 0-1 .5-1.5 1-2l3-3c0-.5-1-1.5-3-1.5-1.5 0-2 1-2 1.5s1 .5 1.5 1c.5.5.5 1 0 1.5s-2 2.5-3 2.5-2-1.5-2.5-2.5c-.05-.1-.15-.25-.3-.45C1.06 4.998.5 4.5.5 3.5c0-.817.597-1.5 1.54-1.174z"/>
          </svg>
          <h1>Salesforce Lens</h1>
        </div>
        <p class="tagline">Manage your Scratch Org ecosystem</p>
      </div>
      <button class="refresh-button" onclick={loadDevHubs} disabled={loading} title="Refresh DevHubs">
        <svg viewBox="0 0 16 16" fill="currentColor" class:spinning={loading}>
          <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
        </svg>
        Refresh
      </button>
    </header>

    <main class="dashboard-main">
      {#if loading}
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <h2>Loading DevHubs...</h2>
          <p>Fetching your Salesforce organization data</p>
        </div>
      {:else if error}
        <div class="error-container">
          <svg class="error-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
          </svg>
          <h2>Failed to Load DevHubs</h2>
          <p>{error}</p>
          <button class="retry-button" onclick={loadDevHubs}>
            Try Again
          </button>
        </div>
      {:else if devHubs.length === 0}
        <div class="empty-container">
          <svg class="empty-icon" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
            <path d="M5 8a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 8zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 6z"/>
          </svg>
          <h2>No DevHubs Found</h2>
          <p>
            It looks like you haven't authorized any DevHub orgs yet.
          </p>
          <code>sf org login web --set-default-dev-hub</code>
        </div>
      {:else}
        <section class="devhub-section">
          <div class="section-header">
            <h2 class="section-title">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.707 1.5a1 1 0 0 0-1.414 0L.646 8.146a.5.5 0 0 0 .708.708L2 8.207V13.5A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V8.207l.646.647a.5.5 0 0 0 .708-.708L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.707 1.5zM13 7.207V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V7.207l5-5 5 5z"/>
              </svg>
              DevHub Organizations
            </h2>
            <span class="count-badge">{devHubs.length}</span>
          </div>
          <div class="devhub-grid">
            {#each devHubs as devHub (devHub.orgId)}
              <DevHubCard {devHub} onclick={() => showScratchOrgs(devHub)} />
            {/each}
          </div>
        </section>
      {/if}
    </main>
  {:else if currentView === "scratchOrgs" && selectedDevHub}
    <ScratchOrgList devHub={selectedDevHub} onback={goBackToDashboard} />
  {/if}
</div>

<style>
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--vscode-editor-background);
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-widget-border);
  }

  .header-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo svg {
    width: 20px;
    height: 20px;
    color: var(--vscode-button-background);
  }

  .logo h1 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .tagline {
    margin: 0;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-left: 28px;
  }

  .refresh-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--vscode-button-secondaryBackground);
    border: 1px solid var(--vscode-button-secondaryBackground);
    border-radius: 3px;
    color: var(--vscode-button-secondaryForeground);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s;
  }

  .refresh-button:hover:not(:disabled) {
    background: var(--vscode-button-secondaryHoverBackground);
  }

  .refresh-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .refresh-button svg {
    width: 14px;
    height: 14px;
  }

  .refresh-button svg.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .dashboard-main {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .loading-container,
  .error-container,
  .empty-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    text-align: center;
    padding: 32px;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--vscode-widget-border);
    border-top-color: var(--vscode-progressBar-background, var(--vscode-button-background));
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 16px;
  }

  .loading-container h2,
  .error-container h2,
  .empty-container h2 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .loading-container p,
  .error-container p,
  .empty-container p {
    margin: 0;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    max-width: 320px;
  }

  .error-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
    color: var(--vscode-errorForeground);
  }

  .empty-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
    color: var(--vscode-descriptionForeground);
  }

  .empty-container code {
    display: block;
    margin-top: 12px;
    padding: 8px 12px;
    background: var(--vscode-textCodeBlock-background);
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    color: var(--vscode-foreground);
  }

  .retry-button {
    margin-top: 12px;
    padding: 5px 12px;
    background: var(--vscode-button-background);
    border: none;
    border-radius: 3px;
    color: var(--vscode-button-foreground);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  .retry-button:hover {
    background: var(--vscode-button-hoverBackground);
  }

  .devhub-section {
    max-width: 1200px;
    margin: 0 auto;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .section-title svg {
    width: 16px;
    height: 16px;
    opacity: 0.8;
  }

  .count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    font-size: 11px;
    font-weight: 600;
    border-radius: 10px;
  }

  .devhub-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
  }

  @media (max-width: 480px) {
    .dashboard-header {
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }

    .devhub-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
