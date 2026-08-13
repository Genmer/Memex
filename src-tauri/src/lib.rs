pub mod db;
pub mod models;
pub mod scanner;

use db::DbState;
use models::{Config, Skill};
use rusqlite::params;
use std::env;
use tauri::State;
use tauri::Emitter;

#[derive(serde::Serialize, Clone)]
pub struct ScanProgress {
    pub message: String,
    pub count: usize,
}

#[derive(serde::Serialize, Clone)]
pub struct AiStreamChunk {
    pub content: String,
    pub done: bool,
    pub error: Option<String>,
}

#[tauri::command]
async fn trigger_scan(app: tauri::AppHandle, state: State<'_, DbState>) -> Result<usize, String> {
    let mut total_added = 0;
    
    let mut targets = vec![];
    {
        let db = state.db.lock().unwrap();
        if let Some(conn) = db.as_ref() {
            if let Ok(mut stmt) = conn.prepare("SELECT path, override_tool, priority FROM scan_targets WHERE is_enabled = 1") {
                if let Ok(iter) = stmt.query_map([], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?,
                        row.get::<_, i32>(2)?,
                    ))
                }) {
                    for row in iter.filter_map(Result::ok) {
                        targets.push(row);
                    }
                }
            }
        }
    }

    if targets.is_empty() {
        let home = std::env::var("HOME").unwrap_or_default();
        targets.push((format!("{}/.gemini/config", home), Some("zcode".to_string()), 50));
        targets.push((format!("{}/.agents/skills", home), Some("agents".to_string()), 10));
        targets.push((format!("{}/.hermes/skills", home), Some("hermes".to_string()), 10));
        targets.push((format!("{}/.codebuddy", home), Some("codebuddy".to_string()), 10));
        targets.push((format!("{}/.claude/skills", home), Some("claude".to_string()), 10));
        targets.push((format!("{}/.trae-cn/memory", home), Some("trae".to_string()), 10));
    }

    for (path, override_tool, priority) in targets {
        let tool_ref = override_tool.as_deref();
        if let Ok(count) = scanner::scan_directory(&app, &state, &path, tool_ref, priority) {
            total_added += count;
        }
    }

    Ok(total_added)
}

#[tauri::command]
fn get_scan_targets(state: State<'_, DbState>) -> Result<Vec<models::ScanTarget>, String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, path, override_tool, priority, is_enabled, created_at FROM scan_targets ORDER BY created_at ASC")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(models::ScanTarget {
                id: row.get(0)?,
                path: row.get(1)?,
                override_tool: row.get(2)?,
                priority: row.get(3)?,
                is_enabled: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for item in iter {
        items.push(item.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

#[tauri::command]
fn add_scan_target(
    state: State<'_, DbState>,
    path: String,
    override_tool: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    conn.execute(
        "INSERT INTO scan_targets (path, override_tool, priority, is_enabled) VALUES (?1, ?2, 50, 1)",
        params![path, override_tool],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn toggle_scan_target(state: State<'_, DbState>, id: i64, is_enabled: bool) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    conn.execute(
        "UPDATE scan_targets SET is_enabled = ?1 WHERE id = ?2",
        params![is_enabled, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn remove_scan_target(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    conn.execute(
        "DELETE FROM scan_targets WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_configs(state: State<'_, DbState>) -> Result<Vec<Config>, String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, key_name, key_value, description, created_at, updated_at FROM configs")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(Config {
                id: row.get(0)?,
                key_name: row.get(1)?,
                key_value: row.get(2)?,
                description: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for item in iter {
        items.push(item.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

#[tauri::command]
fn save_config(
    state: State<'_, DbState>,
    key_name: String,
    key_value: String,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();

    let mut stmt = conn
        .prepare("SELECT id FROM configs WHERE key_name = ?1")
        .unwrap();
    let exists = stmt.exists(params![key_name]).unwrap_or(false);

    if exists {
        conn.execute(
            "UPDATE configs SET key_value = ?1, updated_at = CURRENT_TIMESTAMP WHERE key_name = ?2",
            params![key_value, key_name],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO configs (key_name, key_value) VALUES (?1, ?2)",
            params![key_name, key_value],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn get_skills(state: State<'_, DbState>) -> Result<Vec<Skill>, String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, content, source_tool, local_path, prefix_template, tags, priority, is_favorite, created_at, updated_at FROM skills ORDER BY priority DESC, updated_at DESC").map_err(|e| e.to_string())?;

    let skills_iter = stmt
        .query_map([], |row| {
            Ok(Skill {
                id: row.get(0)?,
                name: row.get(1)?,
                content: row.get(2)?,
                source_tool: row.get(3)?,
                local_path: row.get(4)?,
                prefix_template: row.get(5)?,
                tags: row.get(6)?,
                priority: row.get(7)?,
                is_favorite: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut skills = Vec::new();
    for skill in skills_iter {
        skills.push(skill.map_err(|e| e.to_string())?);
    }

    Ok(skills)
}

#[tauri::command]
fn get_memories(state: State<'_, DbState>) -> Result<Vec<models::Memory>, String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, source_tool, session_id, content, tags, priority, extracted_at FROM memories ORDER BY priority DESC, extracted_at DESC").map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| {
            Ok(models::Memory {
                id: row.get(0)?,
                name: row.get(1)?,
                source_tool: row.get(2)?,
                session_id: row.get(3)?,
                content: row.get(4)?,
                tags: row.get(5)?,
                priority: row.get(6)?,
                extracted_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for item in iter {
        items.push(item.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

#[derive(serde::Serialize)]
struct SourceStat {
    source_tool: String,
    count: i32,
}

#[derive(serde::Serialize)]
struct DashboardStats {
    total_skills: i32,
    total_memories: i32,
    sources: Vec<SourceStat>,
}

#[tauri::command]
fn get_stats(state: State<'_, DbState>) -> Result<DashboardStats, String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();

    let total_skills: i32 = conn
        .query_row("SELECT COUNT(*) FROM skills", [], |row| row.get(0))
        .unwrap_or(0);
    let total_memories: i32 = conn
        .query_row("SELECT COUNT(*) FROM memories", [], |row| row.get(0))
        .unwrap_or(0);

    let mut sources = Vec::new();
    {
        let mut stmt = conn
            .prepare("SELECT source_tool, COUNT(*) as cnt FROM skills GROUP BY source_tool ORDER BY cnt DESC")
            .map_err(|e| e.to_string())?;
        let iter = stmt
            .query_map([], |row| {
                Ok(SourceStat {
                    source_tool: row.get(0)?,
                    count: row.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?;
        for item in iter {
            sources.push(item.map_err(|e| e.to_string())?);
        }
    }

    Ok(DashboardStats {
        total_skills,
        total_memories,
        sources,
    })
}

#[tauri::command]
fn toggle_favorite(state: State<'_, DbState>, skill_id: i64) -> Result<bool, String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    
    let current: bool = conn
        .query_row("SELECT is_favorite FROM skills WHERE id = ?1", params![skill_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    
    let new_val = !current;
    conn.execute(
        "UPDATE skills SET is_favorite = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![new_val, skill_id],
    ).map_err(|e| e.to_string())?;
    
    Ok(new_val)
}

#[tauri::command]
fn update_skill_tags(state: State<'_, DbState>, skill_id: i64, tags: String) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    conn.execute(
        "UPDATE skills SET tags = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![tags, skill_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn open_in_finder(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .args(["-R", &path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn open_in_editor(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn chat_with_ai(
    app: tauri::AppHandle,
    state: State<'_, DbState>,
    message: String,
    context: String,
) -> Result<(), String> {
    // Read API key and model from configs
    let (api_key, model) = {
        let db = state.db.lock().unwrap();
        let conn = db.as_ref().unwrap();
        
        let key = conn.query_row(
            "SELECT key_value FROM configs WHERE key_name = ?1",
            params!["DEEPSEEK_API_KEY"],
            |row| row.get::<_, String>(0),
        ).unwrap_or_default();
        
        let mdl = conn.query_row(
            "SELECT key_value FROM configs WHERE key_name = ?1",
            params!["AI_MODEL"],
            |row| row.get::<_, String>(0),
        ).unwrap_or_else(|_| "deepseek-v4-flash".to_string());
        
        (key, mdl)
    };

    if api_key.is_empty() {
        let _ = app.emit("ai-stream-chunk", AiStreamChunk {
            content: String::new(),
            done: true,
            error: Some("未配置 API Key，请在设置页面配置 DeepSeek API Key".to_string()),
        });
        return Ok(());
    }

    // Read all configs for context
    let all_configs = {
        let db = state.db.lock().unwrap();
        let conn = db.as_ref().unwrap();
        let mut stmt = conn.prepare("SELECT key_name, key_value FROM configs").unwrap();
        let config_iter = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }).unwrap();
        let mut configs_map = serde_json::Map::new();
        for config in config_iter {
            if let Ok((k, v)) = config {
                if k != "DEEPSEEK_API_KEY" { // Mask API key
                    configs_map.insert(k, serde_json::Value::String(v));
                }
            }
        }
        serde_json::Value::Object(configs_map).to_string()
    };

    // Build system prompt with context
    let system_prompt = format!(
        "你是 Memex 桌面应用的 AI 智能助手。你的目标是帮助用户管理 Agent 技能资产并排查问题。
当前操作系统: MacOS
当前应用的配置状态: {}

重要规范：
1. 请用中文友好回答。
2. 【核心排障逻辑】如果用户反映“记忆库为空”或“技能库为空”，最常见的原因都是**配置的根扫描路径不对**。请注意：在 Memex 中，Zcode 和 Claude 的记忆库与其技能库是**共用同一个配置项**的（即 ZCODE_SKILL_PATH 和 CLAUDE_SKILL_PATH 其实是根目录配置）。
   - zcode 默认根目录通常在 `~/.gemini/config`。
   - Claude Code 默认根目录在 `~/.claude/skills` 或 `~/.agents/skills` 等。
   - 如果用户问记忆库为空，你提议修改 SKILL_PATH 时，请务必向用户解释清楚：这其实是配置根目录，配好后记忆库也会一并被扫描到。
3. [核心能力] 如果你发现用户需要修改某个配置（例如修改 ZCODE_SKILL_PATH、CLAUDE_SKILL_PATH），你**必须**输出特殊的指令，前端会自动渲染为操作按钮。
格式严格要求（必须单独一行，使用 <<<ACTION: 和 >>> 包裹 JSON）：
<<<ACTION:{{\"type\":\"SET_CONFIG\",\"key\":\"ZCODE_SKILL_PATH\",\"value\":\"/Users/genmer/.gemini/config\"}}>>>

附加的用户技能库上下文：
{}",
        all_configs,
        if context.is_empty() { "无" } else { &context }
    );

    let body = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": message }
        ],
        "stream": true
    });

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.deepseek.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .timeout(std::time::Duration::from_secs(60))
        .json(&body)
        .send()
        .await;

    let resp = match response {
        Ok(r) => r,
        Err(e) => {
            let _ = app.emit("ai-stream-chunk", AiStreamChunk {
                content: String::new(),
                done: true,
                error: Some(format!("网络请求失败: {}", e)),
            });
            return Ok(());
        }
    };

    if !resp.status().is_success() {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_default();
        let _ = app.emit("ai-stream-chunk", AiStreamChunk {
            content: String::new(),
            done: true,
            error: Some(format!("API 错误 ({}): {}", status, body_text)),
        });
        return Ok(());
    }

    // Stream SSE response
    use futures_util::StreamExt;
    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => {
                buffer.push_str(&String::from_utf8_lossy(&bytes));
                
                // Process complete SSE lines
                while let Some(line_end) = buffer.find('\n') {
                    let line = buffer[..line_end].trim().to_string();
                    buffer = buffer[line_end + 1..].to_string();
                    
                    if line.is_empty() || line.starts_with(':') {
                        continue;
                    }
                    
                    if let Some(data) = line.strip_prefix("data: ") {
                        if data.trim() == "[DONE]" {
                            let _ = app.emit("ai-stream-chunk", AiStreamChunk {
                                content: String::new(),
                                done: true,
                                error: None,
                            });
                            return Ok(());
                        }
                        
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                                if !content.is_empty() {
                                    let _ = app.emit("ai-stream-chunk", AiStreamChunk {
                                        content: content.to_string(),
                                        done: false,
                                        error: None,
                                    });
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                let _ = app.emit("ai-stream-chunk", AiStreamChunk {
                    content: String::new(),
                    done: true,
                    error: Some(format!("流式读取失败: {}", e)),
                });
                return Ok(());
            }
        }
    }

    // Stream ended without [DONE]
    let _ = app.emit("ai-stream-chunk", AiStreamChunk {
        content: String::new(),
        done: true,
        error: None,
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            db::init_db(app.handle()).expect("Failed to initialize database");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_skills,
            get_memories,
            get_stats,
            trigger_scan,
            get_scan_targets,
            add_scan_target,
            toggle_scan_target,
            remove_scan_target,
            get_configs,
            save_config,
            toggle_favorite,
            update_skill_tags,
            open_in_finder,
            open_in_editor,
            chat_with_ai
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
