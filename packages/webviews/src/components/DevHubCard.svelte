<script lang="ts">
  import { formatDisplayName, getEditionBadge } from "../lib/parseUtils";
  
  import type { DevHubInfo } from "../lib/types";

  interface Props {
    devHub: DevHubInfo;
    onclick: () => void;
  }

  let { devHub, onclick }: Props = $props();

  // Check if limits are still loading (-1 indicates loading)
  const limitsLoading = $derived(devHub.limits.activeScratchOrgs === -1);

  // Check snapshots status
  const snapshotsLoading = $derived(!devHub.snapshots || devHub.snapshots.status === "loading");
  const snapshotsAvailable = $derived(devHub.snapshots?.status === "available");

  const activePercentage = $derived(
    devHub.limits.maxActiveScratchOrgs > 0
      ? (devHub.limits.activeScratchOrgs / devHub.limits.maxActiveScratchOrgs) *
          100
      : 0
  );

  const dailyPercentage = $derived(
    devHub.limits.maxDailyScratchOrgs > 0
      ? (devHub.limits.dailyScratchOrgs / devHub.limits.maxDailyScratchOrgs) *
          100
      : 0
  );

  function getProgressColor(percentage: number): string {
    if (percentage >= 90) return "var(--vscode-errorForeground, #f14c4c)";
    if (percentage >= 70) return "var(--vscode-editorWarning-foreground, #cca700)";
    return "var(--vscode-testing-iconPassed, #22c55e)";
  }

  const editionBadge = $derived(getEditionBadge(devHub.edition));
</script>

<button class="devhub-card" {onclick}>
  <div class="card-header">
    <div class="org-icon">
      <span class="codicon codicon-home"></span>
    </div>
    <div class="org-info">
      <div class="org-name-row">
        <h3 class="org-name">{formatDisplayName(devHub)}</h3>
        {#if editionBadge.text}
          <span class="edition-badge {editionBadge.class}">{editionBadge.text}</span>
        {/if}
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
    <div class="stat-row">
      <div class="stat-label">
        <span class="codicon codicon-zap stat-icon"></span>
        Active Scratch Orgs
      </div>
      <div class="stat-value">
        {#if limitsLoading}
          <span class="stat-loading">Loading...</span>
        {:else}
          <span class="stat-current">{devHub.limits.activeScratchOrgs}</span>
          <span class="stat-separator">/</span>
          <span class="stat-max">{devHub.limits.maxActiveScratchOrgs}</span>
        {/if}
      </div>
    </div>
    <div class="progress-bar">
      {#if limitsLoading}
        <div class="progress-loading"></div>
      {:else}
        <div
          class="progress-fill"
          style="width: {activePercentage}%; background: {getProgressColor(activePercentage)}"
        ></div>
      {/if}
    </div>

    <div class="stat-row">
      <div class="stat-label">
        <span class="codicon codicon-calendar stat-icon"></span>
        Daily Created
      </div>
      <div class="stat-value">
        {#if limitsLoading}
          <span class="stat-loading">Loading...</span>
        {:else}
          <span class="stat-current">{devHub.limits.dailyScratchOrgs}</span>
          <span class="stat-separator">/</span>
          <span class="stat-max">{devHub.limits.maxDailyScratchOrgs}</span>
        {/if}
      </div>
    </div>
    <div class="progress-bar">
      {#if limitsLoading}
        <div class="progress-loading"></div>
      {:else}
        <div
          class="progress-fill"
          style="width: {dailyPercentage}%; background: {getProgressColor(dailyPercentage)}"
        ></div>
      {/if}
    </div>

    <div class="stat-row snapshots-row">
      <div class="stat-label">
        <span class="codicon codicon-package stat-icon"></span>
        Active Snapshots
      </div>
      <div class="stat-value">
        {#if snapshotsLoading}
          <span class="stat-loading">Loading...</span>
        {:else if snapshotsAvailable}
          <span class="stat-current">{devHub.snapshots?.activeCount}</span>
          <span class="stat-separator">/</span>
          <span class="stat-max">{devHub.snapshots?.totalCount}</span>
        {:else}
          <span class="stat-unavailable">Not available</span>
        {/if}
      </div>
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

  .edition-badge {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 500;
    flex-shrink: 0;
  }

  /* Developer Edition - Blue/Cyan tones */
  .badge-developer {
    background-color: rgba(0, 120, 212, 0.15);
    color: var(--vscode-textLink-foreground, #3794ff);
    border: 1px solid rgba(0, 120, 212, 0.3);
  }

  /* Enterprise Edition - Purple/Violet tones */
  .badge-enterprise {
    background-color: rgba(136, 71, 210, 0.15);
    color: #a78bfa;
    border: 1px solid rgba(136, 71, 210, 0.3);
  }

  /* Unlimited Edition - Gold/Amber tones */
  .badge-unlimited {
    background-color: rgba(217, 164, 6, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(217, 164, 6, 0.3);
  }

  /* Professional Edition - Green tones */
  .badge-professional {
    background-color: rgba(34, 197, 94, 0.15);
    color: var(--vscode-testing-iconPassed, #22c55e);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  /* Partner Edition - Orange tones */
  .badge-partner {
    background-color: rgba(249, 115, 22, 0.15);
    color: #fb923c;
    border: 1px solid rgba(249, 115, 22, 0.3);
  }

  /* Performance Edition - Red/Rose tones */
  .badge-performance {
    background-color: rgba(244, 63, 94, 0.15);
    color: #fb7185;
    border: 1px solid rgba(244, 63, 94, 0.3);
  }

  /* Group/Team Edition - Teal tones */
  .badge-group {
    background-color: rgba(20, 184, 166, 0.15);
    color: #2dd4bf;
    border: 1px solid rgba(20, 184, 166, 0.3);
  }

  /* Default badge for unknown editions */
  .badge-default {
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border: 1px solid var(--vscode-widget-border);
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

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }

  .stat-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--vscode-descriptionForeground);
  }

  .stat-icon {
    font-size: 12px;
    opacity: 0.8;
  }

  .stat-value {
    font-weight: 500;
    display: flex;
    align-items: baseline;
    gap: 2px;
  }

  .stat-current {
    color: var(--vscode-foreground);
    font-size: 13px;
    font-weight: 600;
  }

  .stat-separator {
    color: var(--vscode-descriptionForeground);
    font-weight: 400;
  }

  .stat-max {
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
  }

  .stat-loading {
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    font-style: italic;
  }

  .stat-unavailable {
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    font-style: italic;
    opacity: 0.7;
  }

  .snapshots-row {
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px dashed var(--vscode-widget-border);
  }

  .progress-bar {
    height: 4px;
    background: var(--vscode-progressBar-background, rgba(128, 128, 128, 0.2));
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 4px;
  }

  .progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .progress-loading {
    height: 100%;
    width: 30%;
    background: var(--vscode-progressBar-background, var(--vscode-button-background));
    border-radius: 2px;
    animation: loading-slide 1s ease-in-out infinite;
  }

  @keyframes loading-slide {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
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
