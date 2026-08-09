<script lang="ts">
/**
 * 展板模块的外壳。
 *
 * 标题竖排立在左侧，像机架上的通道标签。
 *
 * 这不是为了好看才转 90 度。横排标题会吃掉一整行高度 —— 待办这类模块内容
 * 本来就只有两三行，一行标题加一行间距就占去三成。竖排之后标题只占一条
 * 一点五字宽的边，高度全部还给内容；而且中文本来就竖得起来，这是中文排版
 * 白拿的便宜，拉丁字母做不到。
 *
 * 浏览态左边一条竖标题、右边全是内容，一个按钮都没有。排序、宽度、折叠
 * 收进「整理」模式，从内容区顶部浮出。
 *
 * 摘要（badge）不跟着竖排 —— 「9 条」竖过来要占半屏高。它横排贴在内容区
 * 右上角，折叠之后照样看得见「9 条」「1/2」「3 天前」。
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

/** 页脚式模块在浏览态没有标题条，进了整理模式才需要一个抓手 */
$: showSpine = !bare || editing;
/** 顶栏没内容时整条不占高度 */
$: showTopbar = Boolean(badge) || editing || collapsed;
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
  {#if showSpine}
    <!-- 通道标签：竖排标题 + 一条章节色的竖线 -->
    <div class="spine">
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
    </div>
  {/if}

  <div class="main">
    {#if showTopbar}
      <div class="topbar">
        {#if badge}
          <span class="badge"><i class="badge-dot" aria-hidden="true"></i>{badge}</span>
        {/if}

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
      </div>
    {/if}

    {#if !collapsed}
      <div class="body">
        <slot />
      </div>
    {/if}
  </div>
</section>

<style>
  .module {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 0.85rem;
    min-width: 0;
    padding: 0.35rem 0.45rem;
    transition: background 0.25s ease, box-shadow 0.25s ease;
    --tint: var(--sec-tint, var(--primary));
    --mono: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  /*
   * 四角的取景框角标。没有边框把模块圈起来 —— 只在四角点一下，
   * 既划出范围又不把版面切成一格一格。
   */
  .module::before,
  .module::after {
    content: "";
    position: absolute;
    width: 0.55rem;
    height: 0.55rem;
    border: 1px solid var(--tint);
    opacity: 0.3;
    pointer-events: none;
    transition: opacity 0.25s ease, width 0.25s ease, height 0.25s ease;
  }
  .module::before {
    top: 0; left: 0;
    border-right: 0; border-bottom: 0;
  }
  .module::after {
    bottom: 0; right: 0;
    border-left: 0; border-top: 0;
  }

  /* 悬停时角标张开并亮起，底下浮出一层极淡的章节色 */
  .module:hover::before,
  .module:hover::after {
    opacity: 0.75;
    width: 0.9rem;
    height: 0.9rem;
  }
  .module:hover {
    background: color-mix(in oklab, var(--tint) 5%, transparent);
  }

  .module.editing {
    outline: 1px dashed color-mix(in oklab, var(--tint) 50%, transparent);
    outline-offset: 0.4rem;
  }
  .module.drop-target {
    outline: 1px solid var(--tint);
    outline-offset: 0.4rem;
    background: color-mix(in oklab, var(--tint) 10%, transparent);
    box-shadow: 0 0 18px color-mix(in oklab, var(--tint) 30%, transparent);
  }

  /* ---------- 通道标签 ---------- */
  .spine {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding-right: 0.7rem;
    border-right: 1px solid color-mix(in oklab, var(--tint) 28%, transparent);
  }

  .heading {
    margin: 0;
    writing-mode: vertical-rl;
    /* 中文在竖排里本就正立，这里只是把标题里可能出现的数字一并摆正 */
    text-orientation: mixed;
    font-family: var(--mono);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.3em;
    line-height: 1;
    white-space: nowrap;
    color: var(--tint);
    opacity: 0.85;
  }

  .handle {
    cursor: grab;
    opacity: 0.45;
    font-size: 0.85rem;
    line-height: 1;
    user-select: none;
  }
  .handle:active { cursor: grabbing; }
  /* 触屏上 HTML5 拖拽不工作，别摆一个按不动的把手 */
  @media (hover: none) {
    .handle { display: none; }
  }

  /* ---------- 内容区 ---------- */
  .main {
    flex: 1;
    min-width: 0;
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.5rem;
  }

  /* 折叠后仍然看得见的那句摘要 */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-family: var(--mono);
    font-size: 0.68rem;
    font-weight: 600;
    padding: 0.1rem 0.45rem;
    border-radius: 0.25rem;
    color: var(--tint);
    background: color-mix(in oklab, var(--tint) 12%, transparent);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .badge-dot {
    width: 0.3rem;
    height: 0.3rem;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 5px currentColor;
  }

  .tools {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .seg {
    display: flex;
    padding: 0.1rem;
    border-radius: 0.3rem;
    background: var(--btn-regular-bg);
  }
  .seg-btn {
    padding: 0.1rem 0.5rem;
    border: none;
    border-radius: 0.22rem;
    background: transparent;
    color: var(--btn-content);
    font-family: var(--mono);
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .seg-btn:hover { background: var(--btn-plain-bg-hover); }
  .seg-btn.on {
    background: var(--card-bg);
    color: var(--tint);
  }
  /* 窄屏一律通栏，宽度选择在那儿不起作用，索性收掉 */
  @media (max-width: 767px) {
    .seg { display: none; }
  }

  .icon-btn {
    width: 1.45rem;
    height: 1.45rem;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 0.25rem;
    background: transparent;
    color: inherit;
    opacity: 0.5;
    cursor: pointer;
    font-size: 0.78rem;
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
    margin-left: auto;
    padding: 0.08rem 0.55rem;
    border: 1px solid color-mix(in oklab, var(--tint) 30%, transparent);
    border-radius: 0.25rem;
    background: transparent;
    color: var(--tint);
    font-family: var(--mono);
    font-size: 0.68rem;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .expand:hover { background: color-mix(in oklab, var(--tint) 12%, transparent); }

  .body { min-width: 0; }

  /*
   * 模块自己那一层容器压平。只压直接子元素，模块内部真正需要一块底的东西
   * （统计的图表）不受影响。
   */
  .body > :global(.card-base) {
    background: transparent;
    box-shadow: none;
    border: none;
    padding: 0;
    border-radius: 0;
  }

  /*
   * 窄容器把通道标签放平。
   *
   * 判据是**容器**宽度不是视口：「抽签与每日英语」七个字竖起来就是七行高，
   * 旁边只有一列窄内容时纸就被撑歪了 —— 而这跟屏幕多宽无关，
   * 同一块在宽屏里被调成三分之一栏也一样窄。
   */
  @container mod (max-width: 22rem) {
    .module { display: block; padding: 0.3rem 0; }
    .spine {
      flex-direction: row;
      align-items: baseline;
      gap: 0.5rem;
      padding: 0 0 0.4rem;
      margin-bottom: 0.55rem;
      border-right: none;
      border-bottom: 1px solid color-mix(in oklab, var(--tint) 28%, transparent);
    }
    .heading {
      writing-mode: horizontal-tb;
      letter-spacing: 0.14em;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .module, .module::before, .module::after,
    .caret, .icon-btn, .seg-btn, .expand { transition: none; }
  }
</style>
