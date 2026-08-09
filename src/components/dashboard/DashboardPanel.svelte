<script lang="ts">
import { onMount, tick } from "svelte";
import UABadge from "../UABadge.svelte";
import CalendarModule from "./CalendarModule.svelte";
import CountdownModule from "./CountdownModule.svelte";
import DashboardHeader from "./DashboardHeader.svelte";
import ExtraFeaturesModule from "./ExtraFeaturesModule.svelte";
import MicroNewsModule from "./MicroNewsModule.svelte";
import ModuleShell from "./ModuleShell.svelte";
import ScoreboardModule from "./ScoreboardModule.svelte";
import StatsModule from "./StatsModule.svelte";
import TodoModule from "./TodoModule.svelte";
import {
	type ModuleDef,
	type ModuleId,
	SECTIONS,
	type SectionId,
	loadCollapsed,
	loadSection,
	orderedModules,
	resetLayout,
	saveCollapsed,
	saveOrder,
	saveSection,
	sectionOf,
} from "./dashboard-layout";
import type { WritingStats } from "@utils/stats-utils";

/** 写作统计，构建期算好由 dashboard.astro 传入 */
export let stats: WritingStats | null = null;

interface Countdown {
	id: string;
	name: string;
	targetDate: string;
}

let countdowns: Countdown[] = [];
/** 是否已完成倒计时数据探测（没有倒计时就不占一个模块位） */
let countdownsChecked = false;
$: hasCountdowns = countdowns.length > 0;

let currentSection: SectionId = "daily";
let collapsed: Set<ModuleId> = new Set();
/** 各分区的模块顺序，切分区时按需取 */
let modulesBySection: Record<SectionId, ModuleDef[]> = {
	daily: [],
	content: [],
	tools: [],
};

$: visibleModules = (modulesBySection[currentSection] ?? []).filter(
	// 倒计时没有数据时整块不出现，别摆一个空壳
	(m) => m.id !== "countdown" || (countdownsChecked && hasCountdowns),
);

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

function selectSection(id: SectionId) {
	currentSection = id;
	saveSection(id);
}

function toggleCollapse(id: ModuleId) {
	const next = new Set(collapsed);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	collapsed = next;
	saveCollapsed(next);
}

/**
 * 上移 / 下移。
 *
 * 按**可见**列表定位、在完整列表上换位：分区里可能有被过滤掉的模块
 * （比如没有数据时的倒计时）。若直接在完整列表上按下标加减，点一下会和那个
 * 隐藏模块换位置，界面上毫无变化，看起来就是按钮坏了。
 */
function move(id: ModuleId, delta: -1 | 1) {
	const full = [...(modulesBySection[currentSection] ?? [])];
	const vis = visibleModules;
	const vFrom = vis.findIndex((m) => m.id === id);
	const vTo = vFrom + delta;
	if (vFrom < 0 || vTo < 0 || vTo >= vis.length) return;

	const a = full.findIndex((m) => m.id === vis[vFrom].id);
	const b = full.findIndex((m) => m.id === vis[vTo].id);
	if (a < 0 || b < 0) return;

	[full[a], full[b]] = [full[b], full[a]];
	modulesBySection = { ...modulesBySection, [currentSection]: full };
	saveOrder(
		currentSection,
		full.map((m) => m.id),
	);
}

/* ---------- 拖拽排序（仅指针设备；触屏用上移/下移按钮） ---------- */
let dragId: ModuleId | null = null;
let overId: ModuleId | null = null;

function onDrop() {
	if (!dragId || !overId || dragId === overId) return;
	const list = [...(modulesBySection[currentSection] ?? [])];
	const from = list.findIndex((m) => m.id === dragId);
	const to = list.findIndex((m) => m.id === overId);
	if (from < 0 || to < 0) return;
	const [moved] = list.splice(from, 1);
	list.splice(to, 0, moved);
	modulesBySection = { ...modulesBySection, [currentSection]: list };
	saveOrder(
		currentSection,
		list.map((m) => m.id),
	);
	dragId = null;
	overId = null;
}

function onReset() {
	resetLayout();
	collapsed = new Set();
	currentSection = "daily";
	reloadOrder();
}

/** 标签栏方向键切换，符合 tablist 的键盘预期 */
function onTabKey(e: KeyboardEvent) {
	const i = SECTIONS.findIndex((s) => s.id === currentSection);
	if (e.key === "ArrowRight") selectSection(SECTIONS[(i + 1) % SECTIONS.length].id);
	else if (e.key === "ArrowLeft")
		selectSection(SECTIONS[(i - 1 + SECTIONS.length) % SECTIONS.length].id);
	else return;
	e.preventDefault();
}

onMount(async () => {
	reloadOrder();
	collapsed = loadCollapsed();
	currentSection = loadSection();
	loadCountdowns();

	/*
	 * /stats/ 现在 301 到 /dashboard/#stats。统计藏在「内容」分区里，
	 * 光有锚点滚不过去 —— 先切到它所在的分区、展开它，再滚。
	 */
	const hash = location.hash.replace("#", "") as ModuleId;
	const target = hash ? sectionOf(hash) : null;
	if (target) {
		currentSection = target;
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
</script>

<div class="dashboard-container">
  <!-- 头部：时段问候 + 日期 + 走动的时钟。不参与分区，常驻顶部 -->
  <div class="dash-section" style="--enter-order: 0">
    <DashboardHeader />
  </div>

  <div class="section-bar dash-section" style="--enter-order: 1">
    <div class="tabs" role="tablist" aria-label="展板分区" on:keydown={onTabKey}>
      {#each SECTIONS as s (s.id)}
        <button
          type="button"
          role="tab"
          class="tab"
          class:active={currentSection === s.id}
          aria-selected={currentSection === s.id}
          tabindex={currentSection === s.id ? 0 : -1}
          on:click={() => selectSection(s.id)}
        >{s.name}</button>
      {/each}
    </div>

    <button type="button" class="reset-btn" on:click={onReset} title="恢复默认的分区、顺序与折叠状态">
      重置布局
    </button>
  </div>

  <div class="modules" role="tabpanel">
    {#each visibleModules as m, i (m.id)}
      <div id={m.id} class="dash-section" style={`--enter-order: ${i + 2}`}>
        <ModuleShell
          title={m.title}
          collapsed={collapsed.has(m.id)}
          isFirst={i === 0}
          isLast={i === visibleModules.length - 1}
          dropTarget={overId === m.id && dragId !== m.id}
          on:toggle={() => toggleCollapse(m.id)}
          on:move={(e) => move(m.id, e.detail)}
          on:dragstart={() => (dragId = m.id)}
          on:dragend={() => { dragId = null; overId = null; }}
          on:dragover={() => (overId = m.id)}
          on:drop={onDrop}
        >
          {#if m.id === "calendar"}
            <CalendarModule />
          {:else if m.id === "countdown"}
            <CountdownModule {countdowns} />
          {:else if m.id === "todo"}
            <TodoModule />
          {:else if m.id === "stats"}
            <StatsModule {stats} />
          {:else if m.id === "micronews"}
            <MicroNewsModule />
          {:else if m.id === "scoreboard"}
            <ScoreboardModule />
          {:else if m.id === "extras"}
            <ExtraFeaturesModule />
          {:else if m.id === "ua"}
            <UABadge />
          {/if}
        </ModuleShell>
      </div>
    {/each}
  </div>
</div>

<style>
  .dashboard-container {
    width: 100%;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /*
   * 入场编排：模块依次浮现，而不是整屏同时砸下来。
   * 每块延迟 70ms，最后一块也在半秒内到位，不会让人等。
   */
  .dash-section {
    animation: dash-enter 460ms cubic-bezier(0.22, 0.8, 0.3, 1) backwards;
    animation-delay: calc(var(--enter-order, 0) * 70ms);
  }

  @keyframes dash-enter {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: none; }
  }

  .section-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: 9999px;
    background: var(--btn-regular-bg);
  }

  .tab {
    padding: 0.35rem 1rem;
    border: none;
    border-radius: 9999px;
    background: transparent;
    color: var(--btn-content);
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease;
  }
  .tab:hover { background: var(--btn-plain-bg-hover); }
  .tab.active {
    background: var(--card-bg);
    color: var(--primary);
  }

  .reset-btn {
    margin-left: auto;
    padding: 0.3rem 0.8rem;
    border: 1px solid var(--line-divider);
    border-radius: 9999px;
    background: transparent;
    color: inherit;
    opacity: 0.55;
    font-size: 0.8rem;
    cursor: pointer;
    transition: opacity 0.15s ease, background 0.15s ease;
  }
  .reset-btn:hover { opacity: 1; background: var(--btn-plain-bg-hover); }

  .modules {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* 卡片对指针有反应：轻微抬起 + 阴影，避免整页毫无回馈 */
  .dashboard-container :global(.card-base) {
    transition: transform 0.24s ease, box-shadow 0.24s ease;
  }
  .dashboard-container :global(.card-base:hover) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.07);
  }
  :global(.dark) .dashboard-container :global(.card-base:hover) {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  }

  @media (prefers-reduced-motion: reduce) {
    .dash-section { animation: none; }
    .dashboard-container :global(.card-base),
    .dashboard-container :global(.card-base:hover) {
      transition: none;
      transform: none;
    }
    .tab, .reset-btn { transition: none; }
  }
</style>
