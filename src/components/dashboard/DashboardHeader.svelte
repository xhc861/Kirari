<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { fetchLunarToday, type LunarToday } from "./lunar";

/**
 * 展板开屏区。
 *
 * 不是一张卡片 —— 卡片会给它一个边界，而这里要的正是没有边界：问候和时钟
 * 直接铺在页面顶上，靠字号差和一条细线撑起层次。展板往下全是密集的小字，
 * 开头需要一口气把人接住。
 *
 * 农历原先长在日历模块里，那个模块又把「2026 年 8 月 9 日 · 星期日」重复了
 * 一遍。现在公历归这里、农历也归这里，日历模块整个撤掉。
 */

let now = new Date();
let timer: ReturnType<typeof setInterval> | null = null;
let lunar: LunarToday | null = null;

onMount(() => {
	timer = setInterval(() => {
		now = new Date();
	}, 1000);
	fetchLunarToday().then((v) => {
		lunar = v;
	});
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
$: dateText = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 周${WEEKDAYS[now.getDay()]}`;
$: hh = String(now.getHours()).padStart(2, "0");
$: mm = String(now.getMinutes()).padStart(2, "0");
$: ss = String(now.getSeconds()).padStart(2, "0");

/** 农历、节气、节日拼成一行，缺哪个就少哪个，不占位 */
$: lunarText = lunar
	? [lunar.lunar, lunar.jieqi, lunar.festival].filter(Boolean).join(" · ")
	: "";

/*
 * 今天过掉了多少。开屏区底下那条线既是分隔，也是进度 ——
 * 与其画一条纯装饰的横线，不如让它顺便说件事。
 */
$: dayProgress =
	((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400) *
	100;
</script>

<header class="dash-header" data-mood={greeting.mood}>
  <div class="glow" aria-hidden="true"></div>

  <div class="row">
    <h1 class="greet">{greeting.text}</h1>
    <div class="clock" aria-label="当前时间">
      <span class="unit">{hh}</span><span class="sep">:</span><span class="unit">{mm}</span><span class="sep sec-sep">:</span><span class="unit sec">{ss}</span>
    </div>
  </div>

  <div class="row meta">
    <div class="lunar" class:pending={!lunarText}>{lunarText}</div>
    <div class="date">{dateText}</div>
  </div>

  <div
    class="dayline"
    role="progressbar"
    aria-label="今天已过去"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={Math.round(dayProgress)}
  >
    <div class="dayline-fill" style={`width: ${dayProgress}%`}></div>
  </div>
</header>

<style>
  .dash-header {
    position: relative;
    padding: 0.5rem 0 0;
  }

  /*
   * 随时段变化的一层柔光。脱离了卡片之后它可以铺得更开、更淡 ——
   * 不同时间来看，展板顶部的色温不一样。是氛围，不是装饰。
   */
  .glow {
    position: absolute;
    inset: -3rem -6rem auto;
    height: 16rem;
    pointer-events: none;
    z-index: -1;
    opacity: 0.55;
    background: radial-gradient(
      60% 100% at 78% 0%,
      var(--mood-glow, oklch(0.75 0.14 var(--hue))) 0%,
      transparent 70%
    );
  }
  .dash-header[data-mood="dawn"]  { --mood-glow: oklch(0.85 0.12 70); }
  .dash-header[data-mood="day"]   { --mood-glow: oklch(0.85 0.10 230); }
  .dash-header[data-mood="dusk"]  { --mood-glow: oklch(0.78 0.13 30); }
  .dash-header[data-mood="night"] { --mood-glow: oklch(0.60 0.11 280); }

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .greet {
    font-size: clamp(2rem, 5.5vw, 3.25rem);
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.02em;
    margin: 0;
    color: var(--primary);
  }

  .clock {
    display: flex;
    align-items: baseline;
    font-family: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
    font-size: clamp(1.75rem, 4.5vw, 2.75rem);
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.03em;
    color: rgba(0, 0, 0, 0.78);
  }
  :global(.dark) .clock { color: rgba(255, 255, 255, 0.82); }

  .unit.sec {
    font-size: 0.55em;
    font-weight: 500;
    color: var(--primary);
  }

  .sep { padding: 0 0.08em; opacity: 0.4; }
  /* 秒之前的冒号跟着秒闪，指针式的呼吸感 */
  .sec-sep { animation: tick 1s steps(1, end) infinite; }
  @keyframes tick {
    0%, 55% { opacity: 0.4; }
    56%, 100% { opacity: 0.1; }
  }

  .meta {
    margin-top: 0.6rem;
    font-size: 0.9rem;
  }

  .lunar {
    font-weight: 500;
    color: rgba(0, 0, 0, 0.62);
  }
  :global(.dark) .lunar { color: rgba(255, 255, 255, 0.6); }
  /* 农历取不到就整行留空，不写「加载失败」——公历本来就够用了 */
  .lunar.pending { min-height: 1.3em; }

  .date {
    color: rgba(0, 0, 0, 0.42);
    font-variant-numeric: tabular-nums;
  }
  :global(.dark) .date { color: rgba(255, 255, 255, 0.42); }

  /* 开屏区与正文之间的分隔线，同时是今天的进度 */
  .dayline {
    margin-top: 1rem;
    height: 2px;
    border-radius: 2px;
    background: var(--line-divider);
    overflow: hidden;
  }
  .dayline-fill {
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in oklab, var(--primary) 55%, transparent) 100%
    );
    transition: width 1s linear;
  }

  @media (prefers-reduced-motion: reduce) {
    .sec-sep { animation: none; }
    .dayline-fill { transition: none; }
  }

  @media (max-width: 640px) {
    .row { gap: 0.35rem; }
    .meta { font-size: 0.8rem; }
  }
</style>
