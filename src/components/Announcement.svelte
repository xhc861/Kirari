<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";

interface AnnouncementConfig {
	enable: boolean;
	title?: string;
	content: string;
	icon?: string;
	closeable?: boolean;
	critical?: boolean;
	links?: { text: string; url: string }[] | null;
}

let config: AnnouncementConfig | null = $state(null);
let visible = $state(true);

// 使用内容的哈希作为唯一标识
function getContentHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return `announcement-${Math.abs(hash)}`;
}

onMount(async () => {
	// 从 JSON 文件加载公告配置
	try {
		const response = await fetch("/announcement.json", { cache: "no-store" });
		config = await response.json();

		if (!config || !config.enable) {
			visible = false;
			return;
		}

		const storageKey = "announcement-closed-v2";
		const closedContent = localStorage.getItem(storageKey);
		const currentKey = getContentHash(config.content);

		// 只有当关闭的公告ID与当前公告ID匹配时才隐藏
		if (closedContent === currentKey) {
			visible = false;
		}
	} catch (error) {
		console.error("Failed to load announcement:", error);
		visible = false;
	}
});

function closeAnnouncement() {
	visible = false;
	if (config?.closeable) {
		const storageKey = "announcement-closed-v2";
		const key = getContentHash(config.content);
		localStorage.setItem(storageKey, key);
	}
}
</script>

{#if visible && config && config.enable}
    <div class="announcement-wrapper mb-4">
        <div class="announcement-container rounded-[var(--radius-large)] shadow-lg overflow-hidden border-2 border-[oklch(0.75_0.1_var(--hue))]">
            <div class="announcement-content p-4 md:p-5 flex items-start gap-3 md:gap-4">
                {#if config.icon}
                    <div class="announcement-icon shrink-0 mt-0.5">
                        <Icon icon={config.icon} class="text-2xl md:text-3xl text-[oklch(0.75_0.14_var(--hue))]" />
                    </div>
                {/if}
                
                <div class="announcement-text flex-1 min-w-0">
                    {#if config.title}
                        <h3 class="announcement-title text-lg md:text-xl font-bold mb-2" class:critical-text={config.critical} class:normal-text={!config.critical}>
                            {config.title}
                        </h3>
                    {/if}
                    <p class="announcement-message text-sm md:text-base leading-relaxed" class:critical-text={config.critical} class:normal-text={!config.critical}>
                        {config.content}
                    </p>
                    {#if config.links && config.links.length > 0}
                        <div class="announcement-links flex flex-wrap gap-3 mt-3">
                            {#each config.links as link}
                                <a 
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="announcement-link inline-flex items-center gap-1 text-sm md:text-base transition-colors font-medium"
                                    class:critical-link={config.critical}
                                    class:normal-link={!config.critical}
                                >
                                    {link.text}
                                    <Icon icon="fa6-solid:arrow-right" class="text-xs" />
                                </a>
                            {/each}
                        </div>
                    {/if}
                </div>

                {#if config.closeable}
                    <button
                        on:click={closeAnnouncement}
                        class="announcement-close shrink-0 p-1 rounded-lg hover:bg-[var(--btn-plain-bg-hover)] transition-colors"
                        class:critical-text={config.critical}
                        class:normal-text={!config.critical}
                        aria-label="关闭公告"
                    >
                        <Icon icon="fa6-solid:xmark" class="text-xl" />
                    </button>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .announcement-wrapper {
        animation: slideDown 0.5s ease-out;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .announcement-container {
        position: relative;
        background: oklch(0.95 0.02 var(--hue));
    }

    :global(.dark) .announcement-container {
        background: oklch(0.25 0.03 var(--hue));
    }

    .announcement-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, 
            oklch(0.7_0.12_var(--hue)) 0%, 
            oklch(0.75_0.14_var(--hue)) 50%, 
            oklch(0.7_0.12_var(--hue)) 100%
        );
    }

    .announcement-close:hover {
        transform: scale(1.1);
    }

    .announcement-close:active {
        transform: scale(0.95);
    }

    /* 普通文字颜色 - 与 Footer 一致 */
    .normal-text {
        color: rgb(75 85 99); /* text-gray-600 */
    }

    :global(.dark) .normal-text {
        color: rgb(156 163 175); /* text-gray-400 */
    }

    /* 重要通知红色 */
    .critical-text {
        color: rgb(220 38 38) !important; /* red-600 */
    }

    :global(.dark) .critical-text {
        color: rgb(248 113 113) !important; /* red-400 */
    }

    /* 链接颜色 */
    .normal-link {
        color: oklch(0.75 0.14 var(--hue));
    }

    .normal-link:hover {
        color: oklch(0.8 0.16 var(--hue));
    }

    .critical-link {
        color: rgb(220 38 38); /* red-600 */
    }

    :global(.dark) .critical-link {
        color: rgb(248 113 113); /* red-400 */
    }

    .critical-link:hover {
        color: rgb(185 28 28); /* red-700 */
    }

    :global(.dark) .critical-link:hover {
        color: rgb(252 165 165); /* red-300 */
    }
</style>
