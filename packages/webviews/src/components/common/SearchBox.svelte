<script lang="ts">
  interface Props {
    value: string;
    placeholder?: string;
    onchange: (value: string) => void;
  }

  let { value, placeholder = "Search...", onchange }: Props = $props();

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    onchange(target.value);
  }
</script>

<div class="search-box">
  <span class="codicon codicon-search search-icon"></span>
  <input
    type="text"
    {placeholder}
    {value}
    oninput={handleInput}
  />
</div>

<style>
  .search-box {
    position: relative;
    flex: 1;
    min-width: 180px;
    max-width: 320px;
  }

  .search-icon {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: var(--vscode-input-placeholderForeground);
  }

  .search-box input {
    width: 100%;
    padding: 5px 8px 5px 28px;
    border: 1px solid var(--vscode-input-border, var(--vscode-widget-border));
    border-radius: 3px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 12px;
    font-family: inherit;
  }

  .search-box input:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
    border-color: var(--vscode-focusBorder);
  }

  .search-box input::placeholder {
    color: var(--vscode-input-placeholderForeground);
  }
</style>

