<script lang="ts">
  import { onMount } from 'svelte';
  import { getNavLinkEntries } from '@utils/navbar-utils';

  /*
   * 导航开关由 navBarConfig 自动生成。
   * 原先是把每一项写死成一个字段，加一个导航项（如「统计」）就要同步改
   * 设置面板、Navbar、NavMenuPanel 三处，漏一处就失效 —— 已经漏过两次。
   */
  const navEntries = getNavLinkEntries();
  
  // 特效设置
  let confettiEnabled = true;
  let particlesEnabled = true;
  let shootingStarsEnabled = true;
  let grayscaleEnabled = false;

  // 导航栏设置
  let navbarLinks: Record<string, boolean> = Object.fromEntries(
    navEntries.map((e) => [e.key, true]),
  );
  
  // 音乐设置
  let musicPlaylist: Array<{title: string, artist: string, src: string}> = [];
  let newSongTitle = '';
  let newSongArtist = '';
  let newSongSrc = '';
  
  let activeTab: 'effects' | 'music' | 'navbar' = 'effects';
  
  const VERSION = '1.0.0';
  
  onMount(() => {
    loadSettings();
    
    // 监听导航栏按钮点击
    const settingsBtn = document.getElementById('effects-settings-switch');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', togglePanel);
    }
    
    return () => {
      if (settingsBtn) {
        settingsBtn.removeEventListener('click', togglePanel);
      }
    };
  });
  
  function loadSettings() {
    const saved = localStorage.getItem('effectsSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      confettiEnabled = settings.confettiEnabled ?? true;
      particlesEnabled = settings.particlesEnabled ?? true;
      shootingStarsEnabled = settings.shootingStarsEnabled ?? true;
      grayscaleEnabled = settings.grayscaleEnabled ?? false;
      if (settings.navbarLinks) {
        /*
         * 只取当前实际存在的导航项，并让新增项默认显示 ——
         * 否则新加的导航项会因为老设置里查不到而被判成「隐藏」。
         * 展板的键曾从 gallery 改成 dashboard，这里一并兼容。
         */
        const saved = settings.navbarLinks;
        navbarLinks = Object.fromEntries(
          navEntries.map((e) => [
            e.key,
            saved[e.key] ?? (e.key === "dashboard" ? saved.gallery : undefined) ?? true,
          ]),
        );
      }
    }

    // 加载音乐播放列表
    const savedPlaylist = localStorage.getItem('musicPlaylist');
    if (savedPlaylist) {
      try {
        musicPlaylist = JSON.parse(savedPlaylist);
      } catch (e) {
        console.error('Failed to load music playlist:', e);
      }
    }
    
    applySettings();
  }
  
  function saveSettings() {
    localStorage.setItem('effectsSettings', JSON.stringify({
      confettiEnabled,
      particlesEnabled,
      shootingStarsEnabled,
      grayscaleEnabled,
      navbarLinks
    }));
    
    // 保存音乐播放列表
    localStorage.setItem('musicPlaylist', JSON.stringify(musicPlaylist));
  }
  
  function applySettings() {
    window.dispatchEvent(new CustomEvent('effectsSettingsChanged', {
      detail: {
        confettiEnabled,
        particlesEnabled,
        shootingStarsEnabled,
        grayscaleEnabled,
        navbarLinks,
        musicPlaylist
      }
    }));
    
    saveSettings();
  }
  
  function togglePanel() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
      panel.classList.toggle('float-panel-closed');
    }
  }
  
  function addSong() {
    if (newSongTitle.trim() && newSongArtist.trim() && newSongSrc.trim()) {
      musicPlaylist = [...musicPlaylist, {
        title: newSongTitle.trim(),
        artist: newSongArtist.trim(),
        src: newSongSrc.trim()
      }];
      newSongTitle = '';
      newSongArtist = '';
      newSongSrc = '';
      saveSettings();
      applySettings();
    }
  }
  
  function removeSong(index: number) {
    musicPlaylist = musicPlaylist.filter((_, i) => i !== index);
    saveSettings();
    applySettings();
  }
  
  function moveSongUp(index: number) {
    if (index > 0) {
      const temp = musicPlaylist[index];
      musicPlaylist[index] = musicPlaylist[index - 1];
      musicPlaylist[index - 1] = temp;
      musicPlaylist = [...musicPlaylist];
      saveSettings();
      applySettings();
    }
  }
  
  function moveSongDown(index: number) {
    if (index < musicPlaylist.length - 1) {
      const temp = musicPlaylist[index];
      musicPlaylist[index] = musicPlaylist[index + 1];
      musicPlaylist[index + 1] = temp;
      musicPlaylist = [...musicPlaylist];
      saveSettings();
      applySettings();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      const panel = document.getElementById('settings-panel');
      if (panel && !panel.classList.contains('float-panel-closed')) {
        panel.classList.add('float-panel-closed');
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div id="settings-panel" class="float-panel float-panel-closed absolute transition-all w-full max-w-[420px] right-4 px-4 py-4 top-[5.25rem]">
      <h3>设置</h3>
      
      <!-- 选项卡 -->
      <div class="tabs">
        <button 
          class="tab {activeTab === 'effects' ? 'active' : ''}"
          on:click={() => activeTab = 'effects'}
        >
          特效
        </button>
        <button 
          class="tab {activeTab === 'navbar' ? 'active' : ''}"
          on:click={() => activeTab = 'navbar'}
        >
          导航栏
        </button>
        <button 
          class="tab {activeTab === 'music' ? 'active' : ''}"
          on:click={() => activeTab = 'music'}
        >
          音乐
        </button>
      </div>
      
      <!-- 特效选项卡 -->
      {#if activeTab === 'effects'}
        <div class="tab-content">
          <div class="setting-item">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={confettiEnabled} on:change={applySettings} />
              <span class="checkbox-custom"></span>
              <span class="label-text">五彩纸屑（点击触发）</span>
            </label>
          </div>
          
          <div class="setting-item">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={particlesEnabled} on:change={applySettings} />
              <span class="checkbox-custom"></span>
              <span class="label-text">粒子背景</span>
            </label>
          </div>
          
          <div class="setting-item">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={shootingStarsEnabled} on:change={applySettings} />
              <span class="checkbox-custom"></span>
              <span class="label-text">流星效果</span>
            </label>
          </div>
          
          <div class="setting-item">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={grayscaleEnabled} on:change={applySettings} />
              <span class="checkbox-custom"></span>
              <span class="label-text">黑白模式
              </span>
            </label>
          </div>
        </div>
      {/if}
      
      <!-- 导航栏选项卡 -->
      {#if activeTab === 'navbar'}
        <div class="tab-content">
          <p class="section-desc">选择要在导航栏显示的链接</p>

          {#each navEntries as entry (entry.key)}
            <div class="setting-item">
              <label class="checkbox-label">
                <input type="checkbox" bind:checked={navbarLinks[entry.key]} on:change={applySettings} />
                <span class="checkbox-custom"></span>
                <span class="label-text">{entry.name}</span>
              </label>
            </div>
          {/each}

          <p class="hint">修改后需要刷新，否则会有异常</p>
        </div>
      {/if}
      
      <!-- 音乐选项卡 -->
      {#if activeTab === 'music'}
        <div class="tab-content">
          <p class="section-desc">自定义音乐播放器的播放列表</p>
          
          <!-- 添加歌曲表单 -->
          <div class="add-song-form">
            <input 
              type="text" 
              bind:value={newSongTitle} 
              placeholder="歌曲名称"
              class="song-input"
            />
            <input 
              type="text" 
              bind:value={newSongArtist} 
              placeholder="艺术家"
              class="song-input"
            />
            <input 
              type="text" 
              bind:value={newSongSrc} 
              placeholder="音频链接 (URL)"
              class="song-input"
            />
            <button on:click={addSong} class="add-btn" type="button">
              添加歌曲
            </button>
          </div>
          
          <!-- 播放列表 -->
          <div class="music-list">
            {#if musicPlaylist.length === 0}
              <p class="empty-hint">暂无歌曲，请添加歌曲到播放列表</p>
            {:else}
              {#each musicPlaylist as song, index}
                <div class="music-item">
                  <div class="music-item-info">
                    <div class="music-item-title">{song.title}</div>
                    <div class="music-item-artist">{song.artist}</div>
                  </div>
                  <div class="music-item-actions">
                    <button 
                      on:click={() => moveSongUp(index)} 
                      disabled={index === 0}
                      class="action-icon-btn"
                      title="上移"
                      type="button"
                    >
                      ↑
                    </button>
                    <button 
                      on:click={() => moveSongDown(index)} 
                      disabled={index === musicPlaylist.length - 1}
                      class="action-icon-btn"
                      title="下移"
                      type="button"
                    >
                      ↓
                    </button>
                    <button 
                      on:click={() => removeSong(index)} 
                      class="action-icon-btn delete-btn"
                      title="删除"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
      
      <div class="version">{VERSION}</div>
  </div>

<style>
  #settings-panel {
    z-index: 999;
    max-height: calc(100vh - 7rem);
    overflow-y: auto;
    padding-bottom: 1rem;
  }
  
  /* 美化设置面板滚动条 */
  #settings-panel::-webkit-scrollbar {
    width: 8px;
  }
  
  #settings-panel::-webkit-scrollbar-track {
    background: transparent;
  }
  
  #settings-panel::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    transition: background 0.2s;
  }

  #settings-panel::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
  
  :global(.dark) #settings-panel::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }

  :global(.dark) #settings-panel::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  /* Firefox 滚动条样式 */
  #settings-panel {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }
  
  :global(.dark) #settings-panel {
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }
  
  #settings-panel h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--primary);
  }
  
  :global(.dark) #settings-panel h3 {
    color: var(--primary);
  }
  
  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--line-divider);
  }
  
  .tab {
    flex: 1;
    padding: 0.75rem;
    border: none;
    background: transparent;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.95rem;
    opacity: 0.6;
  }
  
  :global(.dark) .tab {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .tab:hover {
    opacity: 1;
  }
  
  .tab.active {
    opacity: 1;
    border-bottom-color: var(--primary);
    font-weight: 600;
  }
  
  :global(.dark) .tab.active {
    color: rgba(255, 255, 255, 0.95);
  }
  
  .tab-content {
    animation: fadeInTab 0.2s ease-out;
  }
  
  @keyframes fadeInTab {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .setting-item {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--btn-card-bg-hover);
    border-radius: 0.5rem;
  }
  
  /* 美化复选框 */
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    position: relative;
  }
  
  .checkbox-label input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    cursor: pointer;
  }
  
  .checkbox-custom {
    width: 20px;
    height: 20px;
    border: 2px solid var(--line-divider);
    border-radius: 0.25rem;
    background: var(--card-bg);
    transition: all 0.2s;
    flex-shrink: 0;
    position: relative;
  }
  
  .checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
    background: var(--primary);
    border-color: var(--primary);
  }
  
  .checkbox-label input[type="checkbox"]:checked + .checkbox-custom::after {
    content: '';
    position: absolute;
    left: 6px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  
  .checkbox-label:hover .checkbox-custom {
    border-color: var(--primary);
  }
  
  .label-text {
    font-size: 0.95rem;
  }
  
  :global(.dark) .label-text {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .version {
    text-align: center;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line-divider);
    font-size: 0.75rem;
    opacity: 0.5;
  }
  
  :global(.dark) .version {
    color: rgba(255, 255, 255, 0.5);
  }
  
  .section-desc {
    font-size: 0.875rem;
    opacity: 0.7;
    margin-bottom: 1rem;
  }
  
  :global(.dark) .section-desc {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .hint {
    font-size: 0.8rem;
    opacity: 0.6;
    margin-top: 1rem;
    text-align: center;
    font-style: italic;
  }
  
  :global(.dark) .hint {
    color: rgba(255, 255, 255, 0.6);
  }
  
  /* 音乐选项卡样式 */
  .add-song-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .song-input {
    width: 100%;
    padding: 0.625rem;
    border: 1px solid var(--line-divider);
    background: var(--card-bg);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  
  :global(.dark) .song-input {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .song-input:focus {
    outline: none;
    border-color: var(--primary);
  }
  
  .add-btn {
    padding: 0.625rem 1rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .add-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  .add-btn:active {
    transform: translateY(0);
  }
  
  .music-list {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 1rem;
    padding-right: 0.25rem;
  }
  
  /* 美化滚动条 */
  .music-list::-webkit-scrollbar {
    width: 8px;
  }
  
  .music-list::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .music-list::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    transition: background 0.2s;
  }

  .music-list::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
  
  :global(.dark) .music-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }

  :global(.dark) .music-list::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  
  :global(.dark) .music-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }
  
  .music-list::-webkit-scrollbar-thumb:hover {
    background: var(--primary);
  }
  
  /* Firefox 滚动条样式 */
  .music-list {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05);
  }
  
  :global(.dark) .music-list {
    scrollbar-color: rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05);
  }
  
  .music-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--btn-card-bg-hover);
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
    transition: all 0.2s;
  }
  
  .music-item:hover {
    background: var(--btn-card-bg-hover);
    transform: translateX(2px);
  }
  
  .music-item-info {
    flex: 1;
    min-width: 0;
  }
  
  .music-item-title {
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0.25rem;
  }
  
  :global(.dark) .music-item-title {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .music-item-artist {
    font-size: 0.75rem;
    opacity: 0.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  :global(.dark) .music-item-artist {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .music-item-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }
  
  .action-icon-btn {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    background: rgba(0, 0, 0, 0.05);
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  :global(.dark) .action-icon-btn {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.9);
  }
  
  .action-icon-btn:hover:not(:disabled) {
    background: var(--primary);
    color: white;
    transform: scale(1.1);
  }
  
  .action-icon-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .delete-btn:hover {
    background: #ef4444;
  }
  
  .empty-hint {
    text-align: center;
    padding: 2rem 1rem;
    opacity: 0.6;
    font-size: 0.875rem;
  }
  
  :global(.dark) .empty-hint {
    color: rgba(255, 255, 255, 0.6);
  }
</style>
