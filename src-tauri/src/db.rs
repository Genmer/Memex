use rusqlite::{Connection, Result};
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
            priority INTEGER DEFAULT 10,
            extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            source_tool TEXT NOT NULL,
            local_path TEXT,
            prefix_template TEXT,
            tags TEXT,
            priority INTEGER DEFAULT 10,
            is_favorite BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        ",
    )?;

    // Add priority column if it doesn't exist (for migration)
    let _ = conn.execute("ALTER TABLE skills ADD COLUMN priority INTEGER DEFAULT 10", []);
    let _ = conn.execute("ALTER TABLE memories ADD COLUMN priority INTEGER DEFAULT 10", []);

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

    app.manage(DbState {
        db: Mutex::new(Some(conn)),
    });

    Ok(())
}
