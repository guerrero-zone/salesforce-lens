<script lang="ts">
  type StatusType = "active" | "expired" | "error" | "pending" | "deleted" | "default";

  interface Props {
    status: string;
    type?: StatusType;
  }

  let { status, type }: Props = $props();

  // Auto-detect type from status if not provided
  const computedType = $derived.by(() => {
    if (type) return type;
    
    const statusLower = status.toLowerCase();
    if (statusLower === "active") return "active";
    if (statusLower === "expired") return "expired";
    if (statusLower === "error" || statusLower === "failed") return "error";
    if (statusLower === "creating" || statusLower === "pending" || statusLower === "inprogress") return "pending";
    if (statusLower === "deleted") return "deleted";
    return "default";
  });
</script>

<span class="status-pill {computedType}">{status}</span>

<style>
  .status-pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
  }

  .status-pill.active {
    background: var(--vscode-testing-iconPassed, #22c55e);
    color: white;
  }

  .status-pill.expired,
  .status-pill.error {
    background: var(--vscode-errorForeground, #f14c4c);
    color: white;
  }

  .status-pill.pending {
    background: var(--vscode-editorWarning-foreground, #cca700);
    color: black;
  }

  .status-pill.deleted {
    background: var(--vscode-descriptionForeground);
    color: white;
    opacity: 0.7;
  }

  .status-pill.default {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
  }
</style>

