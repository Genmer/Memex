import { ref } from 'vue'

const currentLocale = ref('zh')

const messages: Record<string, Record<string, string>> = {
  zh: {
    'app.title': 'Memex',
    'sidebar.coreSystem': '系统核心',
    'sidebar.dashboard': '核心大盘',
    'sidebar.aiStats': '使用统计',
    'sidebar.settings': '设置与扫描',
    'sidebar.zcodeAgent': 'ZCode 智能体',
    'sidebar.claudeCode': 'Claude Code',
    'sidebar.memexNative': 'Memex 原生',
    'sidebar.skills': '技能库',
    'sidebar.memories': '记忆库',
    'header.title.skills': '技能弹药库',
    'header.title.memories': '核心记忆',
    'header.title.settings': '系统配置',
    'header.title.dashboard': '控制台',
    'header.title.aiStats': '使用统计与 Token 消耗',
    'header.sync': '扫描本地数据',
    'header.syncing': '扫描中...',
    'hub.empty.title': '资产库为空',
    'hub.empty.desc': '当前没有任何技能资产。请运行本地扫描来索引您的 Agent 文件。',
    'settings.title': '引擎配置',
    'settings.desc': '自定义 Memex 引擎扫描 Agent 技能与记忆的本地路径。留空则使用系统默认路径。',
    'settings.zcodePath': 'ZCode 本地路径',
    'settings.claudePath': 'Claude 本地路径',
    'settings.save': '保存并应用',
    'memories.offline.title': '记忆模块未上线',
    'memories.offline.desc': '该 Agent 的神经网络记忆索引模块正在建设中，敬请期待后续更新。',
    'prompt.title': '欢迎来到 Memex',
    'prompt.desc': '看起来您的武器库目前空空如也。是否需要立即扫描本地目录中的 Agent 技能资产？',
    'prompt.cancel': '稍后再说',
    'prompt.confirm': '立即扫描',
    'search.placeholder': '搜索资产名称或内容...',
    'dashboard.title': '核心大盘',
    'dashboard.totalSkills': '技能总数',
    'dashboard.totalMemories': '核心记忆总数',
    'dashboard.zcodeAssets': 'ZCode 资产',
    'dashboard.claudeAssets': 'Claude 资产',
    'dashboard.recent': '最近更新',
    'dashboard.refresh': '刷新数据',
    'memories.empty': '暂无记忆文件。请在 memories 文件夹中添加 Markdown 文档并扫描。',
    'memories.view': '查看详情',
  },
  en: {
    'app.title': 'Memex',
    'sidebar.coreSystem': 'Core System',
    'sidebar.dashboard': 'Dashboard',
    'sidebar.aiStats': 'Usage & Tokens',
    'sidebar.settings': 'Settings & Scan',
    'sidebar.zcodeAgent': 'ZCode Agent',
    'sidebar.claudeCode': 'Claude Code',
    'sidebar.memexNative': 'Memex Native',
    'sidebar.skills': 'Skills',
    'sidebar.memories': 'Memories',
    'header.title.skills': 'Skill Arsenal',
    'header.title.memories': 'Core Memories',
    'header.title.settings': 'System Configuration',
    'header.title.dashboard': 'Dashboard',
    'header.title.aiStats': 'Usage & Token Analytics',
    'header.sync': 'Sync Local Data',
    'header.syncing': 'Synchronizing...',
    'hub.empty.title': 'No assets found',
    'hub.empty.desc': 'This vault is currently empty. Run a synchronization to index your local agent files.',
    'settings.title': 'Engine Configuration',
    'settings.desc': 'Customize the local paths where Memex engine scans for agent skills and memories. Leave blank to use system defaults.',
    'settings.zcodePath': 'Zcode Vault Path',
    'settings.claudePath': 'Claude Vault Path',
    'settings.save': 'Save & Apply',
    'memories.offline.title': 'Memory Module Offline',
    'memories.offline.desc': 'The neural memory indexing for this agent is still under construction. Check back in a future update.',
    'prompt.title': 'Welcome to Memex',
    'prompt.desc': 'It looks like your arsenal is currently empty. Would you like to scan your local directories for agent skills now?',
    'prompt.cancel': 'Maybe Later',
    'prompt.confirm': 'Scan Now',
    'search.placeholder': 'Search by name or content...',
    'dashboard.title': 'Core Dashboard',
    'dashboard.totalSkills': 'Total Skills',
    'dashboard.totalMemories': 'Total Memories',
    'dashboard.zcodeAssets': 'ZCode Assets',
    'dashboard.claudeAssets': 'Claude Assets',
    'dashboard.recent': 'Recently Updated',
    'dashboard.refresh': 'Refresh Data',
    'memories.empty': 'No memories found. Add markdown files to memories folder and scan.',
    'memories.view': 'View Details',
  }
}

export function useI18n() {
  const t = (key: string) => {
    return messages[currentLocale.value][key] || key
  }

  const toggleLanguage = () => {
    currentLocale.value = currentLocale.value === 'zh' ? 'en' : 'zh'
  }

  return {
    t,
    currentLocale,
    toggleLanguage
  }
}
