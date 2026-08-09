export function formatDateToYYYYMMDD(date: Date): string {
	return date.toISOString().substring(0, 10);
}

/**
 * 「3 天前」这类相对时间。
 *
 * 展板上的条目大多只需要知道新旧 —— 写着 `2026-02-05 21:57` 的时候，
 * 得先心算一遍才知道那是上周还是半年前。精确时间留给 title 提示。
 *
 * 按**自然日**算差，不按 24 小时算：昨晚 23 点和今早 1 点差两小时，
 * 但人会说「昨天」，不会说「今天」。
 */
export function relativeDay(date: Date, now: Date = new Date()): string {
	if (Number.isNaN(date.getTime())) return "";

	const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const days = Math.round((n0.getTime() - d0.getTime()) / 86400000);

	if (days === 0) return "今天";
	if (days === 1) return "昨天";
	if (days === 2) return "前天";
	if (days === -1) return "明天";
	if (days === -2) return "后天";

	const ahead = days < 0;
	const n = Math.abs(days);
	const suffix = ahead ? "后" : "前";

	if (n < 30) return `${n} 天${suffix}`;
	if (n < 365) return `${Math.floor(n / 30)} 个月${suffix}`;
	return `${Math.floor(n / 365)} 年${suffix}`;
}
