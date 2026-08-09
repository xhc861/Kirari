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
function colorStyle(codes) {
	return [
		`--vk-c:${colorValue(codes, "light")}`,
		`--vk-c-dark:${colorValue(codes, "dark")}`,
	].join(";");
}

/**
 * 着色用的包裹节点。
 *
 * 用自定义类型而不是复用 emphasis：后面的刮刮卡那一步会把「含 strong 子节点的
 * emphasis」当成刮刮卡，写 `**粗体** _~Rd~_` 就会被误判。自定义类型不会被
 * 任何 visit(tree, "emphasis") 命中，交给 mdast-util-to-hast 的兜底处理，
 * 按 data.hName 渲染成 span。
 */
function colorNode(children, codes, solid) {
	const className = ["vk-color"];
	if (codes.length > 1) className.push("vk-gradient");
	if (solid) className.push("vk-solid");
	return {
		type: "vlookColor",
		data: { hName: "span", hProperties: { className, style: colorStyle(codes) } },
		children,
	};
}

/*
 * 色号作用于「前面那段文字」，需要切出这段文字的范围。
 * 从末尾往前取，遇到分隔符停下 —— 否则 `蓝色 _~Bu~_ ／ 绿色 _~Gn~_` 里
 * 绿色那个色号会把「蓝色 ／ 绿色」整串都吃掉。
 * 空格不算分隔符，这样「这段是红色」这种带空格的短语仍能整体着色。
 */
const SEPARATORS = "：:，,。；;！!？?、／/｜|（()）【】「」《》";
const RUN_RE = new RegExp(`[^${SEPARATORS}]+$`);

function splitTrailingRun(value) {
	const trimmed = value.replace(/\s+$/, "");
	if (!trimmed) return null;
	const m = RUN_RE.exec(trimmed);
	if (!m) return null;
	let run = m[0];
	const lead = /^\s+/.exec(run);
	const before = value.slice(0, m.index) + (lead ? lead[0] : "");
	if (lead) run = run.slice(lead[0].length);
	if (!run) return null;
	return { before, run };
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
		/*
		 * 色号是个「后置标记」：它给前面的内容着色，自己不显示。
		 *
		 * 原实现在原地留下一个空的 <span class="vk-color" style="--vk-c:…">，
		 * 而样式是 .vk-color { color: var(--vk-c) } —— 空元素没有文字可染，
		 * 于是所有着色全部失效。正确做法是把前面那段内容包进 span 里。
		 */
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

			// 独占一行的留给下一步按块处理，这里只管行内
			if (isSoleChild(parent, node)) return;

			const prev = parent.children[index - 1];

			if (prev && prev.type === "text") {
				const split = splitTrailingRun(prev.value);
				if (split) {
					const nodes = [];
					if (split.before) nodes.push({ type: "text", value: split.before });
					nodes.push(
						colorNode([{ type: "text", value: split.run }], codes, solid),
					);
					parent.children.splice(index - 1, 2, ...nodes);
					return index - 1 + nodes.length;
				}
			}

			// 前面是行内代码、加粗之类的完整节点，整个包起来
			if (prev && prev.type !== "text") {
				parent.children.splice(index - 1, 2, colorNode([prev], codes, solid));
				return index;
			}

			// 前面没有可着色的内容，标记本身不该显示，直接丢掉
			parent.children.splice(index, 1);
			return index;
		});

		/* ---------- 4b. 独占一行的色号：作用于整段 / 整个引用块 ---------- */
		visit(tree, "paragraph", (node, index, parent) => {
			if (!parent || index === null) return;
			const kids = node.children.filter(
				(c) => !(c.type === "text" && c.value.trim() === ""),
			);
			if (kids.length !== 1) return;
			const em = kids[0];
			if (em.type !== "emphasis") return;
			const only = em.children.length === 1 ? em.children[0] : null;
			if (!only || only.type !== "delete") return;

			const m = COLOR_SEQ_RE.exec(toText(only.children).trim());
			if (!m) return;
			const codes = splitCodes(m[1]);
			if (codes.length === 0) return;
			const solid = m[2] === "!";

			/*
			 * 宿主的选择：色号自成一段时，它修饰的是所在的引用块，或紧邻的上一段。
			 * 原来一律标在色号自己那个段落上，结果是渲染出一个空的带边框段落，
			 * 而真正该着色的内容毫无变化。
			 */
			const host =
				parent.type === "blockquote"
					? parent
					: index > 0
						? parent.children[index - 1]
						: null;

			if (!host) return;

			host.data = host.data || {};
			host.data.hProperties = host.data.hProperties || {};
			const prevClass = host.data.hProperties.className;
			host.data.hProperties.className = [
				...(Array.isArray(prevClass) ? prevClass : prevClass ? [prevClass] : []),
				"vk-colored",
				solid ? "vk-solid" : "vk-outline",
			];
			host.data.hProperties.style = colorStyle(codes);

			// 色号那一段只是标记，不该出现在页面上
			parent.children.splice(index, 1);
			return index;
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


		/* ---------- 7. 按钮链接 [<kbd>文字</kbd>](url) ---------- */
		visit(tree, "link", (node, index, parent) => {
			if (!parent || index === null) return;
			/*
			 * <kbd> 会被 remark 解析成独立的 html 节点（开标签、文本、闭标签三段），
			 * 不是包裹结构，所以要把子节点原样拼起来再匹配，
			 * toText 只取文本会漏掉标签本身。
			 */
			const raw = node.children
				.map((c) =>
					c.type === "html" ? c.value : c.type === "text" ? c.value : "",
				)
				.join("")
				.trim();
			const m = /^<kbd>([\s\S]*?)<\/kbd>$/.exec(raw);
			if (!m) return;
			parent.children[index] = html(
				`<a class="vk-btn-link" href="${escapeHtml(node.url)}">${escapeHtml(m[1])}</a>`,
			);
		});

		/* ---------- 8. 进度条 **==75%==** ---------- */
		visit(tree, "strong", (node, index, parent) => {
			if (!parent || index === null) return;
			const only = node.children.length === 1 ? node.children[0] : null;
			if (!only || only.type !== "vlookMark") return;
			const m = /^(\d{1,3}(?:\.\d+)?)\s*%$/.exec(String(only.value).trim());
			if (!m) return;
			const pct = Math.min(100, Math.max(0, Number(m[1])));
			parent.children[index] = html(
				`<span class="vk-progress" role="img" aria-label="进度 ${pct}%">` +
					`<span class="vk-progress-track"><span class="vk-progress-fill" style="width:${pct}%"></span></span>` +
					`<span class="vk-progress-num">${m[1]}%</span></span>`,
			);
		});

		/* ---------- 9. 刮刮卡 *提示**内容*** ---------- */
		// 斜体里嵌加粗：提示文字用斜体，被遮住的内容用加粗
		visit(tree, "emphasis", (node, index, parent) => {
			if (!parent || index === null) return;
			const strong = node.children.find((c) => c.type === "strong");
			if (!strong) return;
			const hint = toText(node.children.filter((c) => c !== strong)).trim();
			const secret = toText(strong.children);
			if (!secret) return;
			parent.children[index] = html(
				`<span class="vk-scratch" tabindex="0" role="button" ` +
					`aria-label="${escapeHtml(hint || "点击显示")}">` +
					`<span class="vk-scratch-text">${escapeHtml(secret)}</span></span>`,
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
