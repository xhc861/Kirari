import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export function pathsEqual(path1: string, path2: string): boolean {
	const normalizedPath1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const normalizedPath2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return normalizedPath1 === normalizedPath2;
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function getPostUrlBySlug(slug: string): string {
	return url(`/posts/${slug}/`);
}

/*
 * 标签与分类指向独立的静态路由，而非归档页的查询参数 —— 查询参数页面不会被
 * 搜索引擎索引、也进不了 sitemap。归档页的交互式筛选仍然保留。
 */
export function getTagUrl(tag: string): string {
	if (!tag) return url("/archive/");
	return url(`/tags/${encodeURIComponent(tag.trim())}/`);
}

export function getCategoryUrl(category: string | null): string {
	// 「未分类」不是真实分类，不生成独立页面，仍交给归档页筛选
	if (
		!category ||
		category.trim() === "" ||
		category.trim().toLowerCase() === i18n(I18nKey.uncategorized).toLowerCase()
	)
		return url("/archive/?uncategorized=true");
	return url(`/categories/${encodeURIComponent(category.trim())}/`);
}

export function getDir(path: string): string {
	const lastSlashIndex = path.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return path.substring(0, lastSlashIndex + 1);
}

export function url(path: string): string {
	return joinUrl("", import.meta.env.BASE_URL, path);
}
