<script lang="ts">
import { onMount } from "svelte";

interface ExamResult {
	id: string;
	examName: string;
	subject: string;
	score: number | null;
	schoolRank: number | null;
	districtRank: number | null;
	cityRank: number | null;
}

let mockExams: ExamResult[] = [];
let chartContainer: HTMLElement;

// 从 JSON 文件动态加载考试数据
async function loadExams() {
	console.log("[ExamModule] 开始加载考试数据...");
	try {
		const response = await fetch("/exams.json");
		console.log("[ExamModule] fetch 响应:", response.status);
		mockExams = await response.json();
		console.log("[ExamModule] 加载的数据:", mockExams);
		// 等待 DOM 更新后初始化图表
		setTimeout(() => {
			if (window.echarts && chartContainer) {
				console.log("[ExamModule] 初始化图表");
				initChart();
			}
		}, 100);
	} catch (error) {
		console.error("[ExamModule] 加载失败:", error);
		mockExams = [];
	}
}

onMount(() => {
	// 先加载数据
	loadExams();

	// 加载 ECharts
	const script = document.createElement("script");
	script.src = "https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js";
	script.onload = () => {
		// 如果数据已经加载完成，初始化图表
		if (mockExams.length > 0 && chartContainer) {
			initChart();
		}
	};
	document.head.appendChild(script);
});

function initChart() {
	if (typeof window === "undefined" || !window.echarts || !chartContainer)
		return;

	const chart = window.echarts.init(chartContainer);

	// 检查是否有成绩数据
	const hasScores = mockExams.some((exam) => exam.score !== null);

	interface TooltipParams {
		dimensionNames: string[];
		name: string;
	}

	const option = {
		tooltip: {
			trigger: "item",
			formatter: (params: TooltipParams) => {
				const index = params.dimensionNames.indexOf(params.name);
				if (index === -1) return "";

				const exam = mockExams[index];
				let tooltipContent = `<div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${exam.subject}</div>`;

				if (exam.score !== null) {
					tooltipContent += `
            <div style="margin-bottom: 4px;">成绩: <span style="font-weight: bold; color: #3b82f6;">${exam.score}</span> 分</div>`;

					if (exam.schoolRank !== null) {
						tooltipContent += `<div style="margin-bottom: 4px;">校排名: <span style="font-weight: bold;">${exam.schoolRank}</span></div>`;
					}
					if (exam.districtRank !== null) {
						tooltipContent += `<div style="margin-bottom: 4px;">区排名: <span style="font-weight: bold;">${exam.districtRank}</span></div>`;
					}
					if (exam.cityRank !== null) {
						tooltipContent += `<div>市排名: <span style="font-weight: bold;">${exam.cityRank}</span></div>`;
					}
				} else {
					tooltipContent += `<div style="color: #999;">成绩未公布</div>`;
				}

				tooltipContent += "</div>";
				return tooltipContent;
			},
		},
		radar: {
			indicator: mockExams.map((exam) => ({
				name: exam.subject,
				max: 100,
			})),
			radius: "60%",
		},
		series: [
			{
				type: "radar",
				data: hasScores
					? [
							{
								value: mockExams.map((exam) => exam.score || 0),
								name: mockExams[0].examName,
								areaStyle: {
									opacity: 0.3,
								},
							},
						]
					: [],
			},
		],
	};

	chart.setOption(option);

	// 响应式
	window.addEventListener("resize", () => chart.resize());
}
</script>

<div class="exam-module card-base">
  <h3 class="module-title">中考成绩 - {mockExams[0]?.examName || '未命名中考'}</h3>
  <div class="status-info">
    {#if mockExams.every(exam => exam.score === null)}
      <div class="unpublished">成绩未公布</div>
    {:else}
      <div class="rank-info">
        <div class="rank-item">
          <span class="rank-label">校排名:</span>
          <span class="rank-value">{mockExams[0]?.schoolRank || '未公布'}</span>
        </div>
        <div class="rank-item">
          <span class="rank-label">区排名:</span>
          <span class="rank-value">{mockExams[0]?.districtRank || '未公布'}</span>
        </div>
        <div class="rank-item">
          <span class="rank-label">市排名:</span>
          <span class="rank-value">{mockExams[0]?.cityRank || '未公布'}</span>
        </div>
      </div>
    {/if}
  </div>
  <div class="chart-container" bind:this={chartContainer}></div>
</div>

<style>
  .exam-module {
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

  .status-info {
    margin-bottom: 1rem;
  }

  .unpublished {
    padding: 0.75rem;
    background: var(--card-bg);
    border-radius: 0.5rem;
    text-align: center;
    font-weight: 500;
    color: var(--primary);
  }

  .rank-info {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--card-bg);
    border-radius: 0.5rem;
    justify-content: space-around;
  }

  .rank-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .rank-label {
    font-size: 0.875rem;
    opacity: 0.7;
  }

  .rank-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary);
  }

  .chart-container {
    flex: 1;
    min-height: 300px;
  }
</style>
