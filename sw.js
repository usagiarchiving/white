/* 웹앱 알림 (하시온 메시지·편지) — GitHub Actions(.github/workflows/letter.yml)가 보내는 알림을 받아 띄움
   화면 캐시는 건드리지 않음 (fetch 처리 없음) */
const ICON = 'https://i.ibb.co/tTdNpX19/IMG-2904.jpg';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
    e.waitUntil(self.registration.showNotification(d.title || '내 여보♡', {
        body: d.body || '', tag: d.tag || 'sion', renotify: true, icon: d.icon || ICON, badge: ICON, data: { tab: d.tab || 'Message' }
    }));
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
