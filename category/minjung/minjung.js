/* ==========================================================================
   김민정 — 나를 게임 캐릭터처럼 키우기
   - 화면: 방 배경(옆으로 밀어서 바꾸기) + 캐릭터 + 미연시 대사창 + 하트(HP)
   - 메뉴: Profile / Condition / Daily / Diary / Menu
     모바일은 아래 메뉴 → 화면 가득 창, PC는 바탕화면 아이콘 → 윈도우 창(여러 개, 끌어서 이동)
   - 기록: 이 저장소의 minjung/minjung.json (형식은 minjung/README.md)
   - 사진: minjung/images/<outfit|icons>/...
   ========================================================================== */

/* ---------------- 설정 ---------------- */
const DATA = 'minjung/minjung.json';
const IMG_DIR = 'minjung/images/';
const LISTS = ['hp', 'lines', 'library', 'condition', 'beauty', 'outfit', 'diary'];
const PREFIX = { hp: 'hp', lines: 'ln', library: 'lb', condition: 'cd', beauty: 'bt', outfit: 'of', diary: 'dy' };   // 기록 id 앞글자

const DEFAULT_PROFILE = [
    ['이름', '김민정'], ['생년월일', '2002년생'], ['성별', '여성'], ['외형', ''], ['성격', ''],
    ['좋아하는 것', ''], ['좋아하는 음식', ''], ['싫어하는 것', ''], ['etc.', '']
];
const DEFAULT_SYMPTOMS = ['배아픔', '두통'];
/* 퀘스트(루틴): daily = 매일 / repeat = N일마다(마지막으로 한 날부터) 또는 요일마다 */
const QSLOTS = [['morning', 'Morning'], ['lunch', 'Lunch'], ['evening', 'Evening'], ['etc', 'etc.']];
const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DEFAULT_QUESTS = [
    { id: 'q1', kind: 'daily', slot: 'morning', title: '이부자리 정리' },
    { id: 'q2', kind: 'daily', slot: 'morning', title: '물 한 잔' },
    { id: 'q3', kind: 'daily', slot: 'lunch', title: '점심 챙겨 먹기' },
    { id: 'q4', kind: 'daily', slot: 'evening', title: '스킨케어' },
    { id: 'q5', kind: 'repeat', mode: 'every', every: 3, title: '빨래' },
    { id: 'q6', kind: 'repeat', mode: 'week', days: [1, 4], title: '분리수거' }
];
const DEFAULT_BGS = [
    { id: 'living', mobile: 'minjung/assets/living-mobile.webp', pc: 'minjung/assets/living-pc.webp' },
    { id: 'bedroom', mobile: 'minjung/assets/bedroom.webp', pc: 'minjung/assets/bedroom.webp' }
];
const DEFAULT_CHAR = 'minjung/assets/character.webp';
const DEFAULT_LAYOUT = { mobile: { x: 50, h: 72 }, pc: { x: 50, h: 90 } };   // 캐릭터 가운데 위치(%) · 높이(%)
const DEFAULT_STEPS = { morning: ['세안', '토너', '로션', '선크림'], night: ['클렌징', '토너', '세럼', '크림'], etc: ['팩', '각질 케어'], shower: ['샴푸', '트리트먼트', '바디워시', '바디로션'] };

const MEAL_SLOTS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Snack'], ['night', 'Late night']];
const MOODS = [['love', '🥰', 'love'], ['good', '😊', 'good'], ['okay', '🙂', 'okay'], ['meh', '😐', 'meh'], ['tired', '😪', 'tired'], ['sad', '😢', 'sad'], ['anxious', '😰', 'anxious'], ['angry', '😠', 'angry']];
const LIB_TYPES = [['book', 'Book'], ['youtube', 'YouTube'], ['movie', 'Movie'], ['drama', 'Drama'], ['anime', 'Anime'],
    ['webtoon', 'Webtoon'], ['game', 'Game'], ['song', 'Song'], ['show', 'Show'], ['etc', 'etc.']];
// 작품 검색 (예전 '흐린 날의 고백'에서 쓰던 키): 영화·드라마·애니 = TMDB, 책 = 카카오
const TMDB_KEY = 'd6224997a8f1d896b0244b268bcefd54';
const KAKAO_KEY = '261889b87c5bf523ddd8846c0c45ec2e';
const LIB_SEARCH = { movie: 'movie', drama: 'tv', anime: 'tv', book: 'book' };
const LIB_STATUS = [['want', 'Want'], ['now', 'Now'], ['done', 'Done']];
const BEAUTY_SLOTS = [['morning', 'Morning'], ['night', 'Night'], ['etc', 'etc.'], ['shower', 'Shower']];
const BEAUTY_SUBS = [['all', 'All'], ['morning', 'Morning'], ['night', 'Night'], ['etc', 'etc.']];   // Shower는 탭 없이 + 버튼으로만 (All에서 보임)
const COND_TYPES = [['meal', 'Meal'], ['medicine', 'Medicine'], ['symptom', 'Symptom'], ['mood', 'Mood']];

/* ---------------- 아이콘 (기본 그림, 창 위 아이콘을 누르면 내 이미지로 바꿀 수 있음) ---------------- */
const SV = b => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
const ICON = {
    profile: SV('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16.5c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h4.5M14 13h3.5"/>'),
    condition: SV('<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z"/><path d="M12 11v4.4M9.8 13.2h4.4"/>'),
    daily: SV('<path d="M12 11.5c-2-3.2-6.5-4.6-7.4-2.6-.8 1.9 2.4 4.2 7.4 2.6zM12 11.5c2-3.2 6.5-4.6 7.4-2.6.8 1.9-2.4 4.2-7.4 2.6z"/><circle cx="12" cy="11.5" r="1.2"/><path d="M11.2 12.6 8.6 19M12.8 12.6l2.6 6.4"/>'),
    diary: SV('<path d="M5 4.5h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z"/><path d="M5 17.5a2 2 0 0 1 2-2h11M9 8.5h5"/><path d="M12 12.6s-2-1.2-2-2.4a1 1 0 0 1 2-.3 1 1 0 0 1 2 .3c0 1.2-2 2.4-2 2.4z"/>'),
    food: SV('<path d="M7 4v6a2 2 0 0 0 4 0V4M9 4v16M16 20V4c-1.8 0-3 2.2-3 5.5S14.2 13 16 13"/>'),
    state: SV('<circle cx="12" cy="12" r="8"/><path d="M9 10h.01M15 10h.01M9 14.5c1.6 1.4 4.4 1.4 6 0"/>'),
    room: SV('<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m3.5 16 5-5 4 4 3-3 5 5"/><circle cx="15.5" cy="9" r="1.5"/>'),
    library: SV('<path d="M5 5.5h4v13H5zM10 5.5h4v13h-4z"/><path d="m15.2 6.4 3.6-1 3 12.6-3.6 1z"/>'),
    menu: SV('<rect x="4.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.5"/><path d="M16.5 14v5M14 16.5h5"/>'),
    quest: SV('<path d="M7 4.5h10a2 2 0 0 1 2 2V17a2.5 2.5 0 0 1-2.5 2.5H7"/><path d="M7 4.5a2 2 0 0 0-2 2v1.5h4V6.5a2 2 0 0 0-2-2zM7 19.5A2.5 2.5 0 0 0 9.5 17V8M12 9.5l1 1 2.2-2.2M12 14h4"/>'),
    hp: SV('<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>'),
    lines: SV('<path d="M5 6h14a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 16h-8l-4 3v-3H5a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 5 6z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>'),
    schedule: SV('<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 9.5h16M8.5 3.5v4M15.5 3.5v4M8 13h2M12 13h2M8 16h2"/>'),
    inventory: SV('<path d="M4 8.5 12 5l8 3.5v8L12 20l-8-3.5z"/><path d="M4 8.5 12 12l8-3.5M12 12v8"/>'),
    bag: SV('<path d="M6 8.5h12l-1 11H7z"/><path d="M9 10V7.5a3 3 0 0 1 6 0V10"/>'),
    shop: SV('<path d="M4.5 9.5 6 5h12l1.5 4.5"/><path d="M4.5 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M6 12v7.5h12V12"/><path d="M10 19.5v-4h4v4"/>'),
    workout: SV('<path d="M7 8v8M17 8v8M4.5 10v4M19.5 10v4M7 12h10"/>'),
    friends: SV('<circle cx="9" cy="9" r="2.6"/><path d="M4.5 18c.7-2.6 2.4-4 4.5-4s3.8 1.4 4.5 4"/><path d="M17 15.5s-2.6-1.6-2.6-3.2a1.3 1.3 0 0 1 2.6-.4 1.3 1.3 0 0 1 2.6.4c0 1.6-2.6 3.2-2.6 3.2z"/>')
};
const PLUS_SVG = '<svg viewBox="0 0 24 24" width="16" height="16"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6"><path d="M12 5v14M5 12h14"/></g></svg>';
const X_SVG = '<svg viewBox="0 0 24 24" width="14" height="14"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6"><path d="M18 6 6 18M6 6l12 12"/></g></svg>';

/* 창 설정 — main: 아래 메뉴/바탕화면 아이콘에 나오는 5개 */
const WIN = {
    profile:   { title: 'Profile',   main: true, w: 360 },
    library:   { title: 'Library',   tabs: ['All'], dyn: true, w: 560 },   // 탭은 settings.lib_types로
    food:      { title: 'Meal · Medicine', tabs: ['All', 'Meal', 'Medicine'], types: ['meal', 'medicine'], w: 380 },
    state:     { title: 'Symptom · Mood',  tabs: ['All', 'Symptom', 'Mood'], types: ['symptom', 'mood'], w: 380 },
    daily:     { title: 'Daily',     tabs: ['Beauty', 'Outfit'], main: true, w: 480 },
    diary:     { title: 'Diary',     tabs: ['Diary', 'To Do'], main: true, w: 400 },
    hp:        { title: 'HP Log',    w: 340 },
    quest:     { title: 'Quest',     tabs: ['Daily', 'Weekly'], w: 400 },
    room:      { title: 'Backgrounds', w: 420 },
    lines:     { title: 'Lines',     w: 360 }
};
/* 아래 메뉴 / 바탕화면 아이콘 5개 — pick이 있으면 누를 때 작은 고르기 팝업이 먼저 뜸 */
const NAV = [
    { id: 'profile', title: 'Profile' },
    { id: 'condition', title: 'Condition', pick: [['food', 'Meal · Medicine'], ['state', 'Symptom · Mood']] },
    { id: 'daily', title: 'Daily' },
    { id: 'diary', title: 'Diary' },
    { id: 'menu', title: 'Menu', pick: 'soon' }
];
// 아이패드·PC에서 창이 처음 뜨는 자리 (0~1 비율: 왼쪽→오른쪽, 위→아래)
const SPOT = { quest: [0.12, 0.12], room: [0.5, 0.1], profile: [0, 0], library: [0.3, 0.4], food: [1, 0], state: [0.62, 0.3], diary: [0, 1], daily: [1, 1], hp: [1, 0.08], lines: [0.5, 0.85] };
const SOON = [['schedule', 'Schedule'], ['inventory', 'Inventory'], ['bag', 'Bag'], ['shop', 'Shop'], ['workout', 'Workout'], ['friends', 'Friends']];

/* To Do 탭: Todo 카테고리 화면(category/todo/app.html)을 그대로 띄움 — 기능·저장(data/todos.json) 모두 같음 */

/* ---------------- 작은 도우미 ---------------- */
const pad = n => String(n).padStart(2, '0');
const keyOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hmOf = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
const todayKey = () => keyOf(new Date());
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl = s => esc(s).replace(/\n/g, '<br>');
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clone = o => JSON.parse(JSON.stringify(o));
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const label = (list, k) => (list.find(x => x[0] === k) || [k, k])[1];
const byNewest = (a, b) => ((b.date || '') + (b.time || '')).localeCompare((a.date || '') + (a.time || ''));
const byOldest = (a, b) => -byNewest(a, b);
function stamp() { const d = new Date(), o = -d.getTimezoneOffset(); return new Date(d.getTime() + o * 60000).toISOString().slice(0, 19) + (o >= 0 ? '+' : '-') + pad(Math.floor(Math.abs(o) / 60)) + ':' + pad(Math.abs(o) % 60); }
function shiftDay(k, n) { const [y, m, d] = k.split('-').map(Number); return keyOf(new Date(y, m - 1, d + n)); }
function dayTitle(k) { const [y, m, d] = k.split('-').map(Number); return y + '.' + pad(m) + '.' + pad(d) + ' ' + DOW[new Date(y, m - 1, d).getDay()]; }
function ytId(url) { const m = /(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/.exec(url || ''); return m ? m[1] : ''; }

/* 픽셀 하트 (7x6 칸) */
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function pixelHeart(full) {
    const on = (r, c) => HEART[r] && HEART[r][c] === 'X';
    let s = '';
    HEART.forEach((row, r) => [...row].forEach((ch, c) => {
        if (ch !== 'X') return;
        const inner = on(r - 1, c) && on(r + 1, c) && on(r, c - 1) && on(r, c + 1);
        const fill = full ? (inner ? 'var(--mj-heart)' : 'var(--mj-heart-line)') : (inner ? '#fff' : 'var(--mj-heart-empty)');
        s += `<rect x="${c}" y="${r}" width="1.02" height="1.02" fill="${fill}"/>`;
    }));
    return `<svg class="mj-heart" viewBox="0 0 7 6" shape-rendering="crispEdges">${s}</svg>`;
}
const hearts = (v, n = 5) => Array.from({ length: n }, (_, i) => pixelHeart(i < v)).join('');

/* 저장 형식 — 모든 기록은 { id, date: 'YYYY-MM-DD', time: 'HH:MM', at: 저장 시각 } + 각자 내용 */
function normalize(d) {
    d = d && typeof d === 'object' && !Array.isArray(d) ? d : {};
    d.version = 1;
    if (!Array.isArray(d.profile) || !d.profile.length) d.profile = DEFAULT_PROFILE.map(([l, v], i) => ({ id: 'pf' + i, label: l, value: v }));
    d.icons = d.icons && typeof d.icons === 'object' ? d.icons : {};
    d.settings = d.settings && typeof d.settings === 'object' ? d.settings : {};
    const st = d.settings;                                     // 첫 화면 꾸미기 (README '설정' 참고)
    if (!Array.isArray(st.backgrounds) || !st.backgrounds.length) st.backgrounds = clone(DEFAULT_BGS);
    if (!st.character) st.character = DEFAULT_CHAR;
    st.layout = st.layout && typeof st.layout === 'object' ? st.layout : {};
    st.stickers = st.stickers && typeof st.stickers === 'object' ? st.stickers : {};
    ['mobile', 'pc'].forEach(k => {
        if (!st.layout[k] || typeof st.layout[k].x !== 'number') st.layout[k] = Object.assign({}, DEFAULT_LAYOUT[k]);
        if (!Array.isArray(st.stickers[k])) st.stickers[k] = [];
    });
    LISTS.forEach(k => { d[k] = Array.isArray(d[k]) ? d[k] : []; });
    if (!Array.isArray(d.quests)) d.quests = clone(DEFAULT_QUESTS);
    d.quest_log = d.quest_log && typeof d.quest_log === 'object' && !Array.isArray(d.quest_log) ? d.quest_log : {};   // { 'YYYY-MM-DD': { 퀘스트id: '완료 시각 HH:MM' } }
    d.symptom_tags = Array.isArray(d.symptom_tags) && d.symptom_tags.length ? d.symptom_tags : DEFAULT_SYMPTOMS.slice();
    d.beauty_steps = d.beauty_steps && typeof d.beauty_steps === 'object' ? d.beauty_steps : {};
    // 초록 버튼으로 고치는 목록: Library 종류, Beauty 구분 (tab: 위 탭에 보일지, false면 + 버튼으로만)
    if (!Array.isArray(st.lib_types) || !st.lib_types.length) st.lib_types = LIB_TYPES.map(([key, label]) => ({ key, label }));
    if (!Array.isArray(st.beauty_slots) || !st.beauty_slots.length) st.beauty_slots = BEAUTY_SLOTS.map(([key, label]) => ({ key, label, tab: key !== 'shower' }));
    st.beauty_slots.forEach(({ key }) => { if (!Array.isArray(d.beauty_steps[key])) d.beauty_steps[key] = (DEFAULT_STEPS[key] || []).slice(); });
    return d;
}
/* 빈 칸은 저장하지 않음 (파일을 깔끔하게) */
function tidy(o) { Object.keys(o).forEach(k => { const v = o[k]; if (v === '' || v == null || (Array.isArray(v) && !v.length)) delete o[k]; }); return o; }

/* 사진 줄이기 → 바이트 */
function shrink(file, max, type, q) {
    return new Promise((res, rej) => {
        const img = new Image(), url = URL.createObjectURL(file);
        img.onload = () => {
            const s = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
            const g = c.getContext('2d');
            if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
            g.drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            c.toBlob(b => b ? b.arrayBuffer().then(a => res({ bytes: new Uint8Array(a), blob: b })) : rej(new Error('사진을 바꾸지 못했어요')), type, q);
        };
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('사진을 열지 못했어요')); };
        img.src = url;
    });
}

/* ========================================================================== */
export function init() {
    const root = document.getElementById('mj-root');
    if (!root) return;
    const repo = window.ghdb.repo();
    const $ = id => document.getElementById(id);
    const game = $('mj-game'), layer = $('mj-layer'), fileIn = $('mj-file');
    const isPC = () => window.matchMedia('(min-width: 744px)').matches;   // 아이패드 이상: 윈도우 팝업

    let db = normalize({});
    const wins = {};            // 열린 창: id → { el, st }
    let zTop = 1100, opened = 0, pending = 0;
    const localImg = {};         // 방금 올린 사진: 경로 → 미리보기 주소 (사이트 반영 전까지)

    /* ---------------- 이미지 주소 ---------------- */
    const imgSrc = p => localImg[p] || (/^https?:/.test(p) ? p : repo.url(p));
    const imgTag = (p, cls) => /^https?:/.test(p) ? `<img class="${cls || ''}" src="${esc(p)}" alt="" loading="lazy">` : `<img class="${cls || ''}" src="${esc(imgSrc(p))}" onerror="this.onerror=null;this.src='${esc(repo.rawUrl(p))}'" alt="" loading="lazy">`;
    const iconHtml = id => db.icons[id] ? imgTag(db.icons[id], 'mj-ico-img') : (ICON[id] || '');

    /* ---------------- 불러오기 / 저장 ---------------- */
    async function load() {
        try { db = normalize(await repo.readJSON(DATA, {})); } catch (e) { console.error(e); }
        redraw();
    }
    function setPending(n) {
        pending = n;
        const el = $('mj-saving');
        if (el) { el.textContent = pending ? 'saving…' : ''; el.classList.toggle('on', !!pending); }
    }
    // 화면 먼저 바꾸고 GitHub 커밋은 뒤에서 (files: { 경로: blobSha | null(삭제) })
    function save(message, fn, files) {
        fn(db);
        redraw();
        if (!window.ghdb.hasToken()) { alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); load(); return Promise.resolve(); }
        setPending(pending + 1);
        const j = {}; j[DATA] = { mutate: cur => { cur = normalize(cur); fn(cur); cur.updated_at = stamp(); return cur; }, fallback: {} };
        return repo.commit('김민정: ' + message, files || {}, j).then(res => {
            setPending(pending - 1);
            if (!pending && res && res[DATA]) { db = normalize(clone(res[DATA])); redraw(true); }
        }, e => {
            setPending(pending - 1);
            alert('저장하지 못했어요.\n' + (e.message || e));
            load();
        });
    }
    function upsert(list, item, message, files) {
        return save(message, d => {
            const a = d[list], i = a.findIndex(x => x.id === item.id);
            if (i >= 0) a[i] = clone(item); else a.push(clone(item));
        }, files);
    }
    function remove(list, id, message, files) {
        return save(message, d => { d[list] = d[list].filter(x => x.id !== id); }, files);
    }
    async function uploadImage(file, folder, max, type) {
        const ext = type === 'image/png' ? 'png' : 'jpg';
        const { bytes, blob } = await shrink(file, max, type, 0.86);
        const path = IMG_DIR + folder + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.' + ext;
        localImg[path] = URL.createObjectURL(blob);
        const sha = await repo.putBlob(bytes);
        return { path, sha };
    }

    /* ---------------- 게임 화면 ---------------- */
    // 배치는 모바일·PC(아이패드 포함) 따로 저장: settings.layout.mobile / .pc, settings.stickers.mobile / .pc
    const lay = () => isPC() ? 'pc' : 'mobile';
    const S = () => db.settings;
    const bgOff = () => !!S().bg_off;
    const libTypes = () => S().lib_types.map(x => [x.key, x.label]);
    const beautySlots = () => S().beauty_slots.map(x => [x.key, x.label]);
    const beautySubs = () => [['all', 'All']].concat(S().beauty_slots.filter(x => x.tab).map(x => [x.key, x.label]));
    const tabsOf = id => WIN[id].dyn ? ['All'].concat(libTypes().map(x => x[1])) : WIN[id].tabs;
    let bgIdx = -1;                 // -1: 아직 안 정함 (밤 20시~아침 7시는 침실로 시작)
    let edit = null;                // 배치 편집 중: { k, char: {x,h}, stickers: [...], files: {} }

    function bgList() { return S().backgrounds; }
    function bgSrc(b) { return (lay() === 'pc' ? (b.pc || b.mobile) : (b.mobile || b.pc)) || ''; }
    function drawBgs() {
        const list = bgList();
        if (bgIdx < 0) {
            const h = new Date().getHours(), night = h >= 20 || h < 7;
            const bi = list.findIndex(b => b.id === 'bedroom');
            bgIdx = night && bi >= 0 ? bi : 0;
        }
        bgIdx = Math.min(bgIdx, list.length - 1);
        $('mj-bgs').innerHTML = list.map(b => { const p = bgSrc(b); return `<div class="mj-bg mj-bg-${esc(b.id)}">${p ? imgTag(p, 'mj-bg-img') : ''}</div>`; }).join('');
        $('mj-bgs').style.transform = `translateX(${-bgIdx * 100}%)`;
    }
    function goBg(i) {
        const n = bgList().length;
        bgIdx = (i + n) % n;
        $('mj-bgs').style.transform = `translateX(${-bgIdx * 100}%)`;
    }

    // 캐릭터: 아래 빈 공간 없이 항상 바닥에 붙음. x = 가운데 위치(%), h = 높이(화면 높이의 %)
    function charLayout() { return (edit && edit.char) || S().layout[lay()]; }
    function drawChar() {
        const el = $('mj-char'), c = charLayout(), src = imgSrc(S().character);
        if (el.dataset.src !== S().character) { el.dataset.src = S().character; el.src = src; el.onerror = () => { el.onerror = null; el.src = repo.rawUrl(S().character); }; }
        el.style.left = c.x + '%';
        el.style.height = c.h + '%';
    }
    // 스티커: x, y = 가운데 위치(%), w = 너비(화면 너비의 %)
    function stickerList() { return edit ? edit.stickers : S().stickers[lay()]; }
    function drawStickers() {
        $('mj-stickers').innerHTML = stickerList().map(t => `
            <div class="mj-stk" data-id="${esc(t.id)}" style="left:${t.x}%;top:${t.y}%;width:${t.w}%">
                ${imgTag(t.img)}
                ${edit ? '<button class="del" data-sdel="1" aria-label="지우기">✕</button><span class="rz" data-rz="1"></span>' : ''}
            </div>`).join('');
    }
    function applyRoom() {
        game.classList.toggle('bg-off', bgOff());
        game.classList.toggle('editing', !!edit);
        drawChar();
        drawStickers();
    }

    // 옆으로 밀어서 배경 바꾸기 + 꾹 누르면(0.6초) 편집 메뉴
    let sw = null, press = 0;
    const stopPress = () => { clearTimeout(press); press = 0; };
    game.addEventListener('pointerdown', e => {
        if (edit) return editDown(e);
        if (e.target.closest('button, .mj-nav, .mj-ask, .mj-edit-bar')) return;
        sw = { x: e.clientX, y: e.clientY };
        stopPress();
        press = setTimeout(() => { press = 0; sw = null; roomMenu(); }, 600);
    });
    game.addEventListener('pointermove', e => {
        if (sw && press && Math.hypot(e.clientX - sw.x, e.clientY - sw.y) > 10) stopPress();
    });
    game.addEventListener('pointerup', e => {
        stopPress();
        if (!sw || edit) return;
        const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
        if (!bgOff() && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) goBg(bgIdx + (dx < 0 ? 1 : -1));
    });
    game.addEventListener('pointercancel', () => { sw = null; stopPress(); });
    game.addEventListener('contextmenu', e => e.preventDefault());       // 꾹 누를 때 폰 메뉴가 뜨지 않게

    // 가운데 작은 창 (메뉴·확인용)
    function sheet(title, sub, items) {
        const old = game.querySelector('.mj-ask'); if (old) old.remove();
        const box = document.createElement('div');
        box.className = 'mj-ask';
        box.innerHTML = `
            <div class="mj-ask-card">
                <div class="mj-ask-t">${title}</div>
                ${sub ? `<div class="mj-ask-s">${sub}</div>` : ''}
                <div class="mj-ask-list">${items.map((it, i) => `<button class="${it.cls || ''}" data-i="${i}">${it.label}</button>`).join('')}</div>
            </div>`;
        game.appendChild(box);
        box.addEventListener('click', e => {
            const b = e.target.closest('[data-i]');
            if (!b && e.target.closest('.mj-ask-card')) return;
            box.remove();
            if (b && items[Number(b.dataset.i)].run) items[Number(b.dataset.i)].run();
        });
    }
    function roomMenu() {
        const off = bgOff(), k = lay() === 'pc' ? 'PC' : 'Mobile';
        sheet('Room', off ? 'The room is off — only stickers are showing.' : 'Long-press anytime to come back here.', [
            off ? { label: 'Turn the room on', run: () => sheet('Bring the room back?', 'Background and Minjung will show again.', [
                    { label: 'On', cls: 'main', run: () => save('방 on', d => { d.settings.bg_off = false; }) }, { label: 'Cancel', cls: 'ghost' }]) }
                : { label: 'Turn the room off', run: () => sheet('Turn off the room?', 'Background and Minjung hide. Stickers stay.', [
                    { label: 'Off', cls: 'main', run: () => save('방 off', d => { d.settings.bg_off = true; }) }, { label: 'Cancel', cls: 'ghost' }]) },
            { label: `Edit layout · ${k}`, run: startEdit },
            { label: 'Add sticker', run: () => { startEdit(); addSticker(); } },
            { label: 'Change character', run: () => pickFile(changeChar) },
            { label: 'Backgrounds', run: () => openWin('room') },
            { label: 'Cancel', cls: 'ghost' }
        ]);
    }

    /* ---- 배치 편집: 캐릭터(좌우 이동·크기) + 스티커(이동·크기·삭제) ---- */
    function startEdit() {
        if (edit) return;
        const k = lay();
        edit = { k, char: Object.assign({}, S().layout[k]), stickers: clone(S().stickers[k]), files: {} };
        const bar = document.createElement('div');
        bar.className = 'mj-edit-bar';
        bar.innerHTML = `
            <div class="row"><b>Edit · ${k === 'pc' ? 'PC' : 'Mobile'}</b><span class="sp"></span>
                <button class="mj-btn ghost" data-e="cancel">Cancel</button><button class="mj-btn" data-e="done">Done</button></div>
            <div class="row">
                <button class="mj-add" data-e="sticker">+ Sticker</button>
                ${bgOff() ? '' : `<label class="size">Size <input type="range" min="30" max="140" value="${edit.char.h}" data-e="size"></label>
                <button class="mj-link" data-e="reset">reset</button>`}
            </div>
            <div class="hint">${bgOff() ? 'Drag stickers · corner to resize' : 'Drag Minjung left/right · drag stickers · corner to resize'}</div>`;
        game.appendChild(bar);
        bar.addEventListener('click', e => {
            const b = e.target.closest('[data-e]'); if (!b) return;
            const a = b.dataset.e;
            if (a === 'cancel') endEdit(false);
            if (a === 'done') endEdit(true);
            if (a === 'sticker') addSticker();
            if (a === 'reset') { edit.char = Object.assign({}, DEFAULT_LAYOUT[edit.k]); bar.querySelector('[data-e=size]').value = edit.char.h; drawChar(); }
        });
        bar.addEventListener('input', e => { if (e.target.dataset.e === 'size') { edit.char.h = Number(e.target.value); drawChar(); } });
        applyRoom();
    }
    function endEdit(keep) {
        const ed = edit; edit = null;
        const bar = game.querySelector('.mj-edit-bar'); if (bar) bar.remove();
        if (!keep || !ed) { applyRoom(); return; }
        const k = ed.k, before = S().stickers[k], other = S().stickers[k === 'pc' ? 'mobile' : 'pc'];
        const files = {}, added = [];
        ed.stickers.forEach(t => { if (ed.files[t.img]) { files[t.img] = ed.files[t.img]; added.push(t.img); } });   // 새로 올린 스티커 → 모음에도
        const lib = S().sticker_lib || [];
        before.forEach(t => {                                                                         // 지운 스티커 그림 파일도 지움 (모음에 있는 건 남김)
            if (!ed.stickers.some(x => x.img === t.img) && !other.some(x => x.img === t.img) && !lib.includes(t.img)) files[t.img] = null;
        });
        const round = o => { Object.keys(o).forEach(key => { if (typeof o[key] === 'number') o[key] = Math.round(o[key] * 10) / 10; }); return o; };
        save('배치 수정 (' + k + ')', d => {
            d.settings.layout[k] = round(Object.assign({}, ed.char));
            d.settings.stickers[k] = ed.stickers.map(t => round(Object.assign({}, t)));
            if (added.length) d.settings.sticker_lib = [...new Set((d.settings.sticker_lib || []).concat(added))];
        }, files);
    }
    // 내 스티커 모음 = settings.sticker_lib (다이어리 스티커 서랍과 같이 씀) + 방에 붙인 것
    function stickerLib() {
        return [...new Set((S().sticker_lib || []).concat(S().stickers.pc.map(t => t.img), S().stickers.mobile.map(t => t.img)))].filter(Boolean);
    }
    function addSticker() {
        if (!window.ghdb.hasToken()) { alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
        const lib = stickerLib();
        if (!lib.length) return uploadSticker();
        const old = game.querySelector('.mj-ask'); if (old) old.remove();
        const box = document.createElement('div');
        box.className = 'mj-ask';
        box.innerHTML = `<div class="mj-ask-card"><div class="mj-ask-t">Sticker</div><div class="mj-ask-s">My stickers (shared with Diary)</div>
            <div class="mj-stk-lib">${lib.map(p => `<button data-p="${esc(p)}">${imgTag(p)}</button>`).join('')}</div>
            <div class="mj-ask-list"><button class="main" data-up="1">Upload new</button><button class="ghost">Cancel</button></div></div>`;
        game.appendChild(box);
        box.addEventListener('click', e => {
            const b = e.target.closest('[data-p]'), up = e.target.closest('[data-up]');
            if (!b && !up && !e.target.closest('.ghost') && e.target.closest('.mj-ask-card')) return;
            box.remove();
            if (b) { if (!edit) startEdit(); edit.stickers.push({ id: uid('st'), img: b.dataset.p, x: 50, y: 40, w: 28 }); drawStickers(); }
            if (up) uploadSticker();
        });
    }
    function uploadSticker() {
        pickFile(async f => {
            try {
                toast('uploading…');
                const { path, sha } = await uploadImage(f, 'stickers', 800, 'image/png');
                if (!edit) startEdit();
                edit.files[path] = sha;
                edit.stickers.push({ id: uid('st'), img: path, x: 50, y: 40, w: 28 });
                drawStickers();
            } catch (e) { alert('스티커를 올리지 못했어요.\n' + (e.message || e)); }
        });
    }
    // 끌기: 캐릭터는 좌우만, 스티커는 어디든. 모서리 점은 크기
    function editDown(e) {
        if (e.target.closest('.mj-edit-bar, .mj-ask')) return;
        const r = $('mj-scene').getBoundingClientRect();
        const del = e.target.closest('[data-sdel]');
        const stkEl = e.target.closest('.mj-stk');
        if (del && stkEl) { edit.stickers = edit.stickers.filter(t => t.id !== stkEl.dataset.id); drawStickers(); return; }
        let move;
        if (stkEl) {
            const t = edit.stickers.find(x => x.id === stkEl.dataset.id);
            const sx = e.clientX, sy = e.clientY, o = Object.assign({}, t);
            if (e.target.closest('[data-rz]')) move = ev => { t.w = Math.max(5, Math.min(100, o.w + (ev.clientX - sx) / r.width * 200)); stkEl.style.width = t.w + '%'; };
            else move = ev => {
                t.x = Math.max(0, Math.min(100, o.x + (ev.clientX - sx) / r.width * 100));
                t.y = Math.max(0, Math.min(100, o.y + (ev.clientY - sy) / r.height * 100));
                stkEl.style.left = t.x + '%'; stkEl.style.top = t.y + '%';
            };
        } else if (e.target.closest('.mj-char') && !bgOff()) {
            const sx = e.clientX, ox = edit.char.x;
            move = ev => { edit.char.x = Math.max(0, Math.min(100, ox + (ev.clientX - sx) / r.width * 100)); drawChar(); };
        }
        if (!move) return;
        e.preventDefault();
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
    }

    /* ---- 캐릭터 그림 바꾸기 (배경이 투명한 PNG 추천) ---- */
    async function changeChar(file) {
        if (!window.ghdb.hasToken()) { alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
        try {
            toast('uploading…');
            const { path, sha } = await uploadImage(file, 'character', 1600, 'image/png');
            const old = S().character, files = {}; files[path] = sha;
            if (old && old.startsWith(IMG_DIR)) files[old] = null;
            save('캐릭터 그림', d => { d.settings.character = path; }, files);
        } catch (e) { alert('그림을 올리지 못했어요.\n' + (e.message || e)); }
    }
    /* ---- 배경 목록 (Backgrounds 창) ---- */
    async function setBgImage(i, which, file) {
        if (!window.ghdb.hasToken()) { alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
        try {
            toast('uploading…');
            const { path, sha } = await uploadImage(file, 'room', 2000, 'image/jpeg');
            const files = {}; files[path] = sha;
            const list = bgList();
            if (i < 0) {
                save('배경 추가', d => { d.settings.backgrounds.push({ id: uid('bg'), mobile: path, pc: path }); }, files);
                return;
            }
            const id = list[i].id, old = list[i][which];
            const usedElsewhere = list.some((b, j) => ['mobile', 'pc'].some(w => !(j === i && w === which) && b[w] === old));
            if (old && old.startsWith(IMG_DIR) && !usedElsewhere) files[old] = null;
            save('배경 ' + which, d => { const b = d.settings.backgrounds.find(x => x.id === id); if (b) b[which] = path; }, files);
        } catch (e) { alert('배경을 올리지 못했어요.\n' + (e.message || e)); }
    }
    function delBg(i) {
        const list = bgList();
        if (list.length <= 1) { alert('배경은 하나는 남겨 둬야 해요.'); return; }
        if (!confirm('이 배경을 지울까요?')) return;
        const b = list[i], files = {};
        [b.mobile, b.pc].forEach(p => {
            if (p && p.startsWith(IMG_DIR) && !list.some((x, j) => j !== i && (x.mobile === p || x.pc === p))) files[p] = null;
        });
        if (bgIdx >= i) bgIdx = Math.max(0, bgIdx - 1);
        save('배경 삭제', d => { d.settings.backgrounds = d.settings.backgrounds.filter(x => x.id !== b.id); }, files);
    }

    function drawDate() {
        const el = $('mj-date');
        if (el) el.textContent = dayTitle(todayKey());
    }
    let shownLine = null, typer = 0;
    function drawScreen() {
        drawDate();
        applyRoom();
        const hp = db.hp.slice().sort(byNewest)[0];
        $('mj-hp').innerHTML = hearts(hp ? hp.v : 5);
        const qt = todayKey(), qs = db.quests.filter(q => qDue(q, qt)), qd = qs.filter(q => qDone(qt, q.id)).length;
        $('mj-quest').innerHTML = `<span class="mj-ico">${ICON.quest}</span><span class="n">${qd}/${qs.length}</span>${qs.length && qd === qs.length ? '<span class="clr">clear</span>' : ''}`;
        $('mj-quest').classList.toggle('done', !!qs.length && qd === qs.length);
        const line = db.lines.slice().sort(byNewest)[0];
        const text = line ? line.text : '…';
        if (text !== shownLine) {
            shownLine = text;
            const say = $('mj-say');
            clearInterval(typer);
            let i = 0;
            say.textContent = '';
            typer = setInterval(() => {
                if (!say.isConnected) return clearInterval(typer);
                i++; say.textContent = text.slice(0, i);
                if (i >= text.length) clearInterval(typer);
            }, 38);
        }
    }
    $('mj-hp').addEventListener('click', () => openWin('hp'));
    $('mj-quest').addEventListener('click', () => openWin('quest'));

    /* ---------------- 퀘스트 ---------------- */
    const qDone = (date, id) => !!(db.quest_log[date] || {})[id];
    const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
    function qLastBefore(id, date) {          // date 전날까지 중 마지막으로 한 날
        return Object.keys(db.quest_log).filter(k => k < date && db.quest_log[k][id]).sort().pop() || '';
    }
    function qDue(q, date) {
        if (q.kind !== 'repeat') return true;
        if (qDone(date, q.id)) return true;
        if (q.mode === 'week') return (q.days || []).includes(new Date(date + 'T00:00').getDay());
        const last = qLastBefore(q.id, date);
        return !last || dayDiff(last, date) >= (q.every || 1);
    }
    function qWhen(q, date) {                  // 다음에 할 때까지
        if (q.mode === 'week') {
            for (let n = 1; n <= 7; n++) if ((q.days || []).includes((new Date(date + 'T00:00').getDay() + n) % 7)) return n === 1 ? 'tomorrow' : 'D-' + n;
            return '';
        }
        const last = qLastBefore(q.id, date) || (qDone(date, q.id) ? date : '');
        const left = (q.every || 1) - (last ? dayDiff(last, date) : 0);
        return left <= 1 ? 'tomorrow' : 'D-' + left;
    }
    const qRule = q => q.mode === 'week' ? (q.days || []).slice().sort().map(d => DOW_KO[d]).join('·') : (q.every || 1) + '일마다';
    function toggleQuest(st, id) {
        const q = db.quests.find(x => x.id === id); if (!q) return;
        const date = st.date, on = !qDone(date, id), time = hmOf(new Date());
        save('퀘스트 ' + (on ? '완료 ' : '취소 ') + date + ' ' + q.title, d => {
            d.quest_log[date] = d.quest_log[date] || {};
            if (on) d.quest_log[date][id] = time; else delete d.quest_log[date][id];
            if (!Object.keys(d.quest_log[date]).length) delete d.quest_log[date];
        });
    }
    function questView(st) {
        const daily = st.tab === 'Daily';
        if (st.qedit) return questEdit(st, daily);
        const date = st.date;
        let list = db.quests.filter(q => (q.kind === 'repeat') !== daily);
        if (daily && st.sub !== 'all') list = list.filter(q => (q.slot || 'etc') === st.sub);
        const due = daily ? list : list.filter(q => qDue(q, date));
        const done = due.filter(q => qDone(date, q.id)).length;
        const pct = due.length ? Math.round(done / due.length * 100) : 0;
        const row = q => {
            const ok = qDone(date, q.id), isDue = qDue(q, date);
            return `
                <button class="mj-q ${ok ? 'ok' : ''} ${isDue ? '' : 'rest'}" data-act="q-toggle" data-id="${q.id}">
                    <span class="box">${ok ? '✓' : ''}</span>
                    <span class="tt">${esc(q.title)}</span>
                    ${!daily ? `<span class="rule">${qRule(q)}</span><span class="when">${ok ? (db.quest_log[date][q.id] || '') : isDue ? 'today' : qWhen(q, date)}</span>` : (ok ? `<span class="when">${db.quest_log[date][q.id]}</span>` : '')}
                </button>`;
        };
        let body = '';
        if (daily && st.sub === 'all') {
            body = QSLOTS.map(([k, l]) => { const g = list.filter(q => (q.slot || 'etc') === k); return g.length ? `<div class="mj-log-day">${l}</div>` + g.map(row).join('') : ''; }).join('');
        } else if (daily) body = list.map(row).join('');
        else body = due.map(row).join('') + (list.length > due.length ? `<div class="mj-log-day">later</div>` + list.filter(q => !qDue(q, date)).map(row).join('') : '');
        return `
            ${daily ? `<div class="mj-subs">${[['all', 'All']].concat(QSLOTS).map(([k, l]) => `<button class="${st.sub === k ? 'on' : ''}" data-act="sub" data-v="${k}">${l}</button>`).join('')}</div>` : ''}
            <div class="mj-day">
                <button data-act="day" data-v="-1">‹</button>
                <input type="date" data-day value="${date}">
                <button data-act="day" data-v="1">›</button>
                <button class="today" data-act="day" data-v="0">Today</button>
            </div>
            <div class="mj-qbar"><span class="fill" style="width:${pct}%"></span></div>
            <div class="mj-qstat">${done}/${due.length}${due.length && done === due.length ? ' · clear ♡' : ''}<button class="mj-link" data-act="q-edit">edit</button></div>
            <div class="mj-log">${body || empty('퀘스트가 없어요.')}</div>`;
    }
    function questEdit(st, daily) {
        const list = db.quests.filter(q => (q.kind === 'repeat') !== daily);
        return `
            <div class="mj-sec">${daily ? 'Daily' : 'Weekly'} quests</div>
            <div class="mj-pf-edit mj-qe">${list.map(q => qeRow(q, daily)).join('')}</div>
            <button class="mj-add" data-act="q-add">+ quest</button>
            <div class="mj-btns"><span class="sp"></span><button class="mj-btn ghost" data-act="q-cancel">Cancel</button><button class="mj-btn" data-act="q-save">Save</button></div>`;
    }
    const qeRow = (q, daily) => `
        <div class="mj-qe-row" data-id="${esc(q.id || '')}">
            <div class="top">
                <input data-k="title" value="${esc(q.title || '')}" placeholder="quest">
                <div class="mj-pf-tools"><button data-act="pup">▲</button><button data-act="pdown">▼</button><button data-act="q-del">✕</button></div>
            </div>
            ${daily
                ? `<div class="mj-chips" data-single="slot">${QSLOTS.map(([k, l]) => `<button class="mj-chip ${(q.slot || 'morning') === k ? 'on' : ''}" data-act="chip" data-v="${k}">${l}</button>`).join('')}</div>`
                : `<div class="rep">
                    <div class="mj-chips" data-single="mode">
                        <button class="mj-chip ${q.mode !== 'week' ? 'on' : ''}" data-act="chip" data-v="every">every</button>
                        <button class="mj-chip ${q.mode === 'week' ? 'on' : ''}" data-act="chip" data-v="week">weekday</button>
                    </div>
                    <label class="every"><input data-k="every" type="number" min="1" max="60" value="${q.every || 3}" inputmode="numeric">일마다</label>
                    <div class="mj-chips days" data-multi="days">${DOW_KO.map((d, i) => `<button class="mj-chip ${(q.days || []).includes(i) ? 'on' : ''}" data-act="chip" data-v="${i}">${d}</button>`).join('')}</div>
                </div>`}
        </div>`;
    function saveQuests(id, el, st) {
        const daily = st.tab === 'Daily';
        const rows = [...el.querySelectorAll('.mj-qe-row')].map(r => {
            const title = r.querySelector('[data-k=title]').value.trim(); if (!title) return null;
            const q = { id: r.dataset.id || uid('q'), kind: daily ? 'daily' : 'repeat', title };
            const pick = sel => { const c = r.querySelector(`[data-single=${sel}] .mj-chip.on`); return c ? c.dataset.v : ''; };
            if (daily) q.slot = pick('slot') || 'morning';
            else {
                q.mode = pick('mode') === 'week' ? 'week' : 'every';
                if (q.mode === 'week') q.days = [...r.querySelectorAll('[data-multi=days] .mj-chip.on')].map(c => Number(c.dataset.v));
                else q.every = Math.max(1, Number(r.querySelector('[data-k=every]').value) || 1);
            }
            return q;
        }).filter(Boolean);
        st.qedit = false;
        save((daily ? 'Daily' : 'Weekly') + ' 퀘스트 수정', d => {
            const others = d.quests.filter(q => (q.kind === 'repeat') === daily);
            d.quests = daily ? rows.concat(others) : others.concat(rows);
        });
    }
    $('mj-dialog').addEventListener('click', () => openWin('lines'));

    // 아래 메뉴(모바일) + 바탕화면 아이콘(PC)
    function drawMenus() {
        $('mj-nav').innerHTML = NAV.map(n => `<button data-nav="${n.id}"><span class="mj-ico">${iconHtml(n.id)}</span><span>${n.title}</span></button>`).join('');
        $('mj-icons').innerHTML = NAV.map(n => `<button class="mj-file" data-nav="${n.id}"><span class="mj-ico">${iconHtml(n.id)}</span><span class="mj-file-name">${n.title}</span></button>`).join('');
    }
    root.addEventListener('click', e => {
        const b = e.target.closest('[data-nav]');
        if (!b) return;
        const n = NAV.find(x => x.id === b.dataset.nav);
        if (!n.pick) { closePick(); openWin(n.id); return; }
        const items = n.pick === 'soon'
            ? [{ icon: iconHtml('library'), label: 'Library', run: () => openWin('library') }]
                .concat(SOON.map(([k, l]) => ({ icon: ICON[k], label: l, run: () => toast(l + ' · Coming soon ♡') })))
            : n.pick.map(([k, l]) => ({ icon: iconHtml(k), label: l, run: () => openWin(k) }));
        showPick(b, items, n.title);
    });

    /* 작은 고르기 팝업: 누른 아이콘 바로 위(모바일)·옆(PC)에 뜨고, 바깥을 누르면 닫힘 */
    let pickEl = null;
    function closePick() { if (pickEl) { pickEl.remove(); pickEl = null; } }
    function showPick(anchor, items, title) {
        const same = pickEl && pickEl.dataset.for === (title || '');
        closePick();
        if (same) return;                       // 같은 아이콘을 다시 누르면 닫기만
        pickEl = document.createElement('div');
        pickEl.className = 'mj-pick-bg';
        pickEl.dataset.for = title || '';
        if (anchor.closest('.mj-win-food, .mj-win-state')) pickEl.classList.add('dark');   // 블랙·핑크 창에서는 어둡게
        pickEl.innerHTML = `<div class="mj-pick">${title ? `<div class="mj-pick-title">${title}</div>` : ''}${items.map((it, i) =>
            `<button class="${it.small ? 'small' : ''}" data-i="${i}">${it.icon ? `<span class="mj-ico">${it.icon}</span>` : ''}<span>${it.label}</span></button>`).join('')}</div>`;
        root.appendChild(pickEl);
        const box = pickEl.querySelector('.mj-pick'), a = anchor.getBoundingClientRect(), r = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const bw = box.offsetWidth, bh = box.offsetHeight;
        let left, top;
        if (anchor.closest('.mj-icons')) { left = a.left - r.left - bw - 8; top = a.top - r.top; }                       // PC: 아이콘 왼쪽
        else if (anchor.closest('.mj-nav')) { left = a.left - r.left + a.width / 2 - bw / 2; top = a.top - r.top - bh - 6; }   // 모바일: 아이콘 바로 위
        else { left = a.right - r.left - bw; top = a.bottom - r.top + 4; }                                                // 창 안 + 버튼: 아래
        left = Math.max(6, Math.min(left, r.width - bw - 6));
        top = Math.max(6, Math.min(top, r.height - bh - 6));
        box.style.left = left + 'px'; box.style.top = top + 'px';
        pickEl.addEventListener('click', e => {
            const btn = e.target.closest('[data-i]');
            closePick();
            if (btn) items[Number(btn.dataset.i)].run();
        });
    }

    function toast(msg) {
        const t = $('mj-toast');
        t.textContent = msg; t.classList.add('on');
        clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1600);
    }

    /* ---------------- 창 ---------------- */
    function newState(id) {
        const st = { tab: tabsOf(id) ? tabsOf(id)[0] : null, date: todayKey(), form: null };
        if (id === 'daily' || id === 'quest') st.sub = 'all';
        if (id === 'hp' || id === 'lines') st.form = {};
        return st;
    }
    function openWin(id) {
        if (!WIN[id]) return;
        closePick();
        if (wins[id]) { focusWin(id); return; }
        const el = document.createElement('div');
        el.className = 'mj-win mj-win-' + id;
        el.dataset.win = id;
        wins[id] = { el, st: newState(id) };
        layer.appendChild(el);
        if (isPC()) {
            // 한쪽에 쌓이지 않게 창마다 화면 여기저기 자리를 정해 둠 (가로·세로 비율)
            const w = Math.min(WIN[id].w, window.innerWidth - 40);
            el.style.width = w + 'px';
        }
        bindWin(id);
        renderWin(id);
        if (isPC()) placeWin(id);
        focusWin(id);
    }
    function placeWin(id) {
        const el = wins[id].el;
        const [fx, fy] = SPOT[id] || [Math.random(), Math.random()];
        const j = (opened++ % 3) * 14;
        const top0 = Math.max(0, root.getBoundingClientRect().top) + 46;        // 날짜·하트 아래부터
        const roomX = Math.max(0, window.innerWidth - el.offsetWidth - 130);   // 오른쪽 폴더 아이콘 자리는 비움
        const roomY = Math.max(0, window.innerHeight - top0 - el.offsetHeight - 16);
        el.style.left = Math.round(16 + fx * roomX + (fx > .5 ? -j : j)) + 'px';
        el.style.top = Math.round(top0 + fy * roomY + (fy > .5 ? -j : j)) + 'px';
    }
    function closeWin(id) { const w = wins[id]; if (!w) return; w.el.remove(); delete wins[id]; }
    function focusWin(id) {
        const w = wins[id]; if (!w) return;
        w.el.style.zIndex = ++zTop;
        Object.keys(wins).forEach(k => wins[k].el.classList.toggle('front', k === id));
    }
    function listEditView(id) {
        const rows = id === 'library' ? S().lib_types : S().beauty_slots;
        const name = id === 'library' ? 'Library' : 'Beauty';
        return `
            <div class="mj-sec">${name} list</div>
            <div class="mj-pf-edit mj-le">${rows.map(r => leRow(id, r)).join('')}</div>
            <button class="mj-add" data-act="le-add">+ add</button>
            <div class="mj-btns"><span class="sp"></span><button class="mj-btn ghost" data-act="le-cancel">Cancel</button><button class="mj-btn" data-act="le-save">Save</button></div>`;
    }
    const leRow = (id, r) => `
        <div class="mj-pf-row mj-le-row" data-key="${esc(r.key || '')}">
            <input data-k="label" value="${esc(r.label || '')}">
            ${id === 'daily' ? `<label class="tabchk"><input type="checkbox" data-k="tab" ${r.tab !== false ? 'checked' : ''}>tab</label>` : '<span></span>'}
            <div class="mj-pf-tools"><button data-act="pup">▲</button><button data-act="pdown">▼</button><button data-act="le-del">✕</button></div>
        </div>`;
    function saveListEdit(id, el) {
        const rows = [...el.querySelectorAll('.mj-le-row')].map(r => ({
            key: r.dataset.key || uid('c'), label: r.querySelector('[data-k=label]').value.trim(),
            tab: r.querySelector('[data-k=tab]') ? r.querySelector('[data-k=tab]').checked : undefined
        })).filter(r => r.label);
        if (!rows.length) { alert('하나는 남겨 둬야 해요.'); return; }
        const list = id === 'library' ? 'lib_types' : 'beauty_slots';
        const records = id === 'library' ? db.library : db.beauty, field = id === 'library' ? 'type' : 'slot';
        const gone = S()[list].filter(o => !rows.some(r => r.key === o.key) && records.some(x => x[field] === o.key));
        if (gone.length && !confirm(gone.map(o => o.label).join(', ') + ' 에 쓴 기록은 지워지지 않고 All에서 계속 보여요. 저장할까요?')) return;
        wins[id].st.listedit = false;
        wins[id].st.tab = tabsOf(id)[0];
        if (id === 'daily') wins[id].st.sub = 'all';
        save((id === 'library' ? 'Library' : 'Beauty') + ' 목록 수정', d => {
            d.settings[list] = rows.map(r => { const o = { key: r.key, label: r.label }; if (list === 'beauty_slots') o.tab = r.tab; return o; });
            if (list === 'beauty_slots') rows.forEach(r => { if (!Array.isArray(d.beauty_steps[r.key])) d.beauty_steps[r.key] = []; });
        });
    }
    function renderWin(id) {
        const w = wins[id]; if (!w) return;
        const def = WIN[id], st = w.st;
        // To Do 탭(Todo 화면)은 한 번 띄우면 다시 그리지 않음 — 다시 그리면 화면이 처음부터 다시 열림
        if (id === 'diary' && st.tab === 'To Do' && w.lastTab === 'To Do' && w.el.querySelector('.mj-todo-frame')) return;
        w.lastTab = st.tab;
        const body = w.el.querySelector('.mj-win-body');
        const top = body ? body.scrollTop : 0;
        const tabsEl = w.el.querySelector('.mj-tabs'), tabsLeft = tabsEl ? tabsEl.scrollLeft : 0;
        const tabs = tabsOf(id), canList = id === 'library' || id === 'daily';
        w.el.innerHTML = `
            <div class="mj-win-head" data-drag>
                <button class="mj-badge" ${(id !== 'hp' && id !== 'lines') ? 'data-act="icon" title="아이콘 바꾸기"' : 'tabindex="-1"'}>${iconHtml(id)}</button>
                <div class="mj-title">${def.title}</div>
                <span class="mj-dots3"><i class="y"></i><button class="g${canList ? ' on' : ''}" ${canList ? 'data-act="listedit" title="목록 편집"' : 'tabindex="-1"'}></button></span>
                <button class="mj-x" data-act="close" aria-label="닫기">${X_SVG}</button>
            </div>
            ${tabs ? `<div class="mj-tabs">${tabs.map(t => `<button data-act="tab" data-v="${t}" class="${st.tab === t ? 'on' : ''}">${t}</button>`).join('')}
                <span class="sp"></span>${canAdd(id, st) ? `<button class="mj-plus" data-act="plus" aria-label="추가">${PLUS_SVG}</button>` : ''}</div>` : ''}
            <div class="mj-win-body">${st.listedit ? listEditView(id) : VIEW[id](st)}</div>`;
        w.el.querySelector('.mj-win-body').scrollTop = top;
        const nt = w.el.querySelector('.mj-tabs'); if (nt) nt.scrollLeft = tabsLeft;
    }
    // 탭 줄 오른쪽 + 버튼이 보이는 곳
    function canAdd(id, st) { return id === 'daily' && st.tab === 'Outfit' && !st.form && !st.listedit; }
    function plus(id, st, btn) {
        const fresh = () => renderWin(id);
        if (WIN[id].types) {
            if (st.tab !== 'All') { st.form = { type: st.tab.toLowerCase() }; fresh(); return; }
            showPick(btn, WIN[id].types.map(k => ({ label: label(COND_TYPES, k), run: () => { st.form = { type: k }; fresh(); } })));
            return;
        }
        if (id === 'daily' && st.tab === 'Outfit') { pickFile(f => { st.form = { file: f, preview: URL.createObjectURL(f) }; fresh(); }); return; }
        if (id === 'daily' && st.sub === 'all') {
            showPick(btn, beautySlots().map(([k, l]) => ({ label: l, run: () => { st.form = { slot: k }; fresh(); } })));
            return;
        }
        st.form = {}; fresh();
    }
    // 저장 뒤 다시 그림 (적고 있는 칸이 있는 창은 건드리지 않음)
    let bgSig = '';
    function redraw(fromServer) {
        const sig = JSON.stringify(bgList());
        if (sig !== bgSig) { bgSig = sig; drawBgs(); }
        drawScreen();
        drawMenus();
        Object.keys(wins).forEach(id => {
            const st = wins[id].st;
            const typing = wins[id].el.contains(document.activeElement) || st.pedit || (st.form && st.form.id) ||
                (st.form && Object.keys(st.form).length && id !== 'hp' && id !== 'lines');
            if ((fromServer && typing) || (id === 'diary' && st.form) || st.qedit) return;   // 다이어리 쓰는 중엔 안 건드림
            renderWin(id);
        });
    }

    // 창 안 버튼들
    function bindWin(id) {
        const w = wins[id], el = w.el;
        el.addEventListener('pointerdown', () => focusWin(id));
        // 탭 줄: 마우스 휠(위아래)로도 좌우 이동, 마우스로 잡아 끌기
        el.addEventListener('wheel', e => {
            const t = e.target.closest('.mj-tabs');
            if (!t || t.scrollWidth <= t.clientWidth) return;
            t.scrollLeft += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
            e.preventDefault();
        }, { passive: false });
        let tabDrag = null;
        el.addEventListener('pointerdown', e => {
            const t = e.target.closest('.mj-tabs');
            if (!t || e.pointerType !== 'mouse') return;
            tabDrag = { t, x: e.clientX, left: t.scrollLeft, moved: false };
        });
        window.addEventListener('pointermove', e => {
            if (!tabDrag) return;
            const dx = e.clientX - tabDrag.x;
            if (Math.abs(dx) > 4) tabDrag.moved = true;
            tabDrag.t.scrollLeft = tabDrag.left - dx;
        });
        window.addEventListener('pointerup', () => { if (tabDrag && tabDrag.moved) el.dataset.noclick = '1'; tabDrag = null; setTimeout(() => { delete el.dataset.noclick; }, 0); });
        // PC: 머리 부분 끌어서 옮기기
        el.addEventListener('pointerdown', e => {
            if (!isPC() || !e.target.closest('[data-drag]') || e.target.closest('button')) return;
            const r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
            const move = ev => {
                el.style.left = Math.min(window.innerWidth - 60, Math.max(-r.width + 80, ev.clientX - ox)) + 'px';
                el.style.top = Math.min(window.innerHeight - 40, Math.max(0, ev.clientY - oy)) + 'px';
            };
            const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
            e.preventDefault();
        });
        el.addEventListener('click', e => {
            if (el.dataset.noclick) return;
            const b = e.target.closest('[data-act]');
            if (!b || !el.contains(b)) return;
            const st = w.st, act = b.dataset.act, v = b.dataset.v;
            const fresh = () => renderWin(id);
            switch (act) {
                case 'close': closeWin(id); break;
                case 'plus': plus(id, st, b); break;
                // 퀘스트
                case 'q-toggle': toggleQuest(st, b.dataset.id); break;
                case 'q-edit': st.qedit = true; fresh(); break;
                case 'q-cancel': st.qedit = false; fresh(); break;
                case 'q-save': saveQuests(id, el, st); break;
                case 'q-del': b.closest('.mj-qe-row').remove(); break;
                case 'q-add': { const box = el.querySelector('.mj-qe'); box.insertAdjacentHTML('beforeend', qeRow({}, st.tab === 'Daily')); box.lastElementChild.querySelector('input').focus(); break; }
                // 초록 버튼: 목록 편집 (순서·이름·추가·삭제)
                case 'listedit': st.listedit = !st.listedit; st.form = null; fresh(); break;
                case 'le-cancel': st.listedit = false; fresh(); break;
                case 'le-save': saveListEdit(id, el); break;
                case 'le-del': b.closest('.mj-le-row').remove(); break;
                case 'le-add': { const box = el.querySelector('.mj-le'); box.insertAdjacentHTML('beforeend', leRow(id, { key: '', label: '', tab: true })); box.lastElementChild.querySelector('input').focus(); break; }
                case 'tab': st.tab = v; st.form = (id === 'hp' || id === 'lines') ? {} : null; st.pedit = false; st.qedit = false; fresh(); break;
                case 'sub': st.sub = v; st.form = null; fresh(); break;
                case 'icon': pickFile(f => setIcon(id, f, WIN[id].title)); break;
                case 'day': st.date = v === '0' ? todayKey() : shiftDay(st.date, Number(v)); fresh(); break;
                case 'new': st.form = id === 'daily' ? { slot: v || null } : { type: v || null }; fresh(); break;
                case 'edit': {
                    const item = findItem(id, st, b.dataset.id);
                    if (item) { st.form = clone(item); fresh(); }
                    break;
                }
                case 'cancel': st.form = (id === 'hp' || id === 'lines') ? {} : null; fresh(); break;
                case 'save': submit(id, st, el); break;
                case 'del': delItem(id, st); break;
                case 'chip': {
                    const box = b.parentElement;
                    if (box.hasAttribute('data-single')) { [...box.children].forEach(c => c !== b && c.classList.remove('on')); b.classList.add('on'); }
                    else b.classList.toggle('on');
                    break;
                }
                case 'heart': {
                    const box = b.parentElement, n = Number(v), cur = Number(box.dataset.v || 0);
                    const nv = (n === cur) ? n - 1 : n;
                    box.dataset.v = nv;
                    box.innerHTML = Array.from({ length: 5 }, (_, i) => `<button data-act="heart" data-v="${i + 1}">${pixelHeart(i < nv)}</button>`).join('');
                    break;
                }
                case 'add-tag': {
                    const t = (prompt('새 증상 태그') || '').trim();
                    if (!t || db.symptom_tags.includes(t)) break;
                    const box = el.querySelector('[data-multi="tags"]');
                    const chip = document.createElement('button');
                    chip.className = 'mj-chip on'; chip.dataset.act = 'chip'; chip.dataset.v = t; chip.textContent = t;
                    box.insertBefore(chip, b);
                    keepForm(id);
                    save('Symptom 태그 ' + t, d => { if (!d.symptom_tags.includes(t)) d.symptom_tags.push(t); });
                    break;
                }
                case 'steps': {
                    const slot = (st.form && st.form.slot) || (st.sub === 'all' ? 'morning' : st.sub);
                    const t = prompt(label(beautySlots(), slot) + ' 루틴 단계 (쉼표로 구분)', db.beauty_steps[slot].join(', '));
                    if (t == null) break;
                    const steps = t.split(',').map(s => s.trim()).filter(Boolean);
                    keepForm(id);
                    save('Beauty ' + label(beautySlots(), slot) + ' 루틴', d => { d.beauty_steps[slot] = steps; });
                    break;
                }
                // 프로필 고치기
                case 'pedit': st.pedit = true; fresh(); break;
                case 'pcancel': st.pedit = false; fresh(); break;
                case 'padd': {
                    const list = el.querySelector('.mj-pf-edit');
                    list.insertAdjacentHTML('beforeend', pfRow({ id: uid('pf'), label: '', value: '' }));
                    list.lastElementChild.querySelector('input').focus();
                    break;
                }
                case 'pdel': b.closest('.mj-pf-row').remove(); break;
                case 'pup': { const r = b.closest('.mj-pf-row, .mj-qe-row'); if (r.previousElementSibling) r.parentElement.insertBefore(r, r.previousElementSibling); break; }
                case 'pdown': { const r = b.closest('.mj-pf-row, .mj-qe-row'); if (r.nextElementSibling) r.parentElement.insertBefore(r.nextElementSibling, r); break; }
                case 'psave': {
                    const rows = [...el.querySelectorAll('.mj-pf-edit .mj-pf-row')].map(r => ({
                        id: r.dataset.id, label: r.querySelector('[data-k=label]').value.trim(), value: r.querySelector('[data-k=value]').value.trim()
                    })).filter(r => r.label || r.value);
                    st.pedit = false;
                    save('Profile 수정', d => { d.profile = rows; });
                    break;
                }
                // 옷 사진
                case 'pick': pickFile(f => { st.form = Object.assign(st.form || {}, { file: f, preview: URL.createObjectURL(f) }); fresh(); }); break;
                // 투두
                case 'soon': toast(v + ' · Coming soon ♡'); break;
                // 배경 목록
                case 'bg-img': pickFile(f => setBgImage(Number(b.dataset.i), b.dataset.w, f)); break;
                case 'bg-add': pickFile(f => setBgImage(-1, 'mobile', f)); break;
                case 'bg-del': delBg(Number(b.dataset.i)); break;
                // 라이브러리
                case 'dy-photo': pickFile(f => insertDiaryPhoto(el, st, f)); break;
                case 'alllist': st.all = !st.all; fresh(); break;
                case 'lib-add': showPick(b, libTypes().map(([k, l]) => ({ label: l, run: () => { st.form = { type: k }; fresh(); } }))); break;
                case 'lib-cover': pickFile(f => { keepForm(id); st.form.coverFile = f; st.form.cover = ''; st.form.preview = URL.createObjectURL(f); fresh(); }); break;
                case 'lib-uncover': keepForm(id); st.form.cover = ''; st.form.coverFile = null; st.form.preview = ''; fresh(); break;
                case 'lib-go': libSearch(id, st, el); break;
                case 'lib-pick': libPick(id, st, el, Number(b.dataset.i)); break;
            }
        });
        el.addEventListener('change', e => {
            if (e.target.matches('[data-day]') && e.target.value) { w.st.date = e.target.value; renderWin(id); }
        });
        // 라이브러리 안에서 찾기 (목록만 다시 그림)
        el.addEventListener('input', e => {
            if (!e.target.matches('[data-libq]')) return;
            w.st.q = e.target.value;
            const box = el.querySelector('.mj-liblist'); if (box) box.innerHTML = libList(w.st);
        });
        el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-ls]')) { e.preventDefault(); libSearch(id, w.st, el); } });
    }

    /* 다이어리 본문: 글 사이사이 사진. 저장은 본문 글자 + 사진 자리 표시 `![](경로)` 한 줄 */
    const IMG_LINE = /^!\[\]\((.+)\)$/;
    function diaryHtml(it) {
        const body = it.body || '', lines = body.split('\n');
        const inline = lines.some(l => IMG_LINE.test(l.trim()));
        const img = p => `<img class="mj-dimg" data-path="${esc(p)}" src="${esc(imgSrc(p))}" ${/^https?:/.test(p) ? '' : `onerror="this.onerror=null;this.src='${esc(repo.rawUrl(p))}'"`} alt="">`;
        let html = inline ? '' : (it.imgs || []).map(img).join('');           // 옛 글: 사진은 맨 위에
        html += lines.map(l => { const m = IMG_LINE.exec(l.trim()); return m ? img(m[1]) : `<div>${l ? esc(l) : '<br>'}</div>`; }).join('');
        return html;
    }
    function diaryText(editor) {
        let out = '';
        const walk = n => {
            n.childNodes.forEach(c => {
                if (c.nodeType === 3) { out += c.nodeValue.replace(/\u00a0/g, ' '); return; }
                if (c.nodeType !== 1) return;
                const tag = c.tagName;
                if (tag === 'IMG') { out += '\n![](' + (c.dataset.path || ('new:' + c.dataset.new)) + ')\n'; return; }
                if (tag === 'BR') { out += '\n'; return; }
                const block = /^(DIV|P|LI|H\d)$/.test(tag);
                if (block && out && !out.endsWith('\n')) out += '\n';
                walk(c);
                if (block && !out.endsWith('\n')) out += '\n';
            });
        };
        walk(editor);
        return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
            .replace(/\n\n(!\[\]\()/g, '\n$1').replace(/(!\[\]\([^)\n]+\))\n\n/g, '$1\n').trim();   // 사진 앞뒤 빈 줄은 하나로
    }
    let diaryRange = null;
    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection(); if (!sel.rangeCount) return;
        const r = sel.getRangeAt(0), ed = r.startContainer && (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement);
        if (ed && ed.closest && ed.closest('.mj-dedit')) diaryRange = r.cloneRange();
    });
    function insertDiaryPhoto(el, st, file) {
        const ed = el.querySelector('.mj-dedit'); if (!ed) return;
        st.form.addFiles = st.form.addFiles || [];
        const k = st.form.addFiles.push(file) - 1;
        const img = document.createElement('img');
        img.className = 'mj-dimg'; img.dataset.new = k; img.src = URL.createObjectURL(file);
        const after = document.createElement('div'); after.innerHTML = '<br>';
        if (diaryRange && ed.contains(diaryRange.startContainer)) {
            let blk = diaryRange.startContainer; while (blk && blk.parentNode !== ed) blk = blk.parentNode;
            if (blk) { ed.insertBefore(img, blk.nextSibling); ed.insertBefore(after, img.nextSibling); }
            else { ed.appendChild(img); ed.appendChild(after); }
        } else { ed.appendChild(img); ed.appendChild(after); }
        const r = document.createRange(); r.setStart(after, 0); r.collapse(true);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); diaryRange = r.cloneRange();
    }

    function pickFile(cb) {
        fileIn.value = '';
        fileIn.onchange = () => { const f = fileIn.files && fileIn.files[0]; if (f) cb(f); };
        fileIn.click();
    }
    async function setIcon(id, file, title) {
        if (!window.ghdb.hasToken()) { alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
        try {
            toast('uploading…');
            const { path, sha } = await uploadImage(file, 'icons', 256, 'image/png');
            const old = db.icons[id];
            const files = {}; files[path] = sha; if (old) files[old] = null;
            save(title + ' 아이콘', d => { d.icons[id] = path; }, files);
        } catch (e) { alert('아이콘을 올리지 못했어요.\n' + (e.message || e)); }
    }

    /* ---------------- 폼 ---------------- */
    // 적던 내용을 st.form에 옮겨 둠 (창을 다시 그려도 그대로 남게)
    function keepForm(id) {
        const w = wins[id], box = w && w.el.querySelector('.mj-form');
        if (box && w.st.form) Object.assign(w.st.form, collect(box));
    }
    function collect(box) {
        const f = {};
        box.querySelectorAll('[data-f]').forEach(i => { f[i.dataset.f] = i.value.trim(); });
        box.querySelectorAll('[data-multi]').forEach(g => { f[g.dataset.multi] = [...g.querySelectorAll('.mj-chip.on')].map(c => c.dataset.v); });
        box.querySelectorAll('[data-single]').forEach(g => { const c = g.querySelector('.mj-chip.on'); f[g.dataset.single] = c ? c.dataset.v : ''; });
        box.querySelectorAll('[data-hearts]').forEach(g => { f[g.dataset.hearts] = Number(g.dataset.v || 0); });
        return f;
    }
    const whenRow = (it) => `
        <div class="mj-when">
            <input type="date" data-f="date" value="${esc(it.date || todayKey())}">
            <input type="time" data-f="time" value="${esc(it.time || hmOf(new Date()))}">
        </div>`;
    const chips = (name, opts, sel, single, extra) => `
        <div class="mj-chips" ${single ? 'data-single' : 'data-multi'}="${name}">
            ${opts.map(([k, l]) => `<button class="mj-chip ${(single ? sel === k : (sel || []).includes(k)) ? 'on' : ''}" data-act="chip" data-v="${esc(k)}">${l}</button>`).join('')}${extra || ''}
        </div>`;
    const formBtns = it => `
        <div class="mj-btns">
            ${it.id ? '<button class="mj-btn ghost danger" data-act="del">Delete</button>' : ''}
            <span class="sp"></span>
            <button class="mj-btn ghost" data-act="cancel">Cancel</button>
            <button class="mj-btn" data-act="save">${it.id ? 'Update' : 'Save'}</button>
        </div>`;
    const LIST_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 7h11M8 12h11M8 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/></svg>';
    const dayNav = st => st.all ? `
        <div class="mj-day all"><span class="alllabel">All records</span><button class="lst on" data-act="alllist" title="날짜별로 보기">${LIST_SVG}</button></div>` : `
        <div class="mj-day">
            <button data-act="day" data-v="-1">‹</button>
            <input type="date" data-day value="${st.date}">
            <button data-act="day" data-v="1">›</button>
            <button class="today" data-act="day" data-v="0">Today</button>
            <button class="lst" data-act="alllist" title="모든 기록 최신순">${LIST_SVG}</button>
        </div>`;
    // 달이 바뀌는 곳에 굵은 핑크 가름선 + 'YYYY.MM'
    const monthOf = d => (d || '').slice(0, 7);
    const monthBar = m => `<div class="mj-month"><span>${m.replace('-', '.')}</span></div>`;
    const monthHead = (rows, i) => (i === 0 || monthOf(rows[i].date) !== monthOf(rows[i - 1].date)) ? monthBar(monthOf(rows[i].date)) : '';
    // 날짜별 묶음 (모든 기록 보기)
    function grouped(rows, rowHtml) {
        const g = {}; rows.forEach(r => (g[r.date] = g[r.date] || []).push(r));
        const keys = Object.keys(g).sort().reverse();
        return keys.map((k, i) => (i === 0 || monthOf(k) !== monthOf(keys[i - 1]) ? monthBar(monthOf(k)) : '') +
            `<div class="mj-log-day">${dayTitle(k)}</div>` + g[k].map(rowHtml).join('')).join('');
    }
    const empty = t => `<p class="mj-empty">${t}</p>`;

    function listOf(id, st) {
        if (id === 'hp') return 'hp';
        if (id === 'lines') return 'lines';
        if (id === 'library') return 'library';
        if (WIN[id].types) return 'condition';
        if (id === 'daily') return st.tab === 'Outfit' ? 'outfit' : 'beauty';
        if (id === 'diary') return 'diary';
    }
    function findItem(id, st, itemId) { const l = listOf(id, st); return l && db[l].find(x => x.id === itemId); }

    async function submit(id, st, el) {
        const box = el.querySelector('.mj-form');
        if (!box) return;
        const f = collect(box);
        const list = listOf(id, st);
        const base = { id: st.form.id || uid(PREFIX[list]), date: f.date || todayKey(), time: f.time || hmOf(new Date()), at: stamp() };
        let item, msg;
        const when = base.date + ' ' + base.time;
        if (id === 'hp') {
            item = tidy(Object.assign(base, { v: f.v, memo: f.memo }));
            if (item.v == null) item.v = 0;
            msg = 'HP ' + when + ' ♥' + item.v;
        } else if (id === 'lines') {
            if (!f.text) { alert('대사를 적어 주세요.'); return; }
            item = Object.assign(base, { text: f.text });
            msg = '대사 ' + when;
        } else if (id === 'library') {
            if (!f.title) { alert('제목을 적어 주세요.'); return; }
            const files = {}, old = st.form.id ? db.library.find(x => x.id === st.form.id) : null;
            let cover = st.form.cover || '';
            if (st.form.coverFile) {
                if (!window.ghdb.hasToken()) { alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
                try { const up = await uploadImage(st.form.coverFile, 'covers', 900, 'image/jpeg'); files[up.path] = up.sha; cover = up.path; }
                catch (e) { alert('표지를 올리지 못했어요.\n' + (e.message || e)); return; }
            }
            if (old && old.cover && old.cover !== cover && old.cover.startsWith(IMG_DIR)) files[old.cover] = null;
            const tags = (f.tags || '').split(/[\s,]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean);
            item = tidy(Object.assign(base, { type: st.form.type || libType(st), title: f.title, creator: f.creator, year: f.year, cover, url: f.url,
                status: f.status, rating: f.rating || undefined, tags, memo: f.memo }));
            msg = label(libTypes(), item.type) + ' ' + item.title;
            st.form = null;
            upsert('library', item, msg, files);
            return;
        } else if (WIN[id].types) {
            const type = st.form.type;
            const extra = type === 'meal' ? { slot: f.slot, memo: f.memo }
                : type === 'medicine' ? { name: f.name, memo: f.memo }
                : type === 'symptom' ? { tags: f.tags, level: Number(f.level) || undefined, memo: f.memo }
                : { mood: f.mood, memo: f.memo };
            if (type === 'medicine' && !f.name) { alert('약 이름을 적어 주세요.'); return; }
            if (type === 'mood' && !f.mood) { alert('기분을 골라 주세요.'); return; }
            const oldC = st.form.id ? db.condition.find(x => x.id === st.form.id) : null;
            if (oldC && oldC.imgs) extra.imgs = oldC.imgs;
            if (oldC && oldC.from) extra.from = oldC.from;
            item = tidy(Object.assign(base, { type }, extra));
            msg = label(COND_TYPES, type) + ' ' + when + ' ' + (f.name || (f.tags || []).join(',') || f.slot || f.mood || '');
            st.date = item.date;
        } else if (id === 'daily' && st.tab === 'Beauty') {
            item = tidy(Object.assign(base, { slot: st.form.slot || (st.sub === 'all' ? 'etc' : st.sub), steps: f.steps, memo: f.memo }));
            msg = 'Beauty ' + label(beautySlots(), item.slot) + ' ' + when;
            st.date = item.date;
        } else if (id === 'daily') {
            msg = 'Outfit ' + when;
            let files = {};
            const old = st.form.id ? db.outfit.find(x => x.id === st.form.id) : null;
            let img = old ? old.img : '';
            if (st.form.file) {
                if (!window.ghdb.hasToken()) { alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
                const btn = box.querySelector('[data-act=save]');
                btn.disabled = true; btn.textContent = 'Uploading…';
                try {
                    const up = await uploadImage(st.form.file, 'outfit', 1440, 'image/jpeg');
                    files[up.path] = up.sha;
                    if (img) files[img] = null;
                    img = up.path;
                } catch (e) { alert('사진을 올리지 못했어요.\n' + (e.message || e)); btn.disabled = false; btn.textContent = 'Save'; return; }
            }
            if (!img) { alert('사진을 골라 주세요.'); return; }
            item = tidy(Object.assign(base, { img, memo: f.memo }));
            st.form = null;
            upsert('outfit', item, msg, files);
            return;
        } else if (id === 'diary') {
            let body = diaryText(box.querySelector('.mj-dedit'));
            const add = st.form.addFiles || [];
            const used = [...body.matchAll(/^!\[\]\(new:(\d+)\)$/gm)].map(m => Number(m[1]));
            if (!f.title && !body) { alert('내용을 적어 주세요.'); return; }
            const files = {};
            if (used.length) {
                if (!window.ghdb.hasToken()) { alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
                const btn = box.querySelector('[data-act=save]'); btn.disabled = true; btn.textContent = 'Uploading…';
                try {
                    for (const k of used) {
                        const up = await uploadImage(add[k], 'diary', 1600, 'image/jpeg'); files[up.path] = up.sha;
                        body = body.replace('![](new:' + k + ')', '![](' + up.path + ')');
                    }
                } catch (e) { alert('사진을 올리지 못했어요.\n' + (e.message || e)); btn.disabled = false; btn.textContent = 'Save'; return; }
            }
            const imgs = [...body.matchAll(/^!\[\]\((.+)\)$/gm)].map(m => m[1]);
            const old = st.form.id ? db.diary.find(x => x.id === st.form.id) : null;
            ((old && old.imgs) || []).forEach(p => { if (!imgs.includes(p) && p.startsWith(IMG_DIR)) files[p] = null; });
            f.body = body;
            const tags = (f.tags || '').split(/[\s,]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean);
            item = tidy(Object.assign(base, { title: f.title, body: f.body, imgs, tags }));
            if (old && old.from) item.from = old.from;
            msg = '일기 ' + when + (item.title ? ' ' + item.title : '');
            st.form = null;
            upsert('diary', item, msg, files);
            return;
        }
        st.form = (id === 'hp' || id === 'lines') ? {} : null;
        upsert(list, item, msg);
    }
    function delItem(id, st) {
        const list = listOf(id, st), it = st.form;
        if (!it || !it.id || !confirm('지울까요?')) return;
        const files = {};
        if (list === 'outfit' && it.img) files[it.img] = null;
        if (list === 'library' && it.cover && it.cover.startsWith(IMG_DIR)) files[it.cover] = null;
        st.form = (id === 'hp' || id === 'lines') ? {} : null;
        remove(list, it.id, list + ' 삭제 ' + (it.date || '') + ' ' + (it.time || ''), files);
    }

    /* ---------------- 창 내용 ---------------- */
    const pfRow = r => `
        <div class="mj-pf-row" data-id="${esc(r.id)}">
            <input data-k="label" value="${esc(r.label)}" placeholder="">
            <textarea data-k="value" rows="1" placeholder="">${esc(r.value)}</textarea>
            <div class="mj-pf-tools">
                <button data-act="pup" title="위로">▲</button><button data-act="pdown" title="아래로">▼</button><button data-act="pdel" title="지우기">✕</button>
            </div>
        </div>`;

    const VIEW = {
        /* 체력 */
        hp(st) {
            const it = st.form || {};
            const v = it.v ?? ((db.hp.slice().sort(byNewest)[0] || {}).v ?? 5);
            const rows = db.hp.slice().sort(byNewest);
            const groups = {};
            rows.forEach(r => { (groups[r.date] = groups[r.date] || []).push(r); });
            return `
                <div class="mj-form mj-card">
                    <div class="mj-hearts-pick" data-hearts="v" data-v="${v}">${Array.from({ length: 5 }, (_, i) => `<button data-act="heart" data-v="${i + 1}">${pixelHeart(i < v)}</button>`).join('')}</div>
                    <input data-f="memo" placeholder="memo" value="${esc(it.memo || '')}">
                    ${whenRow(it)}
                    ${it.id ? formBtns(it) : '<div class="mj-btns"><span class="sp"></span><button class="mj-btn" data-act="save">Save</button></div>'}
                </div>
                <div class="mj-log">
                    ${rows.length ? Object.keys(groups).map((k, i, ks) => (i === 0 || monthOf(k) !== monthOf(ks[i - 1]) ? monthBar(monthOf(k)) : '') + `
                        <div class="mj-log-day">${dayTitle(k)}</div>
                        ${groups[k].map(r => `<button class="mj-row ${it.id === r.id ? 'sel' : ''}" data-act="edit" data-id="${r.id}"><span class="tm">${esc(r.time)}</span><span class="mj-mini">${hearts(r.v)}</span><span class="tx">${esc(r.memo || '')}</span></button>`).join('')}
                    `).join('') : empty('아직 기록이 없어요.')}
                </div>`;
        },
        /* 대사 */
        lines(st) {
            const it = st.form || {};
            const rows = db.lines.slice().sort(byNewest);
            return `
                <div class="mj-form mj-card">
                    <div class="mj-say-name">김민정</div>
                    <textarea data-f="text" rows="3" placeholder="">${esc(it.text || '')}</textarea>
                    ${whenRow(it)}
                    ${it.id ? formBtns(it) : '<div class="mj-btns"><span class="sp"></span><button class="mj-btn" data-act="save">Save</button></div>'}
                </div>
                <div class="mj-sec">Backlog</div>
                <div class="mj-log">
                    ${rows.length ? rows.map((r, i) => monthHead(rows, i) + `
                        <button class="mj-line ${it.id === r.id ? 'sel' : ''}" data-act="edit" data-id="${r.id}">
                            <span class="tm">${dayTitle(r.date)} · ${esc(r.time)}</span>
                            <span class="tx">「${nl(r.text)}」</span>
                        </button>`).join('') : empty('아직 대사가 없어요.')}
                </div>`;
        },
        /* 프로필 + 라이브러리 */
        library(st) { return libraryView(st); },
        quest(st) { return questView(st); },
        room() {
            const list = bgList();
            return `
                                <div class="mj-bglist">
                    ${list.map((b, i) => `
                        <div class="mj-bgrow">
                            <span class="n">${i + 1}</span>
                            <button class="th m" data-act="bg-img" data-i="${i}" data-w="mobile">${b.mobile ? imgTag(b.mobile) : ''}<em>Mobile</em></button>
                            <button class="th p" data-act="bg-img" data-i="${i}" data-w="pc">${b.pc ? imgTag(b.pc) : ''}<em>PC</em></button>
                            <button class="mj-link" data-act="bg-del" data-i="${i}">delete</button>
                        </div>`).join('')}
                </div>
                <div class="mj-newbar"><button class="mj-add" data-act="bg-add">+ background</button></div>`;
        },
        profile(st) {
            if (st.pedit) return `
                <div class="mj-pf-edit">${db.profile.map(pfRow).join('')}</div>
                <button class="mj-add" data-act="padd">+ add field</button>
                <div class="mj-btns"><span class="sp"></span><button class="mj-btn ghost" data-act="pcancel">Cancel</button><button class="mj-btn" data-act="psave">Save</button></div>`;
            return `
                <div class="mj-pf">
                    ${db.profile.map(r => `<div class="mj-pf-item"><span class="k">${esc(r.label)}</span><span class="v">${r.value ? nl(r.value) : '<i>—</i>'}</span></div>`).join('')}
                </div>
                <div class="mj-btns"><span class="sp"></span><button class="mj-btn ghost" data-act="pedit">Edit</button></div>`;
        },
        /* 몸 상태 */
        food(st) { return condView('food', st); },
        state(st) { return condView('state', st); },
        /* 자기관리 */
        daily(st) {
            if (st.tab === 'Outfit') return outfitView(st);
            if (st.form) {
                const it = st.form, slot = it.slot || (st.sub === 'all' ? 'morning' : st.sub);
                return `
                    <div class="mj-form mj-card">
                        <div class="mj-sec">${label(beautySlots(), slot)} routine <button class="mj-link" data-act="steps">edit steps</button></div>
                        ${chips('steps', db.beauty_steps[slot].map(s => [s, s]), it.id ? it.steps : [], false)}
                        <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>
                        ${whenRow(it.id ? it : { date: st.date })}
                        ${formBtns(it)}
                    </div>`;
            }
            const rows = db.beauty.filter(x => (st.all || x.date === st.date) && (st.sub === 'all' || x.slot === st.sub)).sort(byNewest);   // 최신순
            const brow = r => `
                        <button class="mj-row" data-act="edit" data-id="${r.id}">
                            <span class="tm">${esc(r.time)}</span>
                            ${st.sub === 'all' ? `<span class="ty">${label(beautySlots(), r.slot)}</span>` : ''}
                            <span class="tx">${(r.steps || []).length ? `<span class="steps">${r.steps.map(esc).join(' · ')}</span> ` : ''}${r.memo ? `<span class="memo">${esc(r.memo)}</span>` : ''}</span>
                        </button>`;
            return `
                <div class="mj-subs">${beautySubs().map(([k, l]) => `<button class="${st.sub === k ? 'on' : ''}" data-act="sub" data-v="${k}">${l}</button>`).join('')}</div>
                ${dayNav(st)}
                <div class="mj-newbar">${(st.sub === 'all' ? beautySlots() : S().beauty_slots.filter(x => x.key === st.sub || !x.tab).map(x => [x.key, x.label])).map(([k, l]) => `<button class="mj-add" data-act="new" data-v="${k}">+ ${l}</button>`).join('')}</div>
                <div class="mj-log">
                    ${rows.length ? (st.all ? grouped(rows, brow) : rows.map(brow).join('')) : empty(st.all ? '아직 기록이 없어요.' : '이 날은 기록이 없어요.')}
                </div>`;
        },
        /* 다이어리 + 투두 */
        diary(st) {
            if (st.tab === 'To Do') return '<iframe class="mj-todo-frame" src="category/todo/app.html?skin=minjung" title="To Do"></iframe>';
            if (st.form) {
                const it = st.form;
                return `
                    <div class="mj-form mj-card">
                        ${whenRow(it)}
                        <input data-f="title" placeholder="title" value="${esc(it.title || '')}">
                        <div class="mj-dedit" contenteditable="true" spellcheck="false">${diaryHtml(it)}</div>
                        <div class="mj-dtools"><button class="mj-add" data-act="dy-photo">+ photo</button></div>
                        <input data-f="tags" placeholder="#tags" value="${esc(Array.isArray(it.tags) ? it.tags.map(x => '#' + x).join(' ') : (it.tags || ''))}">
                        ${formBtns(it)}
                    </div>`;
            }
            const rows = db.diary.slice().sort(byNewest);
            return `
                <div class="mj-newbar"><button class="mj-add" data-act="new">+ write</button></div>
                <div class="mj-log">
                    ${rows.length ? rows.map((r, i) => monthHead(rows, i) + `
                        <button class="mj-diary${(r.imgs || []).length ? ' has-img' : ''}" data-act="edit" data-id="${r.id}">
                            ${(r.imgs || []).length ? imgTag(r.imgs[0], 'dthumb') : ''}
                            <span class="dbody">
                                <span class="tm">${dayTitle(r.date)} · ${esc(r.time)}${r.imgs && r.imgs.length > 1 ? ` · ${r.imgs.length} photos` : ''}</span>
                                ${r.title ? `<span class="tt">${esc(r.title)}</span>` : ''}
                                ${r.body ? `<span class="tx">${esc(r.body.split('\n').filter(l => !IMG_LINE.test(l.trim())).join(' ').slice(0, 120))}</span>` : ''}
                                ${(r.tags || []).length ? `<span class="tags">${r.tags.map(x => '#' + esc(x)).join(' ')}</span>` : ''}
                            </span>
                        </button>`).join('') : empty('아직 일기가 없어요.')}
                </div>`;
        }
    };

    function condView(id, st) {
        if (st.form) return condForm(st);
        const types = WIN[id].types, type = st.tab === 'All' ? null : st.tab.toLowerCase();
        const rows = db.condition.filter(x => (st.all || x.date === st.date) && types.includes(x.type) && (!type || x.type === type)).sort(byNewest);   // 최신순
        return `
            ${dayNav(st)}
            <div class="mj-newbar">${(type ? [type] : types).map(k => `<button class="mj-add" data-act="new" data-v="${k}">+ ${label(COND_TYPES, k)}</button>`).join('')}</div>
            <div class="mj-log">
                ${rows.length ? (st.all ? grouped(rows, row) : rows.map(row).join('')) : empty(st.all ? '아직 기록이 없어요.' : '이 날은 기록이 없어요.')}
            </div>`;
        function row(r) { return `
                    <button class="mj-row" data-act="edit" data-id="${r.id}">
                        <span class="tm">${esc(r.time)}</span>
                        ${!type ? `<span class="ty ty-${r.type}">${label(COND_TYPES, r.type)}</span>` : ''}
                        <span class="tx">${condText(r)}</span>
                    </button>`; }
    }
    function condText(r) {
        const memo = r.memo ? ` <span class="memo">${esc(r.memo)}</span>` : '';
        if (r.type === 'meal') return `<b>${label(MEAL_SLOTS, r.slot || '') || ''}</b>${memo}${(r.imgs || []).length ? `<span class="mj-cimgs">${r.imgs.map(p => imgTag(p)).join('')}</span>` : ''}`;
        if (r.type === 'medicine') return `<b>${esc(r.name || '')}</b>${memo}`;
        if (r.type === 'symptom') return `<b>${esc((r.tags || []).join(', ') || '—')}</b> ${r.level ? `<span class="lv">${'●'.repeat(r.level)}${'○'.repeat(5 - r.level)}</span>` : ''}${memo}`;
        if (r.type === 'mood') { const m = MOODS.find(x => x[0] === r.mood) || ['', '', r.mood]; return `<span class="emo">${m[1]}</span> <b>${esc(m[2])}</b>${memo}`; }
        return memo;
    }
    function condForm(st) {
        const it = st.form, type = it.type;
        let fields = '';
        if (type === 'meal') fields = `
            ${chips('slot', MEAL_SLOTS, it.slot || guessSlot(), true)}
            <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>`;
        if (type === 'medicine') {
            const names = [...new Set(db.condition.filter(x => x.type === 'medicine' && x.name).map(x => x.name))];
            fields = `
                <input data-f="name" list="mj-med-names" placeholder="name" value="${esc(it.name || '')}">
                <datalist id="mj-med-names">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
                <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>`;
        }
        if (type === 'symptom') fields = `
            ${chips('tags', db.symptom_tags.map(t => [t, t]), it.tags || [], false, '<button class="mj-chip add" data-act="add-tag">+ tag</button>')}
            <div class="mj-sec">level</div>
            ${chips('level', [1, 2, 3, 4, 5].map(n => [String(n), '●'.repeat(n)]), it.level ? String(it.level) : '', true)}
            <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>`;
        if (type === 'mood') fields = `
            ${chips('mood', MOODS.map(([k, e, l]) => [k, `<span class="emo">${e}</span> ${l}`]), it.mood || '', true)}
            <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>`;
        return `
            <div class="mj-form mj-card">
                <div class="mj-sec">${label(COND_TYPES, type)}</div>
                ${fields}
                ${whenRow(it.id ? it : { date: st.date })}
                ${formBtns(it)}
            </div>`;
    }
    function guessSlot() { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'night'; }

    const libType = st => (libTypes().find(x => x[1] === st.tab) || ['all'])[0];
    const libCover = r => r.cover ? r.cover : (r.type === 'youtube' && ytId(r.url) ? `https://i.ytimg.com/vi/${ytId(r.url)}/mqdefault.jpg` : '');
    const titleKey = r => r.type + '|' + String(r.title || '').trim().toLowerCase();
    function libraryView(st) {
        if (st.form) return libForm(st);
        const t = libType(st);
        const year = String(new Date().getFullYear());
        const counts = libTypes().map(([k, l]) => [l, db.library.filter(x => x.type === k && (x.date || '').startsWith(year)).length]).filter(x => x[1]);
        return `
            <div class="mj-libtop">
                <input class="mj-libq" data-libq placeholder="search" value="${esc(st.q || '')}">
            </div>
            ${t === 'all' ? `<div class="mj-libstat">${year} · ${counts.length ? counts.map(([l, n]) => `${l} <b>${n}</b>`).join(' · ') : '아직 기록이 없어요'}</div>` : ''}
            <div class="mj-newbar">${t === 'all' ? '<button class="mj-add" data-act="lib-add">+ add</button>' : `<button class="mj-add" data-act="new" data-v="${t}">+ ${label(libTypes(), t)}</button>`}</div>
            <div class="mj-log mj-liblist">${libList(st)}</div>`;
    }
    function libList(st) {
        const t = libType(st), q = (st.q || '').trim().toLowerCase();
        // N회차: 같은 종류·제목을 날짜 순서대로 셈
        const nth = {}, total = {};
        db.library.slice().sort(byOldest).forEach(r => { const k = titleKey(r); total[k] = (total[k] || 0) + 1; nth[r.id] = total[k]; });
        const rows = db.library.filter(x => (t === 'all' || x.type === t) &&
            (!q || [x.title, x.creator, x.memo, (x.tags || []).join(' ')].join(' ').toLowerCase().includes(q))).sort(byNewest);
        if (!rows.length) return empty(q ? '찾는 기록이 없어요.' : '아직 없어요.');
        return rows.map((r, i) => {
            const cv = libCover(r), k = titleKey(r);
            return monthHead(rows, i) + `
            <button class="mj-lib" data-act="edit" data-id="${r.id}">
                ${cv ? imgTag(cv, 'thumb' + (r.type === 'youtube' && !r.cover ? ' wide' : '')) : ''}
                <span class="body">
                    <span class="tt">${esc(r.title)}${total[k] > 1 ? ` <em class="nth">${nth[r.id]}회차</em>` : ''}</span>
                    <span class="meta">${t === 'all' ? `<em class="mj-tag">${label(libTypes(), r.type)}</em>` : ''}<em class="mj-tag st-${r.status || 'want'}">${label(LIB_STATUS, r.status || 'want')}</em>${[r.creator, r.year].filter(Boolean).map(esc).join(' · ')}</span>
                    ${r.rating ? `<span class="mj-mini">${hearts(r.rating)}</span>` : ''}
                    ${r.memo ? `<span class="tx">${esc(r.memo)}</span>` : ''}
                    ${(r.tags || []).length ? `<span class="tags">${r.tags.map(x => '#' + esc(x)).join(' ')}</span>` : ''}
                    <span class="tm">${dayTitle(r.date)} · ${esc(r.time)}</span>
                </span>
            </button>`;
        }).join('');
    }
    function libForm(st) {
        const it = st.form, type = it.type || libType(st);
        const cv = it.preview || it.cover || (type === 'youtube' && ytId(it.url) ? `https://i.ytimg.com/vi/${ytId(it.url)}/mqdefault.jpg` : '');
        return `
            <div class="mj-form mj-card">
                <div class="mj-sec">${label(libTypes(), type)}</div>
                ${LIB_SEARCH[type] ? `
                <div class="mj-libsearch"><input data-ls placeholder="search" value=""><button class="mj-btn ghost" data-act="lib-go">Search</button></div>
                <div class="mj-libres"></div>` : ''}
                <div class="mj-libform">
                    <div class="cover">
                        ${cv ? `<img src="${esc(/^https?:|^blob:/.test(cv) ? cv : imgSrc(cv))}" alt="">` : '<span>cover</span>'}
                        <div class="cv-btns"><button class="mj-link" data-act="lib-cover">사진</button>${cv && !(type === 'youtube' && !it.cover && !it.preview) ? '<button class="mj-link" data-act="lib-uncover">빼기</button>' : ''}</div>
                    </div>
                    <div class="fields">
                        <input data-f="title" placeholder="title" value="${esc(it.title || '')}">
                        <div class="two"><input data-f="creator" placeholder="creator" value="${esc(it.creator || '')}"><input data-f="year" placeholder="year" value="${esc(it.year || '')}" inputmode="numeric"></div>
                        ${type === 'youtube' ? `<input data-f="url" placeholder="link" value="${esc(it.url || '')}">` : ''}
                    </div>
                </div>
                ${chips('status', LIB_STATUS, it.status || 'want', true)}
                <div class="mj-hearts-pick sm" data-hearts="rating" data-v="${it.rating || 0}">${Array.from({ length: 5 }, (_, i) => `<button data-act="heart" data-v="${i + 1}">${pixelHeart(i < (it.rating || 0))}</button>`).join('')}</div>
                <input data-f="tags" placeholder="#tags" value="${esc(Array.isArray(it.tags) ? it.tags.map(x => '#' + x).join(' ') : (it.tags || ''))}">
                <textarea data-f="memo" rows="5" placeholder="memo">${esc(it.memo || '')}</textarea>
                ${whenRow(it)}
                ${formBtns(it)}
            </div>`;
    }
    // 작품 검색
    let libResults = [];
    async function libSearch(id, st, el) {
        const type = st.form.type || libType(st), kind = LIB_SEARCH[type];
        const q = (el.querySelector('[data-ls]') || {}).value;
        const box = el.querySelector('.mj-libres');
        if (!q || !q.trim() || !box) return;
        box.innerHTML = '<p class="mj-empty">searching…</p>';
        try {
            if (kind === 'book') {
                const r = await fetch('https://dapi.kakao.com/v3/search/book?size=8&query=' + encodeURIComponent(q), { headers: { Authorization: 'KakaoAK ' + KAKAO_KEY } });
                libResults = ((await r.json()).documents || []).map(x => ({ title: x.title, year: (x.datetime || '').slice(0, 4), creator: (x.authors || []).join(', '), cover: x.thumbnail || '' }));
            } else {
                const r = await fetch(`https://api.themoviedb.org/3/search/${kind}?api_key=${TMDB_KEY}&language=ko-KR&query=` + encodeURIComponent(q));
                libResults = ((await r.json()).results || []).slice(0, 8).map(x => ({ id: x.id, kind, title: x.title || x.name, year: (x.release_date || x.first_air_date || '').slice(0, 4),
                    creator: '', cover: x.poster_path ? 'https://image.tmdb.org/t/p/w200' + x.poster_path : '' }));
            }
            box.innerHTML = libResults.length ? libResults.map((x, i) => `
                <button class="mj-libres-item" data-act="lib-pick" data-i="${i}">
                    ${x.cover ? `<img src="${esc(x.cover)}" alt="">` : '<span class="no"></span>'}
                    <span><b>${esc(x.title)}</b><small>${[x.year, x.creator].filter(Boolean).map(esc).join(' · ')}</small></span>
                </button>`).join('') : '<p class="mj-empty">결과가 없어요.</p>';
        } catch (e) { box.innerHTML = '<p class="mj-empty">검색하지 못했어요.</p>'; }
    }
    async function libPick(id, st, el, i) {
        const x = libResults[i]; if (!x) return;
        keepForm(id);
        Object.assign(st.form, { title: x.title, year: x.year, creator: x.creator || st.form.creator, cover: x.cover, coverFile: null, preview: '' });
        if (x.kind) {           // 감독(영화) · 만든 사람(드라마·애니)
            try {
                const r = await fetch(`https://api.themoviedb.org/3/${x.kind}/${x.id}?api_key=${TMDB_KEY}&language=ko-KR&append_to_response=credits`);
                const d = await r.json();
                const who = x.kind === 'movie' ? ((d.credits && d.credits.crew) || []).find(c => c.job === 'Director') : (d.created_by || [])[0];
                if (who) st.form.creator = who.name;
            } catch (e) { /* 없으면 비워 둠 */ }
        }
        renderWin(id);
    }

    function outfitView(st) {
        if (st.form) {
            const it = st.form;
            const src = it.preview || (it.img ? imgSrc(it.img) : '');
            return `
                <div class="mj-form mj-card mj-outfit-form">
                    ${src ? `<img class="mj-outfit-big" src="${esc(src)}" ${it.img && !it.preview ? `onerror="this.onerror=null;this.src='${esc(repo.rawUrl(it.img))}'"` : ''} alt="">` : ''}
                    <button class="mj-link" data-act="pick">${it.id ? '사진 바꾸기' : '다른 사진 고르기'}</button>
                    ${whenRow(it)}
                    <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>
                    ${formBtns(it)}
                </div>`;
        }
        const rows = db.outfit.slice().sort(byNewest);     // 최신 날짜·시간이 맨 앞
        if (!rows.length) return empty('아직 없어요.');
        return `
            <div class="mj-outfits">
                ${rows.map(r => `
                    <button class="mj-outfit" data-act="edit" data-id="${r.id}">
                        ${imgTag(r.img)}
                        <span class="d">${r.date.slice(5).replace('-', '.')}</span>
                    </button>`).join('')}
            </div>`;
    }

    /* ---------------- 투두 (기존 Todo 카테고리와 같은 파일) ---------------- */
    /* ---------------- 시작 ---------------- */
    bgSig = JSON.stringify(bgList());
    drawBgs();
    drawMenus();
    drawScreen();
    load();

    // 화면 크기가 바뀌면 (모바일↔PC) 배경 그림과 배치를 다시 고름
    let lastLay = lay();
    const onResize = () => {
        if (!root.isConnected) { window.removeEventListener('resize', onResize); return; }
        if (lay() !== lastLay) { lastLay = lay(); if (edit) endEdit(false); drawBgs(); applyRoom(); }
    };
    window.addEventListener('resize', onResize);
    // 날짜는 1분마다, 다른 기기에서 바꾼 기록은 돌아올 때 다시 불러옴
    const clock = setInterval(() => { if (!root.isConnected) return clearInterval(clock); drawDate(); }, 60000);
    const onVisible = () => {
        if (!root.isConnected) { document.removeEventListener('visibilitychange', onVisible); return; }
        const typing = document.activeElement && root.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
        if (document.visibilityState === 'visible' && !pending && !typing) load();
    };
    document.addEventListener('visibilitychange', onVisible);
}
