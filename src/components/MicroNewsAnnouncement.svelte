<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";

interface MicroNews {
	id: string;
	title: string;
	content: string;
	time?: string;
	date: string;
	sender: string;
	priority?: "high" | "medium" | "low" | "doing";
}

let latestNews: MicroNews | null = $state(null);
let visible = $state(true);

function formatDateTime(dateStr: string, timeStr?: string): string {
	// 如果有时间，返回完整的日期时间
	if (timeStr) {
		return `${dateStr} ${timeStr}`;
	}
	// 只有日期
	return dateStr;
}

onMount(async () => {
	try {
		const response = await fetch("/micro-news.json", { cache: "no-store" });
		const data: MicroNews[] = await response.json();

		if (data && data.length > 0) {
			// 按 ID 倒序排列，获取最新的一条
			const sortedData = data.sort((a, b) => Number(b.id) - Number(a.id));
			latestNews = sortedData[0];
		} else {
			visible = false;
		}
	} catch (error) {
		console.error("Failed to load micro news:", error);
		visible = false;
	}
});
</script>

{#if visible && latestNews}
    <div class="micro-news-announcement-wrapper mb-4">
        <div class="micro-news-container rounded-[var(--radius-large)] shadow-lg overflow-hidden border-2 border-[oklch(0.75_0.1_var(--hue))]">
            <div class="micro-news-content p-4 md:p-5">
                <div class="micro-news-text">
                    <h3 class="micro-news-title text-lg md:text-xl font-bold mb-2">
                        Micro News
                    </h3>
                    <p class="micro-news-message text-sm md:text-base leading-relaxed mb-2">
                        {latestNews.title}
                    </p>
                    <div class="micro-news-meta text-xs md:text-sm opacity-70 mb-3">
                        <span>{formatDateTime(latestNews.date, latestNews.time)}</span>
                        <span class="mx-2">·</span>
                        <span>{latestNews.sender}</span>
                    </div>
                    <a 
                        href="/dashboard/"
                        class="micro-news-link inline-flex items-center gap-1 text-sm md:text-base transition-colors font-medium"
                    >
                        查看所有微新闻
                        <Icon icon="fa6-solid:arrow-right" class="text-xs" />
                    </a>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .micro-news-announcement-wrapper {
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

    .micro-news-container {
        position: relative;
        background: oklch(0.95 0.02 var(--hue));
    }

    :global(.dark) .micro-news-container {
        background: oklch(0.25 0.03 var(--hue));
    }

    .micro-news-container::before {
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

    .micro-news-title {
        color: rgb(75 85 99);
    }

    :global(.dark) .micro-news-title {
        color: rgb(229 231 235);
    }

    .micro-news-message {
        color: rgb(75 85 99);
    }

    :global(.dark) .micro-news-message {
        color: rgb(156 163 175);
    }

    .micro-news-meta {
        color: rgb(107 114 128);
    }

    :global(.dark) .micro-news-meta {
        color: rgb(156 163 175);
    }

    .micro-news-link {
        color: oklch(0.75 0.14 var(--hue));
    }

    .micro-news-link:hover {
        color: oklch(0.8 0.16 var(--hue));
    }
</style>
