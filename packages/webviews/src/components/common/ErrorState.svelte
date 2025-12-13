<script lang="ts">
  interface Props {
    title?: string;
    message: string;
    onretry?: () => void;
    retryLabel?: string;
  }

  let { 
    title = "An error occurred", 
    message, 
    onretry, 
    retryLabel = "Try Again" 
  }: Props = $props();
</script>

<div class="error-state">
  <span class="codicon codicon-warning error-icon"></span>
  <h3>{title}</h3>
  <p>{message}</p>
  {#if onretry}
    <button class="retry-button" onclick={onretry}>
      {retryLabel}
    </button>
  {/if}
</div>

<style>
  .error-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
  }

  .error-icon {
    font-size: 48px;
    margin-bottom: 12px;
    color: var(--vscode-errorForeground);
  }

  h3 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  p {
    margin: 0;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    max-width: 320px;
  }

  .retry-button {
    margin-top: 12px;
    padding: 5px 12px;
    background: var(--vscode-button-background);
    border: none;
    border-radius: 3px;
    color: var(--vscode-button-foreground);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  .retry-button:hover {
    background: var(--vscode-button-hoverBackground);
  }
</style>

