<script lang="ts">
/**
 * 展板。
 *
 * 整页一口气滚完 —— 分区退化成章节标题，模块按内容密度占不同宽度。
 * 管理动作全部收进「整理」模式：平时是一张干净的版面，要收拾的时候
 * 才让把手和按钮浮出来。
 *
 * 弹性策略分两层，各管各的：
 *
 *   视口 → 栅格列数。列数与各档跨度写成 CSS 变量（--cols / --sp-*），
 *          断点只改这几个数，不重复写 grid-column，加档位不用改三处。
 *   容器 → 模块内部。每个 .cell 是一个 container，模块内部用 @container
 *          按**自己**的宽度排版。同一个模块在通栏和三分之一栏里宽度差三倍，
 *          视口断点根本管不到这件事 —— 视口宽不等于模块宽。
 */

import type { RecentPost, WritingStats } from "@utils/stats-utils";
import { onDestroy, onMount, tick } from "svelte";
import UABadge from "../UABadge.svelte";
import CountdownModule from "./CountdownModule.svelte";
import DashboardHeader from "./DashboardHeader.svelte";
import {
	loadCollapsed,
	loadSizes,
	type ModuleDef,
	type ModuleId,
	type ModuleSize,
	orderedModules,
	resetLayout,
	SECTIONS,
	type SectionId,
	saveCollapsed,
	saveOrder,
	saveSizes,
	sectionOf,
} from "./dashboard-layout";
import ExtraFeaturesModule from "./ExtraFeaturesModule.svelte";
import MicroNewsModule from "./MicroNewsModule.svelte";
import ModuleShell from "./ModuleShell.svelte";
import OracleModule from "./OracleModule.svelte";
import RecentPostsModule from "./RecentPostsModule.svelte";
import StatsModule from "./StatsModule.svelte";
import TodoModule from "./TodoModule.svelte";

/** 写作统计与最近文章，构建期算好由 dashboard.astro 传入 */
export let stats: WritingStats | null = null;
export let recentPosts: RecentPost[] = [];

interface Countdown {
	id: string;
	name: string;
	targetDate: string;
}

let countdowns: Countdown[] = [];
/** 是否已完成倒计时数据探测（没有倒计时就不占一个模块位） */
let countdownsChecked = false;
$: hasCountdowns = countdowns.length > 0;

let editing = false;
let collapsed: Set<ModuleId> = new Set();
let sizes: Partial<Record<ModuleId, ModuleSize>> = {};
let modulesBySection: Record<SectionId, ModuleDef[]> = {
	daily: [],
	content: [],
	tools: [],
};

/**
 * 各模块上报的一句摘要，显示在标题右侧。
 *
 * 数据都在模块内部（条数、完成度、多久以前），父组件不该为了显示一个数字
 * 再请求一遍，所以走事件上报。
 */
let summaries: Partial<Record<ModuleId, string>> = {};
function setSummary(id: ModuleId, text: string) {
	if (summaries[id] === text) return;
	summaries = { ...summaries, [id]: text };
}

/*
 * 倒计时没有数据时整块不出现，别摆一个空壳。
 *
 * 判断条件必须**写在响应式语句里**，不能抽成具名函数：Svelte 是按语句中出现的
 * 标识符收集依赖的，抽走之后 countdownsChecked / hasCountdowns 就不再是这条
 * 语句的依赖，倒计时数据回来了列表也不会重算，那一块永远不出现。
 * 下面 sizes 的用法同理，所以模板里直接写 sizes[m.id]，没有包一层 sizeOf()。
 */
$: showCountdown = countdownsChecked && hasCountdowns;
$: keep = (m: ModuleDef) => m.id !== "countdown" || showCountdown;
$: visibleBySection = {
	daily: (modulesBySection.daily ?? []).filter(keep),
	content: (modulesBySection.content ?? []).filter(keep),
	tools: (modulesBySection.tools ?? []).filter(keep),
} as Record<SectionId, ModuleDef[]>;

function reloadOrder() {
	modulesBySection = {
		daily: orderedModules("daily"),
		content: orderedModules("content"),
		tools: orderedModules("tools"),
	};
}

async function loadCountdowns() {
	try {
		const response = await fetch("/countdowns.json", { cache: "no-store" });
		const data = await response.json();
		countdowns = Array.isArray(data) ? data : [];
	} catch {
		// JSON 无效、为空注释或请求失败时视为无倒计时
		countdowns = [];
	} finally {
		countdownsChecked = true;
	}
}

function toggleCollapse(id: ModuleId) {
	const next = new Set(collapsed);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	collapsed = next;
	saveCollapsed(next);
}

function setSize(id: ModuleId, size: ModuleSize) {
	sizes = { ...sizes, [id]: size };
	saveSizes(sizes);
}

/**
 * 上移 / 下移。
 *
 * 按**可见**列表定位、在完整列表上换位：章节里可能有被过滤掉的模块
 * （比如没有数据时的倒计时）。若直接在完整列表上按下标加减，点一下会和那个
 * 隐藏模块换位置，界面上毫无变化，看起来就是按钮坏了。
 */
function move(section: SectionId, id: ModuleId, delta: -1 | 1) {
	const full = [...(modulesBySection[section] ?? [])];
	const vis = visibleBySection[section] ?? [];
	const vFrom = vis.findIndex((m) => m.id === id);
	const vTo = vFrom + delta;
	if (vFrom < 0 || vTo < 0 || vTo >= vis.length) return;

	const a = full.findIndex((m) => m.id === vis[vFrom].id);
	const b = full.findIndex((m) => m.id === vis[vTo].id);
	if (a < 0 || b < 0) return;

	[full[a], full[b]] = [full[b], full[a]];
	modulesBySection = { ...modulesBySection, [section]: full };
	saveOrder(
		section,
		full.map((m) => m.id),
	);
}

/* ---------- 拖拽排序（仅指针设备；触屏用上移/下移按钮） ---------- */
let dragId: ModuleId | null = null;
let overId: ModuleId | null = null;

function onDrop(section: SectionId) {
	if (!dragId || !overId || dragId === overId) return;
	const list = [...(modulesBySection[section] ?? [])];
	const from = list.findIndex((m) => m.id === dragId);
	const to = list.findIndex((m) => m.id === overId);
	// 跨章节拖拽不处理：章节是语义分组，拖过去反而让人找不着
	if (from < 0 || to < 0) return;
	const [moved] = list.splice(from, 1);
	list.splice(to, 0, moved);
	modulesBySection = { ...modulesBySection, [section]: list };
	saveOrder(
		section,
		list.map((m) => m.id),
	);
	dragId = null;
	overId = null;
}

function onReset() {
	resetLayout();
	collapsed = new Set();
	sizes = {};
	reloadOrder();
}

/* ---------- 章节导航：滚动到哪个章节，哪个亮 ---------- */
let activeSection: SectionId = "daily";
let observer: IntersectionObserver | null = null;

function scrollToSection(id: SectionId) {
	document
		.getElementById(`chapter-${id}`)
		?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function observeChapters() {
	observer?.disconnect();
	if (typeof IntersectionObserver === "undefined") return;
	observer = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				const id = e.target.id.replace("chapter-", "") as SectionId;
				if (SECTIONS.some((s) => s.id === id)) activeSection = id;
			}
		},
		// 顶部留出粘性导航条的高度，让高亮在章节标题压到导航条时才切换
		{ rootMargin: "-30% 0px -60% 0px" },
	);
	for (const s of SECTIONS) {
		const el = document.getElementById(`chapter-${s.id}`);
		if (el) observer.observe(el);
	}
}

onMount(async () => {
	reloadOrder();
	collapsed = loadCollapsed();
	sizes = loadSizes();
	loadCountdowns();

	await tick();
	observeChapters();

	/*
	 * /stats/ 现在 301 到 /dashboard/#stats。整页平铺之后不必再切分区，
	 * 但模块可能是收起来的 —— 先展开再滚。
	 */
	const hash = location.hash.replace("#", "") as ModuleId;
	if (hash && sectionOf(hash)) {
		if (collapsed.has(hash)) {
			const next = new Set(collapsed);
			next.delete(hash);
			collapsed = next;
			saveCollapsed(next);
		}
		await tick();
		document.getElementById(hash)?.scrollIntoView({ block: "start" });
	}
});

onDestroy(() => observer?.disconnect());
</script>

<div class="dashboard" class:is-editing={editing}>
  <DashboardHeader />

  <nav class="chapters" aria-label="展板章节">
    <span class="live" aria-hidden="true"></span>

    <div class="chapter-links">
      {#each SECTIONS as s, si (s.id)}
        <button
          type="button"
          class="chapter-link"
          class:active={activeSection === s.id}
          on:click={() => scrollToSection(s.id)}
        >
          <span class="link-no">{String(si + 1).padStart(2, "0")}</span>
          <span class="link-name">{s.name}</span>
        </button>
      {/each}
    </div>

    <div class="chapter-actions">
      {#if editing}
        <button type="button" class="ghost-btn" on:click={onReset}>恢复默认</button>
      {/if}
      <button
        type="button"
        class="ghost-btn tidy"
        class:on={editing}
        aria-pressed={editing}
        on:click={() => (editing = !editing)}
      >{editing ? "完成" : "整理"}</button>
    </div>
  </nav>

  {#if editing}
    <p class="tidy-hint">
      拖动 ⠿ 或用 ↑↓ 调顺序，窄 / 半 / 通栏 调宽度，▾ 收起不常看的。改动只存在这台设备上。
    </p>
  {/if}

  {#each SECTIONS as s, si (s.id)}
    {@const list = visibleBySection[s.id] ?? []}
    {#if list.length}
      <section class="chapter" id={`chapter-${s.id}`} data-sec={s.id}>
        <div class="chapter-head">
          <span class="chapter-no" aria-hidden="true">{String(si + 1).padStart(2, "0")}</span>
          <h2 class="chapter-title">{s.name}</h2>
          <span class="chapter-hint">{s.hint}</span>
          <span class="chapter-rule" aria-hidden="true"></span>
          <span class="chapter-count" aria-hidden="true">{String(list.length).padStart(2, "0")}</span>
        </div>

        <div class="grid">
          {#each list as m, i (m.id)}
            <div
              id={m.id}
              class="cell"
              data-size={sizes[m.id] ?? m.size}
              style={`--enter-order: ${si * 3 + i}`}
            >
              <ModuleShell
                title={m.title}
                badge={summaries[m.id] ?? ""}
                collapsed={collapsed.has(m.id)}
                size={sizes[m.id] ?? m.size}
                bare={m.bare}
                {editing}
                isFirst={i === 0}
                isLast={i === list.length - 1}
                dropTarget={overId === m.id && dragId !== m.id}
                on:toggle={() => toggleCollapse(m.id)}
                on:move={(e) => move(s.id, m.id, e.detail)}
                on:resize={(e) => setSize(m.id, e.detail)}
                on:dragstart={() => (dragId = m.id)}
                on:dragend={() => { dragId = null; overId = null; }}
                on:dragover={() => (overId = m.id)}
                on:drop={() => onDrop(s.id)}
              >
                {#if m.id === "micronews"}
                  <MicroNewsModule on:summary={(e) => setSummary("micronews", e.detail)} />
                {:else if m.id === "todo"}
                  <TodoModule on:summary={(e) => setSummary("todo", e.detail)} />
                {:else if m.id === "countdown"}
                  <CountdownModule {countdowns} on:summary={(e) => setSummary("countdown", e.detail)} />
                {:else if m.id === "oracle"}
                  <OracleModule />
                {:else if m.id === "recent"}
                  <RecentPostsModule posts={recentPosts} on:summary={(e) => setSummary("recent", e.detail)} />
                {:else if m.id === "stats"}
                  <StatsModule {stats} on:summary={(e) => setSummary("stats", e.detail)} />
                {:else if m.id === "extras"}
                  <ExtraFeaturesModule />
                {:else if m.id === "ua"}
                  <UABadge />
                {/if}
              </ModuleShell>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {/each}
</div>

<style>
  /*
   * 每个章节自带一个色相（--sec-hue），从站点主题色偏移出来 ——
   * 书脊、编号、刻度线、状态点、模块强调色全部取自它，
   * 所以滚到哪一段，不看标题也认得出。
   */
  .dashboard {
    position: relative;
    width: 100%;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: clamp(1.25rem, 2.4vw, 1.9rem);
    --grid-line: color-mix(in oklab, var(--primary) 9%, transparent);
    --mono: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  :global(.dark) .dashboard {
    --grid-line: color-mix(in oklab, var(--primary) 16%, transparent);
  }

  /*
   * 底纹：细网格 + 每五格一条重线，像示波器的刻度面。
   * 顶上最清楚，往下淡到没有 —— 整页都铺就成了坐标纸，
   * 只在开头留一段，「这是一台还在跑的东西」的意思就够了。
   */
  .dashboard::before {
    content: "";
    position: absolute;
    inset: -2.5rem -2rem auto;
    height: clamp(20rem, 40vh, 34rem);
    z-index: -1;
    pointer-events: none;
    background-image:
      linear-gradient(var(--grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-line) 1px, transparent 1px),
      linear-gradient(var(--grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
    background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
    -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 12%, transparent 100%);
    mask-image: linear-gradient(180deg, #000 0%, #000 12%, transparent 100%);
  }

  /* ---------- 章节导航 ---------- */
  .chapters {
    position: sticky;
    /* 顶栏高 4.5rem，压在它下面一点 */
    top: 4.75rem;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
    padding: 0.3rem 0.7rem;
    margin: 0 -0.7rem;
    border-radius: 0.5rem;
    background: color-mix(in oklab, var(--page-bg, var(--card-bg)) 88%, transparent);
    backdrop-filter: blur(10px) saturate(1.3);
    -webkit-backdrop-filter: blur(10px) saturate(1.3);
    box-shadow: inset 0 -1px 0 color-mix(in oklab, var(--primary) 14%, transparent);
  }

  /* 呼吸的状态点 —— 这一页是活的，不是一张截图 */
  .live {
    width: 0.4rem;
    height: 0.4rem;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--primary);
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--primary) 60%, transparent);
    animation: pulse 2.4s ease-out infinite;
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 color-mix(in oklab, var(--primary) 55%, transparent); }
    70%  { box-shadow: 0 0 0 0.42rem transparent; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }

  .chapter-links { display: flex; gap: 0.1rem; }

  .chapter-link {
    position: relative;
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    padding: 0.25rem 0.65rem;
    border: none;
    background: transparent;
    color: rgba(0, 0, 0, 0.42);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.18s ease;
  }
  :global(.dark) .chapter-link { color: rgba(255, 255, 255, 0.42); }
  .chapter-link:hover { color: var(--primary); }
  .chapter-link.active { color: var(--primary); }

  .link-no {
    font-family: var(--mono);
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    opacity: 0.55;
  }
  .link-name { letter-spacing: 0.04em; }

  /* 当前项一条会发光的下划线，从左侧展开 */
  .chapter-link::after {
    content: "";
    position: absolute;
    left: 0.65rem;
    right: 0.65rem;
    bottom: 0;
    height: 2px;
    background: var(--primary);
    box-shadow: 0 0 8px color-mix(in oklab, var(--primary) 70%, transparent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.28s cubic-bezier(0.22, 0.8, 0.3, 1);
  }
  .chapter-link.active::after { transform: scaleX(1); }

  .chapter-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .ghost-btn {
    padding: 0.22rem 0.75rem;
    border: 1px solid color-mix(in oklab, var(--primary) 28%, transparent);
    border-radius: 0.35rem;
    background: transparent;
    color: inherit;
    opacity: 0.6;
    font-size: 0.76rem;
    font-family: var(--mono);
    cursor: pointer;
    transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  }
  .ghost-btn:hover {
    opacity: 1;
    background: color-mix(in oklab, var(--primary) 8%, transparent);
  }
  .ghost-btn.tidy.on {
    opacity: 1;
    border-color: transparent;
    background: var(--primary);
    color: white;
    box-shadow: 0 0 14px color-mix(in oklab, var(--primary) 45%, transparent);
  }

  .tidy-hint {
    margin: calc(-1 * clamp(1.25rem, 2.4vw, 1.9rem) + 0.5rem) 0 0;
    padding-left: 0.7rem;
    border-left: 2px solid color-mix(in oklab, var(--primary) 45%, transparent);
    font-size: 0.78rem;
    line-height: 1.65;
    opacity: 0.55;
  }

  /* ---------- 章节 ---------- */
  .chapter {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: clamp(0.9rem, 1.8vw, 1.25rem);
    scroll-margin-top: 7rem;
  }

  /*
   * 每章一个色相，从主题色偏移。数值挑的是能在同一块面板上共存的间距：
   * 差太近分不出来，差太远像三个站。
   */
  .chapter[data-sec="daily"]   { --sec-hue: var(--hue); }
  .chapter[data-sec="content"] { --sec-hue: calc(var(--hue) + 128); }
  .chapter[data-sec="tools"]   { --sec-hue: calc(var(--hue) + 236); }
  .chapter { --sec-tint: oklch(0.6 0.15 var(--sec-hue)); }
  :global(.dark) .chapter { --sec-tint: oklch(0.8 0.15 var(--sec-hue)); }

  .chapter-head {
    display: flex;
    align-items: baseline;
    gap: 0.55rem;
  }

  /* 等宽编号，像仪表上的通道号 */
  .chapter-no {
    font-family: var(--mono);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--sec-tint);
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    background: color-mix(in oklab, var(--sec-tint) 13%, transparent);
    align-self: center;
  }

  .chapter-title {
    margin: 0;
    font-size: clamp(1.05rem, 2.2vw, 1.3rem);
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.2;
    white-space: nowrap;
  }

  .chapter-hint {
    font-size: 0.76rem;
    opacity: 0.38;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 一条从章节色淡出的刻度线 */
  .chapter-rule {
    flex: 1;
    min-width: 1rem;
    height: 1px;
    align-self: center;
    background: linear-gradient(
      90deg,
      color-mix(in oklab, var(--sec-tint) 55%, transparent) 0%,
      color-mix(in oklab, var(--sec-tint) 8%, transparent) 100%
    );
  }

  .chapter-count {
    font-family: var(--mono);
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    color: var(--sec-tint);
    opacity: 0.55;
    align-self: center;
  }

  /*
   * 弹性栅格。
   *
   * 列数与三档跨度都写成变量，断点里只改这几个数 ——
   * 加一档宽度或改一次断点，不用在三条 grid-column 规则之间来回同步。
   */
  .grid {
    --cols: 6;
    --sp-narrow: 2;
    --sp-half: 3;
    --sp-full: 6;
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: clamp(1.1rem, 2.2vw, 1.9rem) clamp(1.1rem, 2.4vw, 2.1rem);
    align-items: start;
  }

  /* 中屏：四列。窄块两个并排，半栏与通栏都吃满 */
  @media (max-width: 1199px) {
    .grid { --cols: 4; --sp-narrow: 2; --sp-half: 4; --sp-full: 4; }
  }
  /* 窄屏：单列。跨度全部退化成 1，不必再逐档改写 */
  @media (max-width: 767px) {
    .grid { --cols: 1; --sp-narrow: 1; --sp-half: 1; --sp-full: 1; }
  }

  .cell {
    min-width: 0;
    /* 顶栏 + 粘性章节条约 7rem，锚点跳转（/stats/ → #stats）时别被压在下面 */
    scroll-margin-top: 7.5rem;
    /*
     * 模块内部按**自己**的宽度排版的依据。
     * 同一个模块在通栏和三分之一栏里宽度差三倍，视口断点管不到这件事。
     */
    container-type: inline-size;
    container-name: mod;
  }
  .cell[data-size="narrow"] { grid-column: span var(--sp-narrow); }
  .cell[data-size="half"]   { grid-column: span var(--sp-half); }
  .cell[data-size="full"]   { grid-column: span var(--sp-full); }

  @media (max-width: 767px) {
    .chapters { top: 4.5rem; }
    .chapter-hint { display: none; }
  }

  /*
   * 入场编排：模块依次浮现，而不是整屏同时砸下来。
   * 每块延迟 60ms，最后一块也在半秒内到位，不会让人等。
   */
  .cell {
    animation: dash-enter 440ms cubic-bezier(0.22, 0.8, 0.3, 1) backwards;
    animation-delay: calc(var(--enter-order, 0) * 60ms);
  }
  @keyframes dash-enter {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .cell { animation: none; }
    .live { animation: none; }
    .chapter-link, .chapter-link::after, .ghost-btn { transition: none; }
  }
</style>
