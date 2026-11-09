// ==========================================
// parser.js
// script.js / render.js 뒤에 로드
// 기존 autoparse.js는 함께 로드하지 않음.
//
// 본문:
// - 한 줄 = 한 블록
// - 대사 바로 다음 괄호 번역만 같은 대사 블록에 병합
// - <br>, <br/>, <br />는 본문 줄바꿈
//
// 보호:
// - Apogee 속성 내부 줄바꿈
// - fenced HTML 코드블록 내부 줄바꿈
//
// 외부 의존성:
// - blocks 배열
// - renderEditor()
// - saveState() (있으면 사용)
// - showToast() (있으면 사용)
//
// Apogee 변환 함수 / 디자인 / 자동 이미지는 이 파일에 포함.
// ==========================================

(function () {
    'use strict';

    // ==========================================
    // 공통
    // ==========================================

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function notify(message) {
        if (typeof showToast === 'function') {
            showToast(message);
        } else {
            console.warn('[parser.js]', message);
        }
    }

    function getValue(id) {
        const element = document.getElementById(id);
        return element ? String(element.value || '').trim() : '';
    }

    function makeBlock(type, content, extra) {
        return Object.assign({
            type: type,
            content: String(content == null ? '' : content),
            customTextColor: '#8e8e93',
            customBgColor: '#E2E8F0',
            customName: '',
            customProfileUrl: '',
            bgmTitle: '',
            bgmUrl: '',
            polaroidDate: '',
            polaroidCaption: ''
        }, extra || {});
    }

    const DIALOGUE_TYPES = new Set([
        'javier',
        'ines',
        'mob',
        'custom'
    ]);

    // ==========================================
    // 자동 이미지 7개
    // ==========================================

    const IMAGE_BASE =
        'https://firebasestorage.googleapis.com/v0/b/' +
        'chat-ai-7a275.firebasestorage.app/o/' +
        'users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2F' +
        'character_images%2Fcircumstances%2F';

    const AUTO_IMAGES = Object.freeze({
        lowrider:
            IMAGE_BASE +
            '1fc8d042-14e3-45e4-af75-03000fe8426a.webp' +
            '?alt=media&token=e5d95796-8458-45ff-8f1b-3a5dfa10ea9d' +
            '&v=1793377073787',

        peek:
            IMAGE_BASE +
            'c91c63c9-8f91-477a-8800-4bb4816d43d7.webp' +
            '?alt=media&token=0565f751-1a1d-4276-8c28-f373b55cf7bd' +
            '&v=1793377073573',

        cold:
            IMAGE_BASE +
            'b5693ccc-eb98-4929-9941-ce79e0b1a218.webp' +
            '?alt=media&token=aa915222-668b-4cbc-acaa-108911a1568b' +
            '&v=1793377073573',

        poker:
            IMAGE_BASE +
            'c9426974-fc2d-4e32-8c2d-87f0b380d647.webp' +
            '?alt=media&token=5816dd13-0b06-4062-9629-396b0a4ea8df' +
            '&v=1793377073936',

        chip:
            IMAGE_BASE +
            'ca627f84-71c5-499d-8e92-215261da2600.webp' +
            '?alt=media&token=abd31c93-536e-4358-84e9-0edb847b77fe' +
            '&v=1793377073738',

        tattoo:
            IMAGE_BASE +
            '4eed3b00-e45d-4f18-b496-3093d6fd89cd.webp' +
            '?alt=media&token=fbcd8340-7571-43e6-9e7a-801118dfe3dd' +
            '&v=1793377073946',

        altar:
            IMAGE_BASE +
            '29541315-c8e7-4551-b401-910fcc3ecd8c.webp' +
            '?alt=media&token=6e8d5019-1601-49c9-88f0-379785715ac5' +
            '&v=1793377073872',
        
        morning:
            IMAGE_BASE +
            'e08aea9b-0727-4d82-b7ae-4d9bcf71fd24.webp' +
            '?alt=media&token=ae713ee2-3262-48f1-8d8b-dbcd30113ae8' +
            '&v=1793377073623',

        whiskey:
            IMAGE_BASE +
            'b402d310-5a9d-4455-be04-336aa3a09df6.webp' +
            '?alt=media&token=da6a0001-ed51-4018-956b-c75014c47256' +
            '&v=1793377073777'
    });

    // ==========================================
    // Apogee 디자인
    // ==========================================

    const APOGEE_CSS = `
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');

.apl{
    --bg:#0e0b07;--bg2:#141009;--card:#1b1811;--card2:#201c14;
    --line:#4a4436;--line2:#2c2820;--line3:#6b6250;
    --acc:#dfb840;--acc2:#f0cc55;
    --ink:#fdf6e6;--ink2:#ded9cc;--ink3:#cdc7b8;
    --soft:#f2e2b8;--mute:#9d9686;--red:#a33636;
    width:100%;max-width:440px;margin:0 auto;box-sizing:border-box;
    font-family:'Pretendard Variable',Pretendard,'Malgun Gothic',sans-serif;
    font-size:12px;color:var(--ink2);background:var(--bg);
    border:1px solid #575044;overflow:hidden;
    box-shadow:0 10px 30px rgba(0,0,0,.7);
    word-break:keep-all;overflow-wrap:break-word;
    text-align:left;letter-spacing:0;line-height:normal;
    font-style:normal;font-weight:normal
}
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
.apl-sec.a{background:#100c07}
.apl-sec.b{background:var(--bg2)}
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
.apl-det>summary{list-style:none}
.apl-det>summary::-webkit-details-marker{display:none}
.apl .lo{display:none}
.apl-det[open] .lo{display:inline}
.apl-det[open] .lc{display:none}
.apl .apl-r{display:none}
.apl .pn{display:none}
`;

    const APOGEE_TABS = [
        ['schedule', 'SCH'],
        ['promise', 'PRM'],
        ['tmi', 'TMI'],
        ['community', 'COM'],
        ['interview', 'INT']
    ];

    let apogeeSequence = 0;

    function apogeeNewlines(value) {
        return String(value == null ? '' : value)
            .replace(/\r\n?/g, '\n')
            .replace(/&#10;|&#x0*a;/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/\\n/g, '\n');
    }

    function apogeeToHtml(attributes) {
        const p = attributes || {};

        const uid =
            'apl-' +
            Date.now().toString(36) + '-' +
            (++apogeeSequence).toString(36) + '-' +
            Math.random().toString(36).slice(2, 8);

        const g = function (key) {
            return p[key] == null ? '' : String(p[key]);
        };

        const textHtml = function (value) {
            return esc(apogeeNewlines(value)).replace(/\n/g, '<br>');
        };

        const empty = '<span class="apl-empty">-</span>';

        const v = function (value) {
            return String(value || '').trim() ? textHtml(value) : empty;
        };

        const lines = function (value) {
            return apogeeNewlines(value)
                .split('\n')
                .map(function (line) {
                    return line.trim();
                })
                .filter(Boolean);
        };

        const numberLabel = function (index) {
            return String(index + 1).padStart(2, '0');
        };

        const npc = g('npc') || 'NPC';
        const pc = g('pc') || 'YOU';

        const meta = [
            g('date'),
            g('time'),
            g('location'),
            g('temperature'),
            g('weather')
        ].filter(Boolean).join(' · ');

        const affectionMatch = g('affection').match(/-?\d+(?:\.\d+)?/);
        const affectionNumber = affectionMatch
            ? Number(affectionMatch[0])
            : null;

        const affectionPercent = affectionNumber === null
            ? null
            : Math.max(0, Math.min(100, affectionNumber));

        const condomOn =
            /^(착용|on|true|1|o|yes)$/i.test(g('condom').trim());

        const sfw =
            !g('sexPosition').trim() ||
            /^(n\/?a|-|없음|sfw)$/i.test(g('sexPosition').trim());

        const wants = lines(g('npcWants')).slice(0, 3);
        const promises = lines(g('promises'));

        const comments = apogeeNewlines(g('communityComments'))
            .split(/\n\s*\n/)
            .map(function (part) {
                return part.split('\n')
                    .map(function (line) {
                        return line.trim();
                    })
                    .filter(Boolean);
            })
            .filter(function (part) {
                return part.length > 0;
            })
            .map(function (part) {
                return {
                    head: part.length > 1 ? part[0] : '',
                    body: (
                        part.length > 1 ? part.slice(1) : part
                    ).join('\n')
                };
            });

        const tabCss = APOGEE_TABS.map(function (tab) {
            const key = tab[0];

            return (
                '.apl .apl-r.r-' + key +
                ':checked~.apl-panel .pn-' + key +
                '{display:block}' +

                '.apl .apl-r.r-' + key +
                ':checked~.apl-tabs .tb-' + key +
                '{background:var(--acc);border-color:var(--acc);color:#14100a}'
            );
        }).join('\n');

        const radios = APOGEE_TABS.map(function (tab, index) {
            return (
                '<input type="radio" name="' + uid +
                '" id="' + uid + '-' + tab[0] +
                '" class="apl-r r-' + tab[0] + '"' +
                (index === 0 ? ' checked' : '') + '>'
            );
        }).join('');

        const tabButtons = APOGEE_TABS.map(function (tab) {
            return (
                '<label for="' + uid + '-' + tab[0] +
                '" class="apl-tab tb-' + tab[0] + '">' +
                tab[1] + '</label>'
            );
        }).join('');

        const nsfwHtml = sfw
            ? '<div class="apl-nsfw"><span class="apl-sfw">N/A · SFW</span></div>'
            : (
                '<div class="apl-nsfw">' +
                    '<span><span class="apl-nk">POS</span>' +
                    '<span class="apl-nv">' +
                        textHtml(g('sexPosition')) +
                    '</span></span>' +

                    '<span><span class="apl-nk">CONDOM</span>' +
                    '<span class="apl-pill' + (condomOn ? ' on' : '') + '">' +
                        (condomOn ? 'ON' : 'OFF') +
                    '</span></span>' +

                    '<span><span class="apl-nk">' + esc(npc) + '</span>' +
                    '<span class="apl-nv g">' +
                        esc(g('npcClimax') || '0') +
                    '</span></span>' +

                    '<span><span class="apl-nk">' + esc(pc) + '</span>' +
                    '<span class="apl-nv g">' +
                        esc(g('pcClimax') || '0') +
                    '</span></span>' +
                '</div>'
            );

        const schedulePanel =
            '<div class="pn pn-schedule">' +
                '<div class="apl-line"><span class="apl-chip">NOW</span>' +
                    v(g('scheduleNow')) +
                '</div>' +
                '<div class="apl-line"><span class="apl-chip">NEXT</span>' +
                    v(g('scheduleNext')) +
                '</div>' +
                '<div class="apl-dash"></div>' +
                '<div class="apl-k" style="margin-bottom:4px">DESIRE</div>' +
                (
                    wants.length
                        ? wants.map(function (want, index) {
                            return (
                                '<div class="apl-num"><b>' +
                                numberLabel(index) +
                                '</b><span>' + textHtml(want) + '</span></div>'
                            );
                        }).join('')
                        : empty
                ) +
            '</div>';

        const promisePanel =
            '<div class="pn pn-promise">' +
                (
                    promises.length
                        ? promises.map(function (promise, index) {
                            return (
                                '<div class="apl-num"><b>' +
                                numberLabel(index) +
                                '</b><span style="color:var(--soft);font-weight:600">' +
                                textHtml(promise) +
                                '</span></div>'
                            );
                        }).join('')
                        : '<span class="apl-empty">아직 맺은 약속이 없다.</span>'
                ) +
            '</div>';

        const tmiPanel =
            '<div class="pn pn-tmi">' +
                '<div style="color:var(--ink3)">' +
                    v(g('tmi')) +
                '</div>' +
            '</div>';

        const communityPanel =
            '<div class="pn pn-community">' +
                '<span class="apl-red">BABYLON</span>' +
                '<div class="apl-comm-t">' +
                    textHtml(g('communityTitle') || '-') +
                '</div>' +
                comments.map(function (comment) {
                    return (
                        '<div class="apl-cmt">' +
                            (
                                comment.head
                                    ? '<div class="apl-cmt-h">' +
                                        textHtml(comment.head) +
                                      '</div>'
                                    : ''
                            ) +
                            '<div class="apl-cmt-b">' +
                                textHtml(comment.body) +
                            '</div>' +
                        '</div>'
                    );
                }).join('') +
            '</div>';

        const interviewPanel =
            '<div class="pn pn-interview">' +
                '<div class="apl-q"><b>Q.</b>' +
                    textHtml(g('interviewQ') || '-') +
                '</div>' +
                '<div class="apl-a"><b>A.</b>' +
                    textHtml(g('interviewA') || '-') +
                '</div>' +
                (
                    g('interviewATr')
                        ? '<div class="apl-atr">(' +
                            textHtml(g('interviewATr')) +
                          ')</div>'
                        : ''
                ) +
            '</div>';

        function personCard(isPc) {
            const prefix = isPc ? 'pc' : 'npc';
            const name = isPc ? pc : npc;

            return (
                '<div class="apl-who' + (isPc ? ' pc' : '') + '">' +
                    '<div class="apl-who-n">' + esc(name) + '</div>' +
                    '<div class="apl-kao">' +
                        textHtml(g(prefix + 'Kaomoji') || '-') +
                    '</div>' +
                    '<div class="apl-k">OUTFIT</div>' +
                    '<div class="apl-v">' + v(g(prefix + 'Outfit')) + '</div>' +
                    '<div class="apl-k">POSE</div>' +
                    '<div class="apl-v">' + v(g(prefix + 'Pose')) + '</div>' +
                '</div>'
            );
        }

        return (
            '<style>' + APOGEE_CSS + tabCss + '</style>' +
            '<div class="apl">' +
                '<div class="apl-head">' +
                    '<div class="apl-top">' +
                        '<span class="apl-tag">APOGEE</span>' +
                        '<span class="apl-hq">INTERNAL LEDGER</span>' +
                    '</div>' +
                    '<div class="apl-card">' +
                        (
                            g('relation')
                                ? '<div class="apl-rel">' +
                                    textHtml(g('relation')) +
                                  '</div>'
                                : ''
                        ) +
                        '<div class="apl-names">' +
                            esc(npc) + '<span>⨯</span>' + esc(pc) +
                        '</div>' +
                        '<div class="apl-meta">' + esc(meta) + '</div>' +
                    '</div>' +
                '</div>' +

                '<details class="apl-det">' +
                    '<summary class="apl-toggle">' +
                        '<span class="lc">▼ OPEN FULL LEDGER</span>' +
                        '<span class="lo">▲ CLOSE LEDGER</span>' +
                    '</summary>' +

                    '<div class="apl-full">' +
                        '<div class="apl-sec a">' +
                            '<div class="apl-tag">STATUS</div>' +
                            '<div class="apl-row">' +
                                '<div class="apl-stat">' +
                                    '<div class="apl-stat-l">DAYS MET</div>' +
                                    '<div class="apl-stat-v">' +
                                        esc(g('daysMet') || '-') +
                                    '</div>' +
                                '</div>' +
                                '<div class="apl-stat">' +
                                    '<div class="apl-stat-l">TOGETHER</div>' +
                                    '<div class="apl-stat-v g">' +
                                        esc(g('daysTogether') || '-') +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="apl-aff">' +
                                '<div class="apl-aff-top">' +
                                    '<span class="apl-aff-l">SENTIMENT</span>' +
                                    '<span class="apl-aff-v">' +
                                        esc(g('affection') || '-') +
                                    '</span>' +
                                '</div>' +
                                (
                                    affectionPercent !== null
                                        ? '<div class="apl-bar"><i style="width:' +
                                            affectionPercent +
                                          '%"></i></div>'
                                        : ''
                                ) +
                            '</div>' +
                        '</div>' +

                        '<div class="apl-sec b">' +
                            '<div class="apl-tag">PRESENT</div>' +
                            '<div class="apl-row" style="gap:9px">' +
                                personCard(false) +
                                personCard(true) +
                            '</div>' +
                        '</div>' +

                        '<div class="apl-sec a">' +
                            '<div class="apl-tag">INNER VOICE</div>' +
                            '<div class="apl-mind">"' +
                                textHtml(g('npcMind') || '...') +
                            '"</div>' +
                        '</div>' +

                        '<div class="apl-sec b" style="background:linear-gradient(180deg,#160f08 0%,#0e0b07 100%)">' +
                            '<div class="apl-tag" style="background:#a8862a;color:#fdf6e6">NSFW</div>' +
                            nsfwHtml +
                        '</div>' +

                        '<div class="apl-sec a">' +
                            radios +
                            '<div class="apl-tabs">' + tabButtons + '</div>' +
                            '<div class="apl-panel">' +
                                schedulePanel +
                                promisePanel +
                                tmiPanel +
                                communityPanel +
                                interviewPanel +
                            '</div>' +
                        '</div>' +

                        '<div class="apl-foot">' +
                            '<span>FULCRUM · A.D. 2320</span>' +
                            '<span>◆ APOGEE INTERNAL</span>' +
                        '</div>' +
                    '</div>' +
                '</details>' +
            '</div>'
        );
    }

    // ==========================================
    // Apogee 태그 읽기
    // 속성의 따옴표 안에서는 >, <br>, 줄바꿈을 보존.
    // ==========================================

    function decodeAttributeEntities(value) {
        const named = {
            amp: '&',
            quot: '"',
            apos: "'",
            lt: '<',
            gt: '>',
            nbsp: ' '
        };

        return String(value).replace(
            /&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,
            function (whole, entity) {
                const lower = entity.toLowerCase();

                if (lower[0] !== '#') {
                    return named[lower];
                }

                const codePoint = lower.startsWith('#x')
                    ? parseInt(lower.slice(2), 16)
                    : parseInt(lower.slice(1), 10);

                if (
                    !Number.isFinite(codePoint) ||
                    codePoint < 0 ||
                    codePoint > 0x10FFFF ||
                    (codePoint >= 0xD800 && codePoint <= 0xDFFF)
                ) {
                    return whole;
                }

                return String.fromCodePoint(codePoint);
            }
        );
    }

    function readApogeeTag(source, start) {
        let quote = '';
        let end = -1;

        // "<Apogee"는 7글자.
        for (let index = start + 7; index < source.length; index++) {
            const character = source[index];

            if (quote) {
                if (character === quote) quote = '';
                continue;
            }

            if (character === '"' || character === "'") {
                quote = character;
            } else if (character === '{') {
                quote = '}';
            } else if (character === '>') {
                end = index + 1;
                break;
            }
        }

        if (end < 0) {
            throw new Error(
                'Apogee 태그가 닫히지 않았습니다. 속성의 따옴표와 />를 확인해주세요.'
            );
        }

        let remaining = source.slice(start + 7, end - 1)
            .replace(/\/\s*$/, '')
            .trim();

        const attributes = Object.create(null);

        while (remaining) {
            const match = remaining.match(
                /^([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/
            );

            if (!match) {
                throw new Error(
                    'Apogee 속성 형식을 확인해주세요: ' +
                    remaining.slice(0, 60)
                );
            }

            const value = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : match[4]);

            attributes[match[1]] = decodeAttributeEntities(value);
            remaining = remaining.slice(match[0].length).trimStart();
        }

        // <Apogee ...></Apogee> 형식도 허용.
        const closing = source.slice(end).match(/^\s*<\/Apogee\s*>/i);
        if (closing) end += closing[0].length;

        return {
            attributes: attributes,
            end: end
        };
    }

    // ==========================================
    // 본문 / 코드블록 / Apogee 분리
    //
    // 먼저 보호 영역을 분리한 후,
    // 본문에만 줄바꿈 처리를 적용.
    // ==========================================

    function tokenizeSource(raw) {
        const source = String(raw == null ? '' : raw)
            .replace(/\r\n?/g, '\n');

        const tokens = [];

        const specialPattern =
            /^[ \t]*(`{3,}|~{3,})[^\n]*|<Apogee\b/gim;

        let cursor = 0;
        let match;

        while ((match = specialPattern.exec(source)) !== null) {
            if (match.index > cursor) {
                tokens.push({
                    kind: 'body',
                    content: source.slice(cursor, match.index)
                });
            }

            if (match[1]) {
                // 코드블록 시작.
                const fence = match[1];
                const fenceCharacter = fence[0];

                const openingEnd = specialPattern.lastIndex;
                const contentStart = source[openingEnd] === '\n'
                    ? openingEnd + 1
                    : openingEnd;

                const closingPattern = new RegExp(
                    '^[ \\t]*' +
                    fenceCharacter + '{' + fence.length + ',}' +
                    '[ \\t]*(?:\\n|$)',
                    'gm'
                );

                closingPattern.lastIndex = contentStart;
                const closing = closingPattern.exec(source);

                const contentEnd = closing ? closing.index : source.length;
                let code = source.slice(contentStart, contentEnd);

                // 닫는 fence 바로 앞의 구분용 개행만 제거.
                if (code.endsWith('\n')) {
                    code = code.slice(0, -1);
                }

                tokens.push({
                    kind: 'html',
                    content: code
                });

                cursor = closing
                    ? closingPattern.lastIndex
                    : source.length;
            } else {
                const apogee = readApogeeTag(source, match.index);

                tokens.push({
                    kind: 'apogee',
                    attributes: apogee.attributes
                });

                cursor = apogee.end;
            }

            specialPattern.lastIndex = cursor;
        }

        if (cursor < source.length) {
            tokens.push({
                kind: 'body',
                content: source.slice(cursor)
            });
        }

        return tokens;
    }

    // ==========================================
    // 이름 / 강조 / 번역 판별
    // ==========================================

    function stripEdgeMarkers(value) {
        return String(value || '')
            .trim()
            .replace(/^[*_]+/, '')
            .replace(/[*_]+$/, '')
            .trim();
    }

    function normalizeName(value) {
        return stripEdgeMarkers(value)
            .normalize('NFKC')
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    function characterType(name) {
        const normalized = normalizeName(name);

        // 설정 패널에 입력한 캐릭터 이름 우선.
        const settings = [
            ['javier', 'javierName'],
            ['ines', 'inesName'],
            ['mob', 'mobName']
        ];

        for (const entry of settings) {
            const configured = normalizeName(getValue(entry[1]));

            if (configured && configured === normalized) {
                return entry[0];
            }
        }

        // 기본 이름 / 성 생략 / 한글 이름 지원.
        if (
            /^(javier(?:\s+espinoza)?|하비에르(?:\s*에스피노자)?)$/i
                .test(normalized)
        ) {
            return 'javier';
        }

        if (
            /^(in[eé]s(?:\s+hartmann)?|이네스(?:\s*하르트만)?)$/i
                .test(normalized)
        ) {
            return 'ines';
        }

        if (/^(mob|모브)$/i.test(normalized)) {
            return 'mob';
        }

        return 'custom';
    }

    function isTranslation(value) {
        return (
            /^\([\s\S]*\)$/.test(value) ||
            /^（[\s\S]*）$/.test(value)
        );
    }

    function startsWithQuote(value) {
        return /^["“「『]/.test(value);
    }

    function cleanNarration(value) {
        const text = String(value || '').trim();
        if (!text) return '';

        // 1) 문단 전체가 별표 "하나"로만 감싸진 경우 → 별표 제거
        //    *나레이션*  →  나레이션
        //    (** 로 시작하는 줄은 여기에 걸리지 않음)
        const single = text.match(/^\*(?!\*)([\s\S]*?)(?<!\*)\*$/);

        if (single) {
            const inner = single[1];

            // 안쪽의 **강조** 쌍을 제외하고 별표가 남아 있으면
            // *a* b *c* 처럼 따로 닫힌 기울임이므로 건드리지 않음.
            const leftover = inner.replace(/\*\*[^*\n]+\*\*/g, '');

            if (inner.trim() && !leftover.includes('*')) {
                return inner.trim();
            }
        }

        // 2) 문단 전체가 밑줄 하나로 감싸진 경우 → 밑줄 제거
        //    _나레이션_  →  나레이션
        const underscore = text.match(/^_(?!_)([\s\S]*?)(?<!_)_$/);

        if (underscore && underscore[1].trim()) {
            return underscore[1].trim();
        }

        // 3) 그 외(**강조**나레이션, **강조**, 중간 강조 등)는 그대로 유지
        return text;
    }

    // ==========================================
    // 원문 → 블록 배열
    // 실제 blocks / 화면은 여기서 변경하지 않음.
    // ==========================================

    function parseRawText(raw) {
        const result = [];
        const warnings = new Set();
        let statusLines = [];

        function push(type, content, extra) {
            const block = makeBlock(type, content, extra);
            result.push(block);
            return block;
        }

        function flushStatus() {
            if (!statusLines.length) return;

            push('status', statusLines.join('\n'));
            statusLines = [];
        }

        function parseLine(value) {
            const original = String(value || '').trim();
            if (!original) return;

            // ***는 강조 기호를 벗기기 전에 판별.
            if (
                original === '---' ||
                original === '***' ||
                original.startsWith('구분선:')
            ) {
                flushStatus();

                const requested = original.startsWith('구분선:')
                    ? original.slice('구분선:'.length).trim()
                    : '';

                const allowed = [
                    'solid-black',
                    'solid-gray',
                    'dashed-gray',
                    'dots',
                    'diamond'
                ];

                push(
                    'divider',
                    allowed.includes(requested) ? requested : 'solid-gray'
                );
                return;
            }

            const plain = stripEdgeMarkers(original);
            if (!plain) return;

            // 기존 이모지 상태창은 하나로 묶음.
            if (
                /^(🗓|💍|📍|👕|👥|💭|🔔|🚨|💕|❤|🔥|🔫|✏|📰|💘)/
                    .test(plain)
            ) {
                if (plain.startsWith('🗓')) flushStatus();

                statusLines.push(plain);
                return;
            }

            flushStatus();

            // 핵심:
            // 번역은 새 블록이 아니라 직전 대사의 다음 줄.
            if (isTranslation(plain)) {
                const previous = result[result.length - 1];

                if (previous && DIALOGUE_TYPES.has(previous.type)) {
                    previous.content += '\n' + plain;
                    return;
                }
            }

            // 이름 | 대사
            //
            // 지원:
            // **Ines Hartmann** | "..."
            // Ines Hartmann | "..."
            // **Ines Hartmann | "..."**
            const named = plain.match(/^(.+?)\s*[|｜│]\s*(.+)$/);

            if (named) {
                const name = stripEdgeMarkers(named[1]);
                const dialogue = stripEdgeMarkers(named[2]);

                if (name && dialogue && startsWithQuote(dialogue)) {
                    const type = characterType(name);

                    push(
                        type,
                        name + ' | ' + dialogue,
                        {
                            customName: type === 'custom' ? name : ''
                        }
                    );
                    return;
                }
            }

            // 이름 없는 따옴표 대사는 기본 Javier.
            // 원문끼리는 합치지 않고 항상 새 블록.
            if (startsWithQuote(plain)) {
                push('javier', plain);
                return;
            }

            // 나레이션은 앞 블록과 절대 병합하지 않음.
            const narration = cleanNarration(original);

            if (narration) {
                push('narration', narration);
            }
        }

        function parseLineWithImages(value) {
            const source = String(value || '');

            // 자동 이미지 / 마크다운 이미지.
            const imagePattern =
                /\{\{\s*img\s*::\s*([^}]+)\}\}|!\[[^\]\n]*\]\((https?:\/\/[^\s)]+)\)/gi;

            let cursor = 0;
            let match;

            while ((match = imagePattern.exec(source)) !== null) {
                // 이미지 앞의 문장도 버리지 않음.
                parseLine(source.slice(cursor, match.index));
                flushStatus();

                if (match[1] !== undefined) {
                    const key = match[1].trim().toLowerCase();
                    const url = AUTO_IMAGES[key];

                    if (url) {
                        push('image', url);
                    } else {
                        // 모르는 키를 조용히 삭제하지 않음.
                        push('narration', match[0]);
                        warnings.add('등록되지 않은 이미지 키: ' + key);
                    }
                } else {
                    push('image', match[2]);
                }

                cursor = imagePattern.lastIndex;
            }

            // 이미지 뒤의 문장도 버리지 않음.
            parseLine(source.slice(cursor));
        }

        const tokens = tokenizeSource(raw);

        for (const token of tokens) {
            if (token.kind === 'apogee') {
                flushStatus();

                // Apogee는 status가 아닌 html.
                // 위/아래 여백은 render.js에서만 적용.
                push('html', apogeeToHtml(token.attributes));
                continue;
            }

            if (token.kind === 'html') {
                flushStatus();

                if (token.content.trim()) {
                    push('html', token.content);
                }
                continue;
            }

            // 보호 영역을 제외한 본문에만 적용.
            const lines = token.content.split(/\n|<br\s*\/?>/gi);

            for (const line of lines) {
                parseLineWithImages(line);
            }
        }

        flushStatus();

        return {
            blocks: result,
            warnings: Array.from(warnings)
        };
    }

    // ==========================================
    // 편집기에 반영
    // ==========================================

    function commitBlocks(newBlocks, replaceExisting) {
        if (typeof blocks === 'undefined' || !Array.isArray(blocks)) {
            throw new Error('편집기 blocks 배열을 찾을 수 없습니다.');
        }

        if (typeof renderEditor !== 'function') {
            throw new Error(
                'renderEditor()를 찾을 수 없습니다. parser.js를 render.js 뒤에 로드해주세요.'
            );
        }

        const previous = blocks.slice();

        try {
            if (replaceExisting) blocks.length = 0;

            // 대량 입력에서 push(...배열)의 인자 수 제한 방지.
            for (const block of newBlocks) {
                blocks.push(block);
            }

            renderEditor();

            if (typeof saveState === 'function') {
                saveState();
            }
        } catch (error) {
            // 오류가 나면 메모리의 기존 블록 복원.
            blocks.length = 0;

            for (const block of previous) {
                blocks.push(block);
            }

            try {
                renderEditor();
            } catch (renderError) {
                console.error(
                    '[parser.js] 기존 화면 복원 실패:',
                    renderError
                );
            }

            throw error;
        }
    }

    function reportError(error) {
        console.error('[parser.js]', error);

        notify(
            '입력 처리 실패: ' +
            (error && error.message ? error.message : String(error))
        );
    }

    function reportSuccess(parsed, action) {
        let message = action + ': ' + parsed.blocks.length + '개 블록';

        if (parsed.warnings.length) {
            message += '\n' + parsed.warnings.join('\n');
        }

        notify(message);
    }

    // ==========================================
    // 벌크 입력
    // bulkInput → 기존 블록 뒤에 추가
    // ==========================================

    function parseBulkInput() {
        const input = document.getElementById('bulkInput');

        if (!input) {
            notify('벌크 입력창 #bulkInput을 찾을 수 없습니다.');
            return false;
        }

        const originalInput = input.value;

        if (!originalInput.trim()) {
            notify('분류할 원문을 입력해주세요.');
            return false;
        }

        try {
            const parsed = parseRawText(originalInput);

            if (!parsed.blocks.length) {
                notify('추가할 내용이 없습니다.');
                return false;
            }

            commitBlocks(parsed.blocks, false);

            // 성공했을 때만 입력창 비움.
            input.value = '';
            reportSuccess(parsed, '벌크 입력 완료');

            return true;
        } catch (error) {
            input.value = originalInput;
            reportError(error);
            return false;
        }
    }

    // ==========================================
    // 원문 불러오기
    // 기본: 기존 블록을 교체
    //
    // 직접 호출:
    // importFromRawChat(raw)
    // importFromRawChat(raw, { append: true })
    // ==========================================

    function importFromRawChat(raw, options) {
        const settings = options || {};

        try {
            const parsed = parseRawText(raw);

            if (!parsed.blocks.length) {
                notify('불러올 내용이 없습니다.');
                return false;
            }

            commitBlocks(parsed.blocks, !settings.append);
            reportSuccess(parsed, '자동 분류 완료');

            return true;
        } catch (error) {
            reportError(error);
            return false;
        }
    }

    // ==========================================
    // 기존 HTML 불러오기 버튼과 연결
    //
    // 렌더러가 만든 HTML → 기존 importFromHtml()
    // 원문 텍스트 → 위의 새 파서
    // ==========================================

    function isRawChatInput(value) {
        const text = String(value || '').trim();
        if (!text) return false;

        // 코드블록으로 넣은 HTML은 원문 파서가 처리.
        if (/^(?:`{3,}|~{3,})/.test(text)) {
            return true;
        }

        // 기존 출력 HTML은 원래 HTML importer에 전달.
        if (
            /<[^>]+\bdata-type\s*=/i.test(text) ||
            /<[^>]+\bclass\s*=\s*["'][^"']*\btistory-post-wrapper\b/i.test(text) ||
            /<[^>]+\bid\s*=\s*["']content-wrapper["']/i.test(text) ||
            /^<!doctype\s+html\b/i.test(text)
        ) {
            return false;
        }

        // 원문의 명확한 표식.
        if (
            /<Apogee\b/i.test(text) ||
            /\{\{\s*img\s*::/i.test(text) ||
            /^\s*[*_]*[^|\n]+[|｜│]\s*[*_]*["“「『]/m.test(text)
        ) {
            return true;
        }

        // 구조적 HTML 태그가 없으면 일반 원문으로 처리.
        // <br>만 있는 원문도 여기에 해당.
        const withoutBreaks = text.replace(/<br\s*\/?>/gi, '');

        return !/<\/?[a-z][^>]*>/i.test(withoutBreaks);
    }

    function installHtmlImportBridge() {
        const originalImport = window.importFromHtml;

        if (
            typeof originalImport === 'function' &&
            originalImport.__unifiedParserBridge
        ) {
            return;
        }

        function bridgedImportFromHtml() {
            const input = document.getElementById('finalHtmlCode');
            const source = input ? input.value : '';

            if (!source.trim()) {
                notify('불러올 HTML 또는 원문을 입력해주세요.');
                return false;
            }

            if (isRawChatInput(source)) {
                const success = importFromRawChat(source);

                // renderEditor가 출력창을 갱신하므로,
                // 오류가 났을 때는 사용자가 붙여 넣은 원문을 복원.
                if (!success && input) {
                    input.value = source;
                }

                return success;
            }

            if (typeof originalImport === 'function') {
                return originalImport.apply(this, arguments);
            }

            notify(
                '기존 HTML 불러오기 함수를 찾을 수 없습니다. ' +
                'parser.js를 render.js 뒤에 로드해주세요.'
            );

            return false;
        }

        bridgedImportFromHtml.__unifiedParserBridge = true;
        window.importFromHtml = bridgedImportFromHtml;
    }

    // ==========================================
    // 공개 함수
    // ==========================================

    window.apogeeToHtml = apogeeToHtml;
    window.parseBulkInput = parseBulkInput;
    window.importFromRawChat = importFromRawChat;

    // 블록을 저장하지 않고 파싱 결과만 확인할 때 사용.
    window.parseRawChatToBlocks = function (raw) {
        return parseRawText(raw).blocks;
    };

    installHtmlImportBridge();

})();
