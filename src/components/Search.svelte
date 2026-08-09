<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { url } from "@utils/url-utils";
import { onMount } from "svelte";
import type { SearchResult } from "@/global";



let keywordDesktop = "";

/** 搜索历史，只存本机 */
const HISTORY_KEY = "kirari:search-history";
const HISTORY_MAX = 6;
let history: string[] = [];
/** 搜过但没结果 —— 用于区分「还没搜」和「搜了没找到」 */
let searched = false;

function loadHistory() {
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		history = raw ? JSON.parse(raw) : [];
	} catch {
		history = [];
	}
}

function rememberQuery(q: string) {
	const k = q.trim();
	if (!k) return;
	history = [k, ...history.filter((h) => h !== k)].slice(0, HISTORY_MAX);
	try {
		localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
	} catch {
		/* 隐私模式下写不进去，历史只在本次会话有效 */
	}
}

function clearHistory() {
	history = [];
	try {
		localStorage.removeItem(HISTORY_KEY);
	} catch {}
}
let keywordMobile = "";
let result: SearchResult[] = [];
let isSearching = false;
let pagefindLoaded = false;
let initialized = false;

const fakeResult: SearchResult[] = [
	{
		url: url("/"),
		meta: {
			title: "This Is a Fake Search Result",
		},
		excerpt:
			"Because the search cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: url("/"),
		meta: {
			title: "If You Want to Test the Search",
		},
		excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
	},
];

const togglePanel = () => {
	const panel = document.getElementById("search-panel");
	panel?.classList.toggle("float-panel-closed");
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	const panel = document.getElementById("search-panel");
	if (!panel || !isDesktop) return;

	if (show) {
		panel.classList.remove("float-panel-closed");
	} else {
		panel.classList.add("float-panel-closed");
	}
};

const search = async (keyword: string, isDesktop: boolean): Promise<void> => {
	if (!keyword) {
		searched = false;
		result = [];
		// 空输入时若有历史，仍然展开面板把历史给出来
		setPanelVisibility(history.length > 0, isDesktop);
		return;
	}

	if (!initialized) {
		return;
	}

	isSearching = true;

	try {
		let searchResults: SearchResult[] = [];

		if (import.meta.env.PROD && pagefindLoaded && window.pagefind) {
			const response = await window.pagefind.search(keyword);
			searchResults = await Promise.all(
				response.results.map((item) => item.data()),
			);
		} else if (import.meta.env.DEV) {
			searchResults = fakeResult;
		} else {
			searchResults = [];
			console.error("Pagefind is not available in production environment.");
		}

		result = searchResults;
		searched = true;
		if (result.length > 0) rememberQuery(keyword);
		/*
		 * 零结果时也要展开面板。原来这里传的是 result.length > 0，
		 * 搜不到就整个面板消失，用户得不到任何反馈，像是功能坏了。
		 */
		setPanelVisibility(true, isDesktop);
	} catch (error) {
		console.error("Search error:", error);
		result = [];
		searched = true;
		setPanelVisibility(true, isDesktop);
	} finally {
		isSearching = false;
	}
};

onMount(() => {
	loadHistory();
	const initializeSearch = () => {
		initialized = true;
		pagefindLoaded =
			typeof window !== "undefined" &&
			!!window.pagefind &&
			typeof window.pagefind.search === "function";
		if (keywordDesktop) search(keywordDesktop, true);
		if (keywordMobile) search(keywordMobile, false);
	};

	if (import.meta.env.DEV) {
		initializeSearch();
	} else {
		document.addEventListener("pagefindready", () => {
			initializeSearch();
		});
		document.addEventListener("pagefindloaderror", () => {
			console.warn(
				"Pagefind load error event received. Search functionality will be limited.",
			);
			initializeSearch(); // Initialize with pagefindLoaded as false
		});

		// Fallback in case events are not caught or pagefind is already loaded by the time this script runs
		setTimeout(() => {
			if (!initialized) {
				initializeSearch();
			}
		}, 2000); // Adjust timeout as needed
	}
});

$: if (initialized && keywordDesktop) {
	(async () => {
		await search(keywordDesktop, true);
	})();
}

$: if (initialized && keywordMobile) {
	(async () => {
		await search(keywordMobile, false);
	})();
}
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
">
    <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
    <input placeholder="{i18n(I18nKey.search)}" bind:value={keywordDesktop} on:focus={() => search(keywordDesktop, true)}
           class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-40 active:w-60 focus:w-60 text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation lg:hidden! rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel absolute md:w-[30rem]
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input placeholder="Search" bind:value={keywordMobile}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
        >
    </div>

    <!-- 空输入时给出搜索历史 -->
    {#if !keywordDesktop && history.length > 0}
        <div class="search-aux">
            <div class="search-aux-head">
                <span>最近搜过</span>
                <button type="button" class="search-clear" on:click={clearHistory}>清空</button>
            </div>
            <div class="search-history">
                {#each history as h}
                    <button type="button" class="search-chip" on:click={() => { keywordDesktop = h; }}>{h}</button>
                {/each}
            </div>
        </div>
    {/if}

    <!-- 搜了但没找到：给出反馈而不是让面板消失 -->
    {#if searched && keywordDesktop && result.length === 0 && !isSearching}
        <div class="search-aux search-empty">
            <div class="search-empty-title">没找到「{keywordDesktop}」相关的内容</div>
            <div class="search-empty-hint">换个说法试试，或者去归档里翻翻。</div>
        </div>
    {/if}

    <!-- search results -->
    {#each result as item}
        <a href={item.url}
           class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]">
            <div class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]">
                {item.meta.title}<Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"></Icon>
            </div>
            <div class="transition text-sm text-50">
                {@html item.excerpt}
            </div>
        </a>
    {/each}
</div>

<style>
  input:focus {
    outline: 0;
  }

  .search-aux {
    padding: 0.75rem 0.75rem 0.25rem;
  }
  .search-aux-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.75rem;
    opacity: 0.5;
    margin-bottom: 0.5rem;
  }
  .search-clear {
    border: none;
    background: none;
    font: inherit;
    cursor: pointer;
    color: inherit;
    opacity: 0.8;
  }
  .search-clear:hover { color: var(--primary); opacity: 1; }

  .search-history {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .search-chip {
    padding: 0.25rem 0.6rem;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    background: var(--btn-regular-bg);
    color: var(--btn-content);
    transition: background 0.2s ease;
  }
  .search-chip:hover { background: var(--btn-regular-bg-hover); }

  .search-empty {
    padding: 1rem 0.9rem;
  }
  .search-empty-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.75);
    margin-bottom: 0.25rem;
  }
  :global(.dark) .search-empty-title { color: rgba(255, 255, 255, 0.78); }
  .search-empty-hint {
    font-size: 0.8rem;
    opacity: 0.55;
  }

  @media (prefers-reduced-motion: reduce) {
    .search-chip { transition: none; }
  }
  .search-panel {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
</style>
