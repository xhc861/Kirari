import browserslist from "browserslist";
import { browserslistToTargets } from "lightningcss";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import { transform as lightningTransform } from "lightningcss";

/**
 * 把最终产出的 CSS 降级到旧内核能认的语法。
 *
 * 为什么不用 Vite 的 css.transformer：@tailwindcss/vite 是在 Vite 的 CSS 管线
 * **之后**产出样式的，css.lightningcss 的 targets 够不着它 —— 实测 Tailwind 的
 * @media (width>=48rem) 原样保留，反而是我自己组件里的 min-width 被优化成了
 * 区间语法。所以改在 generateBundle 阶段统一处理最终资产，结果确定。
 *
 * 这一步很关键：区间语法要 Chrome 104 / Safari 16.4 才支持，旧内核一旦不认，
 * **所有响应式类会整体失效**，宽屏渲染成移动端布局。
 */
function downlevelCss(targets) {
	return {
		name: "kirari:downlevel-css",
		apply: "build",
		generateBundle(_options, bundle) {
			for (const asset of Object.values(bundle)) {
				if (asset.type !== "asset" || !asset.fileName.endsWith(".css")) continue;
				const source =
					typeof asset.source === "string"
						? asset.source
						: Buffer.from(asset.source).toString("utf8");
				try {
					const { code } = lightningTransform({
						filename: asset.fileName,
						code: Buffer.from(source),
						targets,
						minify: true,
					});
					asset.source = code.toString("utf8");
				} catch (err) {
					// 单个文件降级失败不该中断构建，保留原样并提示
					this.warn(`降级 CSS 失败：${asset.fileName} — ${err.message}`);
				}
			}
		},
	};
}
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components"; /* Render the custom directive content */
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive"; /* Handle directives */
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { expressiveCodeConfig } from "./src/config.ts";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import { rehypeVLookImage } from "./src/plugins/vlook/rehype-vlook-image.js";
import { rehypeVLookTable } from "./src/plugins/vlook/rehype-vlook-table.js";
import { remarkVLookHeadings } from "./src/plugins/vlook/remark-vlook-headings.js";
import { remarkVLook } from "./src/plugins/vlook/remark-vlook.js";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";

// https://astro.build/config
export default defineConfig({
	site: "https://kirari.vercel.app/",
	base: "/",
	trailingSlash: "always",
	output: "static", // 静态模式，API 路由会自动作为服务端函数
	adapter: vercel(),
	// Astro 7 将默认值改为 'jsx'（按 JSX 规则剥离空白），保持旧行为避免排版变化
	compressHTML: true,
	redirects: {
		// 展板原有两个入口（/gallery/ 与 /dashboard/）渲染同一组件，现统一到 /dashboard/
		"/gallery": "/dashboard/",
	},
	integrations: [
		swup({
			theme: false,
			animationClass: "transition-swup-", // see https://swup.js.org/options/#animationselector
			// the default value `transition-` cause transition delay
			// when the Tailwind class `transition-all` is used
			containers: ["main", "#toc"],
			smoothScrolling: true,
			cache: true,
			preload: true,
			accessibility: true,
			updateHead: true,
			updateBodyClass: false,
			globalInstance: true,
		}),
		icon({
			include: {
				"fa6-brands": ["*"],
				"fa6-regular": ["*"],
				"fa6-solid": ["*"],
			},
		}),
		expressiveCode({
			themes: [expressiveCodeConfig.theme, expressiveCodeConfig.theme],
			plugins: [
				pluginCollapsibleSections(),
				pluginLineNumbers(),
				pluginLanguageBadge(),
				pluginCustomCopyButton()
			],
			defaultProps: {
				wrap: true,
				overridesByLang: {
					'shellsession': {
						showLineNumbers: false,
					},
				},
			},
			styleOverrides: {
				codeBackground: "var(--codeblock-bg)",
				borderRadius: "0.75rem",
				borderColor: "none",
				codeFontSize: "0.875rem",
				codeFontFamily: "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
				codeLineHeight: "1.5rem",
				frames: {
					editorBackground: "var(--codeblock-bg)",
					terminalBackground: "var(--codeblock-bg)",
					terminalTitlebarBackground: "var(--codeblock-topbar-bg)",
					editorTabBarBackground: "var(--codeblock-topbar-bg)",
					editorActiveTabBackground: "none",
					editorActiveTabIndicatorBottomColor: "var(--primary)",
					editorActiveTabIndicatorTopColor: "none",
					editorTabBarBorderBottomColor: "var(--codeblock-topbar-bg)",
					terminalTitlebarBorderBottomColor: "none"
				},
				textMarkers: {
					delHue: 0,
					insHue: 180,
					markHue: 250
				}
			},
			frames: {
				showCopyToClipboardButton: false,
			}
		}),
        svelte(),
		sitemap(),
	],
	markdown: {
		// Astro 7 默认改用 Sätteri 处理器；本项目依赖 remark/rehype 生态，显式切回 unified。
		// 顶层的 remarkPlugins / rehypePlugins / remarkRehype 已废弃，插件要传进 unified()。
		processor: unified({
			remarkPlugins: [
				remarkMath,
				remarkReadingTime,
				remarkExcerpt,
				remarkGithubAdmonitionsToDirectives,
				remarkDirective,
				// VLOOK 语法兼容。必须排在 sectionize 之前 ——
				// sectionize 会把标题包进 section，之后就认不出
				// 「引用块首行是六级标题」这种可折叠写法了。
				remarkVLook,
				// 标题编号要在 sectionize 之前，之后标题就被包进 section 了
				remarkVLookHeadings,
				remarkSectionize,
				parseDirectiveNode,
			],
			rehypePlugins: [
				rehypeKatex,
				rehypeSlug,
				// 剥离图片 URL 上的 VLOOK #magic 锚点并转成样式类
				rehypeVLookImage,
				// 表格单元格合并 / 列格式 / 数值列格式化
				rehypeVLookTable,
				[
					rehypeComponents,
					{
						components: {
							github: GithubCardComponent,
							note: (x, y) => AdmonitionComponent(x, y, "note"),
							tip: (x, y) => AdmonitionComponent(x, y, "tip"),
							important: (x, y) => AdmonitionComponent(x, y, "important"),
							caution: (x, y) => AdmonitionComponent(x, y, "caution"),
							warning: (x, y) => AdmonitionComponent(x, y, "warning"),
						},
					},
				],
				[
					rehypeAutolinkHeadings,
					{
						behavior: "append",
						properties: {
							className: ["anchor"],
						},
						content: {
							type: "element",
							tagName: "span",
							properties: {
								className: ["anchor-icon"],
								"data-pagefind-ignore": true,
							},
							children: [
								{
									type: "text",
									value: "#",
								},
							],
						},
					},
				],
			],
		}),
	},
	vite: {
		plugins: [
			tailwindcss(),
			downlevelCss(
				browserslistToTargets(
					browserslist(
						"Chrome >= 90, Safari >= 14, Firefox >= 90, Edge >= 90, iOS >= 14, Android >= 90",
					),
				),
			),
		],
		build: {
			rollupOptions: {
				onwarn(warning, warn) {
					// temporarily suppress this warning
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
		},
	},
});
