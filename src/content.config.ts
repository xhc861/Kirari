/*
 * Astro 6+ 移除了旧版内容集合，必须使用 Content Layer API：
 * - 配置文件从 src/content/config.ts 移到 src/content.config.ts
 * - 每个集合都要显式声明 loader
 * - 不再有 type: 'content' / 'data'
 * - 消费端 entry.slug → entry.id，entry.render() → render(entry)
 */
import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const postsCollection = defineCollection({
	loader: glob({ base: "./src/content/posts", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),

		/**
		 * 文章顶部的简述。写在 frontmatter 里，构建期直接渲染 —— 取代了原先
		 * 调用大模型接口的 AISummary 组件：文章数量不多，逐篇写好比每次访问都
		 * 打一次 API 更快、更省，也不依赖第三方可用性。
		 */
		summary: z.string().optional().default(""),

		/** 所属系列。同一 series 的文章会在文章页互相串联 */
		series: z.string().optional().default(""),
		/** 在系列中的次序，从 1 开始 */
		order: z.number().optional(),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});

/**
 * 谱曲作品。
 *
 * 和文章分开成独立集合，而不是给文章打个「谱曲」分类：作品有自己的元信息
 * （编制、时长、试听、乐谱文件），塞进文章的 schema 里会让两边都别扭。
 * 正文写创作手记，可以为空。
 *
 * 与文章同规矩：实际作品只进 content 分支，main 上这个目录只有 .gitkeep。
 */
const scoresCollection = defineCollection({
	loader: glob({ base: "./src/content/scores", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),

		/** 编制或主奏乐器，如「钢琴」「弦乐四重奏」 */
		instrument: z.string().optional().default(""),
		/** 时长，写成 "3:42" 这样的字符串，不做解析 */
		duration: z.string().optional().default(""),
		/** 试听音频地址，留空则不显示播放条 */
		audio: z.string().optional().default(""),
		/** 乐谱文件（PDF 等），留空则不显示下载按钮 */
		sheet: z.string().optional().default(""),
		cover: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
	}),
});

const specCollection = defineCollection({
	loader: glob({ base: "./src/content/spec", pattern: "**/*.{md,mdx}" }),
	schema: z.object({}),
});

export const collections = {
	posts: postsCollection,
	scores: scoresCollection,
	spec: specCollection,
};
