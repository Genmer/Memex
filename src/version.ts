import pkg from '../package.json'

/**
 * 全局唯一单一事实来源（Single Source of Truth）版本号
 * 只要更新根目录 package.json 的 version，全站所有页面、侧边栏、关于弹窗自动同步生效！
 */
export const APP_VERSION = `v${pkg.version}`
