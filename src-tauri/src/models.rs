use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Config {
    pub id: i64,
    pub key_name: String,
    pub key_value: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiUsageLog {
    pub id: i64,
    pub action_type: String,
    pub target_name: Option<String>,
    pub model: String,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub total_tokens: i64,
    pub duration_ms: i64,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HeatmapItem {
    pub date: String,
    pub count: i64,
    pub tokens: i64,
    pub level: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyTrendItem {
    pub date: String,
    pub display_date: String,
    pub models: HashMap<String, i64>,
    pub total_tokens: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelUsageItem {
    pub model: String,
    pub tokens: i64,
    pub count: i64,
    pub percentage: f64,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiUsageDashboardStats {
    pub total_tokens: i64,
    pub prompt_tokens: i64,
    pub completion_tokens: i64,
    pub total_calls: i64,
    pub total_skills_analyzed: i64,
    pub active_days: i64,
    pub streak_days: i64,
    pub top_model: String,
    pub top_model_ratio: f64,
    pub heatmap_data: Vec<HeatmapItem>,
    pub daily_trends: Vec<DailyTrendItem>,
    pub model_breakdown: Vec<ModelUsageItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Memo {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub folder: String,
    pub note_type: String,
    pub color: String,
    pub tags: Option<String>,
    pub is_pinned: bool,
    pub is_favorite: bool,
    pub is_archived: bool,
    pub todo_total: i32,
    pub todo_completed: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewMemoPayload {
    pub title: String,
    pub content: String,
    pub folder: Option<String>,
    pub note_type: Option<String>,
    pub color: Option<String>,
    pub tags: Option<String>,
    pub is_pinned: Option<bool>,
    pub is_favorite: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateMemoPayload {
    pub title: Option<String>,
    pub content: Option<String>,
    pub folder: Option<String>,
    pub note_type: Option<String>,
    pub color: Option<String>,
    pub tags: Option<String>,
    pub is_pinned: Option<bool>,
    pub is_favorite: Option<bool>,
    pub is_archived: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemoFolderSummary {
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemoTagSummary {
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SqliteExportDump {
    pub skills: Vec<Skill>,
    pub memories: Vec<Memory>,
    pub memos: Vec<Memo>,
    pub configs: Vec<Config>,
    pub scan_targets: Vec<ScanTarget>,
    pub category_syntheses: Vec<CategorySynthesisResult>,
    pub ai_usage_logs: Vec<AiUsageLog>,
}
