import type { APIRoute } from "astro";

// 该接口每次请求都要取当天的实时日历数据。
// output 为 static 时若不关掉预渲染，会在构建期执行一次并把当天数据烤死在产物里。
export const prerender = false;

/**
 * 今天的农历。
 *
 * 这个路由此前写好了却没人引用，展板那边自己在浏览器里跑了一遍 JSONP ——
 * 挂全局回调、往 <head> 插 script、执行第三方返回的任意 JS。同一件事在服务端
 * 做一次就够了，所以展板改为调这里，JSONP 那条路整个撤掉。
 *
 * 取不到就 success: false 且字段留空。原先失败时把「农历数据加载失败」当作
 * 农历值返回，消费方分不清那是真农历还是错误文案，只能原样显示在页面上。
 */
export const GET: APIRoute = async () => {
	const empty = { lunar: "", jieqi: "", festival: "" };

	try {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const day = String(now.getDate()).padStart(2, "0");

		/*
		 * 这里原本写的是 http://rili.com.cn/rili/json/today/YYYY/MMDD ——
		 * 少了 m. 子域和 .js 后缀，实际会 301 到一个 HTML 页，解析必然失败。
		 * 也就是说这个路由从写下来那天起就只走 catch 分支。
		 * 正确地址是展板旧 JSONP 用的那个，UTF-8，字段齐全。
		 */
		const url = `https://m.rili.com.cn/rili/json/today/${year}/${month}${day}.js`;

		const response = await fetch(url, {
			signal: AbortSignal.timeout(5000),
		});
		const text = await response.text();

		// 解析 JSONP 响应
		const jsonMatch = text.match(/jsonrun_Today\(([\s\S]*)\)\s*;?\s*$/);
		if (!jsonMatch?.[1]) throw new Error("Failed to parse calendar data");

		const data = JSON.parse(jsonMatch[1]);

		return json({
			success: true,
			data: {
				lunar: data.nongli?.yueri?.trim() || "",
				jieqi: data.jieqi?.jieqi?.trim() || "",
				festival: data.jieri?.[0]?.name?.trim() || "",
			},
		});
	} catch (error) {
		console.error("Calendar API error:", error);
		return json({ success: false, data: empty });
	}
};

function json(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			// 农历一天只变一次，让边缘缓存扛住重复请求
			"Cache-Control": "public, max-age=1800, s-maxage=3600",
		},
	});
}
