/**
 * VLOOK 预置色号。
 *
 * VLOOK 用两位字母的色号驱动几乎所有着色特性，写法是「下划线斜体 + 下标」，
 * 例如 _~Ye~_、_~Rd!~_（带 ! 为实心强调式）、_~RdGn~_（渐变，色号相连）。
 *
 * 这里给出与 VLOOK 语义对应的一组颜色。取值按亮/暗两套分别给，避免深色模式
 * 下低亮度色号糊成一团。
 */

export const VLOOK_COLORS = {
	Wn: { name: "warn", light: "#c2410c", dark: "#fb923c" },
	Rd: { name: "red", light: "#dc2626", dark: "#f87171" },
	Og: { name: "orange", light: "#ea580c", dark: "#fb923c" },
	Ye: { name: "yellow", light: "#ca8a04", dark: "#facc15" },
	Lm: { name: "lime", light: "#65a30d", dark: "#a3e635" },
	Gn: { name: "green", light: "#16a34a", dark: "#4ade80" },
	Mn: { name: "mint", light: "#0d9488", dark: "#5eead4" },
	Ol: { name: "olive", light: "#4d7c0f", dark: "#a3e635" },
	Aq: { name: "aqua", light: "#0891b2", dark: "#67e8f9" },
	Cy: { name: "cyan", light: "#0e7490", dark: "#22d3ee" },
	Bu: { name: "blue", light: "#2563eb", dark: "#60a5fa" },
	Se: { name: "sea", light: "#1d4ed8", dark: "#93c5fd" },
	La: { name: "lavender", light: "#7c3aed", dark: "#c4b5fd" },
	Vn: { name: "violet", light: "#6d28d9", dark: "#a78bfa" },
	Pu: { name: "purple", light: "#9333ea", dark: "#d8b4fe" },
	Ro: { name: "rose", light: "#e11d48", dark: "#fb7185" },
	Pk: { name: "pink", light: "#db2777", dark: "#f9a8d4" },
	Gd: { name: "gold", light: "#b45309", dark: "#fbbf24" },
	Bn: { name: "brown", light: "#78350f", dark: "#d6a06a" },
	Gy: { name: "grey", light: "#4b5563", dark: "#9ca3af" },
	Bk: { name: "black", light: "#111827", dark: "#e5e7eb" },
	Wt: { name: "white", light: "#f9fafb", dark: "#f9fafb" },
	// 主题色，跟随站点 --primary
	T1: { name: "theme1", light: "var(--primary)", dark: "var(--primary)" },
	T2: { name: "theme2", light: "var(--btn-content)", dark: "var(--btn-content)" },
};

/** 所有色号，按长度降序排列，保证匹配渐变时优先吃掉更长的组合 */
export const COLOR_CODES = Object.keys(VLOOK_COLORS);

/** 匹配一个色号串：一个或多个两位色号相连，末尾可跟 ! 表示实心强调 */
const CODE_ALTERNATION = COLOR_CODES.join("|");
export const COLOR_SEQ_RE = new RegExp(
	`^((?:${CODE_ALTERNATION})+)(!?)$`,
);

/**
 * 把色号串拆成单个色号数组。
 * 因为所有色号都是固定两位，直接按 2 切即可。
 */
export function splitCodes(seq) {
	const out = [];
	for (let i = 0; i < seq.length; i += 2) {
		const code = seq.slice(i, i + 2);
		if (VLOOK_COLORS[code]) out.push(code);
	}
	return out;
}

/**
 * 由色号数组生成颜色值：单色直接返回，多色生成线性渐变。
 *
 * 注意多色时返回的是 linear-gradient(...)，不是颜色 —— 它只能用作 background，
 * 塞给 color 属性是无效值。样式表里靠 .vk-gradient 类走 background-clip: text。
 *
 * @param {string[]} codes
 * @param {"light"|"dark"} mode
 */
export function colorValue(codes, mode) {
	if (codes.length === 0) return null;
	if (codes.length === 1) return VLOOK_COLORS[codes[0]][mode];
	const stops = codes.map((c) => VLOOK_COLORS[c][mode]).join(", ");
	return `linear-gradient(90deg, ${stops})`;
}
