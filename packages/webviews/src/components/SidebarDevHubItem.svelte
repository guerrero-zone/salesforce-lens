<script lang="ts">
  import { formatDisplayName, getEditionBadge } from "../lib/parseUtils";

  import type { SidebarDevHubInfo } from "../lib/parseUtils";

  let { devHub, onclick }: { devHub: SidebarDevHubInfo; onclick: () => void } = $props();

  const editionBadge = $derived(getEditionBadge(devHub.edition));

</script>

<button class="devhub-item" {onclick}>
  <span class="devhub-icon codicon codicon-home"></span>
  <div class="devhub-info">
    <div class="devhub-name">{formatDisplayName(devHub)}</div>
    <div class="devhub-username">{devHub.username}</div>
    {#if editionBadge.text}
      <span class="edition-badge {editionBadge.class}">{editionBadge.text}</span>
    {/if}
  </div>
  <span class="chevron codicon codicon-chevron-right"></span>
</button>

<style>
  .devhub-item {
    all: unset;
    display: flex;
    align-items: center;
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--vscode-widget-border);
    transition: background-color 0.1s;
    width: 100%;
    box-sizing: border-box;
  }

  .devhub-item:hover {
    background-color: var(--vscode-list-hoverBackground);
  }

  .devhub-item:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
  }

  .devhub-icon {
    font-size: 16px;
    margin-right: 10px;
    flex-shrink: 0;
    color: var(--vscode-button-background);
  }

  .devhub-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .devhub-name {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--vscode-foreground);
  }

  .devhub-username {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--vscode-editor-font-family, monospace);
  }

  .edition-badge {
    display: inline-block;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 500;
    margin-top: 4px;
    width: fit-content;
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

  .chevron {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  .devhub-item:hover .chevron {
    transform: translateX(2px);
    color: var(--vscode-foreground);
  }
</style>

