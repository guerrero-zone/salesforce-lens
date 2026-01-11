<script lang="ts">
  import type { DevHubInfo, ScratchOrgInfo, SnapshotInfo } from "../lib/types";
  import { postMessage } from "../lib/vscode";
  import ScratchOrgContent from "./ScratchOrgContent.svelte";
  import SnapshotList from "./SnapshotList.svelte";

  interface Props {
    devHub: DevHubInfo;
    onback: () => void;
  }

  let { devHub, onback }: Props = $props();

  type TabType = "scratchOrgs" | "snapshots";
  let activeTab = $state<TabType>("scratchOrgs");

  // Scratch orgs state
  let scratchOrgs = $state<ScratchOrgInfo[]>([]);
  let scratchOrgsLoading = $state(true);
  let scratchOrgsError = $state<string | null>(null);

  // Snapshots state
  let snapshots = $state<SnapshotInfo[]>([]);
  let snapshotsLoading = $state(true);
  let snapshotsError = $state<string | null>(null);
  let snapshotsUnavailable = $state(false);

  // Track the current devHub username to detect changes
  let currentDevHubUsername = $state("");

  // Derive snapshot availability from devHub prop (initial state from card)
  const snapshotsTabDisabled = $derived.by(() => {
    return devHub.snapshots?.status === "unavailable" || snapshotsUnavailable;
  });

  // Active scratch orgs count
  const activeScratchOrgsCount = $derived(scratchOrgs.length);

  // Overall loading state - only considers scratch orgs if snapshots are unavailable
  const isLoading = $derived(
    scratchOrgsLoading || (!snapshotsTabDisabled && snapshotsLoading)
  );

  function loadScratchOrgs() {
    scratchOrgsLoading = true;
    scratchOrgsError = null;
    postMessage({
      command: "getScratchOrgs",
      devHubUsername: devHub.username,
    });
  }

  function loadSnapshots() {
    // Only load if snapshots are potentially available
    if (devHub.snapshots?.status === "unavailable") {
      snapshotsLoading = false;
      snapshotsUnavailable = true;
      return;
    }
    snapshotsLoading = true;
    snapshotsError = null;
    postMessage({
      command: "getSnapshots",
      devHubUsername: devHub.username,
    });
  }

  function loadAllData() {
    loadScratchOrgs();
    loadSnapshots();
  }

  function refreshData() {
    loadAllData();
  }

  function switchTab(tab: TabType) {
    if (tab === "snapshots" && snapshotsTabDisabled) return;
    activeTab = tab;
  }

  // Listen for messages from extension
  $effect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case "scratchOrgsLoading":
          if (message.devHubUsername === devHub.username) {
            scratchOrgsLoading = true;
            scratchOrgsError = null;
          }
          break;

        case "scratchOrgsData":
          if (message.devHubUsername === devHub.username) {
            scratchOrgs = message.scratchOrgs;
            scratchOrgsLoading = false;
          }
          break;

        case "scratchOrgsError":
          if (message.devHubUsername === devHub.username) {
            scratchOrgsError = message.error;
            scratchOrgsLoading = false;
          }
          break;

        case "snapshotsLoading":
          if (message.devHubUsername === devHub.username) {
            snapshotsLoading = true;
            snapshotsError = null;
          }
          break;

        case "snapshotsData":
          if (message.devHubUsername === devHub.username) {
            snapshots = message.snapshots;
            snapshotsLoading = false;
            snapshotsUnavailable = message.status === "unavailable";
          }
          break;

        case "snapshotsError":
          if (message.devHubUsername === devHub.username) {
            snapshotsError = message.error;
            snapshotsLoading = false;
          }
          break;

        case "deleteCompleted":
          // Remove deleted orgs from the list
          const deletedIds = new Set(message.success);
          scratchOrgs = scratchOrgs.filter(
            (org) => !deletedIds.has(org.id)
          );
          break;

        case "snapshotsDeleteCompleted": {
          const deletedSnapshotIds = new Set(message.success);
          snapshots = snapshots.filter(
            (snapshot) => !deletedSnapshotIds.has(snapshot.id)
          );
          break;
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  });

  // Load data on mount and when devHub changes
  $effect(() => {
    // Access devHub.username to track it
    const newUsername = devHub.username;
    
    if (newUsername !== currentDevHubUsername) {
      // DevHub changed or first mount - reset state and reload
      if (currentDevHubUsername !== "") {
        // Only reset if this isn't the first mount
        scratchOrgs = [];
        snapshots = [];
        scratchOrgsError = null;
        snapshotsError = null;
        snapshotsUnavailable = false;
        activeTab = "scratchOrgs";
      }
      scratchOrgsLoading = true;
      snapshotsLoading = true;
      currentDevHubUsername = newUsername;
      // Load both scratch orgs and snapshots
      loadAllData();
    }
  });

  function getDevHubDisplayName(): string {
    if (devHub.aliases.length > 0) {
      return devHub.aliases[0];
    }
    return devHub.username;
  }
</script>

<div class="devhub-detail">
  <header class="detail-header">
    <button class="back-button" onclick={onback} title="Back to Dashboard">
      <span class="codicon codicon-arrow-left"></span>
      Back
    </button>

    <div class="header-info">
      <h2>{getDevHubDisplayName()}</h2>
      <span class="subtitle">{devHub.username}</span>
    </div>

    <button 
      class="refresh-button" 
      onclick={refreshData} 
      disabled={isLoading} 
      title="Refresh"
    >
      <span class="codicon codicon-refresh" class:spinning={isLoading}></span>
      Refresh
    </button>
  </header>

  <div class="tabs-container">
    <div class="tabs">
      <button
        class="tab"
        class:active={activeTab === "scratchOrgs"}
        onclick={() => switchTab("scratchOrgs")}
      >
        <span class="codicon codicon-zap"></span>
        Scratch Orgs
        {#if !scratchOrgsLoading}
          <span class="tab-count">({activeScratchOrgsCount})</span>
        {/if}
      </button>
      <button
        class="tab"
        class:active={activeTab === "snapshots"}
        class:disabled={snapshotsTabDisabled}
        onclick={() => switchTab("snapshots")}
        disabled={snapshotsTabDisabled}
        title={snapshotsTabDisabled ? "Snapshots not available for this DevHub" : ""}
      >
        <span class="codicon codicon-package"></span>
        Snapshots
        {#if !snapshotsTabDisabled && !snapshotsLoading}
          <span class="tab-count">({snapshots.length})</span>
        {/if}
      </button>
    </div>
  </div>

  <div class="tab-content">
    {#if activeTab === "scratchOrgs"}
      <div class="scratch-orgs-content">
        <ScratchOrgContent
          {scratchOrgs}
          loading={scratchOrgsLoading}
          error={scratchOrgsError}
          devHubUsername={devHub.username}
          onretry={loadScratchOrgs}
        />
      </div>
    {:else}
      <div class="snapshots-content">
        <SnapshotList
          {snapshots}
          loading={snapshotsLoading}
          error={snapshotsError}
          unavailable={snapshotsUnavailable}
          devHubUsername={devHub.username}
        />
      </div>
    {/if}
  </div>
</div>

<style>
  .devhub-detail {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--vscode-editor-background);
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--vscode-widget-border);
    background: var(--vscode-editor-background);
  }

  .back-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid var(--vscode-button-secondaryBackground, var(--vscode-widget-border));
    border-radius: 3px;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 12px;
    transition: background 0.1s;
  }

  .back-button:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .back-button .codicon {
    font-size: 14px;
  }

  .header-info {
    flex: 1;
  }

  .header-info h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .header-info .subtitle {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace);
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
    cursor: pointer;
    font-size: 12px;
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

  .tabs-container {
    padding: 0 16px;
    background: var(--vscode-sideBar-background);
    border-bottom: 1px solid var(--vscode-widget-border);
  }

  .tabs {
    display: flex;
    gap: 0;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.1s;
  }

  .tab:hover:not(.disabled) {
    color: var(--vscode-foreground);
    background: var(--vscode-list-hoverBackground);
  }

  .tab.active {
    color: var(--vscode-foreground);
    border-bottom-color: var(--vscode-button-background);
  }

  .tab.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tab .codicon {
    font-size: 14px;
  }

  .tab-count {
    font-size: 11px;
    opacity: 0.8;
  }

  .tab-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .scratch-orgs-content,
  .snapshots-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 0 16px;
  }
</style>
