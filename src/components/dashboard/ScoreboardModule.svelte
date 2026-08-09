<script lang="ts">
/**
 * 成绩单。
 *
 * 之前不管有没有数据，都硬渲染三张表 —— 分数没公布时就是二十几个「—」铺满
 * 通栏，占屏幅最大、信息量为零。现在按公布进度分三种样子：
 *
 *   一分未出 → 一句话，不摆空表
 *   出了一部分 → 表格照常，标题旁标「已出 3/11」
 *   总分出了 → 总分抽出来放大，那才是所有人第一眼要找的数
 *
 * 数据来自 public/scoreboard.json。JSON 里用中文键，便于非技术用户直接编辑。
 */
import { createEventDispatcher, onMount } from "svelte";

/** 计分科目成绩（全部未公布时为 null） */
interface ScoredSubjects {
	total: number | null;
	chinese: number | null;
	math: number | null;
	englishWritten: number | null;
	englishListening: number | null;
	physics: number | null;
	chemistry: number | null;
	history: number | null;
	politics: number | null;
	pe: number | null;
	policyBonus: number | null;
}

/** 非计分科目：等级或合格类结果 */
interface NonScoredItem {
	name: string;
	result: string | null;
}

interface RankInfo {
	city: number | null;
	district: number | null;
	schoolQuota: number | null;
}

const dispatch = createEventDispatcher<{ summary: string; title: string }>();

let scores: ScoredSubjects = {
	total: null,
	chinese: null,
	math: null,
	englishWritten: null,
	englishListening: null,
	physics: null,
	chemistry: null,
	history: null,
	politics: null,
	pe: null,
	policyBonus: null,
};

let nonScored: NonScoredItem[] = [];

let ranks: RankInfo = {
	city: null,
	district: null,
	schoolQuota: null,
};

let loaded = false;

const SCORE_KEY_MAP: Record<string, keyof ScoredSubjects> = {
	总分: "total",
	语文: "chinese",
	数学: "math",
	英语笔试: "englishWritten",
	英语听说: "englishListening",
	物理: "physics",
	化学: "chemistry",
	历史: "history",
	政治: "politics",
	体育与健康: "pe",
	政策性加分: "policyBonus",
};

const RANK_KEY_MAP: Record<string, keyof RankInfo> = {
	市排名: "city",
	区排名: "district",
	校内指标: "schoolQuota",
};

async function loadScoreboard() {
	try {
		const res = await fetch("/scoreboard.json", { cache: "no-store" });
		if (!res.ok) return;
		const data = await res.json();

		/*
		 * JSON 里的自定义标题交回给外壳显示。上一版把模块自带的标题一律隐藏，
		 * 结果在 scoreboard.json 里改 title 根本不生效 —— 这里补回来。
		 */
		if (typeof data?.title === "string" && data.title.trim()) {
			dispatch("title", data.title.trim());
		}

		if (data?.scored && typeof data.scored === "object") {
			const next = { ...scores };
			for (const [label, field] of Object.entries(SCORE_KEY_MAP)) {
				const v = data.scored[label];
				next[field] = typeof v === "number" ? v : null;
			}
			scores = next;
		}

		if (Array.isArray(data?.nonScored)) {
			nonScored = data.nonScored
				.filter((i: unknown): i is NonScoredItem =>
					Boolean(i && typeof (i as NonScoredItem).name === "string"),
				)
				.map((i: NonScoredItem) => ({
					name: i.name,
					result: typeof i.result === "string" ? i.result : null,
				}));
		}

		if (data?.ranks && typeof data.ranks === "object") {
			const next = { ...ranks };
			for (const [label, field] of Object.entries(RANK_KEY_MAP)) {
				const v = data.ranks[label];
				next[field] = typeof v === "number" ? v : null;
			}
			ranks = next;
		}
	} catch {
		// 文件缺失或格式错误时保持全空，走「尚未公布」那一支
	} finally {
		loaded = true;
	}
}

onMount(loadScoreboard);

function display(value: number | string | null): string {
	if (value === null || value === undefined || value === "") return "—";
	return String(value);
}

function sumNullable(...vals: (number | null)[]): number | null {
	if (vals.some((v) => v === null)) return null;
	return vals.reduce<number>((a, b) => a + (b as number), 0);
}

$: englishTotal = sumNullable(scores.englishWritten, scores.englishListening);
$: scienceTotal = sumNullable(scores.physics, scores.chemistry);
$: artsTotal = sumNullable(scores.history, scores.politics);

/** 公布进度：决定这个模块长什么样 */
$: scoredValues = Object.values(scores);
$: publishedCount = scoredValues.filter((v) => v !== null).length;
$: hasNonScored = nonScored.some((i) => i.result !== null);
$: hasRanks = Object.values(ranks).some((v) => v !== null);
$: anything = publishedCount > 0 || hasNonScored || hasRanks;

$: if (loaded) {
	dispatch(
		"summary",
		anything ? `已出 ${publishedCount}/${scoredValues.length}` : "未公布",
	);
}
</script>

{#if !loaded}
  <p class="note">读取中…</p>
{:else if !anything}
  <!-- 一分未出：不摆空表，说清楚现在是什么状态、分数会从哪儿来 -->
  <div class="pending">
    <p class="pending-title">成绩还没公布。</p>
    <p class="note">
      出分后填进 <code>public/scoreboard.json</code>，这里会自动排好 ——
      总分、单科、文理综合小计、排位都在里面。
    </p>
  </div>
{:else}
  {#if scores.total !== null}
    <div class="total">
      <span class="total-n">{scores.total}</span>
      <span class="total-k">总分</span>
    </div>
  {/if}

  <div class="table-wrap">
    <table class="score-table scored-table">
      <thead>
        <tr class="group-row">
          <th rowspan="2">总分</th>
          <th rowspan="2">语文</th>
          <th rowspan="2">数学</th>
          <th colspan="2">英语</th>
          <th colspan="2">综合理科</th>
          <th colspan="2">综合文科</th>
          <th rowspan="2">体育与健康</th>
          <th rowspan="2">政策性加分</th>
        </tr>
        <tr class="sub-row">
          <th>笔试</th>
          <th>听说</th>
          <th>物理</th>
          <th>化学</th>
          <th>历史</th>
          <th>道德与法治</th>
        </tr>
      </thead>
      <tbody>
        <tr class="value-row">
          <td rowspan="2" class="total-cell">{display(scores.total)}</td>
          <td rowspan="2">{display(scores.chinese)}</td>
          <td rowspan="2">{display(scores.math)}</td>
          <td>{display(scores.englishWritten)}</td>
          <td>{display(scores.englishListening)}</td>
          <td>{display(scores.physics)}</td>
          <td>{display(scores.chemistry)}</td>
          <td>{display(scores.history)}</td>
          <td>{display(scores.politics)}</td>
          <td rowspan="2">{display(scores.pe)}</td>
          <td rowspan="2">{display(scores.policyBonus)}</td>
        </tr>
        <tr class="subtotal-row">
          <td colspan="2">{display(englishTotal)}</td>
          <td colspan="2">{display(scienceTotal)}</td>
          <td colspan="2">{display(artsTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 非计分科目：一个结果都没有时整块跳过，不摆一排「—」 -->
  {#if hasNonScored}
    <h3 class="sub-label">非计分科目</h3>
    <div class="table-wrap">
      <table class="score-table plain-table">
        <thead>
          <tr>
            {#each nonScored as item (item.name)}
              <th>{item.name}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          <tr>
            {#each nonScored as item (item.name)}
              <td>{display(item.result)}</td>
            {/each}
          </tr>
        </tbody>
      </table>
    </div>
  {/if}

  {#if hasRanks}
    <h3 class="sub-label">排位</h3>
    <div class="table-wrap">
      <table class="score-table plain-table">
        <thead>
          <tr><th>市排名</th><th>区排名</th><th>校内指标</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>{display(ranks.city)}</td>
            <td>{display(ranks.district)}</td>
            <td>{display(ranks.schoolQuota)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  {/if}
{/if}

<style>
  .note {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.7;
    opacity: 0.5;
  }
  .note code {
    font-size: 0.9em;
    padding: 0.05rem 0.3rem;
    border-radius: 0.25rem;
    background: var(--btn-regular-bg);
  }

  .pending-title {
    margin: 0 0 0.3rem;
    font-size: 1rem;
    font-weight: 600;
  }

  /* 总分单独抽出来 —— 表格里它只是第一格，实际是所有人第一眼要找的数 */
  .total {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    margin-bottom: 0.9rem;
  }
  .total-n {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.03em;
    color: var(--primary);
    font-variant-numeric: tabular-nums;
  }
  .total-k {
    font-size: 0.8rem;
    opacity: 0.5;
  }

  .sub-label {
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    margin: 1.1rem 0 0.45rem;
    opacity: 0.5;
  }

  .table-wrap {
    width: 100%;
    min-width: 0;
    /* 窄屏下 11 列表格挤成一团，让它自己横向滚动而不是压扁 */
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }

  @media (max-width: 640px) {
    .scored-table {
      table-layout: auto;
      min-width: 34rem;
    }
  }

  .score-table {
    width: 100%;
    max-width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: clamp(0.66rem, 1vw, 0.8125rem);
  }

  /* 卡片没了，表格的框也跟着轻下来：只留细横线，竖线交给留白 */
  .score-table th,
  .score-table td {
    border-bottom: 1px solid var(--line-divider);
    padding: clamp(0.3rem, 0.7vw, 0.5rem) clamp(0.15rem, 0.4vw, 0.35rem);
    text-align: center;
    vertical-align: middle;
    word-break: break-word;
    overflow-wrap: anywhere;
    line-height: 1.3;
  }

  .value-row td,
  .subtotal-row td,
  .plain-table tbody td {
    white-space: nowrap;
    overflow-wrap: normal;
    word-break: normal;
  }

  .score-table thead th {
    font-weight: 600;
    opacity: 0.55;
  }

  .sub-row th {
    font-size: 0.92em;
    font-weight: 500;
    opacity: 0.42;
  }

  .value-row td,
  .plain-table tbody td {
    font-size: 1.05em;
  }

  .total-cell {
    font-weight: 700;
    color: var(--primary);
  }

  .subtotal-row td {
    font-size: 0.95em;
    opacity: 0.55;
  }
  .score-table tbody tr:last-child td { border-bottom: none; }
</style>
