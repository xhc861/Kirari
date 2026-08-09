<script lang="ts">
import { onDestroy, onMount } from "svelte";

/**
 * 到访招呼。
 *
 * 分寸是这个功能的全部难点 —— 弹窗式的「欢迎回来」很快就会变成噪音。
 * 所以：
 *   - 只在首页显示，文章页不打扰正在阅读的人
 *   - 一天最多出现一次
 *   - 不挡内容，出现在侧栏卡片位置，几秒后自己收起
 *   - 全部数据存在本机 localStorage，不上报任何东西
 */

const KEY_COUNT = "kirari:visits";
const KEY_LAST = "kirari:last-visit";
const KEY_SHOWN = "kirari:greeted-on";
const KEY_LAST_POST = "kirari:last-post";

let message = "";
let sub = "";
let visible = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
	return Math.round(
		(new Date(b).getTime() - new Date(a).getTime()) / 86400000,
	);
}

onMount(() => {
	let store: Storage;
	try {
		store = localStorage;
		// 隐私模式下读写会抛错，探一下
		store.getItem(KEY_COUNT);
	} catch {
		return;
	}

	// 每天最多招呼一次
	if (store.getItem(KEY_SHOWN) === today()) {
		bumpVisit(store);
		return;
	}

	const count = Number(store.getItem(KEY_COUNT) ?? "0");
	const last = store.getItem(KEY_LAST);
	const lastPost = store.getItem(KEY_LAST_POST);

	if (count === 0) {
		message = "第一次来？随便逛。";
		sub = "左边是文章，上面能搜，按 / 也行。";
	} else if (last) {
		const gap = daysBetween(last, today());
		if (gap >= 30) {
			message = "好久不见。";
			sub = `上次来还是 ${gap} 天前。`;
		} else if (gap >= 7) {
			message = "又见面了。";
			sub = lastPost ? `上次你在看《${lastPost}》。` : "";
		} else if (gap >= 1) {
			message = "欢迎回来。";
			sub = lastPost ? `上次读到《${lastPost}》。` : "";
		} else {
			bumpVisit(store);
			return; // 同一天内再进来就不吭声了
		}
	}

	if (!message) {
		bumpVisit(store);
		return;
	}

	store.setItem(KEY_SHOWN, today());
	bumpVisit(store);

	visible = true;
	timer = setTimeout(() => (visible = false), 7000);
});

function bumpVisit(store: Storage) {
	try {
		const count = Number(store.getItem(KEY_COUNT) ?? "0");
		store.setItem(KEY_COUNT, String(count + 1));
		store.setItem(KEY_LAST, today());
	} catch {
		/* 写不进去就算了，这功能不值得为它报错 */
	}
}

onDestroy(() => {
	if (timer) clearTimeout(timer);
});
</script>

{#if visible}
  <div class="greeting card-base" role="status">
    <button
      class="greeting-close"
      type="button"
      aria-label="关闭"
      on:click={() => (visible = false)}
    >×</button>
    <div class="greeting-main">{message}</div>
    {#if sub}<div class="greeting-sub">{sub}</div>{/if}
  </div>
{/if}

<style>
  .greeting {
    position: relative;
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
    /* 设了背景就设配套前景色，避免深色模式继承成黑字 */
    color: rgba(0, 0, 0, 0.8);
    animation: greeting-in 0.45s cubic-bezier(0.22, 0.9, 0.3, 1);
  }
  :global(.dark) .greeting {
    color: rgba(255, 255, 255, 0.82);
  }

  .greeting-main {
    font-weight: 600;
    color: var(--primary);
    margin-bottom: 0.2rem;
  }

  .greeting-sub {
    font-size: 0.82rem;
    opacity: 0.65;
    line-height: 1.5;
  }

  .greeting-close {
    position: absolute;
    top: 0.5rem;
    right: 0.6rem;
    border: none;
    background: none;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    color: inherit;
    opacity: 0.35;
    transition: opacity 0.2s ease;
  }
  .greeting-close:hover { opacity: 0.75; }

  @keyframes greeting-in {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .greeting { animation: none; }
    .greeting-close { transition: none; }
  }
</style>
