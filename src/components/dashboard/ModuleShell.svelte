<script lang="ts">
/**
 * 展板模块的统一外壳：卡片 + 标题 + 折叠 + 排序。
 *
 * 外壳自己提供卡片和标题，模块只管内容。但现有 7 个模块各自带着 card-base
 * 和 <h3 class="module-title">，逐个去改并不机械 —— 比如 ExtraFeaturesModule
 * 外层根本不是卡片，内部却有多张卡片，一刀切会把它拆坏。所以这里用两条精确的
 * :global 把「模块自己那一层」压平：
 *
 *   .module-body > .card-base    只压直接子元素，即模块的根卡片；
 *                                 ExtraFeatures 那些内层 feature-card 是孙子，不受影响
 *   .module-body .module-title   模块自带的标题，交给外壳统一显示
 *
 * 拖拽只在指针设备上可用（HTML5 DnD 在触屏上不工作），所以上移/下移按钮是
 * 常驻的主路径，同时也让键盘用户能排序。
 */
import { createEventDispatcher } from "svelte";

export let title: string;
export let collapsed = false;
/** 是不是所在分区的第一个 / 最后一个，用来禁用越界的移动按钮 */
export let isFirst = false;
export let isLast = false;
/** 拖拽经过时高亮，提示会落在这里 */
export let dropTarget = false;

const dispatch = createEventDispatcher<{
	toggle: void;
	move: -1 | 1;
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
</script>

<section
  class="module card-base"
  class:collapsed
  class:drop-target={dropTarget}
  {draggable}
  on:dragstart={() => dispatch("dragstart")}
  on:dragend={() => { draggable = false; dispatch("dragend"); }}
  on:dragover|preventDefault={() => dispatch("dragover")}
  on:drop|preventDefault={() => dispatch("drop")}
>
  <header class="module-head">
    <span
      class="drag-handle"
      title="拖动排序"
      aria-hidden="true"
      on:mousedown={() => (draggable = true)}
      on:mouseup={() => (draggable = false)}
    >⠿</span>

    <h2 class="module-heading">{title}</h2>

    <div class="module-actions">
      <button
        type="button" class="icon-btn" title="上移" aria-label={`把${title}上移`}
        disabled={isFirst} on:click={() => dispatch("move", -1)}
      >↑</button>
      <button
        type="button" class="icon-btn" title="下移" aria-label={`把${title}下移`}
        disabled={isLast} on:click={() => dispatch("move", 1)}
      >↓</button>
      <button
        type="button" class="icon-btn caret" title={collapsed ? "展开" : "折叠"}
        aria-expanded={!collapsed} on:click={() => dispatch("toggle")}
      >▾</button>
    </div>
  </header>

  {#if !collapsed}
    <div class="module-body">
      <slot />
    </div>
  {/if}
</section>

<style>
  .module {
    padding: 0.85rem 1rem 1rem;
    transition: box-shadow 0.24s ease, transform 0.24s ease;
  }
  .module.drop-target {
    outline: 2px dashed var(--primary);
    outline-offset: 3px;
  }

  .module-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.9rem;
  }

  .drag-handle {
    cursor: grab;
    opacity: 0.35;
    font-size: 0.95rem;
    line-height: 1;
    user-select: none;
  }
  .drag-handle:active { cursor: grabbing; }
  /* 触屏上拖拽不可用，别摆一个按不动的把手 */
  @media (hover: none) {
    .drag-handle { display: none; }
  }

  .module-heading {
    font-size: 0.95rem;
    font-weight: 700;
    margin: 0;
    color: var(--tw-prose-headings, inherit);
  }

  .module-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.15rem;
  }

  .icon-btn {
    width: 1.65rem;
    height: 1.65rem;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 0.4rem;
    background: transparent;
    color: inherit;
    opacity: 0.5;
    cursor: pointer;
    font-size: 0.85rem;
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

  .module-body { margin-top: 0.6rem; }

  /*
   * 把模块自带的那一层压平。只压直接子元素，避免误伤模块内部真正的卡片
   * （如 ExtraFeaturesModule 里的 feature-card）。
   */
  .module-body > :global(.card-base) {
    background: transparent;
    box-shadow: none;
    border: none;
    padding: 0;
    border-radius: 0;
  }
  /* 标题由外壳统一提供，模块自带的隐藏掉，免得出现两个标题 */
  .module-body :global(.module-title) {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .module, .caret, .icon-btn { transition: none; }
  }
</style>
