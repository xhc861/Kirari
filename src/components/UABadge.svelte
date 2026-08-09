<script lang="ts">
/**
 * 访客环境。
 *
 * 原来这是展板上一张和成绩单同等大小的卡片，里面五行「标签 / 值」—— 一个
 * 谁都不会认真读的东西占着和正文一样的分量。而且它整块 `{#if !error}`：
 * 接口一挂，内容消失、外壳标题还在，页面上剩一张空卡。
 *
 * 现在降成页脚一行细字，并且倒过来做：浏览器、系统、设备、屏幕、语言全部
 * 本地就能算出来，先显示；只有 IP 与归属地需要接口，异步补上，补不到就少
 * 两项，不影响其余。
 *
 * 顺带认一下 WebView 内核 —— 站点公告里专门提醒过「Via、M 浏览器、Vie 等
 * 调用 WebView 内核的浏览器会界面异常」。既然这里已经拿到了 UA，那句提醒
 * 就不该只挂在公告里等人自己对号入座。
 */
import { onMount } from "svelte";

type Env = {
	browser: string;
	os: string;
	device: string;
	screen: string;
	language: string;
	/** 疑似 WebView 套壳浏览器 */
	webview: boolean;
};

let env: Env | null = null;
let ip = "";
let region = "";
/** 接口有没有回话。没回话就少两项，不报错 —— 页脚不值得为此喊一声 */
let remoteDone = false;

function detectBrowser(ua: string): string {
	const rules: [RegExp, string][] = [
		[/Edg(?:e|A|iOS)?\/(\d+)/, "Edge"],
		[/OPR\/(\d+)/, "Opera"],
		[/SamsungBrowser\/(\d+)/, "Samsung Internet"],
		[/Firefox\/(\d+)/, "Firefox"],
		[/CriOS\/(\d+)/, "Chrome"],
		[/Chrome\/(\d+)/, "Chrome"],
		[/Version\/(\d+).*Safari/, "Safari"],
	];
	for (const [re, name] of rules) {
		const m = ua.match(re);
		if (m) return `${name} ${m[1]}`;
	}
	return "未知浏览器";
}

function detectOS(ua: string): string {
	if (/Windows NT 10/.test(ua)) return "Windows 10/11";
	if (/Windows NT/.test(ua)) return "Windows";
	if (/Android (\d+)/.test(ua))
		return `Android ${ua.match(/Android (\d+)/)?.[1]}`;
	if (/iPhone|iPad|iPod/.test(ua)) return "iOS / iPadOS";
	if (/Mac OS X/.test(ua)) return "macOS";
	if (/Linux/.test(ua)) return "Linux";
	return "未知系统";
}

function detectDevice(ua: string): string {
	if (/iPad|Tablet/.test(ua)) return "平板";
	if (/Mobi|Android.*Mobile|iPhone/.test(ua)) return "手机";
	return "桌面";
}

/**
 * WebView 套壳的特征。
 *
 * Android 上 WebView 会在 UA 里留下 `; wv`；套壳浏览器则常见一个没有品牌
 * 标识、却带着完整 Chrome 版本号的 UA。两条都只是启发式，所以文案用「疑似」。
 */
function detectWebView(ua: string): boolean {
	if (/; wv\)/.test(ua)) return true;
	const isAndroid = /Android/.test(ua);
	const brandless =
		/Chrome\/\d+/.test(ua) &&
		!/(Edg|OPR|SamsungBrowser|Firefox|CriOS|YaBrowser|HuaweiBrowser|MiuiBrowser|Vivo|OppoBrowser)/.test(
			ua,
		) &&
		!/Safari\/\d+\.\d+ /.test(ua);
	return isAndroid && brandless;
}

async function loadRemote() {
	try {
		const response = await fetch("https://v2.xxapi.cn/api/ua");
		const result = await response.json();
		if (result?.code === 200 && result.data) {
			ip = result.data.ip ?? "";
			region = result.data.address ?? "";
		}
	} catch (e) {
		console.warn("[UABadge] IP 归属地获取失败:", e);
	} finally {
		remoteDone = true;
	}
}

onMount(() => {
	if (typeof window === "undefined") return;

	const ua = navigator.userAgent;
	env = {
		browser: detectBrowser(ua),
		os: detectOS(ua),
		device: detectDevice(ua),
		screen: `${window.screen.width}×${window.screen.height}`,
		language: navigator.language || "",
		webview: detectWebView(ua),
	};

	loadRemote();
});

$: parts = env
	? [
			env.browser,
			env.os,
			env.device,
			env.screen,
			env.language,
			ip,
			region,
		].filter(Boolean)
	: [];
</script>

{#if env}
  <div class="env">
    <span class="line">
      {#each parts as part, i}
        {#if i > 0}<span class="sep" aria-hidden="true">·</span>{/if}<span>{part}</span>
      {/each}
      {#if !remoteDone}<span class="sep" aria-hidden="true">·</span><span class="pending">定位中</span>{/if}
    </span>

    {#if env.webview}
      <p class="warn">
        看着像是 WebView 内核的套壳浏览器。本站在这类内核上排版容易乱，
        换 Edge、Chrome 或雨见浏览器会正常很多。
      </p>
    {/if}
  </div>
{/if}

<style>
  /* 这一行本来就是一串读数，等宽最合适 */
  .env {
    font-family: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.7rem;
    line-height: 1.7;
    color: rgba(0, 0, 0, 0.35);
  }
  :global(.dark) .env { color: rgba(255, 255, 255, 0.35); }

  .line {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 0.4rem;
  }

  .sep { opacity: 0.5; }
  .pending { opacity: 0.6; font-style: italic; }

  /* 公告里那句「别用 WebView」，在真的碰上时才说 */
  .warn {
    margin: 0.5rem 0 0;
    padding-left: 0.6rem;
    border-left: 2px solid oklch(0.62 0.13 72);
    font-size: 0.75rem;
    line-height: 1.65;
    color: oklch(0.52 0.12 72);
  }
  :global(.dark) .warn { color: oklch(0.82 0.11 72); }
</style>
