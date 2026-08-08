/**
 * 友链存活探测。
 *
 * 友链站点关站、换域名是常态，手动逐个点开检查很费事。这个脚本批量探活，
 * 把结果写进 public/friends-status.json，页面据此把失效的标出来。
 *
 * 用法：
 *   node scripts/check-friends.mjs
 *
 * 判定原则偏保守 —— 网络抖动、对方防爬、CDN 拦截都可能造成误判，所以：
 *   - 先 HEAD，失败再 GET（不少站点不支持 HEAD）
 *   - 4xx 里只有 404/410 才算「失效」，403/429 视为「拦截」不判死
 *   - 超时与网络错误归为「无法访问」，不等同于关站
 */

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TIMEOUT_MS = 12000;
const CONCURRENCY = 6;
const OUTPUT = path.join(process.cwd(), "public", "friends-status.json");

/** 从 src/friends.ts 里抠出 url 列表，避免为一个脚本引入 TS 运行时 */
async function readFriendUrls() {
	const source = await fs.readFile(
		path.join(process.cwd(), "src", "friends.ts"),
		"utf8",
	);
	const urls = [];
	const re = /url:\s*["'`](https?:\/\/[^"'`]+)["'`]/g;
	let m = re.exec(source);
	while (m) {
		urls.push(m[1]);
		m = re.exec(source);
	}
	return [...new Set(urls)];
}

async function request(url, method) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		return await fetch(url, {
			method,
			redirect: "follow",
			signal: controller.signal,
			headers: {
				// 不少站点对无 UA 的请求直接拒绝
				"User-Agent":
					"Mozilla/5.0 (compatible; KirariLinkChecker/1.0; +https://github.com/xhc861)",
				Accept: "text/html,application/xhtml+xml",
			},
		});
	} finally {
		clearTimeout(timer);
	}
}

async function probe(url) {
	try {
		let res = await request(url, "HEAD");
		// 不少站点不支持 HEAD，用 GET 再试一次
		if (res.status === 405 || res.status === 501) {
			res = await request(url, "GET");
		}

		if (res.ok) return { url, status: "ok", code: res.status };
		if (res.status === 404 || res.status === 410) {
			return { url, status: "dead", code: res.status };
		}
		if (res.status === 403 || res.status === 429) {
			return { url, status: "blocked", code: res.status };
		}
		return { url, status: "warn", code: res.status };
	} catch (err) {
		const reason = err?.name === "AbortError" ? "timeout" : "network";
		return { url, status: "unreachable", code: 0, reason };
	}
}

/** 简单的并发闸门，避免一次性打爆对方站点 */
async function mapLimit(items, limit, fn) {
	const out = [];
	let cursor = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
		(async () => {
			while (cursor < items.length) {
				const i = cursor++;
				out[i] = await fn(items[i]);
			}
		})(),
	);
	await Promise.all(workers);
	return out;
}

async function main() {
	const urls = await readFriendUrls();
	if (urls.length === 0) {
		console.error("没有从 src/friends.ts 里解析到任何 url");
		process.exit(1);
	}

	console.log(`探测 ${urls.length} 个友链…`);
	const results = await mapLimit(urls, CONCURRENCY, probe);

	const summary = results.reduce((acc, r) => {
		acc[r.status] = (acc[r.status] || 0) + 1;
		return acc;
	}, {});

	const payload = {
		checkedAt: new Date().toISOString(),
		summary,
		results,
	};

	await fs.writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

	for (const r of results) {
		const mark =
			r.status === "ok" ? "✓" : r.status === "dead" ? "✗" : "!";
		console.log(`  ${mark} [${r.status}] ${r.url}${r.code ? ` (${r.code})` : ""}`);
	}
	console.log(`\n结果已写入 ${path.relative(process.cwd(), OUTPUT)}`);
	console.log(
		Object.entries(summary)
			.map(([k, v]) => `${k}: ${v}`)
			.join("  "),
	);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
