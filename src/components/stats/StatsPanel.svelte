<script lang="ts">
import { onDestroy, onMount } from "svelte";

/**
 * 写作统计图表。
 *
 * echarts 按需引入 —— 整包近 1 MB，这里只取用到的图表与组件，
 * 配合 client:visible，滚动到才加载。
 *
 * 配色刻意走暖调、低饱和，跟着站点主题色走：这页是「看看自己写了多少」，
 * 不是监控大盘，不该做成仪表盘那种冷硬观感。
 */

export let summary: {
	posts: number;
	chars: number;
	avgChars: number;
	spanDays: number;
	firstDate: string;
	categories: number;
	tags: number;
};
export let calendar: [string, number][] = [];
export let calendarYear = new Date().getFullYear();
export let months: [string, number][] = [];
export let categories: { name: string; value: number }[] = [];
export let tags: { name: string; value: number }[] = [];

let calendarEl: HTMLDivElement;
let monthsEl: HTMLDivElement;
let categoryEl: HTMLDivElement;

let charts: { dispose: () => void; resize: () => void }[] = [];
let cleanup: (() => void) | null = null;

function cssVar(name: string, fallback: string): string {
	if (typeof window === "undefined") return fallback;
	const v = getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
	return v || fallback;
}

function isDark(): boolean {
	return document.documentElement.classList.contains("dark");
}

function fmt(n: number): string {
	return n.toLocaleString("zh-CN");
}

onMount(async () => {
	const echarts = await import("echarts/core");
	const { HeatmapChart, LineChart, PieChart } = await import("echarts/charts");
	const { CalendarComponent, GridComponent, TooltipComponent, VisualMapComponent, LegendComponent } =
		await import("echarts/components");
	const { CanvasRenderer } = await import("echarts/renderers");

	echarts.use([
		HeatmapChart,
		LineChart,
		PieChart,
		CalendarComponent,
		GridComponent,
		TooltipComponent,
		VisualMapComponent,
		LegendComponent,
		CanvasRenderer,
	]);

	function build() {
		for (const c of charts) c.dispose();
		charts = [];

		const primary = cssVar("--primary", "#4f7dd9");
		const dark = isDark();
		const label = dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)";
		const track = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
		const base = { textStyle: { color: label, fontFamily: "inherit" } };

		// ---- 写作日历热力图 ----
		if (calendarEl && calendar.length) {
			const c1 = echarts.init(calendarEl, null, { renderer: "canvas" });
			c1.setOption({
				...base,
				tooltip: {
					formatter: (p: { value: [string, number] }) =>
						`${p.value[0]}<br/>${p.value[1]} 篇`,
				},
				visualMap: {
					min: 0,
					max: Math.max(2, ...calendar.map((c) => c[1])),
					show: false,
					inRange: { color: [track, primary] },
				},
				calendar: {
					top: 30,
					left: 40,
					right: 10,
					cellSize: ["auto", 14],
					range: String(calendarYear),
					splitLine: { show: false },
					itemStyle: { color: "transparent", borderWidth: 3, borderColor: "transparent" },
					yearLabel: { show: false },
					dayLabel: { color: label, nameMap: ["日", "一", "二", "三", "四", "五", "六"] },
					monthLabel: { color: label, nameMap: "cn" },
				},
				series: [{ type: "heatmap", coordinateSystem: "calendar", data: calendar }],
			});
			charts.push(c1);
		}

		// ---- 逐月字数 ----
		if (monthsEl && months.length) {
			const c2 = echarts.init(monthsEl, null, { renderer: "canvas" });
			c2.setOption({
				...base,
				grid: { top: 24, left: 52, right: 16, bottom: 30 },
				tooltip: { trigger: "axis", valueFormatter: (v: number) => `${fmt(v)} 字` },
				xAxis: {
					type: "category",
					data: months.map((m) => m[0]),
					axisLine: { lineStyle: { color: track } },
					axisTick: { show: false },
				},
				yAxis: {
					type: "value",
					splitLine: { lineStyle: { color: track } },
					axisLabel: { formatter: (v: number) => (v >= 1000 ? `${v / 1000}k` : String(v)) },
				},
				series: [
					{
						type: "line",
						smooth: true,
						symbolSize: 6,
						data: months.map((m) => m[1]),
						lineStyle: { width: 2.5, color: primary },
						itemStyle: { color: primary },
						areaStyle: {
							color: {
								type: "linear",
								x: 0, y: 0, x2: 0, y2: 1,
								colorStops: [
									{ offset: 0, color: `${primary}55` },
									{ offset: 1, color: `${primary}00` },
								],
							},
						},
					},
				],
			});
			charts.push(c2);
		}

		// ---- 分类占比 ----
		if (categoryEl && categories.length) {
			const c3 = echarts.init(categoryEl, null, { renderer: "canvas" });
			c3.setOption({
				...base,
				tooltip: { trigger: "item", formatter: "{b}：{c} 篇（{d}%）" },
				legend: { bottom: 0, textStyle: { color: label }, icon: "circle" },
				series: [
					{
						type: "pie",
						radius: ["44%", "68%"],
						center: ["50%", "44%"],
						avoidLabelOverlap: true,
						label: { show: false },
						itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: "transparent" },
						data: categories,
					},
				],
				color: [
					primary,
					`${primary}bb`,
					`${primary}88`,
					`${primary}66`,
					`${primary}44`,
				],
			});
			charts.push(c3);
		}
	}

	build();

	const onResize = () => {
		for (const c of charts) c.resize();
	};
	window.addEventListener("resize", onResize);

	// 主题切换后重建，否则文字颜色留在上一套主题里
	const observer = new MutationObserver(build);
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});

	cleanup = () => {
		window.removeEventListener("resize", onResize);
		observer.disconnect();
		for (const c of charts) c.dispose();
	};
});

onDestroy(() => cleanup?.());
</script>

<div class="stats-grid">
  <div class="stat-row card-base">
    <div class="stat"><span class="n">{fmt(summary.posts)}</span><span class="k">篇文章</span></div>
    <div class="stat"><span class="n">{fmt(summary.chars)}</span><span class="k">字</span></div>
    <div class="stat"><span class="n">{fmt(summary.avgChars)}</span><span class="k">篇均字数</span></div>
    <div class="stat"><span class="n">{fmt(summary.categories)}</span><span class="k">个分类</span></div>
    <div class="stat"><span class="n">{fmt(summary.tags)}</span><span class="k">个标签</span></div>
  </div>

  {#if calendar.length}
    <div class="card-base chart-card">
      <h3 class="chart-title">哪些日子在写</h3>
      <div class="chart chart-calendar" bind:this={calendarEl}></div>
    </div>
  {/if}

  {#if months.length}
    <div class="card-base chart-card">
      <h3 class="chart-title">每月写了多少字</h3>
      <div class="chart" bind:this={monthsEl}></div>
    </div>
  {/if}

  <div class="two-col">
    {#if categories.length}
      <div class="card-base chart-card">
        <h3 class="chart-title">都在写什么</h3>
        <div class="chart" bind:this={categoryEl}></div>
      </div>
    {/if}

    {#if tags.length}
      <div class="card-base chart-card">
        <h3 class="chart-title">常用标签</h3>
        <div class="tag-list">
          {#each tags as tag (tag.name)}
            <div class="tag-row">
              <span class="tag-name">{tag.name}</span>
              <span class="tag-bar">
                <span
                  class="tag-fill"
                  style={`width: ${(tag.value / tags[0].value) * 100}%`}
                ></span>
              </span>
              <span class="tag-count">{tag.value}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .stat-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 1rem;
    padding: 1.25rem 1.5rem;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .stat .n {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.1;
    color: var(--primary);
    font-variant-numeric: tabular-nums;
  }
  .stat .k {
    font-size: 0.8rem;
    color: rgba(0, 0, 0, 0.5);
  }
  :global(.dark) .stat .k { color: rgba(255, 255, 255, 0.5); }

  .chart-card { padding: 1.25rem 1.5rem; }
  .chart-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--primary);
    margin-bottom: 0.75rem;
  }
  .chart { width: 100%; height: 260px; }
  .chart-calendar { height: 200px; }

  .two-col {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 900px) {
    .two-col { grid-template-columns: 1fr 1fr; }
  }

  .tag-list { display: flex; flex-direction: column; gap: 0.6rem; }
  .tag-row {
    display: grid;
    grid-template-columns: minmax(4rem, 7rem) 1fr 2rem;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
  }
  .tag-name {
    color: rgba(0, 0, 0, 0.75);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global(.dark) .tag-name { color: rgba(255, 255, 255, 0.75); }

  .tag-bar {
    height: 0.5rem;
    border-radius: 9999px;
    background: var(--btn-regular-bg);
    overflow: hidden;
  }
  .tag-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--primary);
    /* 进入视口后横向展开，比直接画出来更有「长出来」的感觉 */
    animation: tag-grow 0.7s cubic-bezier(0.22, 0.8, 0.3, 1);
  }
  @keyframes tag-grow {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }

  .tag-count {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: rgba(0, 0, 0, 0.4);
  }
  :global(.dark) .tag-count { color: rgba(255, 255, 255, 0.4); }

  @media (prefers-reduced-motion: reduce) {
    .tag-fill { animation: none; }
  }
</style>
