/**
 * 今天的农历信息。
 *
 * 原先这段逻辑长在 CalendarModule 里，而那个模块干的事有一半和展板头部重复 ——
 * 头部已经写着「2026 年 8 月 9 日 · 星期日」，模块里又用同样的大字再写一遍，
 * 真正独有的农历反倒缩成小字。所以模块整个撤掉，农历并进头部，取数逻辑抽到这里。
 *
 * 取数改走站内的 /api/calendar（那个路由早就写好了却一直没人引用）。原来的做法是
 * 在浏览器里跑 JSONP：往 <head> 插 script、挂一个再也没摘下来的全局回调、
 * 执行第三方返回的任意 JS，超时兜底之后迟到的响应还会把结果再改一次。
 * 换成服务端代理后这些问题一并不存在。
 *
 * 取不到就返回 null —— 农历是锦上添花，没有它头部照常显示公历，
 * 不该为此弹错误，也不该在页面上留一句「加载失败」。
 */

export type LunarToday = {
	/** 农历月日，如「七月初七」 */
	lunar: string;
	/** 节气，如「立秋」。非节气日为空 */
	jieqi: string;
	/** 节日，如「七夕节」。非节日为空 */
	festival: string;
};

/** 同一次访问只取一遍，头部与其他消费方共用 */
let inflight: Promise<LunarToday | null> | null = null;

export function fetchLunarToday(): Promise<LunarToday | null> {
	if (typeof window === "undefined") return Promise.resolve(null);
	if (inflight) return inflight;

	inflight = (async () => {
		try {
			// 尾斜杠不能省：站点 trailingSlash 配的是 always，少一个就是 404
			const res = await fetch("/api/calendar/");
			if (!res.ok) return null;

			const body = await res.json();
			if (!body?.success || !body.data?.lunar) return null;

			return {
				lunar: String(body.data.lunar),
				jieqi: String(body.data.jieqi ?? ""),
				festival: String(body.data.festival ?? ""),
			};
		} catch {
			/*
			 * 纯静态部署（没有服务端函数）时这里会 404 —— 属于预期情况，
			 * 头部少一行农历而已，不必惊动控制台。
			 */
			return null;
		}
	})();

	return inflight;
}
