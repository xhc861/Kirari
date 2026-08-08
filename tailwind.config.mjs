import typography from "@tailwindcss/typography";

/*
 * Tailwind v4 通过 `@config`（见 src/styles/global.css）加载本文件。
 * 保留 JS 配置是为了沿用原有的 darkMode / 字体 / typography 设定。
 * 注意：v4 不再支持 corePlugins、safelist、separator 三项。
 */

/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue,mjs}",
	],
	darkMode: "class", // allows toggling dark mode manually
	theme: {
		extend: {
			fontFamily: {
				// 原先取自 tailwindcss/defaultTheme，v4 已无该导出，故直接内联默认字体栈
				sans: [
					"Roboto",
					"sans-serif",
					"ui-sans-serif",
					"system-ui",
					"-apple-system",
					"Segoe UI",
					"Helvetica Neue",
					"Arial",
					"Noto Sans",
					"Apple Color Emoji",
					"Segoe UI Emoji",
					"Segoe UI Symbol",
					"Noto Color Emoji",
				],
			},
		},
	},
	plugins: [typography],
};
