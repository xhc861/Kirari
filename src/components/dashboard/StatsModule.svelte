<script lang="ts">
/**
 * 展板里的写作统计。
 *
 * 本身不做任何计算 —— 数字全部在构建期由 utils/stats-utils.ts 算好，
 * 经 dashboard.astro 作为 props 传进来。
 */

import type { WritingStats } from "@utils/stats-utils";
import { createEventDispatcher } from "svelte";
import StatsPanel from "../stats/StatsPanel.svelte";

export let stats: WritingStats | null = null;

const dispatch = createEventDispatcher<{ summary: string }>();

function chars(n: number): string {
	return n >= 10000 ? `${(n / 10000).toFixed(1)} 万字` : `${n} 字`;
}

/** 折叠着也知道这站写了多少 */
$: dispatch(
	"summary",
	stats && stats.summary.posts > 0
		? `${stats.summary.posts} 篇 · ${chars(stats.summary.chars)}`
		: "还没有",
);
</script>

{#if stats && stats.summary.posts > 0}
  <p class="lead">
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
  <p class="empty">还没有文章，写第一篇之后这里就会有东西了。</p>
{/if}

<style>
  .lead {
    font-size: 0.85rem;
    opacity: 0.55;
    margin: 0 0 0.85rem;
  }
  .empty {
    font-size: 0.85rem;
    opacity: 0.5;
    margin: 0;
  }
</style>
