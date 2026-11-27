/* ==========================================================================
   vault-core.js — 암호화 도구 (화면 vault.js 와 알림 일꾼 sw.js 가 같이 씀)
   - 데이터 키(DEK): 무작위 256비트 AES-GCM. GitHub Secret VAULT_KEY = 복구 키
   - 비밀번호 → PBKDF2-SHA256(100만 번) → 데이터 키를 감싸서 vault.json 에 (공개돼도 비밀번호 없이는 못 품)
   - 잠긴 파일 모양
       글(JSON): "WENC1." + base64(iv 12바이트 + 암호문)       ← 한 줄 글자
       그 밖(사진): "WENC" 0x01 + iv 12바이트 + 암호문            ← 바이트
   - 이 기기에 기억한 키는 IndexedDB 에 '꺼낼 수 없는(non-extractable)' 키로 저장
   ========================================================================== */
(function (g) {
    var C = g.crypto.subtle;
    var MAGIC = [0x57, 0x45, 0x4E, 0x43, 0x01];          // "WENC" 1
    var TXT = [0x57, 0x45, 0x4E, 0x43, 0x31, 0x2E];      // "WENC1."
    var CHECK = 'white-vault-ok';
    var ITER = 1000000;
    var te = new TextEncoder(), td = new TextDecoder();

    /* ---------- base64 ---------- */
    function b64(u8) {
        var s = '';
        for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
        return btoa(s);
    }
    function b64url(u8) { return b64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
    function unb64(s) {
        s = String(s).replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
        s += '='.repeat((4 - s.length % 4) % 4);
        var bin = atob(s), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return u8;
    }
    function u8(x) { return x instanceof Uint8Array ? x : new Uint8Array(x); }
    function startsWith(a, pre) {
        if (a.length < pre.length) return false;
        for (var i = 0; i < pre.length; i++) if (a[i] !== pre[i]) return false;
        return true;
    }
    function concat(a, b) { var o = new Uint8Array(a.length + b.length); o.set(a, 0); o.set(b, a.length); return o; }

    /* ---------- 어떤 파일을 잠그나 (vault.py 와 같은 규칙) ---------- */
    var PRIVATE = ['data/', 'minjung/', 'diary/', 'myhome/', 'capture/'];
    function isPrivatePath(p) {
        p = String(p || '').replace(/^\.?\//, '');
        if (!PRIVATE.some(function (x) { return p.indexOf(x) === 0; })) return false;
        if (p.indexOf('data/images/appicons/') === 0) return false;   // 홈 화면 아이콘 (폰이 직접 받아 감)
        if (p.indexOf('/assets/') > -1) return false;                 // 화면 꾸밈 그림
        if (p === 'diary/ohaasa.json') return false;                  // 공개 운세
        if (/\.md$/i.test(p)) return false;
        return true;
    }

    /* ---------- 잠금 / 풀기 ---------- */
    function isBin(a) { return startsWith(a, MAGIC); }
    function isTxt(a) { return startsWith(a, TXT); }
    function isSealed(a) { a = u8(a); return isBin(a) || isTxt(a); }

    async function rawSeal(key, plain) {
        var iv = g.crypto.getRandomValues(new Uint8Array(12));
        var ct = new Uint8Array(await C.encrypt({ name: 'AES-GCM', iv: iv }, key, plain));
        return concat(iv, ct);
    }
    async function rawOpen(key, data) {
        return new Uint8Array(await C.decrypt({ name: 'AES-GCM', iv: data.subarray(0, 12) }, key, data.subarray(12)));
    }
    async function sealBytes(key, plain) { return concat(new Uint8Array(MAGIC), await rawSeal(key, u8(plain))); }
    async function sealText(key, str) { return 'WENC1.' + b64(await rawSeal(key, te.encode(str))) + '\n'; }
    // 잠긴 파일이면 풀고, 아니면 그대로
    async function open(key, data) {
        data = u8(data);
        if (isBin(data)) return rawOpen(key, data.subarray(MAGIC.length));
        if (isTxt(data)) return rawOpen(key, unb64(td.decode(data.subarray(TXT.length)).trim()));
        return data;
    }
    async function openText(key, data) { return td.decode(await open(key, data)); }

    /* ---------- 키 ---------- */
    function importDek(raw, extractable) {
        return C.importKey('raw', raw, { name: 'AES-GCM' }, !!extractable, ['encrypt', 'decrypt']);
    }
    async function deriveKek(password, salt, iter) {
        var base = await C.importKey('raw', te.encode(String(password).normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
        return C.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }
    // vault.json 의 감싼 키를 비밀번호로 풀기 → 원래 키 바이트 (틀리면 오류)
    async function unwrapWithPassword(cfg, password) {
        var kek = await deriveKek(password, unb64(cfg.kdf.salt), cfg.kdf.iter);
        return rawOpen(kek, concat(unb64(cfg.wrap.iv), unb64(cfg.wrap.ct)));
    }
    async function wrapWithPassword(raw, password, iter) {
        var salt = g.crypto.getRandomValues(new Uint8Array(16));
        iter = iter || ITER;
        var kek = await deriveKek(password, salt, iter);
        var sealed = await rawSeal(kek, raw);
        return { kdf: { name: 'PBKDF2-SHA256', iter: iter, salt: b64(salt) }, wrap: { iv: b64(sealed.subarray(0, 12)), ct: b64(sealed.subarray(12)) } };
    }
    async function checkKey(cfg, key) {
        try { return (await openText(key, te.encode(cfg.check))) === CHECK; } catch (e) { return false; }
    }
    async function makeCheck(key) { return (await sealText(key, CHECK)).trim(); }

    /* ---------- 이 기기에 기억 (IndexedDB) ---------- */
    function dbName(scopePath) { return 'white-vault:' + (scopePath || '/'); }
    function idb(scopePath) {
        return new Promise(function (ok, fail) {
            var r = g.indexedDB.open(dbName(scopePath), 1);
            r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
            r.onsuccess = function () { ok(r.result); };
            r.onerror = function () { fail(r.error); };
        });
    }
    function tx(scopePath, mode, fn) {
        return idb(scopePath).then(function (db) {
            return new Promise(function (ok, fail) {
                var t = db.transaction('kv', mode), st = t.objectStore('kv'), out;
                var req = fn(st);
                if (req) req.onsuccess = function () { out = req.result; };
                t.oncomplete = function () { db.close(); ok(out); };
                t.onerror = t.onabort = function () { db.close(); fail(t.error); };
            });
        });
    }
    function idbGet(scopePath, k) { return tx(scopePath, 'readonly', function (s) { return s.get(k); }); }
    function idbSet(scopePath, k, v) { return tx(scopePath, 'readwrite', function (s) { return s.put(v, k); }); }
    function idbDel(scopePath, k) { return tx(scopePath, 'readwrite', function (s) { return s.delete(k); }); }

    // 기억한 키 꺼내기: CryptoKey 그대로 (안 되는 브라우저는 바이트로 저장해 둔 것)
    async function loadKey(scopePath) {
        var v = await idbGet(scopePath, 'dek');
        if (!v) return null;
        if (v.raw) return importDek(unb64(v.raw), false);
        return v.key || null;
    }
    async function saveKey(scopePath, raw) {
        var key = await importDek(raw, false);
        try { await idbSet(scopePath, 'dek', { key: key }); }
        catch (e) { await idbSet(scopePath, 'dek', { raw: b64(raw) }); }   // CryptoKey를 못 넣는 브라우저
        return key;
    }
    function forgetKey(scopePath) { return idbDel(scopePath, 'dek'); }

    g.VaultCore = {
        ITER: ITER, isPrivatePath: isPrivatePath, isSealed: isSealed,
        sealBytes: sealBytes, sealText: sealText, open: open, openText: openText,
        importDek: importDek, unwrapWithPassword: unwrapWithPassword, wrapWithPassword: wrapWithPassword,
        checkKey: checkKey, makeCheck: makeCheck,
        loadKey: loadKey, saveKey: saveKey, forgetKey: forgetKey,
        b64: b64, b64url: b64url, unb64: unb64
    };
})(typeof self !== 'undefined' ? self : this);
