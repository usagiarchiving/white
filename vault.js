/* ==========================================================================
   vault.js — 사이트 잠금 (비밀번호 화면 · 처음 설정 · 복구 키 · 비밀번호 바꾸기 · 이 기기 잠그기)
   - 저장소의 데이터·사진은 암호화돼 있음 (vault-core.js). 비밀번호가 없으면 F12로 봐도 암호문뿐
   - 처음 한 번 비밀번호를 넣으면 이 기기가 키를 기억 → 다음부터는 바로 열림 (헤더 방패 → 지금 잠그기)
   - vault.json (공개): 비밀번호로 감싼 키 · 힌트 · 확인용 값.  vault.json 이 없으면 잠금 전(예전처럼 열림)
   - 화면은 window.vault.ready 가 끝난 뒤에 그려짐 (script.js · site-settings.js)
   ========================================================================== */
(function () {
    var V = window.VaultCore;
    var root = document.documentElement;
    root.classList.add('vault-wait');
    var SCOPE = new URL('./', location.href).pathname;       // sw.js 범위와 같음 (/white/)
    var CFG_CACHE = 'vault_cfg';
    var KEEP = ['theme', 'gh_token'];                           // 잠글 때 남겨 두는 것 (나머지 기억은 지움)
    var MIN_LEN = 10;

    var cfg = null, key = null, readyDone = false, readyResolve;
    var ready = new Promise(function (r) { readyResolve = r; });

    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
    function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
    function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function $(id) { return document.getElementById(id); }
    function onBody(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function token() { return !!(window.ghdb && window.ghdb.hasToken()); }

    /* ---------------- 모양 ---------------- */
    var css = document.createElement('style');
    css.textContent =
        'html.vault-wait #wrap,html.vault-locked #wrap{visibility:hidden}' +
        '.vl-bg{position:fixed;inset:0;z-index:40000;background:var(--back-color,#fafafa);color:var(--main-color,#2c2c2e);display:flex;align-items:center;justify-content:center;padding:24px 16px;font-family:"Noto Serif KR",serif;overflow-y:auto;box-sizing:border-box}' +
        '.vl-bg.vl-modal{background:rgba(0,0,0,.28);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}' +
        '.vl-card{width:100%;max-width:330px;text-align:center;margin:auto}' +
        '.vl-modal .vl-card{background:var(--dropdown-bg,#fff);border-radius:14px;padding:24px 20px 18px;box-shadow:0 14px 40px rgba(0,0,0,.14);box-sizing:border-box}' +
        '.vl-title{font-size:15px;font-weight:600;letter-spacing:.08em;margin:0 0 18px;color:var(--title-color,#1c1c1e)}' +
        '.vl-text{font-size:12px;line-height:1.7;color:var(--sub-color,#8e8e93);margin:0 0 16px;word-break:keep-all;text-align:left}' +
        '.vl-text b{color:var(--main-color,#2c2c2e)}' +
        '.vl-input{display:block;width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:11px 12px;margin:0 0 9px;border:1px solid var(--divider-bg,rgba(0,0,0,.08));border-radius:10px;background:var(--input-bg,rgba(0,0,0,.03));color:inherit;outline:none;text-align:center}' +
        '.vl-input:focus{border-color:var(--point-color,#7a9c8d)}' +
        '.vl-btn{display:block;width:100%;font:inherit;font-size:13.5px;font-weight:600;padding:11px;margin-top:4px;border:none;border-radius:10px;background:var(--point-color,#7a9c8d);color:#fff;cursor:pointer}' +
        '.vl-btn[disabled]{opacity:.45;cursor:default}' +
        '.vl-btn.ghost{background:none;color:var(--sub-color,#8e8e93);font-weight:400}' +
        '.vl-err{color:#c0504d;font-size:12px;min-height:18px;margin-top:8px;line-height:1.5}' +
        '.vl-hint{font-size:12px;color:var(--sub-color,#8e8e93);margin-top:12px;line-height:1.6;word-break:keep-all;white-space:pre-wrap}' +
        '.vl-link{background:none;border:none;color:var(--sub-color,#8e8e93);font:inherit;font-size:11.5px;text-decoration:underline;cursor:pointer;margin-top:16px;padding:4px}' +
        '.vl-key{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;word-break:break-all;padding:12px;border-radius:10px;background:var(--input-bg,rgba(0,0,0,.03));border:1px dashed var(--point-color,#7a9c8d);user-select:all;-webkit-user-select:all;margin-bottom:8px}' +
        '.vl-steps{text-align:left;font-size:12px;line-height:1.7;padding-left:18px;margin:14px 0;color:var(--main-color,#2c2c2e);word-break:keep-all}' +
        '.vl-steps a{color:var(--point-color,#7a9c8d)}' +
        '.vl-check{display:flex;gap:8px;align-items:center;justify-content:center;font-size:12px;margin:6px 0 10px}' +
        '.vl-row{display:flex;gap:8px}.vl-row .vl-btn{flex:1}';
    document.head.appendChild(css);

    function screen(html, modal) {
        var old = $('vault-ui'); if (old) old.remove();
        var bg = document.createElement('div');
        bg.id = 'vault-ui';
        bg.className = 'vl-bg' + (modal ? ' vl-modal' : '');
        bg.innerHTML = '<div class="vl-card">' + html + '</div>';
        document.body.appendChild(bg);
        if (modal) bg.addEventListener('click', function (e) {
            if (e.target === bg || (e.target.closest && e.target.closest('[data-act=close]'))) bg.remove();
        });
        return bg;
    }
    function closeUi() { var el = $('vault-ui'); if (el) el.remove(); }

    /* ---------------- 서비스 워커 (사진·파일을 풀어 주는 일꾼) ---------------- */
    function waitController(ms) {
        return new Promise(function (ok) {
            if (navigator.serviceWorker.controller) return ok();
            var t = setTimeout(ok, ms);
            navigator.serviceWorker.addEventListener('controllerchange', function () { clearTimeout(t); ok(); }, { once: true });
        });
    }
    async function ensureSW() {
        if (!('serviceWorker' in navigator)) return;
        try {
            await navigator.serviceWorker.register('sw.js');
            await Promise.race([navigator.serviceWorker.ready, wait(5000)]);
            if (!navigator.serviceWorker.controller) await waitController(4000);
            var c = navigator.serviceWorker.controller;
            if (c) { c.postMessage({ vault: 'changed' }); return; }
            // 강력 새로고침 등으로 일꾼 없이 열렸으면 한 번만 다시 열기 (사진을 풀려면 필요)
            if (!ssGet('vault_reload')) { ssSet('vault_reload', '1'); location.reload(); await new Promise(function () {}); }
        } catch (e) { console.warn('[vault] sw', e); }
    }

    /* ---------------- 시작 ---------------- */
    function finish() {
        if (readyDone) return;
        readyDone = true;
        root.classList.remove('vault-wait', 'vault-locked');
        closeUi();
        updateButton();
        readyResolve();
    }
    async function fetchCfg() {
        var r = await fetch('vault.json?t=' + Date.now(), { cache: 'no-store' });
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('vault.json ' + r.status);
        return r.json();
    }
    async function tryRemembered(c) {
        try { key = await V.loadKey(SCOPE); } catch (e) { key = null; }
        if (key && await V.checkKey(c, key)) return true;
        key = null;
        return false;
    }
    async function start() {
        var cached = null;
        try { cached = JSON.parse(lsGet(CFG_CACHE) || 'null'); } catch (e) {}
        // 이 기기가 이미 열려 있으면 기다리지 않고 바로 (설정은 뒤에서 새로 받음)
        if (cached && cached.wrap && await tryRemembered(cached)) {
            cfg = cached;
            await ensureSW();
            finish();
            fetchCfg().then(function (c) { if (c) { cfg = c; lsSet(CFG_CACHE, JSON.stringify(c)); } }).catch(function () {});
            return;
        }
        var c;
        try { c = await fetchCfg(); }
        catch (e) {
            if (cached && cached.wrap) c = cached;
            else return onBody(showOffline);
        }
        if (!c) { lsSet(CFG_CACHE, null); cfg = null; return onBody(finish); }   // 아직 잠금 설정 전
        cfg = c; lsSet(CFG_CACHE, JSON.stringify(c));
        if (await tryRemembered(c)) { await ensureSW(); return onBody(finish); }
        onBody(showLock);
    }
    function showOffline() {
        root.classList.add('vault-locked');
        var bg = screen('<div class="vl-title">토끼굴</div><p class="vl-hint">연결을 확인하지 못했어요.</p><button class="vl-btn" data-act="retry">다시 시도</button>');
        bg.querySelector('[data-act=retry]').onclick = function () { closeUi(); start(); };
    }

    /* ---------------- 잠금 화면 ---------------- */
    function showLock() {
        root.classList.add('vault-locked');
        var mode = 'pw';
        var bg = screen(
            '<form autocomplete="on">' +
                '<div class="vl-title">토끼굴</div>' +
                '<input type="text" name="username" autocomplete="username" value="토끼굴" style="display:none">' +
                '<input class="vl-input" id="vl-pw" type="password" name="password" autocomplete="current-password" placeholder="비밀번호" autofocus>' +
                '<button class="vl-btn" type="submit">열기</button>' +
                '<div class="vl-err" id="vl-err"></div>' +
                (cfg.hint ? '<div class="vl-hint">힌트 · ' + esc(cfg.hint) + '</div>' : '') +
                '<button type="button" class="vl-link" id="vl-mode">비밀번호를 잊었어요 (복구 키로 열기)</button>' +
            '</form>');
        var form = bg.querySelector('form'), inp = $('vl-pw'), err = $('vl-err'), btn = form.querySelector('.vl-btn');
        $('vl-mode').onclick = function () {
            mode = mode === 'pw' ? 'rk' : 'pw';
            inp.value = ''; err.textContent = '';
            inp.type = mode === 'pw' ? 'password' : 'text';
            inp.placeholder = mode === 'pw' ? '비밀번호' : '복구 키';
            inp.autocomplete = mode === 'pw' ? 'current-password' : 'off';
            this.textContent = mode === 'pw' ? '비밀번호를 잊었어요 (복구 키로 열기)' : '비밀번호로 열기';
            inp.focus();
        };
        form.onsubmit = async function (e) {
            e.preventDefault();
            var v = inp.value;
            if (!v) return;
            btn.disabled = true; btn.textContent = '여는 중…'; err.textContent = '';
            var raw = null;
            try {
                if (mode === 'pw') raw = await V.unwrapWithPassword(cfg, v);
                else {
                    raw = V.unb64(v);
                    if (raw.length !== 32 || !(await V.checkKey(cfg, await V.importDek(raw, false)))) throw new Error('bad');
                }
            } catch (x) {
                await wait(600);
                btn.disabled = false; btn.textContent = '열기';
                err.textContent = mode === 'pw' ? '비밀번호가 맞지 않아요.' : '복구 키가 맞지 않아요.';
                inp.select();
                return;
            }
            key = await V.saveKey(SCOPE, raw);
            ssSet('vault_reload', '');
            await ensureSW();
            var viaRecovery = mode === 'rk';
            finish();
            if (viaRecovery) setTimeout(function () { changePassword(raw); }, 300);
            else raw.fill(0);
        };
    }

    /* ---------------- 헤더 방패 버튼 ---------------- */
    var SHIELD = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/>{X}</svg>';
    function updateButton() {
        var b = $('btn-vault');
        if (!b) {
            var key0 = $('btn-key'); if (!key0) return;
            b = document.createElement('button');
            b.id = 'btn-vault'; b.className = 'nav-icon-btn';
            b.onclick = openPanel;
            key0.parentNode.insertBefore(b, key0);
        }
        b.innerHTML = SHIELD.replace('{X}', cfg ? '<path d="M9 12l2 2 4-4"/>' : '');
        b.title = cfg ? '잠금 (지금 잠그기 · 비밀번호 바꾸기)' : '잠금 설정';
        b.style.display = cfg || token() ? '' : 'none';
    }
    document.addEventListener('DOMContentLoaded', function () { if (readyDone) updateButton(); });

    function openPanel() {
        if (!cfg) return setup();
        var bg = screen(
            '<div class="vl-title">잠금</div>' +
            '<p class="vl-text">사이트의 데이터와 사진은 모두 암호화돼 있어요. 이 기기는 비밀번호를 기억하고 있어서 바로 열려요.</p>' +
            '<button class="vl-btn" data-act="lock">이 기기 지금 잠그기</button>' +
            '<button class="vl-btn ghost" data-act="change">비밀번호 · 힌트 바꾸기</button>' +
            (token() ? '<button class="vl-btn ghost" data-act="rk">복구 키 다시 보기</button>' +
                       '<button class="vl-btn ghost" data-act="enc">암호화 실행 (안 잠긴 파일 잠그기)</button>' : '') +
            '<button class="vl-btn ghost" data-act="close">닫기</button>', true);
        bg.querySelector('[data-act=lock]').onclick = lockNow;
        bg.querySelector('[data-act=change]').onclick = function () { changePassword(null); };
        var rkb = bg.querySelector('[data-act=rk]'); if (rkb) rkb.onclick = showRecovery;
        var enb = bg.querySelector('[data-act=enc]'); if (enb) enb.onclick = runEncrypt;
    }

    // 복구 키 다시 보기: 비밀번호를 한 번 더 확인하고 보여 줌 (VAULT_KEY Secret을 다시 넣을 때)
    function showRecovery() {
        var bg = screen(
            '<form>' +
            '<div class="vl-title">복구 키 다시 보기</div>' +
            '<input type="text" name="username" autocomplete="username" value="토끼굴" style="display:none">' +
            '<input class="vl-input" id="vl-cur" type="password" autocomplete="current-password" placeholder="비밀번호">' +
            '<div class="vl-err" id="vl-err"></div>' +
            '<div class="vl-row"><button type="button" class="vl-btn ghost" data-act="close">취소</button><button class="vl-btn" type="submit">보기</button></div>' +
            '</form>', true);
        bg.querySelector('form').onsubmit = async function (e) {
            e.preventDefault();
            var btn = this.querySelector('[type=submit]'), err = $('vl-err');
            btn.disabled = true; err.textContent = '';
            var raw;
            try { raw = await V.unwrapWithPassword(cfg, $('vl-cur').value); }
            catch (x) { await wait(600); btn.disabled = false; err.textContent = '비밀번호가 맞지 않아요.'; return; }
            var rk = V.b64url(raw); raw.fill(0);
            var b2 = screen(
                '<div class="vl-title">복구 키</div>' +
                '<p class="vl-text">이 키만 있으면 누구든 열 수 있으니 남에게 보여 주지 마세요.</p>' +
                '<div class="vl-key">' + rk + '</div>' +
                '<button class="vl-btn ghost" data-act="copy">복사하기</button>' +
                '<ol class="vl-steps"><li><a href="' + secretsUrl() + '" target="_blank" rel="noopener">GitHub Secret 만들기</a> → Name: <b>VAULT_KEY</b> → Secret: 복구 키 붙여넣기 → Add secret<br>' +
                '<span style="color:var(--sub-color)">Settings → Secrets and variables → Actions 의 <b>Secrets</b> 탭 → <b>Repository secrets</b> 에 있어야 해요 (Variables·Environment 아님)</span></li></ol>' +
                '<button class="vl-btn ghost" data-act="close">닫기</button>', true);
            b2.querySelector('[data-act=copy]').onclick = function () {
                var b = this;
                (navigator.clipboard ? navigator.clipboard.writeText(rk) : Promise.reject()).then(function () { b.textContent = '복사했어요'; }, function () { b.textContent = '길게 눌러 복사해 주세요'; });
            };
        };
    }

    async function lockNow() {
        if (!confirm('이 기기를 잠글까요?\n다시 열려면 비밀번호가 필요해요.')) return;
        try { await V.forgetKey(SCOPE); } catch (e) {}
        try { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ vault: 'locked' }); } catch (e) {}
        // 화면이 기억해 둔 내용(캐시)도 지움 — 테마와 글쓰기 토큰만 남김
        try {
            var drop = [];
            for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (KEEP.indexOf(k) < 0) drop.push(k); }
            drop.forEach(function (k) { localStorage.removeItem(k); });
        } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}
        try { if (window.caches) { var ks = await caches.keys(); await Promise.all(ks.map(function (k) { return caches.delete(k); })); } } catch (e) {}
        location.reload();
    }

    /* ---------------- 비밀번호 검사 ---------------- */
    function pwProblem(pw, pw2, hint) {
        if (pw.length < MIN_LEN) return '비밀번호는 ' + MIN_LEN + '자 이상으로 해 주세요.';
        if (pw !== pw2) return '두 비밀번호가 달라요.';
        if (/^(.)\1+$/.test(pw) || /^(0123456789|1234567890|abcdefghij|qwertyuiop)/i.test(pw)) return '너무 쉬운 비밀번호예요.';
        if (!hint.trim()) return '힌트를 적어 주세요. (모두에게 보여요)';
        var h = hint.toLowerCase(), p = pw.toLowerCase();
        if (h.indexOf(p) > -1 || (p.length >= 4 && h.replace(/\s/g, '').indexOf(p.replace(/\s/g, '')) > -1)) return '힌트에 비밀번호가 들어 있어요.';
        return '';
    }
    var PW_FIELDS = function (hint) {
        return '<input type="text" name="username" autocomplete="username" value="토끼굴" style="display:none">' +
            '<input class="vl-input" id="vl-new" type="password" autocomplete="new-password" placeholder="새 비밀번호 (' + MIN_LEN + '자 이상)">' +
            '<input class="vl-input" id="vl-new2" type="password" autocomplete="new-password" placeholder="한 번 더">' +
            '<input class="vl-input" id="vl-hint" type="text" autocomplete="off" placeholder="힌트 (모두에게 보여요)" value="' + esc(hint || '') + '">';
    };

    /* ---------------- 처음 설정 ---------------- */
    function setup() {
        if (!token()) return alert('잠금 설정은 글쓰기가 켜진 기기에서 할 수 있어요.\n오른쪽 위 자물쇠에 GitHub 토큰을 먼저 넣어 주세요.');
        var bg = screen(
            '<form>' +
            '<div class="vl-title">잠금 설정</div>' +
            '<p class="vl-text">이 비밀번호가 있어야 사이트를 열 수 있어요. 저장소의 데이터와 사진이 모두 암호화돼서, F12나 GitHub에서 봐도 알아볼 수 없게 돼요.<br><br>' +
            '· <b>' + MIN_LEN + '자 이상</b>, 남이 짐작 못 하는 것 (이름·생일·쉬운 단어 X)<br>· 힌트는 <b>누구나 볼 수 있어요</b>. 나만 알아듣게<br>· 잊으면 복구 키로만 열 수 있어요</p>' +
            PW_FIELDS('') +
            '<div class="vl-err" id="vl-err"></div>' +
            '<div class="vl-row"><button type="button" class="vl-btn ghost" data-act="close">취소</button><button class="vl-btn" type="submit">다음</button></div>' +
            '</form>', true);
        bg.querySelector('form').onsubmit = async function (e) {
            e.preventDefault();
            var pw = $('vl-new').value, hint = $('vl-hint').value.trim(), err = $('vl-err');
            var bad = pwProblem(pw, $('vl-new2').value, hint);
            if (bad) { err.textContent = bad; return; }
            var btn = this.querySelector('[type=submit]');
            btn.disabled = true; btn.textContent = '만드는 중…';
            var raw = crypto.getRandomValues(new Uint8Array(32));
            var w = await V.wrapWithPassword(raw, pw);
            var k = await V.importDek(raw, false);
            var next = { v: 1, kdf: w.kdf, wrap: w.wrap, hint: hint, check: await V.makeCheck(k), created_at: new Date().toISOString() };
            setupKey(raw, next);
        };
    }
    function secretsUrl() { return 'https://github.com/' + window.ghdb.owner + '/' + window.ghdb.repoName + '/settings/secrets/actions/new'; }
    function setupKey(raw, next) {
        var rk = V.b64url(raw);
        var bg = screen(
            '<div class="vl-title">복구 키</div>' +
            '<p class="vl-text">비밀번호를 잊었을 때 쓰는 열쇠예요. <b>지금 한 번만</b> 보여 줘요. 이 키만 있으면 누구든 열 수 있으니 남에게 보여 주지 마세요.</p>' +
            '<div class="vl-key" id="vl-rk">' + rk + '</div>' +
            '<button class="vl-btn ghost" data-act="copy">복사하기</button>' +
            '<ol class="vl-steps">' +
                '<li>복구 키를 <b>사진·메모 등 안전한 곳</b>에 따로 보관</li>' +
                '<li><a href="' + secretsUrl() + '" target="_blank" rel="noopener">GitHub Secret 만들기</a> → Name: <b>VAULT_KEY</b> → Secret: 복구 키 붙여넣기 → Add secret<br><span style="color:var(--sub-color)">Settings → Secrets and variables → Actions 의 <b>Secrets</b> 탭 → <b>Repository secrets</b> 에 생겨야 해요 (Variables·Environment 아님). 시온 메시지·캘린더 같은 자동 작업이 이 키로 읽고 써요</span></li>' +
            '</ol>' +
            '<label class="vl-check"><input type="checkbox" id="vl-done"> 둘 다 했어요</label>' +
            '<div class="vl-err" id="vl-err"></div>' +
            '<div class="vl-row"><button class="vl-btn ghost" data-act="close">취소</button><button class="vl-btn" data-act="go" disabled>암호화 시작</button></div>', true);
        bg.querySelector('[data-act=copy]').onclick = function () {
            var b = this;
            (navigator.clipboard ? navigator.clipboard.writeText(rk) : Promise.reject()).then(function () { b.textContent = '복사했어요'; }, function () { b.textContent = '길게 눌러 복사해 주세요'; });
        };
        $('vl-done').onchange = function () { bg.querySelector('[data-act=go]').disabled = !this.checked; };
        bg.querySelector('[data-act=go]').onclick = async function () {
            var btn = this, err = $('vl-err');
            btn.disabled = true; btn.textContent = '저장 중…'; err.textContent = '';
            try {
                var repo = window.ghdb.repo();
                await repo.commit('보안: 잠금 설정', {}, { 'vault.json': { fallback: null, mutate: function (cur) {
                    if (cur && cur.wrap) throw new Error('이미 다른 기기에서 잠금을 설정했어요. 새로고침해 주세요.');
                    return next;
                } } });
                cfg = next; lsSet(CFG_CACHE, JSON.stringify(next));
                key = await V.saveKey(SCOPE, raw);
                raw.fill(0);
                await ensureSW();
                updateButton();
                runEncrypt();
            } catch (x) {
                btn.disabled = false; btn.textContent = '암호화 시작';
                err.textContent = '저장하지 못했어요. ' + (x.message || x);
            }
        };
    }

    // 저장소 전체 암호화는 GitHub Actions(vault.yml)가 함 → 끝날 때까지 지켜봄
    var WF = '/actions/workflows/vault.yml';
    async function runEncrypt() {
        var bg = screen('<div class="vl-title">암호화 중</div><p class="vl-hint" id="vl-st">GitHub에 맡기는 중…</p><div class="vl-err" id="vl-err"></div><div id="vl-after"></div>', true);
        var st = $('vl-st'), err = $('vl-err'), after = $('vl-after');
        var repo = window.ghdb.repo();
        var t0 = Date.now();
        try {
            await repo.api(WF + '/dispatches', { method: 'POST', body: { ref: 'main', inputs: { mode: 'encrypt' } } });
        } catch (x) {
            err.textContent = '시작하지 못했어요. ' + (x.message || x);
            after.innerHTML = '<button class="vl-btn" data-act="again">다시 시도</button>';
            after.querySelector('button').onclick = runEncrypt;
            return;
        }
        st.textContent = '데이터와 사진을 잠그는 중… (보통 1~3분)';
        for (var i = 0; i < 120; i++) {
            await wait(6000);
            if (!document.body.contains(bg)) return;
            var runs;
            try { runs = await repo.api(WF + '/runs?event=workflow_dispatch&per_page=5'); } catch (x) { continue; }
            var run = (runs.workflow_runs || []).find(function (r) { return new Date(r.created_at).getTime() >= t0 - 60000; });
            if (!run) continue;
            if (run.status !== 'completed') { st.textContent = '데이터와 사진을 잠그는 중… (' + Math.round((Date.now() - t0) / 1000) + '초)'; continue; }
            if (run.conclusion === 'success') {
                bg.querySelector('.vl-title').textContent = '다 잠갔어요';
                st.innerHTML = '이제 저장소의 데이터와 사진은 비밀번호 없이는 볼 수 없어요.<br>다른 기기에서는 처음 한 번 비밀번호를 넣으면 돼요.';
                after.innerHTML = '<button class="vl-btn" data-act="reload">새로고침</button>';
                after.querySelector('button').onclick = function () { location.reload(); };
                return;
            }
            st.textContent = '';
            err.innerHTML = '암호화하지 못했어요. VAULT_KEY Secret이 <b>Repository secrets</b>에 있는지, 복구 키와 똑같은지 확인해 주세요. (방패 → 복구 키 다시 보기)<br><a href="' + esc(run.html_url) + '" target="_blank" rel="noopener">기록 보기</a>';
            after.innerHTML = '<div class="vl-row"><button class="vl-btn ghost" data-act="close">닫기</button><button class="vl-btn" data-act="again">다시 시도</button></div>';
            after.querySelector('[data-act=again]').onclick = runEncrypt;
            return;
        }
        st.textContent = '아직 끝나지 않았어요. 잠시 뒤 새로고침해 보세요.';
    }

    /* ---------------- 비밀번호 · 힌트 바꾸기 ---------------- */
    function changePassword(raw) {
        if (!token()) {
            if (raw) raw.fill(0);
            return alert(raw ? '복구 키로 열었어요.\n비밀번호를 바꾸려면 자물쇠에 GitHub 토큰을 넣은 뒤 방패 → 비밀번호 바꾸기를 눌러 주세요.'
                : '비밀번호를 바꾸려면 오른쪽 위 자물쇠에 GitHub 토큰을 먼저 넣어 주세요.');
        }
        var bg = screen(
            '<form>' +
            '<div class="vl-title">' + (raw ? '새 비밀번호 정하기' : '비밀번호 · 힌트 바꾸기') + '</div>' +
            (raw ? '<p class="vl-text">복구 키로 열었어요. 새 비밀번호를 정해 두세요. (복구 키와 데이터는 그대로예요)</p>'
                 : '<input class="vl-input" id="vl-cur" type="password" autocomplete="current-password" placeholder="지금 비밀번호 (또는 복구 키)">') +
            PW_FIELDS(cfg.hint) +
            '<div class="vl-err" id="vl-err"></div>' +
            '<div class="vl-row"><button type="button" class="vl-btn ghost" data-act="close">' + (raw ? '나중에' : '취소') + '</button><button class="vl-btn" type="submit">바꾸기</button></div>' +
            '</form>', true);
        bg.querySelector('form').onsubmit = async function (e) {
            e.preventDefault();
            var pw = $('vl-new').value, hint = $('vl-hint').value.trim(), err = $('vl-err');
            var bad = pwProblem(pw, $('vl-new2').value, hint);
            if (bad) { err.textContent = bad; return; }
            var btn = this.querySelector('[type=submit]');
            btn.disabled = true; btn.textContent = '바꾸는 중…'; err.textContent = '';
            try {
                var r = raw;
                if (!r) {
                    var cur = $('vl-cur').value;
                    try { r = await V.unwrapWithPassword(cfg, cur); }
                    catch (x) {
                        r = null;
                        try { var t = V.unb64(cur); if (t.length === 32 && await V.checkKey(cfg, await V.importDek(t, false))) r = t; } catch (y) {}
                    }
                    if (!r) throw new Error('지금 비밀번호가 맞지 않아요.');
                }
                var w = await V.wrapWithPassword(r, pw);
                var next = Object.assign({}, cfg, { kdf: w.kdf, wrap: w.wrap, hint: hint, updated_at: new Date().toISOString() });
                await window.ghdb.repo().commit('보안: 비밀번호 변경', {}, { 'vault.json': { fallback: null, mutate: function () { return next; } } });
                r.fill(0);
                cfg = next; lsSet(CFG_CACHE, JSON.stringify(next));
                screen('<div class="vl-title">바꿨어요</div><p class="vl-hint">다른 기기는 이미 열려 있으면 그대로예요. 새로 열 때부터 새 비밀번호를 써요.</p><button class="vl-btn" data-act="close">닫기</button>', true);
            } catch (x) {
                btn.disabled = false; btn.textContent = '바꾸기';
                err.textContent = x.message || String(x);
            }
        };
    }

    /* ---------------- 다른 코드가 쓰는 것 (ghdb.js) ---------------- */
    function needKey() { if (!key) throw new Error('잠겨 있어요. 비밀번호를 넣은 뒤 다시 해 주세요.'); return key; }
    window.vault = {
        ready: ready,
        enabled: function () { return !!cfg; },
        unlocked: function () { return !!key; },
        isPrivatePath: V.isPrivatePath,
        isSealed: V.isSealed,
        // 글(JSON) 저장 전: 잠금 대상 경로면 암호화한 글자로
        sealText: async function (path, text) {
            if (!cfg || !V.isPrivatePath(path)) return text;
            return V.sealText(needKey(), text);
        },
        // 파일(사진) 저장 전: 경로를 알면 규칙대로, 모르면(blob) 잠금 켜져 있을 때 항상 암호화
        sealBytes: async function (path, bytes) {
            if (!cfg || (path && !V.isPrivatePath(path))) return bytes;
            return V.sealBytes(needKey(), bytes);
        },
        // 읽은 바이트: 잠겨 있으면 풀기
        open: async function (bytes) {
            if (!V.isSealed(bytes)) return bytes;
            return V.open(needKey(), bytes);
        },
        openText: async function (bytes) { return new TextDecoder().decode(await window.vault.open(bytes)); },
        lock: lockNow,
        open_panel: openPanel
    };

    start().catch(function (e) { console.error('[vault]', e); onBody(showOffline); });
})();
