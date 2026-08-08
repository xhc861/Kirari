<script lang="ts">
import { onMount, onDestroy } from "svelte";

interface MicroNews {
	id: string;
	title: string;
	content: string;
	time: string;
	date: string;
	sender: string;
	priority: "high" | "medium" | "low" | "doing";
}

let allNews: MicroNews[] = [];
let displayNews: MicroNews[] = [];
let showModal = false;
let modalElement: HTMLDivElement;

// 筛选和分页状态
let selectedSender = "all";
let selectedPriority = "all";
let selectedDateRange = "all";
let currentPage = 1;
let itemsPerPage = 6;

// 获取唯一的发送者列表
$: senders = ["all", ...new Set(allNews.map((n) => n.sender))];

// 筛选后的新闻
$: filteredNews = allNews.filter((news) => {
	const senderMatch =
		selectedSender === "all" || news.sender === selectedSender;
	const priorityMatch =
		selectedPriority === "all" || news.priority === selectedPriority;

	let dateMatch = true;
	if (selectedDateRange !== "all") {
		const newsDate = new Date(news.date);
		const today = new Date();
		const diffDays = Math.floor(
			(today.getTime() - newsDate.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (selectedDateRange === "today") dateMatch = diffDays === 0;
		else if (selectedDateRange === "week") dateMatch = diffDays <= 7;
		else if (selectedDateRange === "month") dateMatch = diffDays <= 30;
	}

	return senderMatch && priorityMatch && dateMatch;
});

// 分页计算
$: totalPages = Math.ceil(filteredNews.length / itemsPerPage);
$: paginatedNews = filteredNews.slice(
	(currentPage - 1) * itemsPerPage,
	currentPage * itemsPerPage,
);

// 重置页码当筛选条件改变
$: if (selectedSender || selectedPriority || selectedDateRange) {
	currentPage = 1;
}

// 从 JSON 文件动态加载微新闻数据
async function loadMicroNews() {
	try {
		const response = await fetch("/micro-news.json", { cache: "no-store" });
		const data = await response.json();
		// 按 ID 倒序排列（最新的在前面），并添加默认值
		interface RawMicroNews {
			id: string;
			title: string;
			content: string;
			date: string;
			sender: string;
			time?: string;
			priority?: string;
		}
		allNews = data
			.map((item: RawMicroNews) => ({
				...item,
				priority: item.priority || "medium",
				time: item.time || "",
			}))
			.sort((a: MicroNews, b: MicroNews) => Number(b.id) - Number(a.id));
		displayNews = allNews.slice(0, 3);
	} catch (error) {
		console.error("[MicroNewsModule] 加载失败:", error);
		allNews = [];
		displayNews = [];
	}
}

onMount(() => {
	// 确保在客户端执行
	if (typeof window !== "undefined") {
		loadMicroNews();
	} else {
	}
});

function openModal() {
	showModal = true;
}

function closeModal() {
	showModal = false;
	// 重置筛选条件
	selectedSender = "all";
	selectedPriority = "all";
	selectedDateRange = "all";
	currentPage = 1;
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Escape" && showModal) {
		closeModal();
	}
}

function getPriorityLabel(
	priority: "high" | "medium" | "low" | "doing",
): string {
	const labels: Record<"high" | "medium" | "low" | "doing", string> = {
		high: "重要",
		medium: "一般",
		low: "普通",
		doing: "正在做",
	};
	return labels[priority];
}

function getPriorityClass(priority: string): string {
	return `priority-${priority}`;
}

function formatDateTime(dateStr: string, timeStr?: string): string {
	// 如果有时间，返回完整的日期时间
	if (timeStr) {
		return `${dateStr} ${timeStr}`;
	}
	// 只有日期
	return dateStr;
}

// 当模态框显示时，将其移动到 body 并锁定滚动
$: if (showModal && modalElement) {
	document.body.appendChild(modalElement);
	document.body.style.overflow = "hidden";
} else if (!showModal && typeof document !== "undefined") {
	document.body.style.overflow = "";
}

onDestroy(() => {
	if (typeof document !== "undefined") {
		document.body.style.overflow = "";
	}
});
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="micro-news-module card-base">
  <h3 class="module-title">Micro News ({allNews.length})</h3>
  <div class="news-list">
    {#each displayNews as news (news.id)}
      <div class="news-item">
        <div class="news-header">
          <div class="news-title">{news.title}</div>
          <span class="priority-badge {getPriorityClass(news.priority)}">
            {getPriorityLabel(news.priority)}
          </span>
        </div>
        <div class="news-content">{news.content}</div>
        <div class="news-meta">
          <span class="news-time">{formatDateTime(news.date, news.time)}</span>
          <span class="news-sender">{news.sender}</span>
        </div>
      </div>
    {/each}
  </div>
  <div class="view-more">
    <button type="button" class="view-more-link" on:click={openModal}>查看更多 →</button>
  </div>
</div>

<!-- 全局模态框 -->
{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    bind:this={modalElement}
    class="modal-root"
    on:click={closeModal}
  >
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2 class="modal-title">所有微新闻</h2>
        <button type="button" class="close-btn" on:click={closeModal} title="关闭">×</button>
      </div>
      
      <!-- 筛选器 -->
      <div class="filters">
        <div class="filter-group">
          <label for="sender-filter">发送者：</label>
          <select id="sender-filter" bind:value={selectedSender}>
            <option value="all">全部</option>
            {#each senders.filter(s => s !== 'all') as sender}
              <option value={sender}>{sender}</option>
            {/each}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="priority-filter">重要等级：</label>
          <select id="priority-filter" bind:value={selectedPriority}>
            <option value="all">全部</option>
            <option value="high">重要</option>
            <option value="medium">一般</option>
            <option value="low">普通</option>
            <option value="doing">正在做</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="date-filter">日期范围：</label>
          <select id="date-filter" bind:value={selectedDateRange}>
            <option value="all">全部</option>
            <option value="today">今天</option>
            <option value="week">最近一周</option>
            <option value="month">最近一月</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="items-per-page">每页显示：</label>
          <select id="items-per-page" bind:value={itemsPerPage}>
            <option value={6}>6条</option>
            <option value={10}>10条</option>
            <option value={20}>20条</option>
          </select>
        </div>
      </div>
      
      <div class="modal-body">
        {#if paginatedNews.length > 0}
          {#each paginatedNews as news (news.id)}
            <div class="news-item modal-news-item">
              <div class="news-header">
                <div class="news-title">{news.title}</div>
                <span class="priority-badge {getPriorityClass(news.priority)}">
                  {getPriorityLabel(news.priority)}
                </span>
              </div>
              <div class="news-content">{news.content}</div>
              <div class="news-meta">
                <span class="news-time">{formatDateTime(news.date, news.time)}</span>
                <span class="news-sender">{news.sender}</span>
              </div>
            </div>
          {/each}
        {:else}
          <div class="no-results">没有找到符合条件的新闻</div>
        {/if}
      </div>
      
      <!-- 分页器 -->
      {#if totalPages > 1}
        <div class="pagination">
          <button 
            type="button"
            class="page-btn" 
            disabled={currentPage === 1}
            on:click={() => currentPage = 1}
          >
            首页
          </button>
          <button 
            type="button"
            class="page-btn" 
            disabled={currentPage === 1}
            on:click={() => currentPage--}
          >
            上一页
          </button>
          
          <div class="page-numbers">
            {#each Array(totalPages) as _, i}
              {#if i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)}
                <button 
                  type="button"
                  class="page-number" 
                  class:active={currentPage === i + 1}
                  on:click={() => currentPage = i + 1}
                >
                  {i + 1}
                </button>
              {:else if i + 1 === currentPage - 2 || i + 1 === currentPage + 2}
                <span class="page-ellipsis">...</span>
              {/if}
            {/each}
          </div>
          
          <button 
            type="button"
            class="page-btn" 
            disabled={currentPage === totalPages}
            on:click={() => currentPage++}
          >
            下一页
          </button>
          <button 
            type="button"
            class="page-btn" 
            disabled={currentPage === totalPages}
            on:click={() => currentPage = totalPages}
          >
            末页
          </button>
          
          <span class="page-info">第 {currentPage} / {totalPages} 页</span>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .micro-news-module {
    padding: 1.5rem;
    border-radius: var(--radius-large);
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .module-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--primary);
  }

  :global(.dark) .module-title {
    color: oklch(0.75 0.14 var(--hue));
  }

  .news-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
  }

  .news-item {
    padding: 0.75rem;
    background: var(--card-bg);
    border-radius: 0.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .news-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .news-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .news-title {
    font-weight: 500;
    flex: 1;
  }

  :global(.dark) .news-title {
    color: rgba(255, 255, 255, 0.9);
  }

  .priority-badge {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 500;
    white-space: nowrap;
  }

  .priority-high {
    background: rgba(239, 68, 68, 0.15);
    color: rgb(239, 68, 68);
  }

  .priority-medium {
    background: rgba(251, 191, 36, 0.15);
    color: rgb(251, 191, 36);
  }

  .priority-low {
    background: rgba(59, 130, 246, 0.15);
    color: rgb(59, 130, 246);
  }

  .priority-doing {
    background: rgba(14, 165, 233, 0.15);
    color: rgb(14, 165, 233);
  }

  .news-content {
    font-size: 0.875rem;
    opacity: 0.7;
    margin-bottom: 0.5rem;
  }

  :global(.dark) .news-content {
    color: rgba(255, 255, 255, 0.8);
  }

  .news-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    opacity: 0.6;
  }

  :global(.dark) .news-meta {
    color: rgba(255, 255, 255, 0.7);
  }

  .view-more {
    margin-top: 1rem;
    text-align: right;
  }

  .view-more-link {
    font-size: 0.875rem;
    color: var(--primary);
    background: none;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s;
    padding: 0;
  }

  .view-more-link:hover {
    opacity: 0.7;
  }

  /* 全屏模态框样式 */
  .modal-root {
    /* 完全脱离文档流 */
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 999999 !important;
    
    /* 背景和模糊 */
    background: rgba(0, 0, 0, 0.6) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    
    /* 居中布局 */
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 1rem !important;
    
    /* 动画 */
    animation: fadeIn 0.2s ease-out !important;
    
    /* 滚动 */
    overflow-y: auto !important;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    background: white;
    border-radius: 1rem;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
    animation: slideUp 0.3s ease-out;
    overflow: hidden;
    position: relative;
  }

  :global(.dark) .modal-content {
    background: oklch(0.23 0.01 var(--hue));
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-header {
    background: linear-gradient(135deg, var(--primary) 0%, oklch(0.65 0.14 calc(var(--hue) + 20)) 100%);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    color: white;
  }

  .modal-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    line-height: 1;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
  }

  /* 筛选器样式 */
  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.02);
  }

  :global(.dark) .filters {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-group label {
    font-size: 0.75rem;
    opacity: 0.7;
    font-weight: 500;
  }

  :global(.dark) .filter-group label {
    color: rgba(255, 255, 255, 0.8);
  }

  .filter-group select {
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: white;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    background-size: 12px;
  }

  :global(.dark) .filter-group select {
    background-color: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .filter-group select:hover {
    border-color: var(--primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .filter-group select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 88, 88, 88), 0.1);
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
  }

  /* 模态框滚动条样式 */
  .modal-body::-webkit-scrollbar {
    width: 8px;
  }

  .modal-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .modal-body::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    transition: background 0.2s;
  }

  .modal-body::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  :global(.dark) .modal-body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }

  :global(.dark) .modal-body::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .modal-news-item {
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .modal-news-item {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .no-results {
    text-align: center;
    padding: 3rem 1rem;
    opacity: 0.5;
    font-size: 0.875rem;
  }

  :global(.dark) .no-results {
    color: rgba(255, 255, 255, 0.8);
  }

  /* 分页器样式 */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    flex-wrap: wrap;
    background: rgba(0, 0, 0, 0.02);
  }

  :global(.dark) .pagination {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
  }

  .page-btn,
  .page-number {
    padding: 0.5rem 0.75rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: white;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  :global(.dark) .page-btn,
  :global(.dark) .page-number {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  .page-btn:hover:not(:disabled),
  .page-number:hover {
    background: rgba(0, 0, 0, 0.05);
    border-color: var(--primary);
  }

  :global(.dark) .page-btn:hover:not(:disabled),
  :global(.dark) .page-number:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .page-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .page-number.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }

  .page-numbers {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }

  .page-ellipsis {
    padding: 0 0.25rem;
    opacity: 0.5;
  }

  .page-info {
    font-size: 0.875rem;
    opacity: 0.7;
    margin-left: 0.5rem;
  }

  :global(.dark) .page-info {
    color: rgba(255, 255, 255, 0.8);
  }

  @media (max-width: 768px) {
    .modal-content {
      max-height: 90vh;
      max-width: 100%;
    }

    .modal-header {
      padding: 1rem;
    }

    .modal-title {
      font-size: 1.25rem;
    }

    .filters {
      grid-template-columns: 1fr;
      padding: 1rem;
    }

    .modal-body {
      padding: 1rem;
    }

    .pagination {
      padding: 1rem;
      font-size: 0.75rem;
    }

    .page-btn,
    .page-number {
      padding: 0.4rem 0.6rem;
      font-size: 0.75rem;
    }

    .page-info {
      width: 100%;
      text-align: center;
      margin-top: 0.5rem;
    }
  }
</style>
