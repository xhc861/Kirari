<script lang="ts">
/**
 * 展板模块的外壳。
 *
 * 以前它是一张卡片，顶着 ⠿ ↑ ↓ ▾ 四个常驻控件 —— 一个只有两行内容的待办，
 * 光是管理按钮就占了小半张卡。现在反过来：浏览态一个按钮都没有，只剩
 * 「标题 + 一条细线 + 一句摘要」，内容直接躺在页面上；排序、宽度、折叠
 * 全部收进「整理」模式，需要收拾的时候才让它们出现。
 *
 * 摘要（badge）是这次补回来的东西。上一版把模块自带的 <h3 class="module-title">
 * 一律 display:none，微新闻标题里的条数、成绩单从 JSON 读来的自定义标题
 * 一并被吞掉了。现在由模块自己 dispatch("summary") 上报，外壳显示在标题右侧 ——
 * 折叠之后照样看得见「9 条」「1/2」「未公布」，折叠才算有意义。
 */
import { createEventDispatcher } from "svelte";
import { type ModuleSize, SIZES } from "./dashboard-layout";

export let title: string;
export let badge = "";
export let collapsed = false;
export let editing = false;
export let size: ModuleSize = "half";
/** 不套标题壳，内容直接铺开（浏览器信息那行细字） */
export let bare = false;
/** 是不是所在章节的第一个 / 最后一个，用来禁用越界的移动按钮 */
export let isFirst = false;
export let isLast = false;
/** 拖拽经过时高亮，提示会落在这里 */
export let dropTarget = false;

const dispatch = createEventDispatcher<{
	toggle: void;
	move: -1 | 1;
	resize: ModuleSize;
	dragstart: void;
	dragend: void;
	dragover: void;
	drop: void;
}>();

/*
 * 整块可拖，但只允许从把手发起 —— 否则在模块内部选文字都会变成拖动。
 * 做法是平时 draggable=false，按住把手时才打开。
 */
let draggable = false;

/** 页脚式模块在浏览态没有标题栏，进了整理模式才需要一个抓手 */
$: showHead = !bare || editing;
</script>

<section
  class="module"
  class:collapsed
  class:editing
  class:bare
  class:drop-target={dropTarget}
  {draggable}
  on:dragstart={() => dispatch("dragstart")}
  on:dragend={() => { draggable = false; dispatch("dragend"); }}
  on:dragover|preventDefault={() => dispatch("dragover")}
  on:drop|preventDefault={() => dispatch("drop")}
>
  {#if showHead}
    <header class="head">
      {#if editing}
        <span
          class="handle"
          title="拖动排序"
          aria-hidden="true"
          on:mousedown={() => (draggable = true)}
          on:mouseup={() => (draggable = false)}
        >⠿</span>
      {/if}

      <h2 class="heading">{title}</h2>
      {#if badge}<span class="badge">{badge}</span>{/if}

      <span class="rule" aria-hidden="true"></span>

      {#if editing}
        <div class="tools">
          <div class="seg" role="group" aria-label={`${title}的宽度`}>
            {#each SIZES as s (s.id)}
              <button
                type="button"
                class="seg-btn"
                class:on={size === s.id}
                aria-pressed={size === s.id}
                title={`宽度：${s.name}`}
                on:click={() => dispatch("resize", s.id)}
              >{s.name}</button>
            {/each}
          </div>
          <button
            type="button" class="icon-btn" title="上移" aria-label={`把${title}上移`}
            disabled={isFirst} on:click={() => dispatch("move", -1)}
          >↑</button>
          <button
            type="button" class="icon-btn" title="下移" aria-label={`把${title}下移`}
            disabled={isLast} on:click={() => dispatch("move", 1)}
          >↓</button>
          <button
            type="button" class="icon-btn caret" title={collapsed ? "展开" : "收起"}
            aria-expanded={!collapsed} on:click={() => dispatch("toggle")}
          >▾</button>
        </div>
      {:else if collapsed}
        <!-- 浏览态唯一的按钮：收起来的东西总得有路展开 -->
        <button type="button" class="expand" on:click={() => dispatch("toggle")}>
          展开
        </button>
      {/if}
    </header>
  {/if}

  {#if !collapsed}
    <div class="body">
      <slot />
    </div>
  {/if}
</section>

<style>
  .module {
    min-width: 0;
    /* 没有卡片，但整理模式下要有个可抓的边界 */
    border-radius: 0.6rem;
    transition: background 0.2s ease, outline-color 0.2s ease;
  }

  .module.editing {
    outline: 1px dashed color-mix(in oklab, var(--primary) 45%, transparent);
    outline-offset: 0.5rem;
  }
  .module.drop-target {
    outline: 2px solid var(--primary);
    outline-offset: 0.5rem;
    background: color-mix(in oklab, var(--primary) 6%, transparent);
  }

  .head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.75rem;
    margin-bottom: 0.7rem;
  }

  .heading {
    flex-shrink: 0;
    margin: 0;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: rgba(0, 0, 0, 0.55);
  }
  :global(.dark) .heading { color: rgba(255, 255, 255, 0.55); }

  /* 折叠后仍然看得见的那句摘要 */
  .badge {
    flex-shrink: 0;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.1rem 0.45rem;
    border-radius: 9999px;
    color: var(--primary);
    background: color-mix(in oklab, var(--primary) 11%, transparent);
    font-variant-numeric: tabular-nums;
  }

  /* 标题右边那条线 —— 卡片边框的替代品，只暗示分组，不圈地 */
  .rule {
    flex: 1;
    min-width: 1rem;
    height: 1px;
    background: var(--line-divider);
  }

  .handle {
    cursor: grab;
    opacity: 0.4;
    font-size: 0.9rem;
    line-height: 1;
    user-select: none;
  }
  .handle:active { cursor: grabbing; }
  /* 触屏上 HTML5 拖拽不工作，别摆一个按不动的把手 */
  @media (hover: none) {
    .handle { display: none; }
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .seg {
    display: flex;
    padding: 0.1rem;
    border-radius: 9999px;
    background: var(--btn-regular-bg);
  }
  .seg-btn {
    padding: 0.1rem 0.5rem;
    border: none;
    border-radius: 9999px;
    background: transparent;
    color: var(--btn-content);
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .seg-btn:hover { background: var(--btn-plain-bg-hover); }
  .seg-btn.on {
    background: var(--card-bg);
    color: var(--primary);
  }
  /* 窄屏一律通栏，宽度选择在那儿不起作用，索性收掉 */
  @media (max-width: 1023px) {
    .seg { display: none; }
  }

  .icon-btn {
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 0.35rem;
    background: transparent;
    color: inherit;
    opacity: 0.5;
    cursor: pointer;
    font-size: 0.8rem;
    line-height: 1;
    transition: background 0.15s ease, opacity 0.15s ease;
  }
  .icon-btn:hover:not(:disabled) {
    background: var(--btn-plain-bg-hover);
    opacity: 1;
  }
  .icon-btn:disabled { opacity: 0.18; cursor: default; }

  .caret { transition: transform 0.2s ease, background 0.15s ease, opacity 0.15s ease; }
  .module.collapsed .caret { transform: rotate(-90deg); }

  .expand {
    flex-shrink: 0;
    padding: 0.1rem 0.55rem;
    border: none;
    border-radius: 9999px;
    background: var(--btn-regular-bg);
    color: var(--btn-content);
    font-size: 0.72rem;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .expand:hover { background: var(--btn-plain-bg-hover); }

  .body { min-width: 0; }

  /*
   * 模块自己那一层容器压平。只压直接子元素，模块内部真正需要一块底的东西
   * （统计的图表、抽签的两张牌）不受影响。
   */
  .body > :global(.card-base) {
    background: transparent;
    box-shadow: none;
    border: none;
    padding: 0;
    border-radius: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .module, .caret, .icon-btn, .seg-btn, .expand { transition: none; }
  }
</style>
