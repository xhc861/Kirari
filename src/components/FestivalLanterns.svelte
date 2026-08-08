<script lang="ts">
import { onMount } from "svelte";

export let show = true;
export let text1 = "中";
export let text2 = "考";
export let text3 = "大";
export let text4 = "捷";

const DEFAULT_TEXT = {
	text1: "中",
	text2: "考",
	text3: "大",
	text4: "捷",
};

/**
 * 用对象存状态，避免事件回调里读到过期的闭包值
 * enabled: 用户设置是否开启灯笼
 */
const state = {
	enabled: true,
};

/** 模板渲染用 */
let renderEnabled = true;

/** 靠近感应：左上 / 右上角区域（px） */
const ZONE_X = 360;
const ZONE_Y = 320;

function getRoot(): HTMLElement | null {
	return document.getElementById("festival-lanterns");
}

function setSideHidden(side: "left" | "right", hidden: boolean) {
	const root = getRoot();
	if (!root) return;
	root.querySelectorAll(`.deng-box[data-side="${side}"]`).forEach((el) => {
		if (hidden) {
			el.classList.add("is-hidden");
		} else {
			el.classList.remove("is-hidden");
		}
	});
}

function clearAllHidden() {
	setSideHidden("left", false);
	setSideHidden("right", false);
}

function onPointerMove(event: Event) {
	const e = event as PointerEvent | MouseEvent;
	if (!state.enabled) {
		clearAllHidden();
		return;
	}
	// 根节点尚未挂上时跳过
	if (!getRoot()) return;

	const x = e.clientX;
	const y = e.clientY;
	const vw = window.innerWidth;

	setSideHidden("left", x <= ZONE_X && y <= ZONE_Y);
	setSideHidden("right", x >= vw - ZONE_X && y <= ZONE_Y);
}

function onWindowLeave() {
	// 鼠标离开页面：按设置恢复显示
	if (state.enabled) {
		clearAllHidden();
	}
}

function applySettingsEnabled(enabled: boolean) {
	state.enabled = enabled;
	renderEnabled = enabled;
	show = enabled;
	if (!enabled) {
		clearAllHidden();
	}
}

function loadFromStorage() {
	const saved = localStorage.getItem("effectsSettings");
	if (!saved) {
		applySettingsEnabled(true);
		text1 = DEFAULT_TEXT.text1;
		text2 = DEFAULT_TEXT.text2;
		text3 = DEFAULT_TEXT.text3;
		text4 = DEFAULT_TEXT.text4;
		return;
	}

	try {
		const settings = JSON.parse(saved);
		const migrated = localStorage.getItem("lanternDefaultsZhongkao");
		if (!migrated) {
			applySettingsEnabled(true);
			text1 = DEFAULT_TEXT.text1;
			text2 = DEFAULT_TEXT.text2;
			text3 = DEFAULT_TEXT.text3;
			text4 = DEFAULT_TEXT.text4;
			localStorage.setItem("lanternDefaultsZhongkao", "1");
			localStorage.setItem(
				"effectsSettings",
				JSON.stringify({
					...settings,
					lanternsEnabled: true,
					lanternText: { ...DEFAULT_TEXT },
				}),
			);
			return;
		}

		applySettingsEnabled(settings.lanternsEnabled ?? true);
		if (settings.lanternText) {
			text1 = settings.lanternText.text1;
			text2 = settings.lanternText.text2;
			text3 = settings.lanternText.text3;
			text4 = settings.lanternText.text4;
		}
	} catch {
		applySettingsEnabled(true);
	}
}

onMount(() => {
	loadFromStorage();

	const handleSettingsChange = (event: Event) => {
		const detail = (event as CustomEvent).detail;
		applySettingsEnabled(!!detail?.lanternsEnabled);
		if (detail?.lanternText) {
			text1 = detail.lanternText.text1;
			text2 = detail.lanternText.text2;
			text3 = detail.lanternText.text3;
			text4 = detail.lanternText.text4;
		}
	};

	// 捕获阶段 + pointer/mouse 双保险
	const opts: AddEventListenerOptions = { capture: true, passive: true };
	window.addEventListener("pointermove", onPointerMove, opts);
	window.addEventListener("mousemove", onPointerMove, opts);
	document.addEventListener("pointermove", onPointerMove, opts);
	document.addEventListener("mousemove", onPointerMove, opts);
	window.addEventListener("effectsSettingsChanged", handleSettingsChange);
	document.documentElement.addEventListener("mouseleave", onWindowLeave);
	window.addEventListener("blur", onWindowLeave);

	return () => {
		window.removeEventListener("pointermove", onPointerMove, true);
		window.removeEventListener("mousemove", onPointerMove, true);
		document.removeEventListener("pointermove", onPointerMove, true);
		document.removeEventListener("mousemove", onPointerMove, true);
		window.removeEventListener("effectsSettingsChanged", handleSettingsChange);
		document.documentElement.removeEventListener("mouseleave", onWindowLeave);
		window.removeEventListener("blur", onWindowLeave);
	};
});
</script>

{#if renderEnabled}
  <div id="festival-lanterns" aria-hidden="true">
    <div class="deng-box deng-box-left1" data-side="left">
      <div class="deng">
        <div class="xian"></div>
        <div class="deng-a">
          <div class="deng-b">
            <div class="deng-t">{text1}</div>
          </div>
        </div>
        <div class="shui shui-a">
          <div class="shui-c"></div>
          <div class="shui-b"></div>
        </div>
      </div>
    </div>

    <div class="deng-box deng-box-left2" data-side="left">
      <div class="deng">
        <div class="xian"></div>
        <div class="deng-a">
          <div class="deng-b">
            <div class="deng-t">{text2}</div>
          </div>
        </div>
        <div class="shui shui-a">
          <div class="shui-c"></div>
          <div class="shui-b"></div>
        </div>
      </div>
    </div>

    <div class="deng-box deng-box-right1" data-side="right">
      <div class="deng">
        <div class="xian"></div>
        <div class="deng-a">
          <div class="deng-b">
            <div class="deng-t">{text3}</div>
          </div>
        </div>
        <div class="shui shui-a">
          <div class="shui-c"></div>
          <div class="shui-b"></div>
        </div>
      </div>
    </div>

    <div class="deng-box deng-box-right2" data-side="right">
      <div class="deng">
        <div class="xian"></div>
        <div class="deng-a">
          <div class="deng-b">
            <div class="deng-t">{text4}</div>
          </div>
        </div>
        <div class="shui shui-a">
          <div class="shui-c"></div>
          <div class="shui-b"></div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .deng-box {
    position: fixed !important;
    top: 0 !important;
    z-index: 9999 !important;
    pointer-events: none !important;
    opacity: 1;
    visibility: visible;
    transform: translate3d(0, 0, 0) scale(1);
    transition:
      opacity 0.22s ease,
      transform 0.22s ease,
      visibility 0.22s linear;
    will-change: opacity, transform;
  }

  /*
   * 动态 class 必须用 :global，否则 Svelte 会给 is-hidden 加 hash，
   * classList.add('is-hidden') 对不上，导致“完全不生效”。
   */
  :global(.deng-box.is-hidden) {
    opacity: 0 !important;
    visibility: hidden !important;
    transform: translate3d(0, -16px, 0) scale(0.9) !important;
  }

  .deng {
    position: relative;
    width: 120px;
    height: 90px;
    margin: 50px;
    background: rgba(216, 0, 15, 0.8);
    border-radius: 50% 50%;
    transform-origin: 50% -100px;
    box-shadow: -5px 5px 50px 4px rgba(250, 108, 0, 1);
  }

  .deng-box-left1 {
    left: 20px;
  }

  .deng-box-left2 {
    left: 120px;
  }

  .deng-box-right1 {
    right: 120px;
  }

  .deng-box-right2 {
    right: 20px;
  }

  .deng-a {
    width: 100px;
    height: 90px;
    background: rgba(216, 0, 15, 0.1);
    margin: 12px 8px 8px 10px;
    border-radius: 50% 50%;
    border: 2px solid #dc8f03;
  }

  .deng-b {
    width: 45px;
    height: 90px;
    background: rgba(216, 0, 15, 0.1);
    margin: -4px 8px 8px 26px;
    border-radius: 50% 50%;
    border: 2px solid #dc8f03;
  }

  .xian {
    position: absolute;
    top: -20px;
    left: 60px;
    width: 2px;
    height: 20px;
    background: #dc8f03;
  }

  .shui-a {
    position: relative;
    width: 5px;
    height: 20px;
    margin: -5px 0 0 59px;
    background: #ffa500;
    border-radius: 0 0 5px 5px;
  }

  .shui-b {
    position: absolute;
    top: 14px;
    left: -2px;
    width: 10px;
    height: 10px;
    background: #dc8f03;
    border-radius: 50%;
  }

  .shui-c {
    position: absolute;
    top: 18px;
    left: -2px;
    width: 10px;
    height: 35px;
    background: #ffa500;
    border-radius: 0 0 0 5px;
  }

  .deng:before {
    position: absolute;
    top: -7px;
    left: 29px;
    height: 12px;
    width: 60px;
    content: " ";
    display: block;
    border-radius: 5px 5px 0 0;
    border: solid 1px #dc8f03;
    background: linear-gradient(to right, #dc8f03, #ffa500, #dc8f03, #ffa500, #dc8f03);
  }

  .deng:after {
    position: absolute;
    bottom: -7px;
    left: 10px;
    height: 12px;
    width: 60px;
    content: " ";
    display: block;
    margin-left: 20px;
    border-radius: 0 0 5px 5px;
    border: solid 1px #dc8f03;
    background: linear-gradient(to right, #dc8f03, #ffa500, #dc8f03, #ffa500, #dc8f03);
  }

  .deng-t {
    font-size: 3.2rem;
    color: #dc8f03;
    font-weight: bold;
    line-height: 85px;
    text-align: center;
  }

  :global(.dark) .deng-t,
  :global(.dark) .deng-box {
    background: transparent !important;
  }

  .deng-box-left1 .deng {
    animation: swing 3s infinite ease-in-out;
  }

  .deng-box-left2 .deng {
    animation: swing 3.2s infinite ease-in-out;
  }

  .deng-box-right1 .deng {
    animation: swing 3.5s infinite ease-in-out;
  }

  .deng-box-right2 .deng {
    animation: swing 3.7s infinite ease-in-out;
  }

  @keyframes swing {
    0% {
      transform: rotate(-10deg);
    }
    50% {
      transform: rotate(10deg);
    }
    100% {
      transform: rotate(-10deg);
    }
  }

  @media (max-width: 768px) {
    .deng-box {
      display: none !important;
    }
  }
</style>
