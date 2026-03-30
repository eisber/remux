# Remux Zellij Era Master Plan（2026 版）

版本：2026-ZJ-1.0  
日期：2026-03-30  
适用范围：`yaoshenwang/remux` 当前主仓库，且**只针对新版 Zellij 架构**。  
文档性质：这是一份可以直接开干、可以直接拆 PR、可以直接派发给程序员的执行级主规划。  
与旧版关系：本文档默认**覆盖**所有仍把 `runtime-v2` 写成当前公开主路径的旧叙事；旧文档只保留归档价值。

## 0. 这份文档怎么用

这份文档不是“愿景 PPT”，而是现在开始往前推开发时的唯一上位说明书。使用方式只有三条：

1. 先读完第 1 到第 9 节，明确 **我们现在到底是什么产品、为什么这样定栈、哪些事明确不做**。
2. 然后直接进入第 10 节之后的 Checklist，从 Epic 开始派发；同 Epic 内默认从上到下执行。
3. 每个 checklist 项都按“最小可执行单元”写成，默认目标是 **单人可独立完成、边界清晰、验收与红线清晰、尽量不再二次分解**。

## 1. 当前仓库真实基线

先把现实说清楚。当前 Remux 已经不是旧规划里那条自研 runtime-v2 主线了，而是一个**以 Zellij 为底座、以 Node/TS Gateway 为当前 shipping path、以前端 Web 壳承载 Live/Inspect/Control 的远程工作区产品**。对现状的判断以仓库代码而不是旧文档为准，尤其看这些入口文件：

- `package.json`
- `src/backend/server-zellij.ts`
- `src/backend/zellij-controller.ts`
- `src/backend/zellij-pty.ts`
- `src/frontend/App.tsx`
- `src/frontend/components/Toolbar.tsx`
- `docs/PRODUCT_ARCHITECTURE.md`
- `AGENTS.md`

### 1.1 现状结论

当前仓库已经表现出以下真实情况：

- 运行底座已经切到 **Zellij**。
- 公共运行时目前是 **Node.js + TypeScript backend**，而不是 Rust runtime-v2。
- 前端现在仍然更像“terminal + inspect + 一部分 control”的 cockpit，而不是已经完成的 Topic/IM 化工作区。
- 旧 docs / AGENTS / 测试资产里仍残留大量 runtime-v2 叙事，已经开始和当前事实冲突。
- Rust 工作区依然有价值，但它当前最合理的角色不是抢占用户可见主路径，而是 **sidecar / index / relay / bridge / packaging research line**。

### 1.2 这意味着什么

这意味着我们接下来必须做两件事，而且顺序不能反：

第一，**承认现在的成功路径就是 Zellij 线**。也就是说，先把现在这条线做深做稳，做成可跨端、可移动、可 Topic 化、可 AI 化的 workspace cockpit。  
第二，**用边界而不是重写**给未来留下空间。Zellij 之上要抽 Runtime Adapter；Node 主路径之旁要留 Rust Sidecar；Web 之上要有桌面壳和手机壳；Control / Inspect / Topic / Run / Artifact 必须统一到同一组对象模型上。

## 2. 一句话产品定义

**Remux 是一个跨端、AI-native、topic-first 的 workspace cockpit；当前以 Zellij 作为运行底座，以 Web/桌面/手机多端共享同一协议和状态模型，把 Live、Inspect、Control、Runs、Approvals、Artifacts、Review、Memory 串成一个统一工作区。**

它不是单纯 SSH 客户端。  
它不是纯 terminal emulator。  
它也不是把聊天框塞进终端边上的“伪 AI”。  
它要做的是：**让工作区本身可被理解、可被接力、可被协作、可被跨设备连续使用。**

## 3. 北极星目标

### 3.1 用户层目标

- 在浏览器、桌面 App、手机上连接同一个 Workspace，状态理解一致。
- 用户不需要记住“刚才在哪个 pane 做了什么”，Inspect / Topic / Memory 能把上下文保住。
- 任何 agent 行为都不是黑盒：必须能看到 Run、审批、工件、评审、接管入口。
- 手机端不是阉割版远控，而是 **Inspect-first / Inbox-first / Approval-first** 的高频控制面。
- 桌面端不是简单 webview，而是深度接入文件、通知、快捷键、多窗口、多工作区的生产力宿主。

### 3.2 工程层目标

- 所有产品端共享一套 versioned protocol 和对象模型。
- 所有重要状态都有落盘和可审计路径。
- 所有关键功能都能自动回归，不靠 founder 手测。
- 任何未来底座替换（比如 sidecar、bridge、甚至非 Zellij adapter）都不需要重写产品层。

## 4. 已锁定的硬决策

- 当前公开主路径锁定为 **Zellij + Node.js/TypeScript Gateway + React Web Shell**。旧 runtime-v2 只保留存档价值，不再作为现行架构约束。
- Phase 1 **不自研 terminal engine**，也不 fork Zellij；仅通过 CLI / programmatic control / 后续 bridge 方式扩展。
- 当前桌面宿主优先选 **Electron Host**，原因是现有产品内核已经明显依赖 Node + node-pty；不要为了早期“宿主纯度”牺牲交付速度。
- 移动端采用 **原生壳 + 共享协议 + 嵌入式共享 Workspace Surface**，而不是指望一个 Web 页面自然长成原生手机体验。
- Inspect 必须升级为有 **source / precision / staleness** 的可信视图；任何缓存都不得伪装成 authoritative truth。
- Control Plane 必须协议化；UI 里直接发 Zellij 原始快捷键只能作为临时兼容层，不能继续当正式产品能力边界。
- Rust 线保留，但其角色是 **sidecar / 索引 / relay / bridge / packaging 能力**；当前用户可见功能不应由 Node 与 Rust 双主栈并行实现。
- 主题、运行、审批、工件、评审、记忆、交接将构成 Remux 的长期护城河；Live terminal 只是核心表面之一，不再是唯一产品定义。

## 5. 明确不做的事

- 不在本阶段追求用自研渲染器去对打 Ghostty / WezTerm 的纯终端性能指标。
- 不在本阶段开放通用插件市场；先把 manifest / adapter / policy 这些受约束扩展点做稳。
- 不在本阶段把 repo 强行重写成全新 monorepo；先在现有仓库内完成边界重构，再决定是否拆分 apps/packages。
- 不在本阶段要求所有平台都 100% 共享 UI；跨端共享的是协议、状态模型与关键视图，不是每个平台都长得一模一样。

## 6. 技术栈拍板

| 层 | 当前锁定方案 | 后续演进位 | 为何这样定 |
| --- | --- | --- | --- |
| Runtime substrate | Zellij 0.44+（CLI / layouts / sessions / plugin events） | 保持不 fork；后续通过 bridge 订阅更丰富事件 | 当前仓库已经明确以 Zellij 为底座，优先复用成熟 workspace primitives。 |
| Gateway / public runtime | Node.js 20+ + TypeScript + Express 5 + ws + node-pty | 未来可由 Rust sidecar 吸收部分后台职责 | 当前 shipping path 已经是 Node/TS；继续沿这条线交付最快。 |
| Live terminal surface | xterm.js 6 + fit/webgl/unicode addons | 桌面高阶模式可评估 native view，但不作为前置 | 浏览器与嵌入式桌面共享同一套 terminal surface，降低跨端成本。 |
| Frontend shell | React 19 + Vite + TypeScript + Zustand + Zod | Monaco 用于 diff/review/code artifacts | 当前前端已是 React/Vite；继续强化而不是再换框架。 |
| Styling | 延续 CSS Variables + 组件级样式；先补 design tokens | 后续如需抽象设计系统再推进 | 避免为样式栈迁移付出不必要成本。 |
| Local store | SQLite + WAL + FTS5 + 文件目录存储 | 大规模语义索引可后续转 Rust/Tantivy | 本地优先、自托管友好、易备份、易迁移。 |
| Desktop host | Electron 35+ Host Alpha | 未来若 remuxd 成熟，可再评估 Tauri / 原生壳 | 当前内核依赖 Node + node-pty，Electron 最贴近现状。 |
| iOS host | SwiftUI + WKWebView + Keychain + Push + Biometrics | 需要时可加入原生 terminal 子视图 | 手机端重点是 pairing、审批、inspect、steer，不是复制桌面布局。 |
| Android host | Kotlin + Compose + WebView + EncryptedStorage + Notifications | 需要时补原生 terminal / 更深系统集成 | 保证 Android 不是二等公民。 |
| Contracts | JSON over WS/HTTP + versioned envelopes + schema-generated DTOs | Rust / Swift / Kotlin 通过 codegen 或镜像 DTO 对齐 | 先把协议冻结，比过早引入 gRPC / protobuf 更实用。 |
| Logging / telemetry | Node 侧 JSON structured logs；Rust 侧 tracing | 再接入更完整的 OTel / metrics pipeline | 先保证问题可定位，再扩展观测。 |
| Testing | Vitest + Playwright + contract fixtures + shell harness + Maestro/XCTest/Espresso | 后续补更高阶 chaos / network tests | 把回归门槛前移，避免 founder 手测。 |

### 6.1 关于 Electron 而不是现在就强推 Tauri

当前代码已经清楚地把 Node.js、`ws`、`express`、`node-pty` 和 Zellij attach 流程绑在一起了。  
在这个前提下，桌面宿主最优先目标不是“宿主理念纯度”，而是**尽快交付一个能稳定启动本地网关、管理本地进程、做系统集成、并与 Web Shell 高度复用的桌面版本**。所以桌面一期锁定 Electron Host。  
后续当 `remuxd` / Rust sidecar 成熟，再去评估更轻宿主是完全可以的，但不能把它当成现在的前置。

### 6.2 关于 Rust 的定位

Rust 不是被放弃，而是被**重新定位**：

- 它不是当前用户可见 runtime 的公开主栈。
- 它首先服务于 sidecar、索引、搜索、relay、packaging、Zellij bridge、未来性能路径。
- 只有当协议稳定、边界明确、迁移收益大于扰动成本时，才考虑把某些后台能力从 Node 吸入 Rust。

## 7. 系统架构

### 7.1 分层图

```text
┌─────────────────────────────────────────────────────────────┐
│                       Client Apps                           │
│  Web Shell | Electron Desktop | iOS Shell | Android Shell  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Remux Gateway (Node/TS)                     │
│  Auth / Devices / Network / Protocol / Topics / Runs /     │
│  Artifacts / Review / Memory / Store / Runtime Adapter     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
┌──────────────────────────┐     ┌───────────────────────────┐
│ Zellij Runtime Adapter   │     │ Local Store / Event Log   │
│ CLI / attach / capture   │     │ SQLite + files + FTS5     │
└──────────────────────────┘     └───────────────────────────┘
              │
              ▼
┌──────────────────────────┐
│        Zellij            │
│ sessions / tabs / panes  │
│ layouts / plugins / CLI  │
└──────────────────────────┘

Parallel lane:
Rust Sidecar / Zellij Bridge / Search / Relay / Packaging
```

### 7.2 关键对象模型

| 对象 | 定义 |
| --- | --- |
| Workspace | 一个可被多个客户端附着的工作区容器，下面挂 Session、Topics、Runs、Artifacts、Devices。 |
| RuntimeSession | Zellij session 在 Remux 中的映射对象，是 Live/Inspect/Control 的共同宿主。 |
| Tab / Pane | 底层运行单元；Remux 必须为其提供稳定 ID、命名、聚合与 Inspect 入口。 |
| Topic | IM 化界面的中心对象；绑定一组 Runtime/Run/Artifact/Review/MessageCard。 |
| Run | 一次 agent 或自动化任务的生命周期对象，必须可审批、可取消、可接管。 |
| ApprovalRequest | 对危险动作或关键变更的人工决策卡片。 |
| Artifact | 日志、diff、补丁、截图、文本、构建产物等统一对象。 |
| ReviewThread | 围绕 Artifact 或 diff 的评论、状态与决策记录。 |
| MemoryNote | 长时工作记忆；可来自 Topic 总结、Run 结论或人工整理。 |
| HandoffBundle | 把当前工作区上下文打包给下一台设备/下一个人/下一个时段的交接对象。 |
| Device | 被信任的浏览器、桌面 App、iOS、Android 客户端。 |

### 7.3 核心表面

- **Live**：实时终端面。它的目标是稳定、可恢复、可移动访问，而不是本阶段去追求自研渲染器。
- **Inspect**：可信历史与上下文面。必须有 source、precision、staleness。
- **Control**：结构化控制面。必须把当前快捷键黑魔法逐步替换掉。
- **Topic**：未来 IM 化 shell 的核心对象，承接消息、状态、工件、审批、评审。
- **Run / Approval / Artifact / Review / Memory**：AI-native workspace 的六个核心对象组。

## 8. 平台策略

### Web

- 职责：最先可用、最普适的入口；也是协议与 UI 演进的第一验证场。
- 优先级：Live、Inspect、Control、Topics、Runs、Artifacts、Review 全都必须首先在 Web 打通。
- 红线：Web 不得直接依赖桌面宿主 API；所有宿主能力都走 capability 检测与桥接层。

### Desktop

- 职责：本地优先、深系统集成、多窗口、多工作区、全局快捷键、文件系统与外部编辑器协作。
- 策略：当前先做 Electron Host Alpha，目标是快速把已有 Node 网关与 React Shell 包起来；未来不排除再进化宿主。
- 红线：桌面壳不能倒逼当前网关大规模重写；Host API 必须保持薄。

### iOS

- 职责：配对、查看、审批、提醒、Inspect、轻量 steer；必要时进入 Live。
- 策略：SwiftUI 做原生导航与能力壳，Workspace 主要内容通过 WKWebView 承载，关键能力走原生桥接。
- 红线：不得把手机端做成桌面缩小版；默认入口必须偏 Inspect / Inbox / Approval。

### Android

- 职责：覆盖 Android 用户和团队成员，保证跨端承诺真实成立。
- 策略：Compose + WebView 复用协议与关键视图，系统能力如通知、分享、存储、深链走原生。
- 红线：不得等 iOS 完成后再临时照搬；Android 需在协议冻结后同步推进。


## 9. 仓库演进策略

| 当前入口/目录 | 目标落点 |
| --- | --- |
| `src/backend/server-zellij.ts` | 拆成 `src/backend/gateway/*` + `src/backend/runtime/zellij/*` + `src/backend/network/*`。 |
| `src/backend/zellij-controller.ts` | 沉入 `runtime/zellij/control.ts`，只通过 Adapter 暴露能力。 |
| `src/backend/zellij-pty.ts` | 沉入 `runtime/zellij/terminal.ts`，并被 Terminal Plane 封装。 |
| `src/frontend/App.tsx` | 拆成 app shell、routes、feature screens、stores，不再承载所有状态。 |
| `src/frontend/components/*` | 按 feature 归位到 `features/live`、`features/inspect`、`features/control` 等目录。 |
| `docs/*` | 建立 active / archive / decisions 三层结构；旧 runtime-v2 文档全部移到 archive。 |
| `src/runtime-v2/*` / Rust workspace | 显式标注为 sidecar / research line，不再被 README/AGENTS 误写成当前公开主路径。 |

### 9.1 为什么不现在就大拆 apps/packages

因为当前仓库最紧急的问题不是目录优雅，而是**边界没收紧、叙事没统一、协议没冻结、回归没补齐**。  
目录大迁移应该发生在接口稳定之后，而不是作为第一步。否则只会把当前还没站稳的实现再打散一次。

## 10. 里程碑与交付节奏

| 里程碑 | 周期 | 主题 | 完成标准 |
| --- | --- | --- | --- |
| M0 | 2 周 | 仓库澄清与架构切换 | 完成 Z01；所有公开文档与开发守则都不再把 runtime-v2 写成当前主路径。 |
| M1 | 4-6 周 | Cockpit 内核加固 | 完成 Z02-Z06 的主体；Runtime Adapter、Control 协议化、Inspect v2 可用。 |
| M2 | 4-6 周 | 状态、身份与网络基座 | 完成 Z07-Z10；本地存储、安全、设备信任、网络模式与共享协议冻结。 |
| M3 | 6-8 周 | 跨端壳一期 | 完成 Z11-Z14 的最小上线版本；Web 重构完成，桌面/iOS/Android 均可连上同一协议。 |
| M4 | 6-8 周 | AI-native workspace 一期 | 完成 Z15-Z17 的最小闭环；Topics、Runs、Approvals、Artifacts、Review、Worktree 能串起来。 |
| M5 | 6-8 周 | Continuity 与团队化 | 完成 Z18-Z21 主体；搜索、记忆、handoff、team mode、研究线与发布体系成型。 |

## 11. 每个阶段的交付结果

### M0：仓库澄清与切换
产出：仓库文档、开发守则、README、测试入口、术语表、架构 ADR 全部对齐新版事实。

### M1：Cockpit 内核加固
产出：Runtime Adapter、Control Plane、Terminal Plane、Inspect v2 最小可信实现。

### M2：状态、身份与网络基座
产出：SQLite/文件持久化、设备信任、二维码配对、网络模式、共享协议冻结。

### M3：跨端壳一期
产出：Web 重构版、Electron Alpha、iOS Beta、Android Alpha，全部接同一协议。

### M4：AI-native workspace 一期
产出：Topic/Inbox、Runs、Approvals、Artifacts、Review、Worktree 的最小闭环。

### M5：Continuity 与团队化
产出：Search、Memory、Handoff、Team Mode、Rust research line、完整发布/回归/运维体系。

## 12. 工程红线与 DoD

- 每个 checklist 项默认对应一个独立 PR 或一个 PR 中可被单独验证的提交块。
- 任何涉及协议字段新增的改动，必须同时更新 schema、fixture、客户端消费点与变更日志。
- 任何新控制能力都必须优先走 Control Plane 协议，不得再通过 UI 直接发送原始快捷键作为正式实现。
- 任何 Inspect 相关缓存都必须标出 source/precision/staleness，且 UI 不得把缓存伪装成权威结果。
- 任何移动端需求都必须同时写清共享视图部分与原生桥接部分，避免“先用 Web 顶着”长期不收敛。
- 任何 Rust 新代码都必须说明它是 sidecar / index / bridge / packaging 角色中的哪一种，避免重演双主栈。
- 任何 PR 在合并前都必须至少补齐一层自动化验证：unit / integration / e2e / smoke 之一。

## 13. Checklist 使用说明

下面的 Checklist 共有 **336** 项，按 **21 个 Epic** 展开。  
设计原则如下：

- 每一项默认都应该能被一个工程师直接接手执行。
- 每一项都尽量压到“小而明确”的粒度，目标是 **0.25 ~ 1.5 天** 可完成；若明显超过，说明还需要再拆。
- “前置”字段给出最小顺序依赖；若同 Epic 内几项实际上可并行，可由负责人在排期时并行派发，但不得跨越明显边界强并。
- “验收”字段必须可观察；“红线”字段用于阻止为了快而做出会在后面反噬的实现。
- 任何 checklist 项如果在执行中发现需要跨越本文硬决策，必须先补 ADR，再动代码。

## 14. Epic 总览

| Epic | 名称 | 阶段 | 任务数 | 目标 |
| --- | --- | --- | --- | --- |
| Z01 | 仓库切换与旧架构封存 | M0 | 16 | 让全仓库只保留一个对外真实叙事：Remux 当前是 Zellij + Node/TS + Web 的产品线，旧 runtime-v2 只可作为存档，不再作为现行开发约束。 |
| Z02 | Gateway / Runtime 边界抽象 | M1 | 16 | 把当前直接散落在 server、controller、pty 里的 Zellij 调用收敛到 Runtime Adapter，后续功能全部基于边界开发。 |
| Z03 | Zellij Adapter 加固 | M1 | 16 | 把现有 Zellij 集成从“能跑”提升到“可诊断、可约束、可演进”，但仍坚持不 fork Zellij。 |
| Z04 | Terminal Plane 加固 | M1 | 16 | 让 /ws/terminal 真正成为跨端稳定可恢复的 Live Surface，而不是一次性的浏览器直连终端。 |
| Z05 | Control Plane 协议化与移动优先改造 | M1 | 16 | 把现有依赖原始快捷键的控制路径替换成结构化控制协议，并把移动端默认体验切到 Control/Inspect 优先。 |
| Z06 | Inspect v2：从 dump-screen 到可信历史层 | M1-M2 | 16 | 让 Inspect 从“临时截屏”升级为有来源、精度、时效语义的历史观察面。 |
| Z07 | 本地存储、事件日志与持久化骨架 | M1-M2 | 16 | 建立本地 SQLite + 文件存储骨架，为历史、Topics、Runs、Artifacts、设备与审计提供统一数据底盘。 |
| Z08 | 安全、认证与设备信任 | M2 | 16 | 把当前 token/password 访问方式升级为带设备信任、二维码配对、最小权限和审计能力的安全模型。 |
| Z09 | 网络模式、隧道与未来 Relay | M2 | 16 | 把 local / LAN / tunnel / relay 抽象成明确网络模式，避免网络访问逻辑散落在产品层。 |
| Z10 | 共享协议、Schema 与 SDK | M1-M2 | 16 | 冻结一版 Remux 协议，把 Web、桌面、iOS、Android、未来 Rust sidecar 都对齐到同一组 schema。 |
| Z11 | Web 客户端重构与共享 UI 基线 | M2 | 16 | 把当前偏单页的 UI 重构成 feature-first 架构，并沉淀可被桌面壳和移动壳复用的共享视图逻辑。 |
| Z12 | 桌面壳：Electron Host Alpha | M3 | 16 | 在不重写当前 Node/PTY 内核的前提下，尽快交付可启动本地网关、可深度接入系统能力的桌面版本。 |
| Z13 | iOS 原生壳 | M3 | 16 | 用 SwiftUI + WKWebView 做出 Inspect-first、审批优先、连接接近原生的手机端体验。 |
| Z14 | Android 原生壳 | M3-M4 | 16 | 用 Kotlin/Compose + WebView 补齐 Android 端，保证跨端不是只覆盖 iPhone。 |
| Z15 | Topic / Inbox / IM 化工作区壳 | M4 | 16 | 把 Remux 从 terminal cockpit 推进到 topic-first、IM-like 的 AI-native workspace。 |
| Z16 | Agent Runs、审批与人工接管 | M4 | 16 | 让 agent 工作流具备 run 状态机、审批队列和一键接管到 Live 的闭环。 |
| Z17 | Artifacts、Review Center 与 Worktree | M4-M5 | 16 | 把 diff、日志、生成物、代码审查与 worktree 管理变成一等公民，而不是散落在终端命令里。 |
| Z18 | 搜索、Memory 与 Handoff | M5 | 16 | 建立跨 Topic / Run / Artifact / Inspect 的搜索与记忆层，让 Remux 具备真正的 workspace continuity。 |
| Z19 | Team Mode 与权限矩阵 | M5 | 16 | 让 Remux 从个人 cockpit 可平滑扩展到团队协作，而不在单机阶段就引入过量复杂度。 |
| Z20 | Rust Sidecar 与 Zellij Bridge 研究线 | Parallel / M5+ | 16 | 保留 Rust 的长期价值，但只把它用于 sidecar、索引、桥接和未来性能路径，不与当前 Node 主路径争权。 |
| Z21 | 质量、发布、运维与开发者体验 | 全程 | 16 | 建立真正可回归、可发布、可派发、可接手的工程系统，而不是仅靠 founder 记忆驱动。 |

## 15. 全量 Checklist

## Z01 仓库切换与旧架构封存（16 项）

目标：让全仓库只保留一个对外真实叙事：Remux 当前是 Zellij + Node/TS + Web 的产品线，旧 runtime-v2 只可作为存档，不再作为现行开发约束。

阶段：M0

默认前置：无

- [ ] **Z01-001 新增 `docs/CURRENT_BASELINE.md`**。归属：Docs/DevEx。前置：无。执行：梳理 package、backend、frontend、docs、tests 的现状，写明当前 shipping path 是 Zellij + Node/TS + Web。验收：文档能在 10 分钟内让新同学理解现在真实架构；文档被 README 链接到。红线：不得继续把旧 runtime 写成当前公开主路径。
- [ ] **Z01-002 建立 `docs/archive/runtime-v2/` 目录**。归属：Docs/DevEx。前置：Z01-001。执行：把仍有参考价值的旧 runtime-v2 规划和设计文档整体移入 archive，并保留原始日期与上下文。验收：旧文档仍可查阅，但主 docs 目录不再把它们当现行规范。红线：不得直接硬删仍可能需要追溯的历史设计。
- [ ] **Z01-003 重写根 README 的一句话定位**。归属：Docs/DevEx。前置：Z01-002。执行：把 README 顶部定位改成“基于 Zellij 的跨端 AI-native workspace cockpit”。验收：README 首屏不再出现 runtime-v2 作为当前产品路径；安装与运行示例与当前 CLI 一致。红线：不得出现和 `package.json` 描述相互矛盾的文案。
- [ ] **Z01-004 重写 README 快速开始**。归属：Docs/DevEx。前置：Z01-003。执行：把 Quick Start 改成先安装 Zellij、再 `npx remux`、再从浏览器/手机访问。验收：一个全新环境按文档可成功启动；文档明确 Node 版本与 Zellij 先决条件。红线：不得继续使用已经失效的旧命令或旧端口假设。
- [ ] **Z01-005 重写 AGENTS.md 中的运行时约束**。归属：Docs/DevEx。前置：Z01-004。执行：删除把 runtime-v2 视作强制公开路径的条款，改成 Zellij-era 分支纪律、测试纪律和交付纪律。验收：AGENTS 不再与当前代码事实冲突；代理开发不会再被误导去修旧 runtime-v2。红线：不得留下含糊双关表述，让代理自行猜当前主路径。
- [ ] **Z01-006 新增 `docs/ACTIVE_DOCS_INDEX.md`**。归属：Docs/DevEx。前置：Z01-005。执行：列出 active / draft / archive 三类文档，并标记每份文档的 authority level。验收：任何人都能快速判断某份文档是否可作为实现依据。红线：不得让 archived 文档继续混在 active 清单里。
- [ ] **Z01-007 新增 `docs/decisions/ADR-0001-zellij-era.md`**。归属：Docs/DevEx。前置：Z01-006。执行：正式记录“为什么前期不自研底层而以 Zellij 作为 v1 runtime substrate”的架构决策。验收：ADR 包含背景、备选方案、拒绝理由、退出条件。红线：不得只写口号而没有明确边界与退出条件。
- [ ] **Z01-008 新增 `docs/decisions/ADR-0002-desktop-host.md`**。归属：Docs/DevEx。前置：Z01-007。执行：记录桌面宿主选择、当前为何优先 Electron host，以及未来何时评估 Tauri/原生壳。验收：文档能解释清楚 Node + node-pty 现实约束与未来可切换条件。红线：不得把“以后再看”写成没有判定条件的空话。
- [ ] **Z01-009 建立术语表 `docs/GLOSSARY.md`**。归属：Docs/DevEx。前置：Z01-008。执行：定义 workspace、session、tab、pane、topic、run、artifact、approval、device、share 等关键名词。验收：同一概念在仓库中只有一个官方中文/英文名称。红线：不得让一个词同时表示两层不同对象。
- [ ] **Z01-010 做一次仓库术语 grep 审计**。归属：Docs/DevEx。前置：Z01-009。执行：遍历 docs、src、tests 中的 runtime-v2 / daemon / old runtime 等敏感词，产出清单。验收：形成明确改名名单和保留例外名单。红线：不得人工抽样后就声称完成全库审计。
- [ ] **Z01-011 新增 CI 术语守卫脚本**。归属：DevEx。前置：Z01-010。执行：在 CI 中阻止新的 active 文件再次引入 `runtime-v2` 等被封存术语。验收：在 active 路径新增违禁术语时 CI 会失败，并输出清晰提示。红线：不得把 archive 目录也一刀切阻断，导致历史文档无法保留。
- [ ] **Z01-012 更新 issue / PR 模板**。归属：Docs/DevEx。前置：Z01-011。执行：把模板中的运行时、测试、验收、平台字段改成新架构字段。验收：新 issue/PR 模板能直接对应 Zellij era 的模块与验收方式。红线：不得继续引用已不存在的目录或脚本。
- [ ] **Z01-013 新增 `docs/ROADMAP_SCOPE.md`**。归属：Product/Docs。前置：Z01-012。执行：定义 v1 必做、v1.5 可选、v2 研究项，避免团队同时开多条底层线。验收：所有新特性都能对照 scope 文档判断是否允许进入当前里程碑。红线：不得把研究项混入当前必做里程碑。
- [ ] **Z01-014 新增 `docs/REPO_EVOLUTION_PLAN.md`**。归属：Docs/DevEx。前置：Z01-013。执行：说明当前单包结构如何渐进迁移到多端/多包布局，而不是一次性重写。验收：迁移步骤与目录命名都有明确落点。红线：不得要求第一阶段就进行大规模目录重构。
- [ ] **Z01-015 补一份“旧计划已失效点”清单**。归属：Docs/DevEx。前置：Z01-014。执行：列出旧 master plan 中哪些假设已不再成立，哪些仍然有效。验收：团队不需要再人工比对旧新两套规划。红线：不得只写“部分失效”而不指出具体条目。
- [ ] **Z01-016 在 docs 首页加入 superseded 提示**。归属：Docs/DevEx。前置：Z01-015。执行：对仍未迁移完的旧文档增加醒目的 superseded banner。验收：打开旧文档时，读者能在首屏看到它已不是现行规范。红线：不得让读者翻到中段才知道文档已过期。

## Z02 Gateway / Runtime 边界抽象（16 项）

目标：把当前直接散落在 server、controller、pty 里的 Zellij 调用收敛到 Runtime Adapter，后续功能全部基于边界开发。

阶段：M1

默认前置：Z01 完成仓库基线澄清后开始

- [ ] **Z02-001 创建 `src/backend/runtime/` 目录**。归属：TS Backend。前置：Z01 完成仓库基线澄清后开始。执行：新增 runtime 目录，准备承载 adapter、capabilities、errors、snapshot translator。验收：目录建立后，新的运行时相关代码不再散落在 server 与 controller 顶层。红线：不得先建立目录却继续往旧位置塞新逻辑。
- [ ] **Z02-002 定义 `WorkspaceRuntimeAdapter` 接口**。归属：TS Backend。前置：Z02-001。执行：抽出 ensureSession、createTerminalClient、querySnapshot、captureInspect、mutations 等统一方法。验收：Server 只依赖接口，不再直接依赖 ZellijController 细节。红线：不得把 Zellij 私有参数直接暴露进通用接口。
- [ ] **Z02-003 定义 `RuntimeCapabilities` 对象**。归属：TS Backend。前置：Z02-002。执行：把 readOnlyShare、inspectScope、worktree、deviceTrust 等能力显式化。验收：前端可通过 capabilities 做 UI 分支；能力不存在时不会出现空按钮。红线：不得继续靠 if/else 猜 backend 是否支持某能力。
- [ ] **Z02-004 定义 `RuntimeErrorCode` 枚举**。归属：TS Backend。前置：Z02-003。执行：统一列出 binary_not_found、version_too_low、session_missing、unsupported_action 等错误码。验收：Control socket 与 HTTP 都能返回同一套错误语义。红线：不得把原始 stderr 文本直接拿来当协议错误码。
- [ ] **Z02-005 建立 `runtime/types.ts`**。归属：TS Backend。前置：Z02-004。执行：集中放置 RuntimeSnapshot、RuntimePane、RuntimeTab、InspectCaptureResult 等 DTO。验收：类型源头单一；前后端共享时不需要再复制一套。红线：不得让同名类型在多个文件内各自演化。
- [ ] **Z02-006 建立 `runtime/factory.ts`**。归属：TS Backend。前置：Z02-005。执行：写出 createRuntimeAdapter(config) 工厂，当前只返回 ZellijAdapter。验收：CLI 与 server 使用统一工厂创建 runtime。红线：不得在多个入口各自 new 一遍 adapter。
- [ ] **Z02-007 把 `server-zellij.ts` 改名为通用 gateway 入口**。归属：TS Backend。前置：Z02-006。执行：把服务创建逻辑改到 `server.ts` 或 `gateway.ts`，不再让文件名本身绑定 Zellij。验收：读代码时能一眼区分 gateway 与 runtime adapter。红线：不得改文件名而不调整职责边界。
- [ ] **Z02-008 新增假实现 `FakeRuntimeAdapter`**。归属：TS Backend。前置：Z02-007。执行：提供一个纯内存 adapter，用于 contract test 和前端本地联调。验收：不依赖 Zellij 即可跑控制流和 UI 自动化测试。红线：不得为了省事让 fake adapter 偷偷调用真 Zellij。
- [ ] **Z02-009 把控制层的 snapshot 转换逻辑独立出来**。归属：TS Backend。前置：Z02-008。执行：新增 translator，把 runtime snapshot 转换成协议层 workspace snapshot。验收：未来新增 runtime 时，只需改 translator 不必改前端。红线：不得在 WebSocket handler 里手写多份转换逻辑。
- [ ] **Z02-010 新增 runtime health 探针**。归属：TS Backend。前置：Z02-009。执行：提供 `getRuntimeHealth()`，返回 binary、version、session、config、capabilities 摘要。验收：健康检查页和诊断页都能复用同一接口。红线：不得把健康检查结果只打印到控制台。
- [ ] **Z02-011 在 `/api/config` 返回 runtime kind**。归属：TS Backend。前置：Z02-010。执行：把 `runtime: "zellij"` 以及 protocolVersion、capabilities 一并输出。验收：前端初始化时能拿到运行时种类和能力。红线：不得让前端继续硬编码 `zellij`。
- [ ] **Z02-012 把 inspect 获取入口抽到 adapter**。归属：TS Backend。前置：Z02-011。执行：把当前 `capture_inspect` 直接绑 controller 的逻辑挪到 adapter.captureInspect。验收：Inspect 层不再知道底层是否来自 CLI、cache 或 sidecar。红线：不得让 Inspect 代码继续直接 import ZellijController。
- [ ] **Z02-013 把 terminal client 创建入口抽到 adapter**。归属：TS Backend。前置：Z02-012。执行：将 per-client PTY 创建逻辑改为 adapter.createTerminalClient。验收：Terminal plane 与 runtime binding 有清晰接口。红线：不得在 server 层继续直接调用 zellij-pty 实现。
- [ ] **Z02-014 为 adapter 工厂补单元测试**。归属：QA/TS Backend。前置：Z02-013。执行：覆盖 runtime 选择、错误配置、capabilities 输出、fake adapter 初始化。验收：测试失败时能明确定位到工厂或配置。红线：不得只做 happy path。
- [ ] **Z02-015 写 `docs/RUNTIME_ADAPTER_GUIDE.md`**。归属：Docs/DevEx。前置：Z02-014。执行：说明如何新增 runtime adapter、哪些层可以改、哪些协议不能动。验收：未来如果要接 tmux/WezTerm，不需要再反推当前边界。红线：不得让指南停留在“以后支持更多 runtime”这种空话。
- [ ] **Z02-016 清理前端对 Zellij 专名的强依赖**。归属：TS Frontend。前置：Z02-015。执行：把 view/hook 命名中公开暴露的 Zellij-only 词替换成 workspace/runtime 通用语义。验收：新增 topic/run 层时命名不会冲突；仍保留内部实现文件可含 zellij。红线：不得一次性改动所有内部实现名造成无意义 churn。

## Z03 Zellij Adapter 加固（16 项）

目标：把现有 Zellij 集成从“能跑”提升到“可诊断、可约束、可演进”，但仍坚持不 fork Zellij。

阶段：M1

默认前置：Z02 Runtime Adapter 骨架完成

- [ ] **Z03-001 抽出 `zellij/cli.ts`**。归属：TS Backend。前置：Z02 Runtime Adapter 骨架完成。执行：把执行 Zellij CLI 的底层封装到单文件，统一处理 args、timeout、stderr、exit code。验收：所有 Zellij 命令都走统一调用入口。红线：不得再在多个文件零散 exec Zellij。
- [ ] **Z03-002 新增 Zellij 二进制发现缓存**。归属：TS Backend。前置：Z03-001。执行：第一次解析 zellij 路径后缓存在进程内，并提供失效入口。验收：重复控制操作不会频繁执行 `which zellij`。红线：不得把缓存写死成全局常量而无法刷新。
- [ ] **Z03-003 新增最低版本检查**。归属：TS Backend。前置：Z03-002。执行：启动时执行 `zellij --version`，校验最低支持版本并输出建议。验收：版本过低时服务拒绝进入受支持状态，并给出明确升级指引。红线：不得在不兼容版本上静默降级运行。
- [ ] **Z03-004 把 session bootstrap 改成显式锁**。归属：TS Backend。前置：Z03-003。执行：为首次 `attach --create` 增加进程内锁，防止并发首连时重复引导。验收：多客户端同时首连不会造成重复 create 竞争。红线：不得用 sleep 延迟代替锁。
- [ ] **Z03-005 新增 `ensureSession` 幂等探针**。归属：TS Backend。前置：Z03-004。执行：先探测 session 是否存在，再决定 attach/create，输出统一状态。验收：冷启动与热启动路径都能返回可解释结果。红线：不得把“启动成功”与“已存在”混成一类不可区分状态。
- [ ] **Z03-006 为布局文件建立独立 resolver**。归属：TS Backend。前置：Z03-005。执行：把 bundled layout 的定位逻辑抽成 resolver，并允许配置外部自定义布局。验收：用户可覆盖布局，默认布局仍可稳定找到。红线：不得在业务代码里硬编码具体文件路径。
- [ ] **Z03-007 为配置文件建立独立 resolver**。归属：TS Backend。前置：Z03-006。执行：把 bundled config 与外部 config 选择逻辑独立出来。验收：layout 与 config 两类文件分别有清晰优先级。红线：不得混淆 config 与 layout 的覆盖顺序。
- [ ] **Z03-008 新增只读会话模式**。归属：TS Backend。前置：Z03-007。执行：在 adapter 层实现 readOnly flag，屏蔽写入类 mutation 与 resize side effects。验收：只读连接无法新建 tab/pane、无法发送输入、无法改尺寸。红线：不得只在前端隐藏按钮而后端仍允许写操作。
- [ ] **Z03-009 建立 paneId / tabIndex 稳定映射**。归属：TS Backend。前置：Z03-008。执行：为前端提供稳定可引用的 pane 与 tab 标识，而不是仅靠瞬时 focus。验收：用户能针对指定 pane 执行 inspect / focus / rename。红线：不得继续把“当前焦点 pane”当唯一目标。
- [ ] **Z03-010 实现按 pane 维度抓取 inspect**。归属：TS Backend。前置：Z03-009。执行：在 dump-screen 调用中支持 pane-id 参数，并透给 Inspect API。验收：Inspect 可抓指定 pane，而非只能抓当前焦点。红线：不得把 pane 选择留给用户手工切焦点后再抓。
- [ ] **Z03-011 实现 tab 级捕获组装器**。归属：TS Backend。前置：Z03-010。执行：为同一 tab 下的多个 pane 生成组合型 inspect 结果并保留 pane 边界。验收：tab inspect 至少能展示各 pane 标题、顺序和内容片段。红线：不得把多 pane 内容直接无分隔地拼成一坨文本。
- [ ] **Z03-012 新增 Zellij 错误码映射表**。归属：TS Backend。前置：Z03-011。执行：把常见 stderr/exit patterns 映射成统一 runtime error code。验收：同一错误在 UI 中总能显示成稳定文案。红线：不得把 Zellij 原始 stderr 直接暴露给最终用户。
- [ ] **Z03-013 补齐 read-only 与 version 组合测试**。归属：QA/TS Backend。前置：Z03-012。执行：覆盖二进制缺失、版本过低、只读连接、layout 丢失、session 重名等场景。验收：测试能重复运行且可确定失败原因。红线：不得只依赖手工 smoke test。
- [ ] **Z03-014 建立 Zellij 功能门控表**。归属：Docs/TS Backend。前置：Z03-013。执行：按最低版本记录 read-only share、remote attach、Windows 支持等能力是否启用。验收：发布前可快速确认某项能力是否应暴露到 UI。红线：不得把实验能力默认对所有用户开放。
- [ ] **Z03-015 写 `docs/ZELLIJ_BOUNDARY.md`**。归属：Docs/DevEx。前置：Z03-014。执行：说明 Remux 复用 Zellij 的范围、不复用的范围、未来 bridge/plugin 的落点。验收：团队不会再误把 Remux 当成要立即替换 Zellij 的产品。红线：不得写成模糊的“以后可能都自己做”。
- [ ] **Z03-016 将适配层日志标准化**。归属：TS Backend。前置：Z03-015。执行：所有 Zellij 调用都附带 command name、duration、exit code、requestId。验收：排错时能关联用户动作与具体 Zellij 调用。红线：不得打印敏感 token、密码或原始输入流。

## Z04 Terminal Plane 加固（16 项）

目标：让 /ws/terminal 真正成为跨端稳定可恢复的 Live Surface，而不是一次性的浏览器直连终端。

阶段：M1

默认前置：Z02、Z03 完成基础运行边界

- [ ] **Z04-001 定义 terminal auth 首包 schema**。归属：TS Backend。前置：Z02、Z03 完成基础运行边界。执行：把 terminal socket 首包字段固定为 token/password/cols/rows/clientInfo/protocolVersion。验收：连接失败时能知道是认证、尺寸还是版本问题。红线：不得继续接受任意松散 JSON 形状。
- [ ] **Z04-002 拆分 terminal 原始流与 JSON 控制分支**。归属：TS Backend。前置：Z04-001。执行：把 resize/ping 等控制消息解析逻辑独立成 parser，不再混在 data 写入分支里。验收：代码路径可读；未来新增 ack / resume message 不会污染 raw I/O。红线：不得在主分支里继续靠首字节是否为 `{` 猜消息类型。
- [ ] **Z04-003 新增 terminal protocol version 校验**。归属：TS Backend。前置：Z04-002。执行：在 auth 阶段比对客户端 terminal protocolVersion。验收：新旧客户端不兼容时会明确拒绝并给出升级提示。红线：不得让不兼容客户端连上后表现异常却无提示。
- [ ] **Z04-004 实现 terminal reconnect token**。归属：TS Backend。前置：Z04-003。执行：为每个 terminal client 发放短期 reconnect token，用于闪断后恢复同一逻辑客户端。验收：短暂断线后可恢复 session 绑定与 UI 状态。红线：不得长期复用无限期 token。
- [ ] **Z04-005 实现 terminal resume handshake**。归属：TS Fullstack。前置：Z04-004。执行：前端断线后优先尝试 resume，而不是盲目新建一个 attach PTY。验收：网络波动下不会频繁制造新 attach 进程。红线：不得在 resume 失败时卡死而不回退到新建连接。
- [ ] **Z04-006 加入 heartbeat 与超时关闭规则**。归属：TS Backend。前置：Z04-005。执行：对 terminal socket 增加 ping/pong 与超时清理。验收：异常网络断开时孤儿 PTY 能被及时回收。红线：不得留下长时间无人消费的 attach 进程。
- [ ] **Z04-007 加入慢客户端背压保护**。归属：TS Backend。前置：Z04-006。执行：当某客户端发送队列持续堆积时进行丢弃/断开/降速策略。验收：单个慢客户端不会拖垮整个会话服务。红线：不得把所有客户端广播绑定在同一个无上限缓冲上。
- [ ] **Z04-008 实现 terminal 读写分离的只读模式**。归属：TS Fullstack。前置：Z04-007。执行：只读连接仍可接收输出和 inspect，但禁止 write、paste、resize。验收：只读观众不会影响正在工作的主用户。红线：不得只在前端禁用按钮。
- [ ] **Z04-009 新增 paste 审计事件**。归属：TS Fullstack。前置：Z04-008。执行：对 paste 输入单独打点和日志标记，不与普通键盘输入混为一类。验收：后续分析能区分命令是打字还是一次性粘贴。红线：不得记录粘贴的明文正文。
- [ ] **Z04-010 实现上传文件进度事件**。归属：TS Fullstack。前置：Z04-009。执行：上传走显式的 start/progress/finish/error 事件流，而不是一次性盲传。验收：用户能看到进度与失败原因。红线：不得在失败后留下半截临时文件却不清理。
- [ ] **Z04-011 抽出 CWD 解析与上传落点策略**。归属：TS Backend。前置：Z04-010。执行：统一处理当前 pane CWD 获取失败时的回退路径。验收：上传落点可解释；失败时不会写到不可预期目录。红线：不得默默写入 HOME 根目录而不提示。
- [ ] **Z04-012 增加 terminal 错误 banner 映射**。归属：TS Frontend。前置：Z04-011。执行：把 pty_exit、resume_failed、auth_failed、runtime_missing 等映射成可读 UI。验收：用户可以在 UI 上理解终端为何断开。红线：不得只在 console.error 里记录。
- [ ] **Z04-013 增加 terminal 初始尺寸回退规则**。归属：TS Fullstack。前置：Z04-012。执行：客户端尺寸未知时使用安全默认值，并在可见后立即二次 fit。验收：首屏不会因为 0x0 尺寸导致错误折行。红线：不得在尺寸未知时直接使用 0 列 0 行。
- [ ] **Z04-014 补齐多客户端宽度回归测试**。归属：QA。前置：Z04-013。执行：覆盖桌面宽屏、手机竖屏、平板横屏、两个客户端并发 attach。验收：测试能捕获“半宽终端”“首屏折行错误”等历史问题。红线：不得只做单客户端 smoke。
- [ ] **Z04-015 补一份 terminal 安全说明**。归属：Docs。前置：Z04-014。执行：记录 xterm 数据不可信、DOM 渲染禁 innerHTML、WebSocket 风险边界。验收：后续做 inspect ANSI 渲染时可直接引用。红线：不得省略终端数据进入 DOM 的安全红线。
- [ ] **Z04-016 新增 terminal capability matrix**。归属：Product/Docs。前置：Z04-015。执行：明确 Web、Desktop、iOS、Android 在输入、上传、只读、恢复上的能力差异。验收：产品与开发对跨端行为有统一预期。红线：不得把尚未实现的能力写成“默认支持”。

## Z05 Control Plane 协议化与移动优先改造（16 项）

目标：把现有依赖原始快捷键的控制路径替换成结构化控制协议，并把移动端默认体验切到 Control/Inspect 优先。

阶段：M1

默认前置：Z02、Z03 基线完成

- [ ] **Z05-001 定义 control socket `hello` 消息**。归属：TS Backend。前置：Z02、Z03 基线完成。执行：连接成功后先发 hello，包含 runtime、protocolVersion、capabilities、session mode。验收：前端初始化不需要靠多次猜测请求来摸索环境。红线：不得再把所有初始化都塞在 `auth_ok` 里。
- [ ] **Z05-002 定义 control command envelope**。归属：TS Backend。前置：Z05-001。执行：统一 requestId、type、payload、sentAt 字段，所有 mutation 都走一套 envelope。验收：排错和重放都有统一形状。红线：不得继续混用平铺字段与隐式参数。
- [ ] **Z05-003 定义 control result envelope**。归属：TS Backend。前置：Z05-002。执行：统一 ok / error / partial result 结构，携带 requestId 与 errorCode。验收：前端可以按 requestId 对应回按钮状态。红线：不得继续用裸 `{type: "error", message}` 兜底所有错误。
- [ ] **Z05-004 把 workspace 快照协议类型化**。归属：TS Backend。前置：Z05-003。执行：为 session/tab/pane/focus/readOnly/version 等字段固定 schema。验收：客户端状态存储和测试 fixture 可以稳定复用。红线：不得在不同 handler 返回不同字段组合。
- [ ] **Z05-005 替换 Toolbar 里的 Zellij 组合键发射**。归属：TS Frontend。前置：Z05-004。执行：把 `+Tab/ClosePane/Fullscreen` 等操作改成 control mutation，而不是 `sendRaw("\u0010x")`。验收：UI 操作能在日志、权限、只读模式中被识别为结构化命令。红线：不得继续依赖隐藏快捷键序列作为正式控制路径。
- [ ] **Z05-006 保留仅限 emergency 的 raw shortcut fallback**。归属：TS Fullstack。前置：Z05-005。执行：如果某能力暂未协议化，只允许通过明确的 `experimentalRawAction` 走后门。验收：后门路径有显式开关和日志。红线：不得让 fallback 成为默认实现。
- [ ] **Z05-007 实现 control reconnect resume**。归属：TS Frontend。前置：Z05-006。执行：control socket 重连后自动恢复订阅、恢复待处理 request 状态。验收：断线后 workspace 状态能自动回填。红线：不得要求用户手动刷新页面才能恢复控制。
- [ ] **Z05-008 增加 mutation in-flight 锁**。归属：TS Frontend。前置：Z05-007。执行：对重命名、新建、关闭等按钮增加最小粒度的请求锁和去抖。验收：双击不会造成重复操作或顺序紊乱。红线：不得简单全局锁死整个界面。
- [ ] **Z05-009 增加 optimistic rollback 机制**。归属：TS Frontend。前置：Z05-008。执行：对 rename/new tab 等本地乐观更新失败时可回滚。验收：UI 不会在失败后永久卡在错误名字或错误顺序。红线：不得只做 optimistic update 而不处理失败回滚。
- [ ] **Z05-010 把 Control 做成移动端一等页面**。归属：TS Frontend。前置：Z05-009。执行：手机布局新增独立 Control 入口，而不是只藏在 drawer 或工具条里。验收：竖屏手机可不进入 live terminal 就完成切 tab、split、rename 等操作。红线：不得继续让手机用户必须依赖键盘序列。
- [ ] **Z05-011 增加 active pane 可视焦点标记**。归属：TS Frontend。前置：Z05-010。执行：在 tab/pane 列表和 header 中明确标记当前 focus pane。验收：用户切 pane 时，UI 立即反映焦点变化。红线：不得仅靠颜色微差传达焦点。
- [ ] **Z05-012 新增 session picker 视图**。归属：TS Frontend。前置：Z05-011。执行：允许用户在 UI 中查看并切换当前可接入 session 列表。验收：多会话场景下无须重新输 URL 或手改参数。红线：不得把 session 列表藏在诊断页。
- [ ] **Z05-013 把 control error 映射到 toast + inline 状态**。归属：TS Frontend。前置：Z05-012。执行：按钮附近展示可操作错误，严重错误上浮到全局 toast。验收：用户能知道哪个动作失败、是否可重试。红线：不得只弹一个笼统“error”。
- [ ] **Z05-014 加入 control audit 事件**。归属：TS Backend。前置：Z05-013。执行：对 rename/new tab/new pane/close/share 等控制动作打审计日志。验收：后续 team mode 和审批都能复用这一层。红线：不得记录敏感输入正文。
- [ ] **Z05-015 补齐 control contract 测试**。归属：QA/TS。前置：Z05-014。执行：覆盖 hello、subscribe、mutation、error、reconnect、read-only deny。验收：协议变化会第一时间被测试发现。红线：不得只在人工操作中验证关键 mutation。
- [ ] **Z05-016 写 `docs/CONTROL_PROTOCOL_V1.md`**。归属：Docs/TS。前置：Z05-015。执行：给出消息样例、错误码、顺序约束、只读限制和版本策略。验收：任何客户端实现者都能据此独立接入。红线：不得让协议文档只依赖代码阅读。

## Z06 Inspect v2：从 dump-screen 到可信历史层（16 项）

目标：让 Inspect 从“临时截屏”升级为有来源、精度、时效语义的历史观察面。

阶段：M1-M2

默认前置：Z03、Z05 完成后启动

- [ ] **Z06-001 定义 inspect 请求 schema**。归属：TS Backend。前置：Z03、Z05 完成后启动。执行：固定 scope、targetId、full、search、cursor、format 等字段。验收：同一 API 可覆盖 pane/tab/workspace 三类查询。红线：不得继续只支持一个 `full?: boolean`。
- [ ] **Z06-002 定义 inspect 响应 schema**。归属：TS Backend。前置：Z06-001。执行：加入 source、precision、staleness、capturedAt、scope、chunks 等字段。验收：前端可以稳定渲染 badge、时间和内容来源。红线：不得用纯字符串返回全部 inspect 信息。
- [ ] **Z06-003 建立 capture strategy 抽象**。归属：TS Backend。前置：Z06-002。执行：把来自 Zellij CLI、缓存、journal、future bridge 的来源统一封装成 strategy。验收：Inspect 层不关心底层采集手段。红线：不得把 CLI 抓取写死成唯一可信来源。
- [ ] **Z06-004 实现 pane scope inspect**。归属：TS Backend。前置：Z06-003。执行：指定 paneId 调用 capture，并返回 pane 元信息。验收：用户可以明确查看某个 pane 的上下文。红线：不得把 pane scope 偷偷退化成 focus pane。
- [ ] **Z06-005 实现 tab scope inspect**。归属：TS Backend。前置：Z06-004。执行：为 tab 下多个 pane 生成结构化结果，保留 pane 分隔与标题。验收：用户能看懂一个 tab 下每个 pane 的片段来源。红线：不得把多 pane 内容直接裸拼。
- [ ] **Z06-006 实现 workspace scope 初版**。归属：TS Backend。前置：Z06-005。执行：先基于当前活动 tab + 最近事件摘要生成 workspace 视图。验收：workspace inspect 可在移动端作为总览入口。红线：不得声称 workspace scope 已覆盖全部历史，若没有就明确标 partial。
- [ ] **Z06-007 引入 ANSI 到安全片段的转换层**。归属：TS Frontend。前置：Z06-006。执行：将 ANSI 输出转为受控 DOM 片段或安全文本，不允许任意 HTML 注入。验收：颜色、粗体等常见样式可保留；XSS 风险受控。红线：不得对终端输出使用 `innerHTML` 直塞。
- [ ] **Z06-008 新增 inspect 搜索框**。归属：TS Frontend。前置：Z06-007。执行：支持在当前 inspect 结果内检索关键字并高亮。验收：用户能在一屏内找到错误栈或命令片段。红线：不得在大内容量时同步阻塞主线程。
- [ ] **Z06-009 新增 inspect 分页/游标**。归属：TS Fullstack。前置：Z06-008。执行：大结果采用 cursor 或 chunk 分段加载。验收：移动端打开大历史不会首屏卡死。红线：不得一次性把超大字符串全塞进前端内存。
- [ ] **Z06-010 渲染 source / precision / staleness badge**。归属：TS Frontend。前置：Z06-009。执行：在 inspect 顶部和结果区显示来源、可信度、采集时间与新鲜度。验收：用户能判断这是不是 authoritative capture、是否已过期。红线：不得把未知值默认标成 precise/fresh。
- [ ] **Z06-011 新增 copy as text / copy as ansi**。归属：TS Frontend。前置：Z06-010。执行：提供两种复制方式，分别面向阅读与保真。验收：用户复制结果后能得到与按钮文案一致的内容。红线：不得两个按钮复制出同一份内容。
- [ ] **Z06-012 新增 export snapshot**。归属：TS Fullstack。前置：Z06-011。执行：允许将一次 inspect 结果导出为 txt/ansi/json。验收：导出文件包含最少必要元数据和时间戳。红线：不得把敏感 token 或内部调试字段导出进去。
- [ ] **Z06-013 实现 inspect 本地缓存**。归属：TS Frontend。前置：Z06-012。执行：按 runtimeId/scope/targetId/version 建缓存桶，先展示缓存再刷新。验收：重复打开 inspect 时首屏更快，且能正确标注 cached/stale。红线：不得把缓存内容伪装成最新真相。
- [ ] **Z06-014 实现重连后的 inspect 自动 refetch**。归属：TS Frontend。前置：Z06-013。执行：socket 恢复后自动刷新当前打开 scope。验收：用户断网回来不需要手动点刷新。红线：不得在断线恢复后继续展示旧内容却无提示。
- [ ] **Z06-015 把移动端默认入口切到 Inspect**。归属：TS Frontend。前置：Z06-014。执行：手机首次进入当前 workspace 时默认落在 Inspect，而不是 Live。验收：窄屏用户能先读后控，仍可一跳进入 Live。红线：不得移除用户手工修改默认页的能力。
- [ ] **Z06-016 补齐 inspect 端到端测试**。归属：QA。前置：Z06-015。执行：覆盖 pane/tab/workspace scope、badge、分页、搜索、缓存、重连。验收：测试能稳定复现 Inspect 的核心产品语义。红线：不得用长 sleep 掩盖 race condition。

## Z07 本地存储、事件日志与持久化骨架（16 项）

目标：建立本地 SQLite + 文件存储骨架，为历史、Topics、Runs、Artifacts、设备与审计提供统一数据底盘。

阶段：M1-M2

默认前置：Z05、Z06 提供最小事件与对象模型

- [ ] **Z07-001 确定 data dir 规范**。归属：TS Backend。前置：Z05、Z06 提供最小事件与对象模型。执行：定义 config、db、artifacts、exports、cache、logs 的目录布局与平台路径。验收：不同平台都能解析到可预期的本地数据目录。红线：不得把大文件和小元数据随意混放在同一目录。
- [ ] **Z07-002 引入 SQLite 访问层**。归属：TS Backend。前置：Z07-001。执行：新增数据库适配层与迁移入口，当前只支持本地 SQLite WAL。验收：服务启动可自动创建数据库并执行迁移。红线：不得把 SQL 散落到业务代码里。
- [ ] **Z07-003 建立 migrations 目录**。归属：TS Backend。前置：Z07-002。执行：把 schema 变更脚本放到独立 migrations 目录，并记录版本。验收：数据库版本升级可重复执行、可回溯。红线：不得通过手改本地库结构来“完成迁移”。
- [ ] **Z07-004 创建 `runtime_sessions` 表**。归属：TS Backend。前置：Z07-003。执行：存 session 基础元数据、模式、最近活跃时间、runtime kind。验收：session 级信息可以查询和更新。红线：不得把 tab/pane 字段塞进 session 表。
- [ ] **Z07-005 创建 `runtime_tabs` 表**。归属：TS Backend。前置：Z07-004。执行：存 tab 名称、顺序、所属 session、UI 补充字段。验收：tab 元数据可持久存在。红线：不得把 pane 级几何写进 tab 表。
- [ ] **Z07-006 创建 `runtime_panes` 表**。归属：TS Backend。前置：Z07-005。执行：存 pane 标识、所属 tab、命令、cwd 摘要、最近状态。验收：pane 级对象可以被 topic/inspect 关联。红线：不得持久化敏感输入明文。
- [ ] **Z07-007 创建 `runtime_events` 表**。归属：TS Backend。前置：Z07-006。执行：以 append-only 方式记录 focus、create、close、rename、share、approval 等事件。验收：后续 topic timeline 和 audit 都可复用。红线：不得在写事件时覆盖历史行。
- [ ] **Z07-008 创建 `inspect_snapshots` 表**。归属：TS Backend。前置：Z07-007。执行：存 inspect 结果摘要、scope、capture metadata、文本索引入口。验收：可以查询某 scope 最近的 inspect 快照。红线：不得把超大原文直接无压缩内嵌在热表。
- [ ] **Z07-009 建立文件仓根目录**。归属：TS Backend。前置：Z07-008。执行：把大文本导出、artifact 原始文件、diff 包等放到文件仓。验收：数据库只存索引和元数据，文件仓存正文。红线：不得把大二进制直接塞进数据库主表。
- [ ] **Z07-010 实现 journal writer**。归属：TS Backend。前置：Z07-009。执行：每次关键动作写一条 append-only JSONL 或等价事件记录。验收：崩溃后仍可追查最近动作。红线：不得让 journal 与业务表相互替代而职责混乱。
- [ ] **Z07-011 实现 retention 配置**。归属：TS Backend。前置：Z07-010。执行：允许配置日志、快照、导出、临时文件的保留期。验收：磁盘占用可控，默认值有文档。红线：不得默认无限增长。
- [ ] **Z07-012 增加 FTS5 文本索引**。归属：TS Backend。前置：Z07-011。执行：为 inspect text / topic text / artifact summary 预置全文检索能力。验收：后续全局搜索不需要重新换底层存储。红线：不得把 FTS 当成事实源表。
- [ ] **Z07-013 实现数据库健康检查**。归属：TS Backend。前置：Z07-012。执行：启动和运行中都能检测 DB 是否可写、迁移是否完成、磁盘是否接近上限。验收：诊断页可显示 DB 健康状态。红线：不得在 DB 故障时静默退化到无持久化。
- [ ] **Z07-014 实现备份导出命令**。归属：TS Backend。前置：Z07-013。执行：提供 CLI 将数据库与文件仓导出为可迁移包。验收：用户可备份本地工作区控制面数据。红线：不得导出半成品文件且不标明不一致风险。
- [ ] **Z07-015 补齐存储层单元与迁移测试**。归属：QA/TS。前置：Z07-014。执行：覆盖空库启动、迁移升级、损坏恢复、路径权限失败。验收：问题可在 CI 中复现，不依赖人工试库。红线：不得只在开发机上验证一次。
- [ ] **Z07-016 写 `docs/DATA_LAYOUT.md`**。归属：Docs/DevEx。前置：Z07-015。执行：说明 SQLite、文件仓、journal 各自职责与恢复边界。验收：团队不会再把所有数据都想当然丢给 Zellij。红线：不得模糊“哪些数据属于 Remux，哪些属于 Zellij”。

## Z08 安全、认证与设备信任（16 项）

目标：把当前 token/password 访问方式升级为带设备信任、二维码配对、最小权限和审计能力的安全模型。

阶段：M2

默认前置：Z07 具备最小持久化能力

- [ ] **Z08-001 抽出 auth 配置模型**。归属：TS Backend。前置：Z07 具备最小持久化能力。执行：把 token、password、passwordRequired、pairingEnabled 等配置独立到 auth config。验收：配置来源和优先级清晰。红线：不得把认证配置散落在多个入口文件。
- [ ] **Z08-002 增加 token 轮换命令**。归属：TS Backend。前置：Z08-001。执行：提供 CLI 旋转访问 token，并输出迁移提醒。验收：轮换后旧 token 立即失效。红线：不得轮换后保留旧 token 无限期并存。
- [ ] **Z08-003 增加 password 轮换命令**。归属：TS Backend。前置：Z08-002。执行：支持修改/清空访问密码，并写入安全存储或配置文件。验收：密码变更后重连行为符合预期。红线：不得将密码明文打印到日志。
- [ ] **Z08-004 定义 QR bootstrap payload**。归属：TS Backend。前置：Z08-003。执行：固定 serverId、origin、pairingNonce、expiresAt 等字段。验收：iOS/Android 可以稳定扫码配对。红线：不得把长期敏感凭证直接塞进永久二维码。
- [ ] **Z08-005 创建 `devices` 表**。归属：TS Backend。前置：Z08-004。执行：为每个配对设备记录 id、name、platform、addedAt、lastSeenAt、trustLevel。验收：服务端可枚举、撤销、重命名设备。红线：不得只在客户端本地记设备而服务端全然不知。
- [ ] **Z08-006 实现 trusted device 创建流**。归属：TS Fullstack。前置：Z08-005。执行：通过 QR + 一次性 nonce 完成首次信任建立。验收：首配流程可在 60 秒内完成且可撤销。红线：不得允许无确认的静默配对。
- [ ] **Z08-007 实现 trusted device 撤销流**。归属：TS Fullstack。前置：Z08-006。执行：在 Web/Desktop 设置中移除某个设备并让其 token 失效。验收：被撤销设备下次请求必须重新配对。红线：不得仅删除列表展示却不吊销其权限。
- [ ] **Z08-008 实现设备显示名编辑**。归属：TS Fullstack。前置：Z08-007。执行：支持把设备从系统默认名改成用户自定义名字。验收：设备列表对多设备用户可读。红线：不得让显示名覆盖系统原始 platform 信息。
- [ ] **Z08-009 增加生物认证能力标记**。归属：TS Backend。前置：Z08-008。执行：协议层声明当前客户端是否支持 biometric gate。验收：移动端可显示“需要 Face ID/指纹后才能打开”。红线：不得把服务器端权限模型建立在客户端自报能力上。
- [ ] **Z08-010 实现只读分享 token**。归属：TS Backend。前置：Z08-009。执行：生成 scope-limited、时效有限的 read-only share token。验收：分享链接可真正只读且可吊销。红线：不得复用主访问 token 当分享 token。
- [ ] **Z08-011 实现分享过期回收**。归属：TS Backend。前置：Z08-010。执行：后台定期回收过期的只读分享和 pairing nonce。验收：过期 token 不再可用。红线：不得让过期 token 永久留在有效列表。
- [ ] **Z08-012 增加认证尝试速率限制**。归属：TS Backend。前置：Z08-011。执行：对密码错误、无效 token、无效 nonce 加上限流与冷却。验收：暴力尝试会被阻断并记录。红线：不得对所有来源完全无限制重试。
- [ ] **Z08-013 增加 auth 审计日志**。归属：TS Backend。前置：Z08-012。执行：记录成功配对、失败登录、设备撤销、分享创建、分享撤销。验收：安全事件可追踪。红线：不得记录密码或完整 token。
- [ ] **Z08-014 增加安全响应头和 origin 策略**。归属：TS Backend。前置：Z08-013。执行：按本地/LAN/隧道模式配置 CORS、HSTS、frame 限制等。验收：部署模式变化时安全边界明确。红线：不得在所有模式下一刀切开放任意 origin。
- [ ] **Z08-015 补齐设备信任端到端测试**。归属：QA。前置：Z08-014。执行：覆盖首次配对、重复扫码、撤销后重连、只读分享、过期 token。验收：安全关键路径可自动化回归。红线：不得只做 happy path。
- [ ] **Z08-016 写 `docs/DEVICE_TRUST_MODEL.md`**。归属：Docs/Security。前置：Z08-015。执行：用用户可懂的方式说明 token、password、trusted device、share token 的关系。验收：产品、开发、运维对认证模型口径一致。红线：不得把多个凭证混称为“密码”。

## Z09 网络模式、隧道与未来 Relay（16 项）

目标：把 local / LAN / tunnel / relay 抽象成明确网络模式，避免网络访问逻辑散落在产品层。

阶段：M2

默认前置：Z08 安全与身份模型最小可用

- [ ] **Z09-001 定义 `networkMode` 枚举**。归属：TS Backend。前置：Z08 安全与身份模型最小可用。执行：建立 local、lan、tunnel、relay 四种模式及其配置字段。验收：前端和日志都能明确知道当前处于哪种接入模式。红线：不得继续通过零散布尔值拼凑网络状态。
- [ ] **Z09-002 抽出 tunnel provider 接口**。归属：TS Backend。前置：Z09-001。执行：把 cloudflared、devtunnel 适配成统一 provider interface。验收：新增 provider 时不需要改业务层。红线：不得把 provider 特有参数泄露到通用协议。
- [ ] **Z09-003 实现 provider health 状态对象**。归属：TS Backend。前置：Z09-002。执行：输出 provider name、status、lastError、publicUrl、reconnectAt。验收：诊断页可以准确显示隧道状态。红线：不得把 provider stderr 生吞掉。
- [ ] **Z09-004 增加 local-only 模式**。归属：TS Backend。前置：Z09-003。执行：支持完全关闭公网暴露，只监听 localhost。验收：桌面本机使用场景可无隧道启动。红线：不得在 local-only 下偷偷启用公网地址。
- [ ] **Z09-005 增加 LAN 模式说明与地址发现**。归属：TS Backend。前置：Z09-004。执行：在同局域网场景展示可访问 IP、端口与二维码。验收：用户无需手工查本机 IP。红线：不得在多网卡情况下展示错误优先地址而无切换办法。
- [ ] **Z09-006 实现只读分享 URL 生成器**。归属：TS Backend。前置：Z09-005。执行：为 read-only share 生成稳定、可复制、可过期的 URL。验收：用户能在 UI 一键复制分享链接。红线：不得把主控制 URL 当作只读链接。
- [ ] **Z09-007 实现 tunnel 自动重连与退避**。归属：TS Backend。前置：Z09-006。执行：provider 断开后按指数退避重连，并暴露状态事件。验收：网络抖动下不会疯狂重启子进程。红线：不得写死无上限紧循环重试。
- [ ] **Z09-008 建立 provider 日志收集面板**。归属：TS Frontend。前置：Z09-007。执行：在诊断页展示最近 tunnel/provider 日志条目。验收：用户不需要 SSH 回宿主机看标准输出。红线：不得把敏感 token 打进前端日志面板。
- [ ] **Z09-009 定义 relay 协议占位文档**。归属：Docs/TS。前置：Z09-008。执行：先写 relay 所需的最小 contract：device registration、push、resume、fanout。验收：以后做托管 relay 时不用重想协议。红线：不得现在就实现半成品 relay 服务。
- [ ] **Z09-010 增加 reverse proxy 兼容配置**。归属：TS Backend。前置：Z09-009。执行：支持受信任的 `X-Forwarded-*` 头与 base path。验收：经过 Nginx/Caddy/Traefik 时链接和 QR 不会错。红线：不得默认信任所有 proxy 头。
- [ ] **Z09-011 新增网络诊断页**。归属：TS Frontend。前置：Z09-010。执行：集中展示 mode、listen addresses、public URL、provider logs、auth mode。验收：用户遇到连接问题时有可见诊断入口。红线：不得只在终端启动日志中显示这些信息。
- [ ] **Z09-012 实现二维码生成策略**。归属：TS Fullstack。前置：Z09-011。执行：根据 local/LAN/tunnel/share 自动生成不同 payload 的二维码。验收：扫码后用户能进入正确模式而不是错误 origin。红线：不得在二维码里混入仅桌面可用的 localhost 地址给手机。
- [ ] **Z09-013 给 UI 加 share/revoke 操作入口**。归属：TS Frontend。前置：Z09-012。执行：在设置和 topic/runtime 页都能创建、查看、撤销只读分享。验收：分享全流程在 UI 中可闭环完成。红线：不得要求用户回命令行手工 revoke。
- [ ] **Z09-014 补齐网络模式集成测试**。归属：QA。前置：Z09-013。执行：覆盖 local、LAN、tunnel provider up/down、read-only share、proxy base path。验收：关键网络模式切换不会只靠手工验证。红线：不得跳过 provider 异常路径。
- [ ] **Z09-015 写 `docs/NETWORK_MODES.md`**。归属：Docs/DevEx。前置：Z09-014。执行：说明每种网络模式的适用场景、安全边界和推荐默认值。验收：用户和开发者都能知道何时该开隧道、何时不该。红线：不得把所有模式都宣传为“默认推荐”。
- [ ] **Z09-016 写 `docs/SELF_HOSTING_PATTERNS.md`**。归属：Docs/DevEx。前置：Z09-015。执行：给出家庭网络、公司内网、反代、自托管 VPS 等部署样例。验收：用户可以按场景快速落地。红线：不得只写一种理想化拓扑。

## Z10 共享协议、Schema 与 SDK（16 项）

目标：冻结一版 Remux 协议，把 Web、桌面、iOS、Android、未来 Rust sidecar 都对齐到同一组 schema。

阶段：M1-M2

默认前置：Z05 控制对象模型初步稳定

- [ ] **Z10-001 创建 `src/shared/contracts/`**。归属：TS。前置：Z05 控制对象模型初步稳定。执行：把协议定义从 hooks/server 零散代码中抽到 shared/contracts。验收：新协议一律在 shared/contracts 声明。红线：不得继续在 hook 与 server 各写一份类型。
- [ ] **Z10-002 拆分 `core` 合约域**。归属：TS。前置：Z10-001。执行：放协议版本、error envelope、hello、auth、capabilities 等基础类型。验收：所有其他域都依赖 core，而不是自己重复定义。红线：不得在子域再次自定义 requestId/errorCode。
- [ ] **Z10-003 拆分 `workspace` 合约域**。归属：TS。前置：Z10-002。执行：放 session/tab/pane snapshot、mutation payload。验收：Control plane 可以稳定引用 workspace 域。红线：不得把 inspect/topic 字段塞进 workspace 域。
- [ ] **Z10-004 拆分 `inspect` 合约域**。归属：TS。前置：Z10-003。执行：放 inspect request/response、badge、scope、export 等类型。验收：Inspect API 可以单独演进。红线：不得用 `any` 兜底复杂响应。
- [ ] **Z10-005 拆分 `device` 合约域**。归属：TS。前置：Z10-004。执行：放 QR、pairing、trust、share token、device list 等类型。验收：移动端可直接依赖 device 域接入。红线：不得把 share 和 device 混成一个宽泛凭证对象。
- [ ] **Z10-006 拆分 `topic/run/artifact` 合约域**。归属：TS。前置：Z10-005。执行：为未来 AI/workspace 层预留清晰域边界。验收：更高层能力可以并行开发而不互相污染。红线：不得把所有未来对象塞进一个 giant types 文件。
- [ ] **Z10-007 加入 schema 生成步骤**。归属：TS/DevEx。前置：Z10-006。执行：从合约定义生成 JSON Schema 或等价 machine-readable schema。验收：文档、测试、客户端都可复用同一 schema 产物。红线：不得只保留 TS 类型而没有可校验产物。
- [ ] **Z10-008 加入运行时校验器**。归属：TS。前置：Z10-007。执行：在 server 入站与 client 入站都使用 zod/valibot 校验 payload。验收：坏消息不会悄悄进入业务逻辑。红线：不得在入口绕过校验直接 `as any`。
- [ ] **Z10-009 建立 payload fixtures 目录**。归属：QA/TS。前置：Z10-008。执行：为每个关键消息存成功与失败 fixture。验收：协议回归测试能快速覆盖真实报文。红线：不得仅使用代码内联样例。
- [ ] **Z10-010 增加 protocol version 常量与变更日志**。归属：TS/Docs。前置：Z10-009。执行：给协议版本单独编号并维护 changelog。验收：客户端可基于版本做兼容处理。红线：不得在无版本 bump 的情况下偷偷改 breaking change。
- [ ] **Z10-011 建立 backward compatibility 策略**。归属：Docs/TS。前置：Z10-010。执行：明确哪些字段允许 optional 增加，哪些变更必须 bump major/minor。验收：发布时能判断兼容性级别。红线：不得靠口头约定兼容策略。
- [ ] **Z10-012 新增 `packages/client-sdk` 或等价模块**。归属：TS。前置：Z10-011。执行：封装 WebSocket envelope、error handling、reconnect helper。验收：Web/桌面/移动都可复用 SDK，而不是重复写 socket glue。红线：不得把 UI 状态和协议 SDK 混在一起。
- [ ] **Z10-013 准备 Swift DTO 导出规范**。归属：Docs/iOS。前置：Z10-012。执行：列出 iOS 侧如何映射 schema 到 Swift DTO。验收：iOS 开发不必手抄字段定义。红线：不得只说“后面再手动对齐”。
- [ ] **Z10-014 准备 Kotlin DTO 导出规范**。归属：Docs/Android。前置：Z10-013。执行：列出 Android 侧如何映射 schema 到 Kotlin DTO。验收：Android 开发有明确接线方式。红线：不得让 Android 和 iOS 各自猜字段。
- [ ] **Z10-015 补齐 schema 合规测试**。归属：QA/TS。前置：Z10-014。执行：覆盖合法 payload、缺字段、错字段、旧版本兼容。验收：协议错误在开发早期可被发现。红线：不得只测 happy path。
- [ ] **Z10-016 写 `docs/PROTOCOL_OVERVIEW.md`**。归属：Docs。前置：Z10-015。执行：给出各域 schema、传输方式、版本策略和样例。验收：任何新客户端成员都能先读协议文档再写代码。红线：不得让协议知识只存在在 hook 代码里。

## Z11 Web 客户端重构与共享 UI 基线（16 项）

目标：把当前偏单页的 UI 重构成 feature-first 架构，并沉淀可被桌面壳和移动壳复用的共享视图逻辑。

阶段：M2

默认前置：Z10 协议与 capabilities 稳定

- [ ] **Z11-001 拆分 `App.tsx` 为 app shell + feature screens**。归属：TS Frontend。前置：Z10 协议与 capabilities 稳定。执行：把初始化、路由、layout、live、inspect、control 逻辑拆到独立模块。验收：App.tsx 不再承载全部状态与副作用。红线：不得把旧逻辑简单复制到更多文件造成更乱。
- [ ] **Z11-002 引入状态分层 store**。归属：TS Frontend。前置：Z11-001。执行：建立 connectionStore、workspaceStore、inspectStore、preferenceStore 等。验收：状态拥有单一归属，调试更容易。红线：不得把所有 store 做成一个全局大仓库。
- [ ] **Z11-003 抽出 platform capability context**。归属：TS Frontend。前置：Z11-002。执行：统一声明当前是 web/desktop/ios/android 以及支持的原生桥接能力。验收：UI 不再写散落的 user-agent 判断。红线：不得直接根据 UA 猜能力。
- [ ] **Z11-004 新增 route 结构**。归属：TS Frontend。前置：Z11-003。执行：至少支持 runtime、topic、inbox、settings、diagnostics 的深链接。验收：刷新页面后仍能回到正确上下文。红线：不得所有页面都继续依赖单个本地状态。
- [ ] **Z11-005 建立 design tokens**。归属：TS Frontend。前置：Z11-004。执行：抽出色板、间距、半径、字号、阴影、层级到 tokens 文件。验收：Web/桌面/移动壳可以共享视觉基线。红线：不得在组件里散写 magic number。
- [ ] **Z11-006 整理主题系统**。归属：TS Frontend。前置：Z11-005。执行：暗色/浅色/系统主题统一由 preferenceStore 管理。验收：切换主题时不会出现不同模块不同步。红线：不得继续多处各自读写 localStorage key。
- [ ] **Z11-007 重做左侧导航结构**。归属：TS Frontend。前置：Z11-006。执行：把 runtime/session/topic/inbox/settings 统一到左侧 rail 或移动底栏。验收：跨端信息架构一致。红线：不得让同一入口在不同页面跳来跳去。
- [ ] **Z11-008 新增移动端底部导航**。归属：TS Frontend。前置：Z11-007。执行：为手机增加 Live/Inspect/Control/Topics/Inbox 五个一级入口。验收：手机操作不再依赖侧边抽屉。红线：不得把核心入口藏在两层以上菜单。
- [ ] **Z11-009 实现命令面板**。归属：TS Frontend。前置：Z11-008。执行：支持通过键盘或触控快速执行切 tab、开 pane、搜 topic、开诊断。验收：桌面效率入口统一。红线：不得把命令面板做成只支持英文硬编码。
- [ ] **Z11-010 重做设置中心**。归属：TS Frontend。前置：Z11-009。执行：把连接、安全、外观、网络、设备、实验功能整合进设置页。验收：用户不需要在多个隐藏角落找设置项。红线：不得把安全设置和普通外观设置混成同一无序列表。
- [ ] **Z11-011 重做上传与剪贴板 UX**。归属：TS Frontend。前置：Z11-010。执行：明确区分 paste、upload、share sheet import、snippet insert。验收：用户知道每种输入方式的去向。红线：不得在不同入口触发不同隐藏副作用。
- [ ] **Z11-012 加入标准化 empty/loading/error 状态**。归属：TS Frontend。前置：Z11-011。执行：为所有 feature screen 统一空态、加载态、错误态组件。验收：界面行为一致。红线：不得个别页面继续白屏或只打 console。
- [ ] **Z11-013 加入无障碍基础检查**。归属：TS Frontend。前置：Z11-012。执行：确保按钮、表单、导航、列表至少具备 label、focus、ARIA 基础。验收：键盘与读屏器基本可用。红线：不得为了视觉极简移除必要可访问文本。
- [ ] **Z11-014 加入性能预算与埋点**。归属：TS Frontend。前置：Z11-013。执行：记录首屏时间、首次连接时间、Inspect 打开时间、Live 恢复时间。验收：性能回归可被持续观察。红线：不得把性能问题留到最后主观体感阶段。
- [ ] **Z11-015 建立 web regression 用例**。归属：QA/TS Frontend。前置：Z11-014。执行：覆盖主要布局、关键状态和典型互动。验收：重构过程中 UI 可稳定回归。红线：不得把回归责任完全交给人工点点看。
- [ ] **Z11-016 写 `docs/WEB_APP_STRUCTURE.md`**。归属：Docs/Frontend。前置：Z11-015。执行：说明 store、routes、feature、shared 目录职责。验收：前端多人协作时不再反复争论文件落点。红线：不得写成空泛的目录树截图。

## Z12 桌面壳：Electron Host Alpha（16 项）

目标：在不重写当前 Node/PTY 内核的前提下，尽快交付可启动本地网关、可深度接入系统能力的桌面版本。

阶段：M3

默认前置：Z11 Web Shell 稳定，Z08 安全最小可用

- [ ] **Z12-001 创建 `apps/desktop-electron/` 脚手架**。归属：Desktop/Electron。前置：Z11 Web Shell 稳定，Z08 安全最小可用。执行：新建 Electron 主进程、预加载、打包配置与开发脚本。验收：桌面工程可独立启动空窗口。红线：不得把桌面代码继续塞在 web/src 内。
- [ ] **Z12-002 接入现有 web dev/build**。归属：Desktop/Electron。前置：Z12-001。执行：开发态加载 Vite dev server，生产态加载打包后的静态前端。验收：桌面壳不复制前端代码。红线：不得维护第二套桌面专用前端副本。
- [ ] **Z12-003 实现本地 gateway 启动器**。归属：Desktop/Electron。前置：Z12-002。执行：由桌面壳负责启动/停止本地 remux gateway 进程。验收：桌面用户双击应用即可进入本地 workspace。红线：不得要求桌面用户先手工开终端跑 CLI。
- [ ] **Z12-004 实现单实例锁**。归属：Desktop/Electron。前置：Z12-003。执行：二次启动时唤醒现有实例而不是开一堆重复进程。验收：多次点击图标不会制造多个竞争实例。红线：不得因为没有单实例导致端口冲突。
- [ ] **Z12-005 加入系统托盘/菜单栏入口**。归属：Desktop/Electron。前置：Z12-004。执行：允许最小化到托盘、快速打开当前 workspace、退出服务。验收：桌面壳具备基础常驻能力。红线：不得让关闭窗口直接无提示杀掉后台服务。
- [ ] **Z12-006 加入开机自启动开关**。归属：Desktop/Electron。前置：Z12-005。执行：允许用户控制是否随系统启动本地服务。验收：设置项可持久保存并真实生效。红线：不得默认强开自启动。
- [ ] **Z12-007 实现桌面通知桥接**。归属：Desktop/Electron。前置：Z12-006。执行：把 inbox、approval、run done、share invite 等通知桥接到原生通知。验收：通知点击能回到正确页面。红线：不得只弹原生通知却没有深链接落点。
- [ ] **Z12-008 加入多窗口支持**。归属：Desktop/Electron。前置：Z12-007。执行：允许单独打开 topic、review、inspect 或 diagnostics 窗口。验收：桌面用户可并行查看多个上下文。红线：不得多窗口各自启动一套孤立 gateway。
- [ ] **Z12-009 加入深链接协议 `remux://`**。归属：Desktop/Electron。前置：Z12-008。执行：处理系统级深链接并路由到指定 runtime/topic/run。验收：从通知或浏览器点击可直达正确内容。红线：不得把所有深链接都落回首页。
- [ ] **Z12-010 加入打开外部路径动作**。归属：Desktop/Electron。前置：Z12-009。执行：在 artifact/worktree/review 等场景支持 reveal in Finder/Explorer。验收：桌面集成具备实际系统价值。红线：不得在 Web-only 环境暴露无效按钮。
- [ ] **Z12-011 加入全局快捷键入口**。归属：Desktop/Electron。前置：Z12-010。执行：至少支持唤起命令面板或 quick inspect。验收：桌面用户能像原生 app 一样快速召回。红线：不得默认抢占过多系统快捷键。
- [ ] **Z12-012 接入 auto-update 配置骨架**。归属：Desktop/Electron。前置：Z12-011。执行：先建立更新通道与签名配置占位，不急于默认开启自动更新。验收：后续发布路径可平滑接入。红线：不得在未签名和未验证前默认推送更新。
- [ ] **Z12-013 接入 crash report 管道**。归属：Desktop/Electron。前置：Z12-012。执行：把桌面壳崩溃与 gateway 崩溃分开记录。验收：排错时能区分宿主问题还是服务问题。红线：不得上传敏感正文。
- [ ] **Z12-014 建立桌面打包脚本**。归属：Desktop/Electron。前置：Z12-013。执行：支持 macOS、Windows、Linux 的本地和 CI 打包。验收：桌面工程可产出可安装包。红线：不得仅支持开发模式而无正式打包链路。
- [ ] **Z12-015 补齐桌面 smoke test**。归属：QA/Desktop。前置：Z12-014。执行：覆盖启动、重连、通知、托盘、深链接、退出。验收：桌面宿主关键路径有自动化回归。红线：不得只手工点一遍就声称可发布。
- [ ] **Z12-016 写 `docs/DESKTOP_HOST_PLAN.md`**。归属：Docs/Desktop。前置：Z12-015。执行：说明 Electron alpha 的边界、为什么现在不强推 Tauri、未来切换条件。验收：团队对桌面宿主路线有统一预期。红线：不得把宿主选择写成宗教问题。

## Z13 iOS 原生壳（16 项）

目标：用 SwiftUI + WKWebView 做出 Inspect-first、审批优先、连接接近原生的手机端体验。

阶段：M3

默认前置：Z10 协议冻结，Z08 设备信任可用

- [ ] **Z13-001 创建 iOS 工程脚手架**。归属：iOS。前置：Z10 协议冻结，Z08 设备信任可用。执行：新建 Xcode project、targets、bundle id、基础签名配置。验收：能在模拟器与真机启动空壳。红线：不得把 iOS 先做成纯浏览器书签替代。
- [ ] **Z13-002 实现扫码入口**。归属：iOS。前置：Z13-001。执行：接入摄像头扫码并解析 Remux pairing QR payload。验收：二维码扫描成功后能进入配对确认流程。红线：不得直接扫码后无确认地写入长期凭证。
- [ ] **Z13-003 实现 Keychain 存储**。归属：iOS。前置：Z13-002。执行：把 server trust token、device id、偏好设置写入 Keychain/安全容器。验收：卸载前凭证安全存储；重启应用仍可读取。红线：不得把长期凭证明文存在 UserDefaults。
- [ ] **Z13-004 实现首次配对确认页**。归属：iOS。前置：Z13-003。执行：展示 server 名称、地址、权限级别、过期时间，让用户明确确认。验收：用户知道自己连的是哪个 Remux。红线：不得省略关键安全信息。
- [ ] **Z13-005 嵌入 WKWebView 工作区壳**。归属：iOS。前置：Z13-004。执行：以 WebView 承载共享 workspace UI，并准备 native bridge。验收：iOS 可快速复用现有 Web 功能。红线：不得在 v1 就复制一套完整原生 UI。
- [ ] **Z13-006 实现 native 顶部/底部导航壳**。归属：iOS。前置：Z13-005。执行：用原生导航条和底部 tab 包装 Web 内容。验收：iOS 体验不完全像单页网页。红线：不得让系统返回、状态栏、刘海适配全部失控。
- [ ] **Z13-007 加入 Face ID/Touch ID 解锁**。归属：iOS。前置：Z13-006。执行：在打开敏感内容或恢复后台时可要求生物认证。验收：用户能对手机侧访问增加本地防护。红线：不得把生物认证当成服务器端权限替代。
- [ ] **Z13-008 加入 APNs 注册骨架**。归属：iOS。前置：Z13-007。执行：为 approval、run done、share invite 等事件准备通知能力。验收：设备能成功注册通知 token。红线：不得在未说明用途前擅自大量推送。
- [ ] **Z13-009 实现前后台恢复策略**。归属：iOS。前置：Z13-008。执行：前台恢复时自动刷新 connection/device/trust/inbox 状态。验收：从后台回来不会看到长时间过期内容。红线：不得在后台常驻高频无意义轮询。
- [ ] **Z13-010 实现 inspect-first 首页**。归属：iOS。前置：Z13-009。执行：首次进入某 runtime/topic 默认展示 Inspect 概览。验收：手机端用户可以先读后控。红线：不得默认强开 Live 键盘。
- [ ] **Z13-011 实现 approval inbox 页面**。归属：iOS。前置：Z13-010。执行：原生列出待审批、已处理、失败审批，并支持一键进入详情。验收：用户无需在 WebView 深层页面里找审批。红线：不得把审批入口埋在设置页。
- [ ] **Z13-012 加入 share sheet 导入**。归属：iOS。前置：Z13-011。执行：支持从系统分享文本/文件到当前 topic 或 artifact。验收：手机端能快速转交外部内容给 workspace。红线：不得导入成功后找不到目标 topic。
- [ ] **Z13-013 加入 universal link / deep link**。归属：iOS。前置：Z13-012。执行：让通知点击或浏览器链接直达指定 runtime/topic/run。验收：跨应用跳转闭环成立。红线：不得全部跳回首页。
- [ ] **Z13-014 实现设备管理页**。归属：iOS。前置：Z13-013。执行：可查看当前设备身份、重命名、撤销其他设备、复制设备 id。验收：手机端也能参与设备管理。红线：不得只读显示而无法执行必要动作。
- [ ] **Z13-015 加入 TestFlight 发布链路**。归属：iOS。前置：Z13-014。执行：建立签名、构建号、测试分发脚本与发布说明。验收：iOS 开发不再靠手工 Xcode 导出单包。红线：不得只有本地调试而无可持续分发路径。
- [ ] **Z13-016 补齐 iOS smoke test**。归属：QA/iOS。前置：Z13-015。执行：覆盖扫码、配对、恢复、通知、审批、深链接。验收：关键移动路径可回归。红线：不得只手测一台机器。

## Z14 Android 原生壳（16 项）

目标：用 Kotlin/Compose + WebView 补齐 Android 端，保证跨端不是只覆盖 iPhone。

阶段：M3-M4

默认前置：Z10 协议冻结，Z08 设备信任可用

- [ ] **Z14-001 创建 Android 工程脚手架**。归属：Android。前置：Z10 协议冻结，Z08 设备信任可用。执行：新建 Gradle 工程、包名、签名、基础构建变体。验收：模拟器与真机可启动空壳。红线：不得继续把 Android 计划停留在文档里。
- [ ] **Z14-002 实现扫码入口**。归属：Android。前置：Z14-001。执行：接入 CameraX 或等价方案扫描 Remux pairing QR。验收：能稳定读出二维码并进入确认页。红线：不得把扫码结果静默当成已登录。
- [ ] **Z14-003 实现安全存储**。归属：Android。前置：Z14-002。执行：用 EncryptedSharedPreferences/Keystore 存长期凭证。验收：应用重启后可恢复授权。红线：不得把凭证明文存普通 shared preferences。
- [ ] **Z14-004 实现首次配对确认页**。归属：Android。前置：Z14-003。执行：展示 server、权限、过期时间和设备名称，让用户确认。验收：Android 配对体验与 iOS 对齐。红线：不得跳过确认步骤。
- [ ] **Z14-005 嵌入 WebView 工作区壳**。归属：Android。前置：Z14-004。执行：用 WebView 加原生桥承载共享 workspace UI。验收：Android 能快速复用 Web 功能。红线：不得复制一套完整页面逻辑到原生层。
- [ ] **Z14-006 实现原生导航外壳**。归属：Android。前置：Z14-005。执行：底部导航 + 顶部栏承载 Live/Inspect/Control/Topics/Inbox。验收：Android 操作符合本机习惯。红线：不得把所有交互都交给 WebView 内部。
- [ ] **Z14-007 加入生物认证**。归属：Android。前置：Z14-006。执行：在恢复访问或打开敏感页面时可要求指纹/面容/系统凭证。验收：用户可在手机端增加本地保护。红线：不得把本地生物认证等同于服务端权限。
- [ ] **Z14-008 加入通知 channel**。归属：Android。前置：Z14-007。执行：为 approval、run、share、device 等类别建立 channel。验收：用户可按类别管理提醒。红线：不得所有通知共用一个无语义 channel。
- [ ] **Z14-009 实现前后台恢复策略**。归属：Android。前置：Z14-008。执行：应用回前台时刷新 session/trust/inbox 状态。验收：移动网络抖动下状态恢复可预期。红线：不得在后台保活上过度消耗电量。
- [ ] **Z14-010 实现 inspect-first 首页**。归属：Android。前置：Z14-009。执行：默认先展示当前 workspace/topic 的 Inspect 摘要。验收：手机端以阅读和理解为第一入口。红线：不得默认把用户送进输入焦点态。
- [ ] **Z14-011 实现 approval inbox 页**。归属：Android。前置：Z14-010。执行：原生列出待处理审批，并支持 approve/reject/open detail。验收：用户可在几秒内完成紧急审批。红线：不得把审批流深埋在 WebView 层级中。
- [ ] **Z14-012 加入 share intent 导入**。归属：Android。前置：Z14-011。执行：从系统分享文本/文件到当前 topic/artifact。验收：Android 生态内容可快速送进 Remux。红线：不得导入后没有明确回执。
- [ ] **Z14-013 加入 app links / deep links**。归属：Android。前置：Z14-012。执行：处理通知点击和浏览器链接的深链接路由。验收：打开链接后能直达正确内容。红线：不得全部跳到主页。
- [ ] **Z14-014 实现设备管理页**。归属：Android。前置：Z14-013。执行：展示当前设备身份、信任状态、重命名与撤销其他设备入口。验收：Android 具备完整设备参与能力。红线：不得只作为只读信息页。
- [ ] **Z14-015 建立内部测试发布链路**。归属：Android。前置：Z14-014。执行：接入 internal testing / Firebase App Distribution 等方案。验收：团队可以稳定分发测试包。红线：不得只靠 IDE 侧装 APK。
- [ ] **Z14-016 补齐 Android smoke test**。归属：QA/Android。前置：Z14-015。执行：覆盖扫码、配对、恢复、通知、审批、深链接与分享导入。验收：关键移动路径可回归。红线：不得只测单一机型与单一系统版本。

## Z15 Topic / Inbox / IM 化工作区壳（16 项）

目标：把 Remux 从 terminal cockpit 推进到 topic-first、IM-like 的 AI-native workspace。

阶段：M4

默认前置：Z11 Web Shell 稳定，Z07 存储骨架可用

- [ ] **Z15-001 定义 Topic 域模型**。归属：TS/Backend。前置：Z11 Web Shell 稳定，Z07 存储骨架可用。执行：明确 topic 的 id、title、scope、pins、members、unread、lastActivity、status。验收：Topic 成为正式对象，可被查询和路由。红线：不得把 topic 简化成一个前端本地标签页。
- [ ] **Z15-002 定义 TimelineItem 域模型**。归属：TS/Backend。前置：Z15-001。执行：统一 human note、system event、command card、artifact card、approval card、run card。验收：时间线能容纳多种事件而不破坏统一列表体验。红线：不得每种消息都另起一套独立列表。
- [ ] **Z15-003 创建 topics 表与基础 API**。归属：TS Backend。前置：Z15-002。执行：支持 list/create/update/archive/pin runtime。验收：Topic 可以持久保存和复用。红线：不得只存在于 localStorage。
- [ ] **Z15-004 创建 timeline 表与基础 API**。归属：TS Backend。前置：Z15-003。执行：为每个 topic 存时间线项与顺序。验收：刷新后时间线仍可恢复。红线：不得直接依赖前端内存状态。
- [ ] **Z15-005 实现 runtime 到 topic 的 pin/unpin**。归属：TS Fullstack。前置：Z15-004。执行：允许把某 session/tab/pane 绑定到一个 topic 上下文。验收：Topic 与 runtime 形成稳定关联。红线：不得把多个不相干 runtime 混成一个默认 topic。
- [ ] **Z15-006 新增 Topics 左侧 rail**。归属：TS Frontend。前置：Z15-005。执行：在 Web/桌面左侧加入 topic 列表、搜索、筛选与未读数。验收：用户能从 topic 视角进入工作区。红线：不得把 topic 入口藏到二级菜单。
- [ ] **Z15-007 新增 Topic 主屏壳**。归属：TS Frontend。前置：Z15-006。执行：中间区显示 timeline，右侧 dock 显示 inspect/live/context。验收：Topic 层第一次形成独立页面。红线：不得把 Live 和 Topic 完全割裂成两个世界。
- [ ] **Z15-008 实现 compose box**。归属：TS Frontend。前置：Z15-007。执行：允许输入文本 note、slash command、粘贴片段、插入 snippet。验收：Topic 具备可持续会话输入入口。红线：不得把 compose 只绑定到 terminal stdin。
- [ ] **Z15-009 加入未读与最近活跃排序**。归属：TS Frontend。前置：Z15-008。执行：Topic 列表可按 unread、pinned、lastActivity 排序。验收：IM 化工作区具备基础可用性。红线：不得让用户只能按创建时间找 topic。
- [ ] **Z15-010 实现 topic deep links**。归属：TS Frontend。前置：Z15-009。执行：支持 `/topics/:id` 与 runtime/topic 联动路由。验收：通知和分享可直达指定 topic。红线：不得刷新后丢上下文。
- [ ] **Z15-011 加入 topic filters**。归属：TS Frontend。前置：Z15-010。执行：支持按 runtime、mine、alerts、archived 过滤。验收：topic 列表在规模增大后仍可管理。红线：不得所有 topic 永远塞在一个长列表。
- [ ] **Z15-012 把 runtime 事件自动写入 timeline**。归属：TS Backend。前置：Z15-011。执行：focus、rename、share、inspect export 等事件可自动生成系统消息。验收：Topic 不只显示人工消息。红线：不得把系统事件和人工消息完全拆成两个互不相见的地方。
- [ ] **Z15-013 实现移动端 Topics 导航**。归属：TS Frontend。前置：Z15-012。执行：手机可以从底部导航进入 topic 列表和详情。验收：移动端 topic 体验不是桌面缩小版。红线：不得要求手机用户横向滚动查看时间线。
- [ ] **Z15-014 加入 topic 通知负载**。归属：TS Backend。前置：Z15-013。执行：统一 topic 事件生成通知 payload 的策略。验收：后续桌面/移动通知能直接消费。红线：不得每个功能各自拼通知文本。
- [ ] **Z15-015 补齐 topic/timeline 测试**。归属：QA/TS。前置：Z15-014。执行：覆盖 topic 创建、归档、pin runtime、timeline 渲染、未读更新。验收：IM 化壳不会仅靠肉眼回归。红线：不得只测创建 happy path。
- [ ] **Z15-016 写 `docs/TOPIC_MODEL.md`**。归属：Docs/Product。前置：Z15-015。执行：说明 Topic 和 runtime/run/artifact 的关系，以及为何这是 IM-like 但不是聊天工具。验收：团队对产品形态有统一认知。红线：不得把 topic 写成模糊的“未来也许会做”。

## Z16 Agent Runs、审批与人工接管（16 项）

目标：让 agent 工作流具备 run 状态机、审批队列和一键接管到 Live 的闭环。

阶段：M4

默认前置：Z15 Topic shell 建立，Z07 存储可用

- [ ] **Z16-001 定义 Run 域模型**。归属：TS/Backend。前置：Z15 Topic shell 建立，Z07 存储可用。执行：明确 run 的状态机、目标 topic、runtime 绑定、initiator、policy、startedAt/endedAt。验收：Run 成为正式对象而不是日志中的一句话。红线：不得把 run 只当一次前端按钮点击。
- [ ] **Z16-002 定义 AgentProfile 域模型**。归属：TS/Backend。前置：Z16-001。执行：记录 agent kind、adapter、displayName、icon、capabilities。验收：不同 agent 适配器都能以统一方式展示。红线：不得把厂商名称写死在全局 UI 文案。
- [ ] **Z16-003 定义 ApprovalRequest 域模型**。归属：TS/Backend。前置：Z16-002。执行：明确审批类型、scope、risk level、requestedBy、expiresAt、resolution。验收：审批可跨端流转。红线：不得把审批做成一次性临时 toast。
- [ ] **Z16-004 创建 runs 表与基础 API**。归属：TS Backend。前置：Z16-003。执行：支持 list/get/start/cancel/retry。验收：Run 对象可持久查询。红线：不得只在内存中维护。
- [ ] **Z16-005 创建 approvals 表与基础 API**。归属：TS Backend。前置：Z16-004。执行：支持 create/list/resolve/expire。验收：审批状态可追踪与审计。红线：不得审批完成后直接消失无记录。
- [ ] **Z16-006 定义 shell-agent adapter 接口**。归属：TS Backend。前置：Z16-005。执行：先以 generic shell/CLI agent 为最小适配器，不绑定单一厂商。验收：后续可接 Codex/Claude/aider/opencode 等实现。红线：不得把某家 SDK 写进核心领域模型。
- [ ] **Z16-007 实现 run start/cancel/retry 流**。归属：TS Fullstack。前置：Z16-006。执行：Web/桌面可以创建 run，并在失败后重试或取消。验收：基础 agent orchestration 可用。红线：不得没有状态机就直接堆按钮。
- [ ] **Z16-008 实现 approval create/resolve 流**。归属：TS Fullstack。前置：Z16-007。执行：当 run 需要敏感动作时生成审批，并允许批准/拒绝。验收：审批有明确结果和回执。红线：不得只提供 approve 不提供 reject。
- [ ] **Z16-009 新增 Runs 列表与详情页**。归属：TS Frontend。前置：Z16-008。执行：展示状态、持续时间、关联 topic/runtime、最近输出摘要。验收：用户能管理 run，而不只在 timeline 中瞥一眼。红线：不得详情页空空如也只剩状态。
- [ ] **Z16-010 新增 Approval Queue 面板**。归属：TS Frontend。前置：Z16-009。执行：桌面/Web 可快速查看待处理审批。验收：审批操作不需要四处找。红线：不得把审批散落在多个小红点里。
- [ ] **Z16-011 实现移动端审批快处理**。归属：iOS/Android/TS。前置：Z16-010。执行：移动壳可直接从通知或 inbox 中 approve/reject。验收：手机端具备真正的干预价值。红线：不得要求手机用户进入复杂桌面式页面才能审批。
- [ ] **Z16-012 把 run 状态写入 topic timeline**。归属：TS Backend。前置：Z16-011。执行：started/paused/waiting_approval/done/failed 都要发 timeline 项。验收：Topic 可以完整叙述 agent 行为。红线：不得让时间线只显示 run 开始不显示结束。
- [ ] **Z16-013 实现 run 到 live pane 的人工接管**。归属：TS Frontend。前置：Z16-012。执行：从 run 卡片一键跳进相关 live pane 或 inspect 片段。验收：用户能无缝从自动化切到手动接管。红线：不得把人工接管做成断裂跳转。
- [ ] **Z16-014 加入 run policy presets**。归属：Product/TS。前置：Z16-013。执行：至少提供 safe / balanced / aggressive 三档策略。验收：同一 agent 在不同风险场景下可复用策略集。红线：不得只靠自由文本让用户每次临时描述风险边界。
- [ ] **Z16-015 补齐 run/approval 集成测试**。归属：QA。前置：Z16-014。执行：覆盖 start、cancel、retry、等待审批、审批后继续、超时过期。验收：关键 AI-native 控制流可回归。红线：不得只测一个 run happy path。
- [ ] **Z16-016 写 `docs/RUN_AND_APPROVAL_MODEL.md`**。归属：Docs/Product。前置：Z16-015。执行：说明 run、approval、human takeover 的语义与权限边界。验收：团队不会再把 agent 执行和 shell 命令混为一类。红线：不得只写 UI 流程图而不写状态机。

## Z17 Artifacts、Review Center 与 Worktree（16 项）

目标：把 diff、日志、生成物、代码审查与 worktree 管理变成一等公民，而不是散落在终端命令里。

阶段：M4-M5

默认前置：Z16 Runs 流水线建立

- [ ] **Z17-001 定义 Artifact 域模型**。归属：TS/Backend。前置：Z16 Runs 流水线建立。执行：明确 artifact 类型、来源、摘要、路径、topic/run 关联。验收：Artifact 可以统一管理文本、文件、diff、截图等。红线：不得把所有输出都当一段普通消息文本。
- [ ] **Z17-002 定义 ReviewThread 域模型**。归属：TS/Backend。前置：Z17-001。执行：明确 review 对象、评论、状态、owner、resolution。验收：评审可独立存在而非只靠聊天记录。红线：不得把评审意见混成普通 note。
- [ ] **Z17-003 定义 Worktree 域模型**。归属：TS/Backend。前置：Z17-002。执行：明确 repo、branch、path、status、linked runtime/topic。验收：Worktree 成为一等资源。红线：不得把 worktree 仅作为字符串路径。
- [ ] **Z17-004 创建 artifacts 表与文件索引**。归属：TS Backend。前置：Z17-003。执行：建立 artifact metadata 存储和文件仓挂接。验收：Artifact 列表与详情可查询。红线：不得只把 artifact 藏在 topic timeline 里。
- [ ] **Z17-005 创建 review_threads 表**。归属：TS Backend。前置：Z17-004。执行：存 review thread、comment、状态。验收：Review Center 可持久恢复。红线：不得 review 刷新就丢。
- [ ] **Z17-006 创建 worktrees 表**。归属：TS Backend。前置：Z17-005。执行：登记已知 worktree 与状态。验收：桌面端可以管理多个隔离工作树。红线：不得让 worktree 状态只存在某次命令输出里。
- [ ] **Z17-007 实现 artifact 注册 API**。归属：TS Backend。前置：Z17-006。执行：允许 run、upload、manual attach 都注册 artifact。验收：不同来源统一归档。红线：不得每个来源定义一套不同 artifact 结构。
- [ ] **Z17-008 实现 diff artifact 类型**。归属：TS Backend。前置：Z17-007。执行：为补丁/commit diff 保存结构化摘要和可预览数据。验收：后续 review center 可以直接消费。红线：不得把 diff 仅存成无类型纯文本。
- [ ] **Z17-009 实现桌面 Review Center 页面**。归属：TS Frontend。前置：Z17-008。执行：集中展示待看 diff、评审线程、状态过滤。验收：桌面端出现明确的 review 工作台。红线：不得把 review 仍旧拆散在多个 topic。
- [ ] **Z17-010 接入 Monaco diff viewer**。归属：TS Frontend。前置：Z17-009。执行：用成熟 diff 视图展示 patch/file changes。验收：用户可阅读与评论改动。红线：不得在首版手写简陋 diff 渲染器。
- [ ] **Z17-011 实现 approve / request changes / comment**。归属：TS Frontend。前置：Z17-010。执行：对 diff 或 artifact 发起正式评审动作。验收：评审状态有闭环。红线：不得只有 comment 没有状态变化。
- [ ] **Z17-012 实现 worktree register/open/switch**。归属：TS Fullstack。前置：Z17-011。执行：允许登记已有 worktree、切换当前 worktree、打开关联 runtime/topic。验收：多 worktree 工作流可管理。红线：不得直接对用户仓库进行不可逆操作。
- [ ] **Z17-013 实现 artifact pin 到 topic**。归属：TS Frontend。前置：Z17-012。执行：可以把重要输出物固定在 topic 右侧或顶部。验收：重要结果不会淹没在时间线里。红线：不得 pin 后仍难以重新找到。
- [ ] **Z17-014 实现移动端 artifact 摘要查看**。归属：TS Frontend/Mobile。前置：Z17-013。执行：手机端至少能看文本 artifact 与 diff 摘要。验收：移动审批和阅读闭环成立。红线：不得在手机端暴露无法阅读的大型复杂视图却无降级。
- [ ] **Z17-015 补齐 artifact/review/worktree 测试**。归属：QA。前置：Z17-014。执行：覆盖注册、渲染、评论、状态切换、worktree 绑定。验收：桌面核心增值能力有自动化保护。红线：不得只测列表不测详情和状态变更。
- [ ] **Z17-016 写 `docs/ARTIFACT_REVIEW_WORKTREE.md`**。归属：Docs/Product。前置：Z17-015。执行：说明这三者如何服务 AI-native workspace，而不是变成杂乱附属功能。验收：团队能按统一逻辑继续扩展。红线：不得把三个模型写成互不相干的小功能。

## Z18 搜索、Memory 与 Handoff（16 项）

目标：建立跨 Topic / Run / Artifact / Inspect 的搜索与记忆层，让 Remux 具备真正的 workspace continuity。

阶段：M5

默认前置：Z07、Z15、Z16、Z17 的对象模型稳定

- [ ] **Z18-001 定义 MemoryNote 域模型**。归属：TS/Backend。前置：Z07、Z15、Z16、Z17 的对象模型稳定。执行：记录可长期保留的结论、决策、风险、待办、关键片段。验收：Memory 与普通 timeline note 语义区分清楚。红线：不得把任何消息都默认升格为 memory。
- [ ] **Z18-002 定义 HandoffBundle 域模型**。归属：TS/Backend。前置：Z18-001。执行：包含 topic、run、artifact、inspect、next steps、owner、due。验收：交接包成为正式对象。红线：不得把 handoff 仅当一次导出动作。
- [ ] **Z18-003 创建 memory_notes 表**。归属：TS Backend。前置：Z18-002。执行：支持保存、归档、置顶、标签。验收：重要结论可长期保存。红线：不得只存在前端本地缓存。
- [ ] **Z18-004 创建 handoff_bundles 表**。归属：TS Backend。前置：Z18-003。执行：支持创建、更新、导出、完成。验收：handoff 可被追踪。红线：不得交接后完全无状态。
- [ ] **Z18-005 实现全局搜索 API**。归属：TS Backend。前置：Z18-004。执行：支持 topics、runs、artifacts、inspect、memory 的统一搜索。验收：用户能跨对象检索。红线：不得为每类对象单独散写搜索入口。
- [ ] **Z18-006 实现搜索结果分组模型**。归属：TS Backend。前置：Z18-005。执行：按 Topic / Run / Artifact / Inspect / Memory 分组返回。验收：前端结果可有组织地呈现。红线：不得把不同对象强行拼一张无类型列表。
- [ ] **Z18-007 实现保存搜索**。归属：TS Frontend。前置：Z18-006。执行：允许用户保存常用过滤条件与关键字。验收：频繁回看的工作集可快速复用。红线：不得每次都要求从头输入复杂查询。
- [ ] **Z18-008 实现桌面全局搜索面板**。归属：TS Frontend。前置：Z18-007。执行：桌面端命令面板可直接搜 topic/run/artifact/memory。验收：搜索成为主操作入口之一。红线：不得把搜索埋在设置页。
- [ ] **Z18-009 实现移动端搜索页**。归属：TS Frontend/Mobile。前置：Z18-008。执行：手机端具备可读的搜索入口和结果分组。验收：移动端也能快速找回历史。红线：不得照搬桌面复杂布局。
- [ ] **Z18-010 实现“生成当前工作区交接包”动作**。归属：TS Fullstack。前置：Z18-009。执行：从当前 topic/runtime/run 生成 handoff bundle 草稿。验收：用户能在离开设备前快速沉淀上下文。红线：不得生成完全空洞、没有下一步的交接包。
- [ ] **Z18-011 实现 handoff 导出为 Markdown/JSON**。归属：TS Backend。前置：Z18-010。执行：交接包可导出为人可读和机可读两种格式。验收：外部系统或团队成员可消费。红线：不得导出泄露敏感配置字段。
- [ ] **Z18-012 自动把 run 结论沉淀为 memory 建议**。归属：TS Backend。前置：Z18-011。执行：当 run 结束时生成待确认 memory suggestion。验收：重要结果不会自动丢失。红线：不得未经用户确认就把所有 run 输出永久保存。
- [ ] **Z18-013 支持把 inspect 快照 pin 为 memory**。归属：TS Frontend。前置：Z18-012。执行：用户可把一段 inspect 内容提升为长期记忆。验收：重要历史不会因为实时输出滚动而消失。红线：不得 pin 后丢失来源与时间戳。
- [ ] **Z18-014 加入 follow-up queue**。归属：TS Backend/Frontend。前置：Z18-013。执行：支持为 topic/run/memory 设置 follow-up、到期日、负责人。验收：Remux 不只是记录，还能驱动下一步。红线：不得只有提醒文本没有结构化状态。
- [ ] **Z18-015 补齐搜索与 handoff 测试**。归属：QA。前置：Z18-014。执行：覆盖索引、结果分组、导出、memory 建议、follow-up。验收：搜索和交接不会在重构中悄悄失效。红线：不得只测单一对象搜索。
- [ ] **Z18-016 写 `docs/MEMORY_AND_HANDOFF.md`**。归属：Docs/Product。前置：Z18-015。执行：定义什么该进入 memory、什么该进入 handoff、两者如何关联。验收：团队对“长期记忆”与“临时时间线”有统一边界。红线：不得让 memory 变成新的垃圾桶。

## Z19 Team Mode 与权限矩阵（16 项）

目标：让 Remux 从个人 cockpit 可平滑扩展到团队协作，而不在单机阶段就引入过量复杂度。

阶段：M5

默认前置：Z15 Topic、Z16 Approvals、Z17 Review 可用

- [ ] **Z19-001 定义 WorkspaceMember 域模型**。归属：TS/Backend。前置：Z15 Topic、Z16 Approvals、Z17 Review 可用。执行：记录成员、角色、状态、加入时间、通知偏好。验收：成员关系成为正式对象。红线：不得仅靠 email 字符串散落在多处。
- [ ] **Z19-002 定义 Role 权限矩阵**。归属：TS/Backend。前置：Z19-001。执行：至少明确 owner、editor、reviewer、viewer 四类角色。验收：后端权限判断有统一来源。红线：不得在前端和后端各自维护不同权限表。
- [ ] **Z19-003 创建 workspace_members 表**。归属：TS Backend。前置：Z19-002。执行：存成员基础信息与状态。验收：成员可持久查询与管理。红线：不得把团队成员只放在 config 文件里。
- [ ] **Z19-004 创建 role_bindings 表**。归属：TS Backend。前置：Z19-003。执行：存成员与角色、scope、生效时间。验收：权限修改有记录。红线：不得角色变更后没有审计。
- [ ] **Z19-005 实现邀请占位模型**。归属：TS Backend。前置：Z19-004。执行：先定义 invite link / invite code 对象，不急于做完整邮件系统。验收：后续可扩展邀请流程。红线：不得当前阶段就绑死第三方邀请服务。
- [ ] **Z19-006 把 control mutation 接入权限校验**。归属：TS Backend。前置：Z19-005。执行：创建/关闭 pane、rename、share、device revoke 等都要经过角色校验。验收：没有权限的用户无法通过协议绕过 UI。红线：不得只在前端隐藏按钮。
- [ ] **Z19-007 把 approval resolve 接入权限校验**。归属：TS Backend。前置：Z19-006。执行：只有满足权限的角色才能批准高风险审批。验收：审批链条有真正约束。红线：不得任何登录用户都能审批。
- [ ] **Z19-008 实现 read-only topic share**。归属：TS Backend。前置：Z19-007。执行：对 topic 级分享定义 viewer-only 行为和限制。验收：团队内外都可安全围观特定话题。红线：不得 viewer 仍可写入评论之外的控制动作。
- [ ] **Z19-009 实现成员管理 UI**。归属：TS Frontend。前置：Z19-008。执行：桌面/Web 中可查看成员、角色、状态、移除与修改。验收：团队管理具备可操作界面。红线：不得只做只读列表。
- [ ] **Z19-010 实现基础 presence 模型**。归属：TS Backend。前置：Z19-009。执行：记录成员在线、离线、最近活跃、当前查看 topic/runtime。验收：团队可知道谁在看什么。红线：不得持续高频上传精确行为日志造成噪音。
- [ ] **Z19-011 实现 activity feed**。归属：TS Frontend。前置：Z19-010。执行：展示成员加入、角色变更、审批处理、run 启停、重要评论。验收：团队协作有总览入口。红线：不得把 feed 变成和 topic timeline 重复的噪音。
- [ ] **Z19-012 实现通知偏好设置**。归属：TS Frontend。前置：Z19-011。执行：成员可按 run、approval、mention、share、device 选择通知级别。验收：团队通知不会一刀切泛滥。红线：不得默认开启所有高频通知。
- [ ] **Z19-013 补齐 team mode 权限测试**。归属：QA。前置：Z19-012。执行：覆盖 viewer/editor/owner/reviewer 的控制、审批、评论、分享。验收：权限矩阵被自动验证。红线：不得只测 owner 路径。
- [ ] **Z19-014 加入 feature flag**。归属：TS Backend。前置：Z19-013。执行：默认个人用户可关闭 team mode 相关 UI 与 API。验收：个人体验不会被团队概念污染。红线：不得把 team mode 设为强制开。
- [ ] **Z19-015 写 `docs/TEAM_MODE.md`**。归属：Docs/Product。前置：Z19-014。执行：说明 team mode 的目标、边界、默认关闭原则和权限矩阵。验收：团队和个人用户都能理解这层是可选增强。红线：不得把 team mode 写成下一阶段唯一方向。
- [ ] **Z19-016 补一份数据隔离检查单**。归属：Security/Docs。前置：Z19-015。执行：列出 team mode 后哪些表和 API 需要 tenant/workspace 级隔离。验收：后续多人模式扩展不会遗漏隔离点。红线：不得等到功能做完才补隔离清单。

## Z20 Rust Sidecar 与 Zellij Bridge 研究线（16 项）

目标：保留 Rust 的长期价值，但只把它用于 sidecar、索引、桥接和未来性能路径，不与当前 Node 主路径争权。

阶段：Parallel / M5+

默认前置：Z10 协议稳定，Z07 存储与对象模型清晰

- [ ] **Z20-001 新增 `docs/RUST_SIDECAR_ROLE.md`**。归属：Rust/Docs。前置：Z10 协议稳定，Z07 存储与对象模型清晰。执行：明确 Rust 在新架构中的职责：sidecar、index、relay、native bridge，而非当前公开 runtime。验收：Rust 线的定位不再与 Node gateway 争抢主路径。红线：不得继续留下双主路径叙事。
- [ ] **Z20-002 建立 `apps/remuxd/` 最小工程**。归属：Rust。前置：Z20-001。执行：创建可编译的 remuxd 二进制，只输出版本与健康信息。验收：Rust sidecar 有真实可运行入口。红线：不得继续让旧 crate 模糊沉睡。
- [ ] **Z20-003 让 remuxd 读取 protocol version 文件**。归属：Rust。前置：Z20-002。执行：验证 Rust 与 TS 能共享同一协议版本源。验收：后续 sidecar 与 gateway 的兼容检查有基础。红线：不得各自维护不同版本常量。
- [ ] **Z20-004 让 remuxd 只读打开 SQLite**。归属：Rust。前置：Z20-003。执行：在不写业务的情况下验证 Rust 能安全读取本地控制面数据库。验收：未来索引与诊断可依赖同一库。红线：不得首版就对生产库随意写入。
- [ ] **Z20-005 写 Node ↔ Rust IPC ADR**。归属：Rust/TS/Docs。前置：Z20-004。执行：在 stdio、domain socket、TCP loopback 等方案中选一个推荐路线。验收：后续 sidecar 不再重复争论传输层。红线：不得只列优缺点不做拍板。
- [ ] **Z20-006 实现 sidecar 启动占位开关**。归属：TS Backend。前置：Z20-005。执行：gateway 可在 feature flag 打开时尝试拉起 remuxd 并读取健康状态。验收：Node 主流程不依赖 sidecar 也能照常运行。红线：不得让 sidecar 故障拖死当前公开路径。
- [ ] **Z20-007 在 diagnostics 暴露 sidecar 状态**。归属：TS Frontend/Backend。前置：Z20-006。执行：展示 remuxd 是否启动、版本、连接方式、最后错误。验收：研究线运行时可见、可诊断。红线：不得把 sidecar 状态藏在日志里。
- [ ] **Z20-008 新增 `docs/ZELLIJ_BRIDGE_SPEC.md`**。归属：Rust/Docs。前置：Z20-007。执行：定义未来 bridge 想拿到的事件、命令、性能目标与退出条件。验收：研究范围清晰。红线：不得把 bridge 写成“以后可能会有插件”。
- [ ] **Z20-009 盘点 Zellij plugin/event 需求矩阵**。归属：Rust/Product。前置：Z20-008。执行：列出 Remux 需要的 focus、pane/tab lifecycle、command completion、share token 等事件。验收：能判断 plugin API 够不够用。红线：不得没有需求清单就开始写插件。
- [ ] **Z20-010 做最小 Zellij plugin skeleton**。归属：Rust。前置：Z20-009。执行：创建最小可编译插件工程，只订阅基础事件并打印到宿主日志。验收：验证插件开发链路真实可用。红线：不得直接把实验插件接入生产逻辑。
- [ ] **Z20-011 建立 event name 对照表**。归属：Rust/TS。前置：Z20-010。执行：把 Zellij 事件名映射到 Remux 领域事件名。验收：未来 bridge 不会直接泄露底层事件到前端。红线：不得让前端消费原始 Zellij 事件命名。
- [ ] **Z20-012 定义 feature migration criteria**。归属：Product/Rust/TS。前置：Z20-011。执行：列出什么时候某能力应从 Node 移到 Rust，例如索引、桥接、性能瓶颈。验收：团队知道何时该演进，而不是凭感觉重写。红线：不得以“Rust 更快”作为唯一迁移理由。
- [ ] **Z20-013 补一份风险清单**。归属：Rust/Docs。前置：Z20-012。执行：记录 sidecar、bridge、plugin、Windows 支持、打包复杂度等风险。验收：研究工作可控。红线：不得把研究线包装成已定主线。
- [ ] **Z20-014 补 sidecar POC 测试**。归属：QA/Rust。前置：Z20-013。执行：验证启动、读取协议版本、读取数据库、与 Node 握手。验收：研究线不至于完全靠手工运行。红线：不得没有任何自动化验证。
- [ ] **Z20-015 标记旧 Rust crate 状态**。归属：Rust/Docs。前置：Z20-014。执行：给现有 crate 标注 dormant / reusable / archive / delete_candidate。验收：团队知道哪些可复用、哪些应封存。红线：不得让旧 crate 继续以“也许以后有用”悬着。
- [ ] **Z20-016 写 `docs/RUST_MIGRATION_TRIGGER.md`**。归属：Docs/Rust。前置：Z20-015。执行：定义如果未来真的切 Tauri/native sidecar，需要先满足哪些前提。验收：路线升级有客观触发条件。红线：不得模糊许诺“很快会原生化”。

## Z21 质量、发布、运维与开发者体验（16 项）

目标：建立真正可回归、可发布、可派发、可接手的工程系统，而不是仅靠 founder 记忆驱动。

阶段：全程

默认前置：贯穿全程，但需要跟随各 Epic 逐步落地

- [ ] **Z21-001 重写 e2e harness 基线**。归属：QA/DevEx。前置：贯穿全程，但需要跟随各 Epic 逐步落地。执行：删除与旧 runtime-v2 绑定的假设，建立 Zellij-era 的真实测试引导。验收：E2E 不再依赖旧 runtime 残留逻辑。红线：不得继续沿用错误基线只改几个变量。
- [ ] **Z21-002 建立 contract test 套件**。归属：QA/TS。前置：Z21-001。执行：用 shared schemas 驱动 control/inspect/device/topic/run/artifact 协议测试。验收：协议改动会自动触发回归。红线：不得把协议测试仅放在前端或后端单侧。
- [ ] **Z21-003 建立宽度与恢复专项套件**。归属：QA。前置：Z21-002。执行：持续覆盖首屏宽度、resize、reconnect、multi-client attach。验收：历史高风险问题有固定回归门。红线：不得把宽度问题留给发布后肉眼发现。
- [ ] **Z21-004 建立 inspect truth 套件**。归属：QA。前置：Z21-003。执行：覆盖 source/precision/staleness、cache、refetch、export。验收：Inspect 语义不被后续改动破坏。红线：不得只测内容字符串，不测元语义。
- [ ] **Z21-005 建立桌面 smoke 套件**。归属：QA/Desktop。前置：Z21-004。执行：覆盖启动、本地 gateway、托盘、深链接、通知。验收：桌面宿主有最低可发布质量线。红线：不得依赖纯手工回归。
- [ ] **Z21-006 建立 iOS smoke 套件**。归属：QA/iOS。前置：Z21-005。执行：覆盖扫码、配对、通知、审批、深链接。验收：iOS 每个构建都可快速冒烟。红线：不得只测模拟器不测真机。
- [ ] **Z21-007 建立 Android smoke 套件**。归属：QA/Android。前置：Z21-006。执行：覆盖扫码、配对、通知、审批、深链接、分享导入。验收：Android 每个构建都可快速冒烟。红线：不得只测单一安卓版本。
- [ ] **Z21-008 建立存储迁移回归**。归属：QA/TS。前置：Z21-007。执行：覆盖空库、旧库升级、损坏恢复、磁盘权限异常。验收：持久化层升级有保障。红线：不得在迁移失败时默默清库。
- [ ] **Z21-009 建立版本发布清单**。归属：DevEx。前置：Z21-008。执行：定义 Node package、desktop、iOS、Android 各自的版本节奏和依赖关系。验收：发布动作有明确顺序。红线：不得靠临时口头同步版本。
- [ ] **Z21-010 加入 changelog 模板**。归属：Docs/DevEx。前置：Z21-009。执行：按 Added/Changed/Fixed/Deprecated/Security 维护变更日志。验收：发布说明可读且结构化。红线：不得只依赖 Git 提交记录生成无上下文 changelog。
- [ ] **Z21-011 加入 issue 模板与 Epic 模板**。归属：DevEx。前置：Z21-010。执行：把最小执行单元模板、验收模板、红线模板固化到仓库。验收：后续派发任务能保持一致格式。红线：不得让 issue 再次退回一句话需求。
- [ ] **Z21-012 加入 milestone board 模板**。归属：DevEx。前置：Z21-011。执行：预设 M0-M5 的列、泳道、DoD。验收：团队执行不需要重新设计看板结构。红线：不得每个里程碑临时拼看板。
- [ ] **Z21-013 建立诊断页与日志导出**。归属：TS Fullstack。前置：Z21-012。执行：允许用户在 UI 内导出诊断包（去敏版）。验收：出现问题时能快速收集环境与日志。红线：不得导出敏感凭证。
- [ ] **Z21-014 固化贡献者 onboarding**。归属：Docs/DevEx。前置：Z21-013。执行：写清本地环境、Zellij 依赖、测试矩阵、文档索引、架构边界。验收：新开发者一天内可上手。红线：不得让新人靠口口相传补环境。
- [ ] **Z21-015 建立发布门禁**。归属：DevEx。前置：Z21-014。执行：把 typecheck、unit、contract、e2e、build、pack、smoke 组合成 gate。验收：未通过 gate 的构建无法被标记为 release candidate。红线：不得用人工豁免代替长期 gate。
- [ ] **Z21-016 写 `docs/MASTER_EXECUTION_RULES.md`**。归属：Docs/DevEx。前置：Z21-015。执行：把本计划的执行规则、Definition of Done、红线、优先级、复核方式固化。验收：这份计划可持续运转，而不是一次性交付品。红线：不得让执行规则散落在聊天记录里。

