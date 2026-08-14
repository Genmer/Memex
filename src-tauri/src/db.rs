use rusqlite::{params, Connection, Result};
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DbState {
    pub db: Mutex<Option<Connection>>,
}

pub fn init_db(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_dir = app.path().app_data_dir().unwrap();
    fs::create_dir_all(&app_dir)?;
    let db_path = app_dir.join("memex.db");

    let conn = Connection::open(&db_path)?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key_name TEXT NOT NULL UNIQUE,
            key_value TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS scan_targets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            override_tool TEXT,
            priority INTEGER DEFAULT 10,
            is_enabled BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            source_tool TEXT NOT NULL,
            session_id TEXT,
            content TEXT NOT NULL,
            tags TEXT,
            summary_zh TEXT,
            category_zh TEXT,
            priority INTEGER DEFAULT 10,
            is_favorite BOOLEAN DEFAULT 0,
            extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            source_tool TEXT NOT NULL,
            local_path TEXT,
            prefix_template TEXT,
            tags TEXT,
            summary_zh TEXT,
            category_zh TEXT,
            tags_zh TEXT,
            priority INTEGER DEFAULT 10,
            is_favorite BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS category_syntheses (
            category_key TEXT PRIMARY KEY,
            category_name TEXT NOT NULL,
            total_skills INTEGER NOT NULL,
            overview_zh TEXT NOT NULL,
            core_capabilities TEXT NOT NULL,
            recommended_workflows TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS ai_usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type TEXT NOT NULL,
            target_name TEXT,
            model TEXT NOT NULL,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            duration_ms INTEGER DEFAULT 0,
            status TEXT DEFAULT 'success',
            error_message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS memos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            folder TEXT DEFAULT '默认备忘',
            note_type TEXT DEFAULT 'markdown',
            color TEXT DEFAULT 'default',
            tags TEXT,
            is_pinned BOOLEAN DEFAULT 0,
            is_favorite BOOLEAN DEFAULT 0,
            is_archived BOOLEAN DEFAULT 0,
            todo_total INTEGER DEFAULT 0,
            todo_completed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        ",
    )?;

    // Add priority column if it doesn't exist (for migration)
    let _ = conn.execute("ALTER TABLE skills ADD COLUMN priority INTEGER DEFAULT 10", []);
    let _ = conn.execute("ALTER TABLE memories ADD COLUMN priority INTEGER DEFAULT 10", []);
    // Personal memory management: enable favorites & timestamps on memories
    let _ = conn.execute("ALTER TABLE memories ADD COLUMN is_favorite BOOLEAN DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE memories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", []);

    // AI Semantic Enrichment columns for Chinese explanation, category & tags
    let _ = conn.execute("ALTER TABLE skills ADD COLUMN summary_zh TEXT", []);
    let _ = conn.execute("ALTER TABLE skills ADD COLUMN category_zh TEXT", []);
    let _ = conn.execute("ALTER TABLE skills ADD COLUMN tags_zh TEXT", []);
    let _ = conn.execute("ALTER TABLE memories ADD COLUMN summary_zh TEXT", []);
    let _ = conn.execute("ALTER TABLE memories ADD COLUMN category_zh TEXT", []);

    // Migrate old configs to scan_targets
    let _ = conn.execute(
        "INSERT OR IGNORE INTO scan_targets (path, override_tool, priority) 
         SELECT key_value, 'zcode', 50 FROM configs WHERE key_name = 'ZCODE_SKILL_PATH' AND key_value != ''",
        [],
    );
    let _ = conn.execute(
        "INSERT OR IGNORE INTO scan_targets (path, override_tool, priority) 
         SELECT key_value, 'claude', 50 FROM configs WHERE key_name = 'CLAUDE_SKILL_PATH' AND key_value != ''",
        [],
    );

    // Seed initial activity logs if table is completely empty
    let logs_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM ai_usage_logs", [], |row| row.get(0))
        .unwrap_or(0);

    if logs_count == 0 {
        let sample_logs = vec![
            ("skill_analysis", "chrome-devtools", "deepseek-v4-flash", 620, 240, 860, 1120, "datetime('now', '-10 minutes', 'localtime')"),
            ("skill_analysis", "a11y-debugging", "deepseek-v4-flash", 540, 190, 730, 980, "datetime('now', '-25 minutes', 'localtime')"),
            ("category_synthesis", "Claude Code 技能库", "deepseek-v4-flash", 2400, 680, 3080, 2450, "datetime('now', '-1 hours', 'localtime')"),
            ("batch_skill_analysis", "google-antigravity-sdk", "deepseek-v4-flash", 780, 310, 1090, 1340, "datetime('now', '-2 hours', 'localtime')"),
            ("ai_chat", "智能 Agent 架构选型咨询", "deepseek-v4-flash", 1200, 520, 1720, 1890, "datetime('now', '-3 hours', 'localtime')"),
            ("skill_analysis", "troubleshooting", "deepseek-v4-flash", 490, 180, 670, 870, "datetime('now', '-1 days', 'localtime')"),
            ("skill_analysis", "memory-leak-debugging", "deepseek-v4-flash", 820, 340, 1160, 1420, "datetime('now', '-1 days', 'localtime')"),
            ("skill_analysis", "debug-optimize-lcp", "deepseek-v4-flash", 610, 230, 840, 1020, "datetime('now', '-2 days', 'localtime')"),
            ("category_synthesis", "ZCode 技能库", "deepseek-v4-flash", 1950, 590, 2540, 2180, "datetime('now', '-3 days', 'localtime')"),
            ("skill_analysis", "agy-customizations", "deepseek-v4-flash", 890, 410, 1300, 1550, "datetime('now', '-4 days', 'localtime')"),
            ("ai_chat", "如何编写高质量 SKILL.md", "deepseek-v4-flash", 1450, 620, 2070, 2100, "datetime('now', '-5 days', 'localtime')"),
        ];

        for (action, target, model, prompt_t, compl_t, total_t, dur, time_expr) in sample_logs {
            let sql = format!(
                "INSERT INTO ai_usage_logs (action_type, target_name, model, prompt_tokens, completion_tokens, total_tokens, duration_ms, status, created_at) 
                 VALUES ('{}', '{}', '{}', {}, {}, {}, {}, 'success', {})",
                action, target, model, prompt_t, compl_t, total_t, dur, time_expr
            );
            let _ = conn.execute(&sql, []);
        }
    }

    // Seed initial memos if table is empty
    let memos_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM memos", [], |row| row.get(0))
        .unwrap_or(0);

    if memos_count == 0 {
        let sample_memos = vec![
            (
                "🚀 欢迎使用 Memex 备忘与开发日志",
                "# 欢迎来到个人独立备忘库\n\n在这里，你可以完全自由地记录：\n- 💡 **灵感与闪念**：随手记下架构设计想法\n- 🛠️ **开发排障备忘**：踩坑记录与快速指令\n- ✅ **任务代办清单**：支持 Markdown 勾选进度\n- 🏷️ **多色标签分类**：支持置顶、收藏与多种主题色彩\n\n点击右上角 `+ 新建备忘` 或随时按 `⌘N` 快速起草！",
                "使用指南",
                "markdown",
                "indigo",
                "置顶推荐,使用技巧",
                1,
                1,
                0,
                0
            ),
            (
                "⚡ 本地 Rust 与 Tauri 跨进程架构要点",
                "### 核心设计备忘\n1. **Tauri IPC Command** 保持异步与轻量，耗时操作一律使用 Tokio 或后台线程。\n2. **SQLite 本地锁机制**：使用 `Mutex<Option<Connection>>` 保证多线程与批处理一致性。\n3. **日志与持久化**：每次 AI 调用与画像自动落库，无需网络上报，百分百私密。\n\n```rust\n#[tauri::command]\nasync fn sync_vault() -> Result<(), String> {\n    // background sync\n    Ok(())\n}\n```",
                "架构设计",
                "markdown",
                "emerald",
                "Rust,Tauri,架构",
                1,
                0,
                0,
                0
            ),
            (
                "🎯 本周研发重点与待办任务",
                "- [x] 完成 SQLite 宏观分类画像持久化存储\n- [x] 完成大模型使用统计与 Token 消耗监控大盘\n- [ ] 开发日志与全功能高自由度备忘录模式\n- [ ] 备忘录标签聚合与全文混合快速检索\n- [ ] 导出 Markdown 与本地归档能力",
                "工作日志",
                "todo",
                "amber",
                "待办,周报,规划",
                0,
                1,
                5,
                2
            )
        ];

        for (title, content, folder, note_type, color, tags, is_pinned, is_fav, todo_tot, todo_comp) in sample_memos {
            let _ = conn.execute(
                "INSERT INTO memos (title, content, folder, note_type, color, tags, is_pinned, is_favorite, todo_total, todo_completed) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![title, content, folder, note_type, color, tags, is_pinned, is_fav, todo_tot, todo_comp],
            );
        }
    }

    app.manage(DbState {
        db: Mutex::new(Some(conn)),
    });

    Ok(())
}
