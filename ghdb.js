/* ==========================================================================
   ghdb.js — GitHub 저장소를 데이터베이스처럼 쓰는 모듈
   - 글: data/<카테고리>.json  /  이미지: data/images/<폴더>/<파일>
   - 각 페이지는 기존 Supabase 문법(from().select().eq()...)을 그대로 쓰면 됩니다.
   - 쓰기(추가/수정/삭제/업로드)는 이 기기에 저장된 GitHub 토큰으로 커밋합니다.
   ========================================================================== */
(function () {
    // 저장소는 사이트 주소에서 알아서 찾음 → 다른 GitHub 계정/저장소에 그대로 복사해도 동작
    //   <계정>.github.io/<저장소>/  →  계정/저장소
    //   <계정>.github.io/           →  계정/<계정>.github.io
    // (로컬 테스트 등 github.io가 아닐 때는 아래 기본값 사용)
    var OWNER = 'usagiarchiving';
    var REPO = 'white';
    var BRANCH = 'main';
    (function () {
        var m = /^([a-z0-9-]+)\.github\.io$/i.exec(location.hostname);
        if (!m) return;
        OWNER = m[1];
        var first = location.pathname.split('/').filter(Boolean)[0];
        REPO = first && !/\.html?$/i.test(first) ? first : m[1] + '.github.io';
    })();
    var API = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/';
    var RAW = 'https://raw.githubusercontent.com/' + OWNER + '/' + REPO + '/' + BRANCH + '/';
    var TOKEN_KEY = 'gh_token';

    // 예전 Supabase 프로젝트 주소 → 이 저장소 안의 파일 구성
    //  files : 이 클라이언트가 다루는 카테고리 파일들 (posts 테이블은 category 값으로 나뉨)
    //  images: 업로드 이미지 폴더
    var PROJECTS = {
        'pqqvmppgpqmtyttfjyve': { files: ['daily', 'memo', 'txt'], images: 'daily' },
        'dvalxqujceuhfshatilq': { files: ['hasion'], images: 'hasion' },
        'yjjxlklzgcfwwcunmrht': { files: ['record'], images: 'record' },
        'ofhadtlrsccipnvdohqh': { files: ['todos'], images: 'todos' }
    };
    // posts 이외의 테이블은 테이블 이름이 곧 파일 이름
    var TABLE_FILE = { todos: 'todos', record: 'record' };

    // GitHub API 응답은 브라우저가 60초간 기억(캐시)해서, 연달아 저장하면 옛 상태를 받음 → 항상 새로 받기
    function nfetch(url, opts) { opts = opts || {}; opts.cache = 'no-store'; return fetch(url, opts); }

    /* ---------------- 토큰 ---------------- */
    // QR로 넘어온 토큰 받기: 주소 끝 #gh=토큰 → 이 기기에 저장하고 주소에서 바로 지움
    (function () {
        var m = /^#gh=([A-Za-z0-9_]+)/.exec(location.hash);
        if (!m) return;
        try { localStorage.setItem('gh_token', m[1]); } catch (e) {}
        history.replaceState(null, '', location.pathname + location.search);
        window.__ghTokenReceived = true;
    })();

    function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
    function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

    function askToken() {
        var t = prompt(
            '이 기기에서 글을 쓰려면 GitHub 토큰이 필요해요. (처음 한 번만)\n\n' +
            'GitHub → Settings → Developer settings → Fine-grained tokens\n' +
            '→ Repository access: ' + OWNER + '/' + REPO + ' 선택\n' +
            '→ Permissions: Contents = Read and write\n\n' +
            '만든 토큰을 붙여 넣어 주세요.'
        );
        if (t && t.trim()) { setToken(t.trim()); updateKeyIcon(); return t.trim(); }
        return '';
    }

    function requireToken() {
        var t = getToken() || askToken();
        if (!t) throw new Error('GitHub 토큰이 없어 저장하지 못했습니다.');
        return t;
    }

    function headers(extra) {
        var h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
        var t = getToken();
        if (t) h['Authorization'] = 'Bearer ' + t;
        for (var k in extra || {}) h[k] = extra[k];
        return h;
    }

    async function apiError(res, what) {
        var msg = '';
        try { msg = (await res.json()).message || ''; } catch (e) {}
        if (res.status === 401) { setToken(''); updateKeyIcon(); msg = '토큰이 올바르지 않거나 만료됐어요. 다시 넣어 주세요.'; }
        var err = new Error(what + ' 실패 (' + res.status + ') ' + msg);
        err.status = res.status;
        return err;
    }

    /* ---------------- base64 ---------------- */
    function utf8ToB64(str) {
        var bytes = new TextEncoder().encode(str);
        return bytesToB64(bytes);
    }
    function bytesToB64(bytes) {
        var bin = '';
        for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(bin);
    }

    /* ---------------- 파일 읽기/쓰기 ---------------- */
    var cache = {}; // name -> { rows, sha }

    async function readFile(name) {
        var path = 'data/' + name + '.json';
        if (getToken()) {
            // 토큰이 있으면 API로 최신본을 읽음 (Pages 반영 지연 없음)
            var res = await nfetch(API + path + '?ref=' + BRANCH + '&t=' + Date.now(), { headers: headers() });
            if (res.status === 404) { cache[name] = { rows: [], sha: null }; return cache[name]; }
            if (!res.ok) throw await apiError(res, name + ' 읽기');
            var meta = await res.json();
            var text;
            if (meta.content && meta.encoding === 'base64') {
                var bin = atob(meta.content.replace(/\n/g, ''));
                var bytes = new Uint8Array(bin.length);
                for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                text = new TextDecoder().decode(bytes);
            } else {
                // 1MB가 넘는 파일은 raw로 다시 받음
                var r2 = await nfetch(API + path + '?ref=' + BRANCH + '&t=' + Date.now(), { headers: headers({ 'Accept': 'application/vnd.github.raw' }) });
                if (!r2.ok) throw await apiError(r2, name + ' 읽기');
                text = await r2.text();
            }
            cache[name] = { rows: JSON.parse(text || '[]'), sha: meta.sha };
            return cache[name];
        }
        // 토큰이 없으면(방문자) 사이트에 배포된 파일을 읽음
        var res2 = await nfetch(path + '?t=' + Date.now());
        if (res2.status === 404) return { rows: [], sha: null };
        if (!res2.ok) throw new Error(name + ' 읽기 실패 (' + res2.status + ')');
        return { rows: await res2.json(), sha: null };
    }

    async function putFile(path, b64, sha, message) {
        requireToken();
        var body = { message: message, content: b64, branch: BRANCH };
        if (sha) body.sha = sha;
        var res = await nfetch(API + path, { method: 'PUT', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) });
        if (!res.ok) throw await apiError(res, path + ' 저장');
        return (await res.json()).content.sha;
    }

    async function deletePath(path, message) {
        requireToken();
        var res = await nfetch(API + path + '?ref=' + BRANCH, { headers: headers() });
        if (res.status === 404) return;
        if (!res.ok) throw await apiError(res, path + ' 확인');
        var sha = (await res.json()).sha;
        var del = await nfetch(API + path, {
            method: 'DELETE', headers: headers({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ message: message, sha: sha, branch: BRANCH })
        });
        if (!del.ok && del.status !== 404) throw await apiError(del, path + ' 삭제');
    }

    // 파일을 최신으로 읽고 → mutate(rows) → 저장. 동시에 다른 곳에서 바뀌었으면(409) 다시 시도.
    var queue = Promise.resolve();
    function modifyFile(name, mutate, message) {
        var job = queue.then(async function () {
            requireToken();
            for (var attempt = 0; attempt < 3; attempt++) {
                var f = await readFile(name);
                var rows = f.rows.slice();
                var result = mutate(rows);
                try {
                    var sha = await putFile('data/' + name + '.json', utf8ToB64(JSON.stringify(rows, null, 1) + '\n'), f.sha, message);
                    cache[name] = { rows: rows, sha: sha };
                    return result;
                } catch (e) {
                    if ((e.status === 409 || e.status === 422) && attempt < 2) continue;
                    throw e;
                }
            }
        });
        queue = job.catch(function () {});
        return job;
    }

    /* ---------------- 조건 처리 ---------------- */
    function matches(row, filters) {
        return filters.every(function (f) { return String(row[f.col]) === String(f.val); });
    }

    function sortRows(rows, orders) {
        if (!orders.length) return rows;
        return rows.sort(function (a, b) {
            for (var i = 0; i < orders.length; i++) {
                var o = orders[i], x = a[o.col], y = b[o.col];
                if (x == null && y == null) continue;
                if (x == null) return 1;
                if (y == null) return -1;
                if (o.col.indexOf('_at') > -1 || o.col.indexOf('date') > -1) { x = new Date(x).getTime() || x; y = new Date(y).getTime() || y; }
                if (x < y) return o.asc ? -1 : 1;
                if (x > y) return o.asc ? 1 : -1;
            }
            return 0;
        });
    }

    // 편집 중에 임시 주소(GitHub 원본)로 바뀐 이미지를 저장 전에 원래 경로로 되돌림
    var RAW_RE = new RegExp(RAW.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(data/images/[^"\'?\\s]+)(\\?t=\\d+)?', 'g');
    function normalize(obj) {
        var o = Object.assign({}, obj);
        for (var k in o) if (typeof o[k] === 'string') o[k] = o[k].replace(RAW_RE, '$1').replace(/ data-gh-fallback="1"/g, '');
        return o;
    }

    function nextId(allRows) {
        var max = 0;
        allRows.forEach(function (r) { var n = Number(r.id); if (n > max) max = n; });
        return max + 1;
    }

    /* ---------------- 쿼리 빌더 (Supabase 문법 흉내) ---------------- */
    function Query(client, table) {
        this.client = client; this.table = table;
        this.op = 'select'; this.filters = []; this.orders = [];
        this.payload = null; this.wantSingle = false; this.returning = false;
    }
    Query.prototype.select = function () { if (this.op !== 'select') this.returning = true; return this; };
    Query.prototype.eq = function (col, val) { this.filters.push({ col: col, val: val }); return this; };
    Query.prototype.order = function (col, opts) { this.orders.push({ col: col, asc: !opts || opts.ascending !== false }); return this; };
    Query.prototype.limit = function (n) { this.lim = n; return this; };
    Query.prototype.single = function () { this.wantSingle = true; return this; };
    Query.prototype.insert = function (rows) { this.op = 'insert'; this.payload = Array.isArray(rows) ? rows : [rows]; return this; };
    Query.prototype.update = function (patch) { this.op = 'update'; this.payload = patch; return this; };
    Query.prototype.delete = function () { this.op = 'delete'; return this; };
    Query.prototype.then = function (ok, fail) {
        return this.run().then(function (data) { return { data: data, error: null }; },
            function (err) { console.error('[ghdb]', err); return { data: null, error: err }; }).then(ok, fail);
    };

    // 이 쿼리가 대상으로 할 파일들
    Query.prototype.files = function (rowForInsert) {
        if (TABLE_FILE[this.table]) return [TABLE_FILE[this.table]];
        var cat = (rowForInsert && rowForInsert.category) ||
            (this.filters.find(function (f) { return f.col === 'category'; }) || {}).val;
        if (cat) return [cat];
        return this.client.files;
    };

    Query.prototype.run = async function () {
        var self = this;
        if (this.op === 'select') {
            var out = [];
            for (var name of this.files()) out = out.concat((await readFile(name)).rows);
            out = sortRows(out.filter(function (r) { return matches(r, self.filters); }), this.orders);
            if (this.lim) out = out.slice(0, this.lim);
            if (this.wantSingle) { if (!out.length) throw new Error('결과 없음'); return out[0]; }
            return out;
        }

        if (this.op === 'insert') {
            var inserted = [];
            // 같은 Supabase 테이블을 쓰던 파일들끼리 id가 겹치지 않도록 전체에서 최대값을 찾음
            var all = [];
            for (var n of this.client.files) all = all.concat((await readFile(n)).rows);
            var id = nextId(all);
            var groups = {};
            this.payload.forEach(function (row) {
                var r = normalize(row);
                if (r.id == null) r.id = id++;
                if (!r.created_at) r.created_at = new Date().toISOString();
                var file = self.files(r)[0];
                (groups[file] = groups[file] || []).push(r);
                inserted.push(r);
            });
            for (var file in groups) {
                await modifyFile(file, function (rows) { groups[file].forEach(function (r) { rows.push(r); }); },
                    file + ': 추가 #' + groups[file].map(function (r) { return r.id; }).join(', #'));
            }
            return this.wantSingle ? inserted[0] : inserted;
        }

        // update / delete : 조건에 맞는 행이 있는 파일을 찾아서 수정
        var changed = [];
        for (var name2 of this.files()) {
            var f = await readFile(name2);
            if (!f.rows.some(function (r) { return matches(r, self.filters); })) continue;
            var ids = f.rows.filter(function (r) { return matches(r, self.filters); }).map(function (r) { return r.id; });
            await modifyFile(name2, function (rows) {
                for (var i = rows.length - 1; i >= 0; i--) {
                    if (!matches(rows[i], self.filters)) continue;
                    if (self.op === 'delete') { changed.push(rows[i]); rows.splice(i, 1); }
                    else { Object.assign(rows[i], normalize(self.payload)); changed.push(rows[i]); }
                }
            }, name2 + ': ' + (self.op === 'delete' ? '삭제' : '수정') + ' #' + ids.join(', #'));
        }
        return this.wantSingle ? changed[0] : changed;
    };

    /* ---------------- 이미지 저장소 ---------------- */
    function imagePath(folder, name) {
        var base = String(name).split('?')[0].split('/').pop();
        return 'data/images/' + folder + '/' + base;
    }

    function Storage(client) { this.client = client; }
    Storage.prototype.from = function () { return this; };
    Storage.prototype.getPublicUrl = function (name) {
        return { data: { publicUrl: imagePath(this.client.images, name) } };
    };
    Storage.prototype.upload = async function (name, file) {
        try {
            // 원본 파일 바이트 그대로 저장 (메타데이터 포함)
            var bytes = new Uint8Array(await file.arrayBuffer());
            var path = imagePath(this.client.images, name);
            await putFile(path, bytesToB64(bytes), null, 'image: 추가 ' + path.split('/').pop());
            return { data: { path: path }, error: null };
        } catch (e) { console.error('[ghdb]', e); return { data: null, error: e }; }
    };
    Storage.prototype.remove = async function (names) {
        try {
            for (var n of names || []) await deletePath(imagePath(this.client.images, n), 'image: 삭제 ' + String(n).split('/').pop());
            return { data: names, error: null };
        } catch (e) { console.error('[ghdb]', e); return { data: null, error: e }; }
    };

    function Client(url) {
        var ref = (String(url).match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
        var p = PROJECTS[ref] || { files: [], images: 'misc' };
        this.files = p.files; this.images = p.images;
        this.storage = new Storage(this);
    }
    Client.prototype.from = function (table) { return new Query(this, table); };

    /* ---------------- 방금 올린 이미지 표시 ----------------
       새 이미지는 사이트에 반영되기까지 1~2분 걸리므로, 그 사이엔 GitHub 원본 주소로 대신 보여줌 */
    window.addEventListener('error', function (e) {
        var el = e.target;
        if (!el || el.tagName !== 'IMG' || el.dataset.ghFallback) return;
        var src = el.getAttribute('src') || '';
        var i = src.indexOf('data/images/');
        if (i < 0) return;
        el.dataset.ghFallback = '1';
        el.src = RAW + src.slice(i) + '?t=' + Date.now();
    }, true);

    /* ---------------- 열쇠 아이콘 ---------------- */
    function updateKeyIcon() {
        var btn = document.getElementById('btn-key');
        if (!btn) return;
        var on = !!getToken();
        btn.innerHTML = '<i class="' + (on ? 'xi-unlock-o' : 'xi-lock-o') + '"></i>';
        btn.title = on ? '글쓰기 켜짐 (누르면 다른 기기로 보내기 / 해제)' : '글쓰기 켜기 (GitHub 토큰 입력)';
    }

    /* ---------------- 다른 기기로 보내기 (QR) ---------------- */
    function loadQrLib(cb) {
        if (window.qrcode) return cb();
        var sc = document.createElement('script');
        sc.src = 'vendor/qrcode.js';
        sc.onload = cb; document.head.appendChild(sc);
    }
    function keyPanel() {
        var old = document.getElementById('gh-key-panel'); if (old) old.remove();
        var bg = document.createElement('div');
        bg.id = 'gh-key-panel';
        bg.style.cssText = 'position:fixed;inset:0;z-index:30000;background:rgba(255,240,244,.35);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:"Noto Serif KR",serif;';
        bg.innerHTML =
            '<div style="background:#fffcfb;border:1px solid #f6e6ea;border-radius:12px;padding:22px 20px 16px;max-width:300px;width:100%;box-shadow:0 14px 40px rgba(220,150,170,.16);color:#5f5357;text-align:center">' +
              '<div style="font-size:12.5px;font-weight:600;margin-bottom:12px">다른 기기</div>' +
              '<div id="gh-qr" style="display:flex;justify-content:center;min-height:200px;align-items:center"></div>' +
              '<div style="display:flex;justify-content:space-between;margin-top:16px;padding-top:12px;border-top:1px solid #f6e9ec">' +
                '<button data-k="off" style="background:none;border:none;color:#b3a2a7;font-family:inherit;font-size:11px;cursor:pointer">해제</button>' +
                '<button data-k="close" style="background:none;border:none;color:#d4728c;font-weight:600;font-family:inherit;font-size:11.5px;cursor:pointer">닫기</button>' +
              '</div>' +
            '</div>';
        document.body.appendChild(bg);
        bg.addEventListener('click', function (e) {
            var k = e.target.getAttribute && e.target.getAttribute('data-k');
            if (e.target === bg || k === 'close') bg.remove();
            if (k === 'off' && confirm('이 기기에서 글쓰기를 해제할까요? (저장된 토큰을 지웁니다)')) { setToken(''); updateKeyIcon(); bg.remove(); }
        });
        loadQrLib(function () {
            var url = location.origin + location.pathname + '#gh=' + getToken();
            var qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
            var box = document.getElementById('gh-qr');
            if (box) box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }).replace('<svg ', '<svg style="width:200px;height:200px" ');
        });
    }

    function onKeyClick() {
        if (getToken()) keyPanel();
        else askToken();
    }

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('btn-key');
        if (btn) { btn.addEventListener('click', onKeyClick); updateKeyIcon(); }
        if (window.__ghTokenReceived) setTimeout(function () { alert('이 기기에서도 글쓰기가 켜졌어요. 🔓'); }, 300);
    });

    /* ---------------- 다른 저장소 (예: 캡처 저장소) ----------------
       여러 파일 추가/삭제 + JSON 수정을 커밋 하나로 처리 (Git Data API) */
    function Repo(name) {
        this.name = name;
        this.base = 'https://api.github.com/repos/' + OWNER + '/' + name;
        this.raw = 'https://raw.githubusercontent.com/' + OWNER + '/' + name + '/' + BRANCH + '/';
        this.site = /\.github\.io$/i.test(name) ? '/' : '/' + name + '/';   // 같은 도메인의 GitHub Pages 주소
    }
    Repo.prototype.api = async function (path, opts) {
        opts = opts || {};
        for (var attempt = 0; ; attempt++) {
            var res = await nfetch(this.base + path, {
                method: opts.method || 'GET',
                headers: headers(opts.body ? { 'Content-Type': 'application/json' } : {}),
                body: opts.body ? JSON.stringify(opts.body) : undefined
            });
            // 짧은 시간에 너무 많이 올리면 GitHub이 잠시 막음 → 기다렸다 다시
            if ((res.status === 403 || res.status === 429) && attempt < 5) {
                var wait = Number(res.headers.get('retry-after')) || 20 * (attempt + 1);
                var txt = ''; try { txt = await res.clone().text(); } catch (e) {}
                if (res.status === 429 || /rate limit/i.test(txt)) {
                    if (opts.onWait) opts.onWait(wait);
                    await new Promise(function (r) { setTimeout(r, wait * 1000); });
                    continue;
                }
            }
            if (opts.allow404 && res.status === 404) return null;
            if (!res.ok) throw await apiError(res, this.name + path);
            return res.status === 204 ? null : res.json();
        }
    };
    // JSON 읽기 (토큰 있으면 API 최신본, 없으면 사이트 배포본)
    Repo.prototype.readJSON = async function (path, fallback, atRef) {
        if (getToken()) {
            var refQ = '?ref=' + (atRef || BRANCH) + '&t=' + Date.now();
            var meta = await this.api('/contents/' + path + refQ, { allow404: true });
            if (!meta) return fallback;
            var text;
            if (meta.encoding === 'base64' && meta.content) {
                var bin = atob(meta.content.replace(/\n/g, ''));
                var bytes = new Uint8Array(bin.length);
                for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                text = new TextDecoder().decode(bytes);
            } else {
                var r = await nfetch(this.base + '/contents/' + path + refQ, { headers: headers({ 'Accept': 'application/vnd.github.raw' }) });
                if (!r.ok) throw await apiError(r, path + ' 읽기');
                text = await r.text();
            }
            return JSON.parse(text);
        }
        var res = await nfetch(this.site + path + '?t=' + Date.now());
        if (!res.ok) res = await nfetch(this.raw + path + '?t=' + Date.now());   // Pages를 안 켰으면 원본 주소로
        if (!res.ok) return fallback;
        return res.json();
    };
    // 파일 바이트 → blob sha (커밋 전에 미리 올려둠)
    Repo.prototype.putBlob = async function (bytes, onWait) {
        requireToken();
        var out = await this.api('/git/blobs', { method: 'POST', body: { content: bytesToB64(bytes), encoding: 'base64' }, onWait: onWait });
        return out.sha;
    };
    // 커밋 하나로: files = { 경로: blobSha 또는 null(삭제) }, json = { 경로: { mutate: fn(현재값)→새값, fallback } }
    Repo.prototype.commit = function (message, files, json, onWait) {
        // 커밋은 한 줄로 세워 하나씩 (화면은 먼저 바뀌고 저장은 뒤에서 차례로)
        var self = this;
        var job = (this.queue || Promise.resolve()).then(function () { return self._commit(message, files, json, onWait); });
        this.queue = job.catch(function () {});
        return job;
    };
    Repo.prototype._commit = async function (message, files, json, onWait) {
        requireToken();
        files = files || {}; json = json || {};
        for (var attempt = 0; attempt < 4; attempt++) {
            // 직전에 우리가 만든 커밋을 기억해 두면 확인 요청 2~3번을 건너뜀 (빗나가면 아래에서 다시)
            var last = attempt === 0 ? this.last : null;
            var head, baseTree;
            if (last) { head = last.head; baseTree = last.tree; }
            else {
                var ref = await this.api('/git/ref/heads/' + BRANCH, { onWait: onWait });
                head = ref.object.sha;
                baseTree = (await this.api('/git/commits/' + head, { onWait: onWait })).tree.sha;
            }
            var tree = [];
            for (var p in files) tree.push({ path: p, mode: '100644', type: 'blob', sha: files[p] });
            var results = {};
            for (var jp in json) {
                var cur = last && last.json[jp] !== undefined ? last.json[jp] : await this.readJSON(jp, json[jp].fallback, head);
                var next = json[jp].mutate(JSON.parse(JSON.stringify(cur)));
                results[jp] = next;
                tree.push({ path: jp, mode: '100644', type: 'blob', content: JSON.stringify(next, null, 1) + '\n' });
            }
            try {
                var newTree = await this.api('/git/trees', { method: 'POST', body: { base_tree: baseTree, tree: tree }, onWait: onWait });
                var newCommit = await this.api('/git/commits', { method: 'POST', body: { message: message, tree: newTree.sha, parents: [head] }, onWait: onWait });
                await this.api('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: { sha: newCommit.sha, force: false }, onWait: onWait });
                var keep = last ? Object.assign({}, last.json) : {};
                for (var k in results) keep[k] = results[k];
                this.last = { head: newCommit.sha, tree: newTree.sha, json: keep };
                return results;
            } catch (e) {
                this.last = null;
                // 그 사이 다른 곳(다른 기기/다른 메뉴)에서 커밋이 생겼으면 최신 상태 기준으로 다시
                if ((e.status === 422 || e.status === 409 || last) && attempt < 3) continue;
                throw e;
            }
        }
    };
    // 여러 blob을 동시에 몇 개씩 올림
    Repo.prototype.putBlobs = async function (list, onEach, onWait, parallel) {
        var self = this, out = new Array(list.length), i = 0;
        async function worker() {
            while (i < list.length) {
                var n = i++;
                out[n] = await self.putBlob(list[n], onWait);
                if (onEach) onEach(n);
            }
        }
        var ws = [];
        for (var w = 0; w < (parallel || 3); w++) ws.push(worker());
        await Promise.all(ws);
        return out;
    };
    // 화면에 쓸 이미지 주소 (사이트 반영 전이면 onerror에서 원본 저장소 주소로 바뀜)
    Repo.prototype.url = function (path) { return this.site + path; };
    Repo.prototype.rawUrl = function (path) { return this.raw + path; };

    window.ghdb = {
        createClient: function (url) { return new Client(url); },
        repo: function (name) { return new Repo(name || REPO); },
        owner: OWNER, repoName: REPO,
        hasToken: function () { return !!getToken(); },
        setToken: function (t) { setToken(t); updateKeyIcon(); }
    };
})();
