<script lang="ts">
  interface Props {
    message?: string;
    submessage?: string;
  }

  let { message = "Loading...", submessage }: Props = $props();
</script>

<div class="loading-state">
  <div class="loading-spinner"></div>
  {#if message}
    <p class="message">{message}</p>
  {/if}
  {#if submessage}
    <p class="submessage">{submessage}</p>
  {/if}
</div>

<style>
  .loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid var(--vscode-widget-border);
    border-top-color: var(--vscode-progressBar-background, var(--vscode-button-background));
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .message {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .submessage {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
  }
</style>

