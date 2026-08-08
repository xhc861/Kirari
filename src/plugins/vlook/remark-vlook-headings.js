import { visit } from "unist-util-visit";

/**
 * VLOOK 标题自动编号。
 *
 * 在文章 frontmatter 里写：
 *   vlook-header-autonum: true                      默认阿拉伯数字，1 / 1.1 / 1.1.1
 *   vlook-header-autonum: h1{{第#zh#章}},h2{{#}}     自定义前缀/格式/后缀
 *
 * 格式段可选：# 阿拉伯、zh 中文（一二三）、ZH 大写中文（壹贰叁）、
 * alpha/ALPHA 字母、roman/ROMAN 罗马数字；数字前可加 00/000 补零；
 * 追加 -min 表示只显示本级序号（不带上级前缀）。
 *
 * 六级标题不参与编号 —— VLOOK 把它留给封面与引用块小标题。
 */

const ZH_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const ZH_UPPER = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
const ROMAN = [
	[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
	[100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
	[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

function toZh(n, upper) {
	const digits = upper ? ZH_UPPER : ZH_DIGITS;
	if (n <= 0) return String(n);
	if (n < 10) return digits[n];
	if (n < 20) return n === 10 ? "十" : `十${digits[n % 10]}`;
	if (n < 100) {
		const t = Math.floor(n / 10);
		const r = n % 10;
		return `${digits[t]}十${r ? digits[r] : ""}`;
	}
	return String(n);
}

function toAlpha(n, upper) {
	let s = "";
	let x = n;
	while (x > 0) {
		const r = (x - 1) % 26;
		s = String.fromCharCode(65 + r) + s;
		x = Math.floor((x - 1) / 26);
	}
	return upper ? s : s.toLowerCase();
}

function toRoman(n, upper) {
	let x = n;
	let s = "";
	for (const [v, sym] of ROMAN) {
		while (x >= v) {
			s += sym;
			x -= v;
		}
	}
	return upper ? s : s.toLowerCase();
}

/** 把一个数字按格式段渲染出来 */
function renderNumber(n, format) {
	const pad = /^(0+)/.exec(format);
	const body = format.replace(/^0+/, "").replace(/-min$/, "");

	let out;
	if (body === "zh") out = toZh(n, false);
	else if (body === "ZH") out = toZh(n, true);
	else if (body === "alpha") out = toAlpha(n, false);
	else if (body === "ALPHA") out = toAlpha(n, true);
	else if (body === "roman") out = toRoman(n, false);
	else if (body === "ROMAN") out = toRoman(n, true);
	else out = String(n);

	if (pad && /^\d+$/.test(out)) {
		out = out.padStart(pad[1].length + 1, "0");
	}
	return out;
}

/** 解析 h1{{前缀#格式#后缀}},h2{{...}} */
function parsePattern(spec) {
	const map = {};
	if (typeof spec !== "string") return map;
	const re = /h([1-5])\{\{(.*?)\}\}/g;
	let m = re.exec(spec);
	while (m) {
		const level = Number(m[1]);
		const parts = m[2].split("#");
		// 前缀#格式#后缀；只写一段时视为格式
		if (parts.length >= 3) {
			map[level] = {
				prefix: parts[0],
				format: parts.slice(1, -1).join("#") || "#",
				suffix: parts[parts.length - 1],
			};
		} else {
			map[level] = { prefix: "", format: m[2] || "#", suffix: "" };
		}
		m = re.exec(spec);
	}
	return map;
}

export function remarkVLookHeadings() {
	return (tree, file) => {
		const fm =
			file?.data?.astro?.frontmatter ?? file?.data?.frontmatter ?? {};
		const spec = fm["vlook-header-autonum"];
		if (!spec) return;

		const patterns = spec === true ? {} : parsePattern(spec);
		const counters = [0, 0, 0, 0, 0]; // h1..h5

		visit(tree, "heading", (node) => {
			const level = node.depth;
			if (level < 1 || level > 5) return; // 六级留给封面/小标题

			counters[level - 1] += 1;
			for (let i = level; i < counters.length; i++) counters[i] = 0;

			const conf = patterns[level] ?? { prefix: "", format: "#", suffix: "" };
			const minOnly = /-min$/.test(conf.format);
			if (conf.format === "none") return;

			let numText;
			if (minOnly) {
				numText = renderNumber(counters[level - 1], conf.format);
			} else {
				/*
				 * 文章正文通常从 ## 起步（# 留给文章标题），此时 h1 计数器恒为 0，
				 * 直接拼接会得到 "0.1" 这种前导零。所以从第一个真正用到的层级开始。
				 */
				const seq = counters.slice(0, level);
				const start = seq.findIndex((n) => n > 0);
				const from = start === -1 ? level - 1 : start;
				numText = seq
					.slice(from)
					.map((n, i) =>
						renderNumber(n, patterns[from + i + 1]?.format ?? "#"),
					)
					.join(".");
			}

			const label = `${conf.prefix}${numText}${conf.suffix}`;
			node.children.unshift({
				type: "html",
				value: `<span class="vk-heading-num">${label}</span>`,
			});
		});
	};
}
