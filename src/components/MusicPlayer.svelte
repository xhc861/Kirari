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

function togglePlay() {
	if (!audio) return;

	if (isPlaying) {
		audio.pause();
	} else {
		audio.play();
	}
	isPlaying = !isPlaying;
}

function playNext() {
	if (playMode === "random") {
		currentIndex = Math.floor(Math.random() * playlist.length);
	} else {
		currentIndex = (currentIndex + 1) % playlist.length;
	}
	setTimeout(() => {
		if (audio) audio.play();
	}, 100);
}

function playPrev() {
	currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
	setTimeout(() => {
		if (audio) audio.play();
	}, 100);
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

function handleEnded() {
	if (playMode === "single") {
		if (audio) audio.play();
	} else {
		playNext();
	}
}

function seek(e: MouseEvent) {
	const progressBar = e.currentTarget as HTMLElement;
	const rect = progressBar.getBoundingClientRect();
	const percent = (e.clientX - rect.left) / rect.width;
	if (audio) {
		audio.currentTime = percent * duration;
	}
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
  on:timeupdate={handleTimeUpdate}
  on:loadedmetadata={handleLoadedMetadata}
  on:ended={handleEnded}
></audio>

<div class="music-player" class:expanded={isExpanded}>
  <!-- 迷你播放器 -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="mini-player" on:click={() => isExpanded = !isExpanded} role="button" tabindex="0">
    <div class="mini-cover">
      <div class="default-cover" class:spinning={isPlaying}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
    </div>
    
    <div class="mini-info">
      <div class="mini-title">{currentSong?.title || '未选择歌曲'}</div>
      <div class="mini-artist">{currentSong?.artist || ''}</div>
    </div>
    
    <button class="mini-play-btn" on:click|stopPropagation={togglePlay} type="button">
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
          <div class="song-artist">{currentSong?.artist || ''}</div>
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
  
  /* 迷你播放器 */
  .mini-player {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--card-bg);
    border: 1px solid var(--line-divider);
    border-radius: 1.5rem;
    padding: 0.5rem 1rem 0.5rem 0.5rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: all 0.3s;
    backdrop-filter: blur(10px);
  }
  
  .mini-player:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  }
  
  .mini-cover {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: linear-gradient(135deg, var(--primary) 0%, oklch(0.65 0.14 calc(var(--hue) + 20)) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .default-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .default-cover {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: white;
  }
  
  .default-cover svg {
    width: 1.5rem;
    height: 1.5rem;
    color: white;
  }
  
  .spinning {
    animation: spin 10s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .mini-info {
    flex: 1;
    min-width: 0;
  }
  
  .mini-title {
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  :global(.dark) .mini-title {
    color: rgba(255, 255, 255, 0.9)
  }

  .mini-artist {
    font-size: 0.75rem;
    opacity: 0.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  :global(.dark) .mini-artist {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .mini-play-btn {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: var(--primary);
    border: none;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  
  .mini-play-btn:hover {
    transform: scale(1.1);
  }
  
  .mini-play-btn svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  /* 展开的播放器 */
  .player-overlay {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 999998 !important;
    background: rgba(0, 0, 0, 0.8) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 1rem !important;
    animation: fadeIn 0.3s ease-out !important;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .player-content {
    background: var(--card-bg);
    border-radius: 2.5rem;
    padding: 2rem;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: visible;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.3s ease-out;
    position: relative;
    display: flex;
    flex-direction: column;
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
    width: 100%;
    aspect-ratio: 1;
    border-radius: 2rem;
    overflow: hidden;
    margin-bottom: 1.5rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    background: linear-gradient(135deg, var(--primary) 0%, oklch(0.65 0.14 calc(var(--hue) + 20)) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .default-cover-large {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 5rem;
    color: white;
  }
  
  .default-cover-large svg {
    width: 8rem;
    height: 8rem;
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
