<script lang="ts">
  interface Props {
    id: string;
    label: string;
    icon?: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onchange: (value: string) => void;
  }

  let { id, label, icon, value, options, onchange }: Props = $props();

  function handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    onchange(target.value);
  }
</script>

<div class="select-filter">
  <label for={id} class="filter-label">
    {#if icon}
      <span class="codicon {icon}"></span>
    {/if}
    {label}
  </label>
  <select
    {id}
    class="filter-select"
    {value}
    onchange={handleChange}
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</div>

<style>
  .select-filter {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .filter-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
  }

  .filter-label .codicon {
    font-size: 12px;
  }

  .filter-select {
    padding: 4px 8px;
    border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
    border-radius: 3px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    min-width: 80px;
  }

  .filter-select:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
    border-color: var(--vscode-focusBorder);
  }
</style>

