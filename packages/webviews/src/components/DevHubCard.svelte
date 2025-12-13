<script lang="ts">
  import { formatDisplayName } from "../lib/parseUtils";
  import { getProgressColor } from "../lib/colorUtils";
  import type { DevHubInfo } from "../lib/types";
  import { ProgressBar, StatRow, EditionBadge } from "./common";

  interface Props {
    devHub: DevHubInfo;
    onclick: () => void;
  }

  let { devHub, onclick }: Props = $props();

  // Check if limits are still loading (-1 indicates loading)
  const limitsLoading = $derived(devHub.limits.activeScratchOrgs === -1);

  // Check if edition is loading (undefined and no edition loaded yet)
  // We consider it loading if limits are also loading (they arrive together on initial load)
  const editionLoading = $derived(devHub.edition === undefined && limitsLoading);

  // Check snapshots status
  const snapshotsLoading = $derived(!devHub.snapshots || devHub.snapshots.status === "loading");
  const snapshotsAvailable = $derived(devHub.snapshots?.status === "available");
</script>

<button class="devhub-card" {onclick}>
  <div class="card-header">
    <div class="org-icon">
      <span class="codicon codicon-home"></span>
    </div>
    <div class="org-info">
      <div class="org-name-row">
        <h3 class="org-name">{formatDisplayName(devHub)}</h3>
        <EditionBadge edition={devHub.edition} loading={editionLoading} />
      </div>
      <span class="org-username">{devHub.username}</span>
      {#if devHub.aliases.length > 1}
        <div class="aliases">
          {#each devHub.aliases.slice(1) as alias}
            <span class="alias-tag">{alias}</span>
          {/each}
        </div>
      {/if}
    </div>
    <div class="chevron">
      <span class="codicon codicon-chevron-right"></span>
    </div>
  </div>

  <div class="card-stats">
    <StatRow
      icon="codicon-zap"
      label="Active Scratch Orgs"
      loading={limitsLoading}
      current={devHub.limits.activeScratchOrgs}
      max={devHub.limits.maxActiveScratchOrgs}
    />
    <ProgressBar
      value={devHub.limits.activeScratchOrgs}
      max={devHub.limits.maxActiveScratchOrgs}
      loading={limitsLoading}
    />

    <StatRow
      icon="codicon-calendar"
      label="Daily Created"
      loading={limitsLoading}
      current={devHub.limits.dailyScratchOrgs}
      max={devHub.limits.maxDailyScratchOrgs}
    />
    <ProgressBar
      value={devHub.limits.dailyScratchOrgs}
      max={devHub.limits.maxDailyScratchOrgs}
      loading={limitsLoading}
    />

    <div class="snapshots-row">
      <StatRow
        icon="codicon-package"
        label="Active Snapshots"
        loading={snapshotsLoading}
        current={devHub.snapshots?.activeCount}
        max={devHub.snapshots?.totalCount}
        showUnavailable={!snapshotsAvailable && !snapshotsLoading}
      />
    </div>
  </div>

  <div class="card-footer">
    <span class="status-badge connected">Connected</span>
    <span class="view-hint">Click to view details →</span>
  </div>
</button>

<style>
  .devhub-card {
    all: unset;
    display: block;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 6px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
  }

  .devhub-card:hover {
    border-color: var(--vscode-focusBorder);
    background: var(--vscode-list-hoverBackground);
  }

  .devhub-card:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .org-icon {
    width: 40px;
    height: 40px;
    background: var(--vscode-button-background);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .org-icon .codicon {
    font-size: 20px;
    color: var(--vscode-button-foreground);
  }

  .org-info {
    flex: 1;
    min-width: 0;
  }

  .org-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .org-name {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .org-username {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--vscode-editor-font-family, monospace);
  }

  .aliases {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }

  .alias-tag {
    display: inline-block;
    padding: 2px 6px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    font-size: 10px;
    border-radius: 3px;
    font-family: var(--vscode-editor-font-family, monospace);
  }

  .chevron {
    font-size: 16px;
    color: var(--vscode-descriptionForeground);
    transition: transform 0.15s ease;
    flex-shrink: 0;
    margin-top: 4px;
  }

  .devhub-card:hover .chevron {
    transform: translateX(2px);
    color: var(--vscode-foreground);
  }

  .card-stats {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .snapshots-row {
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px dashed var(--vscode-widget-border);
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--vscode-widget-border);
  }

  .status-badge {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .status-badge.connected {
    background: var(--vscode-testing-iconPassed, #22c55e);
    color: white;
  }

  .view-hint {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .devhub-card:hover .view-hint {
    opacity: 1;
  }
</style>
