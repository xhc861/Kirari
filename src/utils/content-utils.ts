import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl } from "@utils/url-utils";

// // Retrieve posts and sort them by publication date
async function getRawSortedPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

export async function getSortedPosts(): Promise<CollectionEntry<"posts">[]> {
	const sorted = await getRawSortedPosts();

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].id;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].id;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}
export type PostForList = {
	slug: string;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// delete post.body
	// Content Layer API 用 id 取代了 slug，这里保留对外字段名 slug 以免改动消费方
	const sortedPostsList = sortedFullPosts.map((post) => ({
		slug: post.id,
		data: post.data,
	}));

	return sortedPostsList;
}
/**
 * 相关文章。
 *
 * 按标签重合度打分，分类相同再加权。纯时间顺序的「上一篇/下一篇」跳转往往
 * 跨越完全无关的主题，这里给读者一条按内容延伸的路径。
 */
export async function getRelatedPosts(
	current: CollectionEntry<"posts">,
	limit = 3,
): Promise<CollectionEntry<"posts">[]> {
	const all = await getRawSortedPosts();
	const currentTags = new Set(current.data.tags);
	const currentCategory = (current.data.category ?? "").trim();

	const scored = all
		.filter((p) => p.id !== current.id)
		.map((p) => {
			let score = 0;
			for (const t of p.data.tags) {
				if (currentTags.has(t)) score += 2;
			}
			const cat = (p.data.category ?? "").trim();
			if (currentCategory && cat === currentCategory) score += 1;
			return { post: p, score };
		})
		.filter((x) => x.score > 0);

	scored.sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		// 同分时较新的排前面
		return (
			new Date(b.post.data.published).getTime() -
			new Date(a.post.data.published).getTime()
		);
	});

	return scored.slice(0, limit).map((x) => x.post);
}

/**
 * 同系列的文章，按 order 升序（缺省时按发布时间）。
 * 用于在文章页展示「本系列第 N 篇」及整个系列目录。
 */
export async function getSeriesPosts(
	series: string,
): Promise<CollectionEntry<"posts">[]> {
	if (!series) return [];
	const all = await getRawSortedPosts();
	return all
		.filter((p) => p.data.series === series)
		.sort((a, b) => {
			const ao = a.data.order;
			const bo = b.data.order;
			if (ao != null && bo != null) return ao - bo;
			if (ao != null) return -1;
			if (bo != null) return 1;
			return (
				new Date(a.data.published).getTime() -
				new Date(b.data.published).getTime()
			);
		});
}

export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(): Promise<Category[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { category: string | null } }) => {
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c),
		});
	}
	return ret;
}
