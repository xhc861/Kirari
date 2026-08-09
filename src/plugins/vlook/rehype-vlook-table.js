import { visit } from "unist-util-visit";

/**
 * VLOOK 表格增强（rehype 层）。
 *
 * 支持：
 *   ==   单元格内只写 == ：向左合并（colspan）
 *   :    单元格内只写 :  ：向上合并（rowspan）
 *   表头加粗          该列整列加粗
 *   表头斜体          该列整列斜体
 *   表头删除线        该列不输出到 HTML
 *   列右对齐          该列数字自动格式化（千分位、正负号着色、百分比进度条）
 *
 * 合并必须在网格坐标系上做：先按行处理横向合并，再按「列坐标」处理纵向合并，
 * 否则前面合并造成的列偏移会让后面的坐标全错。
 */

const MERGE_LEFT = "==";
const MERGE_UP = ":";

function textOf(node) {
	if (!node) return "";
	if (node.type === "text") return node.value;
	if (node.children) return node.children.map(textOf).join("");
	return "";
}

function isElement(node, tagNames) {
	return node?.type === "element" && tagNames.includes(node.tagName);
}

function addClass(node, ...classes) {
	node.properties = node.properties || {};
	const prev = node.properties.className;
	const list = Array.isArray(prev) ? prev : prev ? [String(prev)] : [];
	node.properties.className = [...list, ...classes];
}

/** 收集 thead / tbody 下的所有行，保持文档顺序 */
function collectRows(table) {
	const rows = [];
	visit(table, "element", (n) => {
		if (n.tagName === "tr") rows.push(n);
	});
	return rows;
}

function cellsOf(row) {
	return row.children.filter((c) => isElement(c, ["td", "th"]));
}

/** 该列是否右对齐（Markdown 的 :---: / ---: 会写成 style 或 align） */
function isRightAligned(cell) {
	const style = cell?.properties?.style;
	if (typeof style === "string" && /text-align\s*:\s*right/.test(style))
		return true;
	return cell?.properties?.align === "right";
}

/** 千分位 + 小数缩小 + 正负号着色；百分比额外给进度条 */
function formatNumeric(cell) {
	const raw = textOf(cell).trim();
	if (!raw || raw === "—") return;

	const pct = /^([+-]?\d+(?:\.\d+)?)\s*%$/.exec(raw);
	const num = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(raw);

	if (pct) {
		const value = Number(pct[1]);
		if (!Number.isFinite(value)) return;
		addClass(cell, "vk-num", "vk-pct");
		cell.children = [
			{
				type: "element",
				tagName: "span",
				properties: { className: ["vk-pct-value"] },
				children: [{ type: "text", value: pct[1] }],
			},
			{
				type: "element",
				tagName: "span",
				properties: { className: ["vk-pct-sign"] },
				children: [{ type: "text", value: "%" }],
			},
			{
				type: "element",
				tagName: "span",
				properties: {
					className: ["vk-pct-bar"],
					style: `--vk-pct:${Math.max(0, Math.min(100, value))}%`,
				},
				children: [],
			},
		];
		return;
	}

	if (!num) return;
	const sign = num[1];
	const intPart = num[2].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	const decPart = num[3];

	addClass(cell, "vk-num");
	if (sign === "+") addClass(cell, "vk-num-pos");
	if (sign === "-") addClass(cell, "vk-num-neg");

	const children = [];
	if (sign) {
		children.push({
			type: "element",
			tagName: "span",
			properties: { className: ["vk-num-sign"] },
			children: [{ type: "text", value: sign }],
		});
	}
	children.push({ type: "text", value: intPart });
	if (decPart) {
		children.push({
			type: "element",
			tagName: "span",
			properties: { className: ["vk-num-dec"] },
			children: [{ type: "text", value: `.${decPart}` }],
		});
	}
	cell.children = children;
}

/** 表头是否被某种行内格式整体包裹 */
function headerFormat(th) {
	const kids = (th.children || []).filter(
		(c) => !(c.type === "text" && c.value.trim() === ""),
	);
	if (kids.length !== 1 || kids[0].type !== "element") return null;
	const tag = kids[0].tagName;
	if (tag === "strong") return "bold";
	if (tag === "em") return "italic";
	if (tag === "mark") return "mark";
	if (tag === "del" || tag === "s") return "drop";
	return null;
}

export function rehypeVLookTable() {
	return (tree) => {
		visit(tree, "element", (table) => {
			if (table.tagName !== "table") return;

			const rows = collectRows(table);
			if (rows.length === 0) return;

			// 纯标记类，供样式钩子使用；不带任何布局属性，避免改动既有表格排版
			addClass(table, "vk-table");

			/* ---------- 1. 横向合并：单元格内容为 == ---------- */
			for (const row of rows) {
				const cells = cellsOf(row);
				for (let i = cells.length - 1; i >= 1; i--) {
					if (textOf(cells[i]).trim() !== MERGE_LEFT) continue;
					const target = cells[i - 1];
					const span = Number(target.properties?.colSpan ?? 1) || 1;
					target.properties = target.properties || {};
					target.properties.colSpan = span + 1;
					row.children.splice(row.children.indexOf(cells[i]), 1);
				}
			}

			/* ---------- 2. 纵向合并：单元格内容为 : ---------- */
			// 以网格坐标定位「正上方」的单元格，避开横向合并造成的列偏移
			const anchors = new Map(); // 列坐标 -> 可继续向下扩展的单元格
			for (const row of rows) {
				const cells = cellsOf(row);
				let col = 0;
				for (const cell of [...cells]) {
					const span = Number(cell.properties?.colSpan ?? 1) || 1;
					if (textOf(cell).trim() === MERGE_UP) {
						const target = anchors.get(col);
						if (target) {
							const rs = Number(target.properties?.rowSpan ?? 1) || 1;
							target.properties = target.properties || {};
							target.properties.rowSpan = rs + 1;
							const wasFirstColumn = col === 0;
							row.children.splice(row.children.indexOf(cell), 1);
							/*
							 * 首列被合并掉之后，原本的第二列成了这一行的 :first-child。
							 * Tailwind Typography 有一条 `td:first-child { padding-inline-start: 0 }`
							 * ——本意是让首列与正文左边界对齐，这里却误伤了第二列，
							 * 表现为该格内容比上一行同列的内容偏左。打个标记，样式里补回来。
							 */
							if (wasFirstColumn) {
								const rest = cellsOf(row);
								if (rest[0]) addClass(rest[0], "vk-cell-indent");
							}
						}
					} else {
						anchors.set(col, cell);
					}
					col += span;
				}
			}

			/* ---------- 3. 表头列格式 + 数值列 ---------- */
			const headRow = rows.find((r) =>
				cellsOf(r).some((c) => c.tagName === "th"),
			);
			if (!headRow) return;

			const headCells = cellsOf(headRow);
			const dropCols = new Set();
			const colClass = new Map();

			headCells.forEach((th, idx) => {
				const fmt = headerFormat(th);
				if (fmt === "drop") dropCols.add(idx);
				else if (fmt === "bold") colClass.set(idx, "vk-col-bold");
				else if (fmt === "italic") colClass.set(idx, "vk-col-italic");
				else if (fmt === "mark") colClass.set(idx, "vk-col-mark");
			});

			const numericCols = new Set();
			headCells.forEach((th, idx) => {
				if (isRightAligned(th)) numericCols.add(idx);
			});

			for (const row of rows) {
				const cells = cellsOf(row);
				// 从后往前删，避免索引位移
				for (let idx = cells.length - 1; idx >= 0; idx--) {
					if (dropCols.has(idx)) {
						row.children.splice(row.children.indexOf(cells[idx]), 1);
						continue;
					}
					const cls = colClass.get(idx);
					if (cls) addClass(cells[idx], cls);
					if (numericCols.has(idx) && cells[idx].tagName === "td") {
						formatNumeric(cells[idx]);
					}
				}
			}

		});
	};
}
