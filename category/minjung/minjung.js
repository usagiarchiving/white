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
    ['좋아하는 것', ''], ['좋아하는 음식', ''], ['싫어하는 것', '']
];
const DEFAULT_SYMPTOMS = ['배아픔', '두통'];
const DEFAULT_STEPS = { morning: ['세안', '토너', '로션', '선크림'], night: ['클렌징', '토너', '세럼', '크림'], etc: ['팩', '각질 케어'] };

const MEAL_SLOTS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Snack'], ['night', 'Late night']];
const MOODS = [['love', '🥰', 'love'], ['good', '😊', 'good'], ['okay', '🙂', 'okay'], ['meh', '😐', 'meh'], ['tired', '😪', 'tired'], ['sad', '😢', 'sad'], ['anxious', '😰', 'anxious'], ['angry', '😠', 'angry']];
const LIB_TYPES = [['book', 'Book'], ['youtube', 'YouTube'], ['movie', 'Movie']];
const LIB_STATUS = [['want', 'Want'], ['now', 'Now'], ['done', 'Done']];
const BEAUTY_SLOTS = [['morning', 'Morning'], ['night', 'Night'], ['etc', 'etc.']];
const COND_TYPES = [['meal', 'Meal'], ['medicine', 'Medicine'], ['symptom', 'Symptom'], ['mood', 'Mood']];

/* ---------------- 아이콘 (기본 그림, 창 위 아이콘을 누르면 내 이미지로 바꿀 수 있음) ---------------- */
const SV = b => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
const ICON = {
    profile: SV('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16.5c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h4.5M14 13h3.5"/>'),
    condition: SV('<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z"/><path d="M12 11v4.4M9.8 13.2h4.4"/>'),
    daily: SV('<path d="M12 11.5c-2-3.2-6.5-4.6-7.4-2.6-.8 1.9 2.4 4.2 7.4 2.6zM12 11.5c2-3.2 6.5-4.6 7.4-2.6.8 1.9-2.4 4.2-7.4 2.6z"/><circle cx="12" cy="11.5" r="1.2"/><path d="M11.2 12.6 8.6 19M12.8 12.6l2.6 6.4"/>'),
    diary: SV('<path d="M5 4.5h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z"/><path d="M5 17.5a2 2 0 0 1 2-2h11M9 8.5h5"/><path d="M12 12.6s-2-1.2-2-2.4a1 1 0 0 1 2-.3 1 1 0 0 1 2 .3c0 1.2-2 2.4-2 2.4z"/>'),
    menu: SV('<rect x="4.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.5"/><path d="M16.5 14v5M14 16.5h5"/>'),
    hp: SV('<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>'),
    lines: SV('<path d="M5 6h14a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 16h-8l-4 3v-3H5a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 5 6z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>'),
    schedule: SV('<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 9.5h16M8.5 3.5v4M15.5 3.5v4M8 13h2M12 13h2M8 16h2"/>'),
    inventory: SV('<path d="M4 8.5 12 5l8 3.5v8L12 20l-8-3.5z"/><path d="M4 8.5 12 12l8-3.5M12 12v8"/>'),
    bag: SV('<path d="M6 8.5h12l-1 11H7z"/><path d="M9 10V7.5a3 3 0 0 1 6 0V10"/>'),
    shop: SV('<path d="M4.5 9.5 6 5h12l1.5 4.5"/><path d="M4.5 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M6 12v7.5h12V12"/><path d="M10 19.5v-4h4v4"/>'),
    workout: SV('<path d="M7 8v8M17 8v8M4.5 10v4M19.5 10v4M7 12h10"/>'),
    friends: SV('<circle cx="9" cy="9" r="2.6"/><path d="M4.5 18c.7-2.6 2.4-4 4.5-4s3.8 1.4 4.5 4"/><path d="M17 15.5s-2.6-1.6-2.6-3.2a1.3 1.3 0 0 1 2.6-.4 1.3 1.3 0 0 1 2.6.4c0 1.6-2.6 3.2-2.6 3.2z"/>')
};
const X_SVG = '<svg viewBox="0 0 24 24" width="14" height="14"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6"><path d="M18 6 6 18M6 6l12 12"/></g></svg>';

/* 창 설정 — main: 아래 메뉴/바탕화면 아이콘에 나오는 5개 */
const WIN = {
    profile:   { title: 'Profile',   tabs: ['Profile', 'Library'], main: true, w: 360 },
    condition: { title: 'Condition', tabs: ['All', 'Meal', 'Medicine', 'Symptom', 'Mood'], main: true, w: 380 },
    daily:     { title: 'Daily',     tabs: ['Beauty', 'Outfit'], main: true, w: 460 },
    diary:     { title: 'Diary',     tabs: ['Diary', 'To Do'], main: true, w: 400 },
    menu:      { title: 'Menu',      main: true, w: 340 },
    hp:        { title: 'HP Log',    w: 340 },
    lines:     { title: 'Lines',     w: 360 }
};
const MAIN = Object.keys(WIN).filter(k => WIN[k].main);
// 아이패드·PC에서 창이 처음 뜨는 자리 (0~1 비율: 왼쪽→오른쪽, 위→아래)
const SPOT = { profile: [0, 0], condition: [1, 0], diary: [0, 1], daily: [1, 1], menu: [0.22, 0.45], hp: [1, 0.08], lines: [0.5, 0.85] };
const SOON = [['schedule', 'Schedule'], ['inventory', 'Inventory'], ['bag', 'Bag'], ['shop', 'Shop'], ['workout', 'Workout'], ['friends', 'Friends']];

/* To Do: 기존 투두 카테고리(data/todos.json)를 그대로 씀 */
const TODO_URL = 'https://ofhadtlrsccipnvdohqh.supabase.co';

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
    LISTS.forEach(k => { d[k] = Array.isArray(d[k]) ? d[k] : []; });
    d.symptom_tags = Array.isArray(d.symptom_tags) && d.symptom_tags.length ? d.symptom_tags : DEFAULT_SYMPTOMS.slice();
    d.beauty_steps = d.beauty_steps && typeof d.beauty_steps === 'object' ? d.beauty_steps : {};
    BEAUTY_SLOTS.forEach(([k]) => { if (!Array.isArray(d.beauty_steps[k])) d.beauty_steps[k] = DEFAULT_STEPS[k].slice(); });
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
    const todoDb = window.ghdb.createClient(TODO_URL);
    const $ = id => document.getElementById(id);
    const game = $('mj-game'), layer = $('mj-layer'), fileIn = $('mj-file');
    const isPC = () => window.matchMedia('(min-width: 744px)').matches;   // 아이패드 이상: 윈도우 팝업

    let db = normalize({});
    const wins = {};            // 열린 창: id → { el, st }
    let zTop = 1100, opened = 0, pending = 0;
    const localImg = {};         // 방금 올린 사진: 경로 → 미리보기 주소 (사이트 반영 전까지)
    let todos = null, todoErr = '';

    /* ---------------- 이미지 주소 ---------------- */
    const imgSrc = p => localImg[p] || repo.url(p);
    const imgTag = (p, cls) => `<img class="${cls || ''}" src="${esc(imgSrc(p))}" onerror="this.onerror=null;this.src='${esc(repo.rawUrl(p))}'" alt="" loading="lazy">`;
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
    // 방 배경: 거실(모바일/PC 각각) · 침실. 밤(20시)부터 아침(7시)까지는 침실로 시작
    const BGS = [
        { key: 'living', src: () => game.clientWidth < game.clientHeight ? 'minjung/assets/living-mobile.webp' : 'minjung/assets/living-pc.webp' },
        { key: 'bedroom', src: () => 'minjung/assets/bedroom.webp' }
    ];
    const h0 = new Date().getHours();
    let bgIdx = (h0 >= 20 || h0 < 7) ? 1 : 0;
    function drawBgs() {
        $('mj-bgs').innerHTML = BGS.map(b => `<div class="mj-bg mj-bg-${b.key}" style="background-image:url('${b.src()}')"></div>`).join('');
        $('mj-dots').innerHTML = BGS.map((b, i) => `<i class="${i === bgIdx ? 'on' : ''}"></i>`).join('');
        $('mj-bgs').style.transform = `translateX(${-bgIdx * 100}%)`;
    }
    function goBg(i) {
        bgIdx = (i + BGS.length) % BGS.length;
        $('mj-bgs').style.transform = `translateX(${-bgIdx * 100}%)`;
        [...$('mj-dots').children].forEach((d, k) => d.classList.toggle('on', k === bgIdx));
    }
    // 옆으로 밀어서 배경 바꾸기
    let sw = null;
    game.addEventListener('pointerdown', e => {
        if (e.target.closest('button, .mj-nav')) return;
        sw = { x: e.clientX, y: e.clientY };
    });
    game.addEventListener('pointerup', e => {
        if (!sw) return;
        const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) goBg(bgIdx + (dx < 0 ? 1 : -1));
    });
    game.addEventListener('pointercancel', () => { sw = null; });
    $('mj-dots').addEventListener('click', () => goBg(bgIdx + 1));

    function drawDate() {
        const el = $('mj-date');
        if (el) el.textContent = dayTitle(todayKey());
    }
    let shownLine = null, typer = 0;
    function drawScreen() {
        drawDate();
        const hp = db.hp.slice().sort(byNewest)[0];
        $('mj-hp').innerHTML = hearts(hp ? hp.v : 5);
        const line = db.lines.slice().sort(byNewest)[0];
        const text = line ? line.text : '…(대사창을 눌러 속마음을 적어 줘)';
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
    $('mj-dialog').addEventListener('click', () => openWin('lines'));

    // 아래 메뉴(모바일) + 바탕화면 아이콘(PC)
    function drawMenus() {
        $('mj-nav').innerHTML = MAIN.map(id => `<button data-open="${id}"><span class="mj-ico">${iconHtml(id)}</span><span>${WIN[id].title}</span></button>`).join('');
        $('mj-icons').innerHTML = MAIN.map(id => `<button class="mj-file" data-open="${id}"><span class="mj-ico">${iconHtml(id)}</span><span class="mj-file-name">${WIN[id].title}</span></button>`).join('');
    }
    root.addEventListener('click', e => {
        const b = e.target.closest('[data-open]');
        if (b) openWin(b.dataset.open);
    });

    function toast(msg) {
        const t = $('mj-toast');
        t.textContent = msg; t.classList.add('on');
        clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1600);
    }

    /* ---------------- 창 ---------------- */
    function newState(id) {
        const st = { tab: WIN[id].tabs ? WIN[id].tabs[0] : null, date: todayKey(), form: null };
        if (id === 'profile') st.sub = 'book';
        if (id === 'daily') st.sub = 'morning';
        if (id === 'hp' || id === 'lines') st.form = {};
        return st;
    }
    function openWin(id) {
        if (!WIN[id]) return;
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
        if (id === 'diary') loadTodos();
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
    function renderWin(id) {
        const w = wins[id]; if (!w) return;
        const def = WIN[id], st = w.st;
        const body = w.el.querySelector('.mj-win-body');
        const top = body ? body.scrollTop : 0;
        w.el.innerHTML = `
            <div class="mj-win-head" data-drag>
                <button class="mj-badge" ${def.main ? 'data-act="icon" title="아이콘 바꾸기"' : 'tabindex="-1"'}>${iconHtml(id)}</button>
                <div class="mj-title">${def.title}</div>
                <span class="mj-dots3"><i></i><i></i></span>
                <button class="mj-x" data-act="close" aria-label="닫기">${X_SVG}</button>
            </div>
            ${def.tabs ? `<div class="mj-tabs">${def.tabs.map(t => `<button data-act="tab" data-v="${t}" class="${st.tab === t ? 'on' : ''}">${t}</button>`).join('')}</div>` : ''}
            <div class="mj-win-body">${VIEW[id](st)}</div>`;
        w.el.querySelector('.mj-win-body').scrollTop = top;
    }
    // 저장 뒤 다시 그림 (적고 있는 칸이 있는 창은 건드리지 않음)
    function redraw(fromServer) {
        drawScreen();
        drawMenus();
        Object.keys(wins).forEach(id => {
            const st = wins[id].st;
            const typing = wins[id].el.contains(document.activeElement) || st.pedit || (st.form && st.form.id) ||
                (st.form && Object.keys(st.form).length && id !== 'hp' && id !== 'lines');
            if (fromServer && typing) return;
            renderWin(id);
        });
    }

    // 창 안 버튼들
    function bindWin(id) {
        const w = wins[id], el = w.el;
        el.addEventListener('pointerdown', () => focusWin(id));
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
            const b = e.target.closest('[data-act]');
            if (!b || !el.contains(b)) return;
            const st = w.st, act = b.dataset.act, v = b.dataset.v;
            const fresh = () => renderWin(id);
            switch (act) {
                case 'close': closeWin(id); break;
                case 'tab': st.tab = v; st.form = (id === 'hp' || id === 'lines') ? {} : null; st.pedit = false; fresh(); if (v === 'To Do') loadTodos(); break;
                case 'sub': st.sub = v; st.form = null; fresh(); break;
                case 'icon': pickFile(f => setIcon(id, f)); break;
                case 'day': st.date = v === '0' ? todayKey() : shiftDay(st.date, Number(v)); fresh(); break;
                case 'new': st.form = { type: v || null }; fresh(); break;
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
                    const slot = st.sub;
                    const t = prompt(label(BEAUTY_SLOTS, slot) + ' 루틴 단계 (쉼표로 구분)', db.beauty_steps[slot].join(', '));
                    if (t == null) break;
                    const steps = t.split(',').map(s => s.trim()).filter(Boolean);
                    keepForm(id);
                    save('Beauty ' + label(BEAUTY_SLOTS, slot) + ' 루틴', d => { d.beauty_steps[slot] = steps; });
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
                case 'pup': { const r = b.closest('.mj-pf-row'); if (r.previousElementSibling) r.parentElement.insertBefore(r, r.previousElementSibling); break; }
                case 'pdown': { const r = b.closest('.mj-pf-row'); if (r.nextElementSibling) r.parentElement.insertBefore(r.nextElementSibling, r); break; }
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
                case 'todo-toggle': toggleTodo(Number(b.dataset.id)); break;
                case 'todo-open': if (window.loadPageByHash) window.loadPageByHash('todo'); break;
                case 'todo-reload': todos = null; loadTodos(); break;
                case 'soon': toast(v + ' · Coming soon ♡'); break;
            }
        });
        el.addEventListener('change', e => {
            if (e.target.matches('[data-day]') && e.target.value) { w.st.date = e.target.value; renderWin(id); }
        });
    }

    function pickFile(cb) {
        fileIn.value = '';
        fileIn.onchange = () => { const f = fileIn.files && fileIn.files[0]; if (f) cb(f); };
        fileIn.click();
    }
    async function setIcon(id, file) {
        if (!window.ghdb.hasToken()) { alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
        try {
            toast('uploading…');
            const { path, sha } = await uploadImage(file, 'icons', 256, 'image/png');
            const old = db.icons[id];
            const files = {}; files[path] = sha; if (old) files[old] = null;
            save(WIN[id].title + ' 아이콘', d => { d.icons[id] = path; }, files);
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
    const dayNav = st => `
        <div class="mj-day">
            <button data-act="day" data-v="-1">‹</button>
            <input type="date" data-day value="${st.date}">
            <button data-act="day" data-v="1">›</button>
            <button class="today" data-act="day" data-v="0">Today</button>
        </div>`;
    const empty = t => `<p class="mj-empty">${t}</p>`;

    function listOf(id, st) {
        if (id === 'hp') return 'hp';
        if (id === 'lines') return 'lines';
        if (id === 'profile') return 'library';
        if (id === 'condition') return 'condition';
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
        } else if (id === 'profile') {
            if (!f.title) { alert('제목을 적어 주세요.'); return; }
            item = tidy(Object.assign(base, { type: st.form.type || st.sub, title: f.title, status: f.status, rating: f.rating || undefined, url: f.url, memo: f.memo }));
            msg = label(LIB_TYPES, item.type) + ' ' + item.title;
        } else if (id === 'condition') {
            const type = st.form.type;
            const extra = type === 'meal' ? { slot: f.slot, memo: f.memo }
                : type === 'medicine' ? { name: f.name, memo: f.memo }
                : type === 'symptom' ? { tags: f.tags, level: Number(f.level) || undefined, memo: f.memo }
                : { mood: f.mood, memo: f.memo };
            if (type === 'medicine' && !f.name) { alert('약 이름을 적어 주세요.'); return; }
            if (type === 'mood' && !f.mood) { alert('기분을 골라 주세요.'); return; }
            item = tidy(Object.assign(base, { type }, extra));
            msg = label(COND_TYPES, type) + ' ' + when + ' ' + (f.name || (f.tags || []).join(',') || f.slot || f.mood || '');
            st.date = item.date;
        } else if (id === 'daily' && st.tab === 'Beauty') {
            item = tidy(Object.assign(base, { slot: st.form.slot || st.sub, steps: f.steps, memo: f.memo }));
            msg = 'Beauty ' + label(BEAUTY_SLOTS, item.slot) + ' ' + when;
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
            if (!f.title && !f.body) { alert('내용을 적어 주세요.'); return; }
            item = tidy(Object.assign(base, { title: f.title, body: f.body }));
            msg = '일기 ' + when + (item.title ? ' ' + item.title : '');
        }
        st.form = (id === 'hp' || id === 'lines') ? {} : null;
        upsert(list, item, msg);
    }
    function delItem(id, st) {
        const list = listOf(id, st), it = st.form;
        if (!it || !it.id || !confirm('지울까요?')) return;
        const files = {};
        if (list === 'outfit' && it.img) files[it.img] = null;
        st.form = (id === 'hp' || id === 'lines') ? {} : null;
        remove(list, it.id, list + ' 삭제 ' + (it.date || '') + ' ' + (it.time || ''), files);
    }

    /* ---------------- 창 내용 ---------------- */
    const pfRow = r => `
        <div class="mj-pf-row" data-id="${esc(r.id)}">
            <input data-k="label" value="${esc(r.label)}" placeholder="항목">
            <textarea data-k="value" rows="1" placeholder="내용">${esc(r.value)}</textarea>
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
                    <input data-f="memo" placeholder="한 줄 메모 (예: 잠을 못 잠)" value="${esc(it.memo || '')}">
                    ${whenRow(it)}
                    ${it.id ? formBtns(it) : '<div class="mj-btns"><span class="sp"></span><button class="mj-btn" data-act="save">Save</button></div>'}
                </div>
                <div class="mj-log">
                    ${rows.length ? Object.keys(groups).map(k => `
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
                    <textarea data-f="text" rows="3" placeholder="지금 속마음은…">${esc(it.text || '')}</textarea>
                    ${whenRow(it)}
                    ${it.id ? formBtns(it) : '<div class="mj-btns"><span class="sp"></span><button class="mj-btn" data-act="save">Save</button></div>'}
                </div>
                <div class="mj-sec">Backlog</div>
                <div class="mj-log">
                    ${rows.length ? rows.map(r => `
                        <button class="mj-line ${it.id === r.id ? 'sel' : ''}" data-act="edit" data-id="${r.id}">
                            <span class="tm">${dayTitle(r.date)} · ${esc(r.time)}</span>
                            <span class="tx">「${nl(r.text)}」</span>
                        </button>`).join('') : empty('아직 대사가 없어요.')}
                </div>`;
        },
        /* 프로필 + 라이브러리 */
        profile(st) {
            if (st.tab === 'Library') return libraryView(st);
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
        condition(st) {
            if (st.form) return condForm(st);
            const type = st.tab === 'All' ? null : st.tab.toLowerCase();
            const rows = db.condition.filter(x => x.date === st.date && (!type || x.type === type)).sort(byOldest);
            return `
                ${dayNav(st)}
                <div class="mj-newbar">
                    ${type ? `<button class="mj-add" data-act="new" data-v="${type}">+ ${st.tab}</button>` : COND_TYPES.map(([k, l]) => `<button class="mj-add" data-act="new" data-v="${k}">+ ${l}</button>`).join('')}
                </div>
                <div class="mj-log">
                    ${rows.length ? rows.map(r => `
                        <button class="mj-row" data-act="edit" data-id="${r.id}">
                            <span class="tm">${esc(r.time)}</span>
                            ${!type ? `<span class="ty ty-${r.type}">${label(COND_TYPES, r.type)}</span>` : ''}
                            <span class="tx">${condText(r)}</span>
                        </button>`).join('') : empty('이 날은 기록이 없어요.')}
                </div>`;
        },
        /* 자기관리 */
        daily(st) {
            if (st.tab === 'Outfit') return outfitView(st);
            if (st.form) {
                const it = st.form, slot = it.slot || st.sub;
                return `
                    <div class="mj-form mj-card">
                        <div class="mj-sec">${label(BEAUTY_SLOTS, slot)} routine <button class="mj-link" data-act="steps">edit steps</button></div>
                        ${chips('steps', db.beauty_steps[slot].map(s => [s, s]), it.id ? it.steps : [], false)}
                        <textarea data-f="memo" rows="2" placeholder="메모 (쓴 제품, 피부 상태…)">${esc(it.memo || '')}</textarea>
                        ${whenRow(it.id ? it : { date: st.date })}
                        ${formBtns(it)}
                    </div>`;
            }
            const rows = db.beauty.filter(x => x.date === st.date && x.slot === st.sub).sort(byOldest);
            return `
                <div class="mj-subs">${BEAUTY_SLOTS.map(([k, l]) => `<button class="${st.sub === k ? 'on' : ''}" data-act="sub" data-v="${k}">${l}</button>`).join('')}</div>
                ${dayNav(st)}
                <div class="mj-newbar"><button class="mj-add" data-act="new">+ ${label(BEAUTY_SLOTS, st.sub)}</button></div>
                <div class="mj-log">
                    ${rows.length ? rows.map(r => `
                        <button class="mj-row" data-act="edit" data-id="${r.id}">
                            <span class="tm">${esc(r.time)}</span>
                            <span class="tx">${(r.steps || []).map(s => `<em class="mj-tag">${esc(s)}</em>`).join('')} ${esc(r.memo || '')}</span>
                        </button>`).join('') : empty('이 날은 기록이 없어요.')}
                </div>`;
        },
        /* 다이어리 + 투두 */
        diary(st) {
            if (st.tab === 'To Do') return todoView();
            if (st.form) {
                const it = st.form;
                return `
                    <div class="mj-form mj-card">
                        ${whenRow(it)}
                        <input data-f="title" placeholder="제목" value="${esc(it.title || '')}">
                        <textarea data-f="body" rows="12" placeholder="오늘은…">${esc(it.body || '')}</textarea>
                        ${formBtns(it)}
                    </div>`;
            }
            const rows = db.diary.slice().sort(byNewest);
            return `
                <div class="mj-newbar"><button class="mj-add" data-act="new">+ write</button></div>
                <div class="mj-log">
                    ${rows.length ? rows.map(r => `
                        <button class="mj-diary" data-act="edit" data-id="${r.id}">
                            <span class="tm">${dayTitle(r.date)} · ${esc(r.time)}</span>
                            <span class="tt">${esc(r.title || '(제목 없음)')}</span>
                            <span class="tx">${esc((r.body || '').slice(0, 120))}</span>
                        </button>`).join('') : empty('아직 일기가 없어요.')}
                </div>`;
        },
        /* 나머지 메뉴 */
        menu() {
            return `
                <div class="mj-grid">
                    ${SOON.map(([k, l]) => `<button class="mj-tile" data-act="soon" data-v="${l}"><span class="mj-ico">${ICON[k]}</span><span>${l}</span></button>`).join('')}
                </div>
                <p class="mj-empty">coming soon ♡</p>`;
        }
    };

    function condText(r) {
        const memo = r.memo ? ` <span class="memo">${esc(r.memo)}</span>` : '';
        if (r.type === 'meal') return `<b>${label(MEAL_SLOTS, r.slot || '') || ''}</b>${memo}`;
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
            <textarea data-f="memo" rows="2" placeholder="뭐 먹었어?">${esc(it.memo || '')}</textarea>`;
        if (type === 'medicine') {
            const names = [...new Set(db.condition.filter(x => x.type === 'medicine' && x.name).map(x => x.name))];
            fields = `
                <input data-f="name" list="mj-med-names" placeholder="약 이름" value="${esc(it.name || '')}">
                <datalist id="mj-med-names">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
                <textarea data-f="memo" rows="2" placeholder="메모 (몇 알, 왜…)">${esc(it.memo || '')}</textarea>`;
        }
        if (type === 'symptom') fields = `
            ${chips('tags', db.symptom_tags.map(t => [t, t]), it.tags || [], false, '<button class="mj-chip add" data-act="add-tag">+ tag</button>')}
            <div class="mj-sec">level</div>
            ${chips('level', [1, 2, 3, 4, 5].map(n => [String(n), '●'.repeat(n)]), it.level ? String(it.level) : '', true)}
            <textarea data-f="memo" rows="2" placeholder="어디가 어떻게 아파?">${esc(it.memo || '')}</textarea>`;
        if (type === 'mood') fields = `
            ${chips('mood', MOODS.map(([k, e, l]) => [k, `<span class="emo">${e}</span> ${l}`]), it.mood || '', true)}
            <textarea data-f="memo" rows="2" placeholder="왜 그런 기분이야?">${esc(it.memo || '')}</textarea>`;
        return `
            <div class="mj-form mj-card">
                <div class="mj-sec">${label(COND_TYPES, type)}</div>
                ${fields}
                ${whenRow(it.id ? it : { date: st.date })}
                ${formBtns(it)}
            </div>`;
    }
    function guessSlot() { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'night'; }

    function libraryView(st) {
        if (st.form) {
            const it = st.form, type = it.type || st.sub;
            return `
                <div class="mj-form mj-card">
                    <div class="mj-sec">${label(LIB_TYPES, type)}</div>
                    <input data-f="title" placeholder="제목" value="${esc(it.title || '')}">
                    ${type === 'youtube' ? `<input data-f="url" placeholder="유튜브 링크" value="${esc(it.url || '')}">` : ''}
                    ${chips('status', LIB_STATUS, it.status || 'want', true)}
                    <div class="mj-hearts-pick sm" data-hearts="rating" data-v="${it.rating || 0}">${Array.from({ length: 5 }, (_, i) => `<button data-act="heart" data-v="${i + 1}">${pixelHeart(i < (it.rating || 0))}</button>`).join('')}</div>
                    <textarea data-f="memo" rows="3" placeholder="감상, 메모">${esc(it.memo || '')}</textarea>
                    ${whenRow(it)}
                    ${formBtns(it)}
                </div>`;
        }
        const rows = db.library.filter(x => x.type === st.sub).sort(byNewest);
        return `
            <div class="mj-subs">${LIB_TYPES.map(([k, l]) => `<button class="${st.sub === k ? 'on' : ''}" data-act="sub" data-v="${k}">${l}</button>`).join('')}</div>
            <div class="mj-newbar"><button class="mj-add" data-act="new">+ ${label(LIB_TYPES, st.sub)}</button></div>
            <div class="mj-log">
                ${rows.length ? rows.map(r => {
                    const yt = r.type === 'youtube' && ytId(r.url);
                    return `
                    <button class="mj-lib" data-act="edit" data-id="${r.id}">
                        ${yt ? `<img class="thumb" src="https://i.ytimg.com/vi/${yt}/mqdefault.jpg" alt="" loading="lazy">` : ''}
                        <span class="body">
                            <span class="tt">${esc(r.title)} <em class="mj-tag st-${r.status || 'want'}">${label(LIB_STATUS, r.status || 'want')}</em></span>
                            ${r.rating ? `<span class="mj-mini">${hearts(r.rating)}</span>` : ''}
                            ${r.memo ? `<span class="tx">${esc(r.memo)}</span>` : ''}
                            <span class="tm">${dayTitle(r.date)} · ${esc(r.time)}</span>
                        </span>
                    </button>`;
                }).join('') : empty('아직 없어요.')}
            </div>`;
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
                    <textarea data-f="memo" rows="2" placeholder="오늘의 옷 메모">${esc(it.memo || '')}</textarea>
                    ${formBtns(it)}
                </div>`;
        }
        const rows = db.outfit.slice().sort(byNewest);
        return `
            <div class="mj-outfits">
                <button class="mj-outfit add" data-act="pick"><span>+</span></button>
                ${rows.map(r => `
                    <button class="mj-outfit" data-act="edit" data-id="${r.id}">
                        ${imgTag(r.img)}
                        <span class="d">${r.date.slice(5).replace('-', '.')}</span>
                    </button>`).join('')}
            </div>`;
    }

    /* ---------------- 투두 (기존 Todo 카테고리와 같은 파일) ---------------- */
    function todayTodos() {
        const t = todayKey();
        return (todos || []).filter(x => !x.parent_id && (
            (!x.is_completed && (!x.target_date || x.target_date <= t)) ||
            (x.is_completed && (x.completed_date || x.target_date) === t)
        )).sort((a, b) => (a.is_completed - b.is_completed) || ((a.sort_order || 0) - (b.sort_order || 0)));
    }
    function todoView() {
        if (todos === null) return `<p class="mj-empty">${todoErr ? esc(todoErr) + ' <button class="mj-link" data-act="todo-reload">retry</button>' : 'loading…'}</p>`;
        const rows = todayTodos(), left = rows.filter(x => !x.is_completed).length;
        return `
            <div class="mj-sec">Today · ${left} left <button class="mj-link" data-act="todo-reload">↻</button></div>
            <div class="mj-log">
                ${rows.length ? rows.map(x => `
                    <button class="mj-todo ${x.is_completed ? 'done' : ''}" data-act="todo-toggle" data-id="${x.id}">
                        <span class="box">${x.is_completed ? '✓' : ''}</span>
                        <span class="tx">${esc(x.content)}</span>
                        ${x.target_date && x.target_date < todayKey() && !x.is_completed ? `<span class="late">${x.target_date.slice(5).replace('-', '.')}</span>` : ''}
                    </button>`).join('') : empty('오늘 할 일이 없어요 ♡')}
            </div>
            <div class="mj-btns"><span class="sp"></span><button class="mj-btn ghost" data-act="todo-open">Open To Do ›</button></div>`;
    }
    async function loadTodos() {
        if (todos !== null) return;
        todoErr = '';
        const { data, error } = await todoDb.from('todos').select('*').order('created_at', { ascending: true });
        if (error) { todoErr = '투두를 불러오지 못했어요'; todos = null; }
        else todos = data || [];
        if (wins.diary) renderWin('diary');
    }
    async function toggleTodo(tid) {
        const x = (todos || []).find(t => t.id === tid);
        if (!x) return;
        if (!window.ghdb.hasToken()) { alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
        x.is_completed = !x.is_completed;
        x.completed_date = x.is_completed ? todayKey() : null;
        if (Array.isArray(x.subtasks)) x.subtasks.forEach(s => { s.is_completed = x.is_completed; });
        renderWin('diary');
        const { error } = await todoDb.from('todos').update({ is_completed: x.is_completed, completed_date: x.completed_date, subtasks: x.subtasks }).eq('id', tid);
        if (error) { alert('투두를 저장하지 못했어요.\n' + (error.message || error)); todos = null; loadTodos(); }
    }

    /* ---------------- 시작 ---------------- */
    drawBgs();
    drawMenus();
    drawScreen();
    load();

    // 화면 크기가 바뀌면 거실 그림(모바일/PC)을 다시 고름
    let lastPortrait = game.clientWidth < game.clientHeight;
    const onResize = () => {
        if (!root.isConnected) { window.removeEventListener('resize', onResize); return; }
        const p = game.clientWidth < game.clientHeight;
        if (p !== lastPortrait) { lastPortrait = p; drawBgs(); }
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
