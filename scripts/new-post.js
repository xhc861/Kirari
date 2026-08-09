/* This is a script to create a new post markdown file with front-matter */

import { execSync } from "node:child_process"
import fs from "fs"
import path from "path"

/*
 * 文章只属于 content 分支 —— main 是给别人 fork 用的干净模板，
 * 里面的 src/content/posts 应当永远只有 .gitkeep。
 * 在 main 上建文章是个容易犯的错（我自己就犯过），这里直接拦下。
 */
function currentBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
  } catch {
    return null // 不在 git 仓库里就不管
  }
}

const branch = currentBranch()
if (branch === "main") {
  console.error(`当前在 main 分支，文章不应该建在这里。

main 是不含文章的干净模板，文章只写在 content 分支：

    git checkout content
    pnpm new-post ${process.argv[2] ?? "<文件名>"}

详见 README 的「分支与发布流程」。`)
  process.exit(1)
}

function getDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error(`Error: No filename argument provided
Usage: npm run new-post -- <filename>`)
  process.exit(1) // Terminate the script and return error code 1
}

let fileName = args[0]

// Add .md extension if not present
const fileExtensionRegex = /\.(md|mdx)$/i
if (!fileExtensionRegex.test(fileName)) {
  fileName += ".md"
}

const targetDir = "./src/content/posts/"
const fullPath = path.join(targetDir, fileName)

if (fs.existsSync(fullPath)) {
  console.error(`Error: File ${fullPath} already exists `)
  process.exit(1)
}

// recursive mode creates multi-level directories
const dirPath = path.dirname(fullPath)
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
}

const content = `---
title: ${args[0]}
published: ${getDate()}
description: ''
# 文章顶部 TL;DR 的简述，一两句话说清这篇讲了什么
summary: ''
image: ''
tags: []
category: ''
draft: false
lang: ''
# 属于某个系列时填写，同系列文章会在文章页互相串联
# series: ''
# order: 1
---
`

fs.writeFileSync(path.join(targetDir, fileName), content)

console.log(`Post ${fullPath} created`)
