<script lang="ts">
/**
 * 最近更新。
 *
 * 补展板最大的一个窟窿：这是一个博客的展板，此前却没有任何一条通往文章的路 ——
 * 写作统计画了热力图、月度字数、分类饼图，唯独点不进任何一篇。
 *
 * 数据构建期算好，由 dashboard.astro 传进来，不请求接口。
 */

import { relativeDay } from "@utils/date-utils";
import type { RecentPost } from "@utils/stats-utils";
import { createEventDispatcher } from "svelte";

export let posts: RecentPost[] = [];

const dispatch = createEventDispatcher<{ summary: string }>();

/** 摘要给最新一篇的时间：折叠着也知道这站最近有没有动静 */
$: dispatch(
	"summary",
	posts.length ? relativeDay(new Date(posts[0].published)) : "还没有",
);

function chars(n: number): string {
	return n >= 10000 ? `${(n / 10000).toFixed(1)} 万字` : `${n} 字`;
}
</script>

{#if posts.length}
  <ul class="list">
    {#each posts as post (post.url)}
      <li class="item">
        <a class="link" href={post.url}>
          <span class="title">{post.title}</span>
          <span class="meta">
            <span class="cat">{post.category}</span>
            <span class="dot" aria-hidden="true">·</span>
            <span class="len">{chars(post.chars)}</span>
          </span>
        </a>
        <time
          class="when"
          datetime={post.published}
          title={post.published.slice(0, 10)}
        >{relativeDay(new Date(post.published))}</time>
      </li>
    {/each}
  </ul>
{:else}
  <p class="empty">还没有文章。写下第一篇，这里就会有东西了。</p>
{/if}

<style>
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .item {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--line-divider);
  }
  .item:last-child { border-bottom: none; }

  .link {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    text-decoration: none;
    color: inherit;
  }

  .title {
    font-size: 0.92rem;
    font-weight: 500;
    line-height: 1.4;
    transition: color 0.15s ease;
    /* 长标题截断，不把这一列撑爆 */
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .link:hover .title { color: var(--sec-tint, var(--primary)); }

  .meta {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    opacity: 0.45;
  }
  .dot { opacity: 0.6; }

  .when {
    flex-shrink: 0;
    font-size: 0.75rem;
    opacity: 0.4;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .empty {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.6;
    opacity: 0.5;
  }
</style>
