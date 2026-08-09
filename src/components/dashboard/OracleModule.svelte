<script lang="ts">
/**
 * 答案之书。
 *
 * 原先寄居在「待办事项」模块的下半截 —— 一个叫待办的模块，一半内容是抽签，
 * 分区还被归进「日常」。现在独立出来，和它真正的同类（抽签、每日英语）作伴。
 *
 * 结果直接展开在模块里，不弹全屏模态框：答案就两三行字，为它遮住整个页面
 * 是小题大做，也让「再问一次」这种连续动作变得别扭。
 */
import { onDestroy } from "svelte";

interface AnswerData {
	description_en: string;
	description_zh: string;
	title_en: string;
	title_zh: string;
}

interface AnswerResponse {
	code: number;
	msg: string;
	data: AnswerData;
}

let question = "";
let answer: AnswerData | null = null;
let loading = false;
let error = "";
/** 上一次问的问题，答案展示时带上，免得忘了自己问的什么 */
let asked = "";

let controller: AbortController | null = null;

async function findAnswer() {
	if (typeof window === "undefined") return;
	const q = question.trim();
	if (!q || loading) return;

	// 连点时取消上一次请求，避免旧答案后到覆盖新答案
	controller?.abort();
	controller = new AbortController();

	loading = true;
	error = "";
	answer = null;

	try {
		const response = await fetch(
			`https://v2.xxapi.cn/api/answers?question=${encodeURIComponent(q)}`,
			{ signal: controller.signal },
		);
		const data: AnswerResponse = await response.json();

		if (data.code === 200 && data.data) {
			answer = data.data;
			asked = q;
		} else {
			error = data.msg || "没能拿到答案";
		}
	} catch (e) {
		if ((e as Error)?.name === "AbortError") return;
		error = "网络没通，待会儿再试";
		console.error("[OracleModule] 请求失败:", e);
	} finally {
		loading = false;
	}
}

function reset() {
	answer = null;
	error = "";
	question = "";
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		findAnswer();
	}
}

onDestroy(() => controller?.abort());
</script>

<div class="oracle">
  <div class="input-row">
    <input
      type="text"
      class="field"
      placeholder="心里想着一件事…"
      bind:value={question}
      on:keydown={handleKeydown}
      disabled={loading}
      aria-label="你的困惑"
    />
    <button
      type="button"
      class="ask"
      on:click={findAnswer}
      disabled={loading || !question.trim()}
    >{loading ? "翻书中" : "翻一页"}</button>
  </div>

  {#if error}
    <div class="error">
      {error}
      <button type="button" class="retry" on:click={findAnswer}>重试</button>
    </div>
  {/if}

  {#if answer}
    <div class="answer">
      <div class="asked">你问：{asked}</div>
      <div class="title">{answer.title_zh}</div>
      <div class="desc">{answer.description_zh}</div>
      {#if answer.title_en}
        <div class="en">{answer.title_en}</div>
      {/if}
      <button type="button" class="again" on:click={reset}>再问一件事</button>
    </div>
  {:else if !error && !loading}
    <p class="hint">书不解释，只回应。</p>
  {/if}
</div>

<style>
  .oracle {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .input-row {
    display: flex;
    gap: 0.4rem;
  }

  .field {
    flex: 1;
    min-width: 0;
    padding: 0.45rem 0.7rem;
    border: 1px solid var(--line-divider);
    border-radius: 0.5rem;
    background: transparent;
    font-size: 0.85rem;
    color: inherit;
    transition: border-color 0.15s ease;
  }
  .field:focus {
    outline: none;
    border-color: var(--primary);
  }
  .field:disabled { opacity: 0.5; }
  .field::placeholder { opacity: 0.4; }

  .ask {
    flex-shrink: 0;
    padding: 0.45rem 0.8rem;
    border: none;
    border-radius: 0.5rem;
    background: var(--primary);
    color: white;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }
  .ask:hover:not(:disabled) { opacity: 0.88; }
  .ask:disabled { opacity: 0.35; cursor: not-allowed; }

  .error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: oklch(0.58 0.19 25);
  }
  :global(.dark) .error { color: oklch(0.75 0.17 25); }

  .retry {
    border: none;
    background: none;
    padding: 0;
    font-size: inherit;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  .answer {
    padding-left: 0.75rem;
    border-left: 2px solid var(--primary);
  }

  .asked {
    font-size: 0.72rem;
    opacity: 0.45;
    margin-bottom: 0.3rem;
  }

  .title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--primary);
    line-height: 1.4;
  }

  .desc {
    margin-top: 0.25rem;
    font-size: 0.85rem;
    line-height: 1.65;
    opacity: 0.8;
  }

  .en {
    margin-top: 0.35rem;
    font-size: 0.75rem;
    font-style: italic;
    opacity: 0.45;
  }

  .again {
    margin-top: 0.6rem;
    border: none;
    background: none;
    padding: 0;
    font-size: 0.78rem;
    color: var(--primary);
    cursor: pointer;
    opacity: 0.8;
  }
  .again:hover { opacity: 1; }

  .hint {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.4;
  }
</style>
