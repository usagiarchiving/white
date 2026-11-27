/* 웹앱 알림 (하시온 메시지·편지) — GitHub Actions(.github/workflows/letter.yml)가 보내는 알림을 받아 띄움
   + 잠긴 파일 풀기: 저장소의 데이터·사진은 암호화돼 있어서, 이 기기에 기억한 키로 풀어서 화면에 넘겨 줌
     (키가 없으면 못 품 → 비밀번호를 넣기 전에는 아무것도 안 보임)
   화면 캐시는 하지 않음 */
importScripts('vault-core.js?v=1');

const ICON = 'https://i.ibb.co/tTdNpX19/IMG-2904.jpg';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

/* ---------------- 잠긴 파일 풀기 ---------------- */
const SCOPE = new URL(self.registration.scope);
const SCOPE_PATH = SCOPE.pathname;
// <계정>.github.io/<저장소>/ → 원본 주소(raw.githubusercontent.com/계정/저장소/…)도 같이 풀어 줌
const OWNER = (/^([a-z0-9-]+)\.github\.io$/i.exec(SCOPE.hostname) || [])[1] || 'usagiarchiving';
const REPO = SCOPE_PATH.split('/').filter(Boolean)[0] || (OWNER + '.github.io');
const PREFIXES = ['data/', 'minjung/', 'diary/', 'myhome/', 'capture/'];
const TYPES = { json: 'application/json; charset=utf-8', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', heic: 'image/heic', avif: 'image/avif', txt: 'text/plain; charset=utf-8' };

let keyC = null;
async function getKey() {
    if (!keyC) keyC = await VaultCore.loadKey(SCOPE_PATH).catch(() => null);   // 없으면 기억하지 않고 다음에 다시 봄
    return keyC;
}
self.addEventListener('message', e => { if (e.data && e.data.vault) keyC = null; });   // 잠금·풀림이 바뀌면 다시 읽음

function repoPath(url) {
    if (url.origin === SCOPE.origin && url.pathname.startsWith(SCOPE_PATH)) return url.pathname.slice(SCOPE_PATH.length);
    if (url.hostname === 'raw.githubusercontent.com') {
        const p = url.pathname.split('/');           // ['', 계정, 저장소, 브랜치, ...경로]
        if ((p[1] || '').toLowerCase() === OWNER.toLowerCase() && p[2] === REPO) return p.slice(4).join('/');
    }
    return null;
}

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    let p = repoPath(url);
    if (p == null) return;
    try { p = decodeURIComponent(p); } catch (err) {}
    if (!PREFIXES.some(x => p.startsWith(x))) return;
    e.respondWith(unseal(req, url, p));
});

async function unseal(req, url, p) {
    const same = url.origin === SCOPE.origin;
    // 다른 주소(원본 저장소)는 내용을 읽을 수 있게 cors 로 다시 요청
    const res = same ? await fetch(req) : await fetch(req.url, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
    if (!res.ok || res.type === 'opaque') return res;
    const buf = new Uint8Array(await res.clone().arrayBuffer());
    if (!VaultCore.isSealed(buf)) return res;
    const key = await getKey();
    if (!key) return new Response('locked', { status: 423, headers: { 'Content-Type': 'text/plain' } });
    let out;
    try { out = await VaultCore.open(key, buf); }
    catch (err) { return new Response('cannot open', { status: 500, headers: { 'Content-Type': 'text/plain' } }); }
    const ext = (p.split('?')[0].split('.').pop() || '').toLowerCase();
    return new Response(out, { status: 200, headers: { 'Content-Type': TYPES[ext] || res.headers.get('Content-Type') || 'application/octet-stream', 'Cache-Control': 'no-store' } });
}

/* ---------------- 알림 ---------------- */
self.addEventListener('push', e => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
    e.waitUntil(Promise.all([
        self.registration.showNotification(d.title || '내 여보♡', {
            body: d.body || '', tag: d.tag || 'sion', renotify: true, icon: d.icon || ICON, badge: ICON, data: { tab: d.tab || 'Message' }
        }),
        // 열려 있는 화면에도 알려서 대화창을 바로 새로 불러오게
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => list.forEach(c => c.postMessage({ sionPush: d.tab || 'Message' })))
    ]));
});

// 알림을 누르면: 열린 화면이 있으면 그 화면에서 시온 창을, 없으면 새로 열어서
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const tab = (e.notification.data && e.notification.data.tab) || 'Message';
    const url = new URL('./?sion=' + tab + '#minjung', self.registration.scope).href;
    e.waitUntil((async () => {
        const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const c = list.find(x => x.url.startsWith(self.registration.scope));
        if (c) { await c.focus(); c.postMessage({ sion: tab }); return; }
        await self.clients.openWindow(url);
    })());
});
