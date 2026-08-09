# Kirari

> **Kirari**（きらり）—— 闪耀的样子。

一个基于 Astro 7 + Svelte 5 + Tailwind 4 的博客主题，在 [Fuwari](https://github.com/saicaca/fuwari) 基础上深度二次开发。

原型是 [fuwari](https://github.com/saicaca/fuwari)（日译：轻轻的），特别感谢！Kirari 在其之上重写了样式体系、内容管线与展板系统。

## 🧱 技术栈

| 项 | 版本 |
| --- | --- |
| Astro | 7.x（Content Layer API / Vite 8 / Rust 编译器） |
| Svelte | 5.x |
| Tailwind CSS | 4.x（CSS-first，`@tailwindcss/vite`） |
| Markdown | unified（remark / rehype 生态） |
| 搜索 | Pagefind |
| 部署 | Vercel |

## ⚡ Commands

All commands are run from the root of the project, from a terminal:

| Command                    | Action                                           |
| -------------------------- | ------------------------------------------------ |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`                 | Starts local dev server at `localhost:4321`      |
| `pnpm build`               | Build your production site to `./dist/`          |
| `pnpm preview`             | Preview your build locally, before deploying     |
| `pnpm check`               | Run checks for errors in your code               |
| `pnpm format`              | Format your code using Biome                     |
| `pnpm new-post <filename>` | Create a new post                                |
| `pnpm astro ...`           | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro --help`        | Get help using the Astro CLI                     |

## 🎨 样式说明

Tailwind v4 下，样式入口为 `src/styles/global.css`，Tailwind 本体与自定义 utility 集中在
`src/styles/theme.css`（引用根）。组件或页面的 scoped `<style>` 中若要用 `@apply`，
需先在样式块内写 `@reference "…/theme.css";`。

## 🌿 分支与发布流程

| 分支 | 内容 | 用途 |
| --- | --- | --- |
| `content` | 完整站点：全部文章与个人数据 | **线上部署的就是这个分支** |
| `main` | 不含文章的干净模板 | 供他人 fork 使用 |

两条铁律：

1. **文章只写在 `content`**，`main` 的 `src/content/posts/` 永远只有 `.gitkeep`。
2. **代码改动先在 `main` 做，再 cherry-pick 到 `content`**；不要用 merge ——
   merge 会把 main 上「清空文章」那个提交带过去，把 `content` 的文章删掉。

### 发布一篇新文章

```bash
git checkout content              # 文章只在这个分支
pnpm new-post 我的新文章           # 生成 src/content/posts/我的新文章.md
# ……写正文，记得填 frontmatter 的 summary（文章顶部的「太长不看」）

pnpm build                        # 本地验证：能构建、渲染无误
git add src/content/posts/
git commit -m "post: 我的新文章"
git push origin content           # 推完 Vercel 自动部署
```

`main` 不需要任何操作 —— 它本来就不该有文章。

### 改代码（不涉及文章）

```bash
git checkout main
# ……改代码
pnpm check && pnpm build          # 两项都要过
git commit -am "fix: xxx"
git push origin main

git checkout content
git cherry-pick main              # 把这次改动搬过来
pnpm build                        # 关键：main 没有文章，文章页的代码在 main 上根本
                                  # 不会被编译，有些错误只在 content 才暴露
git push origin content
```

### 常见问题

**文章不小心提交到 `main` 了？**

```bash
git checkout main
git rm src/content/posts/<文件名>
git commit -m "chore: 从 main 移除文章"
git push origin main
```

**只想改一篇已发布的文章？** 直接在 `content` 上改并推送即可，与 `main` 无关。

**Vercel 部署的是哪个分支？** 应为 `content`。若被切成 `main`，线上会变成一个
没有任何文章的空站 —— 改动 Vercel 设置时留意这一点。

## 📄 License

This project is licensed with origin project ([Fuwari](https://github.com/saicaca/fuwari), MIT)。
