import type { APIRoute } from "astro";

// 该接口每次请求都要取当天的实时日历数据。
// output 为 static 时若不关掉预渲染，会在构建期执行一次并把当天数据烤死在产物里。
export const prerender = false;

export const GET: APIRoute = async () => {
	try {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const day = String(now.getDate()).padStart(2, "0");

		// 使用 HTTP 协议避免证书问题
		const url = `http://rili.com.cn/rili/json/today/${year}/${month}${day}`;

		const response = await fetch(url);
		const text = await response.text();

		// 解析 JSONP 响应
		const jsonMatch = text.match(/jsonrun_Today\(([\s\S]*)\);?\s*$/);
		if (jsonMatch?.[1]) {
			const data = JSON.parse(jsonMatch[1]);

			return new Response(
				JSON.stringify({
					success: true,
					data: {
						date: data.yangli?.date || `${year}年${month}月${day}日`,
						weekday: data.yangli?.xingqi || "",
						lunar: data.nongli?.yueri || "",
						jieqi: data.jieqi?.jieqi || "",
						constellation: data.xingzuo?.xingzuo || "",
					},
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		}

		throw new Error("Failed to parse calendar data");
	} catch (error) {
		console.error("Calendar API error:", error);

		// 返回默认数据
		const now = new Date();
		const year = now.getFullYear();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const weekdays = [
			"星期日",
			"星期一",
			"星期二",
			"星期三",
			"星期四",
			"星期五",
			"星期六",
		];

		return new Response(
			JSON.stringify({
				success: false,
				data: {
					date: `${year}年${month}月${day}日`,
					weekday: weekdays[now.getDay()],
					lunar: "农历数据加载失败",
					jieqi: "",
					constellation: "",
				},
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);
	}
};
