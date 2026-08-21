import type { RuntimeAdapter, FsAdapter, CryptoAdapter, CredentialAdapter } from '@gitlite/core';
import { invoke } from '@tauri-apps/api/core';

function sha1(str: string): string {
  const utf8 = unescape(encodeURIComponent(str));
  const words: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  const bitLength = utf8.length * 8;
  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  const w = new Array(80);
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, e = -1009589776;

  for (let i = 0; i < words.length; i += 16) {
    const olda = a, oldb = b, oldc = c, oldd = d, olde = e;
    for (let j = 0; j < 80; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const t = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
        w[j] = (t << 1) | (t >>> 31);
      }
      const t = (((a << 5) | (a >>> 27)) + e + w[j] + (
        j < 20 ? ((b & c) | (~b & d)) + 1518500249 :
        j < 40 ? (b ^ c ^ d) + 1859775393 :
        j < 60 ? ((b & c) | (b & d) | (c & d)) - 1894007588 :
        (b ^ c ^ d) - 899497514
      )) | 0;
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = t;
    }
    a = (a + olda) | 0;
    b = (b + oldb) | 0;
    c = (c + oldc) | 0;
    d = (d + oldd) | 0;
    e = (e + olde) | 0;
  }

  let hex = '';
  for (const val of [a, b, c, d, e]) {
    hex += (val >>> 0).toString(16).padStart(8, '0');
  }
  return hex;
}

/**
 * 跨环境通用 Smart Fetch：
 * 1. 优先使用 Tauri Rust 原生代理网络（零 CORS、零浏览器安全限制）；
 * 2. 纯 Web 浏览器预览时，自动走 Vite proxy 绕过 CORS。
 */
export async function smartFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
  const method = init?.method || (typeof input === 'object' && 'method' in input ? (input as any).method : 'GET') || 'GET';
  const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);

  const headersObj: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => { headersObj[k] = v; });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([k, v]) => { headersObj[k] = v; });
    } else {
      Object.assign(headersObj, init.headers);
    }
  }

  // 1. 深度适配 Gitee API 的私人令牌 (PAT) 认证协议 (无论 Tauri 还是 Web 均强制修正 Bearer 为标准 token 及 query 参数)
  if (urlStr.includes('gitee.com') || urlStr.includes('/proxy-gitee/')) {
    const rawToken = headersObj['Authorization'] || headersObj['authorization'] || '';
    if (rawToken) {
      const cleanToken = rawToken.replace(/^(Bearer|token)\s+/i, '').trim();
      if (cleanToken) {
        // Gitee 私人令牌规范：设置 Authorization: token <token> 并在 URL 追加 access_token 双重保险
        headersObj['Authorization'] = `token ${cleanToken}`;
        if (!urlStr.includes('access_token=')) {
          const separator = urlStr.includes('?') ? '&' : '?';
          urlStr = `${urlStr}${separator}access_token=${encodeURIComponent(cleanToken)}`;
        }
      }
    }
    // 移除前端受限的 User-Agent
    delete headersObj['User-Agent'];
    delete headersObj['user-agent'];
  }

  // 2. 如果在 Tauri 桌面环境中运行，优先使用 Rust 后端 reqwest 代理
  if (isTauri) {
    try {
      let bodyStr: string | undefined = undefined;
      if (init?.body) {
        bodyStr = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
      }

      const res: any = await invoke('proxy_http_request', {
        options: {
          url: urlStr,
          method,
          headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
          body: bodyStr
        }
      });

      return new Response(res.body, {
        status: res.status,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (tauriErr) {
      console.warn('[SmartFetch] Tauri proxy failed, fallback to native fetch:', tauriErr);
    }
  }

  // 3. Web 浏览器模式：仅在本地开发环境 (DEV) 下才通过 Vite dev proxy 代理
  let targetUrl = urlStr;
  const isDev = Boolean((import.meta as any).env?.DEV);
  if (typeof window !== 'undefined' && !isTauri && isDev) {
    if (targetUrl.startsWith('https://github.com/')) {
      targetUrl = targetUrl.replace('https://github.com/', '/proxy-github/');
    } else if (targetUrl.startsWith('https://api.github.com/')) {
      targetUrl = targetUrl.replace('https://api.github.com/', '/proxy-github-api/');
    } else if (targetUrl.startsWith('https://gitee.com/')) {
      targetUrl = targetUrl.replace('https://gitee.com/', '/proxy-gitee/');
    }
  }

  const fetchInit: RequestInit = {
    ...init,
    headers: Object.keys(headersObj).length > 0 ? headersObj : init?.headers
  };


  return window.fetch(targetUrl, fetchInit);
}




export function createBrowserRuntime(): RuntimeAdapter {
  const fsStorage = new Map<string, string>();

  const fs: FsAdapter = {
    async readFile(path: string): Promise<string> {
      const memVal = fsStorage.get(path);
      if (memVal !== undefined) return memVal;
      const lsVal = localStorage.getItem(`gitlite_fs_${path}`);
      if (lsVal !== null) return lsVal;
      throw new Error(`ENOENT: file not found at ${path}`);
    },
    async writeFile(path: string, data: string): Promise<void> {
      fsStorage.set(path, data);
      try {
        localStorage.setItem(`gitlite_fs_${path}`, data);
      } catch (e) {
        // quota exceeded fallback to in-memory map
      }
    },
    async appendFile(path: string, data: string): Promise<void> {
      let existing = '';
      try {
        existing = await this.readFile(path);
      } catch (e) {}
      await this.writeFile(path, existing + data);
    },
    async exists(path: string): Promise<boolean> {
      if (fsStorage.has(path)) return true;
      return localStorage.getItem(`gitlite_fs_${path}`) !== null;
    },
    async mkdir(_dir: string): Promise<void> {
      // Browser directory is virtual
    }
  };

  const cryptoAdapter: CryptoAdapter = {
    randomBytes(n: number): Uint8Array {
      const arr = new Uint8Array(n);
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(arr);
      } else {
        for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    sha1hex(s: string): string {
      return sha1(s);
    }
  };

  const credential: CredentialAdapter = {
    async set(key: string, value: string): Promise<void> {
      localStorage.setItem(`gitlite_cred_${key}`, value);
    },
    async get(key: string): Promise<string | null> {
      return localStorage.getItem(`gitlite_cred_${key}`);
    },
    async delete(key: string): Promise<void> {
      localStorage.removeItem(`gitlite_cred_${key}`);
    }
  };

  return {
    fs,
    crypto: cryptoAdapter,
    credential,
    fetch: smartFetch,
    now: () => Date.now(),
    onExit: (fn: () => void | Promise<void>) => {
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          try {
            fn();
          } catch (e) {}
        });
      }
    }
  };
}
