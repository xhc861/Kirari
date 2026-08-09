<script lang="ts">
import { onDestroy, onMount } from "svelte";

interface LotteryResponse {
	code: number;
	msg: string;
	data: {
		content: string;
		id: number;
		pic: string;
		poem: string;
		title: string;
	};
}

interface EnglishWordResponse {
	code: number;
	msg: string;
	data: {
		word: string;
		ukphone: string;
		usphone: string;
		ukspeech: string;
		usspeech: string;
		translations: Array<{
			pos: string;
			tran_cn: string;
		}>;
		sentences: Array<{
			s_content: string;
			s_cn: string;
		}>;
	};
}

let lottery: LotteryResponse["data"] | null = null;
let lotteryLoading = false;
let lotteryError = "";
let showLotteryModal = false;

let englishWord: EnglishWordResponse["data"] | null = null;
let englishLoading = false;
let englishError = "";
let showEnglishModal = false;

let audioPlaying = false;
let lotteryModalElement: HTMLDivElement;
let englishModalElement: HTMLDivElement;

onMount(() => {
	// 确保组件在客户端加载
	if (typeof window === "undefined") return;
});

// 当抽签模态框显示时，将其移动到 body 并锁定滚动
$: if (showLotteryModal && lotteryModalElement) {
	document.body.appendChild(lotteryModalElement);
	document.body.style.overflow = "hidden";
} else if (!showLotteryModal && typeof document !== "undefined") {
	document.body.style.overflow = "";
}

// 当英语单词模态框显示时，将其移动到 body 并锁定滚动
$: if (showEnglishModal && englishModalElement) {
	document.body.appendChild(englishModalElement);
	document.body.style.overflow = "hidden";
} else if (!showEnglishModal && typeof document !== "undefined") {
	document.body.style.overflow = "";
}

onDestroy(() => {
	if (typeof document !== "undefined") {
		document.body.style.overflow = "";
	}
});

async function drawLottery() {
	// 确保在客户端执行
	if (typeof window === "undefined") return;

	lotteryLoading = true;
	lotteryError = "";
	lottery = null;

	try {
		const response = await fetch("https://v2.xxapi.cn/api/wenchangdijunrandom");
		const data: LotteryResponse = await response.json();

		if (data.code === 200 && data.data) {
			lottery = data.data;
			showLotteryModal = true;
		} else {
			lotteryError = data.msg || "抽签失败";
		}
	} catch (e) {
		lotteryError = "网络请求失败";
		console.error("Failed to draw lottery:", e);
	} finally {
		lotteryLoading = false;
	}
}

async function fetchEnglishWord() {
	// 确保在客户端执行
	if (typeof window === "undefined") return;

	englishLoading = true;
	englishError = "";
	englishWord = null;

	try {
		const response = await fetch("https://v2.xxapi.cn/api/randomenglishwords");
		const data: EnglishWordResponse = await response.json();

		if (data.code === 200 && data.data) {
			englishWord = data.data;
			showEnglishModal = true;
		} else {
			englishError = data.msg || "获取单词失败";
		}
	} catch (e) {
		englishError = "网络请求失败";
		console.error("Failed to fetch English word:", e);
	} finally {
		englishLoading = false;
	}
}

function closeLotteryModal() {
	showLotteryModal = false;
}

function closeEnglishModal() {
	showEnglishModal = false;
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Escape") {
		if (showLotteryModal) closeLotteryModal();
		if (showEnglishModal) closeEnglishModal();
	}
}

function playPronunciation(url: string, type: "uk" | "us") {
	// 确保在客户端执行
	if (typeof window === "undefined") return;
	if (!url) return;
	if (audioPlaying) return;

	audioPlaying = true;
	const audio = new Audio(url);

	audio.onended = () => {
		audioPlaying = false;
	};

	audio.onerror = () => {
		audioPlaying = false;
		console.error(`Failed to play ${type} pronunciation`);
	};

	audio.play().catch((err) => {
		audioPlaying = false;
		console.error("Audio play failed:", err);
	});
}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- 抽签模态框 - 渲染到 body -->
{#if showLotteryModal && lottery}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    bind:this={lotteryModalElement}
    class="modal-root" 
    on:click={closeLotteryModal}
  >
      <div class="modal-content" on:click|stopPropagation>
        <div class="modal-header">
          <h2 class="modal-title">{lottery.title}</h2>
          <button type="button" class="close-btn" on:click={closeLotteryModal} title="关闭">×</button>
        </div>
        
        <div class="modal-body">
          {#if lottery.pic}
            <img src={lottery.pic} alt={lottery.title} class="lottery-image" />
          {/if}
          <div class="lottery-poem">{lottery.poem}</div>
          <div class="lottery-content">{lottery.content}</div>
        </div>
      </div>
  </div>
{/if}

<!-- 英语单词模态框 - 渲染到 body -->
{#if showEnglishModal && englishWord}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    bind:this={englishModalElement}
    class="modal-root" 
    on:click={closeEnglishModal}
  >
      <div class="modal-content" on:click|stopPropagation>
        <div class="modal-header">
          <h2 class="modal-title">{englishWord.word}</h2>
          <button type="button" class="close-btn" on:click={closeEnglishModal} title="关闭">×</button>
        </div>
        
        <div class="modal-body">
          <div class="english-phonetic-large">
            {#if englishWord.ukphone}
              <button 
                type="button" 
                class="phonetic-btn" 
                on:click={() => englishWord && playPronunciation(englishWord.ukspeech, 'uk')}
                disabled={audioPlaying}
              >
                <span class="phonetic-label">UK:</span>
                <span class="phonetic-text">/{englishWord.ukphone}/</span>
                <svg class="play-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            {/if}
            {#if englishWord.usphone}
              <button 
                type="button" 
                class="phonetic-btn" 
                on:click={() => englishWord && playPronunciation(englishWord.usspeech, 'us')}
                disabled={audioPlaying}
              >
                <span class="phonetic-label">US:</span>
                <span class="phonetic-text">/{englishWord.usphone}/</span>
                <svg class="play-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            {/if}
          </div>
          
          {#if englishWord.translations && englishWord.translations.length > 0}
            <div class="translations-section">
              <h4>释义</h4>
              {#each englishWord.translations as trans}
                <div class="translation-item">
                  <span class="pos">{trans.pos}.</span>
                  <span class="tran">{trans.tran_cn}</span>
                </div>
              {/each}
            </div>
          {/if}
          
          {#if englishWord.sentences && englishWord.sentences.length > 0}
            <div class="sentences-section">
              <h4>例句</h4>
              {#each englishWord.sentences as sentence}
                <div class="sentence-item">
                  <div class="sentence-en">{sentence.s_content}</div>
                  <div class="sentence-cn">{sentence.s_cn}</div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
  </div>
{/if}

<div class="extra-features-container">
  <!-- 抽签 -->
  <div class="feature">
    <div class="feature-text">
      <h3 class="feature-title">抽个签</h3>
      <p class="feature-sub">文昌帝君灵签</p>
    </div>
    <button
      type="button"
      class="feature-btn"
      on:click={drawLottery}
      disabled={lotteryLoading}
    >
      {lotteryLoading ? '抽签中…' : '抽一签'}
    </button>

    {#if lotteryError}
      <div class="error-message">{lotteryError}</div>
    {/if}
  </div>

  <!-- 每日英语 -->
  <div class="feature">
    <div class="feature-text">
      <h3 class="feature-title">背个单词</h3>
      <p class="feature-sub">随机词条，带音标与例句</p>
    </div>
    <button
      type="button"
      class="feature-btn"
      on:click={fetchEnglishWord}
      disabled={englishLoading}
    >
      {englishLoading ? '加载中…' : '学一个'}
    </button>

    {#if englishError}
      <div class="error-message">{englishError}</div>
    {/if}
  </div>
</div>



<style>
  /*
   * 两件小玩意并排。卡片去掉了 —— 它们各自只有一个标题和一个按钮，
   * 套上边框反而像两个需要认真对待的功能区。
   */
  /*
   * 先单列，容器够宽再分两列 —— 判据是容器不是视口：这块可以被调成
   * 三分之一栏，那时哪怕在 4K 屏上它也只有二十来字宽，塞两列就废了。
   */
  .extra-features-container {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.1rem;
  }
  @container mod (min-width: 21rem) {
    .extra-features-container {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
    }
  }

  .feature {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .feature-text { min-width: 0; }

  .feature-title {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0;
  }

  .feature-sub {
    margin: 0.1rem 0 0;
    font-size: 0.75rem;
    opacity: 0.45;
  }

  .feature-btn {
    width: 100%;
    margin-top: auto;
    padding: 0.5rem;
    background: transparent;
    color: var(--sec-tint, var(--primary));
    border: 1px solid color-mix(in oklab, var(--primary) 40%, transparent);
    border-radius: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, opacity 0.2s;
  }
  .feature-btn:hover:not(:disabled) {
    background: color-mix(in oklab, var(--primary) 10%, transparent);
    border-color: var(--sec-tint, var(--primary));
  }

  .feature-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  /* 全屏模态框样式 */
  .modal-root {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 999999 !important;
    background: rgba(0, 0, 0, 0.6) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 1rem !important;
    animation: fadeIn 0.2s ease-out !important;
    overflow-y: auto !important;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal-content {
    /* 原来硬编码 white，靠一条 :global(.dark) 覆盖；直接用主题变量更稳 */
    background: var(--card-bg);
    color: inherit;
    border-radius: 1rem;
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
    animation: slideUp 0.3s ease-out;
    overflow: hidden;
    position: relative;
  }

  :global(.dark) .modal-content {
    background: oklch(0.23 0.01 var(--hue));
    color: rgba(255, 255, 255, 0.95);
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-header {
    background: linear-gradient(135deg, var(--primary) 0%, oklch(0.65 0.14 calc(var(--hue) + 20)) 100%);
    padding: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: white;
    position: relative;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .modal-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
    animation: headerShine 3s infinite;
    pointer-events: none;
  }

  @keyframes headerShine {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .modal-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    color: white;
    position: relative;
    z-index: 1;
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    line-height: 1;
    position: relative;
    z-index: 1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.35);
    transform: rotate(90deg) scale(1.1);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  }

  .modal-body {
    padding: 2rem;
    overflow-y: auto;
    flex: 1;
  }

  /* 模态框滚动条样式 */
  .modal-body::-webkit-scrollbar {
    width: 8px;
  }

  .modal-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .modal-body::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    transition: background 0.2s;
  }

  .modal-body::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }

  :global(.dark) .modal-body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }

  :global(.dark) .modal-body::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* 抽签结果样式 */
  .lottery-image {
    width: 100%;
    max-width: 400px;
    height: auto;
    margin: 0 auto 1.5rem;
    display: block;
    border-radius: 0.5rem;
  }

  .lottery-poem {
    font-size: 1rem;
    line-height: 1.8;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--btn-card-bg-hover);
    border-radius: 0.5rem;
    font-style: italic;
  }

  .lottery-content {
    font-size: 0.9375rem;
    line-height: 1.8;
  }

  :global(.dark) .lottery-content {
    color: rgba(255, 255, 255, 0.9);
  }

  .lottery-poem {
    font-size: 1rem;
    line-height: 1.8;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--btn-card-bg-hover);
    border-radius: 0.5rem;
    font-style: italic;
  }

  :global(.dark) .lottery-poem {
    color: rgba(255, 255, 255, 0.9);
  }

  /* 英语单词样式 */
  .english-phonetic-large {
    font-size: 1rem;
    margin-bottom: 1.5rem;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .phonetic-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: var(--btn-card-bg-hover);
    border: 1px solid var(--line-divider);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  :global(.dark) .phonetic-btn {
    color: rgba(255, 255, 255, 0.9);
  }

  .phonetic-btn:hover:not(:disabled) {
    background: var(--sec-tint, var(--primary));
    color: white;
    border-color: var(--sec-tint, var(--primary));
  }

  .phonetic-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .phonetic-label {
    font-weight: 600;
    font-size: 0.875rem;
  }

  :global(.dark) .phonetic-label {
    color: rgba(255, 255, 255, 0.9);
  }

  .phonetic-text {
    font-size: 0.9375rem;
  }

  :global(.dark) .phonetic-text {
    color: rgba(255, 255, 255, 0.9);
  }

  .play-icon {
    width: 16px;
    height: 16px;
    opacity: 0.7;
  }

  .phonetic-btn:hover:not(:disabled) .play-icon {
    opacity: 1;
  }

  .translations-section,
  .sentences-section {
    margin-bottom: 1.5rem;
  }

  .translations-section h4,
  .sentences-section h4 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--sec-tint, var(--primary));
    margin-bottom: 0.75rem;
  }

  :global(.dark) .translations-section h4,
  :global(.dark) .sentences-section h4 {
    color: oklch(0.75 0.14 var(--hue));
  }

  .translation-item {
    padding: 0.5rem 0;
    font-size: 0.9375rem;
  }

  :global(.dark) .translation-item {
    color: rgba(255, 255, 255, 0.9);
  }

  .pos {
    color: var(--sec-tint, var(--primary));
    font-weight: 600;
    margin-right: 0.5rem;
  }

  :global(.dark) .pos {
    color: oklch(0.75 0.14 var(--hue));
  }

  .tran {
    color: inherit;
  }

  :global(.dark) .tran {
    color: rgba(255, 255, 255, 0.9);
  }

  .sentence-item {
    padding: 1rem;
    background: var(--btn-card-bg-hover);
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .sentence-en {
    font-size: 0.9375rem;
    line-height: 1.7;
    margin-bottom: 0.5rem;
    font-style: italic;
  }

  .sentence-cn {
    font-size: 0.875rem;
    line-height: 1.7;
    opacity: 0.8;
  }

  :global(.dark) .sentence-cn {
    color: rgba(255, 255, 255, 0.8);
  }

  .sentence-en {
    font-size: 0.9375rem;
    line-height: 1.7;
    margin-bottom: 0.5rem;
    font-style: italic;
  }

  :global(.dark) .sentence-en {
    color: rgba(255, 255, 255, 0.9);
  }

  @media (max-width: 768px) {
    /* 分列已交给 @container 判断，这里只管弹窗 */
    .modal-content {
      max-height: 90vh;
    }

    .modal-header {
      padding: 1rem;
    }

    .modal-title {
      font-size: 1.25rem;
    }

    .modal-body {
      padding: 1rem;
    }
  }
</style>
