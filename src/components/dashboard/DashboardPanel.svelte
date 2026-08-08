<script lang="ts">
import { onMount } from "svelte";
import UABadge from "../UABadge.svelte";
import CalendarModule from "./CalendarModule.svelte";
import CountdownModule from "./CountdownModule.svelte";
import ExtraFeaturesModule from "./ExtraFeaturesModule.svelte";
import MicroNewsModule from "./MicroNewsModule.svelte";
import ScoreboardModule from "./ScoreboardModule.svelte";
import TodoModule from "./TodoModule.svelte";

interface Countdown {
	id: string;
	name: string;
	targetDate: string;
}

let countdowns: Countdown[] = [];
/** 是否已完成倒计时数据探测（避免布局类过早生效） */
let countdownsChecked = false;

$: hasCountdowns = countdowns.length > 0;

async function loadCountdowns() {
	try {
		const response = await fetch("/countdowns.json", { cache: "no-store" });
		const data = await response.json();
		countdowns = Array.isArray(data) ? data : [];
	} catch {
		// JSON 无效、为空注释或请求失败时视为无倒计时
		countdowns = [];
	} finally {
		countdownsChecked = true;
	}
}

onMount(() => {
	loadCountdowns();
});
</script>

<div
  class="dashboard-container"
  class:no-countdown={countdownsChecked && !hasCountdowns}
>
  <!-- 顶部：日历 / 可选倒计时；无倒计时时压缩与微新闻的间距 -->
  <div class="primary-stack">
    <div class="calendar-section">
      <CalendarModule />
    </div>

    {#if hasCountdowns}
      <div class="countdown-section">
        <CountdownModule {countdowns} />
      </div>
    {/if}
  </div>

  <!-- 微新闻 - 单独一行 -->
  <div class="micro-news-section">
    <MicroNewsModule />
  </div>

  <!-- 待办事项（较窄）+ 中考成绩（弹性占满） -->
  <div class="two-column-grid">
    <div class="todo-col">
      <TodoModule />
    </div>
    <div class="scoreboard-col">
      <ScoreboardModule />
    </div>
  </div>

  <!-- 抽签和每日英语 - 单独一行 -->
  <div class="extra-features-section">
    <ExtraFeaturesModule />
  </div>

  <!-- UA 信息 - 底部 -->
  <div class="ua-section">
    <UABadge />
  </div>
</div>

<style>
  .dashboard-container {
    width: 100%;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .primary-stack {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
  }

  /*
   * 无倒计时：
   * 1. 去掉倒计时区块本身及其两侧 gap
   * 2. 收紧 primary-stack 内部间距
   * 3. 用负 margin 拉近与微新闻的距离
   */
  .dashboard-container.no-countdown .primary-stack {
    gap: 0.75rem;
    margin-bottom: -0.5rem;
  }

  .calendar-section,
  .countdown-section,
  .micro-news-section,
  .extra-features-section,
  .ua-section {
    width: 100%;
  }

  /* 子模块无内容时不占 gap */
  .primary-stack > :global(:empty) {
    display: none;
  }

  .two-column-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
    min-width: 0;
  }

  .todo-col,
  .scoreboard-col {
    min-width: 0;
    width: 100%;
  }

  /* 宽屏：待办收窄，成绩表弹性占剩余空间 */
  @media (min-width: 1024px) {
    .two-column-grid {
      flex-direction: row;
      align-items: stretch;
      gap: 1.25rem;
    }

    .todo-col {
      flex: 0 1 26%;
      max-width: 280px;
      min-width: 200px;
    }

    .scoreboard-col {
      flex: 1 1 0;
      min-width: 0;
    }
  }

  @media (min-width: 1280px) {
    .dashboard-container {
      gap: 2rem;
    }

    .primary-stack {
      gap: 2rem;
    }

    .two-column-grid {
      gap: 1.5rem;
    }

    .todo-col {
      flex-basis: 24%;
      max-width: 260px;
    }

    .dashboard-container.no-countdown .primary-stack {
      gap: 1rem;
      margin-bottom: -0.75rem;
    }
  }
</style>
