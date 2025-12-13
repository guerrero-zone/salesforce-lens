<script lang="ts">
  interface Props {
    icon: string;
    label: string;
    loading?: boolean;
    loadingText?: string;
    current?: number | string;
    max?: number | string;
    unavailableText?: string;
    showUnavailable?: boolean;
  }

  let { 
    icon, 
    label, 
    loading = false, 
    loadingText = "Loading...",
    current, 
    max,
    unavailableText = "Not available",
    showUnavailable = false
  }: Props = $props();
</script>

<div class="stat-row">
  <div class="stat-label">
    <span class="codicon {icon} stat-icon"></span>
    {label}
  </div>
  <div class="stat-value">
    {#if loading}
      <span class="stat-skeleton"></span>
    {:else if showUnavailable}
      <span class="stat-unavailable">{unavailableText}</span>
    {:else}
      <span class="stat-current">{current}</span>
      {#if max !== undefined}
        <span class="stat-separator">/</span>
        <span class="stat-max">{max}</span>
      {/if}
    {/if}
  </div>
</div>

<style>
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

  .stat-skeleton {
    display: inline-block;
    width: 48px;
    height: 14px;
    background: linear-gradient(
      90deg,
      var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.15)) 0%,
      var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.15)) 25%,
      var(--vscode-editor-selectionBackground, rgba(128, 128, 128, 0.25)) 50%,
      var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.15)) 75%,
      var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.15)) 100%
    );
    background-size: 200% 100%;
    border-radius: 3px;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .stat-unavailable {
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    font-style: italic;
    opacity: 0.7;
  }
</style>

