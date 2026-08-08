import { siteConfig } from "../config";
import type I18nKey from "./i18nKey";
import { getTranslation, type Translation } from "./translation";

/**
 * 让语言成为「渲染期参数」而非全局常量。
 *
 * 原来的 i18n() 直接读 siteConfig.lang，整站只有一种语言。多语言要求同一个
 * 组件在不同路由下输出不同语言，所以语言必须能从当前 URL 推导出来。
 */

/** 支持的语言。中文为默认语言，不带路径前缀。 */
export const LOCALES = ["zh_CN", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh_CN";

/** 各语言在 URL 里的前缀；默认语言无前缀 */
const PREFIX: Record<Locale, string> = {
	zh_CN: "",
	en: "/en",
};

/** 给人看的语言名，用于切换器 */
export const LOCALE_LABEL: Record<Locale, string> = {
	zh_CN: "中文",
	en: "English",
};

/** HTML lang 属性用的标准标签 */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
	zh_CN: "zh-CN",
	en: "en",
};

function normalize(pathname: string): string {
	// 去掉 base path，统一成以 / 开头
	const base = import.meta.env.BASE_URL || "/";
	let p = pathname;
	if (base !== "/" && p.startsWith(base)) {
		p = p.slice(base.length - 1);
	}
	return p.startsWith("/") ? p : `/${p}`;
}

/** 从 URL 推导当前语言 */
export function getLangFromUrl(url: URL | string): Locale {
	const pathname = normalize(typeof url === "string" ? url : url.pathname);
	for (const locale of LOCALES) {
		const prefix = PREFIX[locale];
		if (!prefix) continue;
		if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
			return locale;
		}
	}
	return DEFAULT_LOCALE;
}

/** 去掉路径中的语言前缀，得到「语言无关」的路径 */
export function stripLangPrefix(pathname: string): string {
	const p = normalize(pathname);
	for (const locale of LOCALES) {
		const prefix = PREFIX[locale];
		if (!prefix) continue;
		if (p === prefix) return "/";
		if (p.startsWith(`${prefix}/`)) return p.slice(prefix.length);
	}
	return p;
}

/** 给一个语言无关的路径加上目标语言的前缀 */
export function withLangPrefix(pathname: string, lang: Locale): string {
	const bare = stripLangPrefix(pathname);
	const prefix = PREFIX[lang];
	if (!prefix) return bare;
	return bare === "/" ? `${prefix}/` : `${prefix}${bare}`;
}

/**
 * 返回绑定了某语言的取词函数。
 *
 * 用法：
 *   const t = useTranslations(getLangFromUrl(Astro.url));
 *   t(I18nKey.archive)
 */
export function useTranslations(lang: Locale): (key: I18nKey) => string {
	const table: Translation = getTranslation(lang);
	return (key: I18nKey) => table[key];
}

/** 站点配置里的语言，作为未指定时的兜底 */
export function configLocale(): Locale {
	const lang = (siteConfig.lang || DEFAULT_LOCALE).toLowerCase();
	return (LOCALES.find((l) => l.toLowerCase() === lang) ??
		DEFAULT_LOCALE) as Locale;
}

/**
 * 客户端组件（Svelte）取词。
 *
 * Svelte 组件在浏览器里运行，拿不到 Astro.url；但页面的 <html lang> 已经由
 * 路由正确设置好了，直接读它即可 —— 不必给每个组件层层传 locale。
 * SSR 阶段没有 document，回落到默认语言。
 */
export function clientLocale(): Locale {
	if (typeof document === "undefined") return DEFAULT_LOCALE;
	const raw = document.documentElement.lang.toLowerCase().replace("-", "_");
	return (LOCALES.find((l) => l.toLowerCase() === raw) ??
		DEFAULT_LOCALE) as Locale;
}
