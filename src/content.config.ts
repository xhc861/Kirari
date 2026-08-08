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
