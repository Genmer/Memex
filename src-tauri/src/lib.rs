pub mod db;
pub mod models;
pub mod scanner;

use db::DbState;
use models::{Config, Skill};
use rusqlite::params;
use std::env;
use tauri::State;
use tauri::{Emitter, Manager};

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
    let mut stmt = conn.prepare("SELECT id, name, source_tool, session_id, content, tags, priority, is_favorite, extracted_at, updated_at FROM memories ORDER BY priority DESC, extracted_at DESC").map_err(|e| e.to_string())?;

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
                is_favorite: row.get(7)?,
                extracted_at: row.get(8)?,
                updated_at: row.get(9)?,
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

/// Cross-platform: reveal a file in its file manager.
#[tauri::command]
fn open_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        // Fall back to opening the parent directory in the default file manager.
        if let Some(parent) = std::path::Path::new(&path).parent() {
            std::process::Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Cross-platform: open a file with its default application/editor.
#[tauri::command]
fn open_in_editor(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Toggle favorite for a memory.
#[tauri::command]
fn toggle_memory_favorite(state: State<'_, DbState>, memory_id: i64) -> Result<bool, String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();

    let current: bool = conn
        .query_row("SELECT is_favorite FROM memories WHERE id = ?1", params![memory_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let new_val = !current;
    conn.execute(
        "UPDATE memories SET is_favorite = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![new_val, memory_id],
    ).map_err(|e| e.to_string())?;

    Ok(new_val)
}

/// Directory where Memex-native created assets are persisted as Markdown files.
fn native_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("memex_native");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn sanitize_filename(name: &str) -> String {
    let mut out = String::new();
    for c in name.chars() {
        if c.is_alphanumeric() || c == '-' || c == '_' || c == ' ' {
            out.push(c);
        } else {
            out.push('_');
        }
    }
    if out.trim().is_empty() {
        "untitled".to_string()
    } else {
        out
    }
}

// ---- Skill CRUD ----

#[tauri::command]
fn create_skill(
    app: tauri::AppHandle,
    state: State<'_, DbState>,
    name: String,
    content: String,
    source_tool: Option<String>,
    tags: Option<String>,
) -> Result<i64, String> {
    let tool = source_tool.filter(|s| !s.trim().is_empty()).unwrap_or_else(|| "memex_native".to_string());
    let mut local_path = None;
    if tool == "memex_native" {
        let dir = native_dir(&app)?;
        let file = dir.join(format!("{}.md", sanitize_filename(&name)));
        std::fs::write(&file, &content).map_err(|e| e.to_string())?;
        local_path = Some(file.to_string_lossy().to_string());
    }
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    conn.execute(
        "INSERT INTO skills (name, content, source_tool, local_path, tags, priority) VALUES (?1, ?2, ?3, ?4, ?5, 50)",
        params![name, content, tool, local_path, tags],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_skill(
    app: tauri::AppHandle,
    state: State<'_, DbState>,
    id: i64,
    name: String,
    content: String,
    tags: Option<String>,
) -> Result<(), String> {
    let (source_tool, local_path): (String, Option<String>) = {
        let db = state.db.lock().unwrap();
        let conn = db.as_ref().unwrap();
        conn.query_row(
            "SELECT source_tool, local_path FROM skills WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?
    };

    // Persist Memex-native assets back to disk.
    if source_tool == "memex_native" {
        let dir = native_dir(&app)?;
        let file = local_path
            .as_ref()
            .filter(|p| !p.is_empty())
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| dir.join(format!("{}.md", sanitize_filename(&name))));
        std::fs::write(&file, &content).map_err(|e| e.to_string())?;
    }

    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    conn.execute(
        "UPDATE skills SET name = ?1, content = ?2, tags = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4",
        params![name, content, tags, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_skill(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    conn.execute("DELETE FROM skills WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn deploy_skill_to_target(
    state: State<'_, DbState>,
    skill_id: i64,
    target_tool: String,
) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();

    let (name, content, tags): (String, String, Option<String>) = conn
        .query_row(
            "SELECT name, content, tags FROM skills WHERE id = ?1",
            params![skill_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|e| format!("Skill not found: {}", e))?;

    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let clean_name = sanitize_filename(&name);

    let (target_file_path, formatted_content) = match target_tool.as_str() {
        "claude" => {
            let path = std::path::PathBuf::from(&home)
                .join(".claude")
                .join("skills")
                .join(&clean_name)
                .join("SKILL.md");
            let mut text = format!("---\nname: \"{}\"\n", name);
            if let Some(t) = tags {
                text.push_str(&format!("tags: \"{}\"\n", t));
            }
            text.push_str("---\n\n");
            text.push_str(&content);
            (path, text)
        }
        "agents" => {
            let path = std::path::PathBuf::from(&home)
                .join(".agents")
                .join("skills")
                .join(&clean_name)
                .join("SKILL.md");
            let mut text = format!("---\nname: \"{}\"\n", name);
            if let Some(t) = tags {
                text.push_str(&format!("description: \"{}\"\n", t));
            }
            text.push_str("---\n\n");
            text.push_str(&content);
            (path, text)
        }
        "zcode" => {
            let path = std::path::PathBuf::from(&home)
                .join(".gemini")
                .join("config")
                .join("plugins")
                .join(&clean_name)
                .join("skills")
                .join(&clean_name)
                .join("SKILL.md");
            let mut text = format!("---\nname: \"{}\"\n", name);
            if let Some(t) = tags {
                text.push_str(&format!("tags: \"{}\"\n", t));
            }
            text.push_str("---\n\n");
            text.push_str(&content);
            (path, text)
        }
        "cursor" => {
            let path = std::path::PathBuf::from(&home)
                .join(format!("{}.cursorrules", clean_name));
            (path, content)
        }
        _ => return Err(format!("Unsupported target tool: {}", target_tool)),
    };

    if let Some(parent) = target_file_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    std::fs::write(&target_file_path, formatted_content)
        .map_err(|e| format!("Failed to write skill file: {}", e))?;

    Ok(target_file_path.to_string_lossy().to_string())
}

// ---- Memory CRUD ----

#[tauri::command]
fn create_memory(
    state: State<'_, DbState>,
    name: String,
    content: String,
    source_tool: Option<String>,
    tags: Option<String>,
) -> Result<i64, String> {
    let tool = source_tool.filter(|s| !s.trim().is_empty()).unwrap_or_else(|| "memex_native".to_string());
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    conn.execute(
        "INSERT INTO memories (name, content, source_tool, tags, priority) VALUES (?1, ?2, ?3, ?4, 50)",
        params![name, content, tool, tags],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_memory(
    state: State<'_, DbState>,
    id: i64,
    name: String,
    content: String,
    tags: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    conn.execute(
        "UPDATE memories SET name = ?1, content = ?2, tags = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4",
        params![name, content, tags, id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_memory(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    conn.execute("DELETE FROM memories WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---- Batch Operations ----

#[tauri::command]
fn batch_toggle_favorite(
    state: State<'_, DbState>,
    ids: Vec<i64>,
    is_favorite: bool,
    asset_type: String,
) -> Result<usize, String> {
    if ids.is_empty() {
        return Ok(0);
    }
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    let table = if asset_type == "memory" { "memories" } else { "skills" };

    let mut count = 0;
    for id in ids {
        let sql = format!("UPDATE {} SET is_favorite = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", table);
        if let Ok(_) = conn.execute(&sql, params![is_favorite, id]) {
            count += 1;
        }
    }
    Ok(count)
}

#[tauri::command]
fn batch_add_tag(
    state: State<'_, DbState>,
    ids: Vec<i64>,
    tag: String,
    asset_type: String,
) -> Result<usize, String> {
    if ids.is_empty() || tag.trim().is_empty() {
        return Ok(0);
    }
    let clean_tag = tag.trim();
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    let table = if asset_type == "memory" { "memories" } else { "skills" };

    let mut count = 0;
    for id in ids {
        let query_sql = format!("SELECT tags FROM {} WHERE id = ?1", table);
        let existing_tags: Option<String> = conn
            .query_row(&query_sql, params![id], |row| row.get(0))
            .unwrap_or(None);

        let new_tags = match existing_tags {
            Some(curr) => {
                let tags_list: Vec<&str> = curr.split(',').map(|t| t.trim()).collect();
                if tags_list.contains(&clean_tag) {
                    curr
                } else {
                    format!("{}, {}", curr, clean_tag)
                }
            }
            None => clean_tag.to_string(),
        };

        let update_sql = format!("UPDATE {} SET tags = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", table);
        if let Ok(_) = conn.execute(&update_sql, params![new_tags, id]) {
            count += 1;
        }
    }
    Ok(count)
}

#[tauri::command]
fn batch_delete(
    state: State<'_, DbState>,
    ids: Vec<i64>,
    asset_type: String,
) -> Result<usize, String> {
    if ids.is_empty() {
        return Ok(0);
    }
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    let table = if asset_type == "memory" { "memories" } else { "skills" };

    let mut count = 0;
    for id in ids {
        let sql = format!("DELETE FROM {} WHERE id = ?1", table);
        if let Ok(_) = conn.execute(&sql, params![id]) {
            count += 1;
        }
    }
    Ok(count)
}

#[derive(serde::Serialize, Clone)]
pub struct ConflictReport {
    pub skill_name: String,
    pub count: usize,
    pub sources: Vec<String>,
    pub highest_priority: i32,
    pub winning_source: String,
    pub description: String,
}

#[tauri::command]
fn inspect_skill_conflicts(state: State<'_, DbState>) -> Result<Vec<ConflictReport>, String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();

    let mut stmt = conn
        .prepare("SELECT name, source_tool, priority FROM skills ORDER BY name, priority DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i32>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut map: std::collections::HashMap<String, Vec<(String, i32)>> = std::collections::HashMap::new();
    for r in rows {
        if let Ok((name, source, priority)) = r {
            map.entry(name).or_default().push((source, priority));
        }
    }

    let mut reports = Vec::new();
    for (name, mut list) in map {
        if list.len() > 1 {
            list.sort_by(|a, b| b.1.cmp(&a.1));
            let highest = list[0].1;
            let winning = list[0].0.clone();
            let sources: Vec<String> = list.iter().map(|(s, p)| format!("{} (优先级 {})", s, p)).collect();
            reports.push(ConflictReport {
                skill_name: name.clone(),
                count: list.len(),
                sources,
                highest_priority: highest,
                winning_source: winning.clone(),
                description: format!("同名技能在 {} 个来源中并存，当前由最高优先级 [{}] 生效覆盖。", list.len(), winning),
            });
        }
    }

    Ok(reports)
}

// ---- Export / Backup / Import ----

/// Serialize all skills + memories into a JSON archive at `path`.
#[tauri::command]
fn export_assets(state: State<'_, DbState>, path: String) -> Result<usize, String> {
    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();

    let mut skills = Vec::new();
    {
        let mut stmt = conn
            .prepare("SELECT name, content, source_tool, local_path, tags, priority, is_favorite FROM skills")
            .map_err(|e| e.to_string())?;
        let iter = stmt
            .query_map([], |row| {
                Ok(serde_json::json!({
                    "name": row.get::<_, String>(0)?,
                    "content": row.get::<_, String>(1)?,
                    "source_tool": row.get::<_, String>(2)?,
                    "local_path": row.get::<_, Option<String>>(3)?,
                    "tags": row.get::<_, Option<String>>(4)?,
                    "priority": row.get::<_, i32>(5)?,
                    "is_favorite": row.get::<_, bool>(6)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        for r in iter {
            skills.push(r.map_err(|e| e.to_string())?);
        }
    }

    let mut memories = Vec::new();
    {
        let mut stmt = conn
            .prepare("SELECT name, content, source_tool, tags, priority, is_favorite FROM memories")
            .map_err(|e| e.to_string())?;
        let iter = stmt
            .query_map([], |row| {
                Ok(serde_json::json!({
                    "name": row.get::<_, String>(0)?,
                    "content": row.get::<_, String>(1)?,
                    "source_tool": row.get::<_, String>(2)?,
                    "tags": row.get::<_, Option<String>>(3)?,
                    "priority": row.get::<_, i32>(4)?,
                    "is_favorite": row.get::<_, bool>(5)?,
                }))
            })
            .map_err(|e| e.to_string())?;
        for r in iter {
            memories.push(r.map_err(|e| e.to_string())?);
        }
    }

    let exported_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let archive = serde_json::json!({
        "app": "memex",
        "version": 1,
        "exported_at": exported_at,
        "skills": skills,
        "memories": memories
    });

    let json = serde_json::to_string_pretty(&archive).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;

    Ok(skills.len() + memories.len())
}

/// Read a JSON archive and upsert skills + memories into the database.
#[tauri::command]
fn import_assets(state: State<'_, DbState>, path: String) -> Result<usize, String> {
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let v: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    let db = state.db.lock().unwrap();
    let conn = db.as_ref().unwrap();
    let mut count = 0;

    if let Some(skills) = v["skills"].as_array() {
        for s in skills {
            let name = s["name"].as_str().unwrap_or("").to_string();
            if name.is_empty() {
                continue;
            }
            let content = s["content"].as_str().unwrap_or("").to_string();
            let source_tool = s["source_tool"].as_str().unwrap_or("memex_native").to_string();
            let local_path = s["local_path"].as_str().map(|x| x.to_string());
            let tags = s["tags"].as_str().map(|x| x.to_string());
            let priority = s["priority"].as_i64().unwrap_or(50) as i32;
            let is_favorite = s["is_favorite"].as_bool().unwrap_or(false);

            let exists: bool = conn
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM skills WHERE source_tool = ?1 AND name = ?2)",
                    params![source_tool, name],
                    |row| row.get(0),
                )
                .unwrap_or(false);

            if exists {
                conn.execute(
                    "UPDATE skills SET content = ?1, local_path = ?2, tags = ?3, priority = ?4, is_favorite = ?5, updated_at = CURRENT_TIMESTAMP WHERE source_tool = ?6 AND name = ?7",
                    params![content, local_path, tags, priority, is_favorite, source_tool, name],
                )
                .map_err(|e| e.to_string())?;
            } else {
                conn.execute(
                    "INSERT INTO skills (name, content, source_tool, local_path, tags, priority, is_favorite) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![name, content, source_tool, local_path, tags, priority, is_favorite],
                )
                .map_err(|e| e.to_string())?;
                count += 1;
            }
        }
    }

    if let Some(memories) = v["memories"].as_array() {
        for m in memories {
            let name = m["name"].as_str().unwrap_or("").to_string();
            if name.is_empty() {
                continue;
            }
            let content = m["content"].as_str().unwrap_or("").to_string();
            let source_tool = m["source_tool"].as_str().unwrap_or("memex_native").to_string();
            let tags = m["tags"].as_str().map(|x| x.to_string());
            let priority = m["priority"].as_i64().unwrap_or(50) as i32;
            let is_favorite = m["is_favorite"].as_bool().unwrap_or(false);

            let exists: bool = conn
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM memories WHERE source_tool = ?1 AND name = ?2)",
                    params![source_tool, name],
                    |row| row.get(0),
                )
                .unwrap_or(false);

            if exists {
                conn.execute(
                    "UPDATE memories SET content = ?1, tags = ?2, priority = ?3, is_favorite = ?4, updated_at = CURRENT_TIMESTAMP WHERE source_tool = ?5 AND name = ?6",
                    params![content, tags, priority, is_favorite, source_tool, name],
                )
                .map_err(|e| e.to_string())?;
            } else {
                conn.execute(
                    "INSERT INTO memories (name, content, source_tool, tags, priority, is_favorite) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![name, content, source_tool, tags, priority, is_favorite],
                )
                .map_err(|e| e.to_string())?;
                count += 1;
            }
        }
    }

    Ok(count)
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
            toggle_memory_favorite,
            create_skill,
            update_skill,
            delete_skill,
            deploy_skill_to_target,
            create_memory,
            update_memory,
            delete_memory,
            batch_toggle_favorite,
            batch_add_tag,
            batch_delete,
            inspect_skill_conflicts,
            export_assets,
            import_assets,
            open_in_finder,
            open_in_editor,
            chat_with_ai
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
