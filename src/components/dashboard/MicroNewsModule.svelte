<script lang="ts">
/**
 * 微新闻。
 *
 * 两处内容上的毛病：
 *
 *   时间写死成 `2026-02-05 21:57`，看一眼不知道那是上周还是半年前，得心算；
 *   「一般」那档用 rgb(251,191,36) 的亮黄，在浅色底上几乎读不出来。
 *
 * 列表改成时间线：圆点的颜色就是优先级，不必每条都挂一个文字徽标 ——
 * 半栏宽度里，标题才是要读的东西。绝对时间收进 title 提示，需要时悬停可见。
 * 完整列表连同筛选与分页仍在模态框里，那是「翻旧账」的场景，值得占满屏。
 */

import { relativeDay } from "@utils/date-utils";
import { createEventDispatcher, onDestroy, onMount } from "svelte";

type Priority = "high" | "medium" | "low" | "doing";

interface MicroNews {
	id: string;
	title: string;
	content: string;
	time: string;
	date: string;
	sender: string;
	priority: Priority;
}

const PRIORITY_LABEL: Record<Priority, string> = {
	high: "重要",
	medium: "一般",
	low: "普通",
	doing: "正在做",
};

/** 紧凑列表里只给这两档挂文字，其余靠圆点颜色 —— 否则每行都是徽标 */
const LOUD: Priority[] = ["high", "doing"];

/**
 * 模块里最多渲染几条。
 *
 * 实际露出几条由容器宽度决定（见样式里的 @container）：单列 3 条、
 * 两列 4 条、三列 6 条。截断交给 CSS 而不是 JS —— 模块宽度会被用户在
 * 「整理」模式里随手改，JS 不该为了数几条而去监听尺寸。
 */
const PREVIEW_COUNT = 6;
/** 单列下最少露出的条数，决定「查看全部」出不出现 */
const MIN_VISIBLE = 3;

const dispatch = createEventDispatcher<{ summary: string }>();

let allNews: MicroNews[] = [];
let loaded = false;
let showModal = false;
let modalElement: HTMLDivElement;

// 筛选和分页状态
let selectedSender = "all";
let selectedPriority = "all";
let selectedDateRange = "all";
let currentPage = 1;
let itemsPerPage = 6;

$: senders = [...new Set(allNews.map((n) => n.sender))];
$: preview = allNews.slice(0, PREVIEW_COUNT);

$: filteredNews = allNews.filter((news) => {
	const senderMatch =
		selectedSender === "all" || news.sender === selectedSender;
	const priorityMatch =
		selectedPriority === "all" || news.priority === selectedPriority;

	let dateMatch = true;
	if (selectedDateRange !== "all") {
		const diffDays = Math.floor(
			(Date.now() - new Date(news.date).getTime()) / 86400000,
		);
		if (selectedDateRange === "today") dateMatch = diffDays === 0;
		else if (selectedDateRange === "week") dateMatch = diffDays <= 7;
		else if (selectedDateRange === "month") dateMatch = diffDays <= 30;
	}

	return senderMatch && priorityMatch && dateMatch;
});

$: totalPages = Math.max(1, Math.ceil(filteredNews.length / itemsPerPage));
$: paginatedNews = filteredNews.slice(
	(currentPage - 1) * itemsPerPage,
	currentPage * itemsPerPage,
);

// 筛选条件变了就回到第一页，否则会停在一个已经不存在的页码上
$: if (
	selectedSender ||
	selectedPriority ||
	selectedDateRange ||
	itemsPerPage
) {
	currentPage = 1;
}

async function loadMicroNews() {
	try {
		const response = await fetch("/micro-news.json", { cache: "no-store" });
		const data = await response.json();
		interface RawMicroNews {
			id: string;
			title: string;
			content: string;
			date: string;
			sender: string;
			time?: string;
			priority?: string;
		}
		allNews = (Array.isArray(data) ? data : [])
			.map((item: RawMicroNews) => ({
				...item,
				priority: (item.priority || "medium") as Priority,
				time: item.time || "",
			}))
			.sort((a: MicroNews, b: MicroNews) => Number(b.id) - Number(a.id));
	} catch (error) {
		console.error("[MicroNewsModule] 加载失败:", error);
		allNews = [];
	} finally {
		loaded = true;
	}
}

onMount(() => {
	if (typeof window !== "undefined") loadMicroNews();
});

$: if (loaded) {
	dispatch("summary", allNews.length ? `${allNews.length} 条` : "空着");
}

function openModal() {
	showModal = true;
}

function closeModal() {
	showModal = false;
	selectedSender = "all";
	selectedPriority = "all";
	selectedDateRange = "all";
	currentPage = 1;
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Escape" && showModal) closeModal();
}

/** 绝对时间给 title 提示用 */
function absolute(news: MicroNews): string {
	return news.time ? `${news.date} ${news.time}` : news.date;
}

function when(news: MicroNews): string {
	return relativeDay(new Date(news.date));
}

// 模态框移到 body 下并锁滚动，避免被展板的层叠上下文裁掉
$: if (showModal && modalElement) {
	document.body.appendChild(modalElement);
	document.body.style.overflow = "hidden";
} else if (!showModal && typeof document !== "undefined") {
	document.body.style.overflow = "";
}

onDestroy(() => {
	if (typeof document !== "undefined") document.body.style.overflow = "";
});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if !loaded}
  <p class="empty">读取中…</p>
{:else if allNews.length === 0}
  <p class="empty">还没有消息。在 <code>public/micro-news.json</code> 里加一条试试。</p>
{:else}
  <ol class="feed">
    {#each preview as news (news.id)}
      <li class="entry" data-priority={news.priority}>
        <span class="dot" aria-hidden="true"></span>
        <div class="entry-body">
          <div class="entry-head">
            <span class="title">{news.title}</span>
            <time class="when" title={absolute(news)}>{when(news)}</time>
          </div>
          <p class="content">{news.content}</p>
          {#if LOUD.includes(news.priority)}
            <span class="tag">{PRIORITY_LABEL[news.priority]}</span>
          {/if}
        </div>
      </li>
    {/each}
  </ol>

  {#if allNews.length > MIN_VISIBLE}
    <button type="button" class="more" on:click={openModal}>
      查看全部 {allNews.length} 条 →
    </button>
  {/if}
{/if}

<!-- 完整列表：筛选 + 分页，翻旧账的场景 -->
{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div bind:this={modalElement} class="modal-root" on:click={closeModal}>
    <div class="modal" on:click|stopPropagation>
      <div class="modal-head">
        <h2 class="modal-title">全部微新闻</h2>
        <button type="button" class="close" on:click={closeModal} title="关闭">×</button>
      </div>

      <div class="filters">
        <label class="filter">
          <span>发送者</span>
          <select bind:value={selectedSender}>
            <option value="all">全部</option>
            {#each senders as sender}<option value={sender}>{sender}</option>{/each}
          </select>
        </label>
        <label class="filter">
          <span>重要等级</span>
          <select bind:value={selectedPriority}>
            <option value="all">全部</option>
            {#each Object.entries(PRIORITY_LABEL) as [value, label]}
              <option {value}>{label}</option>
            {/each}
          </select>
        </label>
        <label class="filter">
          <span>日期范围</span>
          <select bind:value={selectedDateRange}>
            <option value="all">全部</option>
            <option value="today">今天</option>
            <option value="week">最近一周</option>
            <option value="month">最近一月</option>
          </select>
        </label>
        <label class="filter">
          <span>每页</span>
          <select bind:value={itemsPerPage}>
            <option value={6}>6 条</option>
            <option value={10}>10 条</option>
            <option value={20}>20 条</option>
          </select>
        </label>
      </div>

      <div class="modal-body">
        {#if paginatedNews.length > 0}
          <ol class="feed modal-feed">
            {#each paginatedNews as news (news.id)}
              <li class="entry" data-priority={news.priority}>
                <span class="dot" aria-hidden="true"></span>
                <div class="entry-body">
                  <div class="entry-head">
                    <span class="title">{news.title}</span>
                    <time class="when" title={absolute(news)}>{when(news)}</time>
                  </div>
                  <p class="content">{news.content}</p>
                  <div class="entry-meta">
                    <span class="tag">{PRIORITY_LABEL[news.priority]}</span>
                    <span class="sender">{news.sender}</span>
                    <span class="abs">{absolute(news)}</span>
                  </div>
                </div>
              </li>
            {/each}
          </ol>
        {:else}
          <p class="no-results">这组条件下没有消息。换个筛选试试。</p>
        {/if}
      </div>

      {#if totalPages > 1}
        <div class="pager">
          <button type="button" class="page-btn" disabled={currentPage === 1} on:click={() => currentPage--}>
            上一页
          </button>
          <span class="page-info">{currentPage} / {totalPages}</span>
          <button type="button" class="page-btn" disabled={currentPage === totalPages} on:click={() => currentPage++}>
            下一页
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .empty {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.6;
    opacity: 0.5;
  }
  .empty code {
    font-size: 0.9em;
    padding: 0.05rem 0.25rem;
    border-radius: 0.25rem;
    background: var(--btn-regular-bg);
  }

  /* ---------- 时间线 / 分列 ---------- */
  .feed {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0 1.6rem;
  }

  .entry {
    position: relative;
    display: flex;
    gap: 0.7rem;
    padding-bottom: 0.9rem;
  }

  /* 圆点之间的连线，最后一条不画 */
  .entry::before {
    content: "";
    position: absolute;
    left: 0.24rem;
    top: 0.9rem;
    bottom: 0;
    width: 1px;
    background: var(--line-divider);
  }
  .entry:last-child::before { display: none; }
  .entry:last-child { padding-bottom: 0; }

  .dot {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    margin-top: 0.4rem;
    border-radius: 50%;
    background: var(--pri, var(--sec-tint, var(--primary)));
    box-shadow: 0 0 6px var(--pri, var(--sec-tint, var(--primary)));
  }

  /*
   * 露出几条、排成几列，都由**容器**宽度决定，不看视口。
   *
   * 这一块默认是通栏头条，但用户可以在「整理」模式里把它调成三分之一栏；
   * 那时它虽然在宽屏上，自己却很窄。视口断点判断不了这件事。
   *
   * 单列 3 条 / 两列 4 条 / 三列 6 条 —— 都是整行，不留半行空位。
   */
  .entry:nth-child(n + 4) { display: none; }

  @container mod (min-width: 34rem) {
    .feed { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .entry:nth-child(4) { display: flex; }
  }
  @container mod (min-width: 52rem) {
    .feed { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .entry:nth-child(5),
    .entry:nth-child(6) { display: flex; }
  }

  /*
   * 一旦分了列，纵向连线就串错了 —— 视觉上从第一列底连到第二列顶，
   * 而它们在时间上并不相邻。改用左侧一条优先级色的竖条，各自独立。
   */
  @container mod (min-width: 34rem) {
    .entry::before { display: none; }
    .entry {
      padding: 0 0 0 0.7rem;
      margin-bottom: 0.9rem;
      border-left: 2px solid color-mix(in oklab, var(--pri, var(--primary)) 55%, transparent);
    }
    .dot { display: none; }
  }

  /*
   * 优先级配色。原来的 rgb(251,191,36) 在浅色底上对比度不足，
   * 改用 oklch 分别给亮暗两套明度，两边都读得清。
   */
  .entry[data-priority="high"]   { --pri: oklch(0.58 0.19 25); }
  .entry[data-priority="medium"] { --pri: oklch(0.62 0.13 72); }
  .entry[data-priority="low"]    { --pri: oklch(0.58 0.13 250); }
  .entry[data-priority="doing"]  { --pri: oklch(0.60 0.13 200); }
  :global(.dark) .entry[data-priority="high"]   { --pri: oklch(0.74 0.17 25); }
  :global(.dark) .entry[data-priority="medium"] { --pri: oklch(0.80 0.13 72); }
  :global(.dark) .entry[data-priority="low"]    { --pri: oklch(0.75 0.12 250); }
  :global(.dark) .entry[data-priority="doing"]  { --pri: oklch(0.78 0.12 200); }

  .entry-body { min-width: 0; flex: 1; }

  .entry-head {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  .title {
    flex: 1;
    min-width: 0;
    font-size: 0.88rem;
    font-weight: 600;
    line-height: 1.45;
  }

  /* 读数一律等宽：几条相对时间竖着排下来，字宽一致才对得齐 */
  .when {
    flex-shrink: 0;
    font-family: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    opacity: 0.42;
    white-space: nowrap;
  }

  .content {
    margin: 0.15rem 0 0;
    font-size: 0.8rem;
    line-height: 1.6;
    opacity: 0.6;
  }

  .tag {
    display: inline-block;
    margin-top: 0.35rem;
    font-size: 0.68rem;
    font-weight: 600;
    padding: 0.05rem 0.4rem;
    border-radius: 0.25rem;
    color: var(--pri, var(--sec-tint, var(--primary)));
    background: color-mix(in oklab, var(--pri, var(--sec-tint, var(--primary))) 14%, transparent);
  }

  .more {
    margin-top: 0.9rem;
    padding: 0;
    border: none;
    background: none;
    font-size: 0.8rem;
    color: var(--sec-tint, var(--primary));
    cursor: pointer;
    opacity: 0.85;
    transition: opacity 0.15s ease;
  }
  .more:hover { opacity: 1; }

  /* ---------- 模态框 ---------- */
  .modal-root {
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow-y: auto;
    animation: fade 0.2s ease-out;
  }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }

  .modal {
    width: 100%;
    max-width: 46rem;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    border-radius: 1rem;
    overflow: hidden;
    background: var(--card-bg);
    color: inherit;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
    animation: rise 0.28s cubic-bezier(0.22, 0.8, 0.3, 1);
  }
  @keyframes rise {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to   { opacity: 1; transform: none; }
  }

  .modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 1.35rem;
    border-bottom: 1px solid var(--line-divider);
  }

  .modal-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .close {
    width: 1.9rem;
    height: 1.9rem;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 50%;
    background: var(--btn-regular-bg);
    color: inherit;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.2s ease;
  }
  .close:hover {
    background: var(--btn-plain-bg-hover);
    transform: rotate(90deg);
  }

  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.75rem;
    padding: 0.9rem 1.35rem;
    border-bottom: 1px solid var(--line-divider);
  }

  .filter {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.72rem;
    opacity: 0.75;
  }

  .filter select {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--line-divider);
    border-radius: 0.4rem;
    background: transparent;
    color: inherit;
    font-size: 0.82rem;
    cursor: pointer;
  }

  .modal-body {
    padding: 1.1rem 1.35rem;
    overflow-y: auto;
    flex: 1;
  }

  .modal-feed .entry { padding-bottom: 1.1rem; }

  .entry-meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.4rem;
    font-size: 0.7rem;
    opacity: 0.5;
  }
  .entry-meta .tag { margin-top: 0; opacity: 1; }

  .no-results {
    margin: 0;
    padding: 2.5rem 0;
    text-align: center;
    font-size: 0.85rem;
    opacity: 0.5;
  }

  .pager {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.85rem 1.35rem;
    border-top: 1px solid var(--line-divider);
  }

  .page-btn {
    padding: 0.35rem 0.85rem;
    border: 1px solid var(--line-divider);
    border-radius: 9999px;
    background: transparent;
    color: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .page-btn:hover:not(:disabled) { background: var(--btn-plain-bg-hover); }
  .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .page-info {
    font-size: 0.8rem;
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 640px) {
    .filters { grid-template-columns: 1fr 1fr; padding: 0.8rem 1rem; }
    .modal-head, .modal-body, .pager { padding-left: 1rem; padding-right: 1rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .modal-root, .modal { animation: none; }
    .close, .more, .page-btn { transition: none; }
  }
</style>
