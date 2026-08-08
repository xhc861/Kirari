<script lang="ts">
import { onMount } from "svelte";

interface Countdown {
	id: string;
	name: string;
	targetDate: string;
}

/** 由父组件传入；若未传入则自行加载 */
export let countdowns: Countdown[] | undefined = undefined;

let items: Countdown[] = [];
let remainingDays: { [key: string]: number } = {};

async function loadCountdowns() {
	try {
		const response = await fetch("/countdowns.json", { cache: "no-store" });
		const data = await response.json();
		items = Array.isArray(data) ? data : [];
		calculateRemainingDays();
	} catch (error) {
		console.error("[CountdownModule] 加载失败:", error);
		items = [];
	}
}

function calculateRemainingDays() {
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const next: { [key: string]: number } = {};
	items.forEach((countdown) => {
		const target = new Date(countdown.targetDate);
		target.setHours(0, 0, 0, 0);
		const diff = Math.ceil(
			(target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
		);
		next[countdown.id] = diff;
	});
	remainingDays = next;
}

$: if (countdowns !== undefined) {
	items = countdowns;
	calculateRemainingDays();
}

function formatDays(days: number): string {
	if (days > 0) {
		return `还有 ${days} 天`;
	}
	if (days === 0) {
		return "今天";
	}
	return `已过 ${Math.abs(days)} 天`;
}

onMount(() => {
	if (countdowns !== undefined) {
		return;
	}
	if (typeof window === "undefined") {
		return;
	}

	loadCountdowns();

	const now = new Date();
	const tomorrow = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + 1,
	);
	const msUntilMidnight = tomorrow.getTime() - now.getTime();

	const midnightTimer = setTimeout(() => {
		calculateRemainingDays();
		setInterval(calculateRemainingDays, 24 * 60 * 60 * 1000);
	}, msUntilMidnight);

	return () => clearTimeout(midnightTimer);
});
</script>

{#if items.length > 0}
  <div class="countdown-module">
    <div class="countdown-list">
      {#each items as countdown (countdown.id)}
        <div class="countdown-item">
          <div class="countdown-name">{countdown.name}</div>
          <div class="countdown-days" class:past={remainingDays[countdown.id] < 0} class:today={remainingDays[countdown.id] === 0}>
            {formatDays(remainingDays[countdown.id])}
          </div>
          <div class="countdown-date">{countdown.targetDate}</div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .countdown-module {
    padding: 0;
  }

  .countdown-list {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    justify-content: center;
  }

  .countdown-item {
    width: 140px;
    height: 140px;
    padding: 1rem;
    background: var(--card-bg);
    border-radius: 1rem;
    border: 1px solid var(--line-divider);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 0.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .countdown-item:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }

  .countdown-name {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.3;
  }

  :global(.dark) .countdown-name {
    color: rgba(255, 255, 255, 0.9);
  }

  .countdown-date {
    font-size: 0.7rem;
    opacity: 0.6;
  }

  :global(.dark) .countdown-date {
    color: rgba(255, 255, 255, 0.7);
  }

  .countdown-days {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary);
  }

  :global(.dark) .countdown-days {
    color: oklch(0.75 0.14 var(--hue));
  }

  .countdown-days.today {
    color: oklch(0.7 0.14 150);
  }

  :global(.dark) .countdown-days.today {
    color: oklch(0.75 0.14 150);
  }

  .countdown-days.past {
    color: oklch(0.65 0.2 25);
  }

  :global(.dark) .countdown-days.past {
    color: oklch(0.75 0.2 25);
  }
</style>
