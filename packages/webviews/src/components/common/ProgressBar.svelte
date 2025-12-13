<script lang="ts">
  import { getProgressColor } from "../../lib/colorUtils";

  interface Props {
    value: number;
    max: number;
    loading?: boolean;
    showPercentage?: boolean;
  }

  let { value, max, loading = false, showPercentage = false }: Props = $props();

  const percentage = $derived(max > 0 ? (value / max) * 100 : 0);
  const color = $derived(getProgressColor(percentage));
</script>

<div class="progress-container">
  <div class="progress-bar">
    {#if loading}
      <div class="progress-loading"></div>
    {:else}
      <div
        class="progress-fill"
        style="width: {percentage}%; background: {color}"
      ></div>
    {/if}
  </div>
  {#if showPercentage && !loading}
    <span class="percentage">{Math.round(percentage)}%</span>
  {/if}
</div>

<style>
  .progress-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .progress-bar {
    flex: 1;
    height: 4px;
    background: var(--vscode-progressBar-background, rgba(128, 128, 128, 0.2));
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .progress-loading {
    height: 100%;
    width: 30%;
    background: var(--vscode-progressBar-background, var(--vscode-button-background));
    border-radius: 2px;
    animation: loading-slide 1s ease-in-out infinite;
  }

  @keyframes loading-slide {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
  }

  .percentage {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    min-width: 32px;
    text-align: right;
  }
</style>

