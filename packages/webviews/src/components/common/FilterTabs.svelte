<script lang="ts">
  interface Tab {
    value: string;
    label: string;
  }

  interface Props {
    tabs: Tab[];
    value: string;
    onchange: (value: string) => void;
  }

  let { tabs, value, onchange }: Props = $props();
</script>

<div class="filter-tabs">
  {#each tabs as tab}
    <button
      class="filter-tab"
      class:active={value === tab.value}
      onclick={() => onchange(tab.value)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .filter-tabs {
    display: flex;
    border: 1px solid var(--vscode-widget-border);
    border-radius: 3px;
    overflow: hidden;
  }

  .filter-tab {
    padding: 4px 10px;
    border: none;
    background: transparent;
    color: var(--vscode-foreground);
    font-size: 12px;
    cursor: pointer;
    border-right: 1px solid var(--vscode-widget-border);
  }

  .filter-tab:last-child {
    border-right: none;
  }

  .filter-tab:hover {
    background: var(--vscode-list-hoverBackground);
  }

  .filter-tab.active {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
</style>

