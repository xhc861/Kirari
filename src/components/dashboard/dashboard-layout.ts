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
	| "todo"
	| "countdown"
	| "oracle"
	| "recent"
	| "micronews"
	| "stats"
	| "scoreboard"
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
	{ id: "daily", name: "日常", hint: "今天要做的和要等的" },
	{ id: "content", name: "内容", hint: "这个站上写了些什么" },
	{ id: "tools", name: "工具", hint: "顺手放着的几样东西" },
];

/** 默认排布。数组顺序即各章节内的初始顺序 */
export const MODULES: ModuleDef[] = [
	{ id: "todo", title: "待办", section: "daily", size: "narrow" },
	{ id: "countdown", title: "倒计时", section: "daily", size: "narrow" },
	{ id: "oracle", title: "答案之书", section: "daily", size: "narrow" },

	{ id: "recent", title: "最近更新", section: "content", size: "half" },
	{ id: "micronews", title: "微新闻", section: "content", size: "half" },
	{ id: "stats", title: "写作统计", section: "content", size: "full" },

	{ id: "scoreboard", title: "成绩单", section: "tools", size: "full" },
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
 * 存档里认不出的 id 直接丢掉，存档里没有的模块补到末尾 ——
 * 这样增删模块都不会让老存档失效，也不会凭空少一块。
 */
export function orderedModules(section: SectionId): ModuleDef[] {
	const defaults = MODULES.filter((m) => m.section === section);
	const saved = readJSON<Record<string, ModuleId[]>>(KEY_ORDER, {});
	const savedIds = saved[section];
	if (!Array.isArray(savedIds)) return defaults;

	const byId = new Map(defaults.map((m) => [m.id, m]));
	const out: ModuleDef[] = [];
	for (const id of savedIds) {
		const m = byId.get(id);
		if (m) {
			out.push(m);
			byId.delete(id);
		}
	}
	// 存档之后新增的模块
	for (const m of defaults) if (byId.has(m.id)) out.push(m);
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
