/* ==========================================================================
   편지함 — letters/letters.json 을 읽어 보여 주고,
   '오늘 편지 받기' · 답장은 GitHub Actions(.github/workflows/letter.yml)를 실행시킴
   (토큰에 Contents 읽기·쓰기 + Actions 읽기·쓰기 권한 필요)
   ========================================================================== */
const STORE = 'letters/letters.json';
const CONFIG = 'letters/config.json';
const WORKFLOW = '/actions/workflows/letter.yml';
const SLOTS = [['morning', '아침'], ['lunch', '점심'], ['evening', '저녁']];
const WEEK = '일월화수목금토';
const REPLY_MAX = 1000;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const para = s => esc(s).split(/\n{2,}/).map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
const kst = (d = new Date()) => new Date(d.getTime() + (9 * 60 + d.getTimezoneOffset()) * 60000);
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
// 새벽 5시 전은 아직 '어제' 밤 (스크립트와 같은 규칙)
const letterDay = () => ymd(new Date(kst().getTime() - 5 * 3600000));
const today = () => ymd(kst());
const label = k => { const [y, m, d] = k.split('-').map(Number); return m + '월 ' + d + '일 ' + WEEK[new Date(y, m - 1, d).getDay()] + '요일'; };
const hm = iso => (iso || '').slice(11, 16);

export function init() {
    if (window.__ltCleanup) { try { window.__ltCleanup(); } catch (e) {} }
    let alive = true;
    window.__ltCleanup = () => { alive = false; };

    const wrap = document.getElementById('lt-wrap');
    if (!wrap) return;
    const repo = window.ghdb.repo();
    const $ = id => document.getElementById(id);
    let store = { letters: {}, messages: {} };
    let cfg = { character: { name: '토끼', signature: '' }, recipient: '' };
    let shown = null;              // 지금 펼친 편지 날짜
    const busy = { letter: false, reply: false };

    function toast(msg) {
        const t = $('lt-toast'); if (!t) return;
        t.textContent = msg; t.classList.add('on');
        clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2800);
    }
    function canWrite() {
        if (window.ghdb.hasToken()) return true;
        toast('오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요');
        return false;
    }

    async function load() {
        try {
            const [s, c] = await Promise.all([repo.readJSON(STORE, {}), repo.readJSON(CONFIG, null)]);
            store = Object.assign({ letters: {}, messages: {} }, s || {});
            if (c) cfg = c;
        } catch (e) { console.error(e); toast('편지함을 불러오지 못했어요'); }
        if (!alive) return;
        render();
    }

    function render() {
        renderMsgs(); renderLetter(); renderList();
    }

    function renderMsgs() {
        const m = store.messages[today()] || {};
        const got = SLOTS.filter(([k]) => m[k]);
        $('lt-msgs').innerHTML = got.length
            ? got.map(([k, n]) => '<div class="lt-msg"><span class="lt-msg-t">' + n + ' · ' + hm(m[k].at) + '</span><div>' + esc(m[k].text) + '</div></div>').join('')
            : '<div class="lt-msg lt-empty">' + esc(cfg.character.name) + '의 아침 · 점심 · 저녁 메시지가 여기에 와요</div>';
    }

    function renderLetter() {
        const box = $('lt-today');
        const k = shown || letterDay();
        const lt = store.letters[k];
        if (!lt) {
            box.innerHTML = '<div class="lt-env">' +
                '<div class="lt-env-date">' + label(k) + '</div>' +
                '<p class="lt-env-txt">하루를 마치고 자기 전에 눌러 주세요.<br>오늘 남긴 기록을 읽고 ' + esc(cfg.character.name) + '가 편지를 써요.</p>' +
                '<button class="lt-btn" id="lt-ask"' + (busy.letter ? ' disabled' : '') + '>' + (busy.letter ? '편지 쓰는 중…' : '오늘 편지 받기') + '</button></div>';
            $('lt-ask').onclick = askLetter;
            return;
        }
        const replies = lt.replies || [];
        const waiting = replies.length && replies[replies.length - 1].from === 'me';
        box.innerHTML = '<article class="lt-paper">' +
            '<div class="lt-date">' + label(k) + '</div>' +
            '<div class="lt-body">' + para(lt.body) + '</div>' +
            (cfg.character.signature ? '<div class="lt-sign">' + esc(cfg.character.signature) + '</div>' : '') +
            '</article>' +
            '<div class="lt-thread">' + replies.map(r =>
                '<div class="lt-r ' + (r.from === 'me' ? 'me' : 'ai') + '"><span class="lt-r-who">' + esc(r.from === 'me' ? '나' : cfg.character.name) + ' · ' + hm(r.at) + '</span>' + para(r.text) + '</div>').join('') +
            (waiting ? '<div class="lt-r ai lt-wait">' + (busy.reply ? esc(cfg.character.name) + '가 답글 쓰는 중…' : '답글을 기다리는 중 · <button class="lt-link" id="lt-poke">다시 부르기</button>') + '</div>' : '') +
            '</div>' +
            (waiting ? '' : '<div class="lt-write"><textarea id="lt-reply" maxlength="' + REPLY_MAX + '" placeholder="답장 쓰기"></textarea>' +
                '<div class="lt-write-row"><span id="lt-count">0 / ' + REPLY_MAX + '</span><button class="lt-btn" id="lt-send">보내기</button></div></div>');
        if (waiting) { const p = $('lt-poke'); if (p) p.onclick = () => runWorkflow('reply', k); }
        else {
            const ta = $('lt-reply');
            ta.oninput = () => { $('lt-count').textContent = ta.value.length + ' / ' + REPLY_MAX; };
            $('lt-send').onclick = () => sendReply(k, ta.value);
        }
    }

    function renderList() {
        const keys = Object.keys(store.letters).sort().reverse();
        const cur = shown || letterDay();
        $('lt-list').innerHTML = keys.length
            ? keys.map(k => '<button class="lt-item' + (k === cur ? ' on' : '') + '" data-k="' + k + '"><span>' + label(k) + '</span><small>' + esc((store.letters[k].body || '').replace(/\s+/g, ' ').slice(0, 40)) + '…</small></button>').join('')
            : '<div class="lt-empty">아직 받은 편지가 없어요</div>';
        $('lt-list').querySelectorAll('.lt-item').forEach(b => b.onclick = () => {
            shown = b.dataset.k === letterDay() ? null : b.dataset.k;
            render(); $('lt-today').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    async function askLetter() {
        if (busy.letter || !canWrite()) return;
        await runWorkflow('letter', letterDay());
    }

    async function sendReply(k, text) {
        text = (text || '').trim();
        if (!text) return toast('답장을 써 주세요');
        if (!canWrite()) return;
        const r = { from: 'me', text: text.slice(0, REPLY_MAX), at: kst().toISOString().slice(0, 19) + '+09:00' };
        (store.letters[k].replies = store.letters[k].replies || []).push(r);
        busy.reply = true; renderLetter();
        try {
            await repo.commit('letter: 답장', {}, {
                [STORE]: { fallback: {}, mutate: cur => { const lt = cur.letters && cur.letters[k]; if (lt) (lt.replies = lt.replies || []).push(r); return cur; } }
            });
        } catch (e) {
            console.error(e); busy.reply = false; store.letters[k].replies.pop(); renderLetter();
            return toast('답장을 저장하지 못했어요');
        }
        await runWorkflow('reply', k);
    }

    // 워크플로 실행 → 끝날 때까지 기다렸다가 새로 불러옴
    async function runWorkflow(mode, date) {
        const key = mode === 'letter' ? 'letter' : 'reply';
        busy[key] = true; renderLetter();
        const since = Date.now() - 5000;
        try {
            await repo.api(WORKFLOW + '/dispatches', { method: 'POST', body: { ref: 'main', inputs: { mode, date } } });
        } catch (e) {
            busy[key] = false; renderLetter();
            return toast(e.status === 403 || e.status === 404 ? '토큰에 Actions 읽기·쓰기 권한을 켜 주세요' : '시작하지 못했어요');
        }
        toast(mode === 'letter' ? cfg.character.name + '가 편지를 쓰고 있어요…' : '답장을 보냈어요');
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 10000));
            if (!alive) return;
            let run = null;
            try { const j = await repo.api(WORKFLOW + '/runs?event=workflow_dispatch&per_page=3'); run = (j.workflow_runs || []).find(x => new Date(x.created_at).getTime() >= since); } catch (e) {}
            if (!run || run.status !== 'completed') continue;
            busy[key] = false;
            if (run.conclusion !== 'success') { renderLetter(); return toast('실패했어요. GitHub Actions 기록을 확인해 주세요'); }
            await load();
            return toast(mode === 'letter' ? '편지가 도착했어요' : '답글이 왔어요');
        }
        busy[key] = false; renderLetter();
        toast('아직 쓰는 중이에요. 잠시 뒤 다시 열어 주세요');
    }

    load();
}
