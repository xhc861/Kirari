import { visit } from "unist-util-visit";

/**
 * VLOOK 图片「#魔法」。
 *
 * VLOOK 把排版指令写成图片路径末尾的 URL 锚点，例如：
 *   ![](a.png#50%)      按比例缩放
 *   ![](a.png#400w)     指定宽度
 *   ![](a.png#round)    圆角
 *   ![](a.png#logo#left) 原始尺寸并左浮动、文字环绕
 *   ![](a.png#gray!)    灰度滤镜，! 表示悬停时恢复原样
 *
 * 这些锚点必须在图片节点成型之后剥离，否则会被当成真实 URL 的一部分请求。
 */

const SCALE = new Set(["20%", "40%", "60%", "80%"]);
const LAYOUT = new Set([
	"icon",
	"icon2x",
	"logo",
	"left",
	"right",
	"border",
	"round",
	"round2s",
	"line",
	"block",
	"padding",
]);
const FILTER = new Set(["invert", "blur", "aged", "gray"]);
const TRANSFORM = new Set(["180deg", "fliph", "flipv"]);

export function rehypeVLookImage() {
	return (tree) => {
		visit(tree, "element", (node) => {
			if (node.tagName !== "img") return;
			const src = node.properties?.src;
			if (typeof src !== "string" || !src.includes("#")) return;

			const [cleanSrc, ...rawTokens] = src.split("#");
			if (rawTokens.length === 0) return;

			const classes = [];
			const styles = [];

			for (const rawToken of rawTokens) {
				if (!rawToken) continue;
				// 尾部 ! 表示悬停恢复原样（仅滤镜类支持）
				const restoreOnHover = rawToken.endsWith("!");
				const token = restoreOnHover ? rawToken.slice(0, -1) : rawToken;

				if (SCALE.has(token)) {
					styles.push(`width:${token}`);
					classes.push("vk-img-scaled");
					continue;
				}
				// 宽度 / 高度：#400w、#600h
				const dim = /^(\d+)([wh])$/.exec(token);
				if (dim) {
					styles.push(
						dim[2] === "w" ? `width:${dim[1]}px` : `height:${dim[1]}px`,
					);
					classes.push("vk-img-scaled");
					continue;
				}
				if (LAYOUT.has(token)) {
					classes.push(`vk-img-${token}`);
					continue;
				}
				if (FILTER.has(token)) {
					classes.push(`vk-img-${token}`);
					if (restoreOnHover) classes.push("vk-img-restore");
					continue;
				}
				if (TRANSFORM.has(token)) {
					classes.push(`vk-img-${token.replace(/^180deg$/, "rot180")}`);
					continue;
				}
				// 无法识别的锚点原样留在 URL 上，避免误伤真实的片段标识
				if (!classes.length && !styles.length) return;
			}

			if (classes.length === 0 && styles.length === 0) return;

			node.properties.src = cleanSrc;

			const existing = node.properties.className;
			const prev = Array.isArray(existing)
				? existing
				: existing
					? [existing]
					: [];
			node.properties.className = [...prev, "vk-img", ...classes];

			if (styles.length > 0) {
				const prevStyle = node.properties.style
					? `${node.properties.style};`
					: "";
				node.properties.style = prevStyle + styles.join(";");
			}
		});
	};
}
