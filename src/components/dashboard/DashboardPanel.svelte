<script lang="ts">
/**
 * 展板。
 *
 * 上一版是「分区标签 + 一列等大的卡片」，有三个治不好的毛病：一次只看得见三分之一；
 * 每块权重相同，时钟和成绩单一样大；每张卡顶着四个管理按钮，控件比内容还多。
 *
 * 这一版整页一口气滚完 —— 分区退化成章节标题，模块按内容密度占不同宽度，
 * 卡片边框换成「小标题 + 一条细线」。管理动作全部收进「整理」模式：
 * 平时是一张干净的版面，要收拾的时候才让把手和按钮浮出来。
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
import ScoreboardModule from "./ScoreboardModule.svelte";
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
 * 数据都在模块内部（条数、完成度、有没有公布），父组件不该为了显示一个数字
 * 再请求一遍，所以走事件上报。
 */
let summaries: Partial<Record<ModuleId, string>> = {};
function setSummary(id: ModuleId, text: string) {
	if (summaries[id] === text) return;
	summaries = { ...summaries, [id]: text };
}

/**
 * 模块自报的标题，覆盖 MODULES 里的默认值。
 *
 * 目前只有成绩单用得上 —— 它的标题写在 scoreboard.json 里，改成「中考成绩单」
 * 这类叫法应当生效。上一版把模块自带的标题一律隐藏，那个字段就哑了。
 */
let titles: Partial<Record<ModuleId, string>> = {};
function setTitle(id: ModuleId, text: string) {
	if (titles[id] === text) return;
	titles = { ...titles, [id]: text };
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
    <div class="chapter-links">
      {#each SECTIONS as s (s.id)}
        <button
          type="button"
          class="chapter-link"
          class:active={activeSection === s.id}
          on:click={() => scrollToSection(s.id)}
        >{s.name}</button>
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
          <!-- 压在标题背后的巨大编号：翻手账时先看到的就是这个页码 -->
          <span class="chapter-no" aria-hidden="true">{String(si + 1).padStart(2, "0")}</span>
          <h2 class="chapter-title">{s.name}</h2>
          <span class="chapter-hint">{s.hint}</span>
          <span class="chapter-rule" aria-hidden="true"></span>
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
                title={titles[m.id] ?? m.title}
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
                {#if m.id === "todo"}
                  <TodoModule on:summary={(e) => setSummary("todo", e.detail)} />
                {:else if m.id === "countdown"}
                  <CountdownModule {countdowns} on:summary={(e) => setSummary("countdown", e.detail)} />
                {:else if m.id === "oracle"}
                  <OracleModule />
                {:else if m.id === "recent"}
                  <RecentPostsModule posts={recentPosts} on:summary={(e) => setSummary("recent", e.detail)} />
                {:else if m.id === "micronews"}
                  <MicroNewsModule on:summary={(e) => setSummary("micronews", e.detail)} />
                {:else if m.id === "stats"}
                  <StatsModule {stats} on:summary={(e) => setSummary("stats", e.detail)} />
                {:else if m.id === "scoreboard"}
                  <ScoreboardModule
                    on:summary={(e) => setSummary("scoreboard", e.detail)}
                    on:title={(e) => setTitle("scoreboard", e.detail)}
                  />
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
   * 展板的底子是一页纸，不是一块面板。
   *
   * 每个章节自带一个色相（--sec-hue），从站点主题色偏移出来 ——
   * 书脊、编号、点线、悬停底色全部取自它，所以滚到哪一段，不看标题也认得出。
   */
  .dashboard {
    position: relative;
    width: 100%;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    --grid-line: rgba(0, 0, 0, 0.05);
  }
  :global(.dark) .dashboard { --grid-line: rgba(255, 255, 255, 0.055); }

  /*
   * 方格纸。顶上最清楚，往下淡到没有 ——
   * 整页都铺就成了坐标纸，只在开头留一点，「这是一页本子」的意思就够了。
   */
  .dashboard::before {
    content: "";
    position: absolute;
    inset: -2.5rem -2rem auto;
    height: 34rem;
    z-index: -1;
    pointer-events: none;
    background-image:
      linear-gradient(var(--grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
    background-size: 26px 26px;
    -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 18%, transparent 100%);
    mask-image: linear-gradient(180deg, #000 0%, #000 18%, transparent 100%);
  }

  /* ---------- 章节导航 ---------- */
  .chapters {
    position: sticky;
    /* 顶栏高 4.5rem，压在它下面一点 */
    top: 4.75rem;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.3rem 0.55rem;
    margin: 0 -0.55rem;
    border-radius: 0.7rem;
    background: color-mix(in oklab, var(--page-bg, var(--card-bg)) 88%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .chapter-links { display: flex; gap: 0.1rem; }

  .chapter-link {
    position: relative;
    padding: 0.25rem 0.7rem;
    border: none;
    background: transparent;
    color: rgba(0, 0, 0, 0.42);
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: color 0.18s ease;
  }
  :global(.dark) .chapter-link { color: rgba(255, 255, 255, 0.42); }
  .chapter-link:hover { color: var(--primary); }

  /* 当前章节用一条短下划线标出，不用胶囊底色 —— 纸上不该有按钮 */
  .chapter-link::after {
    content: "";
    position: absolute;
    left: 0.7rem;
    right: 0.7rem;
    bottom: 0.05rem;
    height: 2px;
    border-radius: 2px;
    background: var(--primary);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.25s cubic-bezier(0.22, 0.8, 0.3, 1);
  }
  .chapter-link.active { color: var(--primary); }
  .chapter-link.active::after { transform: scaleX(1); }

  .chapter-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .ghost-btn {
    padding: 0.22rem 0.75rem;
    border: 1px dashed var(--line-divider);
    border-radius: 9999px;
    background: transparent;
    color: inherit;
    opacity: 0.55;
    font-size: 0.76rem;
    cursor: pointer;
    transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
  .ghost-btn:hover { opacity: 1; background: var(--btn-plain-bg-hover); }
  .ghost-btn.tidy.on {
    opacity: 1;
    border-style: solid;
    border-color: transparent;
    background: var(--primary);
    color: white;
  }

  .tidy-hint {
    margin: -1rem 0 0;
    padding-left: 0.7rem;
    border-left: 2px dashed color-mix(in oklab, var(--primary) 40%, transparent);
    font-size: 0.78rem;
    line-height: 1.65;
    opacity: 0.55;
  }

  /* ---------- 章节 ---------- */
  .chapter {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    scroll-margin-top: 7rem;
  }

  /*
   * 每章一个色相，从主题色偏移。数值挑的是能在同一张纸上共存的间距：
   * 差太近分不出来，差太远像三个站。
   */
  .chapter[data-sec="daily"]   { --sec-hue: var(--hue); }
  .chapter[data-sec="content"] { --sec-hue: calc(var(--hue) + 128); }
  .chapter[data-sec="tools"]   { --sec-hue: calc(var(--hue) + 236); }
  .chapter { --sec-tint: oklch(0.56 0.11 var(--sec-hue)); }
  :global(.dark) .chapter { --sec-tint: oklch(0.78 0.11 var(--sec-hue)); }

  .chapter-head {
    position: relative;
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    padding-left: 2.4rem;
  }

  /* 巨大的页码，压在标题左后方，标题把它盖住一角 */
  .chapter-no {
    position: absolute;
    left: -0.35rem;
    top: 50%;
    transform: translateY(-52%);
    z-index: -1;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 3.6rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.05em;
    color: color-mix(in oklab, var(--sec-tint) 17%, transparent);
    user-select: none;
  }

  .chapter-title {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .chapter-hint {
    font-size: 0.78rem;
    opacity: 0.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 点线，不是实线 —— 手账上的裁切线 */
  .chapter-rule {
    flex: 1;
    min-width: 1rem;
    height: 1px;
    background-image: repeating-linear-gradient(
      90deg,
      color-mix(in oklab, var(--sec-tint) 45%, transparent) 0 3px,
      transparent 3px 7px
    );
  }

  /*
   * 六列栅格。模块按内容密度认领份额，而不是一律等宽 ——
   * 待办两行字占三分之一，成绩单那张宽表格占通栏。
   */
  .grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 2rem 2.4rem;
    align-items: start;
    padding-left: 2.4rem;
  }

  /* 顶栏 + 粘性章节条约 7rem，锚点跳转（/stats/ → #stats）时别被压在下面 */
  .cell { min-width: 0; scroll-margin-top: 7.5rem; }
  .cell[data-size="narrow"] { grid-column: span 2; }
  .cell[data-size="half"]   { grid-column: span 3; }
  .cell[data-size="full"]   { grid-column: span 6; }

  /* 中屏：窄块两个并排，其余通栏 */
  @media (max-width: 1023px) {
    .grid { gap: 1.6rem; padding-left: 1.6rem; }
    .chapter-head { padding-left: 1.6rem; }
    .cell[data-size="narrow"] { grid-column: span 3; }
    .cell[data-size="half"]   { grid-column: span 6; }
  }

  /* 窄屏：一律单列，页码缩到不抢地方 */
  @media (max-width: 640px) {
    .chapters { top: 4.5rem; }
    .chapter-head, .grid { padding-left: 0; }
    .chapter-no {
      left: auto;
      right: 0;
      top: -0.35rem;
      transform: none;
      font-size: 2.4rem;
    }
    .chapter-title { font-size: 1.1rem; }
    .chapter-hint { display: none; }
    .cell[data-size="narrow"] { grid-column: span 6; }
    .dashboard::before { inset: -2rem -1rem auto; height: 22rem; }
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
    .chapter-link, .chapter-link::after, .ghost-btn { transition: none; }
  }
</style>
