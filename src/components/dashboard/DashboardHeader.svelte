<script lang="ts">
import { onDestroy, onMount } from "svelte";

/**
 * 展板头部。
 *
 * 原来的展板一上来就是六个等权重的卡片堆叠，没有「开头」，也不认人。
 * 这里给它一个招呼：按当前时段问好、显示今天日期与走动的时钟 ——
 * 时钟每秒跳一次，是整个页面里最直白的「还活着」的信号。
 */

let now = new Date();
let timer: ReturnType<typeof setInterval> | null = null;

onMount(() => {
	timer = setInterval(() => {
		now = new Date();
	}, 1000);
});

onDestroy(() => {
	if (timer) clearInterval(timer);
});

/** 按时段问好。分段参考日常作息，而不是机械地四等分。 */
function greet(h: number): { text: string; mood: string } {
	if (h < 5) return { text: "夜深了", mood: "night" };
	if (h < 9) return { text: "早上好", mood: "dawn" };
	if (h < 12) return { text: "上午好", mood: "day" };
	if (h < 14) return { text: "中午好", mood: "day" };
	if (h < 18) return { text: "下午好", mood: "day" };
	if (h < 23) return { text: "晚上好", mood: "dusk" };
	return { text: "夜深了", mood: "night" };
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

$: greeting = greet(now.getHours());
$: dateText = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${WEEKDAYS[now.getDay()]}`;
$: hh = String(now.getHours()).padStart(2, "0");
$: mm = String(now.getMinutes()).padStart(2, "0");
$: ss = String(now.getSeconds()).padStart(2, "0");
</script>

<div class="dash-header card-base" data-mood={greeting.mood}>
  <div class="dash-header-inner">
    <div class="greet-block">
      <div class="greet">{greeting.text}</div>
      <div class="date">{dateText}</div>
    </div>

    <div class="clock" aria-label="当前时间">
      <span class="unit">{hh}</span><span class="sep">:</span><span class="unit">{mm}</span><span class="sep sec-sep">:</span><span class="unit sec">{ss}</span>
    </div>
  </div>
</div>

<style>
  .dash-header {
    padding: 1.5rem 1.75rem;
    position: relative;
    overflow: hidden;
  }

  /*
   * 随时段变化的一层极淡光晕。不同时间来看，展板顶部的色温不一样 ——
   * 这是氛围，不是装饰，所以做得很轻。
   */
  .dash-header::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.5;
    background: radial-gradient(
      120% 90% at 88% -20%,
      var(--mood-glow, oklch(0.75 0.14 var(--hue))) 0%,
      transparent 62%
    );
  }
  .dash-header[data-mood="dawn"]  { --mood-glow: oklch(0.85 0.12 70); }
  .dash-header[data-mood="day"]   { --mood-glow: oklch(0.85 0.10 230); }
  .dash-header[data-mood="dusk"]  { --mood-glow: oklch(0.78 0.13 30); }
  .dash-header[data-mood="night"] { --mood-glow: oklch(0.60 0.11 280); }

  .dash-header-inner {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .greet {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--primary);
  }

  .date {
    margin-top: 0.35rem;
    font-size: 0.9rem;
    color: rgba(0, 0, 0, 0.5);
  }
  :global(.dark) .date {
    color: rgba(255, 255, 255, 0.5);
  }

  .clock {
    display: flex;
    align-items: baseline;
    font-family: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 2rem;
    font-weight: 600;
    line-height: 1;
    color: rgba(0, 0, 0, 0.78);
  }
  :global(.dark) .clock {
    color: rgba(255, 255, 255, 0.82);
  }

  .unit.sec {
    font-size: 1.15rem;
    color: var(--primary);
  }

  .sep {
    padding: 0 0.1em;
    opacity: 0.45;
  }
  /* 秒之前的冒号跟着秒闪，指针式的呼吸感 */
  .sec-sep {
    animation: tick 1s steps(1, end) infinite;
  }
  @keyframes tick {
    0%, 55% { opacity: 0.45; }
    56%, 100% { opacity: 0.12; }
  }

  @media (prefers-reduced-motion: reduce) {
    .sec-sep { animation: none; }
  }

  @media (max-width: 640px) {
    .dash-header { padding: 1.25rem 1.25rem; }
    .greet { font-size: 1.4rem; }
    .clock { font-size: 1.6rem; }
    .unit.sec { font-size: 0.95rem; }
  }
</style>
