use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub id: i64,
    pub key_name: String,
    pub key_value: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Memory {
    pub id: i64,
    pub name: String,
    pub source_tool: String,
    pub session_id: Option<String>,
    pub content: String,
    pub tags: Option<String>,
    pub priority: i32,
    pub is_favorite: bool,
    pub extracted_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Skill {
    pub id: i64,
    pub name: String,
    pub content: String,
    pub source_tool: String,
    pub local_path: Option<String>,
    pub prefix_template: Option<String>,
    pub tags: Option<String>,
    pub priority: i32,
    pub is_favorite: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanTarget {
    pub id: i64,
    pub path: String,
    pub override_tool: Option<String>,
    pub priority: i32,
    pub is_enabled: bool,
    pub created_at: String,
}
