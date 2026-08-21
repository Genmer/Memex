import {
  GitLiteClient,
  Collection,
  MemoryProvider,
  GitHubProvider,
  GiteeProvider,
  type GitProvider,
  POLICIES,
  deviceFlowLogin
} from '@gitlite/core';

import { reactive } from 'vue';
import { createBrowserRuntime } from './browserRuntime';
import {
  MEMOS_SCHEMA,
  SKILLS_SCHEMA,
  MEMORIES_SCHEMA,
  CONFIGS_SCHEMA,
  SCAN_TARGETS_SCHEMA,
  CATEGORY_SYNTHESES_SCHEMA,
  AI_USAGE_LOGS_SCHEMA
} from './gitliteSchemas';


export interface MemoDoc {
  _id?: string;
  _rev?: string;
  id?: number | string;
  legacy_id?: number;
  title: string;
  content: string;
  folder: string;
  note_type: string;
  color: string;
  tags?: string;
  is_pinned: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  todo_total: number;
  todo_completed: number;
  created_at: string;
  updated_at: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SkillDoc {
  _id?: string;
  _rev?: string;
  id?: number | string;
  legacy_id?: number;
  name: string;
  content: string;
  source_tool: string;
  local_path?: string;
  prefix_template?: string;
  tags?: string;
  summary_zh?: string;
  category_zh?: string;
  tags_zh?: string;
  priority: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemoryDoc {
  _id?: string;
  _rev?: string;
  id?: number | string;
  legacy_id?: number;
  name: string;
  source_tool: string;
  session_id?: string;
  content: string;
  tags?: string;
  summary_zh?: string;
  category_zh?: string;
  priority: number;
  is_favorite: boolean;
  extracted_at: string;
  updated_at: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConfigDoc {
  _id?: string;
  _rev?: string;
  id?: number | string;
  key_name: string;
  key_value: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScanTargetDoc {
  _id?: string;
  _rev?: string;
  id?: number | string;
  legacy_id?: number;
  path: string;
  override_tool?: string;
  priority: number;
  is_enabled: boolean;
  created_at?: string;
}

export interface CategorySynthesisDoc {
  _id?: string;
  _rev?: string;
  id?: number | string;
  category_key: string;
  category_name: string;
  total_skills: number;
  overview_zh: string;
  core_capabilities: string[];
  recommended_workflows: string[];
  updated_at?: string;
}

export interface AiUsageLogDoc {
  _id?: string;
  _rev?: string;
  id?: number | string;
  legacy_id?: number;
  action_type: string;

  target_name?: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms: number;
  status: string;
  error_message?: string;
  created_at: string;
}

import { useToast } from '../composables/useToast';

export interface GitLiteStatus {
  isReady: boolean;
  provider: 'github' | 'gitee' | 'memory';
  owner: string;
  repo: string;
  database: string;
  syncState: 'idle' | 'syncing' | 'synced' | 'error';
  isConnecting: boolean;
  statusMessage: string;
  pendingChanges: number;
  lastCommitSha?: string;
  lastSyncedAt?: string;
  error?: string;
}

const getInitialGitLiteStatus = (): GitLiteStatus => {
  try {
    const provider = (localStorage.getItem('memex_gitlite_provider') as any) || 'memory';
    const token = localStorage.getItem('memex_gitlite_token');
    const owner = localStorage.getItem('memex_gitlite_owner') || 'local-user';
    const repo = localStorage.getItem('memex_gitlite_repo') || 'gitlite-repo';
    const db = localStorage.getItem('memex_gitlite_db') || 'memex-db';
    const lastSync = localStorage.getItem('memex_gitlite_last_synced') || undefined;

    if (token && (provider === 'gitee' || provider === 'github')) {
      return {
        isReady: true,
        provider,
        owner,
        repo,
        database: db,
        syncState: 'synced',
        isConnecting: false,
        statusMessage: `已连接 ${provider === 'gitee' ? 'Gitee' : 'GitHub'} (${owner}/${repo})`,
        pendingChanges: 0,
        lastCommitSha: undefined,
        lastSyncedAt: lastSync,
        error: undefined
      };
    }
  } catch (e) {}

  return {
    isReady: false,
    provider: 'memory',
    owner: 'local-user',
    repo: 'memex-vault',
    database: 'memex-db',
    syncState: 'idle',
    isConnecting: false,
    statusMessage: '本地离线数据库就绪',
    pendingChanges: 0,
    lastCommitSha: undefined,
    lastSyncedAt: undefined,
    error: undefined
  };
};

export const gitliteStatus = reactive<GitLiteStatus>(getInitialGitLiteStatus());

class GitLiteService {
  public client: GitLiteClient | null = null;
  public memosCol!: Collection<MemoDoc>;
  public skillsCol!: Collection<SkillDoc>;
  public memoriesCol!: Collection<MemoryDoc>;
  public configsCol!: Collection<ConfigDoc>;
  public scanTargetsCol!: Collection<ScanTargetDoc>;
  public categorySynthesesCol!: Collection<CategorySynthesisDoc>;
  public aiUsageLogsCol!: Collection<AiUsageLogDoc>;

  private isInitializing = false;
  private initPromise: Promise<boolean> | null = null;

  async init(options?: {
    provider?: 'github' | 'gitee' | 'memory';
    token?: string;
    owner?: string;
    repo?: string;
    database?: string;
    allowForeignRepo?: boolean;
    force?: boolean;
    silent?: boolean;
  }): Promise<boolean> {
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }
    this.isInitializing = true;

    const toast = useToast();

    this.initPromise = (async () => {
      try {
        const savedProvider = options?.provider || (localStorage.getItem('memex_gitlite_provider') as any) || 'memory';
        const savedToken = options?.token || localStorage.getItem('memex_gitlite_token') || undefined;
        const savedOwner = options?.owner || localStorage.getItem('memex_gitlite_owner') || 'local-user';
        const savedRepo = options?.repo || localStorage.getItem('memex_gitlite_repo') || 'gitlite-repo';
        const savedDb = options?.database || localStorage.getItem('memex_gitlite_db') || 'memex-db';

        const isSilent = options?.silent ?? true;

        const runtime = createBrowserRuntime();
        let providerInstance: GitProvider;

        if (savedProvider === 'github' && savedToken) {
          try {
            gitliteStatus.statusMessage = `正在连接 GitHub 远程数据库 (${savedOwner}/${savedRepo})...`;
            
            providerInstance = new GitHubProvider(savedToken, runtime.fetch);
            this.client = await GitLiteClient.create({
              provider: providerInstance,
              runtime,
              ref: { owner: savedOwner, repo: savedRepo },
              database: savedDb,
              policy: POLICIES.economy,
              allowForeignRepo: true,
              onProgress: (step: any, detail?: any) => {
                console.log(`[GitLite Init] ${step}`, detail);
                gitliteStatus.statusMessage = `正在从云端拉取最新数据 (${step})...`;
              }
            });
            gitliteStatus.provider = 'github';
            gitliteStatus.owner = savedOwner;
            gitliteStatus.repo = savedRepo;
            gitliteStatus.database = savedDb;
            gitliteStatus.statusMessage = `已连接 GitHub (${savedOwner}/${savedRepo})`;
            if (!isSilent) toast.success(`✅ GitHub 云端数据库已连接 (${savedOwner}/${savedRepo})`, 2500);
          } catch (cloudErr: any) {
            console.warn('[GitLite] GitHub init failed, fallback to memory:', cloudErr);
            gitliteStatus.error = cloudErr.message;
            providerInstance = new MemoryProvider();
            this.client = await GitLiteClient.create({
              provider: providerInstance,
              runtime,
              ref: { owner: 'local-user', repo: 'gitlite-repo' },
              database: 'memex-db',
              policy: POLICIES.economy,
              allowForeignRepo: true
            });
            gitliteStatus.provider = 'memory';
            gitliteStatus.statusMessage = '云端连接异常，已使用本地离线数据';
          }
        } else if (savedProvider === 'gitee' && savedToken) {
          try {
            gitliteStatus.statusMessage = `正在验证 Gitee 登录并同步远程数据库 (${savedOwner}/${savedRepo})...`;

            providerInstance = new GiteeProvider(savedToken, runtime.fetch);
            this.client = await GitLiteClient.create({
              provider: providerInstance,
              runtime,
              ref: { owner: savedOwner, repo: savedRepo },
              database: savedDb,
              policy: POLICIES.economy,
              allowForeignRepo: true,
              onProgress: (step: any, detail?: any) => {
                console.log(`[GitLite Init] ${step}`, detail);
                gitliteStatus.statusMessage = `正在同步云端数据 (${step})...`;
              }
            });

            gitliteStatus.provider = 'gitee';
            gitliteStatus.owner = savedOwner;
            gitliteStatus.repo = savedRepo;
            gitliteStatus.database = savedDb;
            gitliteStatus.statusMessage = `已连接 Gitee (${savedOwner}/${savedRepo})`;
            if (!isSilent) toast.success(`✅ Gitee 远程数据库已就绪 (${savedOwner}/${savedRepo})`, 2500);
          } catch (cloudErr: any) {
            console.warn('[GitLite] Gitee init failed, fallback to memory:', cloudErr);
            gitliteStatus.error = cloudErr.message;
            providerInstance = new MemoryProvider();
            this.client = await GitLiteClient.create({
              provider: providerInstance,
              runtime,
              ref: { owner: 'local-user', repo: 'gitlite-repo' },
              database: 'memex-db',
              policy: POLICIES.economy,
              allowForeignRepo: true
            });
            gitliteStatus.provider = 'memory';
            gitliteStatus.statusMessage = 'Gitee 连接超时，已使用本地离线数据';
          }
        } else {
          gitliteStatus.statusMessage = '本地离线数据库就绪';
          providerInstance = new MemoryProvider();
          this.client = await GitLiteClient.create({
            provider: providerInstance,
            runtime,
            ref: { owner: 'local-user', repo: 'gitlite-repo' },
            database: 'memex-db',
            policy: POLICIES.economy,
            allowForeignRepo: true
          });
          gitliteStatus.provider = 'memory';
          gitliteStatus.owner = 'local-user';
          gitliteStatus.repo = 'gitlite-repo';
          gitliteStatus.database = 'memex-db';
        }




        // 注册所有 Schema
        await this.client.putSchema('memos', MEMOS_SCHEMA as any);
        await this.client.putSchema('skills', SKILLS_SCHEMA as any);
        await this.client.putSchema('memories', MEMORIES_SCHEMA as any);
        await this.client.putSchema('configs', CONFIGS_SCHEMA as any);
        await this.client.putSchema('scan_targets', SCAN_TARGETS_SCHEMA as any);
        await this.client.putSchema('category_syntheses', CATEGORY_SYNTHESES_SCHEMA as any);
        await this.client.putSchema('ai_usage_logs', AI_USAGE_LOGS_SCHEMA as any);

        // 获取集合实例
        this.memosCol = this.client.collection<MemoDoc>('memos');
        this.skillsCol = this.client.collection<SkillDoc>('skills');
        this.memoriesCol = this.client.collection<MemoryDoc>('memories');
        this.configsCol = this.client.collection<ConfigDoc>('configs');
        this.scanTargetsCol = this.client.collection<ScanTargetDoc>('scan_targets');
        this.categorySynthesesCol = this.client.collection<CategorySynthesisDoc>('category_syntheses');
        this.aiUsageLogsCol = this.client.collection<AiUsageLogDoc>('ai_usage_logs');

        // 事件监听
        this.client.on('sync:push', (e: any) => {
          gitliteStatus.syncState = 'synced';
          gitliteStatus.lastSyncedAt = new Date().toLocaleTimeString();
          localStorage.setItem('memex_gitlite_last_synced', gitliteStatus.lastSyncedAt);
          if (e?.commitSha) gitliteStatus.lastCommitSha = e.commitSha;
        });

        this.client.on('sync:conflict', (e: any) => {
          console.warn('[GitLite Sync Conflict Resolved]', e);
        });

        this.client.on('sync:pull', () => {
          gitliteStatus.syncState = 'synced';
          gitliteStatus.lastSyncedAt = new Date().toLocaleTimeString();
          localStorage.setItem('memex_gitlite_last_synced', gitliteStatus.lastSyncedAt);
        });

        gitliteStatus.isReady = true;
        gitliteStatus.syncState = 'synced';
        gitliteStatus.lastSyncedAt = gitliteStatus.lastSyncedAt || new Date().toLocaleTimeString();
        localStorage.setItem('memex_gitlite_last_synced', gitliteStatus.lastSyncedAt);

        // 关键核心：初始化完成后，如果是云端模式，自动在后台静默拉取远端更新 (Auto Pull)
        if (savedProvider === 'gitee' || savedProvider === 'github') {
          setTimeout(() => {
            this.syncNow().catch((err) => console.warn('[GitLite Auto Background Pull]', err));
          }, 50);
        }

        return true;


      } catch (err: any) {
        console.error('[GitLite] Fatal init error:', err);
        gitliteStatus.syncState = 'error';
        gitliteStatus.error = err.message;
        return false;
      } finally {
        this.isInitializing = false;
        gitliteStatus.isConnecting = false;
      }

    })();

    return this.initPromise;
  }

  /**
   * 主动、手动立即发起双向云端同步 (Pull + Flush Push)
   */
  async syncNow(): Promise<{ success: boolean; message: string }> {
    await this.ensureReady();
    if (gitliteStatus.provider === 'memory') {
      return { success: true, message: '当前处于本地纯内存模式，无需云端同步' };
    }

    gitliteStatus.syncState = 'syncing';
    try {
      // 1. 主动拉取远端变更 (Pull)
      if (this.client && (this.client as any).sync) {
        await (this.client as any).sync.pull();
        // 2. 主动推送本地变更 (Flush Push)
        await (this.client as any).sync.flush();
      }

      gitliteStatus.syncState = 'synced';
      gitliteStatus.lastSyncedAt = new Date().toLocaleTimeString();
      return { success: true, message: '手动同步完成，数据已与云端 Git 仓库完全一致' };
    } catch (err: any) {
      console.error('[GitLite Manual Sync Error]:', err);
      gitliteStatus.syncState = 'error';
      gitliteStatus.error = err.message || String(err);
      throw err;
    }
  }


  /**
   * GitHub Device Flow 一键无感登录并自动建仓连接
   */
  async loginAndConnectWithGitHub(
    clientId?: string,
    onCodePrompt?: (code: string, url: string) => void
  ): Promise<boolean> {
    const runtime = createBrowserRuntime();
    gitliteStatus.syncState = 'syncing';

    const effectiveClientId = clientId 
      || localStorage.getItem('memex_gitlite_client_id') 
      || ((typeof window !== 'undefined' && (window as any).process?.env?.GITLITE_DEVICE_CLIENT_ID) as string | undefined)
      || 'gitlite-placeholder';


    try {
      const loginRes = await deviceFlowLogin(
        runtime.fetch,
        {
          onCode: (userCode: string, verifyUrl: string) => {
            if (onCodePrompt) onCodePrompt(userCode, verifyUrl);
          }
        },
        { clientId: effectiveClientId }
      );

      const token = loginRes.token;
      if (!token) throw new Error('未能获取 GitHub 访问令牌');

      // 识别用户名
      const provider = new GitHubProvider(token, runtime.fetch);
      const user = await provider.getUser();
      const owner = user.login;

      const repo = 'gitlite-repo';
      const database = 'memex-db';

      localStorage.setItem('memex_gitlite_provider', 'github');
      localStorage.setItem('memex_gitlite_owner', owner);
      localStorage.setItem('memex_gitlite_token', token);
      localStorage.setItem('memex_gitlite_repo', repo);
      localStorage.setItem('memex_gitlite_db', database);

      return await this.init({
        provider: 'github',
        owner,
        token,
        repo,
        database,
        force: true
      });
    } catch (err: any) {
      console.error('[GitLite Device Flow Error]:', err);
      const msg = err.message || String(err);
      if (msg.includes('invalid_client') || msg.includes('gitlite-placeholder')) {
        gitliteStatus.error = '当前未配置公开 GitHub OAuth Client ID，建议直接使用 Token 快速连接（仅需粘贴 Token 即可自动识别身份与建仓）';
      } else {
        gitliteStatus.error = msg;
      }
      throw new Error(gitliteStatus.error);
    }
  }

  /**
   * Gitee OAuth 网页一键授权登录并自动建仓连接（完全免输入 Token）
   */
  async loginAndConnectWithGiteeOAuth(opts?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    onProgress?: (stage: string, message: string) => void;
  }): Promise<boolean> {
    const runtime = createBrowserRuntime();
    gitliteStatus.syncState = 'syncing';
    opts?.onProgress?.('waiting_auth', '正在等待 Gitee 网页授权确认...');

    const clientId = opts?.clientId 
      || localStorage.getItem('memex_gitlite_gitee_client_id')
      || ((typeof window !== 'undefined' && (window as any).process?.env?.GITLITE_GITEE_CLIENT_ID) as string | undefined)
      || '21abcc19023889aaf5ceb4fca91f07a539e2c887e6f3eb54bdf14edc9c64f41a';

    const clientSecret = opts?.clientSecret
      || localStorage.getItem('memex_gitlite_gitee_client_secret')
      || 'ab992f41d821b04c25ecd1f3dadeeb6a9aeadbb2a679aae43495f43fdc458b56';

    const redirectUri = opts?.redirectUri || 'http://127.0.0.1:18365/callback';
    const authUrl = `https://gitee.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);

    // 1. 多通道并发捕获授权码（先挂载监听，防止瞬间回调丢失）
    const waitForCodePromise = new Promise<string>((resolve, reject) => {
      let resolved = false;
      const cleanups: (() => void)[] = [];

      const triggerResolve = (retCode: string) => {
        if (!resolved && retCode && retCode.trim()) {
          resolved = true;
          cleanups.forEach(c => c());
          localStorage.removeItem('memex_oauth_callback_code');
          resolve(retCode.trim());
        }
      };

      // 通道 A: Tauri 原生 TCP 监听 18365 端口
      if (isTauri) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke('wait_for_oauth_callback', { port: 18365 })
            .then((res: any) => triggerResolve(String(res)))
            .catch((err) => {
              console.warn('[GitLite] Tauri wait_for_oauth_callback error:', err);
            });
        });
      }

      if (typeof window !== 'undefined') {
        // 通道 B: 浏览器 window.opener postMessage
        const msgHandler = (e: MessageEvent) => {
          if (e.data?.type === 'GITEE_OAUTH_CODE' && e.data?.code) {
            triggerResolve(e.data.code);
          }
        };
        window.addEventListener('message', msgHandler);
        cleanups.push(() => window.removeEventListener('message', msgHandler));

        // 通道 C: LocalStorage Storage 事件与轮询
        const storageHandler = (e: StorageEvent) => {
          if (e.key === 'memex_oauth_callback_code' && e.newValue) {
            triggerResolve(e.newValue);
          }
        };
        window.addEventListener('storage', storageHandler);
        cleanups.push(() => window.removeEventListener('storage', storageHandler));

        // 通道 D: 手动贴入 CustomEvent 监听
        const customHandler = (e: any) => {
          if (e.detail) triggerResolve(String(e.detail));
        };
        window.addEventListener('memex:oauth:manual_code', customHandler);
        cleanups.push(() => window.removeEventListener('memex:oauth:manual_code', customHandler));

        const pollTimer = setInterval(() => {
          const stored = localStorage.getItem('memex_oauth_callback_code');
          if (stored) {
            triggerResolve(stored);
          }
        }, 200);
        cleanups.push(() => clearInterval(pollTimer));
      }

      // 超时控制 (120 秒)
      const timeoutTimer = setTimeout(() => {
        if (!resolved) {
          cleanups.forEach(c => c());
          reject(new Error('等待授权超时 (120s)，请重试或点击手动输入 Code'));
        }
      }, 120_000);
      cleanups.push(() => clearTimeout(timeoutTimer));
    });

    // 2. 打开系统外部默认浏览器
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_external_url', { url: authUrl });
      } catch (e) {
        if (typeof window !== 'undefined') window.open(authUrl, '_blank');
      }
    } else if (typeof window !== 'undefined') {
      window.open(authUrl, '_blank');
    }

    const code = await waitForCodePromise;

    if (!code) throw new Error('未获取到 Gitee 授权码');

    opts?.onProgress?.('exchanging_token', '已获取授权码，正在换取安全令牌...');

    // 3. 换取 Token
    const tokenRes = await runtime.fetch('https://gitee.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        ...(clientSecret ? { client_secret: clientSecret } : {})
      }).toString()
    });

    const tokenData = await tokenRes.json();
    const token = tokenData?.access_token;
    if (!token) {
      throw new Error(`Gitee 授权失败: ${tokenData?.error_description || tokenData?.error || 'Token 获取失败'}`);
    }

    opts?.onProgress?.('identifying_user', '已获取令牌，正在识别账号身份...');

    // 4. 自动识别用户名
    const userRes = await runtime.fetch(`https://gitee.com/api/v5/user?access_token=${token}`);
    const userData = await userRes.json();
    const owner = userData?.login;
    if (!owner) throw new Error('未能识别 Gitee 用户身份');

    const repo = 'gitlite-repo';
    const database = 'memex-db';

    opts?.onProgress?.('initializing_repo', `正在为 ${owner} 创建并连接 gitlite-repo 数据库...`);

    localStorage.setItem('memex_gitlite_provider', 'gitee');
    localStorage.setItem('memex_gitlite_owner', owner);
    localStorage.setItem('memex_gitlite_token', token);
    localStorage.setItem('memex_gitlite_repo', repo);
    localStorage.setItem('memex_gitlite_db', database);

    return await this.init({
      provider: 'gitee',
      owner,
      token,
      repo,
      database,
      force: true
    });
  }

  /**
   * 通过 Gitee / GitHub Token 快速一键直连（免任何回调端口，Web/手机 100% 稳妥可用）
   */
  async loginAndConnectWithToken(token: string, provider: 'gitee' | 'github' = 'gitee'): Promise<boolean> {
    const runtime = createBrowserRuntime();
    gitliteStatus.syncState = 'syncing';

    const cleanToken = token.trim();
    if (!cleanToken) throw new Error('请输入有效的访问令牌 (Token)');

    let owner = '';
    if (provider === 'gitee') {
      const userRes = await runtime.fetch(`https://gitee.com/api/v5/user?access_token=${cleanToken}`);
      const userData = await userRes.json();
      owner = userData?.login;
      if (!owner) throw new Error(`未能识别 Gitee 用户身份: ${userData?.message || 'Token 无效或权限不足'}`);
    } else {
      const userRes = await runtime.fetch('https://api.github.com/user', {
        headers: { Authorization: `token ${cleanToken}`, Accept: 'application/json' }
      });
      const userData = await userRes.json();
      owner = userData?.login;
      if (!owner) throw new Error(`未能识别 GitHub 用户身份: ${userData?.message || 'Token 无效'}`);
    }

    const repo = 'gitlite-repo';
    const database = 'memex-db';

    localStorage.setItem('memex_gitlite_provider', provider);
    localStorage.setItem('memex_gitlite_owner', owner);
    localStorage.setItem('memex_gitlite_token', cleanToken);
    localStorage.setItem('memex_gitlite_repo', repo);
    localStorage.setItem('memex_gitlite_db', database);

    return await this.init({
      provider,
      owner,
      token: cleanToken,
      repo,
      database,
      force: true,
      silent: false
    });
  }






  // ---------------- Memos API ----------------
  async getMemos(): Promise<MemoDoc[]> {
    // 1. 0 毫秒优先读取本地持久化快照（Cache-First，零等待秒开）
    let snapshotItems: MemoDoc[] = [];
    try {
      const cached = localStorage.getItem('memex_snapshot_memos');
      if (cached) {
        snapshotItems = JSON.parse(cached);
      }
    } catch (e) {}

    // 如果内存引擎已就绪，直接快速从集合读取
    if (this.client && gitliteStatus.isReady && this.memosCol) {
      try {
        const list = await this.memosCol.find({}, { sort: { updated_at: -1 } });
        const items: MemoDoc[] = (list as any).items || (Array.isArray(list) ? list : []);
        if (items.length > 0) {
          try {
            localStorage.setItem('memex_snapshot_memos', JSON.stringify(items));
          } catch (e) {}
          return items;
        }
      } catch (e) {}
    } else {
      // 引擎未就绪时，在后台异步触发 ensureReady，不阻塞当前 0ms 快照响应
      this.ensureReady().then(async () => {
        try {
          const list = await this.memosCol.find({}, { sort: { updated_at: -1 } });
          const items: MemoDoc[] = (list as any).items || (Array.isArray(list) ? list : []);
          if (items.length > 0) {
            localStorage.setItem('memex_snapshot_memos', JSON.stringify(items));
            gitliteStatus.lastSyncedAt = new Date().toLocaleTimeString();
          }
        } catch (e) {}
      }).catch(() => {});
    }

    // 如果快照有数据，立即 0ms 返回，绝不让用户等待网络
    if (snapshotItems.length > 0) {
      return snapshotItems;
    }

    // 如果快照为空（首次使用），等待 ensureReady
    try {
      await this.ensureReady();
      const list = await this.memosCol.find({}, { sort: { updated_at: -1 } });
      const items: MemoDoc[] = (list as any).items || (Array.isArray(list) ? list : []);
      if (items.length > 0) {
        localStorage.setItem('memex_snapshot_memos', JSON.stringify(items));
      }
      return items;
    } catch (e) {}

    return [];
  }

  async createMemo(payload: {
    title: string;
    content: string;
    folder?: string;
    note_type?: string;
    color?: string;
    tags?: string;
    is_pinned?: boolean;
    is_favorite?: boolean;
  }): Promise<string> {
    await this.ensureReady();
    const now = new Date().toISOString();
    const todoMatches = payload.content.match(/- \[[ xX]\]/g) || [];
    const doneMatches = payload.content.match(/- \[[xX]\]/g) || [];

    const doc: MemoDoc = {
      title: payload.title || '无标题备忘',
      content: payload.content || '',
      folder: payload.folder || '默认备忘',
      note_type: payload.note_type || 'markdown',
      color: payload.color || 'default',
      tags: payload.tags || '',
      is_pinned: payload.is_pinned ?? false,
      is_favorite: payload.is_favorite ?? false,
      is_archived: false,
      todo_total: todoMatches.length,
      todo_completed: doneMatches.length,
      created_at: now,
      updated_at: now
    };

    const id = await this.memosCol.insertOne(doc as any);
    this.refreshMemosSnapshot();
    return id;
  }

  async updateMemo(id: string, payload: Partial<MemoDoc>): Promise<boolean> {
    await this.ensureReady();
    const updateData: any = { ...payload, updated_at: new Date().toISOString() };
    if (payload.content !== undefined) {
      const todoMatches = payload.content.match(/- \[[ xX]\]/g) || [];
      const doneMatches = payload.content.match(/- \[[xX]\]/g) || [];
      updateData.todo_total = todoMatches.length;
      updateData.todo_completed = doneMatches.length;
    }
    const filter = (id.length > 20) ? { _id: id } : { legacy_id: Number(id) };
    const res = await this.memosCol.updateOne(filter as any, { $set: updateData });
    this.refreshMemosSnapshot();
    return res.matchedCount > 0 || res.modifiedCount > 0;
  }

  async deleteMemo(id: string): Promise<boolean> {
    await this.ensureReady();
    const filter = (id.length > 20) ? { _id: id } : { legacy_id: Number(id) };
    const res = await this.memosCol.deleteOne(filter as any);
    this.refreshMemosSnapshot();
    return res.deletedCount > 0;
  }

  private async refreshMemosSnapshot(): Promise<void> {
    try {
      const list = await this.memosCol.find({}, { sort: { updated_at: -1 } });
      const items = (list as any).items || (Array.isArray(list) ? list : []);
      localStorage.setItem('memex_snapshot_memos', JSON.stringify(items));
    } catch (e) {}
  }

  async batchDeleteMemos(ids: string[]): Promise<void> {
    await this.ensureReady();
    for (const id of ids) {
      await this.deleteMemo(id);
    }
  }

  async toggleMemoPinned(id: string, isPinned: boolean): Promise<void> {
    await this.updateMemo(id, { is_pinned: isPinned });
  }

  async toggleMemoFavorite(id: string, isFavorite: boolean): Promise<void> {
    await this.updateMemo(id, { is_favorite: isFavorite });
  }

  async getMemoFolders(): Promise<{ name: string; count: number }[]> {
    const memos = await this.getMemos();
    const counts: Record<string, number> = {};
    for (const m of memos) {
      if (!m.is_archived) {
        counts[m.folder] = (counts[m.folder] || 0) + 1;
      }
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }

  async getMemoTags(): Promise<{ name: string; count: number }[]> {
    const memos = await this.getMemos();
    const counts: Record<string, number> = {};
    for (const m of memos) {
      if (m.tags && !m.is_archived) {
        m.tags.split(/[,，\s]+/).filter(Boolean).forEach(t => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }

  async exportMemosMarkdown(): Promise<string> {
    const memos = await this.getMemos();
    let out = `# Memex 个人备忘录与开发日志归档 (GitLite 存储)\n\n导出时间: ${new Date().toLocaleString()}\n\n---\n\n`;
    for (const m of memos) {
      if (m.is_archived) continue;
      out += `## ${m.title}\n`;
      out += `> **分类**: ${m.folder} | **类型**: ${m.note_type} | **标签**: ${m.tags || '无'} | **时间**: ${m.created_at || m.createdAt}\n\n`;
      out += `${m.content}\n\n---\n\n`;
    }
    return out;
  }

  // ---------------- Skills API ----------------
  async getSkills(): Promise<SkillDoc[]> {
    let snapshotItems: SkillDoc[] = [];
    try {
      const cached = localStorage.getItem('memex_snapshot_skills');
      if (cached) {
        snapshotItems = JSON.parse(cached);
      }
    } catch (e) {}

    if (this.client && gitliteStatus.isReady && this.skillsCol) {
      try {
        const list = await this.skillsCol.find({}, { sort: { priority: -1, updated_at: -1 } });
        const items: SkillDoc[] = (list as any).items || (Array.isArray(list) ? list : []);
        if (items.length > 0) {
          try {
            localStorage.setItem('memex_snapshot_skills', JSON.stringify(items));
          } catch (e) {}
          return items;
        }
      } catch (e) {}
    } else {
      this.ensureReady().then(async () => {
        try {
          const list = await this.skillsCol.find({}, { sort: { priority: -1, updated_at: -1 } });
          const items = (list as any).items || (Array.isArray(list) ? list : []);
          if (items.length > 0) {
            localStorage.setItem('memex_snapshot_skills', JSON.stringify(items));
            gitliteStatus.lastSyncedAt = new Date().toLocaleTimeString();
          }
        } catch (e) {}
      }).catch(() => {});
    }

    if (snapshotItems.length > 0) {
      return snapshotItems;
    }

    try {
      await this.ensureReady();
      const list = await this.skillsCol.find({}, { sort: { priority: -1, updated_at: -1 } });
      const items: SkillDoc[] = (list as any).items || (Array.isArray(list) ? list : []);
      if (items.length > 0) {
        localStorage.setItem('memex_snapshot_skills', JSON.stringify(items));
      }
      return items;
    } catch (e) {}

    return [];
  }

  async createSkill(skill: Partial<SkillDoc>): Promise<string> {
    await this.ensureReady();
    const now = new Date().toISOString();
    const doc: SkillDoc = {
      name: skill.name || '未命名技能',
      content: skill.content || '',
      source_tool: skill.source_tool || 'custom',
      local_path: skill.local_path,
      prefix_template: skill.prefix_template,
      tags: skill.tags,
      summary_zh: skill.summary_zh,
      category_zh: skill.category_zh,
      tags_zh: skill.tags_zh,
      priority: skill.priority ?? 10,
      is_favorite: skill.is_favorite ?? false,
      created_at: skill.created_at || now,
      updated_at: now
    };
    const id = await this.skillsCol.insertOne(doc as any);
    this.refreshSkillsSnapshot();
    return id;
  }

  async updateSkill(id: string | number, payload: Partial<SkillDoc>): Promise<boolean> {
    await this.ensureReady();
    const updateData: any = { ...payload, updated_at: new Date().toISOString() };
    const filter = (typeof id === 'string' && id.length > 20) ? { _id: id } : { legacy_id: Number(id) };
    const res = await this.skillsCol.updateOne(filter as any, { $set: updateData });
    this.refreshSkillsSnapshot();
    return res.matchedCount > 0 || res.modifiedCount > 0;
  }

  async deleteSkill(id: string | number): Promise<boolean> {
    await this.ensureReady();
    const filter = (typeof id === 'string' && id.length > 20) ? { _id: id } : { legacy_id: Number(id) };
    const res = await this.skillsCol.deleteOne(filter as any);
    this.refreshSkillsSnapshot();
    return res.deletedCount > 0;
  }

  private async refreshSkillsSnapshot(): Promise<void> {
    try {
      const list = await this.skillsCol.find({}, { sort: { priority: -1, updated_at: -1 } });
      const items = (list as any).items || (Array.isArray(list) ? list : []);
      localStorage.setItem('memex_snapshot_skills', JSON.stringify(items));
    } catch (e) {}
  }

  async toggleSkillFavorite(id: string | number, isFavorite: boolean): Promise<void> {
    await this.updateSkill(id, { is_favorite: isFavorite });
  }

  // ---------------- Memories API ----------------
  async getMemories(): Promise<MemoryDoc[]> {
    let snapshotItems: MemoryDoc[] = [];
    try {
      const cached = localStorage.getItem('memex_snapshot_memories');
      if (cached) {
        snapshotItems = JSON.parse(cached);
      }
    } catch (e) {}

    if (this.client && gitliteStatus.isReady && this.memoriesCol) {
      try {
        const list = await this.memoriesCol.find({}, { sort: { priority: -1, updated_at: -1 } });
        const items: MemoryDoc[] = (list as any).items || (Array.isArray(list) ? list : []);
        if (items.length > 0) {
          try {
            localStorage.setItem('memex_snapshot_memories', JSON.stringify(items));
          } catch (e) {}
          return items;
        }
      } catch (e) {}
    } else {
      this.ensureReady().then(async () => {
        try {
          const list = await this.memoriesCol.find({}, { sort: { priority: -1, updated_at: -1 } });
          const items = (list as any).items || (Array.isArray(list) ? list : []);
          if (items.length > 0) {
            localStorage.setItem('memex_snapshot_memories', JSON.stringify(items));
            gitliteStatus.lastSyncedAt = new Date().toLocaleTimeString();
          }
        } catch (e) {}
      }).catch(() => {});
    }

    if (snapshotItems.length > 0) {
      return snapshotItems;
    }

    try {
      await this.ensureReady();
      const list = await this.memoriesCol.find({}, { sort: { priority: -1, updated_at: -1 } });
      const items: MemoryDoc[] = (list as any).items || (Array.isArray(list) ? list : []);
      if (items.length > 0) {
        localStorage.setItem('memex_snapshot_memories', JSON.stringify(items));
      }
      return items;
    } catch (e) {}

    return [];
  }


  async createMemory(mem: Partial<MemoryDoc>): Promise<string> {
    await this.ensureReady();
    const now = new Date().toISOString();
    const doc: MemoryDoc = {
      name: mem.name || '未命名记忆',
      source_tool: mem.source_tool || 'custom',
      session_id: mem.session_id,
      content: mem.content || '',
      tags: mem.tags,
      summary_zh: mem.summary_zh,
      category_zh: mem.category_zh,
      priority: mem.priority ?? 10,
      is_favorite: mem.is_favorite ?? false,
      extracted_at: mem.extracted_at || now,
      updated_at: now
    };
    const id = await this.memoriesCol.insertOne(doc as any);
    this.refreshMemoriesSnapshot();
    return id;
  }

  async updateMemory(id: string | number, payload: Partial<MemoryDoc>): Promise<boolean> {
    await this.ensureReady();
    const updateData: any = { ...payload, updated_at: new Date().toISOString() };
    const filter = (typeof id === 'string' && id.length > 20) ? { _id: id } : { legacy_id: Number(id) };
    const res = await this.memoriesCol.updateOne(filter as any, { $set: updateData });
    this.refreshMemoriesSnapshot();
    return res.matchedCount > 0 || res.modifiedCount > 0;
  }

  async deleteMemory(id: string | number): Promise<boolean> {
    await this.ensureReady();
    const filter = (typeof id === 'string' && id.length > 20) ? { _id: id } : { legacy_id: Number(id) };
    const res = await this.memoriesCol.deleteOne(filter as any);
    this.refreshMemoriesSnapshot();
    return res.deletedCount > 0;
  }

  private async refreshMemoriesSnapshot(): Promise<void> {
    try {
      const list = await this.memoriesCol.find({}, { sort: { priority: -1, updated_at: -1 } });
      const items = (list as any).items || (Array.isArray(list) ? list : []);
      localStorage.setItem('memex_snapshot_memories', JSON.stringify(items));
    } catch (e) {}
  }


  async toggleMemoryFavorite(id: string | number, isFavorite: boolean): Promise<void> {
    await this.updateMemory(id, { is_favorite: isFavorite });
  }

  // ---------------- Configs API ----------------
  async getConfigs(): Promise<ConfigDoc[]> {
    await this.ensureReady();
    const list = await this.configsCol.find({});
    return (list as any).items || (Array.isArray(list) ? list : []);
  }

  async getConfig(keyName: string): Promise<string | null> {
    await this.ensureReady();
    const found = await this.configsCol.findOne({ key_name: keyName } as any);
    return found ? (found as any).key_value : null;
  }

  async saveConfig(keyName: string, keyValue: string, description?: string): Promise<void> {
    await this.ensureReady();
    const now = new Date().toISOString();
    const existing = await this.configsCol.findOne({ key_name: keyName } as any);
    if (existing) {
      await this.configsCol.updateOne({ key_name: keyName } as any, {
        $set: { key_value: keyValue, description: description || '', updated_at: now }
      });
    } else {
      await this.configsCol.insertOne({
        key_name: keyName,
        key_value: keyValue,
        description: description || '',
        created_at: now,
        updated_at: now
      } as any);
    }
  }


  // ---------------- Scan Targets API ----------------
  async getScanTargets(): Promise<ScanTargetDoc[]> {
    await this.ensureReady();
    const list = await this.scanTargetsCol.find({});
    return (list as any).items || (Array.isArray(list) ? list : []);
  }

  async addScanTarget(path: string, overrideTool?: string): Promise<string> {
    await this.ensureReady();
    const existing = await this.scanTargetsCol.findOne({ path } as any);
    if (existing) return (existing as any)._id;
    const now = new Date().toISOString();
    return await this.scanTargetsCol.insertOne({
      path,
      override_tool: overrideTool,
      priority: 50,
      is_enabled: true,
      created_at: now
    } as any);
  }

  async toggleScanTarget(id: string | number, isEnabled: boolean): Promise<void> {
    await this.ensureReady();
    const filter = (typeof id === 'string' && id.length > 20) ? { _id: id } : { legacy_id: Number(id) };
    await this.scanTargetsCol.updateOne(filter as any, { $set: { is_enabled: isEnabled } });
  }

  async removeScanTarget(id: string | number): Promise<void> {
    await this.ensureReady();
    const filter = (typeof id === 'string' && id.length > 20) ? { _id: id } : { legacy_id: Number(id) };
    await this.scanTargetsCol.deleteOne(filter as any);
  }

  // ---------------- AI Usage Logs & Stats API ----------------
  async getAiUsageLogs(limit = 100): Promise<AiUsageLogDoc[]> {
    await this.ensureReady();
    const list = await this.aiUsageLogsCol.find({}, { sort: { created_at: -1 }, limit });
    return (list as any).items || (Array.isArray(list) ? list : []);
  }

  async addAiUsageLog(log: Omit<AiUsageLogDoc, 'created_at'>): Promise<string> {
    await this.ensureReady();
    const doc: AiUsageLogDoc = {
      ...log,
      created_at: new Date().toISOString()
    };
    return await this.aiUsageLogsCol.insertOne(doc as any);
  }

  async clearAiUsageLogs(): Promise<void> {
    await this.ensureReady();
    await this.aiUsageLogsCol.deleteMany({});
  }

  async getAiUsageDashboardStats(): Promise<any> {
    const logs = await this.getAiUsageLogs(1000);
    let total_tokens = 0;
    let prompt_tokens = 0;
    let completion_tokens = 0;
    let total_calls = logs.length;
    let total_skills_analyzed = 0;

    const modelTokens: Record<string, { tokens: number; count: number }> = {};
    const dateCounts: Record<string, { count: number; tokens: number }> = {};
    const dailyModelMap: Record<string, Record<string, number>> = {};

    for (const l of logs) {
      total_tokens += l.total_tokens || 0;
      prompt_tokens += l.prompt_tokens || 0;
      completion_tokens += l.completion_tokens || 0;
      if (l.action_type === 'skill_analysis' || l.action_type === 'batch_skill_analysis') {
        total_skills_analyzed += 1;
      }

      const m = l.model || 'deepseek-v4-flash';
      if (!modelTokens[m]) modelTokens[m] = { tokens: 0, count: 0 };
      modelTokens[m].tokens += l.total_tokens || 0;
      modelTokens[m].count += 1;

      const dateKey = (l.created_at || '').substring(0, 10) || new Date().toISOString().substring(0, 10);
      if (!dateCounts[dateKey]) dateCounts[dateKey] = { count: 0, tokens: 0 };
      dateCounts[dateKey].count += 1;
      dateCounts[dateKey].tokens += l.total_tokens || 0;

      if (!dailyModelMap[dateKey]) dailyModelMap[dateKey] = {};
      dailyModelMap[dateKey][m] = (dailyModelMap[dateKey][m] || 0) + (l.total_tokens || 0);
    }

    const active_days = Object.keys(dateCounts).length;
    let top_model = 'deepseek-v4-flash';
    let top_tokens = 0;
    for (const [m, stat] of Object.entries(modelTokens)) {
      if (stat.tokens > top_tokens) {
        top_tokens = stat.tokens;
        top_model = m;
      }
    }
    const top_model_ratio = total_tokens > 0 ? (top_tokens / total_tokens) * 100 : 100;

    const model_breakdown = Object.entries(modelTokens).map(([model, stat], idx) => {
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
      return {
        model,
        tokens: stat.tokens,
        count: stat.count,
        percentage: total_tokens > 0 ? Number(((stat.tokens / total_tokens) * 100).toFixed(1)) : 0,
        color: colors[idx % colors.length]
      };
    });

    const heatmap_data = Object.entries(dateCounts).map(([date, stat]) => {
      let level = 0;
      if (stat.tokens > 5000) level = 4;
      else if (stat.tokens > 2000) level = 3;
      else if (stat.tokens > 500) level = 2;
      else if (stat.tokens > 0) level = 1;
      return {
        date,
        count: stat.count,
        tokens: stat.tokens,
        level
      };
    });

    const daily_trends = Object.entries(dailyModelMap).map(([date, models]) => ({
      date,
      display_date: date.substring(5),
      models,
      total_tokens: Object.values(models).reduce((a, b) => a + b, 0)
    }));

    return {
      total_tokens,
      prompt_tokens,
      completion_tokens,
      total_calls,
      total_skills_analyzed,
      active_days,
      streak_days: Math.min(active_days, 7),
      top_model,
      top_model_ratio: Number(top_model_ratio.toFixed(1)),
      heatmap_data,
      daily_trends,
      model_breakdown
    };
  }

  // ---------------- Category Syntheses API ----------------
  async getCategorySyntheses(): Promise<CategorySynthesisDoc[]> {
    await this.ensureReady();
    const list = await this.categorySynthesesCol.find({});
    return (list as any).items || (Array.isArray(list) ? list : []);
  }

  async getCategorySynthesis(key: string): Promise<CategorySynthesisDoc | null> {
    await this.ensureReady();
    const found = await this.categorySynthesesCol.findOne({ category_key: key } as any);
    return found as any;
  }

  async saveCategorySynthesis(data: CategorySynthesisDoc): Promise<void> {
    await this.ensureReady();
    const existing = await this.categorySynthesesCol.findOne({ category_key: data.category_key } as any);
    if (existing) {
      await this.categorySynthesesCol.updateOne({ category_key: data.category_key } as any, {
        $set: { ...data, updated_at: new Date().toISOString() }
      });
    } else {
      await this.categorySynthesesCol.insertOne({
        ...data,
        updated_at: new Date().toISOString()
      } as any);
    }
  }

  private async ensureReady() {
    if (!this.client || !gitliteStatus.isReady) {
      await this.init();
    }
  }
}

export const gitliteDb = new GitLiteService();
