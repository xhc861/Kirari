import type { APIRoute } from "astro";

export const prerender = false; // 禁用预渲染，使其作为服务端函数运行

export const POST: APIRoute = async ({ request }) => {
	try {
		const { content, title } = await request.json();

		if (!content || !title) {
			return new Response(
				JSON.stringify({ error: "Missing content or title" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Astro 6 起，非 PUBLIC_ 前缀的变量在 import.meta.env 上会被构建期内联，
		// 不再回落为 process.env 引用。服务端密钥必须直接读 process.env 才能拿到运行时值。
		const API_URL =
			process.env.AI_API_URL || "https://api.suanli.cn/v1/chat/completions";
		const API_KEY = process.env.AI_API_KEY;
		const MODEL = process.env.AI_MODEL || "Qwen/Qwen3-VL-32B-Thinking";

		if (!API_KEY) {
			return new Response(JSON.stringify({ error: "API Key not configured" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 限制内容长度
		const maxLength = 8000;
		const truncatedContent =
			content.length > maxLength
				? `${content.substring(0, maxLength)}...`
				: content;

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 55000); // 55秒超时

		try {
			const response = await fetch(API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${API_KEY}`,
				},
				body: JSON.stringify({
					model: MODEL,
					messages: [
						{
							role: "system",
							content:
								"你是一个专业的文章总结助手。请用简洁、清晰的中文总结文章的核心内容，包括主要观点和关键信息。没有字数限制但也不要长篇大论，叙述文章内容，应该针对不同的文章用不同的语气。请使用Markdown格式输出，可以使用标题、列表、加粗等格式来组织内容，使总结更清晰易读。",
						},
						{
							role: "user",
							content: `请总结以下文章：\n\n标题：${title}\n\n内容：${truncatedContent}`,
						},
					],
					max_tokens: 4096,
					temperature: 0.7,
					stream: true,
				}),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				let errorData: { error?: { message?: string } } | undefined;
				try {
					errorData = await response.json();
				} catch {
					errorData = { error: { message: `HTTP ${response.status}` } };
				}
				return new Response(
					JSON.stringify({
						error:
							errorData?.error?.message ||
							`API request failed: ${response.status}`,
					}),
					{
						status: response.status,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			// 直接转发流式响应
			return new Response(response.body, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
					"X-Accel-Buffering": "no", // 禁用nginx缓冲
				},
			});
		} finally {
			clearTimeout(timeoutId);
		}
	} catch (error) {
		console.error("AI Summary API Error:", error);

		// 处理超时错误
		if (error instanceof Error && error.name === "AbortError") {
			return new Response(
				JSON.stringify({
					error: "请求超时，请稍后重试",
				}),
				{
					status: 504,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : "Internal server error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};
