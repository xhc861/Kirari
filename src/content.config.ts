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

const specCollection = defineCollection({
	loader: glob({ base: "./src/content/spec", pattern: "**/*.{md,mdx}" }),
	schema: z.object({}),
});

export const collections = {
	posts: postsCollection,
	spec: specCollection,
};
