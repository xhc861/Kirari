<script lang="ts">
/**
 * 倒计时。
 *
 * 原来是一排 140×140 的方块居中摆开 —— 在通栏卡片里勉强成立，挪进三分之一
 * 宽的窄栏就挤成一团。改成「大数字 + 名字」的横排：天数是这个模块唯一的
 * 主角，让它自己撑起视觉，剩下的都是注脚。
 */
import { createEventDispatcher, onDestroy, onMount } from "svelte";

interface Countdown {
	id: string;
	name: string;
	targetDate: string;
}

/** 由父组件传入；若未传入则自行加载 */
export let countdowns: Countdown[] | undefined = undefined;

const dispatch = createEventDispatcher<{ summary: string }>();

let items: Countdown[] = [];
let remainingDays: Record<string, number> = {};

async function loadCountdowns() {
	try {
		const response = await fetch("/countdowns.json", { cache: "no-store" });
		const data = await response.json();
		items = Array.isArray(data) ? data : [];
		calculateRemainingDays();
	} catch (error) {
		console.error("[CountdownModule] 加载失败:", error);
		items = [];
	}
}

function calculateRemainingDays() {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const next: Record<string, number> = {};
	for (const countdown of items) {
		const target = new Date(countdown.targetDate);
		target.setHours(0, 0, 0, 0);
		next[countdown.id] = Math.ceil(
			(target.getTime() - today.getTime()) / 86400000,
		);
	}
	remainingDays = next;
}

$: if (countdowns !== undefined) {
	items = countdowns;
	calculateRemainingDays();
}

/** 未到的按最近优先排，已过的沉到底部 */
$: ordered = [...items].sort((a, b) => {
	const da = remainingDays[a.id] ?? 0;
	const db = remainingDays[b.id] ?? 0;
	if (da >= 0 && db < 0) return -1;
	if (da < 0 && db >= 0) return 1;
	return da >= 0 ? da - db : db - da;
});

/** 摘要取最近的那一个，折叠着也知道下一件事还有多久 */
$: {
	const upcoming = ordered.find((c) => (remainingDays[c.id] ?? -1) >= 0);
	const d = upcoming ? remainingDays[upcoming.id] : undefined;
	dispatch(
		"summary",
		d === undefined ? "" : d === 0 ? "就是今天" : `最近 ${d} 天`,
	);
}

let midnightTimer: ReturnType<typeof setTimeout> | null = null;
let dailyTimer: ReturnType<typeof setInterval> | null = null;

onMount(() => {
	if (typeof window === "undefined") return;
	if (countdowns === undefined) loadCountdowns();

	/*
	 * 跨零点要重算，否则页面开着过夜，天数会一直停在昨天。
	 * 先睡到下一个零点，之后每 24 小时一次。
	 */
	const now = new Date();
	const tomorrow = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + 1,
	);
	midnightTimer = setTimeout(() => {
		calculateRemainingDays();
		dailyTimer = setInterval(calculateRemainingDays, 86400000);
	}, tomorrow.getTime() - now.getTime());
});

onDestroy(() => {
	if (midnightTimer) clearTimeout(midnightTimer);
	if (dailyTimer) clearInterval(dailyTimer);
});
</script>

{#if ordered.length}
  <ul class="list">
    {#each ordered as c (c.id)}
      {@const days = remainingDays[c.id] ?? 0}
      <li class="item" class:today={days === 0} class:past={days < 0}>
        <div class="num">
          <span class="n">{Math.abs(days)}</span>
          <span class="u">{days === 0 ? "今天" : days > 0 ? "天" : "天前"}</span>
        </div>
        <div class="what">
          <div class="name">{c.name}</div>
          <div class="date">{c.targetDate}</div>
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .item {
    display: flex;
    align-items: baseline;
    gap: 0.7rem;
  }

  .num {
    flex-shrink: 0;
    display: flex;
    align-items: baseline;
    gap: 0.15rem;
    font-variant-numeric: tabular-nums;
    color: var(--sec-tint, var(--primary));
  }
  /* 衬线的数字比无衬线暖，倒计时看的就是这一个数 */
  .n {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 2.1rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .u {
    font-size: 0.72rem;
    opacity: 0.7;
  }
  /* 今天没有数字可言，把「今天」两个字顶上去当主角 */
  .item.today .n { display: none; }
  .item.today .u { font-size: 1.35rem; font-weight: 700; opacity: 1; }
  .item.today .num { color: oklch(0.62 0.15 150); }
  :global(.dark) .item.today .num { color: oklch(0.78 0.15 150); }

  .item.past .num { color: inherit; opacity: 0.35; }

  .what { min-width: 0; }

  .name {
    font-size: 0.88rem;
    font-weight: 500;
    line-height: 1.35;
  }
  .item.past .name { opacity: 0.5; }

  .date {
    font-size: 0.72rem;
    opacity: 0.4;
    font-variant-numeric: tabular-nums;
  }
</style>
