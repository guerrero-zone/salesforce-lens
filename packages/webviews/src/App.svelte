<script lang="ts">
  import type { DevHubInfo, ScratchOrgLimits, SnapshotsInfo } from "./lib/types";
  import { postMessage } from "./lib/vscode";
  import DevHubCard from "./components/DevHubCard.svelte";
  import DevHubDetailView from "./components/DevHubDetailView.svelte";
  import { LoadingState, ErrorState, EmptyState } from "./components/common";

  type View = "dashboard" | "detail";

  let currentView = $state<View>("dashboard");
  let devHubs = $state<DevHubInfo[]>([]);
  let loading = $state(true);
  let isLoadingDetails = $state(false); // Track if limits/editions/snapshots are still loading
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

  function loadDevHubs(forceRefresh = false) {
    loading = true;
    error = null;
    devHubs = [];
    isLoadingDetails = true;
    postMessage({ command: "getDevHubs", forceRefresh });
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
          isLoadingDetails = true;
          break;

        case "devHubsData":
          devHubs = message.devHubs;
          loading = false;
          isLoadingDetails = true; // Still loading editions/limits/snapshots
          break;

        case "devHubsError":
          error = message.error;
          loading = false;
          isLoadingDetails = false;
          break;

        case "devHubEditionLoaded":
          // Update the specific DevHub's edition progressively
          devHubs = devHubs.map((hub) =>
            hub.username === message.username
              ? { ...hub, edition: message.edition }
              : hub
          );
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

        case "loadingComplete":
          isLoadingDetails = false;
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

    // Handle visibility changes - refresh when becoming visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Request fresh data when becoming visible (will use cache if not stale)
        postMessage({ command: "getDevHubs", forceRefresh: false });
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Notify extension that webview is ready
    postMessage({ command: "webviewReady" });
    
    loadDevHubs();

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
      <button class="refresh-button" onclick={() => loadDevHubs(true)} disabled={loading} title="Refresh DevHubs">
        <span class="codicon codicon-refresh" class:spinning={loading || isLoadingDetails}></span>
        Refresh
      </button>
    </header>

    <main class="dashboard-main">
      {#if loading && devHubs.length === 0}
        <LoadingState
          message="Loading DevHubs..."
          submessage="Fetching your Salesforce organization data"
        />
      {:else if error}
        <ErrorState
          title="Failed to Load DevHubs"
          message={error}
          onretry={loadDevHubs}
        />
      {:else if devHubs.length === 0}
        <EmptyState
          title="No DevHubs Found"
          message="It looks like you haven't authorized any DevHub orgs yet."
        >
          {#snippet children()}
            <code>sf org login web --set-default-dev-hub</code>
          {/snippet}
        </EmptyState>
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

  .dashboard-main :global(.empty-state code) {
    display: block;
    margin-top: 12px;
    padding: 8px 12px;
    background: var(--vscode-textCodeBlock-background);
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
    color: var(--vscode-foreground);
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
