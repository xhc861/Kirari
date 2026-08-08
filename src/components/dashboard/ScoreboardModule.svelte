<script lang="ts">
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

const scores: ScoredSubjects = {
	total: null,
	chinese: null,
	math: null,
	englishWritten: null,
	englishListening: null,
	physics: null,
	chemistry: null,
	history: null,
	politics: null,
	pe: 50,
	policyBonus: null,
};

const nonScored: NonScoredItem[] = [
	{ name: "生物", result: "A" },
	{ name: "地理", result: "A" },
	{ name: "信息技术", result: "A" },
	{ name: "音乐", result: "A" },
	{ name: "美术", result: "A" },
	{ name: "物理实验", result: "合格" },
	{ name: "化学实验", result: "合格" },
	{ name: "生物实验", result: "合格" },
];

const ranks: RankInfo = {
	city: null,
	district: null,
	schoolQuota: null,
};

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
</script>

<div class="scoreboard-module card-base">
  <h3 class="module-title">中考</h3>

  <!-- 计分科目：弹性表格，无横向滚动 -->
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

  <!-- 非计分科目 -->
  <h4 class="section-label">非计分科目</h4>
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

  <!-- 排位（不含综合素质评价） -->
  <h4 class="section-label">排位</h4>
  <div class="table-wrap">
    <table class="score-table plain-table rank-table">
      <thead>
        <tr>
          <th>贵阳市排位</th>
          <th>花溪区排位</th>
          <th>所在学校配额生资格排位</th>
        </tr>
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
</div>

<style>
  .scoreboard-module {
    padding: clamp(0.75rem, 1.5vw, 1.25rem) clamp(0.65rem, 1.2vw, 1.25rem);
    border-radius: var(--radius-large);
    height: 100%;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  .module-title {
    font-size: clamp(1.05rem, 1.5vw, 1.25rem);
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: var(--primary);
  }

  :global(.dark) .module-title {
    color: oklch(0.75 0.14 var(--hue));
  }

  .section-label {
    font-size: clamp(0.8rem, 1.2vw, 0.9rem);
    font-weight: 500;
    margin: 1rem 0 0.5rem;
    color: var(--primary);
    opacity: 0.9;
  }

  :global(.dark) .section-label {
    color: oklch(0.75 0.14 var(--hue));
  }

  .table-wrap {
    width: 100%;
    min-width: 0;
    overflow: hidden;
    border-radius: 0.5rem;
  }

  .score-table {
    width: 100%;
    max-width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: clamp(0.62rem, 1.05vw, 0.8125rem);
    background: var(--card-bg);
    border: 1px solid var(--line-divider);
  }

  .score-table th,
  .score-table td {
    border: 1px solid var(--line-divider);
    padding: clamp(0.28rem, 0.7vw, 0.5rem) clamp(0.12rem, 0.4vw, 0.3rem);
    text-align: center;
    vertical-align: middle;
    /* 允许表头换行以塞进容器，数值尽量不换行 */
    word-break: break-word;
    overflow-wrap: anywhere;
    line-height: 1.25;
    hyphens: auto;
  }

  .value-row td,
  .subtotal-row td,
  .plain-table tbody td {
    white-space: nowrap;
    overflow-wrap: normal;
    word-break: normal;
  }

  .score-table thead th {
    background: color-mix(in oklab, var(--card-bg) 92%, var(--primary) 8%);
    font-weight: 600;
    color: inherit;
    opacity: 0.95;
  }

  :global(.dark) .score-table thead th {
    background: color-mix(in oklab, var(--card-bg) 85%, white 8%);
    color: rgba(255, 255, 255, 0.9);
  }

  .group-row th {
    font-size: clamp(0.62rem, 1.05vw, 0.8125rem);
  }

  .sub-row th {
    font-size: clamp(0.58rem, 0.95vw, 0.75rem);
    font-weight: 500;
    opacity: 0.85;
  }

  .value-row td,
  .subtotal-row td,
  .plain-table tbody td {
    color: inherit;
    opacity: 0.85;
  }

  .total-cell {
    font-weight: 700;
    color: var(--primary);
    opacity: 1 !important;
  }

  :global(.dark) .total-cell {
    color: oklch(0.78 0.14 var(--hue));
  }

  .subtotal-row td {
    font-weight: 500;
    background: color-mix(in oklab, var(--card-bg) 96%, var(--primary) 4%);
  }

  :global(.dark) .subtotal-row td {
    background: color-mix(in oklab, var(--card-bg) 90%, white 5%);
  }

  :global(.dark) .score-table td {
    color: rgba(255, 255, 255, 0.85);
  }

  /* 窄屏进一步压缩字号与内边距 */
  @media (max-width: 640px) {
    .scoreboard-module {
      padding: 0.75rem 0.5rem;
    }

    .score-table {
      font-size: 0.58rem;
    }

    .score-table th,
    .score-table td {
      padding: 0.22rem 0.08rem;
    }

    .sub-row th {
      font-size: 0.54rem;
    }
  }

  @media (min-width: 641px) and (max-width: 1023px) {
    .score-table {
      font-size: clamp(0.68rem, 1.4vw, 0.8rem);
    }
  }
</style>
