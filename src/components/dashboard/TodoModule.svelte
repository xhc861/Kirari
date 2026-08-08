<script lang="ts">
import { onMount } from "svelte";

interface TodoItem {
	id: string;
	task: string;
	completed: boolean;
}

interface AnswerResponse {
	code: number;
	msg: string;
	data: {
		description_en: string;
		description_zh: string;
		title_en: string;
		title_zh: string;
	};
	request_id: string;
}

let mockTodos: TodoItem[] = [];

// 从 JSON 文件动态加载待办事项
async function loadTodos() {
	try {
		const response = await fetch("/todos.json", { cache: "no-store" });
		mockTodos = await response.json();
	} catch (error) {
		console.error("[TodoModule] 加载失败:", error);
		mockTodos = [];
	}
}

let confusion = "";
let answer: AnswerResponse["data"] | null = null;
let loading = false;
let error = "";

onMount(() => {
	// 确保在客户端执行
	if (typeof window !== "undefined") {
		loadTodos();
	}
});

async function findAnswer() {
	// 确保在客户端执行
	if (typeof window === "undefined") return;

	if (!confusion.trim()) {
		error = "请输入你的困惑";
		return;
	}

	loading = true;
	error = "";
	answer = null;

	try {
		const response = await fetch(
			`https://v2.xxapi.cn/api/answers?question=${encodeURIComponent(confusion)}`,
		);
		const data: AnswerResponse = await response.json();

		if (data.code === 200 && data.data) {
			answer = data.data;
		} else {
			error = data.msg || "获取答案失败";
		}
	} catch (e) {
		error = "网络请求失败，请稍后重试";
		console.error("Failed to fetch answer:", e);
	} finally {
		loading = false;
	}
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		findAnswer();
	}
}
</script>

<div class="todo-module card-base">
  <h3 class="module-title">待办事项</h3>
  <div class="todo-list">
    {#each mockTodos as todo (todo.id)}
      <div class="todo-item" class:completed={todo.completed}>
        <input type="checkbox" checked={todo.completed} disabled />
        <span class="todo-text">{todo.task}</span>
      </div>
    {/each}
  </div>

  <!-- 困惑输入区域 -->
  <div class="confusion-section">
    <h4 class="confusion-title">答案之书</h4>
    <div class="input-group">
      <input 
        type="text" 
        class="confusion-input" 
        placeholder="输入你的困惑..."
        bind:value={confusion}
        on:keydown={handleKeydown}
        disabled={loading}
      />
      <button 
        type="button"
        class="find-answer-btn" 
        on:click={findAnswer}
        disabled={loading || !confusion.trim()}
      >
        {loading ? '思考中...' : '找到答案'}
      </button>
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    {#if answer}
      <div class="answer-card">
        <div class="answer-title">{answer.title_zh}</div>
        <div class="answer-description">{answer.description_zh}</div>
        {#if answer.title_en}
          <div class="answer-subtitle">{answer.title_en}</div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .todo-module {
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

  .todo-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: background-color 0.2s;
  }

  .todo-item:hover {
    background: var(--btn-card-bg-hover);
  }

  .todo-item.completed .todo-text {
    text-decoration: line-through;
    opacity: 0.6;
  }

  input[type="checkbox"] {
    appearance: none;
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid var(--primary);
    border-radius: 0.25rem;
    cursor: not-allowed;
    position: relative;
    transition: all 0.2s;
  }

  input[type="checkbox"]:checked {
    background: var(--primary);
  }

  input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 0.3rem;
    top: 0.1rem;
    width: 0.4rem;
    height: 0.7rem;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .todo-text {
    flex: 1;
  }

  :global(.dark) .todo-text {
    color: rgba(255, 255, 255, 0.9);
  }

  /* 困惑输入区域 */
  .confusion-section {
    margin-top: auto;
    padding-top: 1.5rem;
    border-top: 2px solid var(--line-divider);
  }

  .confusion-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--primary);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.dark) .confusion-title {
    color: oklch(0.75 0.14 var(--hue));
  }

  .confusion-title::before {
    content: '📖';
    font-size: 1.25rem;
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
  }

  .confusion-input {
    flex: 1;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--line-divider);
    border-radius: 0.5rem;
    background: var(--card-bg);
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  :global(.dark) .confusion-input {
    color: rgba(255, 255, 255, 0.9);
  }

  .confusion-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 88, 88, 88), 0.1);
  }

  .confusion-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .confusion-input::placeholder {
    opacity: 0.5;
  }

  :global(.dark) .confusion-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .find-answer-btn {
    padding: 0.625rem 1.25rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .find-answer-btn:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .find-answer-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .find-answer-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .answer-card {
    margin-top: 0.75rem;
    padding: 1rem;
    background: var(--btn-card-bg-hover);
    border-radius: 0.5rem;
    border-left: 3px solid var(--primary);
  }

  .answer-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--primary);
    margin-bottom: 0.5rem;
  }

  :global(.dark) .answer-title {
    color: oklch(0.75 0.14 var(--hue));
  }

  .answer-description {
    font-size: 0.875rem;
    line-height: 1.6;
  }

  :global(.dark) .answer-description {
    color: rgba(255, 255, 255, 0.9);
  }

  .answer-subtitle {
    margin-top: 0.5rem;
    font-size: 0.8125rem;
    opacity: 0.6;
    font-style: italic;
  }

  :global(.dark) .answer-subtitle {
    color: rgba(255, 255, 255, 0.7);
  }

  @media (max-width: 768px) {
    .input-group {
      flex-direction: column;
    }

    .find-answer-btn {
      width: 100%;
    }
  }
</style>
