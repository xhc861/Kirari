<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";

interface NotificationItem {
	id: string;
	message: string;
	type: "success" | "error" | "info" | "warning";
	duration?: number;
}

let notifications = $state<NotificationItem[]>([]);
let nextId = 0;

const typeStyles = {
	success:
		"bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200",
	error:
		"bg-red-100 border-red-300 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200",
	info: "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200",
	warning:
		"bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200",
};

const typeIcons = {
	success: "fa6-solid:check-circle",
	error: "fa6-solid:circle-xmark",
	info: "fa6-solid:circle-info",
	warning: "fa6-solid:triangle-exclamation",
};

export function showNotification(
	message: string,
	type: "success" | "error" | "info" | "warning" = "info",
	duration = 5000,
) {
	const id = `notification-${nextId++}`;
	const notification: NotificationItem = {
		id,
		message,
		type,
		duration,
	};

	notifications = [...notifications, notification];

	if (duration > 0) {
		setTimeout(() => {
			removeNotification(id);
		}, duration);
	}
}

function removeNotification(id: string) {
	notifications = notifications.filter((n: NotificationItem) => n.id !== id);
}

onMount(() => {
	// 将showNotification暴露到全局作用域
	interface WindowWithNotification extends Window {
		showNotification: typeof showNotification;
	}
	(window as WindowWithNotification).showNotification = showNotification;
});
</script>

<div class="fixed top-4 right-4 z-[9999] pointer-events-none space-y-3">
	{#each notifications as notification (notification.id)}
		<div
			class="pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-300 flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg {typeStyles[notification.type]}"
			role="alert"
		>
			<Icon icon={typeIcons[notification.type]} class="text-xl shrink-0 mt-0.5" />
			<div class="flex-1">
				<p class="text-sm font-medium">{notification.message}</p>
			</div>
			<button
				on:click={() => removeNotification(notification.id)}
				class="shrink-0 text-lg hover:opacity-70 transition-opacity"
				aria-label="关闭通知"
			>
				<Icon icon="fa6-solid:xmark" />
			</button>
		</div>
	{/each}
</div>

<style>
	@keyframes slideInFromRight {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	:global(.animate-in) {
		animation: slideInFromRight 0.3s ease-out;
	}
</style>
