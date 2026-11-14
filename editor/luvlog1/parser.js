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
//
// 상태창 목록 (태그 이름의 숫자 = 상태창 번호)
// - 상태창1: <Apogee ... />  → apogeeToHtml()
// - 상태창2: <Apogee2 ... /> → apogee2ToHtml()
// - 디자인을 바꾸거나 추가할 땐 "상태창N" 주석이 붙은 구간만 수정.
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
            '&v=1793377073777',

        flip:
            IMAGE_BASE +
            '2c8fd7bb-1f2a-4961-ab12-bbe7ca7f8f22.webp' +
            '?alt=media&token=96639c0a-4cc0-4251-840a-3562d35800ed' +
            '&v=1793377073896',

        relax:
            IMAGE_BASE +
            '006cbedf-0883-4ccb-be72-6da10cb0d583.webp' +
            '?alt=media&token=a03d93dd-9958-4602-ad02-a287e49eb617' +
            '&v=1793377073791',

        bandage:
            IMAGE_BASE +
            'a88e87bd-a213-4a29-b95e-53799a2451e2.webp' +
            '?alt=media&token=775605db-48a6-4354-8c81-936f1d109bb7' +
            '&v=1793377073188',

        bored:
            IMAGE_BASE +
            '493126c4-87e5-4e04-ba1c-9ae2202a11af.webp' +
            '?alt=media&token=c4df282f-6a04-4844-9b0c-5842425464f7' +
            '&v=1793377073550',

        rain:
            IMAGE_BASE +
            '29486642-034e-42c8-8027-3367bd2fcdf6.webp' +
            '?alt=media&token=79016e49-4dd6-463a-960b-4cd1640dac3b' +
            '&v=1793377073911',

        fiesta:
            IMAGE_BASE +
            'c95b98e5-98f1-4b99-8701-c60b27deec36.webp' +
            '?alt=media&token=505711f7-1555-44c9-953a-df189e32ee8a' +
            '&v=1793377073808',

        birthday1:
            IMAGE_BASE +
            '291f2c6a-5b0d-4b69-9882-5145850509f4.webp' +
            '?alt=media&token=ee8e66d9-1234-4de3-a77a-18d6020b6393' +
            '&v=1793631738015',

        birthday2:
            IMAGE_BASE +
            'ffc4a9d6-b25b-4781-a913-a26bf9c9f3a7.webp' +
            '?alt=media&token=863fe3a4-7c62-43a6-9f58-2d892de508d6' +
            '&v=1793631738029'
    });

    // ==========================================
    // [상태창1] Apogee 디자인
    // 태그: <Apogee ... />
    // 변환 함수: apogeeToHtml()
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
    // [상태창2] Apogee2 디자인
    // 태그: <Apogee2 ... />
    // 변환 함수: apogee2ToHtml()
    //
    // JSX(Apogee2)를 정적 HTML로 옮긴 것.
    // - 펼치기(▼): <details> 사용
    // - 탭(MSG/SCH/PRM/NOTE/INT): 라디오 + 라벨 사용
    // ==========================================

    const APOGEE2_CSS = `
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css');
@import url('https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@700&display=swap');

.apg{--bg:#0c0a06;--panel:#15110a;--panel2:#221c10;--line:#3b3322;--gold:#d9b44a;--gold2:#f0d27a;--ink:#f4ead0;--ink2:#cfc7b2;--mute:#8e8672;--bd:#5a4d2c;--dim:#7a7059;
    width:100%;max-width:380px;margin:0 auto;position:relative;overflow:hidden;box-sizing:border-box;padding-bottom:12px;
    background:radial-gradient(120% 80% at 50% 0%,#1d1608 0%,var(--bg) 60%);border:1px solid var(--line);border-radius:16px;
    font-family:'Pretendard Variable',Pretendard,'Malgun Gothic',sans-serif;font-size:11px;line-height:1.55;color:var(--ink2);word-break:keep-all;overflow-wrap:break-word;
    text-align:left;letter-spacing:0;font-style:normal;font-weight:normal}
.apg *{box-sizing:border-box}
.apg::before{content:"";position:absolute;inset:4px;border:1px solid rgba(217,180,74,.2);border-radius:12px;pointer-events:none}
.apg-hd{display:flex;justify-content:space-between;align-items:flex-end;margin:0 14px;padding:15px 4px 10px;border-bottom:1px solid rgba(217,180,74,.22)}
.apg-hl{display:flex;flex-direction:column;font-size:10.5px;color:var(--mute);line-height:1.5}
.apg-pl{color:var(--ink2)}
.apg-hr{text-align:right;line-height:1.3}
.apg-hr b{display:block;font-family:'Gowun Batang',serif;font-size:19px;font-weight:700;color:var(--gold2);letter-spacing:.5px}
.apg-hr span{font-size:10.5px;color:var(--mute)}
.apg-st{padding:14px 14px 0;display:flex;flex-direction:column;gap:8px}
.apg-tb{position:relative;padding-top:34px}
.apg-bub{position:absolute;top:0;left:72px;padding:3px 11px;border-radius:999px;background:var(--panel2);border:1px solid #6b5c33;color:var(--gold2);font-size:12px;font-weight:700;white-space:nowrap}
.apg-tb i{position:absolute;display:block;border-radius:50%;background:var(--panel2);border:1px solid #6b5c33}
.apg-d1{left:50px;top:27px;width:3px;height:3px}
.apg-d2{left:59px;top:20px;width:5px;height:5px}
.apg-pc .apg-bub{left:auto;right:72px;border-color:#4a4536;color:var(--ink)}
.apg-pc i{border-color:#4a4536}
.apg-pc .apg-d1{left:auto;right:50px}
.apg-pc .apg-d2{left:auto;right:59px}
.apg-plate{display:flex;align-items:baseline;width:fit-content;max-width:100%;padding:5px 12px;border-radius:12px;border:1px solid var(--bd);background:var(--panel2)}
.apg-pc .apg-plate{margin-left:auto;border-color:#4a4536}
.apg-kao{font-size:15px;white-space:nowrap;color:var(--ink)}
.apg-cap{position:absolute;left:0;bottom:3px;display:inline-flex;border:1px solid var(--bd);border-radius:999px;overflow:hidden;font-size:10.5px;font-weight:700}
.apg-cap b{background:var(--gold);color:#17110a;padding:0 10px}
.apg-cap>span{padding:0 10px;color:var(--gold2)}
.apg-dn{margin-left:5px}
.apg-sum{display:block;width:100%;margin-top:8px;padding:5px 18px 5px 0;text-align:right;border:0;background:none;color:var(--gold);font-size:10px;line-height:1;cursor:pointer;font-family:inherit;list-style:none}
.apg-det>summary{list-style:none}
.apg-det>summary::-webkit-details-marker{display:none}
.apg-ar{display:inline-block;transition:transform .2s}
.apg-det[open] .apg-ar{transform:rotate(180deg)}
.apg-more{padding:10px 12px 0;display:flex;flex-direction:column;gap:14px}
.apg-box{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:9px 11px}
.apg-two{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px}
.apg-k{color:var(--mute);font-size:10px;font-weight:700;letter-spacing:.5px}
.apg-k em{font-style:normal;font-weight:700;margin-right:5px;color:var(--gold)}
.apg-k em.p{color:var(--ink2)}
.apg-mind{padding:2px 0 2px 11px;border-left:2px solid var(--gold);margin:2px 4px}
.apg-mh{display:flex;align-items:center;gap:6px;margin-bottom:2px}
.apg-nm{font-weight:700;font-size:9.5px;letter-spacing:.3px;color:var(--gold)}
.apg-mood{padding:0 7px;border-radius:999px;border:1px solid var(--bd);color:var(--mute);font-size:9px}
.apg-t{font-size:12.5px;line-height:1.7;color:var(--gold2);white-space:pre-line}
.apg-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.apg-tab{display:block;text-align:center;user-select:none;font-family:inherit;font-size:10px;font-weight:700;letter-spacing:1px;padding:6px 0;border-radius:8px;border:1px solid var(--line);background:var(--panel);color:var(--mute);cursor:pointer}
.apg-chat{display:flex;flex-direction:column;gap:7px;padding:2px 8px 2px 4px}
.apg-dt{text-align:center;color:var(--mute);font-size:10px;margin:2px 0 4px}
.apg-dt b{font-weight:700}
.apg-m{position:relative;isolation:isolate;max-width:78%;padding:6px 12px;border-radius:17px;line-height:1.5;white-space:pre-line}
.apg-m.apg-u{align-self:flex-end;margin-right:8px;background:var(--gold);color:#1b1407}
.apg-m.apg-c{align-self:flex-start;margin-left:8px;background:#2e2618;color:var(--ink)}
.apg-m::before,.apg-m::after{content:"";position:absolute;bottom:0;z-index:-1}
.apg-m.apg-u::before{right:-6px;width:18px;height:17px;background:var(--gold);border-bottom-left-radius:14px}
.apg-m.apg-u::after{right:-10px;width:10px;height:18px;background:var(--panel);border-bottom-left-radius:10px}
.apg-m.apg-c::before{left:-6px;width:18px;height:17px;background:#2e2618;border-bottom-right-radius:14px}
.apg-m.apg-c::after{left:-10px;width:10px;height:18px;background:var(--panel);border-bottom-right-radius:10px}
.apg-tr{margin-top:2px;font-size:10px;line-height:1.4;opacity:.7}
.apg-chip{display:inline-block;background:#2b2519;border:1px solid var(--bd);color:var(--gold);font-size:9px;font-weight:800;letter-spacing:1px;padding:1px 7px;margin-right:7px;border-radius:4px}
.apg-line{margin-bottom:8px}
.apg-dash{border-top:1px dashed #575044;margin:10px 0}
.apg-num{display:flex;gap:8px;padding:3px 0}
.apg-num b{color:var(--gold);font-size:11px;flex-shrink:0}
.apg-pr{color:#f2e2b8;font-weight:600}
.apg-row{white-space:pre-line}
.apg-row+.apg-row{margin-top:10px;padding-top:10px;border-top:1px dashed #575044}
.apg-qa b{color:var(--gold);margin-right:4px}
.apg-a{margin-top:4px;padding-left:8px;border-left:2px solid #4a3f22;color:var(--ink)}
.apg-atr{margin-top:4px;padding-left:19px;color:var(--mute);font-size:10.5px}
.apg-empty{color:#6e6a5c}
.apg-tags{text-align:right;padding:8px 18px 0;color:var(--dim);font-size:10.5px;letter-spacing:-.2px}
.apg .apg-r{display:none}
.apg .pn{display:none}
`;

    const APOGEE2_TABS = [
        ['msg', 'MSG'],
        ['sch', 'SCH'],
        ['prm', 'PRM'],
        ['note', 'NOTE'],
        ['int', 'INT']
    ];

    function apogee2ToHtml(attributes) {
        const p = attributes || {};

        const uid =
            'apg-' +
            Date.now().toString(36) + '-' +
            (++apogeeSequence).toString(36) + '-' +
            Math.random().toString(36).slice(2, 8);

        const g = function (key) {
            return p[key] == null ? '' : String(p[key]);
        };

        const textHtml = function (value) {
            return esc(apogeeNewlines(value)).replace(/\n/g, '<br>');
        };

        const empty = '<span class="apg-empty">-</span>';

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

        const cName = g('npc') || 'NPC';

        const sub = [
            g('season'),
            g('temperature'),
            g('weather')
        ].filter(Boolean).join(' ');

        const hasDate = g('date') || g('weekday') || g('time');

        const dm = parseInt(g('daysMet').replace(/[^0-9]/g, ''), 10);
        const showDays = !isNaN(dm) && dm > 0;

        const msgs = lines(g('messages'));
        const trs = lines(g('messagesTr'));
        const wants = lines(g('npcWants')).slice(0, 3);
        const promiseList = lines(g('promises'));

        const tabCss = APOGEE2_TABS.map(function (tab) {
            const key = tab[0];

            return (
                '.apg .apg-r.r-' + key +
                ':checked~.pn-' + key +
                '{display:block}' +

                '.apg .apg-r.r-' + key +
                ':checked~.apg-tabs .tb-' + key +
                '{background:var(--gold);border-color:var(--gold);color:#17110a}'
            );
        }).join('\n');

        const radios = APOGEE2_TABS.map(function (tab, index) {
            return (
                '<input type="radio" name="' + uid +
                '" id="' + uid + '-' + tab[0] +
                '" class="apg-r r-' + tab[0] + '"' +
                (index === 0 ? ' checked' : '') + '>'
            );
        }).join('');

        const tabButtons = APOGEE2_TABS.map(function (tab) {
            return (
                '<label for="' + uid + '-' + tab[0] +
                '" class="apg-tab tb-' + tab[0] + '">' +
                tab[1] + '</label>'
            );
        }).join('');

        const thought = function (text) {
            return text
                ? (
                    '<i class="apg-d1"></i><i class="apg-d2"></i>' +
                    '<div class="apg-bub">' + textHtml(text) + '</div>'
                )
                : '';
        };

        const noteRow = function (label, value) {
            return (
                '<div class="apg-row">' +
                    '<div class="apg-k">' + label + '</div>' +
                    v(value) +
                '</div>'
            );
        };

        const headerLeft =
            (
                g('location')
                    ? '<span class="apg-pl">' + esc(g('location')) + '</span>'
                    : ''
            ) +
            (sub ? '<span>' + esc(sub) + '</span>' : '');

        const dateText = [g('date'), g('weekday')].filter(Boolean).join(' ');

        const headerRight =
            (g('time') ? '<b>' + esc(g('time')) + '</b>' : '') +
            (dateText ? '<span>' + esc(dateText) + '</span>' : '');

        const msgPanel =
            '<div class="apg-box pn pn-msg">' +
                '<div class="apg-chat">' +
                    (
                        hasDate
                            ? '<div class="apg-dt"><b>' + esc(g('date')) +
                              '</b> ' + esc(g('weekday')) +
                              ' ' + esc(g('time')) + '</div>'
                            : ''
                    ) +
                    (
                        msgs.length
                            ? msgs.map(function (text, index) {
                                return (
                                    '<div class="apg-m ' +
                                    (index % 2 === 0 ? 'apg-c' : 'apg-u') + '">' +
                                        textHtml(text) +
                                        (
                                            trs[index]
                                                ? '<div class="apg-tr">' +
                                                    textHtml(trs[index]) +
                                                  '</div>'
                                                : ''
                                        ) +
                                    '</div>'
                                );
                            }).join('')
                            : empty
                    ) +
                '</div>' +
            '</div>';

        const schPanel =
            '<div class="apg-box pn pn-sch">' +
                '<div class="apg-line"><span class="apg-chip">NOW</span>' +
                    v(g('scheduleNow')) +
                '</div>' +
                '<div class="apg-line"><span class="apg-chip">NEXT</span>' +
                    v(g('scheduleNext')) +
                '</div>' +
                '<div class="apg-dash"></div>' +
                '<div class="apg-k" style="margin-bottom:4px">DESIRE</div>' +
                (
                    wants.length
                        ? wants.map(function (want, index) {
                            return (
                                '<div class="apg-num"><b>' +
                                numberLabel(index) +
                                '</b><span>' + textHtml(want) + '</span></div>'
                            );
                        }).join('')
                        : empty
                ) +
            '</div>';

        const prmPanel =
            '<div class="apg-box pn pn-prm">' +
                (
                    promiseList.length
                        ? promiseList.map(function (promise, index) {
                            return (
                                '<div class="apg-num"><b>' +
                                numberLabel(index) +
                                '</b><span class="apg-pr">' +
                                textHtml(promise) +
                                '</span></div>'
                            );
                        }).join('')
                        : '<span class="apg-empty">아직 맺은 약속이 없다.</span>'
                ) +
            '</div>';

        const notePanel =
            '<div class="apg-box pn pn-note">' +
                noteRow('DIARY', g('npcDiary')) +
                noteRow('MEMO', g('npcMemo')) +
                noteRow('TMI', g('tmi')) +
                noteRow('GIFT', g('npcGift')) +
            '</div>';

        const intPanel =
            '<div class="apg-box apg-qa pn pn-int">' +
                '<div class="apg-k"><b>Q</b>' +
                    textHtml(g('interviewQ') || '-') +
                '</div>' +
                '<div class="apg-a"><b>A</b>' +
                    textHtml(g('interviewA') || '-') +
                '</div>' +
                (
                    g('interviewATr')
                        ? '<div class="apg-atr">(' +
                            textHtml(g('interviewATr')) +
                          ')</div>'
                        : ''
                ) +
            '</div>';

        return (
            '<style>' + APOGEE2_CSS + tabCss + '</style>' +
            '<div class="apg">' +
                '<div class="apg-hd">' +
                    '<div class="apg-hl">' + headerLeft + '</div>' +
                    '<div class="apg-hr">' + headerRight + '</div>' +
                '</div>' +

                '<div class="apg-st">' +
                    '<div class="apg-tb">' +
                        thought(g('npcThought')) +
                        '<div class="apg-plate"><span class="apg-kao">' +
                            esc(g('npcKaomoji') || '-') +
                        '</span></div>' +
                    '</div>' +
                    '<div class="apg-tb apg-pc">' +
                        thought(g('pcThought')) +
                        '<div class="apg-cap">' +
                            (
                                g('relation')
                                    ? '<b>' + esc(g('relation')) + '</b>'
                                    : ''
                            ) +
                            '<span>♥' +
                                (
                                    showDays
                                        ? '<span class="apg-dn">' + dm + '</span>'
                                        : ''
                                ) +
                            '</span>' +
                        '</div>' +
                        '<div class="apg-plate"><span class="apg-kao">' +
                            esc(g('pcKaomoji') || '-') +
                        '</span></div>' +
                    '</div>' +
                '</div>' +

                '<details class="apg-det">' +
                    '<summary class="apg-sum">' +
                        '<span class="apg-ar">▼</span>' +
                    '</summary>' +

                    '<div class="apg-more">' +
                        '<div class="apg-box">' +
                            '<div class="apg-two">' +
                                '<div><div class="apg-k">OUTFIT</div>' +
                                    v(g('npcOutfit')) + '</div>' +
                                '<div><div class="apg-k">OUTFIT</div>' +
                                    v(g('pcOutfit')) + '</div>' +
                                '<div><div class="apg-k">POSE</div>' +
                                    v(g('npcPose')) + '</div>' +
                                '<div><div class="apg-k">POSE</div>' +
                                    v(g('pcPose')) + '</div>' +
                            '</div>' +
                        '</div>' +

                        '<div class="apg-mind">' +
                            '<div class="apg-mh">' +
                                '<span class="apg-nm">' + esc(cName) + '</span>' +
                                (
                                    g('npcMood')
                                        ? '<span class="apg-mood">' +
                                            esc(g('npcMood')) +
                                          '</span>'
                                        : ''
                                ) +
                            '</div>' +
                            '<div class="apg-t">' +
                                textHtml(g('npcMind') || '...') +
                            '</div>' +
                        '</div>' +

                        radios +
                        '<div class="apg-tabs">' + tabButtons + '</div>' +
                        msgPanel +
                        schPanel +
                        prmPanel +
                        notePanel +
                        intPanel +
                    '</div>' +
                '</details>' +

                (
                    g('genreTags')
                        ? '<div class="apg-tags">' + esc(g('genreTags')) + '</div>'
                        : ''
                ) +
            '</div>'
        );
    }

    // ==========================================
    // 상태창 디자인 등록부
    //
    // 태그 이름의 숫자 = 상태창 번호
    //   <Apogee ... />   → 상태창1 (apogeeToHtml)
    //   <Apogee2 ... />  → 상태창2 (apogee2ToHtml)
    //
    // 상태창3 이후를 추가할 때:
    //   1) 새 디자인 함수 작성 (예: apogee3ToHtml)
    //   2) 아래 등록부에 3: apogee3ToHtml 추가
    //   3) 맨 아래 공개 함수에 window.apogee3ToHtml 추가 (선택)
    // 기존 디자인을 바꿀 땐 해당 번호의 CSS / 함수만 수정.
    // ==========================================

    const APOGEE_DESIGNS = {
        1: apogeeToHtml,   // 상태창1
        2: apogee2ToHtml   // 상태창2
    };

    // ==========================================
    // Apogee 태그 읽기 (상태창 공통)
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

    // nameLength: "<Apogee" 또는 "<Apogee2" 등 태그 이름 길이.
    // 생략하면 "<Apogee"(7글자).
    function readApogeeTag(source, start, nameLength) {
        const nameEnd = start + (nameLength || 7);

        let quote = '';
        let end = -1;

        for (let index = nameEnd; index < source.length; index++) {
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

        let remaining = source.slice(nameEnd, end - 1)
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

        // <Apogee ...></Apogee>, <Apogee2 ...></Apogee2> 형식도 허용.
        const closing = source.slice(end).match(/^\s*<\/Apogee\d*\s*>/i);
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

        // <Apogee (상태창1), <Apogee2 (상태창2) ... 모두 인식.
        const specialPattern =
            /^[ \t]*(`{3,}|~{3,})[^\n]*|<Apogee(\d*)\b/gim;

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
                // 상태창 번호: <Apogee → 1, <Apogee2 → 2
                const apogeeNumber = match[2] || '';

                const apogee = readApogeeTag(
                    source,
                    match.index,
                    7 + apogeeNumber.length
                );

                tokens.push({
                    kind: 'apogee',
                    variant: apogeeNumber ? Number(apogeeNumber) : 1,
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

                // 상태창 번호(token.variant)에 맞는 디자인 선택.
                // 1 → 상태창1, 2 → 상태창2 (등록부 APOGEE_DESIGNS 참고)
                const design = APOGEE_DESIGNS[token.variant];

                if (typeof design !== 'function') {
                    throw new Error(
                        '등록되지 않은 상태창입니다: <Apogee' +
                        (token.variant === 1 ? '' : token.variant) + '>'
                    );
                }

                // Apogee는 status가 아닌 html.
                // 위/아래 여백은 render.js에서만 적용.
                push('html', design(token.attributes));
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

        // 원문의 명확한 표식. (<Apogee, <Apogee2 ... 상태창 태그 포함)
        if (
            /<Apogee\d*\b/i.test(text) ||
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

    window.apogeeToHtml = apogeeToHtml;     // 상태창1
    window.apogee2ToHtml = apogee2ToHtml;   // 상태창2
    window.parseBulkInput = parseBulkInput;
    window.importFromRawChat = importFromRawChat;

    // 블록을 저장하지 않고 파싱 결과만 확인할 때 사용.
    window.parseRawChatToBlocks = function (raw) {
        return parseRawText(raw).blocks;
    };

    installHtmlImportBridge();

})();
