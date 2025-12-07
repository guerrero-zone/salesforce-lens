<script lang="ts">
  import type { DevHubInfo } from "./types";

  interface Props {
    devHub: DevHubInfo;
    onclick: () => void;
  }

  let { devHub, onclick }: Props = $props();

  // Check if limits are still loading (-1 indicates loading)
  const limitsLoading = $derived(devHub.limits.activeScratchOrgs === -1);

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

  function formatDisplayName(devHub: DevHubInfo): string {
    if (devHub.aliases.length > 0) {
      return devHub.aliases[0];
    }
    return devHub.username.split("@")[0];
  }

  function getOrgTypeBadge(orgType: string): { text: string; class: string } {
    switch (orgType) {
      case "Production":
        return { text: "PROD", class: "badge-production" };
      case "Sandbox":
        return { text: "SBX", class: "badge-sandbox" };
      default:
        return { text: "ORG", class: "badge-unknown" };
    }
  }

  const badge = $derived(getOrgTypeBadge(devHub.orgType));
</script>

<button class="devhub-card" {onclick}>
  <div class="card-header">
    <div class="org-icon">
      <span class="codicon codicon-home"></span>
    </div>
    <div class="org-info">
      <div class="org-name-row">
        <h3 class="org-name">{formatDisplayName(devHub)}</h3>
        <span class="org-type-badge {badge.class}">{badge.text}</span>
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
  </div>

  <div class="card-footer">
    <span class="status-badge connected">Connected</span>
    <span class="view-hint">Click to view scratch orgs →</span>
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

  .org-type-badge {
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 2px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .badge-production {
    background: var(--vscode-testing-iconPassed, #22c55e);
    color: white;
  }

  .badge-sandbox {
    background: var(--vscode-editorWarning-foreground, #cca700);
    color: black;
  }

  .badge-unknown {
    background: var(--vscode-descriptionForeground);
    color: white;
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
