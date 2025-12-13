<script lang="ts">
  import { formatDisplayName } from "../lib/parseUtils";
  import type { SidebarDevHubInfo } from "../lib/parseUtils";
  import { EditionBadge } from "./common";

  let { devHub, onclick }: { devHub: SidebarDevHubInfo; onclick: () => void } = $props();
</script>

<button class="devhub-item" {onclick}>
  <span class="devhub-icon codicon codicon-home"></span>
  <div class="devhub-info">
    <div class="devhub-name">{formatDisplayName(devHub)}</div>
    <div class="devhub-username">{devHub.username}</div>
    <EditionBadge edition={devHub.edition} />
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

  .devhub-info :global(.edition-badge) {
    margin-top: 4px;
    width: fit-content;
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
