<script lang="ts">
import { onDestroy } from "svelte";
import type { ComponentType } from "svelte";

export let slug: string;
export let title: string;
export let published: Date;
export let words: number;
export let minutes: number;

let showShareModal = false;

/*
 * ShareModal 依赖 qrcode 与 jsbarcode 两个库，静态引入会让它们进入每篇文章的
 * 首屏包（实测 PostActions 产物 94 KB）。分享弹窗默认是关着的，所以改成
 * 点击时才动态加载。
 */
let ShareModal: ComponentType | null = null;
let shareLoading = false;

// 激光笔功能
let laserPointerEnabled = false;
let laserElement: HTMLDivElement | null = null;

// 聚光灯功能
let spotlightEnabled = false;

/*
 * 收藏。
 *
 * 浏览器没有任何 API 能让网页把自己加进书签 —— window.external.AddFavorite（IE）
 * 与 window.sidebar.addPanel（旧 Firefox）都已移除。所以「直接添加」做不到。
 *
 * 原实现弹一个 alert 让用户自己按 Ctrl+D：既打断操作，又等于把按钮的责任推回去。
 * 改成做一件真事 —— 复制链接 —— 并把快捷键作为顺带的提示，不阻塞。
 */
let bookmarkHint = "";
let bookmarkTimer: ReturnType<typeof setTimeout> | null = null;

function shortcutLabel(): string {
	const ua = navigator.userAgent;
	return /Mac|iPhone|iPad/.test(ua) ? "⌘D" : "Ctrl+D";
}

async function addFavorite() {
	try {
		await navigator.clipboard.writeText(window.location.href);
		bookmarkHint = `链接已复制 · ${shortcutLabel()} 可加书签`;
	} catch {
		// 非安全上下文或用户拒绝授权时，剪贴板不可用
		bookmarkHint = `按 ${shortcutLabel()} 加入书签`;
	}
	if (bookmarkTimer) clearTimeout(bookmarkTimer);
	bookmarkTimer = setTimeout(() => {
		bookmarkHint = "";
	}, 2600);
}

async function handleShare() {
	if (!ShareModal) {
		shareLoading = true;
		try {
			ShareModal = (await import("./ShareModal.svelte")).default;
		} finally {
			shareLoading = false;
		}
	}
	showShareModal = true;
}

async function exportToPDF() {
	// 使用浏览器打印功能导出 PDF
	window.print();
}

// 激光笔功能
function toggleLaserPointer() {
	laserPointerEnabled = !laserPointerEnabled;

	if (laserPointerEnabled) {
		createLaserPointer();
	} else {
		removeLaserPointer();
	}
}

function createLaserPointer() {
	if (laserElement) return;

	laserElement = document.createElement("div");
	laserElement.className = "laser-pointer";
	laserElement.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 0, 0, 0.8) 0%, rgba(255, 0, 0, 0.4) 50%, transparent 100%);
      pointer-events: none;
      z-index: 9999;
      box-shadow: 0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.4);
      transform: translate(-50%, -50%);
    `;

	document.body.appendChild(laserElement);
	document.addEventListener("mousemove", updateLaserPosition);
}

function updateLaserPosition(e: MouseEvent) {
	if (laserElement) {
		laserElement.style.left = `${e.clientX}px`;
		laserElement.style.top = `${e.clientY}px`;
	}
}

function removeLaserPointer() {
	if (laserElement) {
		document.removeEventListener("mousemove", updateLaserPosition);
		laserElement.remove();
		laserElement = null;
	}
}

// 聚光灯功能
function toggleSpotlight() {
	spotlightEnabled = !spotlightEnabled;

	// 更新设置并触发事件
	const saved = localStorage.getItem("effectsSettings");
	const settings = saved ? JSON.parse(saved) : {};
	settings.spotlightEnabled = spotlightEnabled;
	localStorage.setItem("effectsSettings", JSON.stringify(settings));

	window.dispatchEvent(
		new CustomEvent("effectsSettingsChanged", {
			detail: settings,
		}),
	);
}

onDestroy(() => {
	if (bookmarkTimer) clearTimeout(bookmarkTimer);
	removeLaserPointer();
});
</script>

<div class="post-actions">
  <button 
    class="action-btn bookmark-btn"
    on:click={addFavorite}
    aria-label="复制本页链接，便于加入书签"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    </svg>
    <span>{bookmarkHint || "收藏"}</span>
  </button>
  
  <button
    class="action-btn share-btn"
    on:click={handleShare}
    disabled={shareLoading}
    aria-label="分享文章"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class:spinning={shareLoading}>
      <circle cx="18" cy="5" r="3"></circle>
      <circle cx="6" cy="12" r="3"></circle>
      <circle cx="18" cy="19" r="3"></circle>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>
    <span>{shareLoading ? "准备中" : "分享"}</span>
  </button>
  
  <button 
    class="action-btn pdf-btn" 
    on:click={exportToPDF}
    aria-label="导出PDF"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
    <span>导出PDF</span>
  </button>
  
  <button 
    class="action-btn tool-btn {laserPointerEnabled ? 'active' : ''}" 
    on:click={toggleLaserPointer}
    aria-label="激光笔"
    title="激光笔"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
    </svg>
    <span>激光笔</span>
  </button>
  
  <button 
    class="action-btn tool-btn {spotlightEnabled ? 'active' : ''}" 
    on:click={toggleSpotlight}
    aria-label="聚光灯"
    title="聚光灯"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
    </svg>
    <span>聚光灯</span>
  </button>
</div>

{#if ShareModal}
  <svelte:component
    this={ShareModal}
    bind:show={showShareModal}
    {title}
    {slug}
    {published}
    {words}
    {minutes}
  />
{/if}

<style>
  .post-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border: 1px solid var(--line-divider);
    background: var(--card-bg);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
    color: var(--text-color);
  }
  
  :global(.dark) .action-btn {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .action-btn:hover {
    background: var(--btn-card-bg-hover);
    border-color: var(--primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .action-btn:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  /* 分享弹窗按需加载时的等待反馈 */
  .spinning {
    animation: share-spin 0.8s linear infinite;
  }

  @keyframes share-spin {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .spinning { animation: none; }
    .action-btn:hover { transform: none; }
  }
  
  .action-btn:active {
    transform: translateY(0);
  }
  
  .action-btn svg {
    flex-shrink: 0;
  }
  
  .tool-btn.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);
  }
  
  .tool-btn.active:hover {
    background: var(--primary);
    opacity: 0.9;
  }
  
  @media (max-width: 640px) {
    .post-actions {
      justify-content: center;
    }
    
    .action-btn {
      flex: 1;
      min-width: 100px;
      justify-content: center;
    }
  }
</style>
