<script lang="ts">
/**
 * 待办。
 *
 * 原先这个模块里塞着两样不相干的东西：待办列表，和一个「答案之书」输入框。
 * 标题写着「待办事项」，一半内容却是抽签式的娱乐 —— 现在答案之书拆成
 * OracleModule，这里只管待办。
 *
 * 另外原来的复选框是 `disabled` 的：长得像能点，点下去没反应，
 * 光标还变成 not-allowed。这是站长自己的待办，访客本来就不该勾 ——
 * 那就别做成复选框，用状态标记表达「做完了 / 还没做」，不假装可交互。
 */
import { createEventDispatcher, onMount } from "svelte";

interface TodoItem {
	id: string;
	task: string;
	completed: boolean;
}

const dispatch = createEventDispatcher<{ summary: string }>();

let todos: TodoItem[] = [];
let loaded = false;

async function loadTodos() {
	try {
		const response = await fetch("/todos.json", { cache: "no-store" });
		const data = await response.json();
		todos = Array.isArray(data) ? data : [];
	} catch (error) {
		console.error("[TodoModule] 加载失败:", error);
		todos = [];
	} finally {
		loaded = true;
	}
}

onMount(() => {
	if (typeof window !== "undefined") loadTodos();
});

$: done = todos.filter((t) => t.completed).length;
$: total = todos.length;
$: percent = total ? (done / total) * 100 : 0;
/** 没做完的排前面 —— 展板要回答的是「还剩什么」，不是「做过什么」 */
$: ordered = [...todos].sort(
	(a, b) => Number(a.completed) - Number(b.completed),
);

$: if (loaded) dispatch("summary", total ? `${done}/${total}` : "空着");
</script>

{#if total > 0}
  <div class="progress" role="progressbar" aria-label="待办完成度" aria-valuemin="0" aria-valuemax={total} aria-valuenow={done}>
    <div class="progress-fill" style={`width: ${percent}%`}></div>
  </div>

  <ul class="list">
    {#each ordered as todo (todo.id)}
      <li class="item" class:done={todo.completed}>
        <span class="mark" aria-hidden="true">{todo.completed ? "✓" : "○"}</span>
        <span class="text">{todo.task}</span>
      </li>
    {/each}
  </ul>

  {#if done === total}
    <p class="all-done">都做完了。</p>
  {/if}
{:else if loaded}
  <p class="empty">暂时没有待办。在 <code>public/todos.json</code> 里加就会出现在这儿。</p>
{:else}
  <p class="empty">读取中…</p>
{/if}

<style>
  .progress {
    height: 3px;
    border-radius: 3px;
    background: var(--line-divider);
    overflow: hidden;
    margin-bottom: 0.75rem;
  }
  .progress-fill {
    height: 100%;
    border-radius: 3px;
    background: var(--sec-tint, var(--primary));
    transition: width 0.4s cubic-bezier(0.22, 0.8, 0.3, 1);
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .item {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .mark {
    flex-shrink: 0;
    width: 1em;
    font-size: 0.85em;
    color: var(--sec-tint, var(--primary));
  }

  .item.done { opacity: 0.45; }
  .item.done .text { text-decoration: line-through; }
  .item.done .mark { color: inherit; }

  .all-done {
    margin: 0.75rem 0 0;
    font-size: 0.8rem;
    opacity: 0.5;
  }

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

  @media (prefers-reduced-motion: reduce) {
    .progress-fill { transition: none; }
  }
</style>
