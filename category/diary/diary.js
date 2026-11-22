/* ==========================================================================
   다이어리 — 바탕화면 + 창(다이어리 / 할 일 / 영수증 / 메모) + 꾸미기
   - 기록: 이 저장소의 diary/diary.json (마이홈처럼 GitHub에 커밋)
   - 사진: diary/photos/, 내가 넣은 스티커: diary/stickers/
   - 화면은 먼저 바뀌고, 저장은 뒤에서 차례로 (오른쪽 아래 '저장 중…')
   ========================================================================== */

const DATA = 'diary/diary.json';
const ASSET = 'diary/assets/';
const CHARS = [
    { id: 'c-blue',  src: ASSET + 'c-blue.png?v=2' },
    { id: 'c-pink',  src: ASSET + 'c-pink.png?v=2' },
    { id: 'c-white', src: ASSET + 'c-white.png?v=2' },
    { id: 'c-gray',  src: ASSET + 'c-gray.png?v=2' },
    { id: 'c-puppy', src: ASSET + 'c-puppy.png?v=2' }
];
// 스티커 서랍 기본 스티커: 친구들 + 말풍선 든 친구들 + 하트 말풍선
const BASE_STICKERS = CHARS.concat(['cb-blue', 'cb-pink', 'cb-white', 'cb-gray', 'b-pink', 'b-blue'].map(id => ({ id, src: ASSET + id + '.png' })));
const CHAR = Object.fromEntries(BASE_STICKERS.map(c => [c.id, c.src]));
// 말풍선 스티커: 붙이면 친구 그림 + 글이 들어가는 말풍선(글 길이만큼 늘어남)으로 그림
const BUBBLE = {
    'cb-blue':  { char: 'c-blue',  side: 'r', heart: '#a9cfe6' },
    'cb-pink':  { char: 'c-pink',  side: 'r', heart: '#f4a3b8' },
    'cb-white': { char: 'c-white', side: 'l', heart: '#a9cfe6' },
    'cb-gray':  { char: 'c-gray',  side: 'l', heart: '#f4a3b8' },
    'b-pink':   { char: null, side: 'r', heart: '#f4a3b8' },
    'b-blue':   { char: null, side: 'r', heart: '#a9cfe6' }
};

// 창 목록 (w/h는 넓은 화면 기준, x/y는 바탕 크기 비율)
const APPS = {
    diary: { title: '다이어리',      icon: 'c-blue',  w: 1120, h: 780, center: true, y: 0.015 },
    todo:  { title: '할 일',         icon: 'c-pink',  w: 380,  h: 640, x: 0.02, y: 0.03 },
    done:  { title: '오늘의 영수증', icon: 'c-white', w: 400,  h: 640, x: 0.58, y: 0.05 },
    memo:  { title: '메모',          icon: 'c-gray',  w: 440,  h: 480, x: 0.36, y: 0.16 }
};

// 꾸미기 색 묶음
const PRESETS = {
    sky:   { name: '하늘', v: { bg: '#F4F9FD', paper: '#FFFFFF', soft: '#EEF7FB', head: '#DDECF5', head2: '#C8E0EE', accent: '#F6B3C4', accent2: '#FFF1F5', today: '#FBD9E2', line: '#3B3538', thin: '#CFDDE6' } },
    berry: { name: '딸기', v: { bg: '#FFF5F7', paper: '#FFFFFF', soft: '#FFF0F3', head: '#FBD3DD', head2: '#F7BFCD', accent: '#F4A3B8', accent2: '#FFF7F9', today: '#FCE1E8', line: '#4A3A3E', thin: '#F1D6DD' } },
    pudding: { name: '푸딩', v: { bg: '#FFFAEC', paper: '#FFFFFF', soft: '#FFF6DA', head: '#FBE7A9', head2: '#F5D98A', accent: '#F6C4A0', accent2: '#FFF8E6', today: '#FDEBC2', line: '#4A3F35', thin: '#EFE2C0' } },
    mint:  { name: '민트', v: { bg: '#F2FAF5', paper: '#FFFFFF', soft: '#EAF6EE', head: '#CFE9D8', head2: '#B9DDC6', accent: '#F6B3C4', accent2: '#F7FCF8', today: '#DDF1E4', line: '#36413B', thin: '#D3E6DA' } }
};
const EDITABLE = [['bg', '바탕'], ['head', '제목줄'], ['accent', '포인트'], ['accent2', '연한 포인트'], ['today', '오늘 칸'], ['line', '테두리']];
const PATTERNS = [['none', '없음'], ['heart', '하트'], ['check', '체크'], ['dot', '물방울']];
const CELL_COLORS = [['', '없음'], ['#FBD9E2', '분홍'], ['#DDECF5', '하늘'], ['#FBEFC0', '노랑'], ['#D9EFE0', '민트'], ['#E7DDF5', '보라']];
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEK_KO = ['일', '월', '화', '수', '목', '금', '토'];

/* ---------------- 오하아사 ---------------- */
const BIRTH = '2002-04-11';
const OHA_URL = 'https://www.asahi.co.jp/ohaasa/week/horoscope/';
// おは朝 번호 순서: 01 양자리 ~ 12 물고기자리
const SIGNS = [
    { ko: '양자리', jp: '牡羊座', e: '♈' }, { ko: '황소자리', jp: '牡牛座', e: '♉' }, { ko: '쌍둥이자리', jp: '双子座', e: '♊' },
    { ko: '게자리', jp: '蟹座', e: '♋' }, { ko: '사자자리', jp: '獅子座', e: '♌' }, { ko: '처녀자리', jp: '乙女座', e: '♍' },
    { ko: '천칭자리', jp: '天秤座', e: '♎' }, { ko: '전갈자리', jp: '蠍座', e: '♏' }, { ko: '사수자리', jp: '射手座', e: '♐' },
    { ko: '염소자리', jp: '山羊座', e: '♑' }, { ko: '물병자리', jp: '水瓶座', e: '♒' }, { ko: '물고기자리', jp: '魚座', e: '♓' }
];
function signOf(birth) {
    const [, m, d] = String(birth).split('-').map(Number), md = m * 100 + d;
    // 각 별자리 시작일 (월*100+일), 양자리(3/21)부터
    const start = [321, 420, 521, 622, 723, 823, 923, 1024, 1123, 1222, 120, 219];
    for (let i = 11; i >= 0; i--) {
        const st = start[i], next = start[(i + 1) % 12];
        if (st < next ? md >= st && md < next : md >= st || md < next) return i + 1;
    }
    return 1;
}
// 받아 둔 JSON → { date: 'YYYY-MM-DD', items: [{ rank, st, text: [...] }] } (모양이 조금 달라도 읽히게 넉넉히)
function parseOha(raw) {
    if (!raw) return null;
    const top = Array.isArray(raw) ? raw[0] : raw;
    if (!top) return null;
    const list = top.detail || top.details || top.horoscope || (Array.isArray(raw) && raw[0] && raw[0].ranking_no ? raw : []);
    const pick = (o, re) => { const k = Object.keys(o).find(k => re.test(k)); return k ? o[k] : undefined; };
    const items = (list || []).map(d => {
        const rank = Number(pick(d, /rank/i));
        let st = pick(d, /horoscope_st|sign|seiza|_st$/i);
        st = Number(st) || SIGNS.findIndex(s => String(st).indexOf(s.jp) > -1) + 1;
        const text = String(pick(d, /text|comment|message/i) || '').split(/\t|\n/).map(t => t.trim()).filter(Boolean);
        return { rank, st, text };
    }).filter(x => x.rank && x.st >= 1 && x.st <= 12);
    const od = String(top.onair_date || top.date || '').replace(/\D/g, '');
    return { date: od.length >= 8 ? od.slice(0, 4) + '-' + od.slice(4, 6) + '-' + od.slice(6, 8) : '', items };
}

/* ---------------- 선 아이콘 (글자 대신: 알약 버튼 정가운데에 오게) ---------------- */
const ICO = {
    x: '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>', plus: '<path d="M8 3.5v9M3.5 8h9"/>', minus: '<path d="M3.5 8h9"/>',
    left: '<path d="M9.5 4L5.5 8l4 4"/>', right: '<path d="M6.5 4l4 4-4 4"/>', up: '<path d="M4 9.5l4-4 4 4"/>',
    play: '<path d="M5.5 4v8l6-4z" fill="currentColor"/>', stop: '<rect x="5" y="5" width="6" height="6" rx="1" fill="currentColor"/>',
    rl: '<path d="M4 8a4 4 0 1 0 1.3-2.9"/><path d="M4.8 2.8v2.6h2.6"/>', rr: '<path d="M12 8a4 4 0 1 1-1.3-2.9"/><path d="M11.2 2.8v2.6H8.6"/>',
    flip: '<path d="M8 2.5v11"/><path d="M6 5L2.8 11H6zM10 5l3.2 6H10z"/>', front: '<path d="M4 7l4-3.5L12 7M4 11.5l4-3.5 4 3.5"/>',
    back: '<path d="M4 5l4 3.5L12 5M4 9.5l4 3.5 4-3.5"/>', check: '<path d="M4 8.3l2.6 2.6L12 5.2"/>', pen: '<path d="M3.5 12.5l.7-2.6 6.6-6.6 1.9 1.9-6.6 6.6z"/>',
    copy: '<rect x="5.5" y="5.5" width="7" height="7" rx="1.5"/><path d="M10.5 3.5h-6a1 1 0 0 0-1 1v6"/>', swap: '<path d="M3.5 6h8l-2-2M12.5 10h-8l2 2"/>',
    text: '<path d="M4 4.5h8M8 4.5v7.5"/>', lock: '<rect x="4" y="7" width="8" height="5.5" rx="1.3"/><path d="M5.8 7V5.5a2.2 2.2 0 0 1 4.4 0V7"/>',
    unlock: '<rect x="4" y="7" width="8" height="5.5" rx="1.3"/><path d="M5.8 7V5.5a2.2 2.2 0 0 1 4.3-.7"/>', heart: '<path d="M8 12.5S3 9.6 3 6.4A2.4 2.4 0 0 1 8 5a2.4 2.4 0 0 1 5 1.4c0 3.2-5 6.1-5 6.1z"/>',
    reload: '<path d="M12.5 8a4.5 4.5 0 1 1-1.3-3.2"/><path d="M11.5 2.5v2.6H8.9"/>', palette: '<path d="M8 2.8a5.2 5.2 0 1 0 0 10.4c.9 0 1.2-.6 1-1.3-.3-.9.3-1.6 1.2-1.6h1.3a1.8 1.8 0 0 0 1.7-1.8A5.6 5.6 0 0 0 8 2.8z"/><circle cx="5.6" cy="7" r=".5" fill="currentColor"/><circle cx="8" cy="5.4" r=".5" fill="currentColor"/>'
};
const ic = n => '<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[n] + '</svg>';

/* ---------------- 작은 도우미 ---------------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayKey = () => ymd(new Date());
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return ymd(d); };
const monthKey = (y, m) => y + '-' + pad(m + 1);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hhmm = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const isUrl = s => /^https?:\/\/\S+$/i.test(String(s).trim());
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function stamp() {
    const d = new Date(), off = -d.getTimezoneOffset(), sg = off >= 0 ? '+' : '-';
    return ymd(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + sg + pad(Math.floor(Math.abs(off) / 60)) + ':' + pad(Math.abs(off) % 60);
}
function ddayText(dateKey) {
    const diff = Math.round((parseKey(dateKey) - parseKey(todayKey())) / 86400000);
    return diff === 0 ? 'D-DAY' : diff > 0 ? 'D-' + diff : 'D+' + (-diff);
}

function normalize(d) {
    d = d && typeof d === 'object' ? d : {};
    const obj = k => { if (!d[k] || typeof d[k] !== 'object' || Array.isArray(d[k])) d[k] = {}; };
    const arr = k => { if (!Array.isArray(d[k])) d[k] = []; };
    obj('profile'); obj('mood'); obj('goals'); obj('days'); obj('todos'); obj('theme');
    arr('ddays'); arr('bucket'); arr('music'); arr('stickers'); arr('myStickers');
    if (typeof d.memo !== 'string') d.memo = '';
    return d;
}

/* ========================================================================== */
export function init() {
    // 다른 메뉴에 다녀오면 예전 화면의 이벤트를 정리
    if (window.__dyCleanup) { try { window.__dyCleanup(); } catch (e) {} }
    const offs = [];
    const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); offs.push(() => t.removeEventListener(ev, fn, opt)); };
    window.__dyCleanup = () => offs.splice(0).forEach(f => f());

    const wrap = document.getElementById('dy-wrap');
    const desk = document.getElementById('dy-desk');
    if (!wrap || !desk) return;
    const repo = window.ghdb.repo();
    let db = normalize({});
    const localUrl = {};          // 방금 올린 사진은 저장소 반영 전까지 이 기기에서 바로 보여줌

    const isMobile = () => wrap.clientWidth < 760;
    const modal = document.getElementById('dy-modal');
    const cardBox = document.getElementById('dy-card');
    let cardFn = null;

    /* ---------------- 이미지 주소 ---------------- */
    function src(p) {
        if (!p) return '';
        if (CHAR[p]) return CHAR[p];
        if (/^(https?:|data:|blob:)/.test(p) || p.indexOf(ASSET) === 0) return p;
        return localUrl[p] || repo.url(p);
    }
    // 사이트에 아직 반영 안 된 사진은 GitHub 원본 주소로 다시 시도
    on(wrap, 'error', e => {
        const el = e.target;
        if (!el || el.tagName !== 'IMG' || el.dataset.fb) return;
        const s = el.getAttribute('src') || '';
        const i = s.indexOf('diary/');
        if (i < 0 || s.indexOf(ASSET) > -1) return;
        el.dataset.fb = '1';
        el.src = repo.rawUrl(s.slice(i).split('?')[0]) + '?t=' + Date.now();
    }, true);

    /* ---------------- 불러오기 / 저장 ---------------- */
    async function load() {
        try { db = normalize(await repo.readJSON(DATA, {})); } catch (e) { console.error(e); }
        applyTheme(); renderAll(true);
        loadOha();
    }
    const OHA = { data: null, loading: false };
    async function loadOha() {
        OHA.loading = true;
        try { OHA.data = parseOha(await repo.readJSON('diary/ohaasa.json', null)); } catch (e) { console.error(e); }
        OHA.loading = false;
        render('diary');
    }

    let pending = 0;
    function setPending(n) {
        pending = Math.max(0, n);
        const el = document.getElementById('dy-saving');
        if (el) el.textContent = pending ? '저장 중…' : '';
    }
    function canWrite() {
        if (window.ghdb.hasToken()) return true;
        alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.');
        return false;
    }
    // fn은 화면용(db)과 저장소 최신본(cur) 양쪽에 똑같이 적용됨 → id는 fn 밖에서 미리 만들어 둘 것
    function save(message, fn, files) {
        if (!canWrite()) { load(); return; }
        fn(db);
        renderAll();
        setPending(pending + 1);
        const j = {};
        j[DATA] = { mutate: cur => { cur = normalize(cur); fn(cur); cur.updated_at = stamp(); return cur; }, fallback: {} };
        repo.commit('diary: ' + message, files || {}, j).then(res => {
            setPending(pending - 1);
            if (!pending && res && res[DATA]) { db = normalize(JSON.parse(JSON.stringify(res[DATA]))); applyTheme(); renderAll(true); }
        }, e => {
            setPending(pending - 1);
            alert('저장하지 못했어요.\n' + (e.message || e));
            load();
        });
    }

    /* ---------------- 사진 고르기 / 줄이기 / 올리기 ---------------- */
    const fileInput = document.getElementById('dy-file');
    function pickFile() {
        return new Promise(res => {
            fileInput.value = '';
            fileInput.onchange = () => res(fileInput.files[0] || null);
            fileInput.oncancel = () => res(null);
            fileInput.click();
        });
    }
    async function shrink(file, max, keepAlpha) {
        if (file.type === 'image/gif') return { bytes: new Uint8Array(await file.arrayBuffer()), ext: 'gif', type: 'image/gif' };
        const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        const g = c.getContext('2d');
        if (!keepAlpha) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        const type = keepAlpha ? 'image/png' : 'image/jpeg';
        const blob = await new Promise(r => c.toBlob(r, type, 0.86));
        return { bytes: new Uint8Array(await blob.arrayBuffer()), ext: keepAlpha ? 'png' : 'jpg', type };
    }
    // → { path, files } : files를 save()에 넘기면 같은 커밋으로 올라감
    async function uploadImage(folder, max, keepAlpha) {
        if (!canWrite()) return null;
        const file = await pickFile();
        if (!file) return null;
        setPending(pending + 1);
        try {
            const r = await shrink(file, max, keepAlpha);
            const path = 'diary/' + folder + '/' + ymd(new Date()) + '-' + uid() + '.' + r.ext;
            localUrl[path] = URL.createObjectURL(new Blob([r.bytes], { type: r.type }));
            const sha = await repo.putBlob(r.bytes);
            return { path, files: { [path]: sha } };
        } catch (e) {
            alert('사진을 올리지 못했어요.\n' + (e.message || e));
            return null;
        } finally { setPending(pending - 1); }
    }
    // 더 이상 아무 데도 안 쓰는 사진이면 저장소에서도 지움
    function dropFile(path, files) {
        if (!path || CHAR[path] || path.indexOf('diary/') !== 0) return files || {};
        const used = JSON.stringify(db).split('"' + path + '"').length - 1;
        if (used <= 1) { files = files || {}; files[path] = null; }
        return files || {};
    }

    /* ---------------- 꾸미기(색/무늬) ---------------- */
    function themeVars() {
        const t = db.theme || {};
        return Object.assign({}, PRESETS[t.preset] ? PRESETS[t.preset].v : PRESETS.sky.v, t.vars || {});
    }
    function applyTheme() {
        const v = themeVars();
        Object.keys(v).forEach(k => wrap.style.setProperty('--dy-' + k, v[k]));
        wrap.dataset.pattern = (db.theme && db.theme.pattern) || 'heart';
    }

    /* ==========================================================================
       창 관리 (끌어서 옮기기 / 크기 / 앞으로 / 최소화)
       ========================================================================== */
    const wins = {};
    let zTop = 40;
    const shield = document.createElement('div'); shield.className = 'dy-shield'; wrap.appendChild(shield);
    const POS_KEY = 'dy-win-pos2';
    let posMem = {};
    try { posMem = JSON.parse(localStorage.getItem(POS_KEY) || '{}'); } catch (e) {}
    const rememberPos = () => { try { localStorage.setItem(POS_KEY, JSON.stringify(posMem)); } catch (e) {} };

    function bringFront(el) {
        Object.values(wins).forEach(w => w.classList.remove('front'));
        el.classList.add('front'); el.style.zIndex = ++zTop;
    }
    const isOpen = id => !!(wins[id] && wins[id].style.display !== 'none');
    function syncBar() {
        document.querySelectorAll('#dy-apps .dy-app').forEach(b => b.classList.toggle('on', isOpen(b.dataset.open)));
    }

    function makeWin(id) {
        const d = APPS[id];
        const el = document.createElement('div');
        el.className = 'dy-win'; el.dataset.win = id;
        const dw = desk.clientWidth, dh = desk.clientHeight;
        const mem = posMem[id] || {};
        const w = Math.min(mem.w || d.w, dw - 16), h = Math.min(mem.h || d.h, dh - 12);
        el.style.width = w + 'px'; el.style.height = h + 'px';
        el.style.left = clamp(mem.x != null ? mem.x : d.center ? Math.round((dw - w) / 2) : Math.round(dw * d.x), 0, Math.max(0, dw - 80)) + 'px';
        el.style.top = clamp(mem.y != null ? mem.y : Math.round(dh * d.y), 0, Math.max(0, dh - 40)) + 'px';
        el.innerHTML =
            '<div class="dy-tb"><img src="' + CHAR[d.icon] + '" alt=""><span class="t">' + esc(d.title) + '</span><span class="sp"></span>' +
            '<span class="ttools"></span><button class="dy-rb round" data-close title="닫기">' + ic('x') + '</button></div>' +
            '<div class="dy-body"></div><div class="dy-rs" title="크기 바꾸기"></div>';
        desk.appendChild(el);
        on(el, 'pointerdown', () => bringFront(el), true);
        el.querySelector('[data-close]').addEventListener('click', e => { e.stopPropagation(); el.style.display = 'none'; syncBar(); });

        // 제목줄 끌기
        const bar = el.querySelector('.dy-tb');
        let drag = null;
        bar.addEventListener('pointerdown', e => {
            if (e.target.closest('button') || isMobile()) return;
            drag = { mode: 'move', sx: e.clientX, sy: e.clientY, ox: parseFloat(el.style.left), oy: parseFloat(el.style.top) };
            shield.style.display = 'block'; e.preventDefault();
        });
        // 오른쪽 아래 모서리로 크기 바꾸기
        el.querySelector('.dy-rs').addEventListener('pointerdown', e => {
            if (isMobile()) return;
            drag = { mode: 'size', sx: e.clientX, sy: e.clientY, ow: el.offsetWidth, oh: el.offsetHeight };
            shield.style.display = 'block'; e.preventDefault(); e.stopPropagation();
        });
        on(window, 'pointermove', e => {
            if (!drag) return;
            if (drag.mode === 'move') {
                el.style.left = clamp(drag.ox + e.clientX - drag.sx, -el.offsetWidth * 0.6, desk.clientWidth - 60) + 'px';
                el.style.top = clamp(drag.oy + e.clientY - drag.sy, 0, desk.clientHeight - 38) + 'px';
            } else {
                el.style.width = clamp(drag.ow + e.clientX - drag.sx, 300, desk.clientWidth) + 'px';
                el.style.height = clamp(drag.oh + e.clientY - drag.sy, 240, desk.clientHeight) + 'px';
            }
        });
        on(window, 'pointerup', () => {
            if (!drag) return;
            drag = null; shield.style.display = 'none';
            posMem[id] = { x: parseFloat(el.style.left), y: parseFloat(el.style.top), w: el.offsetWidth, h: el.offsetHeight };
            rememberPos();
        });

        wins[id] = el;
        const body = el.querySelector('.dy-body');
        body.addEventListener('click', e => handle(id, e));
        body.addEventListener('change', e => handleChange(id, e));
        body.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.isComposing && e.target.matches('input[data-enter]')) { e.preventDefault(); act(id, e.target.dataset.enter, e.target); }
        });
        body.addEventListener('focusout', () => setTimeout(() => { if (dirty[id] && !body.contains(document.activeElement)) render(id); }, 60));
        render(id);
        return el;
    }

    function openWin(id) {
        if (!APPS[id]) return;
        if (isMobile()) Object.keys(wins).forEach(k => { if (k !== id) wins[k].style.display = 'none'; });
        const el = wins[id] || makeWin(id);
        el.style.display = '';
        bringFront(el); syncBar();
    }
    function toggleWin(id) {
        if (isOpen(id) && wins[id].classList.contains('front')) { wins[id].style.display = 'none'; syncBar(); return; }
        openWin(id);
    }

    /* ---------------- 다시 그리기 (입력 중인 창은 끝난 뒤에) ---------------- */
    const dirty = {};
    const RENDER = {};
    function render(id) {
        const el = wins[id]; if (!el) return;
        const body = el.querySelector('.dy-body');
        // 입력 중이면: 한 줄 추가칸은 그대로 이어 쓰게 다시 그리고, 긴 글(메모 등)은 다 쓴 뒤에 그림
        const ae = document.activeElement;
        let keep = null;
        if (body.contains(ae) && ae.matches('input, textarea')) {
            if (ae.dataset.enter) keep = '[data-enter="' + ae.dataset.enter + '"]';
            else if (ae.id === 'dy-qtext' || ae.id === 'dy-qdate') keep = '#' + ae.id;
            else { dirty[id] = true; return; }
            keep = { sel: keep, v: ae.value };
        }
        dirty[id] = false;
        const st = body.scrollTop;
        RENDER[id](body, el.querySelector('.ttools'));
        body.scrollTop = st;
        if (keep) { const n = body.querySelector(keep.sel); if (n) { n.value = keep.v; n.focus(); } }
    }
    // fromRemote: 저장소에서 새로 받아 왔을 때만 열린 카드도 다시 그림 (입력 중이면 건너뜀)
    function renderAll(fromRemote) {
        Object.keys(wins).forEach(id => render(id));
        if (fromRemote && cardFn && !cardBox.contains(document.activeElement)) cardFn();
    }

    /* ==========================================================================
       다이어리 창
       ========================================================================== */
    const now = new Date();
    let lockStk = false;
    try { lockStk = localStorage.getItem('dy-stk-lock') === '1'; } catch (e) {}
    const V = { y: now.getFullYear(), m: now.getMonth(), dd: 0, mu: 0, playing: false, deco: !lockStk, sel: null, tDate: todayKey(), rDate: todayKey(), ohaAll: false };

    RENDER.diary = (body, tools) => {
        tools.innerHTML =
            '<button class="dy-rb' + (V.deco ? '' : ' on') + '" data-tool="deco" title="스티커를 고정하면 끌거나 눌러도 안 움직여요">' + ic(V.deco ? 'unlock' : 'lock') + '<span class="lbl">' + (V.deco ? '스티커 고정' : '고정 풀기') + '</span></button>' +
            '<button class="dy-rb" data-tool="sticker" title="스티커 붙이기">' + ic('plus') + '<span class="lbl">스티커</span></button>' +
            '<button class="dy-rb" data-tool="theme" title="색 바꾸기">' + ic('palette') + '<span class="lbl">꾸미기</span></button>';
        tools.onclick = e => {
            const t = e.target.closest('[data-tool]'); if (!t) return;
            if (t.dataset.tool === 'deco') { V.deco = !V.deco; V.sel = null; try { localStorage.setItem('dy-stk-lock', V.deco ? '0' : '1'); } catch (e) {} render('diary'); }
            if (t.dataset.tool === 'sticker') openThemeCard();
            if (t.dataset.tool === 'theme') openThemeCard();
        };
        const mk = monthKey(V.y, V.m);
        body.innerHTML =
            '<div class="dy-spread' + (V.deco ? ' dy-deco' : '') + '" id="dy-spread">' +
                '<div class="dy-left">' + profileW() + goalsW(mk) + ddayW() + musicW() + ohaW() + bucketW() + '</div>' +
                '<div class="dy-right">' + calendarHTML(mk) + '</div>' +
                '<div class="dy-stk-layer" id="dy-stk-layer">' + stickersHTML() + '</div>' +
                '<div class="dy-stk-tools" id="dy-stk-tools">' +
                    '<button class="dy-rb round" data-a="stk-small" title="작게">' + ic('minus') + '</button><button class="dy-rb round" data-a="stk-big" title="크게">' + ic('plus') + '</button>' +
                    '<button class="dy-rb round" data-a="stk-rl" title="왼쪽으로 돌리기">' + ic('rl') + '</button><button class="dy-rb round" data-a="stk-rr" title="오른쪽으로 돌리기">' + ic('rr') + '</button>' +
                    '<button class="dy-rb round" data-a="stk-flip" title="좌우 뒤집기">' + ic('flip') + '</button>' +
                    '<button class="dy-rb round" data-a="stk-front" title="맨 앞으로">' + ic('front') + '</button><button class="dy-rb round" data-a="stk-back" title="맨 뒤로">' + ic('back') + '</button>' +
                    '<button class="dy-rb round" data-a="stk-dup" title="복제">' + ic('copy') + '</button><button class="dy-rb round" data-a="stk-swap" title="다른 그림으로 바꾸기">' + ic('swap') + '</button>' +
                    '<button class="dy-rb round" data-a="stk-text" title="말풍선 글 쓰기">' + ic('text') + '</button>' +
                    '<button class="dy-rb round" data-a="stk-del" title="떼기" style="color:#d77c96">' + ic('x') + '</button>' +
                '</div>' +
            '</div>';
        bindStickers(body);
        placeTools();
    };

    function widget(title, inner, cls, extra) {
        return '<div class="dy-w ' + (cls || '') + '"><div class="h"><span class="dy-heart">♥</span>' + title + (extra || '') + '</div><div class="b">' + inner + '</div></div>';
    }
    function listItems(items, kind) {
        if (!items.length) return '';
        return '<div class="dy-list">' + items.map(it =>
            '<div class="dy-li' + (it.done ? ' done' : '') + '" data-id="' + esc(it.id) + '">' +
                '<button class="dy-chk" data-a="' + kind + '-chk">' + (it.done ? ic('check') : '') + '</button>' +
                '<span class="tx" data-a="' + kind + '-edit">' + esc(it.text) + '</span>' +
                '<button class="dy-del" data-a="' + kind + '-del" title="지우기">' + ic('x') + '</button></div>').join('') + '</div>';
    }
    function profileW() {
        const p = db.profile;
        const ph = p.photo ? '<img src="' + esc(src(p.photo)) + '" alt="" style="width:100%;height:100%;object-fit:cover">' : '<img src="' + CHAR['c-white'] + '" alt="">';
        return widget('프로필',
            '<div class="dy-prof"><div class="ph" data-a="prof-photo" title="사진 바꾸기">' + ph + '</div>' +
            '<div class="nm' + (p.name ? '' : ' none') + '" data-a="prof-name" title="이름">' + (p.name ? esc(p.name) : ic('pen')) + '</div>' +
            '<div class="nt" data-a="prof-note" title="한 줄 소개">' + esc(p.note || '') + '</div>' +
            (p.photo ? '<button class="dy-rb" style="margin-top:6px" data-a="prof-unphoto">사진 빼기</button>' : '') + '</div>');
    }
    function goalsW(mk) {
        const items = db.goals[mk] || [];
        return widget('이달의 목표',
            '<div class="dy-add"><input class="dy-in" data-enter="goal-add"><button class="dy-rb round" data-a="goal-add" title="추가">' + ic('plus') + '</button></div>' + listItems(items, 'goal'));
    }
    function ddayW() {
        const list = db.ddays.slice().sort((a, b) => a.date < b.date ? -1 : 1);
        if (!list.length) return widget('D-day', '<div class="dy-dday"><div class="dd">D-?</div><button class="dy-rb round" style="margin-top:6px" data-a="dday-add" title="추가">' + ic('plus') + '</button></div>');
        V.dd = ((V.dd % list.length) + list.length) % list.length;
        const d = list[V.dd];
        return widget('D-day',
            '<div class="dy-dday" data-id="' + esc(d.id) + '"><div class="nav"><button data-a="dday-prev">' + ic('left') + '</button><span class="tt" data-a="dday-edit">' + esc(d.title) + '</span><button data-a="dday-next">' + ic('right') + '</button></div>' +
            '<div class="dd">' + ddayText(d.date) + '</div><div class="dt">' + d.date.replace(/-/g, '. ') + '.</div>' +
            '<div style="display:flex;gap:4px;justify-content:center;margin-top:6px"><button class="dy-rb round" data-a="dday-add" title="추가">' + ic('plus') + '</button><button class="dy-rb round" data-a="dday-del" title="지우기">' + ic('x') + '</button></div></div>');
    }
    function musicW() {
        const list = db.music;
        if (list.length) V.mu = ((V.mu % list.length) + list.length) % list.length;
        const t = list[V.mu];
        return widget('MUSIC',
            '<div class="dy-cd"><div class="dy-disc' + (V.playing && t ? ' spin' : '') + '"><img src="' + CHAR['c-puppy'] + '" alt=""></div><div style="min-width:0">' +
            '<div class="scr" title="' + esc(t ? t.title : '') + '">' + (t ? '♪ ' + esc(t.title) : '♪') + '</div>' +
            '<div class="ctl"><button class="dy-rb round" data-a="mu-prev">' + ic('left') + '</button><button class="dy-rb round" data-a="mu-play">' + ic(V.playing && t ? 'stop' : 'play') + '</button>' +
            '<button class="dy-rb round" data-a="mu-next">' + ic('right') + '</button><button class="dy-rb round" data-a="mu-add">' + ic('plus') + '</button>' + (t ? '<button class="dy-rb round" data-a="mu-del">' + ic('x') + '</button>' : '') + '</div>' +
            (list.length ? '<div style="font-size:10.5px;color:var(--dy-sub);margin-top:4px">' + (V.mu + 1) + ' / ' + list.length + '</div>' : '') +
            '</div></div>');
    }
    /* 오하아사(おは朝) 별자리 운세: GitHub이 매일 아침 diary/ohaasa.json 으로 받아 둠 (.github/workflows/ohaasa.yml) */
    function ohaW() {
        const sign = signOf(db.profile.birth || BIRTH);
        const o = OHA.data;
        const head = 'おは朝 운세 <span style="font-family:var(--dy-body);font-size:11px">' + SIGNS[sign - 1].e + ' ' + SIGNS[sign - 1].ko + '</span>' +
            '<button class="dy-rb round hx" data-a="oha-birth" title="생일 바꾸기" style="height:18px;width:18px;min-width:18px">' + ic('pen') + '</button>';
        if (!o || !o.items.length) {
            return widget(head, '<div class="dy-oha"><div class="dy-empty">' + (OHA.loading ? '운세 가져오는 중…' : '아침에 운세가 도착해요') + '</div>' +
                '<div style="text-align:center"><a class="dy-rb" href="' + OHA_URL + '" target="_blank" rel="noopener" style="text-decoration:none">공식 페이지</a></div></div>', 'span2');
        }
        const mine = o.items.find(x => x.st === sign);
        const isToday = o.date === todayKey();
        let inner = '<div class="dy-oha">';
        if (mine) {
            inner += '<div class="top"><div class="rk r' + mine.rank + '"><b>' + mine.rank + '</b>위</div>' +
                '<div class="tx">' + mine.text.map((t, i) => { const lucky = i === mine.text.length - 1 && mine.text.length > 1; return '<p class="' + (lucky ? 'lucky' : '') + '">' + (lucky ? '🍀 럭키 아이템 · ' : '') + esc(t) + '</p>'; }).join('') + '</div></div>';
        } else inner += '<div class="dy-empty">내 별자리를 못 찾았어요</div>';
        inner += '<div class="ft"><span>' + (o.date ? o.date.replace(/-/g, '. ') + '.' : '') + (isToday ? ' 오늘' : ' 방송 (주말엔 쉬어요)') + '</span>' +
            '<span><button class="dy-rb" data-a="oha-all">' + (V.ohaAll ? '접기' : '전체 순위') + '</button> <a class="dy-rb" href="' + OHA_URL + '" target="_blank" rel="noopener" style="text-decoration:none">원문</a></span></div>';
        if (V.ohaAll) {
            inner += '<div class="all">' + o.items.slice().sort((a, b) => a.rank - b.rank).map(x =>
                '<div class="' + (x.st === sign ? 'me' : '') + '"><b>' + x.rank + '</b> ' + (SIGNS[x.st - 1] ? SIGNS[x.st - 1].e + ' ' + SIGNS[x.st - 1].ko : '?') + '</div>').join('') + '</div>';
        }
        return widget(head, inner + '</div>', 'span2');
    }

    function bucketW() {
        return widget('BUCKET LIST',
            '<div class="dy-add"><input class="dy-in" data-enter="bucket-add"><button class="dy-rb round" data-a="bucket-add" title="추가">' + ic('plus') + '</button></div>' + listItems(db.bucket, 'bucket'), 'span2');
    }

    // 빠른 추가 날짜: 고른 날이 보고 있는 달이면 그대로, 아니면 오늘(이번 달) 또는 1일
    function quickDate(mk) {
        if (V.qdate && V.qdate.slice(0, 7) === mk) return V.qdate;
        return todayKey().slice(0, 7) === mk ? todayKey() : mk + '-01';
    }
    function calendarHTML(mk) {
        const first = new Date(V.y, V.m, 1);
        const start = new Date(V.y, V.m, 1 - first.getDay());
        const tk = todayKey();
        let cells = '';
        for (let i = 0; i < 42; i++) {
            const d = new Date(start); d.setDate(start.getDate() + i);
            const k = ymd(d), day = db.days[k] || {};
            const cls = ['dy-cell'];
            if (d.getMonth() !== V.m) cls.push('out');
            if (k === tk) cls.push('today');
            if (d.getDay() === 0) cls.push('sun');
            if (d.getDay() === 6) cls.push('sat');
            let inner = '<span class="n">' + d.getDate() + '</span>';
            const pic = day.photo || day.sticker;
            if (day.photo) inner += '<img class="ph" src="' + esc(src(day.photo)) + '" alt="" loading="lazy">';
            else if (day.sticker) inner += '<img class="st" src="' + esc(src(day.sticker)) + '" alt="" loading="lazy">';
            const ev = day.events || [];
            if (pic) {
                const dots = ev.map(() => '<i></i>').slice(0, 4).join('') + (day.link ? '<i class="l"></i>' : '') + (day.memo ? '<i class="l"></i>' : '');
                if (dots) inner += '<span class="dots">' + dots + '</span>';
            } else if (ev.length || day.memo || day.link) {
                inner += '<span class="ev">' + ev.slice(0, 2).map(e => '<span>' + esc(e.text) + '</span>').join('') +
                    (ev.length > 2 ? '<span>+' + (ev.length - 2) + '</span>' : '') +
                    (!ev.length && day.memo ? '<span>✎ ' + esc(day.memo) + '</span>' : '') +
                    (!ev.length && !day.memo && day.link ? '<span>🔗 링크</span>' : '') + '</span>';
            }
            const bg = day.color && d.getMonth() === V.m ? ' style="background-color:' + esc(day.color) + '"' : '';
            cells += '<div class="' + cls.join(' ') + '" data-a="day" data-k="' + k + '"' + bg + '>' + inner + '</div>';
        }
        return '<div class="dy-mhead"><div class="dy-month">' + MONTHS[V.m] + '</div>' +
            '<div class="dy-mood" data-a="mood" title="이달의 한 줄">' + esc(db.mood[mk] || '') + '</div>' +
            '<div class="dy-year"><button data-a="prev">' + ic('left') + '</button><b data-a="today" title="이번 달로">' + V.y + '.' + pad(V.m + 1) + '</b><button data-a="next">' + ic('right') + '</button></div></div>' +
            '<div class="dy-tabs">' + MONTHS.map((n, i) => '<button data-a="month" data-m="' + i + '" class="' + (i === V.m ? 'on' : '') + '">' + (i + 1) + '</button>').join('') + '</div>' +
            '<div class="dy-cal"><div class="row wk">' + WEEK.map(w => '<div>' + w + '</div>').join('') + '</div>' +
            '<div class="row" style="grid-row:2/8;grid-template-rows:repeat(6,1fr)">' + cells + '</div></div>' +
            '<div class="dy-quick"><input type="date" class="dy-in" id="dy-qdate" value="' + quickDate(mk) + '">' +
            '<input class="dy-in" id="dy-qtext" data-enter="quick-add">' +
            '<button class="dy-rb" data-a="quick-photo" title="사진 붙이기">사진</button><button class="dy-rb" data-a="quick-add">추가</button></div>';
    }

    /* ---------------- 붙인 스티커 ---------------- */
    // 휴대폰은 위젯 배치가 달라서 스티커 자리를 따로 기억 (mx/my, 없으면 넓은 화면 자리)
    const posOf = st => isMobile() && st.mx != null ? { x: st.mx, y: st.my } : { x: st.x, y: st.y };
    function bubbleHTML(st, b) {
        return '<div class="bb ' + b.side + (b.char ? '' : ' solo') + '"><span>' + esc(st.text || '') + '</span>' +
            '<svg class="ht" viewBox="0 0 16 16"><path d="M8 13.6S2.4 10.4 2.4 6.3A2.8 2.8 0 0 1 8 4.6a2.8 2.8 0 0 1 5.6 1.7c0 4.1-5.6 7.3-5.6 7.3z" fill="' + b.heart + '" stroke="#2b2729" stroke-width="1.3" stroke-linejoin="round"/></svg></div>';
    }
    function stickersHTML() {
        return db.stickers.map(st => {
            const b = BUBBLE[st.src], p = posOf(st);
            const img = b ? (b.char ? '<img src="' + esc(src(b.char)) + '" alt=""' + (st.f ? ' style="transform:scaleX(-1)"' : '') + '>' : '') + bubbleHTML(st, b)
                : '<img src="' + esc(src(st.src)) + '" alt=""' + (st.f ? ' style="transform:scaleX(-1)"' : '') + '>';
            // 휴대폰은 화면이 좁아서 같은 비율이면 너무 작음 → 크게
            const width = b && !b.char ? 'auto' : (isMobile() ? Math.min(st.w * 2.6, 80) : st.w) + '%';
            return '<div class="dy-stk' + (b ? ' bub' : '') + (V.sel === st.id ? ' sel' : '') + '" data-sid="' + esc(st.id) + '" style="left:' + p.x + '%;top:' + p.y + '%;width:' + width + ';z-index:' + (st.z || 1) +
                ';transform:translate(-50%,-50%) rotate(' + (st.r || 0) + 'deg)">' + img + '</div>';
        }).join('');
    }
    function bindStickers(body) {
        const spread = body.querySelector('#dy-spread');
        const layer = body.querySelector('#dy-stk-layer');
        layer.addEventListener('pointerdown', e => {
            const el = e.target.closest('.dy-stk');
            if (!el || !V.deco) return;
            e.preventDefault(); e.stopPropagation();
            V.sel = el.dataset.sid;
            layer.querySelectorAll('.dy-stk').forEach(x => x.classList.toggle('sel', x === el));
            const r = spread.getBoundingClientRect();
            const s = db.stickers.find(x => x.id === V.sel); if (!s) return;
            const p0 = posOf(s);
            const start = { x: e.clientX, y: e.clientY, sx: p0.x, sy: p0.y };
            let moved = false;
            const tools = body.querySelector('#dy-stk-tools'); tools.classList.remove('on');
            const mv = ev => {
                const nx = clamp(start.sx + (ev.clientX - start.x) / r.width * 100, 0, 100);
                const ny = clamp(start.sy + (ev.clientY - start.y) / r.height * 100, 0, 100);
                if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) > 3) moved = true;
                el.style.left = nx + '%'; el.style.top = ny + '%';
                start.nx = nx; start.ny = ny;
            };
            const up = () => {
                window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
                if (moved && start.nx != null) {
                    const id = V.sel, nx = +start.nx.toFixed(2), ny = +start.ny.toFixed(2);
                    const z = Math.max(0, ...db.stickers.map(x => x.z || 1)) + 1;
                    const mob = isMobile();
                    save('스티커 옮기기', d => { const t = d.stickers.find(x => x.id === id); if (t) { if (mob) { t.mx = nx; t.my = ny; } else { t.x = nx; t.y = ny; } t.z = z; } });
                } else placeTools();
            };
            window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
        });
        layer.addEventListener('dblclick', e => { const el = e.target.closest('.dy-stk.bub'); if (el && V.deco) { V.sel = el.dataset.sid; act('diary', 'stk-text'); } });
        spread.addEventListener('pointerdown', e => {
            if (V.deco && V.sel && !e.target.closest('.dy-stk, .dy-stk-tools')) { V.sel = null; layer.querySelectorAll('.dy-stk').forEach(x => x.classList.remove('sel')); placeTools(); }
        });
    }
    function placeTools() {
        const tools = document.getElementById('dy-stk-tools'); if (!tools) return;
        const el = V.sel && V.deco && document.querySelector('.dy-stk[data-sid="' + V.sel + '"]');
        if (!el) { tools.classList.remove('on'); return; }
        const sp = document.getElementById('dy-spread');
        const r = el.getBoundingClientRect(), pr = sp.getBoundingClientRect();
        tools.classList.add('on');
        const st = db.stickers.find(x => x.id === V.sel);
        const tb = tools.querySelector('[data-a="stk-text"]'); if (tb) tb.style.display = st && BUBBLE[st.src] ? '' : 'none';
        tools.style.left = clamp(r.left - pr.left + r.width / 2 - tools.offsetWidth / 2, 4, pr.width - tools.offsetWidth - 4) + 'px';
        tools.style.top = clamp(r.bottom - pr.top + 6, 4, pr.height - 36) + 'px';
    }
    function addSticker(srcId) {
        openWin('diary');
        const body = wins.diary.querySelector('.dy-body');
        const sp = document.getElementById('dy-spread');
        // 지금 보이는 곳 가운데쯤에 붙임
        const y = sp ? clamp((body.scrollTop + body.clientHeight / 2) / sp.offsetHeight * 100, 5, 95) : 50;
        const s = { id: uid(), src: srcId, x: +(40 + Math.random() * 20).toFixed(2), y: +y.toFixed(2), w: 9, r: Math.round(Math.random() * 16 - 8), z: Math.max(0, ...db.stickers.map(x => x.z || 1)) + 1 };
        if (isMobile()) { s.mx = s.x; s.my = s.y; }
        if (BUBBLE[srcId]) s.r = 0;                 // 말풍선은 글이 잘 보이게 똑바로
        V.deco = true; V.sel = s.id;
        if (BUBBLE[srcId]) {
            return openTextCard('', text => { s.text = text; save('말풍선 스티커 붙이기', d => { d.stickers.push(Object.assign({}, s)); }); });
        }
        save('스티커 붙이기', d => { d.stickers.push(Object.assign({}, s)); });
    }

    /* ==========================================================================
       할 일 창
       ========================================================================== */
    RENDER.todo = (body, tools) => {
        tools.innerHTML = '';
        const k = V.tDate, list = db.todos[k] || [];
        const done = list.filter(t => t.done).length;
        const d = parseKey(k);
        const sun = addDays(k, -d.getDay());
        let week = '';
        for (let i = 0; i < 7; i++) {
            const kk = addDays(sun, i), n = (db.todos[kk] || []).length;
            week += '<button data-a="t-go" data-k="' + kk + '" class="' + (kk === k ? 'on ' : '') + (kk === todayKey() ? 'today' : '') + '">' + WEEK_KO[i] + '<small>' + parseKey(kk).getDate() + '</small><i>' + (n ? '♥' : '') + '</i></button>';
        }
        const pct = list.length ? Math.round(done / list.length * 100) : 0;
        body.innerHTML =
            '<div class="dy-todo">' +
                '<div class="dy-dnav"><button class="dy-rb round" data-a="t-prev">' + ic('left') + '</button><div class="d">' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + WEEK_KO[d.getDay()] + '요일</div>' +
                '<button class="dy-rb round" data-a="t-next">' + ic('right') + '</button><button class="dy-rb" data-a="t-today">오늘</button></div>' +
                '<div class="dy-week">' + week + '</div>' +
                '<div style="display:flex;align-items:center;gap:8px"><div class="dy-prog" style="flex:1"><i style="width:' + pct + '%"></i></div><span style="font-family:var(--dy-title);font-size:12px">' + done + ' / ' + list.length + '</span></div>' +
                '<div class="dy-add" style="margin:0"><input class="dy-in" data-enter="t-add"><button class="dy-rb round" data-a="t-add" title="추가">' + ic('plus') + '</button></div>' +
                (list.length ? '<div class="dy-list">' + list.map(t =>
                    '<div class="dy-li' + (t.done ? ' done' : '') + '" data-id="' + esc(t.id) + '"><button class="dy-chk" data-a="t-chk">' + (t.done ? ic('check') : '') + '</button>' +
                    '<span class="tx" data-a="t-edit">' + esc(t.text) + '</span>' + (t.done && t.at ? '<span class="tm">' + hhmm(t.at) + '</span>' : '') +
                    '<button class="dy-del" data-a="t-up" title="위로">' + ic('up') + '</button><button class="dy-del" data-a="t-del" title="지우기">' + ic('x') + '</button></div>').join('') + '</div>'
                    : '') +
                (list.some(t => !t.done) && k < todayKey() ? '<button class="dy-rb" data-a="t-carry" style="align-self:flex-start">못 한 일 오늘로 옮기기</button>' : '') +
                '<div class="mascot"><img src="' + CHAR['c-pink'] + '" alt=""></div>' +
            '</div>';
    };

    /* ==========================================================================
       오늘의 영수증 창
       ========================================================================== */
    RENDER.done = (body, tools) => {
        tools.innerHTML = '';
        const k = V.rDate, d = parseKey(k);
        const lines = [];
        (db.todos[k] || []).filter(t => t.done).forEach(t => lines.push({ x: t.text, p: hhmm(t.at) || '✓' }));
        Object.values(db.goals).forEach(arr => (arr || []).forEach(g => { if (g.done && g.at && g.at.slice(0, 10) === k) lines.push({ x: '[목표] ' + g.text, p: hhmm(g.at) }); }));
        db.bucket.forEach(b => { if (b.done && b.at && b.at.slice(0, 10) === k) lines.push({ x: '[버킷] ' + b.text, p: hhmm(b.at) }); });
        const day = db.days[k] || {};
        (day.events || []).forEach(e => lines.push({ x: '[일정] ' + e.text, p: '·' }));
        const left = (db.todos[k] || []).filter(t => !t.done).length;
        body.innerHTML =
            '<div class="dy-rcpt-wrap">' +
                '<div class="dy-dnav" style="width:min(100%,330px)"><button class="dy-rb round" data-a="r-prev">' + ic('left') + '</button><div class="d">' + k.replace(/-/g, '. ') + '</div>' +
                '<button class="dy-rb round" data-a="r-next">' + ic('right') + '</button><button class="dy-rb" data-a="r-today">오늘</button></div>' +
                '<div class="dy-rcpt">' +
                    '<div class="top"><img src="' + CHAR['c-white'] + '" alt=""><b>TODAY\'S RECEIPT</b><small>' + d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' (' + WEEK_KO[d.getDay()] + ')</small></div>' +
                    '<hr><div class="ln"><span class="q">QTY</span><span class="x">ITEM</span><span class="p">TIME</span></div><hr>' +
                    (lines.length ? lines.map(l => '<div class="ln"><span class="q">1</span><span class="x">' + esc(l.x) + '</span><span class="p">' + esc(l.p) + '</span></div>').join('')
                        : '') +
                    '<hr><div class="tot"><span>TOTAL</span><span>' + lines.length + '</span></div>' +
                    (left ? '<div class="ln"><span class="x">남은 할 일</span><span class="p">' + left + '</span></div>' : '') +
                    '<hr><div class="msg">' + esc(day.memo || (lines.length ? '오늘도 수고했어요 ♡' : '')) + '</div>' +
                    '<div class="bc"></div><div class="msg" style="margin:0">THANK YOU ♥</div>' +
                '</div>' +
            '</div>';
    };

    /* ==========================================================================
       메모 창
       ========================================================================== */
    let memoTimer = null;
    RENDER.memo = (body, tools) => {
        tools.innerHTML = '';
        body.innerHTML =
            '<div class="dy-memo"><textarea id="dy-memo-ta">' + esc(db.memo) + '</textarea>' +
            '<div class="ft"><span id="dy-memo-st">' + (db.memo ? db.memo.length + '자' : '') + '</span><button class="dy-rb" data-a="memo-save">저장</button></div></div>';
        const ta = body.querySelector('textarea');
        ta.addEventListener('input', () => {
            document.getElementById('dy-memo-st').textContent = '쓰는 중…';
            clearTimeout(memoTimer);
            memoTimer = setTimeout(() => saveMemo(ta.value), 2500);
        });
        ta.addEventListener('blur', () => { clearTimeout(memoTimer); if (ta.value !== db.memo) saveMemo(ta.value); });
    };
    function saveMemo(v) {
        if (v === db.memo) return;
        save('메모', d => { d.memo = v; });
        const st = document.getElementById('dy-memo-st'); if (st) st.textContent = '저장함 ' + hhmm(new Date().toISOString());
    }

    /* ==========================================================================
       누르기 처리
       ========================================================================== */
    function handle(win, e) {
        const t = e.target.closest('[data-a]');
        if (!t) return;
        act(win, t.dataset.a, t, e);
    }
    function handleChange(win, e) {
        if (e.target.id === 'dy-qdate') V.qdate = e.target.value;
    }

    const rowId = t => { const r = t.closest('[data-id]'); return r && r.dataset.id; };
    const inputOf = (t, win) => { const box = t.closest('.dy-add'); return box ? box.querySelector('input') : null; };

    function listAct(kind, a, t, getList, label) {
        const id = rowId(t);
        if (a === 'add') {
            const inp = inputOf(t); const v = inp && inp.value.trim(); if (!v) { inp && inp.focus(); return; }
            const it = { id: uid(), text: v, done: false };
            inp.value = '';
            save(label + ' 추가', d => getList(d, true).push(Object.assign({}, it)));
            setTimeout(() => { const n = document.querySelector('[data-enter="' + kind + '-add"]'); n && n.focus(); }, 30);
        }
        if (a === 'chk') {
            const at = stamp();
            save(label + ' 체크', d => { const it = getList(d).find(x => x.id === id); if (it) { it.done = !it.done; if (it.done) it.at = at; else delete it.at; } });
        }
        if (a === 'edit') {
            const it = getList(db).find(x => x.id === id); if (!it) return;
            const v = prompt('고치기', it.text); if (v == null || !v.trim()) return;
            save(label + ' 고치기', d => { const x = getList(d).find(y => y.id === id); if (x) x.text = v.trim(); });
        }
        if (a === 'del') {
            save(label + ' 지우기', d => { const L = getList(d); const i = L.findIndex(x => x.id === id); if (i > -1) L.splice(i, 1); });
        }
    }

    async function act(win, a, t, e) {
        const mk = monthKey(V.y, V.m);
        const [kind, sub] = a.split('-');
        // 목표 / 버킷
        if (kind === 'goal') return listAct('goal', sub, t, (d, mk2) => { if (!d.goals[mk]) d.goals[mk] = []; return d.goals[mk]; }, '목표');
        if (kind === 'bucket') return listAct('bucket', sub, t, d => d.bucket, '버킷');

        switch (a) {
            /* 달력 이동 */
            case 'prev': V.m--; if (V.m < 0) { V.m = 11; V.y--; } return render('diary');
            case 'next': V.m++; if (V.m > 11) { V.m = 0; V.y++; } return render('diary');
            case 'today': V.y = new Date().getFullYear(); V.m = new Date().getMonth(); return render('diary');
            case 'month': V.m = +t.dataset.m; return render('diary');
            case 'oha-all': V.ohaAll = !V.ohaAll; return render('diary');
            case 'oha-birth': {
                const v = prompt('생일 (예: 2002-04-11)', db.profile.birth || BIRTH); if (v == null) return;
                if (!/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return alert('2002-04-11 처럼 적어 주세요.');
                return save('생일', d => { d.profile.birth = v.trim(); });
            }
            case 'mood': {
                const v = prompt('이달의 한 줄', db.mood[mk] || ''); if (v == null) return;
                return save('이달의 한 줄', d => { if (v.trim()) d.mood[mk] = v.trim(); else delete d.mood[mk]; });
            }
            case 'day': return openDayCard(t.dataset.k);
            case 'quick-add': {
                const k = document.getElementById('dy-qdate').value, inp = document.getElementById('dy-qtext'), v = inp.value.trim();
                if (!k || !v) { inp.focus(); return; }
                inp.value = '';
                const ev = { id: uid(), text: v };
                if (isUrl(v)) return save(k + ' 링크', d => { d.days[k] = Object.assign({}, d.days[k], { link: v }); });
                return save(k + ' 일정', d => { const day = d.days[k] = d.days[k] || {}; day.events = (day.events || []).concat([Object.assign({}, ev)]); });
            }
            case 'quick-photo': {
                const k = document.getElementById('dy-qdate').value; if (!k) return;
                return setDayPhoto(k);
            }
            /* 프로필 */
            case 'prof-photo': {
                const up = await uploadImage('photos', 600, false); if (!up) return;
                const old = db.profile.photo;
                return save('프로필 사진', d => { d.profile.photo = up.path; }, dropFile(old, up.files));
            }
            case 'prof-unphoto': {
                const old = db.profile.photo; if (!old || !confirm('프로필 사진을 뺄까요?')) return;
                return save('프로필 사진 빼기', d => { delete d.profile.photo; }, dropFile(old));
            }
            case 'prof-name': { const v = prompt('이름', db.profile.name || ''); if (v == null) return; return save('이름', d => { d.profile.name = v.trim(); }); }
            case 'prof-note': { const v = prompt('한 줄 소개', db.profile.note || ''); if (v == null) return; return save('한 줄 소개', d => { d.profile.note = v.trim(); }); }
            /* D-day */
            case 'dday-prev': V.dd--; return render('diary');
            case 'dday-next': V.dd++; return render('diary');
            case 'dday-add': {
                const title = prompt('무슨 날이에요?'); if (!title || !title.trim()) return;
                const date = prompt('날짜 (예: 2026-12-25)', todayKey()); if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) { if (date) alert('2026-12-25 처럼 적어 주세요.'); return; }
                const it = { id: uid(), title: title.trim(), date: date.trim() };
                const sorted = db.ddays.concat([it]).sort((a, b) => a.date < b.date ? -1 : 1);
                V.dd = sorted.findIndex(x => x.id === it.id);
                return save('D-day 추가', d => d.ddays.push(Object.assign({}, it)));
            }
            case 'dday-edit': {
                const id = rowId(t), it = db.ddays.find(x => x.id === id); if (!it) return;
                const title = prompt('이름', it.title); if (title == null) return;
                const date = prompt('날짜 (예: 2026-12-25)', it.date); if (date == null || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) return;
                return save('D-day 고치기', d => { const x = d.ddays.find(y => y.id === id); if (x) { x.title = title.trim() || x.title; x.date = date.trim(); } });
            }
            case 'dday-del': {
                const id = rowId(t); if (!id || !confirm('이 D-day를 지울까요?')) return;
                return save('D-day 지우기', d => { d.ddays = d.ddays.filter(x => x.id !== id); });
            }
            /* 음악 */
            case 'mu-prev': V.mu--; V.playing = false; return render('diary');
            case 'mu-next': V.mu++; V.playing = false; return render('diary');
            case 'mu-play': {
                const tr = db.music[V.mu]; if (!tr) return act(win, 'mu-add', t);
                V.playing = !V.playing;
                if (V.playing && tr.url) window.open(tr.url, '_blank', 'noopener');
                return render('diary');
            }
            case 'mu-add': {
                const title = prompt('노래 제목'); if (!title || !title.trim()) return;
                const url = prompt('링크 (유튜브 등, 없으면 비워 두기)', '') || '';
                const it = { id: uid(), title: title.trim(), url: url.trim() };
                V.mu = db.music.length;
                return save('노래 추가', d => d.music.push(Object.assign({}, it)));
            }
            case 'mu-del': {
                const tr = db.music[V.mu]; if (!tr || !confirm('"' + tr.title + '" 을(를) 뺄까요?')) return;
                return save('노래 빼기', d => { d.music = d.music.filter(x => x.id !== tr.id); });
            }
            /* 스티커 */
            case 'stk-small': case 'stk-big': case 'stk-rl': case 'stk-rr': case 'stk-flip': {
                const id = V.sel; if (!id) return;
                return save('스티커 꾸미기', d => {
                    const s = d.stickers.find(x => x.id === id); if (!s) return;
                    if (a === 'stk-small') s.w = Math.max(3, +(s.w / 1.15).toFixed(2));
                    if (a === 'stk-big') s.w = Math.min(60, +(s.w * 1.15).toFixed(2));
                    if (a === 'stk-rl') s.r = (s.r || 0) - 10;
                    if (a === 'stk-rr') s.r = (s.r || 0) + 10;
                    if (a === 'stk-flip') s.f = !s.f;
                });
            }
            case 'stk-front': case 'stk-back': {
                const id = V.sel; if (!id) return;
                const zs = db.stickers.map(x => x.z || 1), z = a === 'stk-front' ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
                return save('스티커 순서', d => { const s = d.stickers.find(x => x.id === id); if (s) s.z = z; });
            }
            case 'stk-dup': {
                const o = db.stickers.find(x => x.id === V.sel); if (!o) return;
                const c = Object.assign({}, o, { id: uid(), x: clamp(o.x + 3, 0, 100), y: clamp(o.y + 3, 0, 100), z: Math.max(...db.stickers.map(x => x.z || 1)) + 1 });
                V.sel = c.id;
                return save('스티커 복제', d => d.stickers.push(Object.assign({}, c)));
            }
            case 'stk-swap': {
                const id = V.sel; if (!id) return;
                return openPickCard('다른 그림으로 바꾸기', (db.stickers.find(x => x.id === id) || {}).src, v => {
                    save('스티커 바꾸기', d => { const s = d.stickers.find(x => x.id === id); if (s) s.src = v; });
                });
            }
            case 'stk-text': {
                const id = V.sel, st = db.stickers.find(x => x.id === id); if (!st) return;
                if (!BUBBLE[st.src]) return alert('말풍선 스티커에만 글을 쓸 수 있어요.');
                return openTextCard(st.text, v => save('말풍선 글', d => { const t = d.stickers.find(x => x.id === id); if (t) t.text = v; }));
            }
            case 'stk-del': {
                const id = V.sel; if (!id) return; V.sel = null;
                return save('스티커 떼기', d => { d.stickers = d.stickers.filter(x => x.id !== id); });
            }
            /* 할 일 */
            case 't-prev': V.tDate = addDays(V.tDate, -1); return render('todo');
            case 't-next': V.tDate = addDays(V.tDate, 1); return render('todo');
            case 't-today': V.tDate = todayKey(); return render('todo');
            case 't-go': V.tDate = t.dataset.k; return render('todo');
            case 't-add': {
                const inp = inputOf(t); const v = inp && inp.value.trim(); if (!v) { inp && inp.focus(); return; }
                const k = V.tDate, it = { id: uid(), text: v, done: false }; inp.value = '';
                save('할 일 추가', d => { (d.todos[k] = d.todos[k] || []).push(Object.assign({}, it)); });
                setTimeout(() => { const n = document.querySelector('[data-enter="t-add"]'); n && n.focus(); }, 30);
                return;
            }
            case 't-chk': {
                const k = V.tDate, id = rowId(t), at = stamp();
                return save('할 일 체크', d => { const it = (d.todos[k] || []).find(x => x.id === id); if (it) { it.done = !it.done; if (it.done) it.at = at; else delete it.at; } });
            }
            case 't-edit': {
                const k = V.tDate, id = rowId(t), it = (db.todos[k] || []).find(x => x.id === id); if (!it) return;
                const v = prompt('고치기', it.text); if (v == null || !v.trim()) return;
                return save('할 일 고치기', d => { const x = (d.todos[k] || []).find(y => y.id === id); if (x) x.text = v.trim(); });
            }
            case 't-up': {
                const k = V.tDate, id = rowId(t);
                return save('할 일 순서', d => { const L = d.todos[k] || []; const i = L.findIndex(x => x.id === id); if (i > 0) L.splice(i - 1, 0, L.splice(i, 1)[0]); });
            }
            case 't-del': {
                const k = V.tDate, id = rowId(t);
                return save('할 일 지우기', d => { d.todos[k] = (d.todos[k] || []).filter(x => x.id !== id); if (!d.todos[k].length) delete d.todos[k]; });
            }
            case 't-carry': {
                const k = V.tDate, tk = todayKey(), move = (db.todos[k] || []).filter(x => !x.done).map(x => x.id);
                if (!move.length || !confirm('못 한 일 ' + move.length + '개를 오늘로 옮길까요?')) return;
                V.tDate = tk;
                return save('할 일 옮기기', d => {
                    const from = d.todos[k] || [], to = d.todos[tk] = d.todos[tk] || [];
                    move.forEach(id => { const i = from.findIndex(x => x.id === id); if (i > -1) to.push(from.splice(i, 1)[0]); });
                    if (!from.length) delete d.todos[k];
                });
            }
            /* 영수증 */
            case 'r-prev': V.rDate = addDays(V.rDate, -1); return render('done');
            case 'r-next': V.rDate = addDays(V.rDate, 1); return render('done');
            case 'r-today': V.rDate = todayKey(); return render('done');
            /* 메모 */
            case 'memo-save': { const ta = document.getElementById('dy-memo-ta'); if (ta) { clearTimeout(memoTimer); saveMemo(ta.value); } return; }
        }
    }

    /* ==========================================================================
       카드 (날짜 / 꾸미기 / 스티커 서랍)
       ========================================================================== */
    function openCard(fn) { cardFn = fn; fn(); modal.classList.add('on'); }
    function closeCard() { cardFn = null; modal.classList.remove('on'); cardBox.innerHTML = ''; }
    document.getElementById('dy-x').onclick = closeCard;
    modal.onclick = e => { if (e.target === modal) closeCard(); };

    function stickerOptions(cur, act, withNone) {
        const mine = db.myStickers.map(s => s.path);
        return (withNone ? '<button data-' + act + '="" class="' + (!cur ? 'on' : '') + '" title="없음" style="font-size:11px;color:var(--dy-sub)">없음</button>' : '') +
            BASE_STICKERS.map(c => c.id).concat(mine).map(id => '<button data-' + act + '="' + esc(id) + '" class="' + (cur === id ? 'on' : '') + '"><img src="' + esc(src(id)) + '" alt=""></button>').join('');
    }

    async function setDayPhoto(k) {
        const up = await uploadImage('photos', 1000, false); if (!up) return;
        const old = (db.days[k] || {}).photo;
        save(k + ' 사진', d => { d.days[k] = Object.assign({}, d.days[k], { photo: up.path }); }, dropFile(old, up.files));
    }
    function cleanDay(d, k) {
        const day = d.days[k]; if (!day) return;
        if (day.events && !day.events.length) delete day.events;
        ['photo', 'sticker', 'memo', 'link', 'color'].forEach(f => { if (!day[f]) delete day[f]; });
        if (!Object.keys(day).length) delete d.days[k];
    }

    function openDayCard(k) {
        const d0 = parseKey(k);
        openCard(function draw() {
            const day = db.days[k] || {};
            const ev = day.events || [];
            cardBox.innerHTML =
                '<h3><img src="' + CHAR['c-blue'] + '" alt="">' + (d0.getMonth() + 1) + '월 ' + d0.getDate() + '일 ' + WEEK_KO[d0.getDay()] + '요일</h3>' +
                '<div class="pv">' + (day.photo ? '<img src="' + esc(src(day.photo)) + '" alt="">' : day.sticker ? '<img src="' + esc(src(day.sticker)) + '" alt="" style="width:55%">' : '') + '</div>' +
                '<div class="row" style="margin-top:8px"><button class="dy-rb" data-c="photo">사진 ' + (day.photo ? '바꾸기' : '넣기') + '</button>' + (day.photo ? '<button class="dy-rb" data-c="unphoto">사진 빼기</button>' : '') + '</div>' +
                '<div class="lb">스티커</div><div class="dy-pick">' + stickerOptions(day.sticker || '', 'st', true) + '</div>' +
                '<div class="lb">일정</div>' +
                '<div class="dy-add"><input class="dy-in" id="dy-ev-in"><button class="dy-rb round" data-c="ev-add" title="추가">' + ic('plus') + '</button></div>' +
                (ev.length ? '<div class="dy-list">' + ev.map(e => '<div class="dy-li" data-id="' + esc(e.id) + '"><span class="tx">' + esc(e.text) + '</span><button class="dy-del" data-c="ev-del">' + ic('x') + '</button></div>').join('') + '</div>' : '') +
                '<div class="lb">메모</div><textarea class="dy-in" id="dy-day-memo">' + esc(day.memo || '') + '</textarea>' +
                '<div class="lb">링크</div><div class="row"><input class="dy-in" id="dy-day-link" value="' + esc(day.link || '') + '">' +
                (day.link ? '<a class="dy-rb" href="' + esc(day.link) + '" target="_blank" rel="noopener" style="text-decoration:none">열기</a>' : '') + '</div>' +
                '<div class="lb">칸 색</div><div class="dy-seg">' + CELL_COLORS.map(([c, n]) => '<button class="dy-rb' + ((day.color || '') === c ? ' on' : '') + '" data-color="' + c + '">' +
                    (c ? '<i style="display:inline-block;width:11px;height:11px;border-radius:50%;border:1px solid var(--dy-line);background:' + c + '"></i>' : '') + n + '</button>').join('') + '</div>' +
                '<div class="foot"><button class="dy-rb" data-c="clear">이 날 비우기</button><button class="dy-rb on" data-c="close">닫기</button></div>';

            const memo = cardBox.querySelector('#dy-day-memo'), link = cardBox.querySelector('#dy-day-link'), evIn = cardBox.querySelector('#dy-ev-in');
            const saveText = () => {
                const m = memo.value.trim(), l = link.value.trim(), cur = db.days[k] || {};
                if (m === (cur.memo || '') && l === (cur.link || '')) return;
                save(k + ' 메모', d => { d.days[k] = Object.assign({}, d.days[k], { memo: m, link: l }); cleanDay(d, k); });
            };
            memo.addEventListener('blur', saveText);
            link.addEventListener('blur', saveText);
            const addEv = () => {
                const v = evIn.value.trim(); if (!v) return evIn.focus();
                const it = { id: uid(), text: v }; evIn.value = '';
                save(k + ' 일정', d => { const dd = d.days[k] = d.days[k] || {}; dd.events = (dd.events || []).concat([Object.assign({}, it)]); });
                draw(); setTimeout(() => { const n = document.getElementById('dy-ev-in'); n && n.focus(); }, 20);
            };
            evIn.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addEv(); } });

            cardBox.onclick = async e => {
                const st = e.target.closest('[data-st]'), col = e.target.closest('[data-color]'), c = e.target.closest('[data-c]');
                if (st) { const v = st.dataset.st; save(k + ' 스티커', d => { d.days[k] = Object.assign({}, d.days[k], { sticker: v }); cleanDay(d, k); }); return draw(); }
                if (col) { const v = col.dataset.color; save(k + ' 칸 색', d => { d.days[k] = Object.assign({}, d.days[k], { color: v }); cleanDay(d, k); }); return draw(); }
                if (!c) return;
                const a = c.dataset.c;
                if (a === 'close') return closeCard();
                if (a === 'photo') { await setDayPhoto(k); return cardFn && draw(); }
                if (a === 'unphoto') { const old = (db.days[k] || {}).photo; save(k + ' 사진 빼기', d => { if (d.days[k]) delete d.days[k].photo; cleanDay(d, k); }, dropFile(old)); return draw(); }
                if (a === 'ev-add') return addEv();
                if (a === 'ev-del') { const id = rowId(c); save(k + ' 일정 지우기', d => { const dd = d.days[k]; if (dd && dd.events) dd.events = dd.events.filter(x => x.id !== id); cleanDay(d, k); }); return draw(); }
                if (a === 'clear') {
                    if (!db.days[k] || !confirm('이 날의 사진, 스티커, 일정, 메모를 모두 지울까요?')) return;
                    const old = db.days[k].photo;
                    save(k + ' 비우기', d => { delete d.days[k]; }, dropFile(old));
                    return closeCard();
                }
            };
        });
    }

    // 말풍선 글 쓰기 (줄 바꿈 가능)
    function openTextCard(cur, onSave) {
        openCard(function draw() {
            cardBox.innerHTML = '<h3><img src="' + CHAR['c-pink'] + '" alt="">말풍선</h3>' +
                '<textarea class="dy-in" id="dy-bub-ta" style="min-height:90px">' + esc(cur || '') + '</textarea>' +
                '<div class="foot"><button class="dy-rb" data-c="close">닫기</button><button class="dy-rb on" data-c="ok">저장</button></div>';
            const ta = cardBox.querySelector('#dy-bub-ta'); setTimeout(() => ta.focus(), 30);
            cardBox.onclick = e => {
                const c = e.target.closest('[data-c]'); if (!c) return;
                if (c.dataset.c === 'ok') { const v = ta.value.replace(/\s+$/, ''); closeCard(); onSave(v); }
                else closeCard();
            };
        });
    }

    // 스티커 그림 고르기 (붙인 스티커 바꾸기)
    function openPickCard(title, cur, onPick) {
        openCard(function draw() {
            cardBox.innerHTML = '<h3><img src="' + CHAR['c-puppy'] + '" alt="">' + esc(title) + '</h3><div class="dy-pick">' + stickerOptions(cur || '', 'pk', false) + '</div>' +
                '<div class="foot"><span></span><button class="dy-rb on" data-c="close">닫기</button></div>';
            cardBox.onclick = e => {
                const b = e.target.closest('[data-pk]'); if (b) { closeCard(); return onPick(b.dataset.pk); }
                if (e.target.closest('[data-c="close"]')) closeCard();
            };
        });
    }

    // 꾸미기: 색 / 무늬 / 스티커 서랍
    function openThemeCard(tab) {
        let editMine = false;
        openCard(function draw() {
            const t = db.theme || {}, cur = t.preset || 'sky', v = themeVars();
            cardBox.innerHTML =
                '<h3><img src="' + CHAR['c-puppy'] + '" alt="">꾸미기</h3>' +
                '<div class="lb">색 묶음</div><div class="dy-swatch">' + Object.keys(PRESETS).map(id => {
                    const p = PRESETS[id].v;
                    return '<button data-preset="' + id + '" class="' + (cur === id && !(t.vars && Object.keys(t.vars).length) ? 'on' : '') + '"><i><b style="background:' + p.bg + '"></b><b style="background:' + p.head + '"></b><b style="background:' + p.accent + '"></b></i>' + PRESETS[id].name + '</button>';
                }).join('') + '</div>' +
                '<div class="lb">내 마음대로 색</div><div class="dy-colors">' + EDITABLE.map(([k, n]) => '<label>' + n + '<input type="color" data-var="' + k + '" value="' + v[k] + '"></label>').join('') + '</div>' +
                '<div class="lb">바탕 무늬</div><div class="dy-seg">' + PATTERNS.map(([k, n]) => '<button class="dy-rb' + ((t.pattern || 'heart') === k ? ' on' : '') + '" data-pat="' + k + '">' + n + '</button>').join('') + '</div>' +
                '<div class="lb" style="display:flex;justify-content:space-between;align-items:center">스티커 서랍 <span style="font-family:var(--dy-body);font-size:11px">누르면 다이어리에 붙어요</span></div>' +
                '<div class="dy-pick' + (editMine ? ' edit' : '') + '">' +
                    BASE_STICKERS.map(c => '<button data-put="' + c.id + '"><img src="' + c.src + '" alt=""></button>').join('') +
                    db.myStickers.map(s => '<button data-put="' + esc(s.path) + '"><img src="' + esc(src(s.path)) + '" alt=""><span class="rm" data-rm="' + esc(s.path) + '">' + ic('x') + '</span></button>').join('') +
                    '<button class="addb" data-c="add-stk" title="내 스티커 넣기">' + ic('plus') + '</button>' +
                '</div>' +
                '<div class="row" style="margin-top:8px;flex-wrap:wrap">' + (db.myStickers.length ? '<button class="dy-rb' + (editMine ? ' on' : '') + '" data-c="edit-mine">' + (editMine ? '다 지웠어요' : '내 스티커 지우기') + '</button>' : '') +
                (db.stickers.length ? '<button class="dy-rb" data-c="clear-stk">붙인 스티커 모두 떼기 (' + db.stickers.length + ')</button>' : '') + '</div>' +
                '<div class="foot"><button class="dy-rb" data-c="reset">처음 색으로</button><button class="dy-rb on" data-c="close">닫기</button></div>';

            cardBox.querySelectorAll('input[type=color]').forEach(inp => {
                inp.addEventListener('input', () => wrap.style.setProperty('--dy-' + inp.dataset.var, inp.value));   // 미리 보기
                inp.addEventListener('change', () => {
                    const k = inp.dataset.var, val = inp.value;
                    save('색 바꾸기', d => { d.theme.vars = Object.assign({}, d.theme.vars, { [k]: val }); });
                });
            });
            cardBox.onclick = async e => {
                const rm = e.target.closest('[data-rm]');
                if (rm) {
                    e.stopPropagation();
                    const p = rm.dataset.rm;
                    if (!confirm('이 스티커를 서랍에서 뺄까요? (다이어리에 붙인 것도 같이 떨어져요)')) return;
                    save('내 스티커 빼기', d => {
                        d.myStickers = d.myStickers.filter(s => s.path !== p);
                        d.stickers = d.stickers.filter(s => s.src !== p);
                        Object.keys(d.days).forEach(k => { if (d.days[k].sticker === p) { delete d.days[k].sticker; cleanDay(d, k); } });
                    }, { [p]: null });
                    return draw();
                }
                const pr = e.target.closest('[data-preset]'), pat = e.target.closest('[data-pat]'), put = e.target.closest('[data-put]'), c = e.target.closest('[data-c]');
                if (pr) { const id = pr.dataset.preset; save('색 묶음: ' + PRESETS[id].name, d => { d.theme.preset = id; delete d.theme.vars; }); applyTheme(); return draw(); }
                if (pat) { const p = pat.dataset.pat; save('바탕 무늬', d => { d.theme.pattern = p; }); applyTheme(); return draw(); }
                if (put) { if (editMine) return; closeCard(); return addSticker(put.dataset.put); }
                if (!c) return;
                const a = c.dataset.c;
                if (a === 'close') return closeCard();
                if (a === 'edit-mine') { editMine = !editMine; return draw(); }
                if (a === 'reset') { save('처음 색으로', d => { d.theme = { pattern: 'heart' }; }); applyTheme(); return draw(); }
                if (a === 'clear-stk') { if (!confirm('다이어리에 붙인 스티커를 모두 뗄까요?')) return; V.sel = null; save('스티커 모두 떼기', d => { d.stickers = []; }); return draw(); }
                if (a === 'add-stk') {
                    const up = await uploadImage('stickers', 480, true); if (!up) return;
                    save('내 스티커 넣기', d => { d.myStickers.push({ id: uid(), path: up.path }); }, up.files);
                    return cardFn && draw();
                }
            };
        });
    }

    /* ==========================================================================
       바탕화면 / 작업표시줄 / 시작 메뉴
       ========================================================================== */
    const ICONS = [
        ['diary', '다이어리'], ['todo', '할 일'], ['done', '영수증'], ['memo', '메모'], ['deco', '꾸미기']
    ];
    const iconOf = id => id === 'deco' ? 'c-puppy' : APPS[id].icon;
    document.getElementById('dy-icons').innerHTML = ICONS.map(([id, n]) =>
        '<button class="dy-icon" data-open="' + id + '" title="' + n + ' 열기"><img src="' + CHAR[iconOf(id)] + '" alt=""><span>' + n + '</span></button>').join('');
    document.getElementById('dy-apps').innerHTML = ICONS.map(([id, n]) =>
        '<button class="dy-app" data-open="' + id + '" title="' + n + '"><img src="' + CHAR[iconOf(id)] + '" alt=""></button>').join('');
    const menu = document.getElementById('dy-menu'), startBtn = document.getElementById('dy-start');
    menu.innerHTML = '<div class="head"><img src="' + CHAR['c-blue'] + '" alt="">diary ♡</div>' +
        ICONS.map(([id, n]) => '<button data-open="' + id + '"><img src="' + CHAR[iconOf(id)] + '" alt="">' + n + '</button>').join('') +
        '<button data-m="sticker"><span class="ic">' + ic('heart') + '</span>스티커 붙이기</button>' +
        '<button data-m="reload"><span class="ic">' + ic('reload') + '</span>새로 불러오기</button>';
    const closeMenu = () => { menu.classList.remove('open'); startBtn.classList.remove('open'); };
    startBtn.onclick = e => { e.stopPropagation(); menu.classList.toggle('open'); startBtn.classList.toggle('open', menu.classList.contains('open')); };
    on(document, 'pointerdown', e => { if (!menu.contains(e.target) && e.target !== startBtn) closeMenu(); });
    wrap.querySelectorAll('.dy-icon, #dy-menu [data-open]').forEach(b => b.addEventListener('click', () => {
        closeMenu();
        const id = b.dataset.open;
        id === 'deco' ? openThemeCard() : openWin(id);
    }));
    wrap.querySelectorAll('#dy-apps .dy-app').forEach(b => b.addEventListener('click', () => {
        closeMenu();
        const id = b.dataset.open;
        id === 'deco' ? openThemeCard() : toggleWin(id);
    }));
    menu.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
        closeMenu();
        if (b.dataset.m === 'sticker') openThemeCard();
        if (b.dataset.m === 'reload') load();
    }));
    on(window, 'keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('on')) return closeCard();
        if ((e.key === 'Delete' || e.key === 'Backspace') && V.sel && V.deco && !modal.classList.contains('on') && !e.target.matches('input, textarea')) {
            e.preventDefault(); act('diary', 'stk-del');
        }
    });
    on(window, 'resize', () => { placeTools(); });

    // 시계
    function tick() {
        if (!document.body.contains(wrap)) { window.__dyCleanup(); return; }
        const d = new Date();
        document.getElementById('dy-clock').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
        document.getElementById('dy-date').textContent = (d.getMonth() + 1) + '/' + d.getDate() + ' (' + WEEK_KO[d.getDay()] + ')';
    }
    tick();
    const clock = setInterval(tick, 15000);
    offs.push(() => clearInterval(clock));

    // 처음엔 다이어리만 열어 둠 (넓은 화면이면 할 일도)
    applyTheme();
    openWin('diary');
    load();
}
