import { h } from "hastscript";
import { visit } from "unist-util-visit";
import { COLOR_SEQ_RE, colorValue, splitCodes } from "./colors.js";

/**
 * VLOOK 语法兼容（remark 层）。
 *
 * VLOOK 把若干标准 Markdown 组合重新赋予了含义，本插件识别其中最常用的一批：
 *
 *   _~Rd~_          色号：给前面的文字/段落着色，末尾 ! 为实心强调式
 *   _~RdGn~_        渐变色号：多个色号相连
 *   *==题注==*      题注，自动编号（图 1 / 表 1 …）
 *   ==高亮==        高亮（Typora 语法，GFM 不解析，这里补上）
 *   *`标签`*        标签
 *   _^汉字(pinyin)^_ 注音
 *   > ###### 标题   可折叠引用块
 *
 * 说明：色号写法之所以用「下划线斜体 + 波浪线」，是为了避开 Typora 里单星号
 * 斜体与加粗的冲突 —— 这是 VLOOK 自己的设计，不是这里的选择。
 */

/** 段落中只含这一个节点时，视为「独占一行」 */
function isSoleChild(parent, node) {
	const meaningful = parent.children.filter(
		(c) => !(c.type === "text" && c.value.trim() === ""),
	);
	return meaningful.length === 1 && meaningful[0] === node;
}

/** 把 mdast 节点数组还原成纯文本，用于取标签/注音的内容 */
function toText(nodes) {
	let out = "";
	for (const n of nodes) {
		if (n.type === "text" || n.type === "inlineCode") out += n.value;
		else if (n.children) out += toText(n.children);
	}
	return out;
}

/** 生成一个渲染为原始 HTML 的 mdast 节点 */
function html(value) {
	return { type: "html", value };
}

function escapeHtml(s) {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/**
 * 色号 → 内联样式。亮暗两套颜色通过 CSS 变量交给样式表切换，
 * 避免在 HTML 里写死只适配一种主题的颜色。
 */
function colorStyle(codes, emphasis) {
	const light = colorValue(codes, "light");
	const dark = colorValue(codes, "dark");
	const isGradient = codes.length > 1;
	const parts = [`--vk-c:${light}`, `--vk-c-dark:${dark}`];
	if (isGradient) parts.push("--vk-gradient:1");
	return parts.join(";");
}

export function remarkVLook() {
	return (tree) => {
		/* ---------- 1. ==高亮==（GFM 不解析，先补成 mark 节点） ---------- */
		visit(tree, "text", (node, index, parent) => {
			if (!parent || index === null) return;
			if (!node.value.includes("==")) return;

			const parts = [];
			const re = /==([^=]+)==/g;
			let last = 0;
			let m = re.exec(node.value);
			if (!m) return;
			while (m) {
				if (m.index > last) {
					parts.push({ type: "text", value: node.value.slice(last, m.index) });
				}
				parts.push({
					type: "vlookMark",
					value: m[1],
					data: { hName: "mark", hChildren: [{ type: "text", value: m[1] }] },
				});
				last = m.index + m[0].length;
				m = re.exec(node.value);
			}
			if (last < node.value.length) {
				parts.push({ type: "text", value: node.value.slice(last) });
			}
			parent.children.splice(index, 1, ...parts);
			return index + parts.length;
		});

		/* ---------- 2. 注音 _^汉字(pinyin)^_ ---------- */
		visit(tree, "emphasis", (node, index, parent) => {
			if (!parent || index === null) return;
			const text = toText(node.children);
			const m = /^\^(.+?)\^$/.exec(text);
			if (!m) return;
			const inner = m[1];
			const rm = /^(.*?)[(（](.+?)[)）]$/.exec(inner);
			if (!rm) return;
			parent.children[index] = html(
				`<ruby class="vk-ruby">${escapeHtml(rm[1])}<rp>(</rp><rt>${escapeHtml(rm[2])}</rt><rp>)</rp></ruby>`,
			);
		});

		/* ---------- 3. 标签 *`标签`* ---------- */
		visit(tree, "emphasis", (node, index, parent) => {
			if (!parent || index === null) return;
			if (node.children.length !== 1) return;
			if (node.children[0].type !== "inlineCode") return;
			parent.children[index] = html(
				`<span class="vk-tag">${escapeHtml(node.children[0].value)}</span>`,
			);
		});

		/* ---------- 4. 色号 _~Rd~_ / _~RdGn!~_ ---------- */
		visit(tree, "emphasis", (node, index, parent) => {
			if (!parent || index === null) return;
			// remark-gfm 的 singleTilde 会把 ~Rd~ 解析成 delete 节点
			const only = node.children.length === 1 ? node.children[0] : null;
			if (!only || only.type !== "delete") return;

			const raw = toText(only.children).trim();
			const m = COLOR_SEQ_RE.exec(raw);
			if (!m) return;

			const codes = splitCodes(m[1]);
			if (codes.length === 0) return;
			const solid = m[2] === "!";
			const style = colorStyle(codes, solid);

			// 独占一行 → 给整段/整个引用块着色，否则只给前面的内容着色
			const sole = isSoleChild(parent, node);
			if (sole) {
				// 标记宿主：段落着色由父节点承担，这里留一个隐藏标记节点
				parent.data = parent.data || {};
				parent.data.hProperties = parent.data.hProperties || {};
				const cls = ["vk-colored", solid ? "vk-solid" : "vk-outline"];
				parent.data.hProperties.class = [
					...(parent.data.hProperties.class
						? String(parent.data.hProperties.class).split(" ")
						: []),
					...cls,
				].join(" ");
				parent.data.hProperties.style = style;
				// 移除色号本身，它只是标记不该显示
				parent.children.splice(index, 1);
				return index;
			}

			parent.children[index] = html(
				`<span class="vk-color ${solid ? "vk-solid" : ""}" style="${style}"></span>`,
			);
		});

		/* ---------- 5. 题注 *==题注==*（独占一行，自动编号） ---------- */
		let figureNo = 0;
		visit(tree, "paragraph", (node, index, parent) => {
			if (!parent || index === null) return;
			const kids = node.children.filter(
				(c) => !(c.type === "text" && c.value.trim() === ""),
			);
			if (kids.length !== 1 || kids[0].type !== "emphasis") return;
			const em = kids[0];
			if (em.children.length !== 1 || em.children[0].type !== "vlookMark")
				return;

			figureNo += 1;
			parent.children[index] = html(
				`<figcaption class="vk-caption"><span class="vk-caption-no">图 ${figureNo}</span>${escapeHtml(em.children[0].value)}</figcaption>`,
			);
		});

		/* ---------- 6. 可折叠引用块 > ###### 标题 ---------- */
		visit(tree, "blockquote", (node) => {
			const first = node.children[0];
			if (!first || first.type !== "heading" || first.depth !== 6) return;
			const title = toText(first.children);
			node.children.shift();
			node.data = node.data || {};
			node.data.hName = "details";
			node.data.hProperties = { class: "vk-collapse" };
			node.children.unshift({
				type: "html",
				value: `<summary class="vk-collapse-title">${escapeHtml(title)}</summary>`,
			});
		});
	};
}
