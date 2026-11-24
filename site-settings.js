/* ==========================================================================
   홈페이지 설정 (토끼굴 메인 화면 헤더의 톱니바퀴)
   - 카테고리: 순서 · 메뉴 이름 · 메뉴에 보이기 · 홈 화면(웹앱) 사진과 이름
   - 처음 열 화면
   저장: data/site.json  (사진: data/images/appicons/)
   { "start": "home", "categories": [ { "hash", "name", "active", "icon", "app" } ] }   ← 배열 순서 = 메뉴 순서
   홈 화면에 추가할 때는 그때 보고 있는 카테고리의 사진·이름이 쓰임 (카테고리를 옮길 때마다 바꿔 둠)
   ========================================================================== */
(function () {
    var FILE = 'data/site.json';
    var CACHE = 'site_settings';
    var ICON_DIR = 'data/images/appicons/';
    var DEFAULT_ICON = 'https://i.ibb.co/tTdNpX19/IMG-2904.jpg';
    var BASE = CATEGORIES.map(function (c) { return Object.assign({}, c); });   // index.html 기본값
    var cfg = null;

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function readCache() { try { return JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch (e) { return null; } }
    function writeCache(c) { try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch (e) {} }
    var baseUrl = function () { return new URL('./', location.href).href; };
    // 저장소 안 경로는 이 사이트 주소로, http 주소는 그대로
    function iconUrl(p) { return !p ? '' : /^https?:/.test(p) ? p : new URL(p, baseUrl()).href; }

    // 설정을 CATEGORIES(메뉴판)에 반영 — 설정에 없는 새 카테고리는 뒤에 그대로
    function apply(c) {
        cfg = c && Array.isArray(c.categories) ? c : null;
        var list = [], left = {};
        BASE.forEach(function (b) { left[b.hash] = b; });
        if (cfg) cfg.categories.forEach(function (x) {
            var b = left[x.hash]; if (!b) return;
            list.push(Object.assign({}, b, { name: x.name || b.name, active: x.hash === 'home' ? true : (typeof x.active === 'boolean' ? x.active : b.active), icon: x.icon || '', app: x.app || '' }));
            delete left[x.hash];
        });
        BASE.forEach(function (b) { if (left[b.hash]) list.push(Object.assign({}, b)); });
        CATEGORIES.length = 0;
        list.forEach(function (x) { CATEGORIES.push(x); });
        window.SITE_START = (cfg && cfg.start) || 'home';
    }
    apply(readCache());    // 화면 그리기 전에 이 기기에 기억한 설정부터

    /* ---------------- 홈 화면(웹앱) 사진·이름 ---------------- */
    function setLink(rel, href) {
        var el = document.querySelector('link[rel="' + rel + '"]');
        if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
        if (el.href !== href) el.href = href;
    }
    function setMeta(name, content) {
        var el = document.querySelector('meta[name="' + name + '"]');
        if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
        el.content = content;
    }
    function identity(hash) {
        var home = CATEGORIES.find(function (c) { return c.hash === 'home'; }) || {};
        var cat = CATEGORIES.find(function (c) { return c.hash === hash; }) || home;
        var icon = iconUrl(cat.icon) || iconUrl(home.icon) || DEFAULT_ICON;
        var name = cat.app || (cat.hash === 'home' ? '토끼굴' : cat.name) || '토끼굴';
        setLink('apple-touch-icon', icon);
        setLink('icon', icon);
        setMeta('apple-mobile-web-app-title', name);
        var base = baseUrl();
        var manifest = {
            name: name, short_name: name, start_url: base + (cat.hash && cat.hash !== 'home' ? '?c=' + cat.hash + '#' + cat.hash : ''), scope: base,
            display: 'standalone', background_color: '#fafafa', theme_color: '#fafafa',
            icons: [{ src: icon, sizes: '512x512', type: /\.png(\?|$)/i.test(icon) ? 'image/png' : 'image/jpeg', purpose: 'any' }]
        };
        setLink('manifest', 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifest)));
    }
    var current = function () { return location.hash.replace('#', '') || 'home'; };

    /* ---------------- 저장소에서 최신 설정 받기 ---------------- */
    function load() {
        if (!window.ghdb) return Promise.resolve();
        return window.ghdb.repo().readJSON(FILE, null).then(function (c) {
            if (!c) return;
            if (JSON.stringify(c) === JSON.stringify(readCache())) return;
            writeCache(c); apply(c);
            if (window.renderMenu) window.renderMenu();
            identity(current());
        }).catch(function (e) { console.warn('site settings', e); });
    }

    /* ---------------- 설정 창 ---------------- */
    var GEAR = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
    var st = null;   // 창이 열려 있는 동안의 고친 내용

    // 실제로 있는 페이지만 (메뉴에서 꺼 둔 것 중 파일이 없는 건 빼고 보여 줌)
    function exists(c) {
        if (c.active) return Promise.resolve(true);
        return fetch(c.path, { method: 'HEAD', cache: 'no-store' }).then(function (r) { return r.ok; }, function () { return false; });
    }
    function open() {
        Promise.all(CATEGORIES.map(exists)).then(function (ok) {
            st = {
                start: window.SITE_START || 'home',
                rows: CATEGORIES.filter(function (c, i) { return ok[i]; }).map(function (c) {
                    return { hash: c.hash, def: (BASE.find(function (b) { return b.hash === c.hash; }) || c).name, name: c.name, active: c.active, icon: c.icon || '', app: c.app || '', file: null, preview: '' };
                }),
                hidden: CATEGORIES.filter(function (c, i) { return !ok[i]; }).map(function (c) { return c.hash; })
            };
            render();
        });
    }
    function close() { var bg = document.getElementById('ss-bg'); if (bg) bg.remove(); st = null; }
    function rowHtml(r, i, n) {
        var src = r.preview || iconUrl(r.icon) || DEFAULT_ICON;
        var home = r.hash === 'home';
        return '<div class="ss-row' + (r.active ? '' : ' off') + '" data-i="' + i + '">' +
            '<button class="ss-icon" data-act="icon" title="홈 화면 사진"><img src="' + esc(src) + '" alt=""></button>' +
            '<div class="ss-fields">' +
                '<input data-f="name" value="' + esc(r.name) + '" placeholder="' + esc(r.def) + '">' +
                '<input data-f="app" value="' + esc(r.app) + '" placeholder="홈 화면 이름 · ' + esc(home ? '토끼굴' : (r.name || r.def)) + '">' +
            '</div>' +
            '<div class="ss-move"><button data-act="up" ' + (i ? '' : 'disabled') + '>▲</button><button data-act="down" ' + (i < n - 1 ? '' : 'disabled') + '>▼</button></div>' +
            '<label class="ss-switch' + (home ? ' lock' : '') + '" title="' + (home ? '메인은 항상 보여요' : '메뉴에 보이기') + '"><input type="checkbox" data-f="active" ' + (r.active ? 'checked' : '') + (home ? ' disabled' : '') + '><i></i></label>' +
            '</div>';
    }
    function render() {
        var bg = document.getElementById('ss-bg');
        if (!bg) {
            bg = document.createElement('div'); bg.id = 'ss-bg'; bg.className = 'ss-bg';
            document.body.appendChild(bg);
            bind(bg);
        }
        var list = bg.querySelector('.ss-list'), top = list ? list.scrollTop : 0;
        var actives = st.rows.filter(function (r) { return r.active; });
        bg.innerHTML = '<div class="ss-card" role="dialog" aria-label="설정">' +
            '<div class="ss-head"><b>설정</b><button class="ss-x" data-act="close" aria-label="닫기">✕</button></div>' +
            '<div class="ss-scroll">' +
                '<div class="ss-sec">카테고리</div>' +
                '<p class="ss-hint">순서 · 메뉴 이름 · 메뉴에 보이기 · 홈 화면 사진과 이름. 사진을 누르면 바꿀 수 있어요.<br>홈 화면에 추가하면 <b>그때 보고 있는 카테고리</b>의 사진과 이름으로 추가돼요.</p>' +
                '<div class="ss-list">' + st.rows.map(function (r, i) { return rowHtml(r, i, st.rows.length); }).join('') + '</div>' +
                '<div class="ss-sec">처음 열 화면</div>' +
                '<select class="ss-select" data-f="start">' + actives.map(function (r) { return '<option value="' + r.hash + '"' + (r.hash === st.start ? ' selected' : '') + '>' + esc(r.name || r.def) + '</option>'; }).join('') + '</select>' +
            '</div>' +
            '<div class="ss-foot"><span class="ss-msg"></span><button class="ss-btn ghost" data-act="close">취소</button><button class="ss-btn" data-act="save">저장</button></div>' +
            '</div>';
        bg.querySelector('.ss-list').scrollTop = top;
    }
    function bind(bg) {
        bg.addEventListener('click', function (e) {
            if (e.target === bg) return close();
            var b = e.target.closest('[data-act]'); if (!b) return;
            var row = b.closest('.ss-row'), i = row ? Number(row.dataset.i) : -1, act = b.dataset.act;
            if (act === 'close') return close();
            if (act === 'save') return save();
            if (act === 'up' || act === 'down') {
                var j = act === 'up' ? i - 1 : i + 1;
                var t = st.rows[i]; st.rows[i] = st.rows[j]; st.rows[j] = t;
                return render();
            }
            if (act === 'icon') return iconMenu(b, i);
            if (act === 'pick') { var pop = b.closest('.ss-pop'); pop.remove(); return iconAction(b.dataset.v, Number(pop.dataset.i)); }
        });
        bg.addEventListener('input', function (e) {
            var f = e.target.dataset.f; if (!f) return;
            if (f === 'start') { st.start = e.target.value; return; }
            var row = e.target.closest('.ss-row'); if (!row) return;
            var r = st.rows[Number(row.dataset.i)];
            if (f === 'active') { r.active = e.target.checked; if (!r.active && st.start === r.hash) st.start = 'home'; return render(); }
            r[f] = e.target.value.trim() ? e.target.value : '';
        });
    }
    function iconMenu(btn, i) {
        var card = btn.closest('.ss-card');
        card.querySelectorAll('.ss-pop').forEach(function (p) { p.remove(); });
        var pop = document.createElement('div');
        pop.className = 'ss-pop'; pop.dataset.i = i;
        pop.innerHTML = '<button data-act="pick" data-v="file">사진 올리기</button><button data-act="pick" data-v="url">사진 주소 넣기</button>' +
            (st.rows[i].icon || st.rows[i].file ? '<button data-act="pick" data-v="reset">기본으로</button>' : '');
        card.appendChild(pop);
        var a = btn.getBoundingClientRect(), c = card.getBoundingClientRect();
        pop.style.left = (a.left - c.left) + 'px';
        pop.style.top = (a.bottom - c.top + 4) + 'px';
        setTimeout(function () {
            document.addEventListener('pointerdown', function off(e) { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener('pointerdown', off, true); } }, true);
        }, 0);
    }
    function iconAction(v, i) {
        var r = st.rows[i];
        if (v === 'reset') { r.icon = ''; r.file = null; r.preview = ''; return render(); }
        if (v === 'url') {
            var u = prompt('사진 주소 (https://…)', /^https?:/.test(r.icon) ? r.icon : '');
            if (u == null) return;
            u = u.trim();
            if (u && !/^https?:\/\//.test(u)) return alert('https:// 로 시작하는 주소를 넣어 주세요.');
            r.icon = u; r.file = null; r.preview = ''; return render();
        }
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = function () {
            var f = inp.files && inp.files[0]; if (!f) return;
            square(f).then(function (out) { r.file = out; r.preview = out.url; render(); }, function () { alert('사진을 읽지 못했어요.'); });
        };
        inp.click();
    }
    // 정사각형 512px로 가운데 잘라서 JPEG (홈 화면 아이콘은 투명 배경을 못 씀)
    function square(file) {
        return new Promise(function (ok, fail) {
            var img = new Image();
            img.onload = function () {
                var s = Math.min(img.naturalWidth, img.naturalHeight), cv = document.createElement('canvas');
                cv.width = cv.height = 512;
                var cx = cv.getContext('2d');
                cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, 512, 512);
                cx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 512, 512);
                cv.toBlob(function (blob) {
                    if (!blob) return fail();
                    blob.arrayBuffer().then(function (buf) { ok({ bytes: new Uint8Array(buf), url: URL.createObjectURL(blob) }); });
                }, 'image/jpeg', 0.9);
                URL.revokeObjectURL(img.src);
            };
            img.onerror = fail;
            img.src = URL.createObjectURL(file);
        });
    }
    function save() {
        if (!window.ghdb.hasToken()) return alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.');
        var msg = document.querySelector('.ss-msg'), btn = document.querySelector('.ss-btn[data-act=save]');
        btn.disabled = true; msg.textContent = '저장 중…';
        var repo = window.ghdb.repo(), files = {}, old = {};
        (cfg && cfg.categories || []).forEach(function (c) { if (c.icon) old[c.hash] = c.icon; });
        var uploads = st.rows.filter(function (r) { return r.file; });
        Promise.all(uploads.map(function (r) { return repo.putBlob(r.file.bytes); })).then(function (shas) {
            uploads.forEach(function (r, k) {
                var p = ICON_DIR + r.hash + '-' + Date.now().toString(36) + '.jpg';
                files[p] = shas[k]; r.icon = p;
            });
            // 바뀐 사진 중 이 설정에서 올렸던 옛 파일은 지움
            st.rows.forEach(function (r) { var o = old[r.hash]; if (o && o !== r.icon && o.indexOf(ICON_DIR) === 0) files[o] = null; });
            var next = {
                version: 1, start: st.start,
                categories: st.rows.map(function (r) {
                    var o = { hash: r.hash, active: r.hash === 'home' ? true : r.active };
                    if (r.name.trim() && r.name.trim() !== r.def) o.name = r.name.trim();
                    if (r.icon) o.icon = r.icon;
                    if (r.app.trim()) o.app = r.app.trim();
                    return o;
                }).concat(st.hidden.map(function (h) { return { hash: h, active: false }; }))   // 파일이 없는 카테고리는 꺼 둔 채로 뒤에
            };
            var j = {}; j[FILE] = { fallback: {}, mutate: function () { next.updated_at = new Date().toISOString(); return next; } };
            return repo.commit('설정: 카테고리', files, j).then(function () {
                writeCache(next); apply(next);
                if (window.renderMenu) window.renderMenu();
                identity(current());
                close();
            });
        }).catch(function (e) {
            console.error(e);
            btn.disabled = false; msg.textContent = '';
            alert('저장하지 못했어요.\n' + (e.message || e));
        });
    }

    // 헤더 톱니바퀴: 토끼굴 메인 화면에서만 보임 (script.js의 loadPage가 showGear를 부름)
    function showGear(on) {
        var b = document.getElementById('btn-settings');
        if (b) b.style.display = on ? '' : 'none';
    }
    document.addEventListener('DOMContentLoaded', function () {
        var b = document.getElementById('btn-settings');
        if (b) { b.innerHTML = GEAR; b.addEventListener('click', open); }
        identity(current());
        load();
    });

    window.siteSettings = { open: open, identity: identity, showGear: showGear, reload: load };
})();
