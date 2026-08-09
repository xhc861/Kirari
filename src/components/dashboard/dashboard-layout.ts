/**
 * 展板的布局状态。
 *
 * 模块从上到下堆成一长条时，什么都得滚过去才看得到；统计并进来之后更长。
 * 这里把模块分成几个分区，并把「当前分区 / 各分区内顺序 / 折叠了哪些」
 * 存进 localStorage，让展板真的能按各人的用法收拾。
 *
 * 存储只认模块 id，不存组件本身 —— 新增或删除模块时，读取端会跳过认不出的 id
 * 并把没见过的模块补到末尾，老的存档不会因此失效。
 */

export type SectionId = "daily" | "content" | "tools";

export type ModuleId =
	| "calendar"
	| "countdown"
	| "todo"
	| "stats"
	| "micronews"
	| "scoreboard"
	| "extras"
	| "ua";

export type ModuleDef = {
	id: ModuleId;
	title: string;
	section: SectionId;
};

export const SECTIONS: { id: SectionId; name: string }[] = [
	{ id: "daily", name: "日常" },
	{ id: "content", name: "内容" },
	{ id: "tools", name: "工具" },
];

/** 默认排布。顺序即各分区内的初始顺序 */
export const MODULES: ModuleDef[] = [
	{ id: "calendar", title: "日历", section: "daily" },
	{ id: "countdown", title: "倒计时", section: "daily" },
	{ id: "todo", title: "待办事项", section: "daily" },

	{ id: "stats", title: "写作统计", section: "content" },
	{ id: "micronews", title: "微新闻", section: "content" },

	{ id: "scoreboard", title: "成绩单", section: "tools" },
	{ id: "extras", title: "抽签与每日英语", section: "tools" },
	{ id: "ua", title: "浏览器信息", section: "tools" },
];

const KEY_SECTION = "dashboard:section";
const KEY_ORDER = "dashboard:order";
const KEY_COLLAPSED = "dashboard:collapsed";

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

export function loadSection(): SectionId {
	if (typeof localStorage === "undefined") return "daily";
	const saved = localStorage.getItem(KEY_SECTION);
	return SECTIONS.some((s) => s.id === saved) ? (saved as SectionId) : "daily";
}

export function saveSection(id: SectionId): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(KEY_SECTION, id);
	} catch {}
}

/**
 * 某个分区内的模块顺序。
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

/** 清空全部布局偏好，回到默认排布 */
export function resetLayout(): void {
	if (typeof localStorage === "undefined") return;
	for (const k of [KEY_SECTION, KEY_ORDER, KEY_COLLAPSED]) {
		try {
			localStorage.removeItem(k);
		} catch {}
	}
}

/** 某个模块属于哪个分区，供 #stats 这类锚点定位用 */
export function sectionOf(id: ModuleId): SectionId | null {
	return MODULES.find((m) => m.id === id)?.section ?? null;
}
