/**
 * 写作统计。
 *
 * 所有数字都在构建期从文章元信息算出来，页面本身不请求任何接口 ——
 * 统计一个静态博客不需要埋点，文章都在仓库里。
 *
 * 原先这段逻辑写在 src/pages/stats.astro 里。统计并进展板之后，取数方从
 * 页面变成了展板，逻辑就抽到这里，两边都只调 getWritingStats()。
 */
import { getSortedPosts } from "@utils/content-utils";
import { getPostUrlBySlug } from "@utils/url-utils";

/** 展板「最近更新」用的精简条目 —— 只带够列一行的字段，正文不进 props */
export type RecentPost = {
	title: string;
	url: string;
	/** ISO 日期串，前端转相对时间时再 new Date */
	published: string;
	category: string;
	chars: number;
};

export type WritingSummary = {
	posts: number;
	chars: number;
	avgChars: number;
	spanDays: number;
	firstDate: string;
	categories: number;
	tags: number;
};

export type WritingStats = {
	summary: WritingSummary;
	/** 按天聚合的发文数，供热力图使用 */
	calendar: [string, number][];
	calendarYear: number;
	/** 逐月字数 */
	months: [string, number][];
	categories: { name: string; value: number }[];
	/** 标签频次，取前 12 */
	tags: { name: string; value: number }[];
};

/** 中文按字符数计更贴近实际阅读量，去掉 markdown 语法噪音后再数 */
export function countChars(body: string | undefined): number {
	if (!body) return 0;
	return body
		.replace(/```[\s\S]*?```/g, "") // 代码块不计入
		.replace(/!?\[[^\]]*\]\([^)]*\)/g, "") // 图片与链接语法
		.replace(/[#>*`~\-_|]/g, "")
		.replace(/\s+/g, "").length;
}

/**
 * 最近发布的几篇，供展板直接跳转。
 *
 * 展板此前没有任何一条通往文章的路 —— 统计画了一堆图表，却没法从图上点进任何
 * 一篇。这是一个博客的展板最该有、却唯独没有的东西。
 */
export async function getRecentPosts(limit = 5): Promise<RecentPost[]> {
	const posts = await getSortedPosts();
	return posts.slice(0, limit).map((p) => ({
		title: p.data.title,
		url: getPostUrlBySlug(p.id),
		published: new Date(p.data.published).toISOString(),
		category: (p.data.category ?? "").trim() || "未分类",
		chars: countChars(p.body),
	}));
}

export async function getWritingStats(): Promise<WritingStats> {
	const posts = await getSortedPosts();

	const items = posts.map((p) => ({
		date: new Date(p.data.published),
		chars: countChars(p.body),
		category: (p.data.category ?? "").trim() || "未分类",
		tags: p.data.tags,
		title: p.data.title,
	}));

	const totalChars = items.reduce((n, i) => n + i.chars, 0);

	const byDay = new Map<string, number>();
	for (const i of items) {
		const key = i.date.toISOString().slice(0, 10);
		byDay.set(key, (byDay.get(key) ?? 0) + 1);
	}
	const calendar = [...byDay.entries()].map(
		([date, count]) => [date, count] as [string, number],
	);

	const byMonth = new Map<string, number>();
	for (const i of items) {
		const key = i.date.toISOString().slice(0, 7);
		byMonth.set(key, (byMonth.get(key) ?? 0) + i.chars);
	}
	const months = [...byMonth.entries()].sort((a, b) =>
		a[0].localeCompare(b[0]),
	) as [string, number][];

	const byCategory = new Map<string, number>();
	for (const i of items) {
		byCategory.set(i.category, (byCategory.get(i.category) ?? 0) + 1);
	}
	const categories = [...byCategory.entries()]
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value);

	const byTag = new Map<string, number>();
	for (const i of items) {
		for (const t of i.tags) byTag.set(t, (byTag.get(t) ?? 0) + 1);
	}
	const tags = [...byTag.entries()]
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value)
		.slice(0, 12);

	const dates = items.map((i) => i.date.getTime()).sort((a, b) => a - b);
	const firstDate = dates.length ? new Date(dates[0]) : null;
	const spanDays = firstDate
		? Math.max(1, Math.round((Date.now() - dates[0]) / 86400000))
		: 0;

	return {
		summary: {
			posts: items.length,
			chars: totalChars,
			avgChars: items.length ? Math.round(totalChars / items.length) : 0,
			spanDays,
			firstDate: firstDate ? firstDate.toISOString().slice(0, 10) : "",
			categories: categories.length,
			tags: byTag.size,
		},
		calendar,
		calendarYear: firstDate
			? firstDate.getFullYear()
			: new Date().getFullYear(),
		months,
		categories,
		tags,
	};
}
