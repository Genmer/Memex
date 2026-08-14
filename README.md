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

1. **快捷键与命令面板**
   - 按下 `⌘K` (Mac) 或 `Ctrl+K` (Windows/Linux) 随时打开全局命令面板。
   - 输入关键词快速模糊检索技能，或者使用上下方向键导航并按回车直接打开详情抽屉或执行操作。

2. **配置 AI 助手**
   - 进入应用的【设置】（左侧边栏底部的齿轮图标）。
   - 在底部输入你的 DeepSeek API Key（或其他兼容格式的 API Key）。
   - 填写要使用的模型名称（默认：`deepseek-chat` 或 `deepseek-reasoner`）。

3. **管理扫描目标 (Scan Targets)**
   - 在【设置】中，通过“扫描目标管理器”点击【添加路径】。
   - 选择你需要让 Memex 接管监控的文件夹。应用会自动赋予对应目录不同的优先级。
   - 默认自带常用的 `~/.agents/skills` 及 `~/.gemini/config` 的扫描规则。

4. **查看与同步**
   - 点击顶部右上角的 **[扫描本地数据]** 按钮，应用会调用 Rust 后端将所有 Markdown 沉淀迅速转化为本地数据库结构。
   - 在 Dashboard 或 Skills 面板中，即可使用搜索、收藏及复制（Copy with Prefix）功能。

---

## 📝 更新日志 (Changelog)

### v1.3.0 (Latest)
- **[AI] 🤖 英文技能 AI 通俗中文释义与分类提炼**：针对大量纯英文、冗长复杂的 Prompt 技能，引入 DeepSeek 驱动的语义理解引擎，自动提炼一针见血、通俗易懂的中文一句话用途（25-45字）、精准中文分类（如：代码架构、调试排错、测试部署等）与中文技术标签。
- **[UI/UX] 悬浮即现与卡片胶囊**：在单行列表视图和网格卡片视图中，直观呈现 AI 中文分类胶囊与释义；鼠标悬浮即时显示完整用途解释；支持在详情抽屉中一键重新解析或手动编辑。
- **[Batch] ⚡ 批量 AI 语义提炼**：在批量操作模式下一键批量并发解析多项技能，全自动入库 SQLite 持久化并融合进全局搜索索引。
- **[Search] 🔍 中文反向检索英文技能**：搜索框与 ⌘K 命令面板全面支持通过 AI 提炼的中文用途和分类进行极速模糊匹配，用中文即可瞬间定位纯英文技能。

### v1.2.0
- **[Theme]** 全新支持**浅色模式 (Light ☀️)、深色模式 (Dark 🌙) 与跟随系统 (Auto 💻)** 三档主题一键切换，完美适配 macOS 浅色与深邃 Midnight 空间美学。
- **[Performance]** 突破性性能重构：引入 `content-visibility: auto` 与硬件加速，优化超大列表分批流式挂载（消除百项 DOM 瞬间初始化冻结），移除重复卡片的高开销 GPU backdrop-filter，标签切换与滚动帧率稳定在 60 FPS！
- **[Markdown]** 集成全新的 GFM Markdown 渲染引擎，支持深浅双主题代码语法高亮与一键复制代码块。

### v1.1.0
- **[Feature]** 新增 **⌘K 全局命令面板 (Command Palette / Omnibar)**，支持模糊搜索、动作直达与纯键盘流畅操作。
- **[Feature]** 列表视图全新升级为**单行紧凑数据表格流 (Single-Row Data Table)**，信息密度提升 300%，彻底消除文字重叠。
- **[Feature]** 记忆库支持**按项目聚类视图 (Project Clustered View)**，自动解析 Trae / ZCode 工程哈希目录为真实项目名。
- **[Feature]** 新增**资产批量管理模式 (Batch Operations)**，支持多选、批量收藏、批量追加标签与批量删除。
- **[Feature]** Dashboard 新增**多源技能覆写与冲突健康诊断看板**，实时洞悉同名 Skill 胜出优先级。
- **[Core]** 优化标签解析与清洗引擎，彻底过滤多行 YAML 块标记（`>`、`|`）脏数据，支持全局跨源智能跳转。

### v1.0.0-alpha
- **[Feature]** 完成基础 Tauri 框架搭建，集成 SQLite 数据持久化。
- **[Feature]** 实现 SkillCard 和 MemoryCard，采用极简 Glassmorphism 毛玻璃特效。
- **[UI/UX]** 新增网格 (Grid) 与列表 (List) 双重视图一键切换，自适应渲染。
- **[Core]** 构建了动态扫描目标管理器 (Scan Targets Manager)，放弃僵化的单例配置，升级为多路并发智能扫描。
- **[Core]** 引入基于优先级的同名技能覆写机制（解决跨级重复与冲突问题）。
- **[AI]** 搭建 AiChatPanel，支持通过大模型自动分析诊断环境错误，甚至通过大模型输出指令来热修复本地 `configs` 表。

---
*Built with passion for the Agentic AI Ecosystem.*
