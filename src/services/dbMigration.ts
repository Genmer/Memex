import { invoke } from '@tauri-apps/api/core';
import { gitliteDb } from './gitliteDb';

export interface MigrationReport {
  migrated: boolean;
  memosCount: number;
  skillsCount: number;
  memoriesCount: number;
  configsCount: number;
  scanTargetsCount: number;
  categorySynthesesCount: number;
  aiUsageLogsCount: number;
  timestamp: string;
}

const MIGRATION_KEY = 'memex_gitlite_migrated_v1';
const BACKUP_KEY = 'memex_sqlite_safety_backup';

export async function runAutoMigrationIfNeeded(): Promise<MigrationReport> {
  const isMigrated = localStorage.getItem(MIGRATION_KEY);

  // 确保 GitLite 引擎已就绪
  await gitliteDb.init();

  // 如果已经迁移过，并且 GitLite 里已有备忘或技能数据，直接返回
  if (isMigrated === 'true') {
    const existingMemos = await gitliteDb.getMemos();
    const existingSkills = await gitliteDb.getSkills();
    if (existingMemos.length > 0 || existingSkills.length > 0) {
      return {
        migrated: false,
        memosCount: existingMemos.length,
        skillsCount: existingSkills.length,
        memoriesCount: (await gitliteDb.getMemories()).length,
        configsCount: (await gitliteDb.getConfigs()).length,
        scanTargetsCount: (await gitliteDb.getScanTargets()).length,
        categorySynthesesCount: (await gitliteDb.getCategorySyntheses()).length,
        aiUsageLogsCount: (await gitliteDb.getAiUsageLogs(1000)).length,
        timestamp: new Date().toISOString()
      };
    }
  }

  console.log('[GitLite Migration] 开始从现有 SQLite 数据库无损导出并迁移数据...');

  try {
    // 1. 如果在 Tauri 桌面中，调用 Rust 导出 SQLite 全量数据
    const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
    let dump: any = null;

    if (isTauri) {
      dump = await invoke('export_all_sqlite_data');
      console.log('[GitLite Migration] 成功从 SQLite 提取全量数据 dump:', dump);
    } else {
      // 纯 Web 模式：从 LocalStorage 备份读取
      try {
        const saved = localStorage.getItem(BACKUP_KEY);
        if (saved) dump = JSON.parse(saved);
      } catch (e) {}
    }

    if (!dump) {
      return {
        migrated: false,
        memosCount: 0,
        skillsCount: 0,
        memoriesCount: 0,
        configsCount: 0,
        scanTargetsCount: 0,
        categorySynthesesCount: 0,
        aiUsageLogsCount: 0,
        timestamp: new Date().toISOString()
      };
    }


    // 2. 存入安全本地备份 (防止任何意外)
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(dump));
    } catch (storageErr) {
      console.warn('[GitLite Migration] LocalStorage backup size limit reached, continuing memory migration:', storageErr);
    }

    let memosCount = 0;
    let skillsCount = 0;
    let memoriesCount = 0;
    let configsCount = 0;
    let scanTargetsCount = 0;
    let categorySynthesesCount = 0;
    let aiUsageLogsCount = 0;

    // 3. 批量写入 memos
    if (Array.isArray(dump.memos) && dump.memos.length > 0) {
      for (const m of dump.memos) {
        const existing = await gitliteDb.memosCol.findOne({
          $or: [{ legacy_id: m.id }, { title: m.title }]
        } as any);
        if (!existing) {
          await gitliteDb.memosCol.insertOne({
            legacy_id: m.id,
            title: m.title,
            content: m.content || '',
            folder: m.folder || '默认备忘',
            note_type: m.note_type || 'markdown',
            color: m.color || 'default',
            tags: m.tags || '',
            is_pinned: Boolean(m.is_pinned),
            is_favorite: Boolean(m.is_favorite),
            is_archived: Boolean(m.is_archived),
            todo_total: m.todo_total || 0,
            todo_completed: m.todo_completed || 0,
            created_at: m.created_at || new Date().toISOString(),
            updated_at: m.updated_at || new Date().toISOString()
          } as any);
          memosCount++;
        }
      }
    }

    // 4. 批量写入 skills
    if (Array.isArray(dump.skills) && dump.skills.length > 0) {
      for (const s of dump.skills) {
        const existing = await gitliteDb.skillsCol.findOne({
          $or: [{ legacy_id: s.id }, { name: s.name }]
        } as any);
        if (!existing) {
          await gitliteDb.skillsCol.insertOne({
            legacy_id: s.id,
            name: s.name,
            content: s.content || '',
            source_tool: s.source_tool || 'custom',
            local_path: s.local_path,
            prefix_template: s.prefix_template,
            tags: s.tags,
            summary_zh: s.summary_zh,
            category_zh: s.category_zh,
            tags_zh: s.tags_zh,
            priority: s.priority || 10,
            is_favorite: Boolean(s.is_favorite),
            created_at: s.created_at || new Date().toISOString(),
            updated_at: s.updated_at || new Date().toISOString()
          } as any);
          skillsCount++;
        }
      }
    }

    // 5. 批量写入 memories
    if (Array.isArray(dump.memories) && dump.memories.length > 0) {
      for (const mem of dump.memories) {
        const existing = await gitliteDb.memoriesCol.findOne({
          $or: [{ legacy_id: mem.id }, { name: mem.name }]
        } as any);
        if (!existing) {
          await gitliteDb.memoriesCol.insertOne({
            legacy_id: mem.id,
            name: mem.name,
            source_tool: mem.source_tool || 'custom',
            session_id: mem.session_id,
            content: mem.content || '',
            tags: mem.tags,
            summary_zh: mem.summary_zh,
            category_zh: mem.category_zh,
            priority: mem.priority || 10,
            is_favorite: Boolean(mem.is_favorite),
            extracted_at: mem.extracted_at || new Date().toISOString(),
            updated_at: mem.updated_at || new Date().toISOString()
          } as any);
          memoriesCount++;
        }
      }
    }

    // 6. 批量写入 configs
    if (Array.isArray(dump.configs) && dump.configs.length > 0) {
      for (const c of dump.configs) {
        await gitliteDb.saveConfig(c.key_name, c.key_value, c.description);
        configsCount++;
      }
    }

    // 7. 批量写入 scan_targets
    if (Array.isArray(dump.scan_targets) && dump.scan_targets.length > 0) {
      for (const st of dump.scan_targets) {
        const existing = await gitliteDb.scanTargetsCol.findOne({ path: st.path } as any);
        if (!existing) {
          await gitliteDb.scanTargetsCol.insertOne({
            legacy_id: st.id,
            path: st.path,
            override_tool: st.override_tool,
            priority: st.priority || 50,
            is_enabled: Boolean(st.is_enabled),
            created_at: st.created_at || new Date().toISOString()
          } as any);
          scanTargetsCount++;
        }
      }
    }

    // 8. 批量写入 category_syntheses
    if (Array.isArray(dump.category_syntheses) && dump.category_syntheses.length > 0) {
      for (const cs of dump.category_syntheses) {
        await gitliteDb.saveCategorySynthesis(cs);
        categorySynthesesCount++;
      }
    }

    // 9. 批量写入 ai_usage_logs
    if (Array.isArray(dump.ai_usage_logs) && dump.ai_usage_logs.length > 0) {
      for (const log of dump.ai_usage_logs) {
        await gitliteDb.aiUsageLogsCol.insertOne({
          legacy_id: log.id,
          action_type: log.action_type,
          target_name: log.target_name,
          model: log.model,
          prompt_tokens: log.prompt_tokens || 0,
          completion_tokens: log.completion_tokens || 0,
          total_tokens: log.total_tokens || 0,
          duration_ms: log.duration_ms || 0,
          status: log.status || 'success',
          error_message: log.error_message,
          created_at: log.created_at || new Date().toISOString()
        } as any);
        aiUsageLogsCount++;
      }
    }

    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log('[GitLite Migration] ✅ 数据无损迁移完毕！迁移统计:', {
      memosCount,
      skillsCount,
      memoriesCount,
      configsCount,
      scanTargetsCount,
      categorySynthesesCount,
      aiUsageLogsCount
    });

    return {
      migrated: true,
      memosCount,
      skillsCount,
      memoriesCount,
      configsCount,
      scanTargetsCount,
      categorySynthesesCount,
      aiUsageLogsCount,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.warn('[GitLite Migration] 从 SQLite 导出迁移跳过或失败 (可能在纯 Web 模式):', err);
    return {
      migrated: false,
      memosCount: (await gitliteDb.getMemos()).length,
      skillsCount: (await gitliteDb.getSkills()).length,
      memoriesCount: (await gitliteDb.getMemories()).length,
      configsCount: (await gitliteDb.getConfigs()).length,
      scanTargetsCount: (await gitliteDb.getScanTargets()).length,
      categorySynthesesCount: (await gitliteDb.getCategorySyntheses()).length,
      aiUsageLogsCount: (await gitliteDb.getAiUsageLogs(1000)).length,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 导出全量 JSON 备份
 */
export async function exportFullJsonBackup(): Promise<string> {
  await gitliteDb.init();
  const backup = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    generator: 'Memex GitLite Storage Engine',
    memos: await gitliteDb.getMemos(),
    skills: await gitliteDb.getSkills(),
    memories: await gitliteDb.getMemories(),
    configs: await gitliteDb.getConfigs(),
    scanTargets: await gitliteDb.getScanTargets(),
    categorySyntheses: await gitliteDb.getCategorySyntheses(),
    aiUsageLogs: await gitliteDb.getAiUsageLogs(2000)
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * 导入全量 JSON 备份
 */
export async function importFullJsonBackup(jsonStr: string): Promise<boolean> {
  await gitliteDb.init();
  const data = JSON.parse(jsonStr);

  if (Array.isArray(data.memos)) {
    for (const m of data.memos) {
      await gitliteDb.memosCol.insertOne({
        title: m.title || '无标题备忘',
        content: m.content || '',
        folder: m.folder || '默认备忘',
        note_type: m.note_type || 'markdown',
        color: m.color || 'default',
        tags: m.tags || '',
        is_pinned: Boolean(m.is_pinned),
        is_favorite: Boolean(m.is_favorite),
        is_archived: Boolean(m.is_archived),
        todo_total: m.todo_total || 0,
        todo_completed: m.todo_completed || 0,
        created_at: m.created_at || new Date().toISOString(),
        updated_at: m.updated_at || new Date().toISOString()
      } as any);
    }
  }

  if (Array.isArray(data.skills)) {
    for (const s of data.skills) {
      await gitliteDb.skillsCol.insertOne(s as any);
    }
  }

  if (Array.isArray(data.memories)) {
    for (const mem of data.memories) {
      await gitliteDb.memoriesCol.insertOne(mem as any);
    }
  }

  if (Array.isArray(data.configs)) {
    for (const c of data.configs) {
      await gitliteDb.saveConfig(c.key_name, c.key_value, c.description);
    }
  }

  return true;
}

/**
 * 导入 Markdown (.md) 或 JSON (.json) 文件到备忘录中
 */
export async function importFilesToMemos(
  files: { name: string; content: string }[],
  defaultFolder = '默认备忘'
): Promise<{ count: number; message: string }> {
  await gitliteDb.init();
  let totalImported = 0;

  for (const file of files) {
    const fileName = file.name || 'untitled.md';
    const content = file.content || '';

    // 1. JSON 格式导入
    if (fileName.toLowerCase().endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.memos) ? parsed.memos : [parsed]);
        for (const item of list) {
          if (item && (item.title || item.content)) {
            await gitliteDb.createMemo({
              title: item.title || fileName.replace(/\.json$/i, ''),
              content: item.content || '',
              folder: item.folder || defaultFolder,
              note_type: item.note_type || 'markdown',
              color: item.color || 'default',
              tags: item.tags || '',
              is_pinned: Boolean(item.is_pinned),
              is_favorite: Boolean(item.is_favorite)
            });
            totalImported++;
          }
        }
      } catch (err: any) {
        console.warn('JSON import failed for', fileName, err);
      }
      continue;
    }

    // 2. Markdown 格式导入
    // 检测是否为 Memex 导出的多条备忘归档
    if (content.includes('# Memex 个人备忘录与开发日志归档') || content.includes('## ') && content.includes('> **分类**:')) {
      const sections = content.split(/\n(?=##\s+)/);
      for (const sec of sections) {
        const lines = sec.trim().split('\n');
        if (!lines[0].startsWith('## ')) continue;
        const title = lines[0].replace(/^##\s+/, '').trim();
        let folder = defaultFolder;
        let noteType = 'markdown';
        let tags = '';
        let bodyLines: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const l = lines[i];
          if (l.startsWith('> **分类**:')) {
            const folderMatch = l.match(/\*\*分类\*\*:\s*([^|]+)/);
            if (folderMatch) folder = folderMatch[1].trim();
            const typeMatch = l.match(/\*\*类型\*\*:\s*([^|]+)/);
            if (typeMatch) noteType = typeMatch[1].trim();
            const tagsMatch = l.match(/\*\*标签\*\*:\s*([^|]+)/);
            if (tagsMatch && tagsMatch[1].trim() !== '无') tags = tagsMatch[1].trim();
          } else if (l === '---' && i >= lines.length - 2) {
            // ignore footer divider
          } else {
            bodyLines.push(l);
          }
        }

        await gitliteDb.createMemo({
          title: title || '未命名备忘',
          content: bodyLines.join('\n').trim(),
          folder: folder || defaultFolder,
          note_type: noteType || 'markdown',
          tags,
          color: 'default'
        });
        totalImported++;
      }
    } else {
      // 单篇 Markdown 文档
      const title = fileName.replace(/\.(md|markdown|txt)$/i, '') || '导入文档';
      await gitliteDb.createMemo({
        title,
        content: content.trim(),
        folder: defaultFolder,
        note_type: 'markdown',
        color: 'default'
      });
      totalImported++;
    }
  }

  return {
    count: totalImported,
    message: `成功导入 ${totalImported} 篇备忘！`
  };
}

