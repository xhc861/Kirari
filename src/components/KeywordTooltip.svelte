<script lang="ts">
import { onMount } from "svelte";

let glossary: Record<
	string,
	{ title: string; description: string; url: string }
> = {};
let currentTooltip: HTMLElement | null = null;

onMount(async () => {
	// 加载知识库
	try {
		const response = await fetch("/glossary.json", { cache: "no-store" });
		const data = await response.json();
		glossary = data.keywords;

		// 等待 DOM 完全加载后再处理
		setTimeout(() => {
			processArticleContent();
			setupTooltipListeners();
		}, 100);
	} catch (error) {
		console.error("Failed to load glossary:", error);
	}
});

function setupTooltipListeners() {
	const highlights = document.querySelectorAll(".keyword-highlight");

	highlights.forEach((highlight) => {
		let showTimeout: number | null = null;

		highlight.addEventListener("mouseenter", (e) => {
			const target = e.currentTarget as HTMLElement;
			const tooltip = target.querySelector(".tooltip-content") as HTMLElement;

			if (tooltip) {
				// 立即隐藏所有其他提示框
				hideAllTooltips();

				// 设置延迟显示
				showTimeout = window.setTimeout(() => {
					tooltip.classList.add("show");
					currentTooltip = tooltip;

					// 调整位置
					setTimeout(() => {
						adjustTooltipPosition(tooltip, target);
					}, 50);
				}, 500);
			}
		});

		highlight.addEventListener("mouseleave", (e) => {
			// 清除显示定时器
			if (showTimeout) {
				clearTimeout(showTimeout);
				showTimeout = null;
			}

			const target = e.currentTarget as HTMLElement;
			const tooltip = target.querySelector(".tooltip-content") as HTMLElement;

			if (tooltip) {
				// 延迟隐藏，给用户时间移到提示框上
				setTimeout(() => {
					if (!tooltip.matches(":hover")) {
						tooltip.classList.remove("show");
						if (currentTooltip === tooltip) {
							currentTooltip = null;
						}
					}
				}, 100);
			}
		});
	});

	// 为提示框添加事件监听
	document.querySelectorAll(".tooltip-content").forEach((tooltip) => {
		tooltip.addEventListener("mouseleave", () => {
			(tooltip as HTMLElement).classList.remove("show");
			if (currentTooltip === tooltip) {
				currentTooltip = null;
			}
		});
	});
}

function hideAllTooltips() {
	document.querySelectorAll(".tooltip-content.show").forEach((tooltip) => {
		tooltip.classList.remove("show");
	});
	currentTooltip = null;
}

function adjustTooltipPosition(tooltip: HTMLElement, target: HTMLElement) {
	const tooltipRect = tooltip.getBoundingClientRect();
	const targetRect = target.getBoundingClientRect();

	// 获取文章容器的边界
	const articleContent = document.querySelector(".markdown-content");
	const articleRect = articleContent?.getBoundingClientRect();

	// 重置样式
	tooltip.style.left = "";
	tooltip.style.right = "";
	tooltip.style.transform = "";

	const padding = 16;

	// 计算相对于视口的边界
	const leftBoundary = articleRect ? articleRect.left : padding;
	const rightBoundary = articleRect
		? articleRect.right
		: window.innerWidth - padding;

	// 检查是否超出左边界
	if (tooltipRect.left < leftBoundary) {
		const offset = leftBoundary - targetRect.left + padding;
		tooltip.style.left = `${offset}px`;
		tooltip.style.transform = "translateX(0) translateY(0)";
	}
	// 检查是否超出右边界
	else if (tooltipRect.right > rightBoundary) {
		const offset = targetRect.right - rightBoundary - padding;
		tooltip.style.left = "auto";
		tooltip.style.right = `${offset}px`;
		tooltip.style.transform = "translateX(0) translateY(0)";
	}
	// 默认居中
	else {
		tooltip.style.left = "50%";
		tooltip.style.transform = "translateX(-50%) translateY(0)";
	}
}

function processArticleContent() {
	const articleContent = document.querySelector(".markdown-content");

	if (!articleContent) {
		return;
	}


	// 获取所有段落和标题
	const elements = articleContent.querySelectorAll(
		"p, h1, h2, h3, h4, h5, h6, li, td, th",
	);

	elements.forEach((element) => {
		processElement(element);
	});

}

function processElement(element: Element) {
	// 跳过代码块
	if (element.closest("pre, code")) return;

	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
		acceptNode: (node) => {
			const parent = node.parentElement;
			if (!parent) return NodeFilter.FILTER_REJECT;

			// 跳过代码、脚本等
			if (
				parent.tagName === "CODE" ||
				parent.tagName === "PRE" ||
				parent.tagName === "SCRIPT" ||
				parent.tagName === "STYLE" ||
				parent.classList.contains("keyword-highlight")
			) {
				return NodeFilter.FILTER_REJECT;
			}

			return NodeFilter.FILTER_ACCEPT;
		},
	});

	const textNodes: Text[] = [];
	let currentNode = walker.nextNode();
	while (currentNode) {
		textNodes.push(currentNode as Text);
		currentNode = walker.nextNode();
	}

	textNodes.forEach((textNode) => {
		const text = textNode.textContent || "";
		if (!text.trim()) return;

		let newHTML = text;
		let hasMatch = false;

		// 按关键字长度排序，优先匹配长关键字
		const sortedKeywords = Object.keys(glossary).sort(
			(a, b) => b.length - a.length,
		);

		sortedKeywords.forEach((keyword) => {
			const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = new RegExp(`(${escapedKeyword})`, "gi");

			if (regex.test(newHTML)) {
				hasMatch = true;
				const info = glossary[keyword];
				newHTML = newHTML.replace(regex, (match) => {
					const tooltipHtml = `<div class="tooltip-content"><div class="tooltip-title">${info.title}</div><div class="tooltip-description">${info.description}</div>${info.url ? `<a href="${info.url}" target="_blank" rel="noopener noreferrer" class="tooltip-link">查看更多 →</a>` : ""}</div>`;
					return `<span class="keyword-highlight" data-tooltip="${match}">${match}${tooltipHtml}</span>`;
				});
			}
		});

		if (hasMatch) {
			const span = document.createElement("span");
			span.innerHTML = newHTML;
			textNode.replaceWith(span);
		}
	});
}
</script>

<style>
  :global(.keyword-highlight) {
    position: relative;
    border-bottom: 1px dotted rgba(0, 0, 0, 0.2);
    cursor: help;
    transition: all 0.2s ease;
    display: inline;
  }

  :global(.dark) :global(.keyword-highlight) {
    border-bottom-color: rgba(255, 255, 255, 0.2);
  }

  :global(.keyword-highlight:hover) {
    border-bottom-style: solid;
    border-bottom-color: rgba(0, 0, 0, 0.4);
    background-color: rgba(0, 0, 0, 0.03);
  }

  :global(.dark) :global(.keyword-highlight:hover) {
    border-bottom-color: rgba(255, 255, 255, 0.4);
    background-color: rgba(255, 255, 255, 0.05);
  }

  /* 提示框内容 - 默认隐藏 */
  :global(.tooltip-content) {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-10px);
    margin-bottom: 8px;
    
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    min-width: 200px;
    max-width: 300px;
    width: max-content;
    
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
    
    z-index: 9999;
    white-space: normal;
    
    /* 关键：不占据文档流空间 */
    display: none;
  }

  /* 使用 class 控制显示，而不是 :hover */
  :global(.tooltip-content.show) {
    display: block;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
  }

  /* 鼠标在提示框上时保持显示 */
  :global(.tooltip-content:hover) {
    display: block;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  /* 深色模式 */
  :global(.dark) :global(.tooltip-content) {
    background: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }

  /* 提示框标题 */
  :global(.tooltip-title) {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 6px;
    color: #111827;
  }

  :global(.dark) :global(.tooltip-title) {
    color: #f9fafb;
  }

  /* 提示框描述 */
  :global(.tooltip-description) {
    font-size: 13px;
    line-height: 1.5;
    color: #6b7280;
    margin-bottom: 8px;
  }

  :global(.dark) :global(.tooltip-description) {
    color: #d1d5db;
  }

  /* 查看更多链接 */
  :global(.tooltip-link) {
    display: inline-block;
    font-size: 12px;
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  :global(.tooltip-link:hover) {
    color: #2563eb;
  }

  :global(.dark) :global(.tooltip-link) {
    color: #60a5fa;
  }

  :global(.dark) :global(.tooltip-link:hover) {
    color: #93c5fd;
  }

  /* 小箭头 */
  :global(.tooltip-content::after) {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: white;
  }

  :global(.dark) :global(.tooltip-content::after) {
    border-top-color: #1f2937;
  }

  /* 响应式调整 - 在小屏幕上 */
  @media (max-width: 640px) {
    :global(.tooltip-content) {
      left: 0;
      right: 0;
      transform: translateX(0) translateY(-10px);
      margin-left: 8px;
      margin-right: 8px;
      width: auto;
      max-width: calc(100vw - 32px);
    }

    :global(.keyword-highlight:hover .tooltip-content) {
      transform: translateX(0) translateY(0);
    }

    :global(.tooltip-content::after) {
      left: 20px;
      transform: translateX(0);
    }
  }

  /* 防止超出左右边界 */
  @media (min-width: 641px) {
    :global(.tooltip-content) {
      /* 使用 CSS 变量来动态调整位置 */
      max-width: min(300px, calc(100vw - 32px));
    }
  }

  /* 确保提示框内容不会被截断 */
  :global(.tooltip-content) {
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
</style>
