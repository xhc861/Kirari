/*
 * 构建/开发前清掉 Astro 内容层的缓存。
 *
 * Astro 把每篇 Markdown **渲染好的 HTML** 缓存在 node_modules/.astro/data-store.json。
 * 改 src/plugins/vlook/ 下的 remark / rehype 插件不会让它失效 —— 于是组件、样式
 * 都是新的，唯独文章正文还是旧的 HTML。这种「只坏一半」的表现极难对上号：
 * 2026-08-09 修 VLOOK 着色时，源码已改、产物时间戳也是新的，输出却纹丝不动。
 *
 * 本站文章数量很少，全量重渲染的代价可以忽略，不值得为这点构建时间冒险。
 * Vercel 会在两次部署之间复用 node_modules，所以线上同样会踩到，这里一并覆盖。
 */

import fs from "node:fs";
import path from "node:path";

const targets = [
	path.join("node_modules", ".astro", "data-store.json"),
	path.join(".astro", "collections"),
];

for (const target of targets) {
	try {
		fs.rmSync(target, { recursive: true, force: true });
	} catch (err) {
		// 缓存不存在是常态（首次构建、CI 全新环境），不该让构建失败
		if (err?.code !== "ENOENT") {
			console.warn(`[clean-content-cache] 跳过 ${target}：${err.message}`);
		}
	}
}
