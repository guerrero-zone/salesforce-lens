<script lang="ts">
  import type { DevHubInfo, ScratchOrgLimits, SnapshotsInfo } from "./lib/types";
  import { postMessage } from "./lib/vscode";
  import DevHubCard from "./components/DevHubCard.svelte";
  import DevHubDetailView from "./components/DevHubDetailView.svelte";

  type View = "dashboard" | "detail";

  let currentView = $state<View>("dashboard");
  let devHubs = $state<DevHubInfo[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selectedDevHub = $state<DevHubInfo | null>(null);

  function showDevHubDetail(devHub: DevHubInfo) {
    selectedDevHub = devHub;
    currentView = "detail";
  }

  function goBackToDashboard() {
    currentView = "dashboard";
    selectedDevHub = null;
  }

  function loadDevHubs() {
    loading = true;
    error = null;
    devHubs = [];
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

        case "devHubLimitsLoaded":
          // Update the specific DevHub's limits progressively
          devHubs = devHubs.map((hub) =>
            hub.username === message.username
              ? { ...hub, limits: message.limits as ScratchOrgLimits }
              : hub
          );
          break;

        case "devHubSnapshotsInfoLoaded":
          // Update the specific DevHub's snapshots info progressively
          devHubs = devHubs.map((hub) =>
            hub.username === message.username
              ? { ...hub, snapshots: message.snapshotsInfo as SnapshotsInfo }
              : hub
          );
          break;

        case "devHubRefreshed":
          // Update the specific DevHub's limits
          devHubs = devHubs.map((hub) =>
            hub.username === message.devHubUsername
              ? { ...hub, limits: message.limits }
              : hub
          );
          break;

        case "showScratchOrgsView":
          // Open detail view directly from sidebar
          const devHubData = message.devHub;
          // Create a minimal DevHubInfo for the detail view
          selectedDevHub = {
            username: devHubData.username,
            orgId: "",
            instanceUrl: "",
            aliases: devHubData.aliases || [],
            isDevHub: true,
            connectedStatus: "Connected",
            orgType: devHubData.orgType || "Unknown",
            limits: {
              activeScratchOrgs: -1,
              maxActiveScratchOrgs: -1,
              dailyScratchOrgs: -1,
              maxDailyScratchOrgs: -1,
            },
            snapshots: {
              status: "loading",
              activeCount: 0,
              totalCount: 0,
            },
          };
          currentView = "detail";
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    
    // Notify extension that webview is ready
    postMessage({ command: "webviewReady" });
    
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
          <span class="codicon codicon-cloud"></span>
          <h1>Salesforce Lens</h1>
        </div>
        <p class="tagline">Manage your Scratch Org ecosystem</p>
      </div>
      <button class="refresh-button" onclick={loadDevHubs} disabled={loading} title="Refresh DevHubs">
        <span class="codicon codicon-refresh" class:spinning={loading}></span>
        Refresh
      </button>
    </header>

    <main class="dashboard-main">
      {#if loading && devHubs.length === 0}
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <h2>Loading DevHubs...</h2>
          <p>Fetching your Salesforce organization data</p>
        </div>
      {:else if error}
        <div class="error-container">
          <span class="codicon codicon-warning error-icon"></span>
          <h2>Failed to Load DevHubs</h2>
          <p>{error}</p>
          <button class="retry-button" onclick={loadDevHubs}>
            Try Again
          </button>
        </div>
      {:else if devHubs.length === 0}
        <div class="empty-container">
          <span class="codicon codicon-inbox empty-icon"></span>
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
              <span class="codicon codicon-home"></span>
              DevHub Organizations
            </h2>
            <span class="count-badge">{devHubs.length}</span>
          </div>
          <div class="devhub-grid">
            {#each devHubs as devHub (devHub.username)}
              <DevHubCard {devHub} onclick={() => showDevHubDetail(devHub)} />
            {/each}
          </div>
        </section>
      {/if}
    </main>
  {:else if currentView === "detail" && selectedDevHub}
    <DevHubDetailView devHub={selectedDevHub} onback={goBackToDashboard} />
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

  .logo .codicon {
    font-size: 20px;
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

  .refresh-button .codicon {
    font-size: 14px;
  }

  .refresh-button .codicon.spinning {
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
    font-size: 48px;
    margin-bottom: 12px;
    color: var(--vscode-errorForeground);
  }

  .empty-icon {
    font-size: 48px;
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

  .section-title .codicon {
    font-size: 16px;
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
