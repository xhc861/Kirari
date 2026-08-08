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

onMount(() => {
	const saved = localStorage.getItem("effectsSettings");
	if (saved) {
		const settings = JSON.parse(saved);
		const migrated = localStorage.getItem("lanternDefaultsZhongkao");
		if (!migrated) {
			show = true;
			text1 = DEFAULT_TEXT.text1;
			text2 = DEFAULT_TEXT.text2;
			text3 = DEFAULT_TEXT.text3;
			text4 = DEFAULT_TEXT.text4;
		} else {
			show = settings.lanternsEnabled ?? true;
			if (settings.lanternText) {
				text1 = settings.lanternText.text1;
				text2 = settings.lanternText.text2;
				text3 = settings.lanternText.text3;
				text4 = settings.lanternText.text4;
			}
		}
	}

	const handleSettingsChange = (event: CustomEvent) => {
		show = event.detail.lanternsEnabled;
		if (event.detail.lanternText) {
			text1 = event.detail.lanternText.text1;
			text2 = event.detail.lanternText.text2;
			text3 = event.detail.lanternText.text3;
			text4 = event.detail.lanternText.text4;
		}
	};

	window.addEventListener(
		"effectsSettingsChanged",
		handleSettingsChange as EventListener,
	);

	return () => {
		window.removeEventListener(
			"effectsSettingsChanged",
			handleSettingsChange as EventListener,
		);
	};
});
</script>

{#if show}
  <!-- 文档流中的全宽横幅：占位在最上，内容在其下方 -->
  <div class="celebration-banner" role="banner" aria-label={`${text1}${text2}${text3}${text4}`}>
    <div class="banner-inner">
      <span class="banner-ornament" aria-hidden="true">✦</span>
      <span class="banner-text">{text1}{text2}{text3}{text4}</span>
      <span class="banner-ornament" aria-hidden="true">✦</span>
    </div>
  </div>
{/if}

<style>
  .celebration-banner {
    position: relative;
    z-index: 100;
    width: 100%;
    flex-shrink: 0;
    box-sizing: border-box;
    background: linear-gradient(
      180deg,
      #ff4d4f 0%,
      #d8000f 48%,
      #b0000c 100%
    );
    border-bottom: 2px solid #dc8f03;
    box-shadow:
      0 2px 12px rgba(216, 0, 15, 0.35),
      inset 0 1px 0 rgba(255, 215, 0, 0.35);
  }

  .banner-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 2.5rem;
    padding: 0.45rem 1rem;
    box-sizing: border-box;
  }

  .banner-text {
    font-size: clamp(1rem, 2.4vw, 1.35rem);
    font-weight: 800;
    letter-spacing: 0.45em;
    text-indent: 0.45em;
    color: #ffd700;
    text-shadow:
      0 1px 0 #8b0000,
      0 0 12px rgba(255, 200, 0, 0.5);
    white-space: nowrap;
    line-height: 1.2;
  }

  .banner-ornament {
    color: #ffd700;
    font-size: 0.85rem;
    opacity: 0.9;
    text-shadow: 0 0 8px rgba(255, 200, 0, 0.45);
  }

  @media (max-width: 640px) {
    .banner-inner {
      min-height: 2.25rem;
      padding: 0.35rem 0.75rem;
      gap: 0.45rem;
    }

    .banner-text {
      letter-spacing: 0.3em;
      text-indent: 0.3em;
    }
  }
</style>
