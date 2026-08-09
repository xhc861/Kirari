/**
 * 展板的布局状态。
 *
 * 展板不再是「一列等大的卡片」，也不再用分区标签把内容藏起来 ——
 * 整页一口气滚完，分区退化成章节标题，模块按内容密度占不同宽度：
 * 待办这种一眼扫完的占三分之一，成绩单这种宽表格占通栏，
 * 浏览器信息压根不配拥有一个模块，降成页脚一行细字。
 *
 * 「顺序 / 宽度 / 折叠」存进 localStorage。存储只认模块 id，不存组件本身 ——
 * 读取端会跳过认不出的 id 并把没见过的模块补到末尾，所以增删模块、甚至这次
 * 把日历并进头部、把答案之书拆出来，老的存档都不会失效。
 */

export type SectionId = "daily" | "content" | "tools";

export type ModuleId =
	| "micronews"
	| "todo"
	| "countdown"
	| "oracle"
	| "recent"
	| "stats"
	| "extras"
	| "ua";

/** 模块在宽屏栅格里占的份额。窄屏一律通栏，这个字段只在 ≥1024px 生效 */
export type ModuleSize = "narrow" | "half" | "full";

export const SIZES: { id: ModuleSize; name: string }[] = [
	{ id: "narrow", name: "窄" },
	{ id: "half", name: "半" },
	{ id: "full", name: "通栏" },
];

export type ModuleDef = {
	id: ModuleId;
	title: string;
	section: SectionId;
	size: ModuleSize;
	/**
	 * 不套标题外壳，内容直接铺在页面上。
	 * 给那些「本来就不该是一个模块」的东西用，比如页脚那行浏览器信息。
	 */
	bare?: boolean;
};

export const SECTIONS: { id: SectionId; name: string; hint: string }[] = [
	{ id: "daily", name: "日常", hint: "刚刚发生的，和正在等的" },
	{ id: "content", name: "内容", hint: "这个站上写了些什么" },
	{ id: "tools", name: "工具", hint: "顺手放着的几样东西" },
];

/**
 * 默认排布。数组顺序即各章节内的初始顺序。
 *
 * 微新闻排在最前并占通栏：它是这个站「刚刚发生了什么」的唯一出口，
 * 之前埋在第二章的半栏里，得先滚过一整屏才看得到。通栏之后它内部按
 * 容器宽度自动分列，宽屏三列、窄屏一列，不会因为变宽就变成一条长队。
 */
export const MODULES: ModuleDef[] = [
	{ id: "micronews", title: "微新闻", section: "daily", size: "full" },
	{ id: "todo", title: "待办", section: "daily", size: "narrow" },
	{ id: "countdown", title: "倒计时", section: "daily", size: "narrow" },
	{ id: "oracle", title: "答案之书", section: "daily", size: "narrow" },

	{ id: "recent", title: "最近更新", section: "content", size: "half" },
	{ id: "stats", title: "写作统计", section: "content", size: "full" },

	{ id: "extras", title: "抽签与每日英语", section: "tools", size: "half" },
	{ id: "ua", title: "浏览器信息", section: "tools", size: "full", bare: true },
];

const KEY_ORDER = "dashboard:order";
const KEY_COLLAPSED = "dashboard:collapsed";
const KEY_SIZE = "dashboard:size";
/** 分区标签时代的遗物，重置时一并清掉 */
const KEY_LEGACY_SECTION = "dashboard:section";

function readJSON<T>(key: string, fallback: T): T {
	if (typeof localStorage === "undefined") return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		// 存档损坏时按默认来，不该让展板整个打不开
		return fallback;
	}
}

function writeJSON(key: string, value: unknown): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// 隐私模式下写入会抛错，忽略即可 —— 布局只是偏好，丢了不影响使用
	}
}

/**
 * 某个章节内的模块顺序。
 *
 * 存档里认不出的 id 直接丢掉；存档里没有的模块，按它在默认排布里的位置**插回去**。
 *
 * 「插回去」而不是「追加到末尾」是有代价换来的教训：把微新闻挪到日常区第一位那次，
 * 所有访问过展板的人存档里 daily 都是 [todo, countdown, oracle]，微新闻作为
 * 没见过的 id 被追加到末尾 —— 改动对老用户完全不生效，越是常来的人越看不到。
 *
 * 按默认位置插入则两头都照顾到：新模块落在作者安排的位置，已有模块之间
 * 用户自己调过的相对顺序原样保留。
 */
export function orderedModules(section: SectionId): ModuleDef[] {
	const defaults = MODULES.filter((m) => m.section === section);
	const saved = readJSON<Record<string, ModuleId[]>>(KEY_ORDER, {});
	const savedIds = saved[section];
	if (!Array.isArray(savedIds)) return defaults;

	const missing = new Map(defaults.map((m) => [m.id, m]));
	const out: ModuleDef[] = [];
	for (const id of savedIds) {
		const m = missing.get(id);
		if (m) {
			out.push(m);
			missing.delete(id);
		}
	}

	/*
	 * defaults 是升序遍历的，所以先插的下标不会被后插的挤歪。
	 * 末尾的 min() 兜住「默认位置比现有列表还靠后」的情况。
	 */
	defaults.forEach((m, defaultIndex) => {
		if (!missing.has(m.id)) return;
		out.splice(Math.min(defaultIndex, out.length), 0, m);
	});

	return out;
}

export function saveOrder(section: SectionId, ids: ModuleId[]): void {
	const saved = readJSON<Record<string, ModuleId[]>>(KEY_ORDER, {});
	saved[section] = ids;
	writeJSON(KEY_ORDER, saved);
}

export function loadCollapsed(): Set<ModuleId> {
	return new Set(readJSON<ModuleId[]>(KEY_COLLAPSED, []));
}

export function saveCollapsed(set: Set<ModuleId>): void {
	writeJSON(KEY_COLLAPSED, [...set]);
}

/** 各模块的宽度偏好，没存过的按默认定义走 */
export function loadSizes(): Partial<Record<ModuleId, ModuleSize>> {
	const saved = readJSON<Record<string, string>>(KEY_SIZE, {});
	const valid = new Set(SIZES.map((s) => s.id));
	const out: Partial<Record<ModuleId, ModuleSize>> = {};
	for (const [id, size] of Object.entries(saved)) {
		if (valid.has(size as ModuleSize)) out[id as ModuleId] = size as ModuleSize;
	}
	return out;
}

export function saveSizes(sizes: Partial<Record<ModuleId, ModuleSize>>): void {
	writeJSON(KEY_SIZE, sizes);
}

/** 清空全部布局偏好，回到默认排布 */
export function resetLayout(): void {
	if (typeof localStorage === "undefined") return;
	for (const k of [KEY_ORDER, KEY_COLLAPSED, KEY_SIZE, KEY_LEGACY_SECTION]) {
		try {
			localStorage.removeItem(k);
		} catch {}
	}
}

/** 某个模块属于哪个章节，供 #stats 这类锚点定位用 */
export function sectionOf(id: ModuleId): SectionId | null {
	return MODULES.find((m) => m.id === id)?.section ?? null;
}
