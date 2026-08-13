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

- **🚀 极速本地扫描**：由底层 Rust 引擎提供的高效并行扫描，支持自动探测常用的 AI 框架路径（`.trae-cn`, `.zcode`, `.claude`, `.agents` 等）。
- **🗂️ 动态目标管理器**：可随时在设置中添加/移除/停用特定的硬盘目录，支持针对未知目录自动打标。
- **🔄 同名技能覆写机制**：项目内的 `.zcode/skills` 会自动拥有比 `~/.agents/skills` 更高的读取优先级。
- **💬 AI 智能对话面板**：内置了与 DeepSeek V4 (或自定义模型) 对接的流式问答面板，支持通过特殊 Action 标签自动修复本地配置。
- **🎨 灵活视图切换**：提供清晰卡片模式（Grid）与高密度列表模式（List）无缝切换。

---

## 🛠️ 技术栈 (Tech Stack)

- **Frontend**: Vue 3 (Composition API), Vite, TailwindCSS
- **Backend (Desktop)**: Tauri, Rust, SQLite
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
   git clone <your-repo-url>
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

1. **配置 AI 助手**
   - 进入应用的【Settings】（左侧边栏底部的齿轮图标）。
   - 在底部输入你的 DeepSeek API Key（或其他兼容格式的 API Key）。
   - 填写要使用的模型名称（默认：`deepseek-v4-flash`）。

2. **管理扫描目标 (Scan Targets)**
   - 在【Settings】中，通过“扫描目标管理器”点击【添加路径】。
   - 选择你需要让 Memex 接管监控的文件夹。应用会自动赋予对应目录不同的优先级。
   - 默认自带常用的 `~/.agents/skills` 及 `~/.gemini/config` 的扫描规则。

3. **查看与同步**
   - 点击顶部右上角的 **[Sync]** 按钮，应用会调用 Rust 后端将所有 Markdown 沉淀迅速转化为本地数据库结构。
   - 在 Dashboard 或 Skills 面板中，即可使用搜索、收藏及复制（Copy with Prefix）功能。

---

## 📝 更新日志 (Changelog)

### v1.0.0-alpha
- **[Feature]** 完成基础 Tauri 框架搭建，集成 SQLite 数据持久化。
- **[Feature]** 实现 SkillCard 和 MemoryCard，采用极简 Glassmorphism 毛玻璃特效。
- **[UI/UX]** 新增网格 (Grid) 与列表 (List) 双重视图一键切换，自适应渲染。
- **[Core]** 构建了动态扫描目标管理器 (Scan Targets Manager)，放弃僵化的单例配置，升级为多路并发智能扫描。
- **[Core]** 引入基于优先级的同名技能覆写机制（解决跨级重复与冲突问题）。
- **[AI]** 搭建 AiChatPanel，支持通过大模型自动分析诊断环境错误，甚至通过大模型输出指令来热修复本地 `configs` 表。

---
*Built with passion for the Agentic AI Ecosystem.*
