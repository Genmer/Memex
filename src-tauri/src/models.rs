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
    pub summary_zh: Option<String>,
    pub category_zh: Option<String>,
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
    pub summary_zh: Option<String>,
    pub category_zh: Option<String>,
    pub tags_zh: Option<String>,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SkillAiAnalysisResult {
    pub skill_id: i64,
    pub summary_zh: String,
    pub category_zh: String,
    pub tags_zh: Vec<String>,
    pub merged_tags: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategorySynthesisResult {
    pub category_key: String,
    pub category_name: String,
    pub total_skills: usize,
    pub overview_zh: String,
    pub core_capabilities: Vec<String>,
    pub recommended_workflows: Vec<String>,
    pub updated_at: Option<String>,
}
