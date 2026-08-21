# Memex 🧠

**Memex** 是一款由 Tauri + Vue 3 驱动的跨平台桌面应用，专为 AI 时代的开发者打造的**“大模型记忆与技能管理中枢”**。它能够自动跨越不同的项目目录和 AI 工具集（如 Claude、Zcode、Trae 等），一键归集所有的 Agent Skills 和交互 Memories。

---

## 🌟 核心思想 (Philosophy)
随着大模型 Agent 工具链的繁荣，开发者的机器上散落着大量不同工具产生的 `SKILL.md`（技能指令）和 `MEMORY.md`（对话记忆）。
Memex 的诞生正是为了解决这些“记忆孤岛”。

- **统一枢纽 (Hub)**：不再需要去十几个不同的隐藏文件夹里翻找 AI 生成的上下文，Memex 将它们可视化并结构化呈现。
- **层级优先级 (Cascade Overrides)**：精准识别全局配置（Global）与项目配置（Project-Level），当产生同名指令冲突时，完美实现高优先级项目对全局指令的覆写。
- **美学体验 (Aesthetics)**：基于 TailwindCSS 打造极致的 Glassmorphism（毛玻璃透明）质感，全流程微动效，享受整理思维碎片的乐趣。

---

## ✨ 核心特性 (Features)

- **☁️ GitLite 云端/本地多端同步引擎**：零服务器成本与运维负担，默认以 GitLite 作为主存储与全库同步基座，全站备忘录、技能指令、项目记忆、配置与扫描路径实时双向同步。
- **🔐 网页授权一键登录 (免 Token · 自动建仓)**：支持国内免翻 **Gitee 码云**官方 OAuth 授权与 **GitHub** Device Flow，点击「同意授权」后全自动创建私有数据库仓库并挂载。
- **⚡ 智能回调与双向唤醒闭环**：macOS 原生 TCP 监听 `18365` 端口秒级自动捕获授权回调；网页端提供「📋 点击复制授权码」与「🚀 直接跳转唤醒客户端」双保险；客户端支持剪贴板智能一键注入。
- **🔄 主动/手动双向秒级同步 (Pull & Push)**：在顶部状态胶囊或管理弹窗中随时一键发起双向同步，主动拉取云端分支更新并推送本地修改。
- **🚀 极速本地扫描**：由底层 Rust 引擎提供的高效并行扫描，支持自动探测常用的 AI 框架路径（`.trae-cn`, `.zcode`, `.claude`, `.agents` 等）。
- **⌨️ 快捷键命令面板 (⌘K Omnibar)**：随时按下 `⌘K` 或 `Ctrl+K` 唤起浮动命令面板，支持模糊搜索 Skills / Memories 以及一键执行扫描、新建、备份等全局指令。
- **📊 核心大盘与多源冲突诊断**：统计全库多工具资产分布（Donut Chart），并实时诊断同名技能在不同框架下的优先级覆写与冲突胜出者。
- **🗂️ 记忆按工程聚类 (Clustered View)**：智能解析 Trae-CN、ZCode 等多级工程记忆路径，按项目/主题折叠归拢，条理清晰。
- **⚡ 资产批量管理 (Batch Operations)**：支持批量选择、一键批量收藏、批量打标签及批量清理删除。
- **🗂️ 动态目标管理器**：可随时在设置中添加/移除/停用特定的硬盘目录，支持针对未知目录自动打标。
- **💬 AI 智能对话面板**：内置了与 DeepSeek V4 (或自定义模型) 对接的流式问答面板，支持通过特殊 Action 标签自动修复本地配置。
- **🎨 灵活视图切换**：提供全景卡片模式（Grid）与极简高密度单行数据流列表模式（List）无缝切换。

---

## 🛠️ 技术栈 (Tech Stack)

- **Frontend**: Vue 3 (Composition API), Vite, TailwindCSS
- **Storage & Sync Engine**: GitLite (Git-backed serverless database), SQLite (Local Cache)
- **Backend (Desktop)**: Tauri v2, Rust
- **Icons**: Lucide Vue Next
- **LLM Integration**: Reqwest (Rust HTTP Client for OpenAI-compatible endpoints)

---

## 🚀 快速上手 (Getting Started)

### 环境要求
- Node.js (v18+)
- pnpm
- Rust 基础环境 (Cargo, rustc)

### 安装与运行
1. **克隆项目**
   ```bash
   git clone https://github.com/Genmer/Memex.git
   cd Memex
   ```

2. **安装前端依赖**
   ```bash
   pnpm install
   ```

3. **启动开发环境**
   ```bash
   pnpm tauri dev
   ```

4. **构建生产版本**
   ```bash
   pnpm tauri build
   ```

---

## 📖 使用指南 (Usage)

1. **GitLite 云端数据库同步**
   - 点击顶部状态栏的 **GitLite 云端数据库胶囊**。
   - 点击 **「登录 Gitee 码云账号」**（国内免翻，极速秒连）或 GitHub。
   - 系统将自动打开系统默认浏览器，在授权页点击「同意授权」后即可自动完成私有仓库创建与连接挂载。
   - 可随时点击 **「⚡ 立即主动同步云端」** 进行双向拉取与推送。

2. **快捷键与命令面板**
   - 按下 `⌘K` (Mac) 或 `Ctrl+K` (Windows/Linux) 随时打开全局命令面板。
   - 输入关键词快速模糊检索技能，或者使用上下方向键导航并按回车直接打开详情抽屉或执行操作。

3. **配置 AI 助手**
   - 进入应用的【设置】（左侧边栏底部的齿轮图标）。
   - 在底部输入你的 DeepSeek API Key（或其他兼容格式的 API Key）。
   - 填写要使用的模型名称（默认：`deepseek-chat` 或 `deepseek-reasoner`）。

4. **管理扫描目标 (Scan Targets)**
   - 在【设置】中，通过“扫描目标管理器”点击【添加路径】。
   - 选择你需要让 Memex 接管监控的文件夹。应用会自动赋予对应目录不同的优先级。
   - 默认自带常用的 `~/.agents/skills` 及 `~/.gemini/config` 的扫描规则。

---

## 📝 更新日志 (Changelog)

### v1.0.2 (Latest)
- **[GitLite] ☁️ 全面接入 GitLite 作为默认主存储引擎**：备忘录、技能、工程记忆、AI 配置与扫描路径默认直连 GitLite，实现无服务器多端云同步。
- **[OAuth] 🔐 Gitee 官方应用一键授权集成**：官方授权应用名称统一为 `gitlite`，支持国内免翻极速秒连与自动建仓。
- **[Desktop] ⚡ 原生浏览器唤起与 TCP 回调**：修复 macOS 原生桌面环境下外部浏览器唤起与 18365 端口 TCP 回调捕获。
- **[Sync] 🔄 主动/手动双向同步**：新增显式主动同步按钮（Pull & Push），支持毫秒级冲突解决与增量提交。
- **[UI/UX] 🌟 授权成功页交互闭环**：授权成功页新增「一键复制授权码」与「直接跳转唤醒客户端」双保险；客户端弹窗支持剪贴板智能一键自动注入。
- **[Design] 🍞 全站 Toast 统一**：全面移除浏览器原生阻塞式 `alert()`，接入非阻塞毛玻璃 Toast 提示。

### v1.0.1
- **[Core]** 优化 SQLite 向 GitLite 首次启动无损平滑迁移机制。
- **[Fix]** 修复 Gitee OAuth 授权参数与回调兼容性。

### v1.0.0
- **[Feature]** 完成基础 Tauri 框架搭建与资产可视化中枢。
- **[Feature]** 实现 SkillCard 和 MemoryCard 极简 Glassmorphism 毛玻璃特效。
- **[AI]** 搭建 AiChatPanel，支持通过大模型自动分析诊断环境错误。

---
*Built with passion for the Agentic AI Ecosystem.*

