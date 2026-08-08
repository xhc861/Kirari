/**
 * 把配置里写的图片路径解析成社交分享用的绝对 URL。
 *
 * frontmatter / config 里的 image 可能是三种形式：
 *   - src 相对路径（如 assets/images/cover.jpg）→ 需要经过 Astro 图片管线拿到构建后的 URL
 *   - public 绝对路径（以 / 开头）→ 直接拼站点域名
 *   - 远程地址（http/https/data:）→ 原样使用
 *
 * og:image 必须是绝对 URL，相对路径在各家社交平台抓取时都会失效。
 */

/** src 目录下的图片。与 ImageWrapper 用同一套 glob 解析方式。 */
const localImages = import.meta.glob<ImageMetadata>("../**", {
	import: "default",
});

function isRemote(src: string): boolean {
	return (
		src.startsWith("http://") ||
		src.startsWith("https://") ||
		src.startsWith("data:")
	);
}

export async function resolveOgImage(
	src: string | undefined,
	site: URL | undefined,
): Promise<string | undefined> {
	if (!src || src.trim() === "") return undefined;

	if (isRemote(src)) return src;

	// public 目录下的资源
	if (src.startsWith("/")) {
		return site ? new URL(src, site).href : undefined;
	}

	// src 目录下的资源，交给图片管线
	const normalized = `../${src}`.replace(/\\/g, "/");
	const loader = localImages[normalized];
	if (!loader) return undefined;

	try {
		const img = await loader();
		return site ? new URL(img.src, site).href : img.src;
	} catch {
		return undefined;
	}
}
