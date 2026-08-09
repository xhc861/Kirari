<script lang="ts">
import { onDestroy, onMount } from "svelte";

/**
 * 命令面板。
 *
 * Ctrl/⌘ + K 唤起，键盘驱动：模糊搜索全站文章、标签、分类与页面，
 * ↑↓ 选择、Enter 跳转、Esc 关闭。
 *
 * 索引在构建期生成并内联传入 —— 文章不多，几 KB 而已，
 * 换来的是零请求、按键即出结果。
 */

type Item = {
	type: "post" | "page" | "tag" | "category";
	title: string;
	url: string;
	meta?: string;
};

export let items: Item[] = [];

let open = false;
let query = "";
let cursor = 0;
let inputEl: HTMLInputElement | null = null;
let listEl: HTMLDivElement | null = null;

const TYPE_LABEL: Record<Item["type"], string> = {
	post: "POST",
	page: "PAGE",
	tag: "TAG",
	category: "CAT",
};

/**
 * 子序列模糊匹配：输入的字符按顺序出现即可命中，
 * 连续命中给更高分，让「gbdx」也能找到「给博客大升级」这类标题。
 */
function score(text: string, q: string): number {
	if (!q) return 1;
	const t = text.toLowerCase();
	const s = q.toLowerCase();
	if (t.includes(s)) return 1000 - t.indexOf(s);

	let ti = 0;
	let hit = 0;
	let streak = 0;
	for (const ch of s) {
		const found = t.indexOf(ch, ti);
		if (found === -1) return 0;
		streak = found === ti ? streak + 1 : 0;
		hit += 1 + streak;
		ti = found + 1;
	}
	return hit;
}

$: results = items
	.map((item) => ({
		item,
		s: Math.max(score(item.title, query), score(item.meta ?? "", query) * 0.6),
	}))
	.filter((r) => r.s > 0)
	.sort((a, b) => b.s - a.s)
	.slice(0, 12)
	.map((r) => r.item);

$: if (query !== undefined) cursor = 0;

function show() {
	open = true;
	query = "";
	cursor = 0;
	requestAnimationFrame(() => inputEl?.focus());
}

function hide() {
	open = false;
}

function go(item: Item) {
	hide();
	window.location.href = item.url;
}

function onKeydown(e: KeyboardEvent) {
	const mod = e.ctrlKey || e.metaKey;

	if (mod && e.key.toLowerCase() === "k") {
		e.preventDefault();
		open ? hide() : show();
		return;
	}

	// 「/」快捷唤起，但不能抢走输入框里的斜杠
	const target = e.target as HTMLElement | null;
	const typing =
		target &&
		(target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.isContentEditable);
	if (!open && !typing && e.key === "/") {
		e.preventDefault();
		show();
		return;
	}

	if (!open) return;

	if (e.key === "Escape") {
		e.preventDefault();
		hide();
	} else if (e.key === "ArrowDown") {
		e.preventDefault();
		cursor = (cursor + 1) % Math.max(1, results.length);
		scrollToCursor();
	} else if (e.key === "ArrowUp") {
		e.preventDefault();
		cursor = (cursor - 1 + results.length) % Math.max(1, results.length);
		scrollToCursor();
	} else if (e.key === "Enter") {
		e.preventDefault();
		if (results[cursor]) go(results[cursor]);
	}
}

function scrollToCursor() {
	requestAnimationFrame(() => {
		listEl
			?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`)
			?.scrollIntoView({ block: "nearest" });
	});
}

/** 首次访问提示一次快捷键，之后不再打扰 */
let showHint = false;
let hintTimer: ReturnType<typeof setTimeout> | null = null;

onMount(() => {
	window.addEventListener("keydown", onKeydown);

	try {
		if (!localStorage.getItem("kirari:cp-hinted")) {
			hintTimer = setTimeout(() => {
				showHint = true;
				localStorage.setItem("kirari:cp-hinted", "1");
				hintTimer = setTimeout(() => (showHint = false), 6000);
			}, 2500);
		}
	} catch {
		/* 隐私模式下 localStorage 不可用，跳过提示即可 */
	}
});
onDestroy(() => {
	if (typeof window !== "undefined")
		window.removeEventListener("keydown", onKeydown);
	if (hintTimer) clearTimeout(hintTimer);
});

function modKeyLabel(): string {
	if (typeof navigator === "undefined") return "Ctrl";
	return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
}
</script>

{#if showHint && !open}
  <div class="cp-hint" role="status">
    <span class="cp-hint-dot" aria-hidden="true"></span>
    按 <kbd>{modKeyLabel()}</kbd><kbd>K</kbd> 快速跳转
  </div>
{/if}

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="cp-backdrop" on:click={hide}>
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="cp-panel" role="dialog" aria-modal="true" aria-label="命令面板" on:click|stopPropagation>
      <div class="cp-input-row">
        <span class="cp-prompt" aria-hidden="true">&gt;</span>
        <input
          bind:this={inputEl}
          bind:value={query}
          class="cp-input"
          type="text"
          placeholder="搜索文章、标签、页面…"
          autocomplete="off"
          spellcheck="false"
        />
        <kbd class="cp-esc">ESC</kbd>
      </div>

      <div class="cp-list" bind:this={listEl}>
        {#if results.length === 0}
          <div class="cp-empty">没有匹配项</div>
        {:else}
          {#each results as item, i (item.url + item.title)}
            <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
            <div
              class="cp-item"
              class:active={i === cursor}
              data-idx={i}
              on:click={() => go(item)}
              on:mouseenter={() => (cursor = i)}
            >
              <span class="cp-type cp-type-{item.type}">{TYPE_LABEL[item.type]}</span>
              <span class="cp-title">{item.title}</span>
              {#if item.meta}<span class="cp-meta">{item.meta}</span>{/if}
            </div>
          {/each}
        {/if}
      </div>

      <div class="cp-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
        <span><kbd>↵</kbd> 打开</span>
        <span><kbd>/</kbd> 唤起</span>
        <span class="cp-count">{results.length} 项</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .cp-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 12vh;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(3px);
    animation: cp-fade 0.14s ease;
  }

  .cp-panel {
    width: min(640px, 92vw);
    background: var(--card-bg);
    /*
     * 设了背景就必须设配套的前景色。本主题没有通用文字色变量
     * （靠 Tailwind 类逐元素设），所以这里显式给出亮暗两套 ——
     * 漏掉的话面板在深色模式下会继承默认黑字，糊在深色底上。
     */
    color: rgba(0, 0, 0, 0.85);
    border: 1px solid color-mix(in oklab, var(--primary) 35%, transparent);
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.35),
      0 0 0 1px color-mix(in oklab, var(--primary) 12%, transparent),
      0 0 40px -12px color-mix(in oklab, var(--primary) 55%, transparent);
    font-family: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    animation: cp-pop 0.16s cubic-bezier(0.22, 0.9, 0.3, 1);
  }

  :global(.dark) .cp-panel {
    color: rgba(255, 255, 255, 0.88);
  }

  .cp-input-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--line-divider);
  }

  .cp-prompt {
    color: var(--primary);
    font-weight: 700;
    /* 提示符闪烁，像终端光标 */
    animation: cp-blink 1.1s steps(1, end) infinite;
  }

  .cp-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font: inherit;
    font-size: 0.95rem;
    color: inherit;
  }
  .cp-input::placeholder { opacity: 0.4; }

  .cp-esc {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    border: 1px solid var(--line-divider);
    opacity: 0.6;
  }

  .cp-list {
    max-height: 46vh;
    overflow-y: auto;
    padding: 0.35rem;
  }

  .cp-item {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.5rem 0.65rem;
    border-radius: 0.4rem;
    cursor: pointer;
    font-size: 0.875rem;
  }
  .cp-item.active {
    background: color-mix(in oklab, var(--primary) 16%, transparent);
    box-shadow: inset 2px 0 0 var(--primary);
  }

  .cp-type {
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    padding: 0.12rem 0.35rem;
    border-radius: 0.2rem;
    flex-shrink: 0;
    background: color-mix(in oklab, var(--primary) 18%, transparent);
    color: var(--primary);
  }
  .cp-type-tag { background: color-mix(in oklab, #22d3ee 20%, transparent); color: #0e7490; }
  .cp-type-category { background: color-mix(in oklab, #a855f7 20%, transparent); color: #7c3aed; }
  :global(.dark) .cp-type-tag { color: #67e8f9; }
  :global(.dark) .cp-type-category { color: #c4b5fd; }

  .cp-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cp-meta {
    font-size: 0.72rem;
    opacity: 0.45;
    flex-shrink: 0;
  }

  .cp-empty {
    padding: 1.6rem;
    text-align: center;
    font-size: 0.85rem;
    opacity: 0.45;
  }

  .cp-footer {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    border-top: 1px solid var(--line-divider);
    font-size: 0.7rem;
    opacity: 0.6;
  }
  .cp-count { margin-left: auto; font-variant-numeric: tabular-nums; }

  kbd {
    display: inline-block;
    padding: 0 0.25rem;
    margin-right: 0.15rem;
    border: 1px solid var(--line-divider);
    border-radius: 0.2rem;
    font-size: 0.68rem;
  }

  /* 首访提示：贴在右下角，不挡内容 */
  .cp-hint {
    position: fixed;
    right: 1.25rem;
    bottom: 1.25rem;
    z-index: 150;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.85rem;
    border-radius: 0.5rem;
    background: var(--card-bg);
    color: rgba(0, 0, 0, 0.85);
    border: 1px solid color-mix(in oklab, var(--primary) 30%, transparent);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
    font-family: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.75rem;
    animation: cp-slide-in 0.35s cubic-bezier(0.22, 0.9, 0.3, 1);
  }
  :global(.dark) .cp-hint {
    color: rgba(255, 255, 255, 0.88);
  }

  .cp-hint-dot {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 9999px;
    background: var(--primary);
    box-shadow: 0 0 8px var(--primary);
    animation: cp-blink 1.4s steps(1, end) infinite;
  }

  @keyframes cp-slide-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: none; }
  }

  @keyframes cp-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cp-pop {
    from { opacity: 0; transform: translateY(-8px) scale(0.985); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes cp-blink {
    0%, 55% { opacity: 1; }
    56%, 100% { opacity: 0.25; }
  }

  @media (prefers-reduced-motion: reduce) {
    .cp-backdrop, .cp-panel, .cp-hint { animation: none; }
    .cp-prompt, .cp-hint-dot { animation: none; }
  }
</style>
