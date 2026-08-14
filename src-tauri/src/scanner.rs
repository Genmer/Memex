use crate::db::DbState;
use rusqlite::params;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;
use tauri::Emitter;

pub fn scan_directory(app: &tauri::AppHandle, db: &DbState, dir_path: &str, override_tool: Option<&str>, base_priority: i32) -> Result<usize, String> {
    let path = Path::new(dir_path);
    if !path.exists() {
        return Ok(0);
    }

    let mut count = 0;

    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("md") {
            let local_path = path.to_string_lossy().to_string();

            // Emit progress event
            let _ = app.emit("scan-progress", crate::ScanProgress {
                message: format!("Scanning: {}", path.file_name().unwrap_or_default().to_string_lossy()),
                count,
            });

            // Probe tool and priority
            let mut detected_tool = "unknown".to_string();
            let mut priority = base_priority;
            let mut is_memory = false;
            let mut is_skill = false;

            if local_path.contains("/.trae-cn/memory/") || local_path.contains("\\.trae-cn\\memory\\") {
                detected_tool = "trae".to_string();
                priority = 90;
                is_memory = true;
            } else if local_path.contains("/.zcode/") || local_path.contains("\\.zcode\\") {
                detected_tool = "zcode".to_string();
                if local_path.contains("/.zcode/skills") || local_path.contains("\\.zcode\\skills") {
                    is_skill = true;
                    priority = if local_path.contains("/Users/") && !local_path.contains("/.zcode/cli/") { 100 } else { 50 };
                } else if local_path.contains("/memories/") || local_path.contains("\\memories\\") {
                    is_memory = true;
                    priority = 50;
                }
            } else if local_path.contains("/.agents/skills/") || local_path.contains("\\.agents\\skills\\") {
                detected_tool = "agents".to_string();
                is_skill = true;
                priority = 80;
            } else if local_path.contains("/.claude/") || local_path.contains("\\.claude\\") {
                detected_tool = "claude".to_string();
                is_skill = true;
                priority = 50;
            } else {
                is_memory = local_path.contains("/memories/") || local_path.contains("\\memories\\");
                is_skill = local_path.ends_with("SKILL.md") || local_path.contains("/skills/") || local_path.contains("\\skills\\");
            }

            if !is_memory && !is_skill {
                continue; // Skip irrelevant markdown files
            }

            let source_tool = override_tool.unwrap_or(&detected_tool).to_string();

            if let Ok(content) = fs::read_to_string(path) {
                let mut name = path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let mut clean_content = content.clone();
                let mut prefix_template = None;
                let mut tags: Option<String> = None;

                if content.starts_with("---\n") {
                    if let Some(end_idx) = content[4..].find("---\n") {
                        let frontmatter = &content[4..end_idx + 4];
                        for line in frontmatter.lines() {
                            let line = line.trim();
                            if line.starts_with("name:") {
                                name = line
                                    .replace("name:", "")
                                    .trim()
                                    .trim_matches('"')
                                    .trim_matches('\'')
                                    .to_string();
                            } else if line.starts_with("tags:") {
                                tags = Some(
                                    line.replace("tags:", "")
                                        .trim()
                                        .trim_matches('"')
                                        .trim_matches('\'')
                                        .to_string(),
                                );
                            } else if line.starts_with("description:") && tags.is_none() {
                                // Fallback: use description as tags if tags missing
                                tags = Some(
                                    line.replace("description:", "")
                                        .trim()
                                        .trim_matches('"')
                                        .trim_matches('\'')
                                        .to_string(),
                                );
                            }
                        }
                        clean_content = content[end_idx + 8..].trim().to_string();
                    }
                }

                if is_memory {
                    if local_path.contains("/projects/") || local_path.contains("\\projects\\") {
                        let sep = if local_path.contains("/projects/") { "/projects/" } else { "\\projects\\" };
                        if let Some(pos) = local_path.find(sep) {
                            let sub = &local_path[pos + sep.len()..];
                            let parts: Vec<&str> = sub.split(|c| c == '/' || c == '\\').collect();
                            if parts.len() > 1 {
                                let project_folder = parts[0];
                                let mut proj_clean = project_folder.to_string();
                                if let Some(last_dash) = proj_clean.rfind('-') {
                                    if proj_clean.len() - last_dash > 15 {
                                        proj_clean = proj_clean[..last_dash].to_string();
                                    }
                                }
                                if let Some(last_slash) = proj_clean.rfind('-') {
                                    proj_clean = proj_clean[last_slash + 1..].to_string();
                                }
                                
                                let file_info = parts[1..].join("/");
                                name = format!("{} / {}", proj_clean, file_info);
                                
                                let proj_tag = format!("project:{}", proj_clean);
                                tags = match tags {
                                    Some(t) => Some(format!("{}, {}", t, proj_tag)),
                                    None => Some(proj_tag),
                                };
                            }
                        }
                    } else if local_path.contains("user_profile.md") {
                        name = "Global User Profile (全域偏好)".to_string();
                        tags = match tags {
                            Some(t) => Some(format!("{}, global-profile", t)),
                            None => Some("global-profile".to_string()),
                        };
                    }
                }

                if source_tool == "zcode" {
                    prefix_template = Some("请严格遵守以下 Skill 规范回答：".to_string());
                } else if source_tool == "claude" {
                    prefix_template = Some("Use the following template/skill:".to_string());
                }

                let db_lock = db.db.lock().unwrap();
                if let Some(conn) = db_lock.as_ref() {
                    if is_memory {
                        let mut stmt = conn
                            .prepare("SELECT id, priority FROM memories WHERE source_tool = ?1 AND name = ?2")
                            .unwrap();
                        
                        let mut exists = false;
                        let mut existing_priority = 0;
                        if let Ok(mut iter) = stmt.query(params![source_tool, name]) {
                            if let Ok(Some(row)) = iter.next() {
                                exists = true;
                                existing_priority = row.get(1).unwrap_or(0);
                            }
                        }

                        if exists {
                            if priority >= existing_priority {
                                let _ = conn.execute(
                                    "UPDATE memories SET content = ?1, tags = ?2, priority = ?3, extracted_at = CURRENT_TIMESTAMP WHERE source_tool = ?4 AND name = ?5",
                                    params![clean_content, tags, priority, source_tool, name],
                                );
                            }
                        } else {
                            let _ = conn.execute(
                                "INSERT INTO memories (name, content, source_tool, tags, priority) VALUES (?1, ?2, ?3, ?4, ?5)",
                                params![name, clean_content, source_tool, tags, priority],
                            );
                            count += 1;
                        }
                    } else {
                        let mut stmt = conn
                            .prepare("SELECT id, priority FROM skills WHERE local_path = ?1")
                            .unwrap();
                        
                        let mut exists = false;
                        let mut existing_priority = 0;
                        if let Ok(mut iter) = stmt.query(params![local_path]) {
                            if let Ok(Some(row)) = iter.next() {
                                exists = true;
                                existing_priority = row.get(1).unwrap_or(0);
                            }
                        }

                        if exists {
                            if priority >= existing_priority {
                                let _ = conn.execute(
                                    "UPDATE skills SET name = ?1, content = ?2, source_tool = ?3, prefix_template = ?4, tags = ?5, priority = ?6, updated_at = CURRENT_TIMESTAMP WHERE local_path = ?7",
                                    params![name, clean_content, source_tool, prefix_template, tags, priority, local_path],
                                );
                            }
                        } else {
                            // Before inserting a new skill, check if another skill with the same name exists but lower priority
                            let mut stmt_name = conn.prepare("SELECT id, priority FROM skills WHERE name = ?1").unwrap();
                            let mut lower_priority_id = None;
                            
                            if let Ok(mut iter) = stmt_name.query(params![name]) {
                                if let Ok(Some(row)) = iter.next() {
                                    let old_priority: i32 = row.get(1).unwrap_or(0);
                                    if priority >= old_priority {
                                        lower_priority_id = Some(row.get::<_, i64>(0).unwrap());
                                    } else {
                                        // A higher priority skill already exists with the same name, we skip this one
                                        continue;
                                    }
                                }
                            }
                            
                            if let Some(id) = lower_priority_id {
                                // Update existing row to new local path (overwrite)
                                let _ = conn.execute(
                                    "UPDATE skills SET content = ?1, source_tool = ?2, local_path = ?3, prefix_template = ?4, tags = ?5, priority = ?6, updated_at = CURRENT_TIMESTAMP WHERE id = ?7",
                                    params![clean_content, source_tool, local_path, prefix_template, tags, priority, id],
                                );
                            } else {
                                let _ = conn.execute(
                                    "INSERT INTO skills (name, content, source_tool, local_path, prefix_template, tags, priority) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                                    params![name, clean_content, source_tool, local_path, prefix_template, tags, priority],
                                );
                                count += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(count)
}
