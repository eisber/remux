# CLAUDE.md

本文件为代理在本仓库工作时的指令手册。所有规则必须严格遵守。

## 项目概述

Remux 是一个基于 Web 的远程 Zellij 工作区控制台，通过 tunnel 让用户从手机、平板或其他电脑监控和控制终端会话。以 npm 包分发（`npx remux`）。使用 pnpm 作为包管理器。

- **GitHub**: github.com/yaoshenwang/remux
- **许可证**: MIT

## 沟通语言

所有与用户的交流必须使用中文。代码注释和 commit message 使用英文。

## 分支纪律（强制）

- 维护 `main`（生产）和 `dev`（开发）两个长期分支
- **禁止直接在 `main` 或 `dev` 上修改代码**
- 所有开发工作从 `dev` 创建 feature 分支，使用 `git worktree` 隔离开发
- 完成后合并回 `dev`，`dev` 定期合并到 `main` 发布
- **禁止直接 push 到 main**

### 分支命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 功能 | `feat/<简短描述>` | `feat/websocket-reconnect` |
| 修复 | `fix/<简短描述>` | `fix/resize-debounce` |
| 维护 | `chore/<简短描述>` | `chore/remove-unused-deps` |
| 更新 | `update/<简短描述>` | `update/bump-dependencies` |

### Worktree 路径

`.worktrees/<分支短名>`，例如 `.worktrees/websocket-reconnect`

### 版本管理

- 遵循 SemVer。AI 仅可自行 bump patch 版本
- Minor/Major 版本变更需用户明确批准
- 每次 feature 合并到 `dev` 后 bump patch

### Zellij Backend 约束（强制）

- `zellij` 是当前公开产品路径与唯一默认后端，**禁止**把 public `main` / `dev` 服务重新引回 `runtime-v2`、`remuxd` 或任何旧 runtime
- session 持久化、断线恢复、Inspect、宽度和多端一致性问题，必须在当前 Node.js + node-pty + Zellij 架构内解决
- 对 `https://remux.yaoshen.wang` 和 `https://remux-dev.yaoshen.wang` 的修复，目标是两者在需要时附着到同一套机器级 Zellij 会话真相，而不是各自维护独立易失 workspace
- 仓库中的 `runtime-v2` 文档只属于归档资料，不得再把它当成当前实现或产品要求

## 常用命令

```bash
pnpm run dev
pnpm run dev:backend
pnpm run dev:frontend
pnpm run build
pnpm run typecheck
pnpm test
pnpm run test:watch
pnpm run test:e2e
```

### 构建检查（强制）

合并到 `dev` 之前必须通过：

```bash
pnpm run typecheck && pnpm test && pnpm run build
```

## 开发规范

### TDD 强制

非平凡的代码变更必须采用 TDD：先写测试（红）→ 实现（绿）→ 重构。

### 评估验收原则

- 实现前先定义可衡量的成功标准，覆盖四维度：结果、过程、风格、效率
- 先写确定性检查（文件存在、命令执行、输出匹配），再加定性评估
- 用实际失败驱动测试覆盖扩展，不靠猜测穷举
- 完整方法论参见 skill `eval-driven-development`

### 安全要点

- 两个 WebSocket 端点独立认证，修改 `server-zellij.ts` 或 `auth-service.ts` 时必须保持此特性
- zellij 与 shell 相关命令使用参数数组，禁止退化为 shell 拼接字符串
- PTY 路径中的 session 名称必须继续保持安全转义

### 浏览器自动化（强制）

- 使用 `playwright-cli` 进行所有浏览器自动化测试和页面检查
- **禁止使用 chrome-devtools MCP**
- 常用命令：
  - `playwright-cli open <url>` — 打开页面
  - `playwright-cli snapshot` — 获取页面快照和元素 ref
  - `playwright-cli click <ref>` — 点击元素
  - `playwright-cli eval '<js>'` — 执行 JavaScript
  - `playwright-cli screenshot` — 截图
  - `playwright-cli -s=<session>` — 指定会话操作

### 交付流程（强制）

1. 在 feature 分支完成开发 + 自测（`pnpm run typecheck && pnpm test && pnpm run build` 全部通过）
2. 确认功能开发完全后，立即合并到 `dev`
3. 立刻 push 到远程 `origin/dev`，禁止只做本地合并
4. 基于远程 `dev` 对应的真实环境执行必要的实机验证
5. 验证通过后再向用户报告完成；若验证失败，继续修复并重复上述流程，禁止未合并或未推送就交付
