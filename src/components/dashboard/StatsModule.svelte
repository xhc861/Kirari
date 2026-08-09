<script lang="ts">
/**
 * 展板里的写作统计。
 *
 * 只是把已有的 StatsPanel 搬进展板，本身不做任何计算 —— 数字全部在构建期由
 * utils/stats-utils.ts 算好，经 dashboard.astro 作为 props 传进来。
 *
 * 不再套一层 card-base：StatsPanel 内部每张图表已经各自是一张卡片，
 * 外面再包一层会变成卡中卡。
 */
import StatsPanel from "../stats/StatsPanel.svelte";
import type { WritingStats } from "@utils/stats-utils";

export let stats: WritingStats | null = null;
</script>

{#if stats && stats.summary.posts > 0}
  <p class="stats-lead">
    从 {stats.summary.firstDate} 写到现在，{stats.summary.spanDays} 天里攒下
    {stats.summary.posts} 篇。
  </p>
  <StatsPanel
    summary={stats.summary}
    calendar={stats.calendar}
    calendarYear={stats.calendarYear}
    months={stats.months}
    categories={stats.categories}
    tags={stats.tags}
  />
{:else}
  <p class="stats-empty">还没有文章，写第一篇之后这里就会有东西了。</p>
{/if}

<style>
  .stats-lead {
    font-size: 0.85rem;
    opacity: 0.7;
    margin: 0 0 0.85rem;
  }
  .stats-empty {
    font-size: 0.875rem;
    opacity: 0.6;
    margin: 0;
  }
</style>
