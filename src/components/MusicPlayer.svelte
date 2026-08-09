<script lang="ts">
import { onDestroy, onMount } from "svelte";

interface Song {
	title: string;
	artist: string;
	src: string;
}

export let playlist: Song[] = [];

let audio: HTMLAudioElement;
let currentIndex = 0;
let isPlaying = false;
let currentTime = 0;
let duration = 0;
let volume = 0.7;
let isExpanded = false;
let isMuted = false;
let playMode: "loop" | "random" | "single" = "loop";
/** 切歌后是否应自动续播 —— 用于等 src 就绪再播，取代原来的 setTimeout 竞态 */
let autoPlayNext = false;
/** 加载失败的提示，播放器里直接显示，而不是静默失败 */
let errorMsg = "";

$: currentSong = playlist[currentIndex];
$: progress = duration > 0 ? (currentTime / duration) * 100 : 0;

onMount(() => {
	if (audio) {
		audio.volume = volume;
	}

	/*
	 * 播放列表来源，优先级从高到低：
	 *   1. localStorage —— 用户在设置面板里加的歌，属于个人偏好
	 *   2. public/music-playlist.json —— 站点自带的歌单
	 *   3. 组件传入的占位项
	 *
	 * 第 2 条原本是缺的：播放器只读 localStorage，那个 JSON 从没被读过，
	 * 站长编辑它不会有任何效果 —— 而展板其他模块全都读各自的 JSON。
	 */
	const savedPlaylist = localStorage.getItem("musicPlaylist");
	let loadedFromStorage = false;
	if (savedPlaylist) {
		try {
			const customPlaylist = JSON.parse(savedPlaylist);
			if (customPlaylist && customPlaylist.length > 0) {
				playlist = customPlaylist;
				loadedFromStorage = true;
			}
		} catch (e) {
			console.error("Failed to load custom playlist:", e);
		}
	}

	if (!loadedFromStorage) {
		fetch("/music-playlist.json", { cache: "no-store" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				// 只认有实际音频地址的条目，避免占位项挤掉真实歌单
				const usable = Array.isArray(data)
					? data.filter((s) => s && typeof s.src === "string" && s.src.trim())
					: [];
				if (usable.length > 0) playlist = usable;
			})
			.catch(() => {
				/* 文件缺失或格式错误时保持传入的占位项 */
			});
	}

	// 监听播放列表更新
	const handlePlaylistUpdate = () => {
		const savedPlaylist = localStorage.getItem("musicPlaylist");
		if (savedPlaylist) {
			try {
				const customPlaylist = JSON.parse(savedPlaylist);
				if (customPlaylist && customPlaylist.length > 0) {
					playlist = customPlaylist;
					// 如果当前索引超出范围，重置为 0
					if (currentIndex >= playlist.length) {
						currentIndex = 0;
					}
				}
			} catch (e) {
				console.error("Failed to load custom playlist:", e);
			}
		}
	};

	window.addEventListener("effectsSettingsChanged", handlePlaylistUpdate);

	return () => {
		window.removeEventListener("effectsSettingsChanged", handlePlaylistUpdate);
	};
});

/**
 * 播放/暂停。
 *
 * audio.play() 返回 Promise，可能被浏览器的自动播放策略拒绝。原实现无条件
 * 翻转 isPlaying，结果 UI 显示「播放中」但实际没声音。现在等 Promise 落定，
 * 状态则统一由 play/pause 事件回写（见 onMount），保证与真实状态一致。
 */
async function togglePlay() {
	if (!audio) return;
	if (!currentSong?.src) {
		errorMsg = "还没有可播放的音频";
		return;
	}

	if (isPlaying) {
		audio.pause();
		return;
	}

	try {
		errorMsg = "";
		await audio.play();
	} catch {
		// 多数是自动播放被拦截，或音频地址无效
		errorMsg = "播放被浏览器拦截，再点一次试试";
	}
}

function playNext() {
	if (playlist.length === 0) return; // 否则 % 0 会得到 NaN

	if (playMode === "random" && playlist.length > 1) {
		// 随机时避开当前曲目，否则「随机」经常听起来像单曲循环
		let next = currentIndex;
		while (next === currentIndex) {
			next = Math.floor(Math.random() * playlist.length);
		}
		currentIndex = next;
	} else {
		currentIndex = (currentIndex + 1) % playlist.length;
	}
	// 不再用 setTimeout 赌 src 已更新，改为等 canplay 事件
	autoPlayNext = true;
}

function playPrev() {
	if (playlist.length === 0) return;
	currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
	autoPlayNext = true;
}

function handleTimeUpdate() {
	if (audio) {
		currentTime = audio.currentTime;
	}
}

function handleLoadedMetadata() {
	if (audio) {
		duration = audio.duration;
	}
}

/**
 * src 就绪后再续播。
 *
 * 原来切歌用 setTimeout(100) 赌「src 已经更新好了」—— 加载慢于 100ms 时
 * play() 会作用在尚未就绪的元素上，表现为切歌后没声音。
 */
function handleCanPlay() {
	if (!autoPlayNext || !audio) return;
	autoPlayNext = false;
	audio.play().catch(() => {
		errorMsg = "这首播放失败了，试试下一首";
	});
}

function handleError() {
	autoPlayNext = false;
	isPlaying = false;
	errorMsg = currentSong?.src
		? "音频加载失败，检查一下地址"
		: "还没有可播放的音频";
}

function handleEnded() {
	if (playMode === "single") {
		if (!audio) return;
		audio.currentTime = 0;
		audio.play().catch(() => {});
	} else {
		playNext();
	}
}

function seek(e: MouseEvent) {
	if (!audio || !Number.isFinite(duration) || duration <= 0) return;
	const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
	// 点在轨道边缘时百分比会越界，必须夹紧
	const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
	audio.currentTime = percent * duration;
}

function changeVolume(e: Event) {
	const target = e.target as HTMLInputElement;
	volume = Number.parseFloat(target.value);
	if (audio) {
		audio.volume = volume;
		isMuted = volume === 0;
	}
}

function toggleMute() {
	if (audio) {
		if (isMuted) {
			audio.volume = volume;
			isMuted = false;
		} else {
			audio.volume = 0;
			isMuted = true;
		}
	}
}

function cyclePlayMode() {
	const modes: (typeof playMode)[] = ["loop", "random", "single"];
	const currentModeIndex = modes.indexOf(playMode);
	playMode = modes[(currentModeIndex + 1) % modes.length];
}

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds)) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function selectSong(index: number) {
	currentIndex = index;
	isPlaying = true;
	setTimeout(() => {
		if (audio) audio.play();
	}, 100);
}

onDestroy(() => {
	if (audio) {
		audio.pause();
	}
});
</script>

<audio
  bind:this={audio}
  src={currentSong?.src}
  preload="metadata"
  on:timeupdate={handleTimeUpdate}
  on:loadedmetadata={handleLoadedMetadata}
  on:ended={handleEnded}
  on:play={() => { isPlaying = true; errorMsg = ""; }}
  on:pause={() => (isPlaying = false)}
  on:canplay={handleCanPlay}
  on:error={handleError}
></audio>

<div class="music-player" class:expanded={isExpanded}>
  <!--
    收起态：一张会转的唱片，进度画成绕着它的圆环。
    原来是个常驻的大胶囊，歌名和作者一直摊开占地方，还要展开才看得到进度。
    现在默认只占一个圆，鼠标移上去才滑出歌名。
  -->
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="mini-player" class:playing={isPlaying}>
    <button
      class="disc-btn"
      on:click|stopPropagation={togglePlay}
      type="button"
      aria-label={isPlaying ? "暂停" : "播放"}
    >
      <!-- 进度环：不用展开就能看到播到哪了 -->
      <svg class="ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle class="ring-track" cx="22" cy="22" r="20" />
        <circle
          class="ring-fill"
          cx="22" cy="22" r="20"
          style={`stroke-dasharray:${2 * Math.PI * 20};stroke-dashoffset:${2 * Math.PI * 20 * (1 - progress / 100)}`}
        />
      </svg>

      <!-- 唱片本体，播放时才转；中心留孔，像真唱片 -->
      <span class="disc" class:spinning={isPlaying} aria-hidden="true">
        <span class="disc-hole"></span>
      </span>

      <!-- 播放/暂停图标叠在唱片上 -->
      <span class="disc-icon" aria-hidden="true">
        {#if isPlaying}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="7" y="5" width="3.5" height="14" rx="1" />
            <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        {/if}
      </span>
    </button>

    <!-- 歌名：默认收起，hover 或播放中才滑出 -->
    <div
      class="mini-info"
      on:click={() => (isExpanded = true)}
      role="button"
      tabindex="0"
      title="打开播放器"
    >
      <div class="mini-title">{currentSong?.title || "未选择歌曲"}</div>
      <div class="mini-sub">
        {#if errorMsg}
          <span class="mini-error">{errorMsg}</span>
        {:else}
          {currentSong?.artist || "点这里打开播放器"}
        {/if}
      </div>
    </div>
  </div>

  <!-- 展开的播放器 -->
  {#if isExpanded}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="player-overlay" on:click={() => isExpanded = false}>
      <div class="player-content" on:click|stopPropagation>
        <button class="close-btn" on:click={() => isExpanded = false} type="button">×</button>
        
        <!-- 封面 -->
        <div class="player-cover">
          <div class="default-cover-large" class:spinning={isPlaying}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        </div>
        
        <!-- 歌曲信息 -->
        <div class="song-info">
          <div class="song-title">{currentSong?.title || '未选择歌曲'}</div>
          <div class="song-artist">
            {#if errorMsg}
              <span class="song-error">{errorMsg}</span>
            {:else}
              {currentSong?.artist || ''}
            {/if}
          </div>
        </div>

        <!-- 进度条 -->
        <div class="progress-section">
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="progress-bar" on:click={seek}>
            <div class="progress-fill" style="width: {progress}%"></div>
            <div class="progress-thumb" style="left: {progress}%"></div>
          </div>
          <div class="time-display">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        <!-- 控制按钮 -->
        <div class="controls">
          <button class="control-btn mode-btn" on:click={cyclePlayMode} title="播放模式" type="button">
            {#if playMode === 'loop'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 1l4 4-4 4"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <path d="M7 23l-4-4 4-4"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            {:else if playMode === 'random'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14"/>
                <circle cx="6" cy="19" r="3"/>
              </svg>
            {/if}
          </button>

          <button class="control-btn" on:click={playPrev} type="button" aria-label="上一首">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>
          
          <button class="control-btn play-btn-large" on:click={togglePlay} type="button">
            {#if isPlaying}
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            {/if}
          </button>
          
          <button class="control-btn" on:click={playNext} type="button" aria-label="下一首">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 18h2V6h-2zm-11-7l8.5-6v12z"/>
            </svg>
          </button>

          <button class="control-btn volume-btn" on:click={toggleMute} type="button">
            {#if isMuted || volume === 0}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/>
              </svg>
            {:else if volume < 0.5}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            {/if}
          </button>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={isMuted ? 0 : volume}
            on:input={changeVolume}
            class="volume-slider"
          />
        </div>

        <!-- 播放列表 -->
        <div class="playlist">
          <div class="playlist-title">播放列表</div>
          <div class="playlist-items">
            {#each playlist as song, index}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div 
                class="playlist-item" 
                class:active={index === currentIndex}
                on:click={() => selectSong(index)}
              >
                <div class="playlist-item-index">{index + 1}</div>
                <div class="playlist-item-info">
                  <div class="playlist-item-title">{song.title}</div>
                  <div class="playlist-item-artist">{song.artist}</div>
                </div>
                {#if index === currentIndex && isPlaying}
                  <div class="playing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .music-player {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 9999;
  }
  
  /* ---------- 收起态：唱片 + 进度环 ---------- */
  .mini-player {
    display: flex;
    align-items: center;
    /* 靠右收起，hover 时向左展开歌名 */
    flex-direction: row-reverse;
    gap: 0;
    padding: 0.3rem;
    border-radius: 999px;
    background: var(--card-bg);
    border: 1px solid var(--line-divider);
    /* 用主题色的柔光替代原来的黑色重阴影，跟站点更贴 */
    box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.08),
      0 0 0 4px color-mix(in oklab, var(--primary) 8%, transparent);
    transition: box-shadow 0.3s ease, gap 0.3s ease, padding 0.3s ease;
  }
  .mini-player:hover {
    gap: 0.15rem;
    padding-left: 0.9rem;
    box-shadow:
      0 8px 26px rgba(0, 0, 0, 0.12),
      0 0 0 4px color-mix(in oklab, var(--primary) 16%, transparent);
  }

  .disc-btn {
    position: relative;
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    display: grid;
    place-items: center;
    -webkit-appearance: none;
    appearance: none;
    /*
     * 按钮本身是个方形盒子，不设圆角的话 :focus-visible 的轮廓会沿着方形画，
     * 看起来像唱片外面套了个方框。
     */
    border-radius: 50%;
    outline-offset: 3px;
  }
  .disc-btn:focus-visible {
    outline: 2px solid var(--primary);
  }
  .disc-btn:focus:not(:focus-visible) {
    outline: none;
  }

  /* 进度环 */
  .ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .ring-track,
  .ring-fill {
    fill: none;
    stroke-width: 2;
  }
  .ring-track { stroke: var(--line-divider); }
  .ring-fill {
    stroke: var(--primary);
    stroke-linecap: round;
    transition: stroke-dashoffset 0.25s linear;
  }

  /* 唱片本体：径向纹路 + 中心孔，比原来的纯色渐变圆有质感 */
  .disc {
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background:
      repeating-radial-gradient(
        circle at center,
        color-mix(in oklab, var(--primary) 82%, black) 0 2px,
        color-mix(in oklab, var(--primary) 70%, black) 2px 4px
      );
  }
  .disc-hole {
    width: 0.42rem;
    height: 0.42rem;
    border-radius: 50%;
    background: var(--card-bg);
  }
  .spinning { animation: spin 6s linear infinite; }
  @keyframes spin {
    from { transform: rotate(0); }
    to { transform: rotate(360deg); }
  }

  /* 图标叠在唱片上，默认淡出，hover 才明显 —— 不挡住唱片纹理 */
  .disc-icon {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    color: #fff;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }
  .disc-btn:hover .disc-icon,
  .disc-btn:focus-visible .disc-icon { opacity: 1; }
  .disc-icon svg { width: 1.1rem; height: 1.1rem; }

  /* ---------- 歌名：默认收起 ---------- */
  .mini-info {
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    cursor: pointer;
    transition: max-width 0.35s cubic-bezier(0.22, 0.8, 0.3, 1), opacity 0.25s ease;
    opacity: 0;
    text-align: right;
  }
  .mini-player:hover .mini-info,
  .mini-player:focus-within .mini-info {
    max-width: 11rem;
    opacity: 1;
  }

  .mini-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.8);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :global(.dark) .mini-title { color: rgba(255, 255, 255, 0.85); }

  .mini-sub {
    font-size: 0.7rem;
    color: rgba(0, 0, 0, 0.45);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :global(.dark) .mini-sub { color: rgba(255, 255, 255, 0.45); }

  .mini-error { color: oklch(0.6 0.18 25); }
  :global(.dark) .mini-error { color: oklch(0.75 0.16 25); }

  @media (prefers-reduced-motion: reduce) {
    .spinning { animation: none; }
    .mini-player, .mini-info, .disc-icon, .ring-fill { transition: none; }
  }

  /* 展开的播放器 */
  .player-overlay {
    position: fixed;
    inset: 0;
    z-index: 999998;
    /* 原来是 80% 黑 + 20px 模糊，对一个播放器来说太喧宾夺主 */
    background: rgba(0, 0, 0, 0.42);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    animation: fadeIn 0.25s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .player-content {
    background: var(--card-bg);
    /* 设了背景就设配套前景色，深色模式下才不会继承成黑字 */
    color: rgba(0, 0, 0, 0.85);
    border: 1px solid var(--line-divider);
    border-radius: 1.25rem;
    padding: 1.75rem;
    max-width: 380px;
    width: 100%;
    max-height: 90vh;
    box-shadow:
      0 18px 50px rgba(0, 0, 0, 0.18),
      0 0 0 6px color-mix(in oklab, var(--primary) 10%, transparent);
    animation: slideUp 0.28s cubic-bezier(0.22, 0.9, 0.3, 1);
    position: relative;
    display: flex;
    flex-direction: column;
  }

  :global(.dark) .player-content {
    color: rgba(255, 255, 255, 0.88);
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
  
  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.1);
    border: none;
    color: var(--text-color);
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  
  :global(.dark) .close-btn {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }
  
  .close-btn:hover {
    background: var(--primary);
    color: white;
    transform: rotate(90deg);
  }

  .player-cover {
    /* 与收起态保持同一套视觉语言：唱片而不是渐变方块 */
    width: 11rem;
    height: 11rem;
    margin: 0 auto 1.5rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background:
      repeating-radial-gradient(
        circle at center,
        color-mix(in oklab, var(--primary) 82%, black) 0 4px,
        color-mix(in oklab, var(--primary) 70%, black) 4px 8px
      );
    box-shadow:
      0 10px 30px rgba(0, 0, 0, 0.18),
      inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
  
  .default-cover-large {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    background: var(--card-bg);
    display: grid;
    place-items: center;
    color: color-mix(in oklab, var(--primary) 70%, black);
  }
  
  .default-cover-large svg {
    width: 1.1rem;
    height: 1.1rem;
    color: white;
    opacity: 0.9;
  }
  
  .song-info {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .song-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  :global(.dark) .song-title {
    color: rgba(255, 255, 255, 0.9);
  }

  /* 失败时在艺术家那一行直接说明，而不是静默 */
  .song-error {
    color: oklch(0.6 0.18 25);
  }
  :global(.dark) .song-error {
    color: oklch(0.75 0.16 25);
  }

  .song-artist {
    font-size: 0.95rem;
    opacity: 0.7;
  }
  
  :global(.dark) .song-artist {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .progress-section {
    margin-bottom: 2rem;
  }
  
  .progress-bar {
    height: 6px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 1rem;
    cursor: pointer;
    position: relative;
    margin-bottom: 0.5rem;
  }
  
  :global(.dark) .progress-bar {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .progress-fill {
    height: 100%;
    background: var(--primary);
    border-radius: 1rem;
    transition: width 0.1s linear;
  }
  
  .progress-thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 14px;
    background: var(--primary);
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: left 0.1s linear;
  }

  .time-display {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    opacity: 0.6;
  }
  
  :global(.dark) .time-display {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .control-btn {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.05);
    border: none;
    color: var(--text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  :global(.dark) .control-btn {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.9);
  }
  
  .control-btn:hover {
    background: var(--primary);
    color: white;
    transform: scale(1.1);
  }

  .control-btn svg {
    width: 1.25rem;
    height: 1.25rem;
  }
  
  .play-btn-large {
    width: 3.5rem;
    height: 3.5rem;
    background: var(--primary);
    color: white;
  }
  
  .play-btn-large:hover {
    background: var(--primary);
    opacity: 0.9;
  }
  
  .play-btn-large svg {
    width: 1.75rem;
    height: 1.75rem;
  }
  
  .volume-slider {
    width: 80px;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 1rem;
    outline: none;
  }
  
  :global(.dark) .volume-slider {
    background: rgba(255, 255, 255, 0.1);
  }
  
  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--primary);
    border-radius: 50%;
    cursor: pointer;
  }

  .volume-slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--primary);
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
  
  .playlist {
    border-top: 1px solid var(--line-divider);
    padding-top: 1rem;
  }
  
  .playlist-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    opacity: 0.8;
  }
  
  :global(.dark) .playlist-title {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .playlist-items {
    max-height: 250px;
    overflow-y: auto;
    padding-right: 0.5rem;
    margin-right: -0.25rem;
  }
  
  /* 美化滚动条 */
  .playlist-items::-webkit-scrollbar {
    width: 8px;
  }
  
  .playlist-items::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .playlist-items::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    transition: background 0.2s;
  }

  .playlist-items::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
  
  :global(.dark) .playlist-items::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }

  :global(.dark) .playlist-items::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  .playlist-items::-webkit-scrollbar-thumb:hover {
    background: var(--primary);
  }
  
  /* Firefox 滚动条样式 */
  .playlist-items {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.15) transparent;
  }
  
  :global(.dark) .playlist-items {
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  }
  
  .playlist-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .playlist-item:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  
  :global(.dark) .playlist-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .playlist-item.active {
    background: var(--primary);
    color: white;
  }
  
  .playlist-item.active .playlist-item-artist {
    color: rgba(255, 255, 255, 0.8);
  }
  
  .playlist-item-index {
    width: 1.5rem;
    text-align: center;
    font-size: 0.875rem;
    opacity: 0.6;
  }
  
  :global(.dark) .playlist-item-index {
    color: rgba(255, 255, 255, 0.7);
    opacity: 1;
  }
  
  .playlist-item-info {
    flex: 1;
    min-width: 0;
  }
  
  .playlist-item-title {
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  :global(.dark) .playlist-item-title {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .playlist-item-artist {
    font-size: 0.75rem;
    opacity: 0.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  :global(.dark) .playlist-item-artist {
    color: rgba(255, 255, 255, 0.7);
  }

  .playing-indicator {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 16px;
  }
  
  .playing-indicator span {
    width: 3px;
    background: white;
    border-radius: 2px;
    animation: wave 1s ease-in-out infinite;
  }
  
  .playing-indicator span:nth-child(1) {
    animation-delay: 0s;
  }
  
  .playing-indicator span:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .playing-indicator span:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes wave {
    0%, 100% {
      height: 4px;
    }
    50% {
      height: 16px;
    }
  }
  
  @media (max-width: 768px) {
    .music-player {
      bottom: 1rem;
      right: 1rem;
    }
    
    .player-content {
      padding: 1.5rem;
    }
  }
</style>
