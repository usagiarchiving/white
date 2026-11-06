// ==========================================
// parser.js
// 신규 텍스트 파싱 엔진 (Javier & Ines 연동)
// ==========================================

// --------------------------------------------
// Apogee 상태창 렌더러 (JSX 속성 → 정적 HTML)
// --------------------------------------------
const APOGEE_CSS = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
  .apl{--bg:#0e0b07;--bg2:#141009;--card:#1b1811;--card2:#201c14;--line:#4a4436;--line2:#2c2820;--line3:#6b6250;
    --acc:#dfb840;--acc2:#f0cc55;--ink:#fdf6e6;--ink2:#ded9cc;--ink3:#cdc7b8;--soft:#f2e2b8;--mute:#9d9686;--red:#a33636;
    max-width:440px;margin:0 auto;box-sizing:border-box;font-family:'Pretendard Variable',Pretendard,'Malgun Gothic',sans-serif;
    font-size:12px;color:var(--ink2);background:var(--bg);border:1px solid #575044;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.7);
    word-break:keep-all;overflow-wrap:break-word;text-align:left;letter-spacing:0;line-height:normal}
  .apl *{box-sizing:border-box}
  .apl-tag{display:inline-block;background:var(--acc);color:#14100a;font-weight:800;font-size:9.5px;letter-spacing:2px;padding:5px 11px}
  .apl-head{background:linear-gradient(165deg,#1a1409 0%,var(--bg) 70%);padding:18px 16px;border-bottom:1px solid var(--line)}
  .apl-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
  .apl-hq{font-size:9px;letter-spacing:2px;color:var(--mute)}
  .apl-card{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--acc);padding:15px 16px}
  .apl-rel{display:inline-block;background:var(--acc);color:#14100a;font-size:10px;font-weight:800;padding:3px 9px;margin-bottom:9px}
  .apl-names{font-weight:800;font-size:19px;color:var(--ink);letter-spacing:-.3px;margin-bottom:6px}
  .apl-names span{color:var(--acc);font-weight:400;margin:0 4px}
  .apl-meta{font-size:11px;color:var(--mute);font-weight:500}
  .apl-toggle{display:block;width:100%;border:0;background:var(--acc);color:#14100a;text-align:center;padding:11px;font-weight:800;letter-spacing:3px;font-size:11px;cursor:pointer;font-family:inherit}
  .apl-sec{padding:18px 16px;border-top:1px solid var(--line2)}
  .apl-sec.a{background:#100c07}.apl-sec.b{background:var(--bg2)}
  .apl-sec .apl-tag{margin-bottom:13px}
  .apl-row{display:flex;gap:7px}
  .apl-stat{flex:1;background:var(--card);border:1px solid var(--line);padding:11px 4px;text-align:center}
  .apl-stat-l{font-size:8.5px;font-weight:700;letter-spacing:1.5px;color:var(--mute)}
  .apl-stat-v{font-weight:800;font-size:18px;color:var(--ink);margin-top:5px}
  .apl-stat-v.g{color:var(--acc)}
  .apl-aff{background:#221c12;border:1px solid var(--line3);padding:11px 14px;margin-top:7px}
  .apl-aff-top{display:flex;justify-content:space-between;align-items:center}
  .apl-aff-l{font-size:9px;font-weight:700;letter-spacing:2px;color:#a89467}
  .apl-aff-v{font-weight:800;font-size:13px;color:var(--acc2)}
  .apl-bar{height:4px;background:#2b2519;margin-top:8px}
  .apl-bar i{display:block;height:100%;background:linear-gradient(90deg,#a8862a,var(--acc2))}
  .apl-who{flex:1;min-width:0;background:var(--card2);border:1px solid var(--line);border-top:2px solid var(--acc);padding:12px 11px}
  .apl-who.pc{border-top-color:#827d70}
  .apl-who-n{text-align:center;font-weight:800;font-size:12.5px;color:var(--acc);margin-bottom:6px}
  .apl-who.pc .apl-who-n{color:#e8ddc4}
  .apl-kao{text-align:center;font-family:sans-serif;font-size:15px;color:var(--soft);border-bottom:1px solid var(--line);padding-bottom:9px;margin-bottom:9px;overflow-wrap:anywhere}
  .apl-k{font-size:9px;font-weight:700;color:var(--mute);letter-spacing:1.5px}
  .apl-v{font-size:11.5px;font-weight:500;line-height:1.55;margin:2px 0 8px}
  .apl-v:last-child{margin-bottom:0}
  .apl-mind{background:var(--card2);border:1px solid var(--line);border-left:3px solid var(--acc);padding:13px 14px;font-size:12.5px;line-height:1.75;color:var(--soft);font-style:italic}
  .apl-nsfw{background:var(--card2);border:1px solid var(--line3);padding:11px 13px;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}
  .apl-nk{font-size:8.5px;letter-spacing:1.5px;color:var(--mute);font-weight:700;margin-right:5px}
  .apl-nv{font-weight:800;font-size:12px;color:var(--soft)}
  .apl-nv.g{color:var(--acc)}
  .apl-pill{font-weight:800;font-size:10px;letter-spacing:1px;padding:2px 9px;border:1px solid var(--line3);color:var(--mute)}
  .apl-pill.on{border-color:var(--acc);color:var(--acc);background:rgba(223,184,64,.08)}
  .apl-sfw{font-size:11px;color:var(--mute);letter-spacing:2px;font-weight:700}
  .apl-tabs{display:flex;gap:3px;border-bottom:1px solid var(--line3)}
  .apl-tab{text-align:center;user-select:none;flex:1 1 0;min-width:0;border:1px solid var(--line);border-bottom:0;background:var(--card);color:var(--mute);font-family:inherit;font-weight:800;font-size:10.5px;letter-spacing:2px;padding:8px 4px;cursor:pointer;position:relative;top:1px}
  .apl-panel{background:var(--card);border:1px solid var(--line3);border-top:0;padding:14px;line-height:1.7;min-height:96px}
  .apl-chip{display:inline-block;background:#2b2519;border:1px solid var(--line3);color:var(--acc);font-size:9px;font-weight:800;letter-spacing:1px;padding:2px 7px;margin-right:7px}
  .apl-line{margin-bottom:8px}
  .apl-dash{border-top:1px dashed #575044;margin:11px 0}
  .apl-num{display:flex;gap:8px;padding:3px 0}
  .apl-num b{color:var(--acc);font-size:11px;flex-shrink:0}
  .apl-comm-t{font-weight:800;font-size:13.5px;line-height:1.5;color:var(--ink);margin:8px 0 10px}
  .apl-cmt{border-top:1px dashed #575044;padding:9px 0 0;margin-top:9px}
  .apl-cmt-h{font-size:9.5px;color:var(--acc);letter-spacing:.5px;font-weight:700;margin-bottom:2px}
  .apl-cmt-b{font-size:11.5px;color:var(--ink3)}
  .apl-red{display:inline-block;background:var(--red);color:var(--ink);font-size:9px;font-weight:800;letter-spacing:1px;padding:2px 8px}
  .apl-q{font-size:11.5px;color:var(--mute);margin-bottom:8px}
  .apl-q b{color:var(--acc);margin-right:6px}
  .apl-a{font-size:12.5px;color:var(--soft);font-weight:600}
  .apl-a b{color:var(--acc);margin-right:6px;font-style:normal}
  .apl-atr{font-size:11.5px;color:var(--mute);margin-top:4px;padding-left:22px}
  .apl-empty{color:#6e6a5c}
  .apl-foot{background:#0a0805;border-top:1px solid var(--line);padding:11px 16px;display:flex;justify-content:space-between;align-items:center;font-size:9px;font-weight:700;letter-spacing:1.5px;color:#6e6a5c}
  .apl-foot span:last-child{color:var(--mute)}
  /* 토글(details) / 탭(radio+label): JS 없이 동작 */
  .apl-det>summary{list-style:none}
  .apl-det>summary::-webkit-details-marker{display:none}
  .apl .lo{display:none}
  .apl-det[open] .lo{display:inline}
  .apl-det[open] .lc{display:none}
  .apl-r{display:none}
  .apl .pn{display:none}
`;

let apogeeSeq = 0;

const APOGEE_TABS = [
    ['schedule', 'SCH'], ['promise', 'PRM'], ['tmi', 'TMI'],
    ['community', 'COM'], ['interview', 'INT']
];

function apogeeEscapeHtml(value) {
    const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return String(value == null ? '' : value)
        .replace(/[&<>"']/g, function (ch) { return entities[ch]; });
}

function apogeeToHtml(p) {
    const uid = 'apl' + Date.now().toString(36) + (++apogeeSeq);
    const g = function (k) { return p[k] == null ? '' : String(p[k]); };
    const esc = apogeeEscapeHtml;
    const nl = function (s) {
        return String(s || '')
            .replace(/&#10;|&#x0*a;/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/\\n/g, '\n');
    };
    const lines = function (s) {
        return nl(s).split(/\r?\n/).map(function (v) { return v.trim(); }).filter(Boolean);
    };
    const v = function (s) { return s ? esc(s) : '<span class="apl-empty">-</span>'; };
    const aff = parseInt(g('affection').replace(/[^0-9-]/g, ''), 10);
    const affPct = isNaN(aff) ? null : Math.max(0, Math.min(100, aff));
    const condomOn = /^(착용|on|true|1|o|yes)$/i.test(g('condom').trim());
    const sfw = !g('sexPosition') || /^(n\/?a|-|없음|sfw)$/i.test(g('sexPosition').trim());
    const wants = lines(g('npcWants')).slice(0, 3);
    const promiseList = lines(g('promises'));
    const comments = nl(g('communityComments'))
        .split(/\n\s*\n/)
        .map(function (b) { return b.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); })
        .filter(function (b) { return b.length; })
        .map(function (b) { return { head: b.length > 1 ? b[0] : '', body: (b.length > 1 ? b.slice(1) : b).join(' ') }; });
    const meta = [g('date'), g('time'), g('location'), g('temperature'), g('weather')].filter(Boolean).join(' · ');
    const npc = g('npc') || 'NPC';
    const pc = g('pc') || 'YOU';
    const num = function (i) { return '0' + (i + 1); };
    const tabCss = APOGEE_TABS.map(function (t) {
        const k = t[0];
        return '.apl-r.r-' + k + ':checked~.apl-panel .pn-' + k + '{display:block}' +
            '.apl-r.r-' + k + ':checked~.apl-tabs .tb-' + k + '{background:var(--acc);border-color:var(--acc);color:#14100a}';
    }).join('');
    const tabBtns = APOGEE_TABS.map(function (t) {
        return '<label for="' + uid + '-' + t[0] + '" class="apl-tab tb-' + t[0] + '">' + t[1] + '</label>';
    }).join('');
    const radios = APOGEE_TABS.map(function (t, i) {
        return '<input type="radio" name="' + uid + '" id="' + uid + '-' + t[0] + '" class="apl-r r-' + t[0] + '"' + (i === 0 ? ' checked' : '') + '>';
    }).join('');
    const nsfwInner = sfw
        ? '<div class="apl-nsfw"><span class="apl-sfw">N/A · SFW</span></div>'
        : '<div class="apl-nsfw">' +
        '<span><span class="apl-nk">POS</span><span class="apl-nv">' + esc(g('sexPosition')) + '</span></span>' +
        '<span><span class="apl-nk">CONDOM</span><span class="apl-pill' + (condomOn ? ' on' : '') + '">' + (condomOn ? 'ON' : 'OFF') + '</span></span>' +
        '<span><span class="apl-nk">' + esc(npc) + '</span><span class="apl-nv g">' + esc(g('npcClimax') || '0') + '</span></span>' +
        '<span><span class="apl-nk">' + esc(pc) + '</span><span class="apl-nv g">' + esc(g('pcClimax') || '0') + '</span></span>' +
        '</div>';
    const panelSchedule =
        '<div class="pn pn-schedule">' +
        '<div class="apl-line"><span class="apl-chip">NOW</span>' + v(g('scheduleNow')) + '</div>' +
        '<div class="apl-line"><span class="apl-chip">NEXT</span>' + v(g('scheduleNext')) + '</div>' +
        '<div class="apl-dash"></div><div class="apl-k" style="margin-bottom:4px">DESIRE</div>' +
        (wants.length ? wants.map(function (w, i) {
            return '<div class="apl-num"><b>' + num(i) + '</b><span>' + esc(w) + '</span></div>';
        }).join('') : '<span class="apl-empty">-</span>') +
        '</div>';
    const panelPromise =
        '<div class="pn pn-promise">' +
        (promiseList.length ? promiseList.map(function (x, i) {
            return '<div class="apl-num"><b>' + num(i) + '</b><span style="color:var(--soft);font-weight:600">' + esc(x) + '</span></div>';
        }).join('') : '<span class="apl-empty">아직 맺은 약속이 없다.</span>') +
        '</div>';
    const panelTmi =
        '<div class="pn pn-tmi"><div style="color:var(--ink3)">' + v(nl(g('tmi'))) + '</div></div>';
    const panelCommunity =
        '<div class="pn pn-community"><span class="apl-red">BABYLON</span>' +
        '<div class="apl-comm-t">' + esc(g('communityTitle') || '-') + '</div>' +
        comments.map(function (c) {
            return '<div class="apl-cmt">' +
                (c.head ? '<div class="apl-cmt-h">' + esc(c.head) + '</div>' : '') +
                '<div class="apl-cmt-b">' + esc(c.body) + '</div></div>';
        }).join('') +
        '</div>';
    const panelInterview =
        '<div class="pn pn-interview">' +
        '<div class="apl-q"><b>Q.</b>' + esc(g('interviewQ') || '-') + '</div>' +
        '<div class="apl-a"><b>A.</b>' + esc(g('interviewA') || '-') + '</div>' +
        (g('interviewATr') ? '<div class="apl-atr">(' + esc(g('interviewATr')) + ')</div>' : '') +
        '</div>';
    return '<style>' + APOGEE_CSS + tabCss + '</style>' +
        '<div class="apl">' +
        '<div class="apl-head">' +
        '<div class="apl-top"><span class="apl-tag">APOGEE</span><span class="apl-hq">INTERNAL LEDGER</span></div>' +
        '<div class="apl-card">' +
        (g('relation') ? '<div class="apl-rel">' + esc(g('relation')) + '</div>' : '') +
        '<div class="apl-names">' + esc(npc) + '<span>⨯</span>' + esc(pc) + '</div>' +
        '<div class="apl-meta">' + esc(meta) + '</div>' +
        '</div></div>' +
        '<details class="apl-det"><summary class="apl-toggle">' +
        '<span class="lc">▼ OPEN FULL LEDGER</span><span class="lo">▲ CLOSE LEDGER</span></summary>' +
        '<div class="apl-full">' +
        '<div class="apl-sec a"><div class="apl-tag">STATUS</div>' +
        '<div class="apl-row">' +
        '<div class="apl-stat"><div class="apl-stat-l">DAYS MET</div><div class="apl-stat-v">' + esc(g('daysMet') || '-') + '</div></div>' +
        '<div class="apl-stat"><div class="apl-stat-l">TOGETHER</div><div class="apl-stat-v g">' + esc(g('daysTogether') || '-') + '</div></div>' +
        '</div>' +
        '<div class="apl-aff"><div class="apl-aff-top"><span class="apl-aff-l">SENTIMENT</span><span class="apl-aff-v">' + esc(g('affection') || '-') + '</span></div>' +
        (affPct !== null ? '<div class="apl-bar"><i style="width:' + affPct + '%"></i></div>' : '') +
        '</div></div>' +
        '<div class="apl-sec b"><div class="apl-tag">PRESENT</div>' +
        '<div class="apl-row" style="gap:9px">' +
        '<div class="apl-who"><div class="apl-who-n">' + esc(npc) + '</div><div class="apl-kao">' + esc(g('npcKaomoji') || '-') + '</div>' +
        '<div class="apl-k">OUTFIT</div><div class="apl-v">' + v(g('npcOutfit')) + '</div>' +
        '<div class="apl-k">POSE</div><div class="apl-v">' + v(g('npcPose')) + '</div></div>' +
        '<div class="apl-who pc"><div class="apl-who-n">' + esc(pc) + '</div><div class="apl-kao">' + esc(g('pcKaomoji') || '-') + '</div>' +
        '<div class="apl-k">OUTFIT</div><div class="apl-v">' + v(g('pcOutfit')) + '</div>' +
        '<div class="apl-k">POSE</div><div class="apl-v">' + v(g('pcPose')) + '</div></div>' +
        '</div></div>' +
        '<div class="apl-sec a"><div class="apl-tag">INNER VOICE</div>' +
        '<div class="apl-mind">"' + esc(nl(g('npcMind')) || '...') + '"</div></div>' +
        '<div class="apl-sec b" style="background:linear-gradient(180deg,#160f08 0%,#0e0b07 100%)">' +
        '<div class="apl-tag" style="background:#a8862a;color:#fdf6e6">NSFW</div>' + nsfwInner + '</div>' +
        '<div class="apl-sec a">' + radios + '<div class="apl-tabs">' + tabBtns + '</div>' +
        '<div class="apl-panel">' + panelSchedule + panelPromise + panelTmi + panelCommunity + panelInterview + '</div></div>' +
        '<div class="apl-foot"><span>FULCRUM · A.D. 2320</span><span>◆ APOGEE INTERNAL</span></div>' +
        '</div></details></div>';
}

window.apogeeToHtml = apogeeToHtml;

// --------------------------------------------
// 마크다운 파서
// --------------------------------------------
function parseAdvancedMarkdown(text) {
    if (!text) return text;
    let hlColorEl = document.getElementById('highlightColor');
    let hlColor = hlColorEl ? hlColorEl.value : '#C4F0E9';
    let t = text;
    t = t.replace(/~~([^~]+)~~/g, '<s style="text-decoration: line-through;">$1</s>');
    t = t.replace(/\+\+([^+]+)\+\+/g, '<u style="text-decoration: underline;">$1</u>');
    t = t.replace(/==([^=]+)==/g, `<mark style="background-color: ${hlColor}; color: inherit; padding: 0 2px; border-radius: 2px;">$1</mark>`);
    return t;
}


// --------------------------------------------
// 벌크 입력 파서
// 본문: 한 줄 = 한 블록. 이전 블록에 병합하지 않음.
// --------------------------------------------
function parseBulkInput() {
    try {
        const bulkInput = document.getElementById('bulkInput');
        if (!bulkInput) return;

        let text = bulkInput.value;
        if (!text.trim()) return;

        const imgMap = {
            lowrider: 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2F1fc8d042-14e3-45e4-af75-03000fe8426a.webp?alt=media&token=e5d95796-8458-45ff-8f1b-3a5dfa10ea9d&v=1793377073787',
            tattoo: 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2F4eed3b00-e45d-4f18-b496-3093d6fd89cd.webp?alt=media&token=fbcd8340-7571-43e6-9e7a-801118dfe3dd&v=1793377073946'
        };

        // 성공적으로 파싱한 뒤 기존 blocks에 추가.
        const parsedBlocks = [];

        let statusBuffer = [];
        let codeBuffer = [];
        let isCodeBlock = false;

        function flushStatus() {
            if (!statusBuffer.length) return;

            parsedBlocks.push({
                type: 'status',
                content: statusBuffer.join('\n')
            });

            statusBuffer = [];
        }

        // 판별용 텍스트에서 줄 양 끝의 마크다운 강조 기호 제거.
        // **"대사", (번역)**, **_문장_** 형식도 판별 가능.
        function stripEdgeMarkers(value) {
            return value.trim()
                .replace(/^[*_]+/, '')
                .replace(/[*_]+$/, '')
                .trim();
        }

        function parseBodyLine(line) {
            const original = line.trim();
            if (!original) return;

            const plain = stripEdgeMarkers(original);
            if (!plain) return;

            const mdImgMatch = original.match(/^!\[.*?\]\((.*?)\)$/);
            if (mdImgMatch) {
                flushStatus();
                parsedBlocks.push({
                    type: 'image',
                    content: mdImgMatch[1].trim()
                });
                return;
            }

            const imgMatch = original.match(/\{\{img::([^}]+)\}\}/);
            if (imgMatch) {
                flushStatus();

                const url = imgMap[imgMatch[1].trim()];
                if (url) {
                    parsedBlocks.push({
                        type: 'image',
                        content: url
                    });
                }
                return;
            }

            if (
                original === '---' ||
                original === '***' ||
                original.startsWith('구분선:')
            ) {
                flushStatus();
                parsedBlocks.push({
                    type: 'divider',
                    content: 'solid-gray'
                });
                return;
            }

            // 기존 이모지 상태창만 묶음 유지.
            const isEmojiStart =
                /^(🗓|💍|📍|👕|👥|💭|🔔|🚨|💕|❤|🔥|🔫|✏|📰|💘)/.test(plain);

            if (isEmojiStart) {
                if (plain.startsWith('🗓')) flushStatus();
                statusBuffer.push(plain);
                return;
            }

            flushStatus();

            // 이름 | "대사"
            // 이름과 대사에 각각 **가 붙은 경우도 판별.
            const named = plain.match(/^(.+?)\s*[|｜│]\s*(.+)$/);

            if (named) {
                const rawName = stripEdgeMarkers(named[1]);
                const dialogue = stripEdgeMarkers(named[2]);

                if (/^["“]/.test(dialogue)) {
                    let type = 'custom';

                    if (/javier|하비에르/i.test(rawName)) {
                        type = 'javier';
                    } else if (/ines|이네스/i.test(rawName)) {
                        type = 'ines';
                    }

                    parsedBlocks.push({
                        type: type,
                        content: rawName + ' | ' + dialogue,
                        customName: type === 'custom' ? rawName : '',
                        customTextColor: '#8e8e93',
                        customBgColor: '#E2E8F0'
                    });
                    return;
                }
            }

            // 이름 없는 대사: **"대사"** 형식 포함.
            // 이전 줄과 합치지 않고 매번 새 블록 생성.
            if (/^["“]/.test(plain)) {
                parsedBlocks.push({
                    type: 'javier',
                    content: plain
                });
                return;
            }

            // 번역도 별도 블록.
            // 직전 대사의 캐릭터 타입/설정만 이어받고 내용은 합치지 않음.
            const isTranslation =
                /^\([\s\S]*\)$/.test(plain) ||
                /^（[\s\S]*）$/.test(plain);

            if (isTranslation) {
                const previous = parsedBlocks[parsedBlocks.length - 1];

                if (
                    previous &&
                    ['javier', 'ines', 'mob', 'custom'].includes(previous.type)
                ) {
                    parsedBlocks.push({
                        type: previous.type,
                        content: plain,
                        customName: previous.customName || '',
                        customTextColor: previous.customTextColor || '#8e8e93',
                        customBgColor: previous.customBgColor || '#E2E8F0',
                        customProfileUrl: previous.customProfileUrl || ''
                    });
                    return;
                }
            }

            // 나레이션: 무조건 새 블록.
            // 완결된 **볼드**는 유지하고 바깥 _만 제거.
            let narration = original;

            const boldUnderscore = original.match(/^\*\*_([\s\S]+)_\*\*$/);
            const underscore = original.match(/^_([^_][\s\S]*?)_$/);

            if (boldUnderscore) {
                narration = '**' + boldUnderscore[1].trim() + '**';
            } else if (underscore) {
                narration = underscore[1].trim();
            } else if (
                !/^\*\*[\s\S]+\*\*$/.test(original) &&
                /^[*_]|[*_]$/.test(original)
            ) {
                // 여러 줄을 통째로 감싼 강조 기호의 남은 조각 제거.
                narration = plain;
            }

            parsedBlocks.push({
                type: 'narration',
                content: narration
            });
        }

        // 코드블록 밖에서만 Apogee 태그를 임시 보관.
        // 속성 내부 줄바꿈과 <br>는 본문 분리 대상에서 제외.
        const apogeeBlocks = [];
        let protectingCode = false;
        const tokenPrefix =
            '@@APOGEE_' + Date.now().toString(36) + '_';

        text = text.replace(
            /^[ \t]*```[^\r\n]*|<Apogee\b((?:\s+[\w-]+\s*=\s*"[^"]*")*)\s*\/?>/gim,
            function (match, attrsText) {
                if (/^[ \t]*```/.test(match)) {
                    protectingCode = !protectingCode;
                    return match;
                }

                if (protectingCode) return match;

                const attrs = Object.create(null);

                attrsText.replace(
                    /([\w-]+)\s*=\s*"([^"]*)"/g,
                    function (_, key, value) {
                        attrs[key] = value;
                        return _;
                    }
                );

                const index = apogeeBlocks.length;
                apogeeBlocks.push(attrs);

                return '\n' + tokenPrefix + index + '@@\n';
            }
        );

        const sourceLines = text.replace(/\r\n?/g, '\n').split('\n');

        sourceLines.forEach(function (line) {
            const trimmed = line.trim();

            if (trimmed.startsWith('```')) {
                if (isCodeBlock) {
                    parsedBlocks.push({
                        type: 'html',
                        content: codeBuffer.join('\n')
                    });

                    codeBuffer = [];
                    isCodeBlock = false;
                } else {
                    flushStatus();
                    isCodeBlock = true;
                    codeBuffer = [];
                }
                return;
            }

            // HTML 코드 내부의 <br>나 줄바꿈은 그대로 유지.
            if (isCodeBlock) {
                codeBuffer.push(line);
                return;
            }

            if (
                trimmed.startsWith(tokenPrefix) &&
                trimmed.endsWith('@@')
            ) {
                const indexText = trimmed.slice(tokenPrefix.length, -2);

                if (/^\d+$/.test(indexText)) {
                    const attrs = apogeeBlocks[Number(indexText)];

                    if (attrs) {
                        flushStatus();

                        if (typeof window.apogeeToHtml !== 'function') {
                            throw new Error('Apogee 렌더러가 없습니다.');
                        }

                        parsedBlocks.push({
                            type: 'html',
                            content: window.apogeeToHtml(attrs)
                        });
                        return;
                    }
                }
            }

            // 실제 줄바꿈은 이미 sourceLines에서 분리됨.
            // <br>, <br/>, <br />도 각각 새 블록 경계로 처리.
            line.split(/<br\s*\/?>/gi).forEach(parseBodyLine);
        });

        flushStatus();

        if (isCodeBlock && codeBuffer.length) {
            parsedBlocks.push({
                type: 'html',
                content: codeBuffer.join('\n')
            });
        }

        parsedBlocks.forEach(function (block) {
            blocks.push(block);
        });

        if (typeof renderEditor === 'function') renderEditor();
        if (typeof saveState === 'function') saveState();

        bulkInput.value = '';
    } catch (e) {
        console.error(e);
    }
}