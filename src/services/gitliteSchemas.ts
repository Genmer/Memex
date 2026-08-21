/**
 * GitLite JSON Schema 规范定义
 * 支持字段索引 (x-gitlite-indexed) 与时间戳自动维护 (timestamps)
 */

export const MEMOS_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  gitliteDescriptor: { collection: 'memos', timestamps: true },
  type: 'object',
  properties: {
    legacy_id: { type: 'number', 'x-gitlite-indexed': true },
    title: { type: 'string', 'x-gitlite-indexed': true },
    content: { type: 'string' },
    folder: { type: 'string', 'x-gitlite-indexed': true },
    note_type: { type: 'string' },
    color: { type: 'string' },
    tags: { type: 'string', 'x-gitlite-indexed': true },
    is_pinned: { type: 'boolean', 'x-gitlite-indexed': true },
    is_favorite: { type: 'boolean', 'x-gitlite-indexed': true },
    is_archived: { type: 'boolean', 'x-gitlite-indexed': true },
    todo_total: { type: 'number' },
    todo_completed: { type: 'number' },
    created_at: { type: 'string' },
    updated_at: { type: 'string', 'x-gitlite-indexed': true }
  },
  required: ['title']
};

export const SKILLS_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  gitliteDescriptor: { collection: 'skills', timestamps: true },
  type: 'object',
  properties: {
    legacy_id: { type: 'number', 'x-gitlite-indexed': true },
    name: { type: 'string', 'x-gitlite-indexed': true },
    content: { type: 'string' },
    source_tool: { type: 'string', 'x-gitlite-indexed': true },
    local_path: { type: 'string' },
    prefix_template: { type: 'string' },
    tags: { type: 'string' },
    summary_zh: { type: 'string' },
    category_zh: { type: 'string', 'x-gitlite-indexed': true },
    tags_zh: { type: 'string' },
    priority: { type: 'number' },
    is_favorite: { type: 'boolean', 'x-gitlite-indexed': true },
    created_at: { type: 'string' },
    updated_at: { type: 'string', 'x-gitlite-indexed': true }
  },
  required: ['name', 'source_tool']
};

export const MEMORIES_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  gitliteDescriptor: { collection: 'memories', timestamps: true },
  type: 'object',
  properties: {
    legacy_id: { type: 'number', 'x-gitlite-indexed': true },
    name: { type: 'string', 'x-gitlite-indexed': true },
    source_tool: { type: 'string', 'x-gitlite-indexed': true },
    session_id: { type: 'string' },
    content: { type: 'string' },
    tags: { type: 'string' },
    summary_zh: { type: 'string' },
    category_zh: { type: 'string', 'x-gitlite-indexed': true },
    priority: { type: 'number' },
    is_favorite: { type: 'boolean', 'x-gitlite-indexed': true },
    extracted_at: { type: 'string' },
    updated_at: { type: 'string', 'x-gitlite-indexed': true }
  },
  required: ['name', 'source_tool']
};

export const CONFIGS_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  gitliteDescriptor: { collection: 'configs', timestamps: true },
  type: 'object',
  properties: {
    key_name: { type: 'string', 'x-gitlite-indexed': true },
    key_value: { type: 'string' },
    description: { type: 'string' },
    created_at: { type: 'string' },
    updated_at: { type: 'string' }
  },
  required: ['key_name', 'key_value']
};

export const SCAN_TARGETS_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  gitliteDescriptor: { collection: 'scan_targets', timestamps: true },
  type: 'object',
  properties: {
    legacy_id: { type: 'number', 'x-gitlite-indexed': true },
    path: { type: 'string', 'x-gitlite-indexed': true },
    override_tool: { type: 'string' },
    priority: { type: 'number' },
    is_enabled: { type: 'boolean', 'x-gitlite-indexed': true },
    created_at: { type: 'string' }
  },
  required: ['path']
};

export const CATEGORY_SYNTHESES_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  gitliteDescriptor: { collection: 'category_syntheses', timestamps: true },
  type: 'object',
  properties: {
    category_key: { type: 'string', 'x-gitlite-indexed': true },
    category_name: { type: 'string' },
    total_skills: { type: 'number' },
    overview_zh: { type: 'string' },
    core_capabilities: { type: 'array' },
    recommended_workflows: { type: 'array' },
    updated_at: { type: 'string' }
  },
  required: ['category_key', 'category_name']
};

export const AI_USAGE_LOGS_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  gitliteDescriptor: { collection: 'ai_usage_logs', timestamps: true },
  type: 'object',
  properties: {
    legacy_id: { type: 'number', 'x-gitlite-indexed': true },
    action_type: { type: 'string', 'x-gitlite-indexed': true },
    target_name: { type: 'string' },
    model: { type: 'string', 'x-gitlite-indexed': true },
    prompt_tokens: { type: 'number' },
    completion_tokens: { type: 'number' },
    total_tokens: { type: 'number' },
    duration_ms: { type: 'number' },
    status: { type: 'string' },
    error_message: { type: 'string' },
    created_at: { type: 'string', 'x-gitlite-indexed': true }
  },
  required: ['action_type', 'model']
};
