<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn"
      @click.self="$emit('close')"
    >
      <div 
        class="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto relative animate-scaleUp"
      >
        <!-- Header -->
        <div class="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/95 shrink-0 z-10">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-neutral-100 flex items-center gap-2">
                GitLite 云端数据库
                <span class="text-xs px-2 py-0.5 rounded-full font-mono font-normal" :class="statusBadgeClass">
                  {{ statusText }}
                </span>
              </h3>
              <p class="text-xs text-neutral-400">零服务器成本 · 网页授权 · 自动建仓 · 多端漫游</p>
            </div>
          </div>
          <button 
            @click="$emit('close')" 
            class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors flex items-center justify-center"
            title="关闭 (ESC)"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center px-6 pt-3 border-b border-neutral-800 bg-neutral-900/60 gap-4">
          <button 
            @click="activeModalTab = 'cloud'"
            class="pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all"
            :class="activeModalTab === 'cloud' ? 'text-indigo-400 border-indigo-500 font-bold' : 'text-neutral-400 border-transparent hover:text-neutral-200'"
          >
            <span>☁️ 云端数据库同步</span>
          </button>
          <button 
            @click="activeModalTab = 'mobile'"
            class="pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all relative"
            :class="activeModalTab === 'mobile' ? 'text-indigo-400 border-indigo-500 font-bold' : 'text-neutral-400 border-transparent hover:text-neutral-200'"
          >
            <span>📱 在 iPhone / 手机上使用</span>
            <span class="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">扫码直连</span>
          </button>
        </div>

        <!-- Body (Scrollable) -->
        <div class="p-6 overflow-y-auto space-y-5 text-neutral-300 text-sm flex-1">
          
          <!-- ================= TAB 2: MOBILE / IPHONE GUIDE ================= -->
          <div v-if="activeModalTab === 'mobile'" class="space-y-4 animate-fadeIn">
            <!-- QR Card -->
            <div class="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-5 flex flex-col items-center text-center space-y-3.5">
              <div class="text-xs text-neutral-300 font-medium">iPhone / 手机扫一扫立即打开 Memex</div>
              
              <!-- QR Image -->
              <div class="p-2.5 bg-white rounded-2xl shadow-xl shadow-black/60 inline-block">
                <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="Mobile QR Code" class="w-40 h-40 rounded-xl" />
                <div v-else class="w-40 h-40 flex items-center justify-center text-neutral-500 text-xs font-mono">
                  生成二维码中...
                </div>
              </div>

              <!-- Address Box -->
              <div class="w-full bg-neutral-900 border border-neutral-700/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                <div class="font-mono text-neutral-200 truncate select-all">{{ mobileWebUrl }}</div>
                <div class="flex items-center gap-1 shrink-0">
                  <button 
                    @click="copyMobileUrl" 
                    class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] transition-colors">
                    📋 复制
                  </button>
                  <button 
                    @click="openMobileUrlInBrowser" 
                    class="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-[11px] transition-colors">
                    🌐 打开
                  </button>
                </div>
              </div>
            </div>

            <!-- 3-Step Instruction -->
            <div class="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 space-y-2.5 text-xs">
              <div class="font-bold text-neutral-200 flex items-center gap-1.5">
                <span>📲 如何在 iPhone 上作为独立 App 运行？</span>
              </div>
              <div class="space-y-2 text-neutral-400">
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <div><b>扫码打开</b>：使用 iPhone 系统相机或微信扫描上方二维码打开网页。</div>
                </div>
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <div><b>添加到主屏幕</b>：在 Safari 底部点击<b>「分享」图标</b>（带箭头方块），向下滑动选择<b>「添加到主屏幕」</b>。</div>
                </div>
                <div class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <div><b>全端互通</b>：在手机端点击顶部登录同一个 Gitee 账号，备忘录与技能全自动双向秒级同步！</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= TAB 1: CLOUD STORAGE & SYNC ================= -->
          <template v-else>
          <!-- ================= SCENARIO A: ALREADY CONNECTED ================= -->
          <div v-if="gitliteStatus.provider !== 'memory'" class="space-y-4 animate-fadeIn">

            <!-- Connected Success Banner -->
            <div class="bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/40 rounded-2xl p-5 space-y-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="relative flex h-3 w-3">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </div>
                  <div>
                    <h4 class="font-bold text-sm text-neutral-100">云端实时同步已就绪</h4>
                    <p class="text-xs text-neutral-400">数据变动将自动提交至您的私有 Git 仓库</p>
                  </div>
                </div>
                <span class="text-xs font-mono font-bold uppercase px-2.5 py-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-lg">
                  {{ gitliteStatus.provider }}
                </span>
              </div>

              <div class="grid grid-cols-2 gap-3 text-xs bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800">
                <div>
                  <span class="text-neutral-400">私有数据库仓库:</span>
                  <div class="font-mono text-neutral-200 truncate mt-0.5 font-medium">{{ gitliteStatus.owner }}/{{ gitliteStatus.repo }}</div>
                </div>
                <div>
                  <span class="text-neutral-400">专用数据库分支:</span>
                  <div class="font-mono text-neutral-200 truncate mt-0.5 font-medium">gitlite/{{ gitliteStatus.database }}</div>
                </div>
                <div>
                  <span class="text-neutral-400">最近同步时间:</span>
                  <div class="font-mono text-neutral-200 mt-0.5">{{ gitliteStatus.lastSyncedAt || '刚刚' }}</div>
                </div>
                <div>
                  <span class="text-neutral-400">最新 Commit SHA:</span>
                  <div class="font-mono text-indigo-400 truncate mt-0.5">{{ gitliteStatus.lastCommitSha ? gitliteStatus.lastCommitSha.substring(0, 7) : 'Synced' }}</div>
                </div>
              </div>

              <div class="space-y-2 pt-1">
                <button 
                  @click="handleManualSync"
                  :disabled="isManualSyncing"
                  class="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50">
                  <svg :class="isManualSyncing ? 'animate-spin' : ''" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{{ isManualSyncing ? '正在主动双向同步中...' : '⚡ 立即主动同步云端 (Push & Pull)' }}</span>
                </button>

                <div class="flex items-center gap-2">
                  <button 
                    @click="handleReconfig"
                    class="flex-1 py-2 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition-colors">
                    🔄 重新配置账号
                  </button>
                  <button 
                    @click="handleResetToMemory"
                    class="py-2 px-3.5 bg-neutral-800/80 hover:bg-red-950/50 hover:text-red-300 text-neutral-400 rounded-xl text-xs font-medium transition-colors border border-transparent hover:border-red-500/30">
                    断开云端
                  </button>
                </div>
              </div>
            </div>
          </div>


          <!-- ================= SCENARIO B: ONE-CLICK OAUTH LOGIN ================= -->
          <div v-else class="space-y-4 animate-fadeIn">
            
            <!-- Direct One-Click Cards -->
            <div v-if="!isAuthenticating" class="space-y-3.5">
              <!-- Visible Persistent Error Banner -->
              <div v-if="authErrorMessage" class="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-start justify-between gap-2 animate-fadeIn">
                <div class="flex items-start gap-2">
                  <span class="text-base leading-none shrink-0 mt-0.5">⚠️</span>
                  <div>
                    <div class="font-bold text-red-100">授权连接未完成</div>
                    <div class="text-[11px] text-red-300/90 mt-0.5">{{ authErrorMessage }}</div>
                  </div>
                </div>
                <button @click="authErrorMessage = ''" class="text-red-400 hover:text-red-200 text-xs font-bold shrink-0 p-1">✕</button>
              </div>

              <div class="flex items-center justify-between">
                <h4 class="font-semibold text-neutral-100 flex items-center gap-1.5 text-xs">
                  <span>🔐 网页授权一键登录（免 Token · 自动建仓）</span>
                </h4>
                <span class="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">官方应用已就绪</span>
              </div>

              <!-- Gitee One-Click OAuth Button (Primary) -->
              <button 
                @click="startGiteeAuth"

                class="w-full flex items-center justify-between p-4 rounded-2xl border border-red-500/50 bg-gradient-to-r from-red-950/50 via-red-900/20 to-neutral-900 hover:border-red-400/80 hover:from-red-950/70 transition-all shadow-xl shadow-red-950/40 group text-left">
                <div class="flex items-center gap-3.5">
                  <div class="w-11 h-11 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-xl shadow-md shadow-red-600/30 group-hover:scale-105 transition-transform">
                    G
                  </div>
                  <div>
                    <div class="font-bold text-sm text-neutral-100 flex items-center gap-2">
                      <span>登录 Gitee 码云账号</span>
                      <span class="text-[10px] bg-red-500/25 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30 font-medium">国内免翻 · 极速秒连</span>
                    </div>
                    <div class="text-xs text-neutral-400 mt-0.5">点击打开网页，点「同意授权」即自动建私有库与分支</div>
                  </div>
                </div>

                <div class="flex items-center text-red-400 group-hover:text-red-300 group-hover:translate-x-1 transition-all">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>

              <!-- GitHub Device Flow Button -->
              <button 
                @click="startGitHubAuth"
                class="w-full flex items-center justify-between p-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 hover:bg-neutral-800/80 transition-all group text-left">
                <div class="flex items-center gap-3.5">
                  <div class="w-11 h-11 rounded-xl bg-neutral-800 border border-neutral-700 text-white flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                    <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  </div>
                  <div>
                    <div class="font-bold text-sm text-neutral-100 flex items-center gap-2">
                      <span>登录 GitHub 账号</span>
                      <span class="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.2 rounded border border-neutral-700">国际节点</span>
                    </div>
                    <div class="text-xs text-neutral-400 mt-0.5">Device Flow 免密网页确认</div>
                  </div>
                </div>

                <div class="flex items-center text-neutral-400 group-hover:text-neutral-200 group-hover:translate-x-1 transition-all">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>

              <!-- Gitee / GitHub Token Direct Connect (Best for Web / Mobile) -->
              <div class="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="font-bold text-xs text-neutral-100 flex items-center gap-1.5">
                    <span>🔑 网页 / 手机端 Token 极速直连</span>
                    <span class="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">推荐</span>
                  </div>
                  <a 
                    href="https://gitee.com/profile/personal_access_tokens/new" 
                    target="_blank" 
                    class="text-[11px] text-indigo-400 hover:text-indigo-300 underline flex items-center gap-0.5"
                  >
                    <span>1秒获取 Gitee 令牌 ↗</span>
                  </a>
                </div>

                <div class="flex items-center gap-2">
                  <input 
                    v-model="directTokenInput" 
                    type="password"
                    placeholder="在此粘贴 Gitee 私人令牌 Token (仅需 projects 权限)"
                    class="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-neutral-100 font-mono focus:outline-none focus:border-indigo-500 placeholder-neutral-500"
                  />
                  <button 
                    @click="handleDirectTokenConnect"
                    :disabled="isConnectingToken || !directTokenInput.trim()"
                    class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    <svg v-if="isConnectingToken" class="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>{{ isConnectingToken ? '连接中...' : '连接' }}</span>
                  </button>
                </div>
                <div class="text-[11px] text-neutral-400">
                  💡 网页与手机端无需本地 18365 端口服务，输入 Token 即可自动识别身份与创建私有数据库！
                </div>
              </div>

              <!-- App Details Accordion (For custom needs) -->
              <div class="pt-2">
                <button 
                  @click="showCustomApp = !showCustomApp"
                  class="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 font-medium transition-colors">
                  <span>{{ showCustomApp ? '收起应用参数' : '⚙️ 查看 / 自定义 gitlite 应用凭据' }}</span>
                </button>


                <div v-if="showCustomApp" class="mt-3 bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 space-y-2.5 animate-fadeIn text-xs">
                  <div class="text-[11px] text-neutral-400">已内置预置 <span class="font-mono text-neutral-200 font-bold">gitlite</span> 官方应用凭据 (回调端口 18365)：</div>
                  <div>
                    <label class="block text-[10px] text-neutral-400 mb-0.5">gitlite Client ID</label>
                    <input 
                      v-model="giteeClientId" 
                      class="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-red-500" />
                  </div>
                  <div>
                    <label class="block text-[10px] text-neutral-400 mb-0.5">gitlite Client Secret</label>
                    <input 
                      v-model="giteeClientSecret" 
                      type="password"
                      class="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 font-mono focus:outline-none focus:border-red-500" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Authenticating Waiting Screen (Dynamic Steps) -->
            <div v-else class="space-y-4 py-4 animate-fadeIn text-center">
              
              <!-- GitHub Device Flow Code -->
              <div v-if="deviceCodeInfo" class="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-5 space-y-3.5 animate-fadeIn">
                <div class="text-xs text-indigo-200 font-medium">请在打开的 GitHub 页面中确认授权码：</div>
                
                <div class="flex items-center justify-center gap-2">
                  <div class="font-mono text-3xl font-black tracking-widest text-white bg-neutral-950 px-5 py-2.5 rounded-xl border border-indigo-500/50 select-all">
                    {{ deviceCodeInfo.code }}
                  </div>
                  <button 
                    @click="copyCodeAndOpenUrl"
                    class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
                  >
                    <span>重新打开页面</span>
                  </button>
                </div>

                <div class="text-xs text-neutral-400 flex items-center justify-center gap-2 pt-2">
                  <svg class="animate-spin h-4 w-4 text-indigo-400" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>等待在浏览器中授权确认... 确认后将自动完成绑定</span>
                </div>
              </div>

              <!-- Gitee Dynamic Progress Screen -->
              <div v-else class="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-6 space-y-4">
                <div class="w-12 h-12 mx-auto rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                  <svg class="animate-spin h-6 w-6 text-red-500" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
                
                <div class="pt-3 flex flex-col items-center gap-2.5">
                  <button 
                    @click="handleManualEnterCode"
                    class="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 active:scale-[0.99]">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                    <span>📋 贴入授权码 Code (在成功页复制后点此)</span>
                  </button>
                  
                  <button 
                    @click="isAuthenticating = false"
                    class="text-xs text-neutral-400 hover:text-neutral-200 underline pt-0.5">
                    取消并返回
                  </button>
                </div>
              </div>

            </div>


          </div>

          <!-- Section: Data Safety & Full Backup -->
          <div class="pt-4 border-t border-neutral-800 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="font-semibold text-neutral-200 flex items-center gap-2 text-xs">
                <span>🛡️ 数据安全与备份（双保险）</span>
              </h4>
              <span class="text-[11px] text-emerald-400 font-mono">无损保留机制已生效</span>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-1">
              <button 
                @click="handleExportBackup"
                class="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-neutral-700 bg-neutral-800/40 hover:bg-neutral-800 text-xs text-neutral-200 transition-all">
                <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                导出全量 JSON 备份
              </button>

              <label class="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-neutral-700 bg-neutral-800/40 hover:bg-neutral-800 text-xs text-neutral-200 cursor-pointer transition-all">
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                导入 JSON 备份
                <input type="file" accept=".json" @change="handleImportBackup" class="hidden" />
              </label>
            </div>
          </div>
          </template>

        </div>

        <!-- Footer -->
        <div class="px-6 py-3 border-t border-neutral-800 bg-neutral-900/95 flex justify-end shrink-0">
          <button @click="$emit('close')" class="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold transition-colors">
            完成
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import QRCode from 'qrcode';
import { gitliteStatus, gitliteDb } from '../services/gitliteDb';

import { exportFullJsonBackup, importFullJsonBackup } from '../services/dbMigration';
import { useToast } from '../composables/useToast';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'refresh'): void;
}>();

const toast = useToast();

const activeModalTab = ref<'cloud' | 'mobile'>('cloud');
const mobileWebUrl = ref('https://genmer.github.io/Memex/');
const qrCodeDataUrl = ref('');

async function generateQrCode() {
  try {
    qrCodeDataUrl.value = await QRCode.toDataURL(mobileWebUrl.value, {
      width: 320,
      margin: 1.5,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('QR Code error:', err);
  }
}

watch([() => props.isOpen, activeModalTab], ([open, tab]) => {
  if (open && tab === 'mobile' && !qrCodeDataUrl.value) {
    generateQrCode();
  }
});

function copyMobileUrl() {
  navigator.clipboard.writeText(mobileWebUrl.value);
  toast.success('✓ 手机访问地址已复制到剪贴板！');
}

async function openMobileUrlInBrowser() {
  if (typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__)) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', { url: mobileWebUrl.value });
      return;
    } catch(e) {}
  }
  window.open(mobileWebUrl.value, '_blank');
}


const isAuthenticating = ref(false);
const showCustomApp = ref(false);
const authErrorMessage = ref('');

const directTokenInput = ref(localStorage.getItem('memex_gitlite_token') || '');
const isConnectingToken = ref(false);

async function handleDirectTokenConnect() {
  if (!directTokenInput.value.trim() || isConnectingToken.value) return;
  isConnectingToken.value = true;
  authErrorMessage.value = '';
  try {
    const raw = directTokenInput.value.trim();
    const isGithub = raw.startsWith('ghp_') || raw.startsWith('github_pat_');
    const provider = isGithub ? 'github' : 'gitee';
    
    await gitliteDb.loginAndConnectWithToken(raw, provider);
    emit('refresh');
    toast.success(`🎉 成功直连 ${provider === 'gitee' ? 'Gitee 码云' : 'GitHub'}！私有数据库已就绪`);
  } catch (err: any) {
    const msg = err.message || String(err);
    authErrorMessage.value = msg;
    toast.error(`Token 连接失败: ${msg}`);
  } finally {
    isConnectingToken.value = false;
  }
}

const currentAuthTitle = ref('正在等待 Gitee 网页授权确认...');


const currentAuthDesc = ref('请在弹出的 Gitee 页面点击「同意授权」。授权完成后窗口会自动关闭并完成数据库挂载！');

const callbackUrl = ref('http://127.0.0.1:18365/callback');

// 默认直接预填用户已有的 Gitee 官方配置（18365端口）
const DEFAULT_CLIENT_ID = '21abcc19023889aaf5ceb4fca91f07a539e2c887e6f3eb54bdf14edc9c64f41a';
const DEFAULT_CLIENT_SECRET = 'ab992f41d821b04c25ecd1f3dadeeb6a9aeadbb2a679aae43495f43fdc458b56';

const giteeClientId = ref(localStorage.getItem('memex_gitlite_gitee_client_id') || DEFAULT_CLIENT_ID);
const giteeClientSecret = ref(localStorage.getItem('memex_gitlite_gitee_client_secret') || DEFAULT_CLIENT_SECRET);

const deviceCodeInfo = ref<{ code: string; url: string } | null>(null);

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

const statusBadgeClass = computed(() => {
  if (gitliteStatus.syncState === 'syncing') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
  if (gitliteStatus.provider !== 'memory') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  return 'bg-neutral-700/50 text-neutral-300 border border-neutral-600/30';
});

const statusText = computed(() => {
  if (gitliteStatus.syncState === 'syncing') return '同步中';
  if (gitliteStatus.provider === 'github') return 'GitHub 实时同步';
  if (gitliteStatus.provider === 'gitee') return 'Gitee 码云 实时同步';
  return 'Local 本地内存';
});

const isManualSyncing = ref(false);

async function handleManualSync() {
  if (isManualSyncing.value) return;
  isManualSyncing.value = true;
  try {
    const res = await gitliteDb.syncNow();
    emit('refresh');
    toast.success(res.message);
  } catch (err: any) {
    toast.error(`同步失败: ${err.message || err}`);
  } finally {
    isManualSyncing.value = false;
  }
}

function handleReconfig() {
  handleResetToMemory();
}

async function handleManualEnterCode() {
  let code = '';
  try {
    const clipText = (await navigator.clipboard.readText()).trim();
    if (clipText && clipText.length >= 8 && !clipText.includes(' ') && !clipText.includes('\n')) {
      code = clipText;
      toast.info(`已自动从剪贴板读取授权码: ${code.substring(0, 6)}...`);
    }
  } catch(e) {}

  if (!code) {
    const manual = prompt('请粘贴在 Gitee 成功页复制的授权码 Code (或地址栏中的 ?code=xxx 参数):');
    if (manual && manual.trim()) code = manual.trim();
  }

  if (code) {
    toast.success(`🎉 授权码注入成功！正在连接数据库...`);
    localStorage.setItem('memex_oauth_callback_code', code);
    window.dispatchEvent(new CustomEvent('memex:oauth:manual_code', { detail: code }));
  }
}




async function startGiteeAuth() {
  authErrorMessage.value = '';
  isAuthenticating.value = true;
  currentAuthTitle.value = '正在等待 Gitee 网页授权确认...';
  currentAuthDesc.value = '请在弹出的 Gitee 页面点击「同意授权」。授权完成后窗口会自动关闭并完成数据库挂载！';

  const clientId = giteeClientId.value.trim() || DEFAULT_CLIENT_ID;
  const clientSecret = giteeClientSecret.value.trim() || DEFAULT_CLIENT_SECRET;

  localStorage.setItem('memex_gitlite_gitee_client_id', clientId);
  localStorage.setItem('memex_gitlite_gitee_client_secret', clientSecret);

  try {
    await gitliteDb.loginAndConnectWithGiteeOAuth({
      clientId,
      clientSecret,
      redirectUri: callbackUrl.value,
      onProgress: (stage, message) => {
        if (stage === 'exchanging_token') {
          currentAuthTitle.value = '已收到授权码，正在换取安全令牌...';
          currentAuthDesc.value = '正在与 Gitee 官方服务器安全握手并建立连接通道...';
        } else if (stage === 'identifying_user') {
          currentAuthTitle.value = '已获取安全令牌，正在识别账号身份...';
          currentAuthDesc.value = '正在读取 Gitee 用户信息...';
        } else if (stage === 'initializing_repo') {
          currentAuthTitle.value = '正在初始化私有仓库与数据库分支...';
          currentAuthDesc.value = message;
        }
      }
    });
    emit('refresh');
    toast.success('🎉 成功连接 Gitee 码云！私有数据库已就绪');
  } catch (err: any) {
    const msg = err.message || String(err);
    authErrorMessage.value = msg;
    toast.error(`Gitee 登录授权失败: ${msg}`);
  } finally {
    isAuthenticating.value = false;
  }
}


async function startGitHubAuth() {
  isAuthenticating.value = true;
  deviceCodeInfo.value = null;

  try {
    await gitliteDb.loginAndConnectWithGitHub(undefined, async (userCode, verifyUrl) => {
      deviceCodeInfo.value = { code: userCode, url: verifyUrl };
      try {
        navigator.clipboard.writeText(userCode);
        if (typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__)) {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('open_external_url', { url: verifyUrl });
        } else {
          window.open(verifyUrl, '_blank');
        }
      } catch (e) {}
    });

    deviceCodeInfo.value = null;
    emit('refresh');
    toast.success(`🎉 登录成功！已自动挂载 ${gitliteStatus.owner}/${gitliteStatus.repo} 数据库`);
  } catch (err: any) {
    toast.error(`GitHub 登录失败: ${err.message || err}`);
  } finally {
    isAuthenticating.value = false;
    deviceCodeInfo.value = null;
  }
}

async function copyCodeAndOpenUrl() {
  if (!deviceCodeInfo.value) return;
  navigator.clipboard.writeText(deviceCodeInfo.value.code);
  if (typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__)) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', { url: deviceCodeInfo.value.url });
      return;
    } catch (e) {}
  }
  window.open(deviceCodeInfo.value.url, '_blank');
}


async function handleResetToMemory() {
  localStorage.removeItem('memex_gitlite_provider');
  localStorage.removeItem('memex_gitlite_token');
  await gitliteDb.init({ provider: 'memory', force: true });
  emit('refresh');
  toast.info('已断开云端连接，当前已切换至本地纯内存模式');
}

async function handleExportBackup() {
  try {
    const jsonStr = await exportFullJsonBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memex-backup-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('全量 JSON 备份已成功导出');
  } catch (err: any) {
    toast.error(`导出失败: ${err.message}`);
  }
}

async function handleImportBackup(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    await importFullJsonBackup(text);
    toast.success('备份数据导入成功！');
    emit('refresh');
  } catch (err: any) {
    toast.error(`导入失败: ${err.message}`);
  }
}

</script>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fadeIn {
  animation: fadeIn 0.15s ease-out forwards;
}
.animate-scaleUp {
  animation: scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
