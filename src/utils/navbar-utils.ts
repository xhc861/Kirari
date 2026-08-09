import { LinkPresets } from "@constants/link-presets";
import { navBarConfig } from "@/config";
import type { NavBarLink } from "@/types/config";

/**
 * 导航栏链接的显隐设置。
 *
 * 原先设置面板把每个链接写死成一个开关（home / archive / about / friends /
 * gallery），导航栏那边再用 url.includes('archive') 这类子串去猜是哪一项。
 * 结果每加一个导航项（比如「统计」）就要同时改三处，漏一处就失效 ——
 * 已经因此漏过两次。
 *
 * 现在统一从 navBarConfig 推导：链接自己带 data-link-url，键由 URL 算出，
 * 三边用的是同一个函数，加新导航项不需要改任何显隐逻辑。
 */

/** 把链接 URL 归一成稳定的键，如 "/archive/" → "archive"，"/" → "home" */
export function getNavLinkKey(rawUrl: string): string {
	if (!rawUrl) return "";
	// 外链用完整地址做键，避免不同外链撞车
	if (/^https?:\/\//.test(rawUrl)) return rawUrl;
	const path = rawUrl.replace(/^\/+|\/+$/g, "");
	return path === "" ? "home" : path.split("/")[0];
}

export type NavLinkEntry = {
	key: string;
	name: string;
	url: string;
	external: boolean;
};

/** 展开 navBarConfig（预设项会被解析成实际链接），供设置面板生成开关 */
export function getNavLinkEntries(): NavLinkEntry[] {
	return navBarConfig.links
		.map((item): NavBarLink => {
			return typeof item === "number" ? LinkPresets[item] : item;
		})
		.map((l) => ({
			key: getNavLinkKey(l.url),
			name: l.name,
			url: l.url,
			external: Boolean(l.external),
		}));
}
