<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    icon?: string;
    title: string;
    message?: string;
    children?: Snippet;
  }

  let { 
    icon = "codicon-inbox", 
    title, 
    message,
    children 
  }: Props = $props();
</script>

<div class="empty-state">
  <span class="codicon {icon} empty-icon"></span>
  <h3>{title}</h3>
  {#if message}
    <p>{message}</p>
  {/if}
  {#if children}
    <div class="children">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
    color: var(--vscode-descriptionForeground);
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

  .children {
    margin-top: 12px;
  }
</style>

