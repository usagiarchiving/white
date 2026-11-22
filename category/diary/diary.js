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
// 바탕 아이콘 그림 (스티커가 아닌 것도: 리포트 폴더)
const ICON_SRC = Object.assign({ folder: ASSET + 'folder.png?v=1' }, CHAR);
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
    report: { title: '리포트',      icon: 'folder',  w: 560,  h: 680, x: 0.30, y: 0.04 },
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

/* ---------------- 같이 쓰는 기록 파일 ---------------- */
// 할 일 = Todo 카테고리와 같은 파일, 일기·프로필·내 스티커 = 김민정과 같은 파일, 집안일 = 마이홈 (영수증에 모아 보기만)
const SHARED = { todos: 'data/todos.json', mj: 'minjung/minjung.json', mh: 'myhome/myhome.json' };
const TODO_COLORS = { gray: '#bdb7b9', red: '#f08a8a', orange: '#f5b17a', yellow: '#f0cf62', green: '#9dd39a', mint: '#8fd6c6', blue: '#8fb8e8', navy: '#6b7fb8', purple: '#b79be0', pink: '#f4a3b8' };
const MYHOME_ACTS = {
    entrance: '🚪 현관 정리', shoes: '👟 신발 정리', sink: '🫧 설거지', stove: '🧽 조리대 청소', cook: '🍳 요리', upper1: '✨ 상부장 정리', upper2: '✨ 상부장 정리',
    lower1: '✨ 하부장 정리', lower2: '✨ 하부장 정리', washer: '🧺 빨래', fridge: '🧊 냉장고 정리', trash: '🗑️ 쓰레기 버리기', kfloor: '🧹 주방 바닥 청소',
    recycle: '♻️ 분리수거', table: '🍚 밥 챙겨 먹기', lfloor: '🧹 거실 바닥 청소', books: '📚 독서', drawer: '🗂️ 수납장 정리', desk: '✏️ 공부',
    bed: '🛏️ 이불 개기', vanity: '🧴 스킨케어', plant: '💧 물주기', closet: '👕 옷 정리', bath: '🛁 화장실 청소'
};
const MEAL_KO = { breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식', night: '야식' };
const BEAUTY_KO = { morning: '아침 스킨케어', night: '저녁 스킨케어', etc: '스페셜 케어', shower: '샤워' };
function prepShared(k, cur) {
    if (k === 'todos') return Array.isArray(cur) ? cur : [];
    cur = cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {};
    if (k === 'mh') { if (!cur.log || typeof cur.log !== 'object') cur.log = {}; return cur; }
    ['profile', 'diary', 'condition', 'beauty', 'quests', 'library'].forEach(f => { if (!Array.isArray(cur[f])) cur[f] = []; });
    if (!cur.quest_log || typeof cur.quest_log !== 'object') cur.quest_log = {};
    if (!cur.settings || typeof cur.settings !== 'object') cur.settings = {};
    return cur;
}
const uniq = a => a.filter((x, i) => x && a.indexOf(x) === i);
const ytId = url => { const m = /(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([\w-]{11})/.exec(url || ''); return m ? m[1] : ''; };
// 영상 제목·채널 (제목을 안 적었을 때): YouTube oEmbed → 안 되면 noembed
async function ytInfo(url) {
    for (const u of ['https://www.youtube.com/oembed?format=json&url=', 'https://noembed.com/embed?url=']) {
        try { const r = await fetch(u + encodeURIComponent(url)); if (r.ok) { const j = await r.json(); if (j.title) return { title: j.title, author: j.author_name || '' }; } } catch (e) {}
    }
    return null;
}

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
    prev: '<path d="M4 3.5v9"/><path d="M12.5 3.8v8.4L6 8z" fill="currentColor"/>', next: '<path d="M12 3.5v9"/><path d="M3.5 3.8v8.4L10 8z" fill="currentColor"/>',
    pause: '<rect x="4.2" y="3.5" width="2.6" height="9" rx=".8" fill="currentColor" stroke="none"/><rect x="9.2" y="3.5" width="2.6" height="9" rx=".8" fill="currentColor" stroke="none"/>',
    repeat: '<path d="M3 7V6a2 2 0 0 1 2-2h7.5l-2-2M13 9v1a2 2 0 0 1-2 2H3.5l2 2"/>',
    list: '<path d="M5.5 4.5h7M5.5 8h7M5.5 11.5h7"/><circle cx="3" cy="4.5" r=".6" fill="currentColor"/><circle cx="3" cy="8" r=".6" fill="currentColor"/><circle cx="3" cy="11.5" r=".6" fill="currentColor"/>',
    out: '<path d="M9 3.5h3.5V7M12.5 3.5L7.5 8.5"/><path d="M11 9.5v3H3.5V5h3"/>',
    grid: '<rect x="2.8" y="2.8" width="4.4" height="4.4" rx="1"/><rect x="8.8" y="2.8" width="4.4" height="4.4" rx="1"/><rect x="2.8" y="8.8" width="4.4" height="4.4" rx="1"/><rect x="8.8" y="8.8" width="4.4" height="4.4" rx="1"/>',
    eye: '<path d="M1.8 8S4.2 3.8 8 3.8 14.2 8 14.2 8 11.8 12.2 8 12.2 1.8 8 1.8 8z"/><circle cx="8" cy="8" r="2"/>',
    eyeoff: '<path d="M1.8 8S4.2 3.8 8 3.8 14.2 8 14.2 8 11.8 12.2 8 12.2 1.8 8 1.8 8z"/><path d="M3 13L13 3"/>',
    photo: '<rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><circle cx="6" cy="7" r="1.2"/><path d="M13.5 10.5l-3-3-5 5"/>',
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
// 시간 표시: '+09:00'처럼 시간대가 적힌 기록은 적힌 시간 그대로 (어느 기기에서 봐도 같게)
const hhmm = iso => { if (!iso) return ''; const m = /T(\d\d:\d\d)(?::\d\d(?:\.\d+)?)?[+-]\d\d:\d\d$/.exec(iso); if (m) return m[1]; const d = new Date(iso); return isNaN(d) ? '' : pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const isUrl = s => /^https?:\/\/\S+$/i.test(String(s).trim());
const safeUrl = s => isUrl(s || '') ? String(s).trim() : '';
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
    if (!d.view || typeof d.view !== 'object') d.view = {};
    if (!d.view.stk_off || typeof d.view.stk_off !== 'object') d.view.stk_off = {};
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

    /* ---------------- 다이어리 안 팝업 (브라우저 기본 팝업 대신) ---------------- */
    // ask(글, 버튼) → 예/아니오, askForm(제목, 칸들) → 값 또는 null, toast(글) → 잠깐 뜨는 알림
    function askBox(inner, onKey) {
        const el = document.createElement('div');
        el.className = 'dy-ask';
        el.innerHTML = '<div class="dy-ask-card">' + inner + '</div>';
        wrap.appendChild(el);
        return el;
    }
    function ask(msg, ok, danger) {
        return new Promise(res => {
            const el = askBox('<div class="m">' + esc(msg).replace(/\n/g, '<br>') + '</div>' +
                '<div class="foot"><button class="dy-rb" data-v="0">취소</button><button class="dy-rb on' + (danger ? ' danger' : '') + '" data-v="1">' + esc(ok || '확인') + '</button></div>');
            const done = v => { el.remove(); res(v); };
            el.onclick = e => { const b = e.target.closest('[data-v]'); if (b) done(b.dataset.v === '1'); else if (e.target === el) done(false); };
            el.dy = { esc: () => done(false), enter: () => done(true) };
            setTimeout(() => { const b = el.querySelector('[data-v="1"]'); b && b.focus(); }, 20);
        });
    }
    // fields: [{ k, label, value, type: 'text'|'date'|'time'|'textarea', ph, need }]
    function askForm(title, fields, ok) {
        return new Promise(res => {
            const el = askBox('<div class="t">' + esc(title) + '</div>' + fields.map(f => '<label class="f"><span>' + esc(f.label || '') + '</span>' +
                (f.type === 'textarea' ? '<textarea class="dy-in" data-k="' + f.k + '" placeholder="' + esc(f.ph || '') + '">' + esc(f.value || '') + '</textarea>'
                    : '<input class="dy-in" data-k="' + f.k + '" type="' + (f.type || 'text') + '" value="' + esc(f.value || '') + '" placeholder="' + esc(f.ph || '') + '">') + '</label>').join('') +
                '<div class="foot"><button class="dy-rb" data-v="0">취소</button><button class="dy-rb on" data-v="1">' + esc(ok || '저장') + '</button></div>');
            const get = () => { const o = {}; el.querySelectorAll('[data-k]').forEach(i => { o[i.dataset.k] = i.value.trim(); }); return o; };
            const done = v => {
                if (v) { const o = get(), miss = fields.find(f => f.need && !o[f.k]); if (miss) { const i = el.querySelector('[data-k="' + miss.k + '"]'); i.classList.add('need'); i.focus(); return; } el.remove(); return res(o); }
                el.remove(); res(null);
            };
            el.onclick = e => { const b = e.target.closest('[data-v]'); if (b) done(b.dataset.v === '1'); else if (e.target === el) done(false); };
            el.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing && e.target.tagName === 'INPUT') { e.preventDefault(); done(true); } };
            el.dy = { esc: () => done(false) };
            setTimeout(() => { const i = el.querySelector('[data-k]'); if (i) { i.focus(); if (i.select && i.type === 'text') i.select(); } }, 30);
        });
    }
    function toast(msg) {
        const old = wrap.querySelector('.dy-toast'); if (old) old.remove();
        const el = document.createElement('div');
        el.className = 'dy-toast'; el.textContent = msg;
        wrap.appendChild(el);
        setTimeout(() => el.classList.add('out'), 2600);
        setTimeout(() => el.remove(), 3000);
    }
    const askOpen = () => wrap.querySelector('.dy-ask');

    /* ---------------- 불러오기 / 저장 ---------------- */
    const ext = { todos: [], mj: prepShared('mj', {}), mh: prepShared('mh', {}) };
    async function load() {
        const keys = Object.keys(SHARED);
        const got = await Promise.all([repo.readJSON(DATA, {})].concat(keys.map(k => repo.readJSON(SHARED[k], k === 'todos' ? [] : {}))).map(p => p.catch(e => { console.error(e); return null; })));
        if (got[0]) db = normalize(got[0]);
        keys.forEach((k, i) => { if (got[i + 1]) ext[k] = prepShared(k, got[i + 1]); });
        applyTheme(); renderAll(true);
        loadOha();
    }
    // 다른 기기에서 쓴 기록: 화면으로 돌아오면 다시 불러옴 (입력 중·저장 중이면 건너뜀)
    on(document, 'visibilitychange', () => {
        const typing = document.activeElement && wrap.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
        if (document.visibilityState === 'visible' && !pending && !typing && !cardFn) load();
    });
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
        toast('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요');
        return false;
    }
    // fn은 화면용(db)과 저장소 최신본(cur) 양쪽에 똑같이 적용됨 → id는 fn 밖에서 미리 만들어 둘 것
    // more: 같은 커밋으로 함께 고칠 공용 파일 { todos | mj | mh: fn(그 파일 내용) }
    function save(message, fn, files, more) {
        if (!canWrite()) { load(); return; }
        more = more || {};
        if (fn) fn(db);
        Object.keys(more).forEach(k => more[k](ext[k]));
        renderAll();
        setPending(pending + 1);
        const j = {};
        if (fn) j[DATA] = { mutate: cur => { cur = normalize(cur); fn(cur); cur.updated_at = stamp(); return cur; }, fallback: {} };
        Object.keys(more).forEach(k => {
            j[SHARED[k]] = { mutate: cur => { cur = prepShared(k, cur); more[k](cur); if (k !== 'todos') cur.updated_at = stamp(); return cur; }, fallback: k === 'todos' ? [] : {} };
        });
        repo.commit('diary: ' + message, files || {}, j).then(res => {
            setPending(pending - 1);
            if (!pending && res) {
                if (res[DATA]) db = normalize(JSON.parse(JSON.stringify(res[DATA])));
                Object.keys(SHARED).forEach(k => { if (res[SHARED[k]]) ext[k] = prepShared(k, JSON.parse(JSON.stringify(res[SHARED[k]]))); });
                applyTheme(); renderAll(true);
            }
        }, e => {
            setPending(pending - 1);
            toast('저장하지 못했어요 · ' + (e.message || e));
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
            toast('사진을 올리지 못했어요 · ' + (e.message || e));
            return null;
        } finally { setPending(pending - 1); }
    }
    // 더 이상 아무 데도 안 쓰는 사진이면 저장소에서도 지움
    function dropFile(path, files) {
        if (!path || CHAR[path] || path.indexOf('diary/') !== 0) return files || {};
        const used = (JSON.stringify(db) + JSON.stringify(ext.mj.settings || {})).split('"' + path + '"').length - 1;
        if (used <= 1) { files = files || {}; files[path] = null; }
        return files || {};
    }

    /* ---------------- 김민정과 같이 쓰는 것: 프로필 · 내 스티커 모음 ---------------- */
    const mjProf = label => ((ext.mj.profile || []).find(x => x.label === label) || {}).value || '';
    function setMjProf(d, label, value) {
        const row = d.profile.find(x => x.label === label);
        if (row) row.value = value; else d.profile.push({ id: 'pf' + uid(), label, value });
    }
    function birthKey() {
        const m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(mjProf('생년월일'));
        return m ? m[1] + '-' + pad(m[2]) + '-' + pad(m[3]) : BIRTH;
    }
    // 내 스티커 = 김민정 settings.sticker_lib + 김민정 방에 붙인 스티커 + (예전) 다이어리에만 있던 것
    function placedInMj(path) {
        const st = (ext.mj.settings || {}).stickers || {};
        return ['mobile', 'pc'].some(k => (st[k] || []).some(t => t.img === path));
    }
    function myStickerPaths() {
        const set = ext.mj.settings || {}, st = set.stickers || {};
        return uniq((set.sticker_lib || []).concat((st.pc || []).map(t => t.img), (st.mobile || []).map(t => t.img), db.myStickers.map(x => x.path)));
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
            '<div class="dy-tb"><img src="' + ICON_SRC[d.icon] + '" alt=""><span class="t">' + esc(d.title) + '</span><span class="sp"></span>' +
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
            '<button class="dy-rb" data-tool="stkview" title="스티커 보이기/숨기기 (' + (isMobile() ? '휴대폰' : 'PC') + ')">' + ic(stkOff() ? 'eyeoff' : 'eye') + '<span class="lbl">스티커 ' + (stkOff() ? 'OFF' : 'ON') + '</span></button>' +
            (stkOff() ? '' : '<button class="dy-rb' + (V.deco ? '' : ' on') + '" data-tool="deco" title="스티커를 고정하면 끌거나 눌러도 안 움직여요">' + ic(V.deco ? 'unlock' : 'lock') + '<span class="lbl">' + (V.deco ? '스티커 고정' : '고정 풀기') + '</span></button>') +
            '<button class="dy-rb" data-tool="sticker" title="스티커 붙이기">' + ic('plus') + '<span class="lbl">스티커</span></button>' +
            '<button class="dy-rb" data-tool="theme" title="색 바꾸기">' + ic('palette') + '<span class="lbl">꾸미기</span></button>';
        tools.onclick = e => {
            const t = e.target.closest('[data-tool]'); if (!t) return;
            if (t.dataset.tool === 'deco') { V.deco = !V.deco; V.sel = null; try { localStorage.setItem('dy-stk-lock', V.deco ? '0' : '1'); } catch (e) {} render('diary'); }
            if (t.dataset.tool === 'sticker') openThemeCard();
            if (t.dataset.tool === 'stkview') {
                const lay = isMobile() ? 'mobile' : 'pc', off = !stkOff();
                V.sel = null;
                save('스티커 ' + (off ? '끄기' : '켜기') + ' (' + lay + ')', d => { d.view.stk_off[lay] = off; });
            }
            if (t.dataset.tool === 'theme') openThemeCard();
        };
        const mk = monthKey(V.y, V.m);
        const html =
            '<div class="dy-spread' + (V.deco && !stkOff() ? ' dy-deco' : '') + (stkOff() ? ' dy-stk-off' : '') + '" id="dy-spread">' +
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
        const keepYt = YT.on && body.querySelector('.dy-yt-frame[data-k="' + YT.on + '"], #dy-ytp[data-k="' + YT.on + '"]');
        if (keepYt) patchKeep(body.querySelector('#dy-spread'), html, keepYt.closest('.dy-w'));
        else { if (YT.player) { try { YT.player.destroy(); } catch (e) {} YT.player = null; YT.ready = false; } body.innerHTML = html; }
        if (YT.on) ytMount();
        bindStickers(body);
        placeTools();
    };

    // 다시 그리기: keep(영상 위젯)은 문서에서 한 번도 떼지 않고, 그 주변만 새것으로 바꿈 (떼면 영상이 처음부터 다시 로드됨)
    function patchKeep(oldSp, html, keep) {
        const tmp = document.createElement('div'); tmp.innerHTML = html;
        const nsp = tmp.firstElementChild, nLeft = nsp.querySelector('.dy-left'), nKeep = nLeft.querySelector('.dy-w.yt');
        const oLeft = keep.parentElement;
        oldSp.className = nsp.className;
        [...oldSp.children].forEach(c => { if (c !== oLeft) c.remove(); });
        [...oLeft.children].forEach(c => { if (c !== keep) c.remove(); });
        let before = true;
        [...nLeft.children].forEach(c => { if (c === nKeep) { before = false; return; } if (before) oLeft.insertBefore(c, keep); else oLeft.appendChild(c); });
        // 영상 칸(.yt-p)만 그대로 두고 제목·재생바·버튼은 새것으로
        const oy = keep.querySelector('.dy-yt'), ny = nKeep.querySelector('.dy-yt');
        if (oy && ny) { [...oy.children].forEach(c => { if (!c.classList.contains('yt-p')) c.remove(); }); [...ny.children].forEach(c => { if (!c.classList.contains('yt-p')) oy.appendChild(c); }); }
        let afterLeft = false;
        [...nsp.children].forEach(c => { if (c === nLeft) { afterLeft = true; return; } if (afterLeft) oldSp.appendChild(c); else oldSp.insertBefore(c, oLeft); });
    }
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
            '<div class="nm' + (mjProf('이름') ? '' : ' none') + '" data-a="prof-name" title="이름">' + (mjProf('이름') ? esc(mjProf('이름')) : ic('pen')) + '</div>' +
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
    /* YouTube: 김민정 Library(YouTube)와 같은 기록 — 위젯은 오늘 본 영상만 (하루마다 새로), 추가한 날짜·시간 그대로 */
    const YT = { i: 0, on: null, day: todayKey(), rep: false, player: null, ready: false };
    const ytList = k => ext.mj.library.filter(x => x.type === 'youtube' && x.date === k).sort((a, b) => ((a.time || '') + (a.at || '')) < ((b.time || '') + (b.at || '')) ? -1 : 1);
    function musicW() {
        const L = ytList(todayKey());
        if (L.length) YT.i = ((YT.i % L.length) + L.length) % L.length;
        const t = L[YT.i];
        const head = 'YOUTUBE<button class="dy-rb round hx" data-a="yt-list" title="목록" style="height:18px;width:18px;min-width:18px">' + ic('list') + '</button>';
        if (!t) return widget(head, '<div class="dy-yt empty"><button class="dy-rb round" data-a="yt-add" title="영상 추가">' + ic('plus') + '</button></div>', 'yt');
        const vid = ytId(t.url);
        const playing = YT.on === t.id && vid;
        const player = playing
            ? '<div class="yt-p"><div class="dy-yt-frame" id="dy-ytp" data-k="' + esc(t.id) + '" data-v="' + vid + '"></div></div>'
            : '<button class="yt-p thumb" data-a="yt-play" title="재생">' + (vid ? '<img src="https://i.ytimg.com/vi/' + vid + '/mqdefault.jpg" alt="">' : '') + '<span class="pl">' + ic('play') + '</span></button>';
        return widget(head,
            '<div class="dy-yt">' + player +
            '<div class="tt" title="' + esc(t.title || '') + '">' + esc(t.title || 'YouTube') + '</div>' +
            '<div class="sub">' + esc([t.time, t.creator].filter(Boolean).join(' · ')) + '<span class="n">' + (YT.i + 1) + ' / ' + L.length + '</span></div>' +
            '<div class="yt-bar"><span class="cur">0:00</span><input type="range" class="yt-seek" min="0" max="1000" value="0"' + (playing ? '' : ' disabled') + '><span class="dur">0:00</span></div>' +
            '<div class="yt-btns"><button class="dy-ibtn" data-a="yt-prev" title="이전">' + ic('prev') + '</button>' +
            '<button class="dy-ibtn big" data-a="yt-pp" title="재생/멈춤">' + ic(playing && YT.paused === false ? 'pause' : 'play') + '</button>' +
            '<button class="dy-ibtn" data-a="yt-next" title="다음">' + ic('next') + '</button>' +
            '<button class="dy-ibtn' + (YT.rep ? ' on' : '') + '" data-a="yt-rep" title="반복">' + ic('repeat') + '</button>' +
            '<span style="flex:1"></span><button class="dy-ibtn" data-a="yt-add" title="영상 추가">' + ic('plus') + '</button></div></div>', 'yt');
    }
    // YouTube IFrame API: 재생바·이전·재생/멈춤·다음·반복은 위젯 버튼으로
    let ytApi = null;
    function loadYtApi() {
        if (window.YT && window.YT.Player) return Promise.resolve();
        if (ytApi) return ytApi;
        ytApi = new Promise(res => {
            const prev = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (e) {} res(); };
            const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc);
        });
        return ytApi;
    }
    const mmss = v => { v = Math.max(0, Math.floor(v || 0)); return Math.floor(v / 60) + ':' + pad(v % 60); };
    function ytWidget() { return document.querySelector('.dy-w.yt'); }
    function ytSetIcon(playing) { const b = document.querySelector('.dy-w.yt [data-a="yt-pp"]'); if (b) b.innerHTML = ic(playing ? 'pause' : 'play'); }
    async function ytMount() {
        const el = document.getElementById('dy-ytp');
        if (!el || el.tagName === 'IFRAME' || el.dataset.mounting) return;
        el.dataset.mounting = '1';
        await loadYtApi();
        if (!document.body.contains(el)) return;
        YT.ready = false;
        YT.player = new window.YT.Player(el, {
            videoId: el.dataset.v, host: 'https://www.youtube-nocookie.com',
            playerVars: { autoplay: 1, playsinline: 1, rel: 0, controls: 0, modestbranding: 1, iv_load_policy: 3 },
            events: {
                onReady: e => { YT.ready = true; const f = e.target.getIframe(); f.classList.add('dy-yt-frame'); f.dataset.k = YT.on; e.target.playVideo(); },
                onStateChange: e => {
                    ytSetIcon(e.data === 1);
                    YT.paused = e.data !== 1;
                    if (e.data === 0) { if (YT.rep) { e.target.seekTo(0, true); e.target.playVideo(); } else ytStep(1, true); }
                }
            }
        });
    }
    // 이전/다음: 재생 중이면 플레이어에 바로 넣고, 아니면 썸네일만 바꿈
    function ytStep(dir, auto) {
        const L = ytList(todayKey()); if (!L.length) return;
        if (auto && YT.i + dir >= L.length) return;                      // 끝까지 다 봤으면 멈춤
        YT.i = ((YT.i + dir) % L.length + L.length) % L.length;
        const x = L[YT.i], vid = ytId(x.url);
        if (YT.on && YT.player && YT.ready && vid) {
            YT.on = x.id;
            const f = YT.player.getIframe(); if (f) f.dataset.k = x.id;
            YT.player.loadVideoById(vid);
        } else if (YT.on) { YT.on = null; }
        render('diary');
    }
    // 재생바: 0.5초마다 위치 표시
    const ytTick = setInterval(() => {
        const w = ytWidget(); if (!w || !YT.player || !YT.ready || !YT.on) return;
        let cur = 0, dur = 0; try { cur = YT.player.getCurrentTime(); dur = YT.player.getDuration(); } catch (e) { return; }
        const sk = w.querySelector('.yt-seek'); if (!sk) return;
        sk.disabled = false;
        if (!sk.matches(':active')) sk.value = dur ? Math.round(cur / dur * 1000) : 0;
        w.querySelector('.cur').textContent = mmss(cur); w.querySelector('.dur').textContent = mmss(dur);
    }, 500);
    offs.push(() => { clearInterval(ytTick); try { if (YT.player) YT.player.destroy(); } catch (e) {} });
    on(wrap, 'input', e => {
        if (!e.target.matches('.yt-seek') || !YT.player || !YT.ready) return;
        const dur = YT.player.getDuration(); if (dur) YT.player.seekTo(e.target.value / 1000 * dur, true);
    });

    // 영상 추가/고치기 카드: 링크 · 제목(비우면 영상 제목) · 태그 · 메모 · 날짜/시간
    async function ytForm(it) {
        const now = stamp();
        const f = await askForm(it ? 'YouTube 고치기' : 'YouTube 추가', [
            { k: 'url', label: '링크', value: it ? it.url : '', ph: 'https://youtu.be/…', need: true },
            { k: 'title', label: '제목', value: it ? it.title : '', ph: '비우면 영상 제목으로' },
            { k: 'tags', label: '태그', value: it && it.tags ? it.tags.map(x => '#' + x).join(' ') : '', ph: '#태그' },
            { k: 'memo', label: '메모', type: 'textarea', value: it ? it.memo || '' : '' },
            { k: 'date', label: '날짜', type: 'date', value: it ? it.date : now.slice(0, 10) },
            { k: 'time', label: '시간', type: 'time', value: it ? it.time : now.slice(11, 16) }
        ], it ? '저장' : '추가');
        if (!f) return;
        if (!safeUrl(f.url)) return toast('링크는 http:// 또는 https:// 로 시작해야 해요');
        let title = f.title, creator = it ? it.creator : '';
        if (!title || !creator) {
            toast('영상 정보 가져오는 중…');
            const info = await ytInfo(f.url);
            if (info) { if (!title) title = info.title; if (!creator) creator = info.author; }
        }
        const row = { type: 'youtube', title: title || 'YouTube', url: f.url, status: 'done', date: f.date || now.slice(0, 10), time: f.time || now.slice(11, 16), at: stamp() };
        if (creator) row.creator = creator;
        const tags = f.tags.split(/[#,\s]+/).map(x => x.trim()).filter(Boolean); if (tags.length) row.tags = tags;
        if (f.memo) row.memo = f.memo;
        const id = it ? it.id : 'lb' + uid();
        save('YouTube ' + (it ? '고치기' : '추가'), null, null, { mj: d => {
            const ex = d.library.find(x => x.id === id);
            if (ex) { ['title', 'url', 'date', 'time', 'at', 'creator', 'tags', 'memo'].forEach(k => { if (row[k] != null) ex[k] = JSON.parse(JSON.stringify(row[k])); else delete ex[k]; }); }
            else d.library.push(Object.assign({ id }, JSON.parse(JSON.stringify(row))));
        } });
        if (!it && row.date === todayKey()) { YT.i = Math.max(0, ytList(todayKey()).findIndex(x => x.id === id)); YT.on = null; render('diary'); }
    }
    // 목록 (플레이리스트): 날짜별로, 오늘이 기본
    function openYtList() {
        YT.day = todayKey();
        openCard(function draw() {
            const k = YT.day, L = ytList(k);
            cardBox.innerHTML = '<h3><img src="' + CHAR['c-puppy'] + '" alt="">YouTube</h3>' +
                '<div class="dy-dnav"><button class="dy-rb round" data-y="prev">' + ic('left') + '</button><div class="d">' + k.replace(/-/g, '. ') + (k === todayKey() ? ' · 오늘' : '') + '</div>' +
                '<button class="dy-rb round" data-y="next">' + ic('right') + '</button></div>' +
                '<div class="dy-ytl">' + L.map(x => {
                    const v = ytId(x.url);
                    return '<div class="it" data-id="' + esc(x.id) + '">' + (v ? '<img src="https://i.ytimg.com/vi/' + v + '/mqdefault.jpg" alt="" data-y="play">' : '<span class="noimg" data-y="play"></span>') +
                        '<div class="mt"><div class="tt" data-y="play">' + esc(x.title || 'YouTube') + '</div><div class="sub">' + esc([x.time, x.creator].filter(Boolean).join(' · ')) + '</div>' +
                        ((x.tags || []).length ? '<div class="tg">' + x.tags.map(g => '#' + esc(g)).join(' ') + '</div>' : '') +
                        (x.memo ? '<div class="mm">' + esc(x.memo) + '</div>' : '') + '</div>' +
                        '<span class="bt">' + (safeUrl(x.url) ? '<a class="dy-del" href="' + esc(safeUrl(x.url)) + '" target="_blank" rel="noopener" title="YouTube에서 열기">' + ic('out') + '</a>' : '') +
                        '<button class="dy-del" data-y="edit" title="고치기">' + ic('pen') + '</button><button class="dy-del" data-y="del" title="지우기">' + ic('x') + '</button></span></div>';
                }).join('') + '</div>' +
                '<div class="foot"><button class="dy-rb" data-y="add">' + ic('plus') + '<span class="lbl">추가</span></button><span style="flex:1"></span><button class="dy-rb on" data-y="close">닫기</button></div>';
        });
        cardBox.onclick = async e => {
            const b = e.target.closest('[data-y]'); if (!b) return;
            const a = b.dataset.y, id = rowId(b), it = id && ext.mj.library.find(x => x.id === id);
            if (a === 'close') return closeCard();
            if (a === 'prev' || a === 'next') { YT.day = addDays(YT.day, a === 'next' ? 1 : -1); return cardFn && cardFn(); }
            if (a === 'add') { await ytForm(null); return cardFn && cardFn(); }
            if (a === 'edit' && it) { await ytForm(it); return cardFn && cardFn(); }
            if (a === 'del' && it) {
                if (!(await ask('"' + (it.title || 'YouTube') + '" 을(를) 지울까요?\n김민정 Library에서도 지워져요', '지우기', true))) return;
                save('YouTube 지우기', null, null, { mj: d => { d.library = d.library.filter(x => x.id !== id); } });
                return cardFn && cardFn();
            }
            if (a === 'play' && it) {
                if (it.date !== todayKey() || !ytId(it.url)) { if (safeUrl(it.url)) window.open(safeUrl(it.url), '_blank', 'noopener'); return; }
                YT.i = ytList(todayKey()).findIndex(x => x.id === id); YT.on = id; closeCard(true); render('diary');
            }
        };
    }
    /* 오하아사(おは朝) 별자리 운세: GitHub이 매일 아침 diary/ohaasa.json 으로 받아 둠 (.github/workflows/ohaasa.yml) */
    function ohaW() {
        const sign = signOf(birthKey());
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
    const firstLine = b => String(b || '').split('\n').map(l => l.trim()).filter(l => l && !/^!\[\]\(/.test(l))[0] || '';
    const diaryOf = k => ext.mj.diary.filter(x => x.date === k).sort((a, b) => (a.time || '') < (b.time || '') ? -1 : 1);
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
            // 일정은 날짜 밑에 꾸밈 칩으로, 일기(김민정 Diary와 같은 기록)는 글만
            const diaryTx = diaryOf(k).map(x => x.title || firstLine(x.body)).concat(day.memo ? [day.memo] : []).filter(Boolean);
            if (pic) {
                if (ev.length || diaryTx.length || day.link) inner += '<span class="dots">' + ev.concat(diaryTx).slice(0, 4).map(() => '<i></i>').join('') + (day.link ? '<i class="l"></i>' : '') + '</span>';
            } else if (ev.length || diaryTx.length) {
                inner += '<span class="cb">' + ev.map(e => '<span class="ev1">' + esc(e.text) + '</span>').join('') +
                    diaryTx.map(t => '<span class="dtx">' + esc(t) + '</span>').join('') + '</span>';
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
    const stkOff = () => !!db.view.stk_off[isMobile() ? 'mobile' : 'pc'];
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
        if (spread.dataset.bound) return;            // 영상 재생 중 부분만 다시 그릴 때는 이미 붙어 있음
        spread.dataset.bound = '1';
        spread.addEventListener('pointerdown', e => {
            const ly = spread.querySelector('#dy-stk-layer');
            if (V.deco && V.sel && !e.target.closest('.dy-stk, .dy-stk-tools')) { V.sel = null; ly.querySelectorAll('.dy-stk').forEach(x => x.classList.remove('sel')); placeTools(); }
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
        if (BUBBLE[srcId]) { s.r = 0; s.w = 5.5; }  // 말풍선은 글이 잘 보이게 똑바로, 조금 작게
        V.deco = true; V.sel = s.id;
        const lay = isMobile() ? 'mobile' : 'pc';
        if (stkOff()) save('스티커 켜기 (' + lay + ')', d => { d.view.stk_off[lay] = false; });
        if (BUBBLE[srcId]) {
            return openTextCard('', text => { s.text = text; save('말풍선 스티커 붙이기', d => { d.stickers.push(Object.assign({}, s)); }); });
        }
        save('스티커 붙이기', d => { d.stickers.push(Object.assign({}, s)); });
    }

    /* ==========================================================================
       할 일 창
       ========================================================================== */
    // Todo 카테고리와 같은 규칙: 오늘은 밀린 일(못 한 일)도 같이, 다른 날은 그날 계획/완료한 일
    function todosFor(k) {
        const t = todayKey();
        return ext.todos.filter(x => !x.parent_id && (k === t
            ? (!x.is_completed && (!x.target_date || x.target_date <= t)) || (x.is_completed && (x.completed_date || x.target_date) === t)
            : x.is_completed ? (x.completed_date || x.target_date) === k : x.target_date === k))
            .sort((a, b) => (a.is_completed - b.is_completed) || ((a.sort_order || 0) - (b.sort_order || 0)));
    }
    // 할 일 창: 보기 편한 목록 (저장은 Todo 카테고리와 같은 data/todos.json)
    // Todo 카테고리와 같은 규칙: 오늘은 밀린 일도 같이, 다른 날은 그날 계획/완료한 일
    const findTodo = (list, id) => list.find(x => String(x.id) === String(id));
    RENDER.todo = (body, tools) => {
        tools.innerHTML = '<button class="dy-ibtn" data-tool="quad" title="사분면 보기">' + ic('grid') + '</button>';
        tools.onclick = e => { if (e.target.closest('[data-tool="quad"]')) openQuadCard(); };
        const k = V.tDate, list = todosFor(k), tk = todayKey();
        const done = list.filter(t => t.is_completed).length;
        const d = parseKey(k);
        const sun = addDays(k, -d.getDay());
        let week = '';
        for (let i = 0; i < 7; i++) {
            const kk = addDays(sun, i), n = ext.todos.some(x => !x.parent_id && (x.target_date === kk || (x.is_completed && x.completed_date === kk)));
            week += '<button data-a="t-go" data-k="' + kk + '" class="' + (kk === k ? 'on ' : '') + (kk === tk ? 'today' : '') + '">' + WEEK_KO[i] + '<small>' + parseKey(kk).getDate() + '</small><i>' + (n ? '♥' : '') + '</i></button>';
        }
        const pct = list.length ? Math.round(done / list.length * 100) : 0;
        body.innerHTML =
            '<div class="dy-todo">' +
                '<div class="dy-dnav"><button class="dy-rb round" data-a="t-prev">' + ic('left') + '</button><div class="d">' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + WEEK_KO[d.getDay()] + '요일</div>' +
                '<button class="dy-rb round" data-a="t-next">' + ic('right') + '</button><button class="dy-rb" data-a="t-today">오늘</button></div>' +
                '<div class="dy-week">' + week + '</div>' +
                '<div style="display:flex;align-items:center;gap:8px"><div class="dy-prog" style="flex:1"><i style="width:' + pct + '%"></i></div><span style="font-family:var(--dy-title);font-size:11px">' + done + ' / ' + list.length + '</span></div>' +
                '<div class="dy-add" style="margin:0"><input class="dy-in" data-enter="t-add"><button class="dy-rb round" data-a="t-add" title="추가">' + ic('plus') + '</button></div>' +
                (list.length ? '<div class="dy-list">' + list.map(t => {
                    const late = !t.is_completed && t.target_date && t.target_date < k;
                    const sub = (t.subtasks || []).length ? '<span class="tm">' + t.subtasks.filter(x => x.is_completed).length + '/' + t.subtasks.length + '</span>' : '';
                    return '<div class="dy-li' + (t.is_completed ? ' done' : '') + '" data-id="' + esc(t.id) + '">' +
                        '<button class="dy-chk" data-a="t-chk">' + (t.is_completed ? ic('check') : '') + '</button>' +
                        '<span class="tx" data-a="t-edit">' + esc(t.content) + '</span>' + sub +
                        (late ? '<span class="tm late">' + t.target_date.slice(5).replace('-', '.') + '</span>' : '') +
                        (t.is_completed && t.completed_at ? '<span class="tm">' + hhmm(t.completed_at) + '</span>' : '') +
                        '<button class="dy-del" data-a="t-up" title="위로">' + ic('up') + '</button><button class="dy-del" data-a="t-del" title="지우기">' + ic('x') + '</button></div>';
                }).join('') + '</div>' : '') +
                (k < tk && list.some(t => !t.is_completed) ? '<button class="dy-rb" data-a="t-carry" style="align-self:flex-start">못 한 일 오늘로 옮기기</button>' : '') +
            '</div>';
    };
    // 사분면 (보기 전용): Todo 카테고리 매트릭스와 같은 기준 — 오늘까지의 못 한 일
    const QUADS = [[1, '실행', '긴급 · 중요'], [2, '계획', '중요'], [3, '위임', '긴급'], [4, '제거', '']];
    function openQuadCard() {
        const tk = todayKey();
        const open = ext.todos.filter(t => !t.parent_id && !t.is_completed && (!t.target_date || t.target_date <= tk))
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const item = t => '<div class="q-i"><i style="background:' + (TODO_COLORS[t.category] || TODO_COLORS.gray) + '"></i><span>' + esc(t.content) + '</span>' +
            (t.target_date && t.target_date < tk ? '<em>' + t.target_date.slice(5).replace('-', '.') + '</em>' : '') + '</div>';
        const box = q => { const L = open.filter(t => Number(t.matrix_quadrant || 0) === q); return L.length ? L.map(item).join('') : ''; };
        openCard(() => {
            cardBox.innerHTML = '<h3><img src="' + CHAR['c-pink'] + '" alt="">사분면</h3>' +
                '<div class="dy-quad"><span></span><b>긴급함</b><b>긴급하지 않음</b>' +
                    '<b class="side">중요함</b><div class="q q1"><div class="qh">실행</div>' + box(1) + '</div><div class="q q2"><div class="qh">계획</div>' + box(2) + '</div>' +
                    '<b class="side">중요하지 않음</b><div class="q q3"><div class="qh">위임</div>' + box(3) + '</div><div class="q q4"><div class="qh">제거</div>' + box(4) + '</div></div>' +
                (box(0) ? '<div class="lb">미지정</div><div class="q q0">' + box(0) + '</div>' : '') +
                '<div class="foot"><span></span><button class="dy-rb on" data-c="close">닫기</button></div>';
            cardBox.onclick = e => { if (e.target.closest('[data-c="close"]')) closeCard(); };
        });
    }

    /* ==========================================================================
       오늘의 영수증 창 — 할 일 · 김민정 루틴/식사/뷰티 · 마이홈 집안일 · 목표/버킷을 한 장에
       ========================================================================== */
    function receiptLines(k) {
        const L = [], mj = ext.mj;
        ext.todos.filter(t => !t.parent_id && t.is_completed && (t.completed_date || t.target_date) === k)
            .forEach(t => L.push({ x: t.content, p: hhmm(t.completed_at) }));
        const ql = mj.quest_log[k] || {};
        Object.keys(ql).forEach(id => { const q = mj.quests.find(x => x.id === id); if (q) L.push({ x: '[루틴] ' + q.title, p: String(ql[id] || '').slice(0, 5) }); });
        Object.keys(ext.mh.log).forEach(id => { const r = (ext.mh.log[id] || {})[k]; if (r && r.done) L.push({ x: '[집] ' + (MYHOME_ACTS[id] || id) + (r.count > 1 ? ' ×' + r.count : ''), p: hhmm(r.at) }); });
        mj.condition.filter(c => c.date === k).forEach(c => {
            if (c.type === 'meal') L.push({ x: '[식사] ' + (MEAL_KO[c.slot] || '') + (c.memo ? ' · ' + c.memo : ''), p: c.time || '' });
            if (c.type === 'medicine') L.push({ x: '[약] ' + (c.name || '') + (c.memo ? ' · ' + c.memo : ''), p: c.time || '' });
        });
        mj.beauty.filter(b => b.date === k).forEach(b => L.push({ x: '[뷰티] ' + (BEAUTY_KO[b.slot] || b.slot || '') + ((b.steps || []).length ? ' · ' + b.steps.join(', ') : ''), p: b.time || '' }));
        Object.values(db.goals).forEach(arr => (arr || []).forEach(g => { if (g.done && g.at && g.at.slice(0, 10) === k) L.push({ x: '[목표] ' + g.text, p: hhmm(g.at) }); }));
        db.bucket.forEach(b => { if (b.done && b.at && b.at.slice(0, 10) === k) L.push({ x: '[버킷] ' + b.text, p: hhmm(b.at) }); });
        return L.sort((a, b) => (a.p || '99') < (b.p || '99') ? -1 : 1).map(l => Object.assign(l, { p: l.p || '✓' }));
    }
    RENDER.done = (body, tools) => {
        tools.innerHTML = '';
        const k = V.rDate, d = parseKey(k);
        const lines = receiptLines(k);
        const left = todosFor(k).filter(t => !t.is_completed).length;
        const entry = ext.mj.diary.filter(x => x.date === k).sort((a, b) => (a.time || '') < (b.time || '') ? -1 : 1)[0];
        const rc = (db.receipt && db.receipt.img) || 'c-white';
        const isPhoto = !CHAR[rc];
        body.innerHTML =
            '<div class="dy-rcpt-wrap">' +
                '<div class="dy-dnav" style="width:min(100%,330px)"><button class="dy-rb round" data-a="r-prev">' + ic('left') + '</button><div class="d">' + k.replace(/-/g, '. ') + '</div>' +
                '<button class="dy-rb round" data-a="r-next">' + ic('right') + '</button><button class="dy-rb" data-a="r-today">오늘</button></div>' +
                '<div class="dy-rcpt">' +
                    '<div class="top"><button class="rimg' + (isPhoto ? ' photo' : '') + '" data-a="r-img" title="그림 바꾸기"><img src="' + esc(src(rc)) + '" alt=""></button>' +
                    '<b>TODAY\'S RECEIPT</b><small>' + d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' (' + WEEK_KO[d.getDay()] + ')</small></div>' +
                    '<hr><div class="ln"><span class="q">QTY</span><span class="x">ITEM</span><span class="p">TIME</span></div><hr>' +
                    lines.map(l => '<div class="ln"><span class="q">1</span><span class="x">' + esc(l.x) + '</span><span class="p">' + esc(l.p) + '</span></div>').join('') +
                    '<hr><div class="tot"><span>TOTAL</span><span>' + lines.length + '</span></div>' +
                    (left ? '<div class="ln"><span class="x">남은 할 일</span><span class="p">' + left + '</span></div>' : '') +
                    '<hr><div class="msg">' + esc(entry ? (entry.title || (entry.body || '').split('\n')[0]) : (lines.length ? '오늘도 수고했어요 ♡' : '')) + '</div>' +
                    '<div class="bc"></div><div class="msg" style="margin:0">THANK YOU ♥</div>' +
                '</div>' +
            '</div>';
    };
    // 영수증 위 그림: 스티커 또는 내 사진으로
    function openReceiptImgCard() {
        const cur = (db.receipt && db.receipt.img) || 'c-white';
        openCard(function draw() {
            cardBox.innerHTML = '<h3><img src="' + CHAR['c-white'] + '" alt="">영수증 그림</h3>' +
                '<div class="dy-pick">' + stickerOptions(cur, 'rimg', false) + '</div>' +
                '<div class="foot"><button class="dy-rb" data-c="photo">' + ic('photo') + '<span class="lbl">사진으로</span></button><button class="dy-rb on" data-c="close">닫기</button></div>';
            cardBox.onclick = async e => {
                const b = e.target.closest('[data-rimg]'), c = e.target.closest('[data-c]');
                const old = cur;
                if (b) { const v = b.dataset.rimg; closeCard(); return save('영수증 그림', d => { d.receipt = { img: v }; }, dropFile(old)); }
                if (!c) return;
                if (c.dataset.c === 'close') return closeCard();
                if (c.dataset.c === 'photo') {
                    const up = await uploadImage('photos', 500, false); if (!up) return;
                    closeCard();
                    save('영수증 사진', d => { d.receipt = { img: up.path }; }, dropFile(old, up.files));
                }
            };
        });
    }

    /* ==========================================================================
       리포트 (폴더) — 한 달 기록 분석: 할 일 · 생활 · 일기
       ========================================================================== */
    const MOOD_EMO = { love: '🥰', good: '😊', okay: '🙂', meh: '😐', tired: '😪', sad: '😢', anxious: '😰', angry: '😠' };
    const R = { m: todayKey().slice(0, 7), tab: 'todo', open: {} };
    const HEART = on => '<svg class="hh' + (on ? ' on' : '') + '" viewBox="0 0 16 16"><path d="M8 13.4S2.6 10.3 2.6 6.4A2.7 2.7 0 0 1 8 4.9a2.7 2.7 0 0 1 5.4 1.5c0 3.9-5.4 7-5.4 7z"/></svg>';
    const rpH = t => '<div class="rp-h"><span class="dy-heart">♥</span>' + t + '</div>';
    const chips = rows => rows.length ? '<div class="rp-cats">' + rows.map(([n, v]) => '<span>' + esc(n) + ' <b>' + v + '</b></span>').join('') + '</div>' : '';
    function heat(mk, countOf, color) {     // 한 달 달력 칸 진하기
        const [y, m] = mk.split('-').map(Number), first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
        let h = '<div class="rp-heat">' + WEEK_KO.map(w => '<b>' + w + '</b>').join('') + '<span></span>'.repeat(first);
        for (let i = 1; i <= days; i++) {
            const n = countOf(mk + '-' + pad(i));
            h += '<span class="' + (n ? 'on' : '') + '" style="' + (n ? 'background:' + (color || 'var(--dy-accent)') + ';opacity:' + Math.max(.35, Math.min(1, n / 3)) : '') + '">' + (n || i) + '</span>';
        }
        return h + '</div>';
    }
    RENDER.report = (body, tools) => {
        tools.innerHTML = '';
        const mk = R.m, [y, m] = mk.split('-').map(Number);
        const inM = k => k && k.slice(0, 7) === mk;
        const elapsed = mk === todayKey().slice(0, 7) ? parseKey(todayKey()).getDate() : new Date(y, m, 0).getDate();
        let html = '';
        if (R.tab === 'todo') {
            const done = ext.todos.filter(t => !t.parent_id && t.is_completed && inM(t.completed_date || t.target_date));
            const byDay = {}; done.forEach(t => { const k = t.completed_date || t.target_date; byDay[k] = (byDay[k] || 0) + 1; });
            const best = Object.keys(byDay).sort((a, b) => byDay[b] - byDay[a])[0];
            const planned = ext.todos.filter(t => !t.parent_id && inM(t.target_date));
            html += '<div class="rp-sum"><div><b>' + done.length + '</b><small>끝낸 일</small></div><div><b>' + Object.keys(byDay).length + '일</b><small>실천한 날</small></div>' +
                '<div><b>' + (planned.length ? Math.round(planned.filter(t => t.is_completed).length / planned.length * 100) : 0) + '%</b><small>계획 달성</small></div>' +
                '<div><b>' + (best ? parseKey(best).getDate() + '일' : '-') + '</b><small>제일 많이 한 날</small></div></div>';
            html += rpH('하루하루') + heat(mk, k => byDay[k] || 0);
            const cats = Object.keys(TODO_COLORS).map(c => [c, done.filter(t => (t.category || 'gray') === c).length]).filter(x => x[1]);
            if (cats.length) html += rpH('색깔별') + '<div class="rp-cats">' + cats.map(([c, n]) => '<span><i style="background:' + TODO_COLORS[c] + '"></i>' + n + '</span>').join('') + '</div>';
            // 최근 8주 끝낸 일
            const wk = []; let end = todayKey();
            for (let i = 0; i < 8; i++) { const st = addDays(end, -6); wk.unshift([st.slice(5).replace('-', '.'), ext.todos.filter(t => t.is_completed && !t.parent_id && (t.completed_date || '') >= st && (t.completed_date || '') <= end).length]); end = addDays(st, -1); }
            const wmx = Math.max(1, ...wk.map(x => x[1]));
            html += rpH('최근 8주') + '<div class="rp-chart">' + wk.map(([n, v]) => '<div><i style="height:' + Math.round(v / wmx * 100) + '%"></i><b>' + v + '</b><small>' + n + '</small></div>').join('') + '</div>';
        }
        if (R.tab === 'life') {
            const mj = ext.mj, tk = todayKey();
            // 해빗 트래커: 이번 주(이 달을 보고 있으면 오늘이 든 주, 아니면 그 달 마지막 주) 하트, 누르면 한 달
            const wkEnd = mk === tk.slice(0, 7) ? tk : mk + '-' + pad(new Date(y, m, 0).getDate());
            const sun = addDays(wkEnd, -parseKey(wkEnd).getDay());
            const did = (q, k) => !!(mj.quest_log[k] && mj.quest_log[k][q.id]);
            const days = new Date(y, m, 0).getDate();
            if (mj.quests.length) {
                html += rpH('루틴') + '<div class="rp-habit"><div class="hd"><span></span>' + WEEK_KO.map(w => '<b>' + w + '</b>').join('') + '<span></span></div>' +
                    mj.quests.map(q => {
                        const open = !!R.open[q.id];
                        const cnt = Object.keys(mj.quest_log).filter(k => inM(k) && did(q, k)).length;
                        let row = '<div class="hb' + (open ? ' open' : '') + '"><button class="nm" data-a="rp-q" data-k="' + esc(q.id) + '">' + esc(q.title) + '</button>' +
                            Array.from({ length: 7 }, (_, i) => { const k = addDays(sun, i); return '<span class="' + (k > tk ? 'fut' : '') + '">' + HEART(did(q, k)) + '</span>'; }).join('') +
                            '<span class="c">' + cnt + '</span></div>';
                        if (open) {
                            row += '<div class="hm">' + WEEK_KO.map(w => '<b>' + w + '</b>').join('') + '<span></span>'.repeat(new Date(y, m - 1, 1).getDay()) + Array.from({ length: days }, (_, i) => { const k = mk + '-' + pad(i + 1); return '<span class="' + (k > tk ? 'fut' : '') + '"><small>' + (i + 1) + '</small>' + HEART(did(q, k)) + '</span>'; }).join('') + '</div>';
                        }
                        return row;
                    }).join('') + '</div>' +
                    (Object.keys(R.open).length ? '<div style="text-align:right"><button class="dy-rb" data-a="rp-fold">모두 접기</button></div>' : '');
            }
            // 집안일·식사·뷰티·기분·약·YouTube: 이름과 횟수만, 누르면 언제 했는지
            const plain = n => String(n).replace(/^[^\s가-힣A-Za-z0-9]+\s*/, '');
            const when = (k, t) => { const d = parseKey(k); return (d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + WEEK_KO[d.getDay()]; };
            const byDate = (a, b) => (a.k + (a.t || '')) < (b.k + (b.t || '')) ? -1 : 1;
            const mh = Object.keys(ext.mh.log).map(id => ({ n: plain(MYHOME_ACTS[id] || id), d: Object.keys(ext.mh.log[id] || {}).filter(k => inM(k) && ext.mh.log[id][k].done)
                .map(k => { const x = ext.mh.log[id][k]; return { k, t: hhmm(x.at), x: [x.count > 1 ? x.count + '번' : '', x.memo || ''].filter(Boolean).join(' · ') }; }) }))
                .filter(x => x.d.length).sort((a, b) => b.d.length - a.d.length);
            const cond = (type, keyOf, nameOf, textOf) => {
                const g = {};
                mj.condition.filter(c => c.type === type && inM(c.date)).forEach(c => { const key = keyOf(c); (g[key] = g[key] || { n: nameOf(c), d: [] }).d.push({ k: c.date, t: c.time, x: textOf(c) }); });
                return Object.values(g).sort((a, b) => b.d.length - a.d.length);
            };
            const meals = cond('meal', c => c.slot, c => MEAL_KO[c.slot] || c.slot, c => c.memo || '');
            const bt = Object.keys(BEAUTY_KO).map(sl => ({ n: BEAUTY_KO[sl], d: mj.beauty.filter(b => b.slot === sl && inM(b.date)).map(b => ({ k: b.date, t: b.time, x: (b.steps || []).join(', ') })) })).filter(x => x.d.length);
            const MOOD_KO = { love: '최고', good: '좋음', okay: '괜찮음', meh: '그저그럼', tired: '피곤', sad: '슬픔', anxious: '불안', angry: '화남' };
            const moods = cond('mood', c => c.mood, c => (MOOD_EMO[c.mood] || '') + ' ' + (MOOD_KO[c.mood] || c.mood), c => c.memo || '');
            const meds = cond('medicine', () => 'med', () => '약', c => [c.name, c.memo].filter(Boolean).join(' · '));
            const yts = mj.library.filter(x => x.type === 'youtube' && inM(x.date)).map(x => ({ k: x.date, t: x.time, x: x.title || '' }));
            const rows = (key, list) => !list.length ? '' : '<div class="rp-rows">' + list.map(g => {
                const id = key + ':' + g.n, open = !!R.open[id];
                return '<div class="rr' + (open ? ' open' : '') + '"><button class="row" data-a="rp-q" data-k="' + esc(id) + '"><span class="n">' + esc(g.n) + '</span><span class="v">' + g.d.length + '번</span></button>' +
                    (open ? '<div class="dt">' + g.d.slice().sort(byDate).map(d => '<div><span class="k">' + when(d.k) + '</span><span class="t">' + esc(d.t || '') + '</span><span class="x">' + esc(d.x || '') + '</span></div>').join('') + '</div>' : '') + '</div>';
            }).join('') + '</div>';
            if (mh.length) html += rpH('집안일') + rows('mh', mh);
            if (meals.length) html += rpH('식사') + rows('meal', meals);
            if (bt.length) html += rpH('뷰티') + rows('bt', bt);
            if (moods.length) html += rpH('기분') + rows('mood', moods);
            if (meds.length) html += rpH('약') + rows('med', meds);
            if (yts.length) html += rpH('YouTube') + rows('yt', [{ n: '본 영상', d: yts }]);
        }
        if (R.tab === 'diary') {
            const ents = ext.mj.diary.filter(x => inM(x.date)).sort((a, b) => a.date < b.date ? -1 : 1);
            const days = uniq(ents.map(x => x.date));
            html += '<div class="rp-sum"><div><b>' + ents.length + '</b><small>쓴 일기</small></div><div><b>' + days.length + '일</b><small>쓴 날</small></div>' +
                '<div><b>' + (db.days ? Object.keys(db.days).filter(k => inM(k) && db.days[k].photo).length : 0) + '</b><small>사진 붙인 날</small></div></div>';
            html += rpH('쓴 날') + heat(mk, k => ents.filter(x => x.date === k).length);
            if (ents.length) html += rpH('제목') + '<div class="rp-list">' + ents.map(x => '<div><span>' + x.date.slice(8) + '일</span>' + esc(x.title || firstLine(x.body)) + '</div>').join('') + '</div>';
        }
        body.innerHTML = '<div class="dy-report">' +
            '<div class="dy-dnav"><button class="dy-rb round" data-a="rp-prev">' + ic('left') + '</button><div class="d">' + y + '년 ' + m + '월</div><button class="dy-rb round" data-a="rp-next">' + ic('right') + '</button></div>' +
            '<div class="rp-tabs">' + [['todo', '할 일'], ['life', '생활'], ['diary', '일기']].map(([k, n]) => '<button class="dy-rb' + (R.tab === k ? ' on' : '') + '" data-a="rp-tab" data-k="' + k + '">' + n + '</button>').join('') + '</div>' +
            html + '</div>';
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

    async function listAct(kind, a, t, getList, label) {
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
            const f = await askForm(label + ' 고치기', [{ k: 'v', value: it.text, need: true }]); if (!f) return;
            save(label + ' 고치기', d => { const x = getList(d).find(y => y.id === id); if (x) x.text = f.v; });
        }
        if (a === 'del') {
            const it = getList(db).find(x => x.id === id);
            if (it && !(await ask('"' + it.text + '" 을(를) 지울까요?', '지우기', true))) return;
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
                const f = await askForm('생일 (김민정 프로필과 같이 바뀌어요)', [{ k: 'v', type: 'date', value: birthKey(), need: true }]); if (!f) return;
                const [by, bm, bd] = f.v.split('-').map(Number);
                return save('생일', null, null, { mj: d => setMjProf(d, '생년월일', by + '년 ' + bm + '월 ' + bd + '일') });
            }
            case 'mood': {
                const f = await askForm('이달의 한 줄', [{ k: 'v', value: db.mood[mk] || '' }]); if (!f) return; const v = f.v;
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
                const old = db.profile.photo; if (!old || !(await ask('프로필 사진을 뺄까요?', '빼기', true))) return;
                return save('프로필 사진 빼기', d => { delete d.profile.photo; }, dropFile(old));
            }
            case 'prof-name': return openProfileCard();
            case 'prof-note': { const f = await askForm('한 줄 소개', [{ k: 'v', value: db.profile.note || '' }]); if (!f) return; const v = f.v; return save('한 줄 소개', d => { d.profile.note = v.trim(); }); }
            /* D-day */
            case 'dday-prev': V.dd--; return render('diary');
            case 'dday-next': V.dd++; return render('diary');
            case 'dday-add': {
                const f = await askForm('D-day', [{ k: 'title', label: '무슨 날', need: true }, { k: 'date', label: '날짜', type: 'date', value: todayKey(), need: true }], '추가'); if (!f) return;
                const title = f.title, date = f.date;
                const it = { id: uid(), title: title.trim(), date: date.trim() };
                const sorted = db.ddays.concat([it]).sort((a, b) => a.date < b.date ? -1 : 1);
                V.dd = sorted.findIndex(x => x.id === it.id);
                return save('D-day 추가', d => d.ddays.push(Object.assign({}, it)));
            }
            case 'dday-edit': {
                const id = rowId(t), it = db.ddays.find(x => x.id === id); if (!it) return;
                const f = await askForm('D-day 고치기', [{ k: 'title', label: '무슨 날', value: it.title, need: true }, { k: 'date', label: '날짜', type: 'date', value: it.date, need: true }]); if (!f) return;
                const title = f.title, date = f.date;
                return save('D-day 고치기', d => { const x = d.ddays.find(y => y.id === id); if (x) { x.title = title.trim() || x.title; x.date = date.trim(); } });
            }
            case 'dday-del': {
                const id = rowId(t); if (!id || !(await ask('이 D-day를 지울까요?', '지우기', true))) return;
                return save('D-day 지우기', d => { d.ddays = d.ddays.filter(x => x.id !== id); });
            }
            /* 음악 */
            /* YouTube (김민정 Library와 같은 기록) */
            case 'yt-prev': return ytStep(-1);
            case 'yt-next': return ytStep(1);
            case 'yt-play': case 'yt-pp': {
                if (YT.on && YT.player && YT.ready) { const st = YT.player.getPlayerState(); if (st === 1) YT.player.pauseVideo(); else YT.player.playVideo(); return; }
                const x = ytList(todayKey())[YT.i]; if (!x) return; if (!ytId(x.url)) return window.open(safeUrl(x.url), '_blank', 'noopener');
                YT.on = x.id; YT.paused = false; return render('diary');
            }
            case 'yt-rep': YT.rep = !YT.rep; t.classList.toggle('on', YT.rep); return;
            case 'yt-add': return ytForm(null);
            case 'yt-list': return openYtList();
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
                if (!BUBBLE[st.src]) return toast('말풍선 스티커에만 글을 쓸 수 있어요');
                return openTextCard(st.text, v => save('말풍선 글', d => { const t = d.stickers.find(x => x.id === id); if (t) t.text = v; }));
            }
            case 'stk-del': {
                const id = V.sel; if (!id) return; V.sel = null;
                return save('스티커 떼기', d => { d.stickers = d.stickers.filter(x => x.id !== id); });
            }
            /* 영수증 */
            /* 할 일 (data/todos.json — Todo 카테고리와 같은 파일) */
            case 't-prev': V.tDate = addDays(V.tDate, -1); return render('todo');
            case 't-next': V.tDate = addDays(V.tDate, 1); return render('todo');
            case 't-today': V.tDate = todayKey(); return render('todo');
            case 't-go': V.tDate = t.dataset.k; return render('todo');
            case 't-add': {
                const inp = inputOf(t); const v = inp && inp.value.trim(); if (!v) { inp && inp.focus(); return; }
                const now = Date.now();
                const row = { id: now, created_at: new Date().toISOString(), content: v, category: 'gray', matrix_quadrant: 0, is_completed: false,
                    target_date: V.tDate, parent_id: null, subtasks: [], repeat_type: null, repeat_days: null, sort_order: now, completed_date: null };
                inp.value = '';
                save('할 일 추가', null, null, { todos: L => { L.push(JSON.parse(JSON.stringify(row))); } });
                setTimeout(() => { const n = document.querySelector('[data-enter="t-add"]'); n && n.focus(); }, 30);
                return;
            }
            case 't-chk': {
                const id = rowId(t), x0 = findTodo(ext.todos, id); if (!x0) return;
                const on = !x0.is_completed, day = V.tDate, at = stamp();
                return save('할 일 ' + (on ? '완료' : '취소'), null, null, { todos: L => {
                    const x = findTodo(L, id); if (!x) return;
                    x.is_completed = on; x.completed_date = on ? day : null;
                    if (on) x.completed_at = at; else delete x.completed_at;
                    if (Array.isArray(x.subtasks)) x.subtasks.forEach(st => { st.is_completed = on; });
                } });
            }
            case 't-edit': {
                const id = rowId(t), x0 = findTodo(ext.todos, id); if (!x0) return;
                const f = await askForm('할 일 고치기', [{ k: 'v', value: x0.content, need: true }]); if (!f) return;
                return save('할 일 고치기', null, null, { todos: L => { const x = findTodo(L, id); if (x) x.content = f.v; } });
            }
            case 't-up': {
                const id = rowId(t), list = todosFor(V.tDate), i = list.findIndex(x => String(x.id) === String(id));
                if (i < 1) return;
                const a1 = list[i].id, a2 = list[i - 1].id, s1 = list[i].sort_order || 0, s2 = list[i - 1].sort_order || 0;
                return save('할 일 순서', null, null, { todos: L => { const x = findTodo(L, a1), y = findTodo(L, a2); if (x && y) { x.sort_order = s2; y.sort_order = s1 === s2 ? s2 + 1 : s1; } } });
            }
            case 't-del': {
                const id = rowId(t), x0 = findTodo(ext.todos, id); if (!x0 || !(await ask('"' + x0.content + '" 을(를) 지울까요?', '지우기', true))) return;
                return save('할 일 지우기', null, null, { todos: L => { const i = L.findIndex(x => String(x.id) === String(id)); if (i > -1) L.splice(i, 1); } });
            }
            case 't-carry': {
                const k = V.tDate, tk = todayKey(), move = todosFor(k).filter(x => !x.is_completed && x.target_date === k).map(x => x.id);
                if (!move.length || !(await ask('못 한 일 ' + move.length + '개를 오늘로 옮길까요?', '옮기기'))) return;
                V.tDate = tk;
                return save('할 일 오늘로 옮기기', null, null, { todos: L => { move.forEach(id => { const x = findTodo(L, id); if (x) x.target_date = tk; }); } });
            }
            case 'r-prev': V.rDate = addDays(V.rDate, -1); return render('done');
            case 'r-next': V.rDate = addDays(V.rDate, 1); return render('done');
            case 'r-today': V.rDate = todayKey(); return render('done');
            case 'r-img': return openReceiptImgCard();
            case 'rp-prev': case 'rp-next': { const [ry, rm] = R.m.split('-').map(Number), dd = new Date(ry, rm - 1 + (a === 'rp-next' ? 1 : -1), 1); R.m = dd.getFullYear() + '-' + pad(dd.getMonth() + 1); return render('report'); }
            case 'rp-tab': R.tab = t.dataset.k; return render('report');
            case 'rp-q': { const id = t.dataset.k; if (R.open[id]) delete R.open[id]; else R.open[id] = 1; return render('report'); }
            case 'rp-fold': R.open = {}; return render('report');
            /* 메모 */
            case 'memo-save': { const ta = document.getElementById('dy-memo-ta'); if (ta) { clearTimeout(memoTimer); saveMemo(ta.value); } return; }
        }
    }

    /* ==========================================================================
       카드 (날짜 / 꾸미기 / 스티커 서랍)
       ========================================================================== */
    let cardGuard = null;           // 저장 안 한 내용이 있으면 닫기 전에 물어봄
    function openCard(fn) { cardGuard = null; cardFn = fn; fn(); modal.classList.add('on'); }
    async function closeCard(force) {
        if (force !== true && cardGuard && cardGuard() && !(await ask('저장하지 않고 닫을까요?', '닫기', true))) return;
        cardGuard = null; cardFn = null; modal.classList.remove('on'); cardBox.innerHTML = '';
    }
    document.getElementById('dy-x').onclick = () => closeCard();
    modal.onclick = e => { if (e.target === modal) closeCard(); };

    function stickerOptions(cur, act, withNone) {
        const mine = myStickerPaths();
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

    // 날짜 카드: 고친 것은 [저장]을 눌러야 한 번에 저장 (일기는 김민정 Diary와 같은 기록)
    function openDayCard(k) {
        const d0 = parseKey(k);
        const clone = o => JSON.parse(JSON.stringify(o));
        const orig = clone(db.days[k] || {});
        const dr = clone(orig);
        const origE = diaryOf(k).map(x => ({ id: x.id, title: x.title || '', body: x.body || '' }));
        let ents = clone(origE);
        if (dr.memo) { ents.push({ id: 'dy' + uid(), title: '', body: dr.memo }); delete dr.memo; }   // 예전 메모는 일기로 옮김
        let files = {};                   // 새로 올린 사진 (저장할 때 같이 커밋)
        const norm = (day, es) => {
            const d = {}; ['photo', 'sticker', 'link', 'color'].forEach(f => { if (day[f]) d[f] = day[f]; });
            d.events = (day.events || []).map(e => e.text);
            return JSON.stringify([d, es.filter(e => (e.title || '').trim() || (e.body || '').trim()).map(e => [e.id, (e.title || '').trim(), (e.body || '').replace(/\s+$/, '')])]);
        };
        const sig = () => norm(dr, ents);
        const first = norm(orig, origE.concat(orig.memo ? [] : []));
        cardGuard = () => sig() !== first;

        function draw() {
            const ev = dr.events || [];
            cardBox.innerHTML =
                '<h3><img src="' + CHAR['c-blue'] + '" alt="">' + (d0.getMonth() + 1) + '월 ' + d0.getDate() + '일 ' + WEEK_KO[d0.getDay()] + '요일</h3>' +
                '<div class="pv">' + (dr.photo ? '<img src="' + esc(src(dr.photo)) + '" alt="">' : dr.sticker ? '<img src="' + esc(src(dr.sticker)) + '" alt="" style="width:55%">' : '') + '</div>' +
                '<div class="row" style="margin-top:8px"><button class="dy-rb" data-c="photo">' + ic('photo') + '<span class="lbl">사진 ' + (dr.photo ? '바꾸기' : '넣기') + '</span></button>' +
                    (dr.photo ? '<button class="dy-rb" data-c="unphoto">사진 빼기</button>' : '') + '</div>' +
                '<div class="lb">스티커</div><div class="dy-pick">' + stickerOptions(dr.sticker || '', 'st', true) + '</div>' +
                '<div class="lb">일정</div>' +
                '<div class="dy-add"><input class="dy-in" id="dy-ev-in"><button class="dy-rb round" data-c="ev-add" title="추가">' + ic('plus') + '</button></div>' +
                (ev.length ? '<div class="dy-list">' + ev.map(e => '<div class="dy-li" data-id="' + esc(e.id) + '"><span class="tx">' + esc(e.text) + '</span><button class="dy-del" data-c="ev-del">' + ic('x') + '</button></div>').join('') + '</div>' : '') +
                '<div class="lb" style="display:flex;justify-content:space-between;align-items:center">일기 <button class="dy-rb round" data-c="ent-add" title="일기 더 쓰기">' + ic('plus') + '</button></div>' +
                '<div class="dy-ents">' + ents.map((e, i) => '<div class="dy-ent" data-i="' + i + '">' +
                    '<div class="row"><input class="dy-in" data-ent="title" value="' + esc(e.title) + '" placeholder="제목"><button class="dy-del" data-c="ent-del" title="이 일기 지우기">' + ic('x') + '</button></div>' +
                    '<textarea class="dy-in" data-ent="body">' + esc(e.body) + '</textarea></div>').join('') + '</div>' +
                '<div class="lb">링크</div><div class="row"><input class="dy-in" id="dy-day-link" value="' + esc(dr.link || '') + '">' +
                (safeUrl(dr.link) ? '<a class="dy-rb" href="' + esc(safeUrl(dr.link)) + '" target="_blank" rel="noopener" style="text-decoration:none">열기</a>' : '') + '</div>' +
                '<div class="lb">칸 색</div><div class="dy-seg">' + CELL_COLORS.map(([c, n]) => '<button class="dy-rb' + ((dr.color || '') === c ? ' on' : '') + '" data-color="' + c + '">' +
                    (c ? '<i style="display:inline-block;width:10px;height:10px;border-radius:50%;border:1px solid var(--dy-line);background:' + c + '"></i>' : '') + '<span class="lbl">' + n + '</span></button>').join('') + '</div>' +
                '<div class="foot"><button class="dy-rb" data-c="clear">이 날 비우기</button><span style="flex:1"></span>' +
                    '<button class="dy-rb" data-c="close">닫기</button><button class="dy-rb on" data-c="save">저장</button></div>';

            // 입력은 바로 초안에만 (다시 그리지 않음)
            cardBox.querySelector('#dy-day-link').oninput = e => { dr.link = e.target.value.trim(); };
            cardBox.querySelectorAll('[data-ent]').forEach(el => {
                el.oninput = () => { const i = +el.closest('.dy-ent').dataset.i; ents[i][el.dataset.ent] = el.value; };
            });
            const evIn = cardBox.querySelector('#dy-ev-in');
            evIn.onkeydown = e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addEv(); } };
        }
        function addEv() {
            const inp = cardBox.querySelector('#dy-ev-in'), v = inp.value.trim(); if (!v) return inp.focus();
            dr.events = (dr.events || []).concat([{ id: uid(), text: v }]);
            draw(); setTimeout(() => { const n = document.getElementById('dy-ev-in'); n && n.focus(); }, 20);
        }
        function commit() {
            const day = clone(dr);
            if (day.link && !safeUrl(day.link)) return toast('링크는 http:// 또는 https:// 로 시작해야 해요');
            if (day.events && !day.events.length) delete day.events;
            ['photo', 'sticker', 'link', 'color', 'memo'].forEach(f => { if (!day[f]) delete day[f]; });
            const empty = !Object.keys(day).length;
            // 사진: 새로 올린 것만 커밋, 바뀌거나 뺀 예전 사진은 정리
            let fl = {};
            if (dr.photo && files[dr.photo]) fl[dr.photo] = files[dr.photo];
            if (orig.photo && orig.photo !== dr.photo) fl = dropFile(orig.photo, fl);
            // 일기: 바뀐 것만 (다른 기기에서 그 사이 쓴 일기는 그대로 둠)
            const at = stamp(), hm = at.slice(11, 16);
            const keep = ents.filter(e => e.title.trim() || e.body.trim());
            const keepIds = keep.map(e => e.id), origIds = origE.map(e => e.id);
            const entsChanged = JSON.stringify(keep) !== JSON.stringify(origE);
            const more = entsChanged ? { mj: d => {
                d.diary = d.diary.filter(x => !(x.date === k && origIds.includes(x.id) && !keepIds.includes(x.id)));
                keep.forEach(e => {
                    const o = origE.find(x => x.id === e.id), ex = d.diary.find(x => x.id === e.id);
                    if (ex) { if (!o || o.title !== e.title || o.body !== e.body) { ex.title = e.title.trim(); ex.body = e.body.replace(/\s+$/, ''); ex.at = at; if (!ex.title) delete ex.title; } }
                    else { const n = { id: e.id, date: k, time: hm, at, title: e.title.trim(), body: e.body.replace(/\s+$/, '') }; if (!n.title) delete n.title; d.diary.push(n); }
                });
            } } : null;
            const dayChanged = JSON.stringify(day) !== JSON.stringify(orig);
            if (!dayChanged && !more) return closeCard(true);
            save(k + ' 기록', dayChanged ? (d => { if (empty) delete d.days[k]; else d.days[k] = clone(day); }) : null, fl, more || undefined);
            closeCard(true);
        }

        openCard(draw);
        cardGuard = () => sig() !== first || Object.keys(files).length > 0;
        cardBox.onclick = async e => {
            const st = e.target.closest('[data-st]'), col = e.target.closest('[data-color]'), c = e.target.closest('[data-c]');
            if (st) { dr.sticker = st.dataset.st; return draw(); }
            if (col) { dr.color = col.dataset.color; return draw(); }
            if (!c) return;
            const a = c.dataset.c;
            if (a === 'close') return closeCard();
            if (a === 'save') return commit();
            if (a === 'photo') { const up = await uploadImage('photos', 1000, false); if (!up) return; files = Object.assign(files, up.files); dr.photo = up.path; return cardFn && draw(); }
            if (a === 'unphoto') { delete dr.photo; return draw(); }
            if (a === 'ev-add') return addEv();
            if (a === 'ev-del') { const id = rowId(c); dr.events = (dr.events || []).filter(x => x.id !== id); return draw(); }
            if (a === 'ent-add') { ents.push({ id: 'dy' + uid(), title: '', body: '' }); draw(); const t = cardBox.querySelectorAll('[data-ent="body"]'); if (t.length) t[t.length - 1].focus(); return; }
            if (a === 'ent-del') { const i = +c.closest('.dy-ent').dataset.i; if ((ents[i].title || ents[i].body) && !(await ask('이 일기를 지울까요?\n저장하면 김민정 Diary에서도 지워져요', '지우기', true))) return; ents.splice(i, 1); return draw(); }
            if (a === 'clear') {
                if (!(await ask('이 날의 사진, 스티커, 일정, 일기, 링크, 칸 색을 모두 비울까요?\n저장을 눌러야 지워져요', '비우기', true))) return;
                Object.keys(dr).forEach(f => delete dr[f]); ents = []; return draw();
            }
        };
    }

    // 프로필: 김민정 Profile과 같은 기록 (항목 이름 · 내용 목록, 편집·추가·순서·삭제)
    function openProfileCard() {
        let editing = false;
        openCard(function draw() {
            const rows = ext.mj.profile || [];
            if (!editing) {
                cardBox.innerHTML = '<h3><img src="' + CHAR['c-white'] + '" alt="">프로필</h3>' +
                    '<div class="dy-pf">' + rows.map(x => '<div class="it"><span class="k">' + esc(x.label) + '</span><span class="v">' + (x.value ? esc(x.value).replace(/\n/g, '<br>') : '<i>—</i>') + '</span></div>').join('') + '</div>' +
                    '<div class="foot"><span style="font-size:10px;color:var(--dy-sub)">김민정 프로필과 같이 바뀌어요</span><span style="flex:1"></span>' +
                    '<button class="dy-rb" data-c="edit">' + ic('pen') + '<span class="lbl">편집</span></button><button class="dy-rb on" data-c="close">닫기</button></div>';
            } else {
                cardBox.innerHTML = '<h3><img src="' + CHAR['c-white'] + '" alt="">프로필 편집</h3>' +
                    '<div class="dy-pf-edit">' + rows.map(x => pfRow(x)).join('') + '</div>' +
                    '<button class="dy-rb" data-c="add" style="margin-top:8px">' + ic('plus') + '<span class="lbl">항목 추가</span></button>' +
                    '<div class="foot"><span style="flex:1"></span><button class="dy-rb" data-c="cancel">취소</button><button class="dy-rb on" data-c="save">저장</button></div>';
            }
        });
        function pfRow(x) {
            return '<div class="dy-pf-row" data-id="' + esc(x.id || ('pf' + uid())) + '"><input class="dy-in" data-k="label" value="' + esc(x.label || '') + '">' +
                '<textarea class="dy-in" data-k="value" rows="1">' + esc(x.value || '') + '</textarea>' +
                '<span class="tools"><button class="dy-del" data-c="up" title="위로">' + ic('up') + '</button><button class="dy-del" data-c="down" title="아래로" style="transform:rotate(180deg)">' + ic('up') + '</button>' +
                '<button class="dy-del" data-c="del" title="지우기">' + ic('x') + '</button></span></div>';
        }
        const draw = () => cardFn && cardFn();
        cardBox.onclick = e => {
            const c = e.target.closest('[data-c]'); if (!c) return;
            const a = c.dataset.c, row = c.closest('.dy-pf-row');
            if (a === 'close') return closeCard();
            if (a === 'edit') {
                editing = true; draw();
                const snap = () => JSON.stringify([...cardBox.querySelectorAll('.dy-pf-row')].map(el => [el.querySelector('[data-k=label]').value, el.querySelector('[data-k=value]').value]));
                const first = snap(); cardGuard = () => cardBox.querySelector('.dy-pf-row') !== null && snap() !== first;
                return;
            }
            if (a === 'cancel') { editing = false; cardGuard = null; return draw(); }
            if (a === 'add') { cardBox.querySelector('.dy-pf-edit').insertAdjacentHTML('beforeend', pfRow({})); return; }
            if (a === 'del') return row.remove();
            if (a === 'up' && row.previousElementSibling) return row.parentElement.insertBefore(row, row.previousElementSibling);
            if (a === 'down' && row.nextElementSibling) return row.parentElement.insertBefore(row.nextElementSibling, row);
            if (a === 'save') {
                const list = [...cardBox.querySelectorAll('.dy-pf-row')].map(el => ({ id: el.dataset.id, label: el.querySelector('[data-k=label]').value.trim(), value: el.querySelector('[data-k=value]').value.trim() }))
                    .filter(x => x.label || x.value);
                editing = false; cardGuard = null;
                save('프로필 수정', null, null, { mj: d => { d.profile = list.map(x => Object.assign({}, x)); } });
                return draw();
            }
        };
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
                '<div class="lb" style="display:flex;justify-content:space-between;align-items:center">스티커 서랍 <span style="font-family:var(--dy-body);font-size:10px">내 스티커는 김민정과 같이 써요</span></div>' +
                '<div class="dy-pick' + (editMine ? ' edit' : '') + '">' +
                    BASE_STICKERS.map(c => '<button data-put="' + c.id + '"><img src="' + c.src + '" alt=""></button>').join('') +
                    myStickerPaths().map(p => '<button data-put="' + esc(p) + '"><img src="' + esc(src(p)) + '" alt=""><span class="rm" data-rm="' + esc(p) + '">' + ic('x') + '</span></button>').join('') +
                    '<button class="addb" data-c="add-stk" title="내 스티커 넣기">' + ic('plus') + '</button>' +
                '</div>' +
                '<div class="row" style="margin-top:8px;flex-wrap:wrap">' + (myStickerPaths().length ? '<button class="dy-rb' + (editMine ? ' on' : '') + '" data-c="edit-mine">' + (editMine ? '다 지웠어요' : '내 스티커 지우기') + '</button>' : '') +
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
                    if (placedInMj(p)) return toast('김민정 방에 붙어 있는 스티커예요 · 김민정에서 먼저 떼 주세요');
                    if (!(await ask('이 스티커를 서랍에서 뺄까요?\n다이어리에 붙인 것도 같이 떨어져요', '빼기', true))) return;
                    save('내 스티커 빼기', d => {
                        d.myStickers = d.myStickers.filter(s => s.path !== p);
                        d.stickers = d.stickers.filter(s => s.src !== p);
                        Object.keys(d.days).forEach(k => { if (d.days[k].sticker === p) { delete d.days[k].sticker; cleanDay(d, k); } });
                    }, { [p]: null }, { mj: d => { d.settings.sticker_lib = (d.settings.sticker_lib || []).filter(x => x !== p); } });
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
                if (a === 'clear-stk') { if (!(await ask('다이어리에 붙인 스티커를 모두 뗄까요?', '떼기', true))) return; V.sel = null; save('스티커 모두 떼기', d => { d.stickers = []; }); return draw(); }
                if (a === 'add-stk') {
                    const up = await uploadImage('stickers', 480, true); if (!up) return;
                    save('내 스티커 넣기', null, up.files, { mj: d => { d.settings.sticker_lib = uniq((d.settings.sticker_lib || []).concat([up.path])); } });
                    return cardFn && draw();
                }
            };
        });
    }

    /* ==========================================================================
       바탕화면 / 작업표시줄 / 시작 메뉴
       ========================================================================== */
    const ICONS = [
        ['diary', '다이어리'], ['todo', '할 일'], ['done', '영수증'], ['memo', '메모'], ['deco', '꾸미기'], ['report', '리포트']
    ];
    const iconOf = id => id === 'deco' ? 'c-puppy' : APPS[id].icon;
    document.getElementById('dy-icons').innerHTML = ICONS.map(([id, n]) =>
        '<button class="dy-icon" data-open="' + id + '" title="' + n + ' 열기"><img src="' + ICON_SRC[iconOf(id)] + '" alt=""><span>' + n + '</span></button>').join('');
    document.getElementById('dy-apps').innerHTML = ICONS.map(([id, n]) =>
        '<button class="dy-app" data-open="' + id + '" title="' + n + '"><img src="' + ICON_SRC[iconOf(id)] + '" alt=""></button>').join('');
    const menu = document.getElementById('dy-menu'), startBtn = document.getElementById('dy-start');
    menu.innerHTML = '<div class="head"><img src="' + CHAR['c-blue'] + '" alt="">diary ♡</div>' +
        ICONS.map(([id, n]) => '<button data-open="' + id + '"><img src="' + ICON_SRC[iconOf(id)] + '" alt="">' + n + '</button>').join('') +
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
        const ak = askOpen();
        if (ak) { if (e.key === 'Escape' && ak.dy) ak.dy.esc(); return; }
        if (e.key === 'Escape' && modal.classList.contains('on')) return closeCard();
        if ((e.key === 'Delete' || e.key === 'Backspace') && V.sel && V.deco && !stkOff() && !modal.classList.contains('on') && !e.target.matches('input, textarea')) {
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
