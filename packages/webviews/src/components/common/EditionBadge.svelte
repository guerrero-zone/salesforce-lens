<script lang="ts">
  import { getEditionBadge } from "../../lib/parseUtils";

  interface Props {
    edition: string | undefined;
    loading?: boolean;
  }

  let { edition, loading = false }: Props = $props();

  const badge = $derived(getEditionBadge(edition));
</script>

{#if loading}
  <span class="edition-badge-skeleton"></span>
{:else if badge.text}
  <span class="edition-badge {badge.class}">{badge.text}</span>
{/if}

<style>
  .edition-badge {
    display: inline-block;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 500;
    flex-shrink: 0;
  }

  .edition-badge-skeleton {
    display: inline-block;
    width: 52px;
    height: 16px;
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

  /* Developer Edition - Blue/Cyan tones */
  :global(.badge-developer) {
    background-color: rgba(0, 120, 212, 0.15);
    color: var(--vscode-textLink-foreground, #3794ff);
    border: 1px solid rgba(0, 120, 212, 0.3);
  }

  /* Enterprise Edition - Purple/Violet tones */
  :global(.badge-enterprise) {
    background-color: rgba(136, 71, 210, 0.15);
    color: #a78bfa;
    border: 1px solid rgba(136, 71, 210, 0.3);
  }

  /* Unlimited Edition - Gold/Amber tones */
  :global(.badge-unlimited) {
    background-color: rgba(217, 164, 6, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(217, 164, 6, 0.3);
  }

  /* Professional Edition - Green tones */
  :global(.badge-professional) {
    background-color: rgba(34, 197, 94, 0.15);
    color: var(--vscode-testing-iconPassed, #22c55e);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  /* Partner Edition - Orange tones */
  :global(.badge-partner) {
    background-color: rgba(249, 115, 22, 0.15);
    color: #fb923c;
    border: 1px solid rgba(249, 115, 22, 0.3);
  }

  /* Performance Edition - Red/Rose tones */
  :global(.badge-performance) {
    background-color: rgba(244, 63, 94, 0.15);
    color: #fb7185;
    border: 1px solid rgba(244, 63, 94, 0.3);
  }

  /* Group/Team Edition - Teal tones */
  :global(.badge-group) {
    background-color: rgba(20, 184, 166, 0.15);
    color: #2dd4bf;
    border: 1px solid rgba(20, 184, 166, 0.3);
  }

  /* Default badge for unknown editions */
  :global(.badge-default) {
    background-color: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border: 1px solid var(--vscode-widget-border);
  }
</style>

