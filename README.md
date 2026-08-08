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

## 🌿 分支

| 分支 | 内容 |
| --- | --- |
| `main` | 不含文章的干净模板 |
| `content` | 含完整文章与个人数据的站点 |

## 📄 License

This project is licensed with origin project ([Fuwari](https://github.com/saicaca/fuwari), MIT)。
