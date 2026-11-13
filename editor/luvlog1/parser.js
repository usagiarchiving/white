// ==========================================
// toolbar.js
// 플로팅 툴바 전용 (겹침 방지 및 퀵 컬러 버튼)
// ==========================================

const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 100;

// 툴바 입력창에 포커스가 가면 문서 선택이 풀리므로, 마지막 드래그 범위를 따로 저장해 둠
let tbSavedRange = null;

function getPreviewEl() {
    return document.getElementById('htmlPreview');
}

function getBrushSize() {
    return (typeof currentInlineFontSize === 'number') ? currentInlineFontSize : 14;
}

// 툴바 안의 입력창(글자 크기 숫자 등)에 타이핑 중인지
function isToolbarInputActive() {
    const ae = document.activeElement;
    const tb = document.getElementById('floatingToolbar');
    return !!(ae && tb && tb.contains(ae) && ae.tagName === 'INPUT');
}

function handleSelection() {
    const selection = window.getSelection();
    const toolbar = document.getElementById('floatingToolbar');
    const previewContainer = getPreviewEl();

    // 숫자 입력창에 타이핑 중이면 툴바를 숨기지 않고 유지
    if (isToolbarInputActive()) return;

    if (!selection.rangeCount || selection.isCollapsed) {
        // 본문을 그냥 클릭한 경우엔 저장된 범위도 폐기
        if (selection.rangeCount && previewContainer && previewContainer.contains(selection.anchorNode)) {
            tbSavedRange = null;
        }
        toolbar.style.display = 'none';
        return;
    }

    const range = selection.getRangeAt(0);
    if (!previewContainer.contains(range.commonAncestorContainer)) {
        toolbar.style.display = 'none';
        return;
    }

    tbSavedRange = range.cloneRange();

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        toolbar.style.display = 'none';
        return;
    }

    toolbar.style.display = 'flex';

    const toolbarHeight = toolbar.offsetHeight || 80;
    const toolbarWidth = toolbar.offsetWidth || 340;

    let top = rect.top + window.scrollY - toolbarHeight - 12;
    let left = rect.left + window.scrollX + (rect.width / 2) - (toolbarWidth / 2);

    if (top < window.scrollY) {
        top = rect.bottom + window.scrollY + 12;
    }

    if (left < window.scrollX + 10) left = window.scrollX + 10;

    toolbar.style.top = top + 'px';
    toolbar.style.left = left + 'px';
}

function formatText(command) {
    document.execCommand(command, false, null);
    if (typeof syncPreviewToBlocks === 'function') syncPreviewToBlocks();
    setTimeout(handleSelection, 10);
}

// =========================================================
// 💡 인라인 스타일 적용 엔진
//  - execCommand / extractContents 를 쓰지 않음
//    (Chrome이 font-size 를 멋대로 끼워 넣거나, span 이 겹겹이 중첩되는 원인)
//  - 선택된 텍스트 노드를 "하나의 span" 에만 스타일 적용 (기존 span 이 있으면 재사용)
//  - 이미 같은 속성을 가진 바깥 span 이 있으면 그 속성을 지우고 새 값으로 교체
// =========================================================

function getTargetRange() {
    const preview = getPreviewEl();
    if (!preview) return null;
    const sel = window.getSelection();
    if (sel.rangeCount) {
        const r = sel.getRangeAt(0);
        if (!r.collapsed && preview.contains(r.commonAncestorContainer)) return r;
    }
    if (tbSavedRange && !tbSavedRange.collapsed && preview.contains(tbSavedRange.commonAncestorContainer)) {
        return tbSavedRange;
    }
    return null;
}

// 범위 경계의 텍스트 노드를 쪼개고, 범위 안에 완전히 들어오는 텍스트 노드 목록 반환
function collectTextNodes(range) {
    const sc = range.startContainer, so = range.startOffset;
    const ec = range.endContainer, eo = range.endOffset;

    if (ec.nodeType === 3 && eo > 0 && eo < ec.length) ec.splitText(eo);
    if (sc.nodeType === 3 && so > 0 && so < sc.length) sc.splitText(so);

    const root = range.commonAncestorContainer;
    const candidates = [];
    if (root.nodeType === 3) {
        candidates.push(root);
    } else {
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) candidates.push(w.currentNode);
    }

    return candidates.filter(n => {
        if (!/\S/.test(n.data)) return false;
        const r = document.createRange();
        r.selectNodeContents(n);
        return range.compareBoundaryPoints(Range.START_TO_START, r) <= 0 &&
               range.compareBoundaryPoints(Range.END_TO_END, r) >= 0;
    });
}

function isReusableSpan(el, preview) {
    return !!(el && el.nodeType === 1 && el.tagName === 'SPAN' && el !== preview &&
              !el.id && !el.className && el.childNodes.length === 1);
}

// 스타일이 다 지워진 순수 <span> 은 벗겨냄
function cleanupSpan(span) {
    if (!span || span.tagName !== 'SPAN' || !span.parentNode) return;
    if (!span.getAttribute('style')) span.removeAttribute('style');
    if (span.attributes.length > 0) return;
    const parent = span.parentNode;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
}

// span 안의 텍스트가 전부 선택 범위에 포함되는지
function isCovered(el, selSet) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
        const n = w.currentNode;
        if (/\S/.test(n.data) && !selSet.has(n)) return false;
    }
    return true;
}

// 일부만 선택된 바깥 span(A) 에서 node 가 속한 가지를 떼어내 [A앞부분][mid][A뒷부분] 으로 분할
function splitOut(node, A) {
    let c = node;
    while (c.parentNode !== A) c = c.parentNode;
    const mid = A.cloneNode(false);
    const tail = A.cloneNode(false);
    let n = c.nextSibling;
    while (n) {
        const nx = n.nextSibling;
        tail.appendChild(n);
        n = nx;
    }
    A.parentNode.insertBefore(mid, A.nextSibling);
    mid.appendChild(c);
    if (tail.childNodes.length) A.parentNode.insertBefore(tail, mid.nextSibling);
    if (!A.childNodes.length) A.parentNode.removeChild(A);
    return mid;
}

// 바로 옆에 있는 동일 스타일 span 합치기 (쪼개진 span 방지)
function mergeAdjacentSpans(el) {
    const same = (a, b) => a && b && a.nodeType === 1 && b.nodeType === 1 &&
        a.tagName === 'SPAN' && b.tagName === 'SPAN' &&
        a.getAttribute('style') === b.getAttribute('style') &&
        a.className === b.className && a.attributes.length === b.attributes.length;
    let cur = el;
    while (same(cur.previousSibling, cur)) {
        const prev = cur.previousSibling;
        while (cur.firstChild) prev.appendChild(cur.firstChild);
        cur.parentNode.removeChild(cur);
        cur = prev;
    }
    while (same(cur, cur.nextSibling)) {
        const next = cur.nextSibling;
        while (next.firstChild) cur.appendChild(next.firstChild);
        next.parentNode.removeChild(next);
    }
}

// =========================================================
// 💡 하비 / 이네스 형광펜 스타일 (미리보기 퀵버튼 & 블록 툴바 공용)
// =========================================================
const SPEAKER_STYLE = {
    javier: { color: '#d96b27', background: '#fff0e6' },
    ines:   { color: '#5b8ce0', background: '#eef4ff' }
};

function tbNotify(msg) {
    if (typeof showToast === 'function') showToast(msg);
    else console.warn('[toolbar]', msg);
}

// =========================================================
// 💡 코드(block.content) 직접 수정 방식
//  - 미리보기 DOM → syncPreviewToBlocks 변환에 의존하지 않음
//    (그 변환에서 span 스타일이 빠져서 "보이기만 바뀌고 코드엔 없던" 문제 방지)
//  - 선택한 글자를 block.content 문자열에서 찾아 <span style>로 직접 감쌈
// =========================================================
function camelToKebab(s) {
    return s.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

function parseStyleStr(str) {
    const o = {};
    String(str || '').split(';').forEach(part => {
        const i = part.indexOf(':');
        if (i > 0) {
            const k = part.slice(0, i).trim().toLowerCase();
            const v = part.slice(i + 1).trim();
            if (k && v) o[k] = v;
        }
    });
    return o;
}

function buildStyleStr(o) {
    return Object.keys(o).map(k => k + ': ' + o[k] + ';').join(' ');
}

function countOccurrences(text, sub) {
    let c = 0, from = 0;
    while (true) {
        const i = text.indexOf(sub, from);
        if (i < 0) break;
        c++;
        from = i + 1;
    }
    return c;
}

// 태그(<...>) 안이 아닌 곳에서 occ 번째로 나오는 위치 (없으면 첫 번째, 그것도 없으면 -1)
function indexOutsideTag(content, text, occ) {
    let from = 0, count = 0, first = -1;
    while (true) {
        const i = content.indexOf(text, from);
        if (i < 0) break;
        const inTag = content.lastIndexOf('<', i) > content.lastIndexOf('>', i);
        if (!inTag) {
            if (first < 0) first = i;
            if (count === occ) return i;
            count++;
        }
        from = i + 1;
    }
    return first;
}

// content[idx, idx+len) 를 styleObj(kebab 키, 값 '' = 제거)로 스타일링. 같은 글자를 감싼 span 이 있으면 교체/병합.
function restyleRange(content, idx, len, styleObj) {
    const OPEN = /<span style="([^"]*)">$/;
    let before = content.slice(0, idx);
    const core = content.slice(idx, idx + len);
    let after = content.slice(idx + len);
    const keys = Object.keys(styleObj);

    const apply = st => {
        keys.forEach(k => { if (styleObj[k]) st[k] = styleObj[k]; else delete st[k]; });
        return st;
    };
    const wrap = st => Object.keys(st).length
        ? '<span style="' + buildStyleStr(st) + '">' + core + '</span>'
        : core;

    let mid;
    const m = before.match(OPEN);
    if (m && after.indexOf('</span>') === 0) {
        // 이미 이 글자만 감싼 span 이 있음 → 새로 감싸지 않고 그 span 의 값만 변경
        const st = apply(parseStyleStr(m[1]));
        before = before.slice(0, m.index);
        after = after.slice(7);
        mid = wrap(st);
    } else {
        mid = wrap(apply({}));
    }

    // 같은 범위를 통째로 감싼 바깥 span 에 같은 속성이 있으면 제거 (중첩 방지)
    for (let g = 0; g < 5; g++) {
        const o = before.match(OPEN);
        if (!(o && after.indexOf('</span>') === 0)) break;
        const st = parseStyleStr(o[1]);
        let changed = false;
        keys.forEach(k => { if (k in st) { delete st[k]; changed = true; } });
        if (!changed) break;
        if (Object.keys(st).length) {
            before = before.slice(0, o.index) + '<span style="' + buildStyleStr(st) + '">';
            break;
        }
        before = before.slice(0, o.index);
        after = after.slice(7);
    }
    return before + mid + after;
}

function applyStyleViaData(styles) {
    if (typeof blocks === 'undefined' || !Array.isArray(blocks) || typeof renderEditor !== 'function') return false;
    const range = getTargetRange();
    const preview = getPreviewEl();
    if (!range || !preview) return false;

    const findBlockEl = (node) => {
        let n = node;
        while (n && n !== preview) {
            if (n.nodeType === 1 && n.id && n.id.indexOf('preview-block-') === 0) return n;
            n = n.parentNode;
        }
        return null;
    };
    const blockEl = findBlockEl(range.startContainer);
    if (!blockEl || blockEl !== findBlockEl(range.endContainer)) return false;

    const idx = parseInt(blockEl.id.replace('preview-block-', ''), 10);
    const block = blocks[idx];
    if (!block || typeof block.content !== 'string' || block.type === 'html' || block.type === 'image') return false;

    const sm = range.toString().match(/^(\s*)([\s\S]*?)(\s*)$/);
    let core = sm[2];
    let lead = sm[1].length;
    if (!core) return false;

    // (번역) 괄호까지 같이 드래그해도 괄호는 밖에 남기고 안쪽 글자만 스타일링
    if (core.length > 2 && /^[(（]/.test(core) && /[)）]$/.test(core)) {
        core = core.slice(1, -1);
        lead += 1;
    }
    if (!core.trim()) return false;

    const pre = document.createRange();
    pre.selectNodeContents(blockEl);
    pre.setEnd(range.startContainer, range.startOffset);
    const startOff = pre.toString().length + lead;
    const occ = countOccurrences(blockEl.textContent.slice(0, startOff), core);

    const pos = indexOutsideTag(block.content, core, occ);
    if (pos < 0) return false;

    const styleObj = {};
    Object.keys(styles).forEach(p => { styleObj[camelToKebab(p)] = styles[p]; });

    block.content = restyleRange(block.content, pos, core.length, styleObj);
    tbSavedRange = null;
    renderEditor();
    if (typeof saveState === 'function') saveState();
    return true;
}

// =========================================================
// 💡 대사 블록의 "번역 줄"만 찾아서 스타일링 (블록 툴바 형광펜용)
//  번역 = 두 번째 줄 이후의 (…) 줄. 괄호 "안쪽"만 감싸서 번역 인식이 깨지지 않게 함.
// =========================================================
function locateTranslation(content) {
    const re = /\n|<br\s*\/?>/gi;
    const segs = [];
    let last = 0, m;
    while ((m = re.exec(content)) !== null) {
        segs.push([last, m.index]);
        last = m.index + m[0].length;
    }
    segs.push([last, content.length]);

    for (let i = segs.length - 1; i >= 1; i--) {
        const s = segs[i][0];
        const line = content.slice(s, segs[i][1]);
        const vis = []; // 태그 밖 글자 위치
        let inTag = false;
        for (let j = 0; j < line.length; j++) {
            const ch = line[j];
            if (ch === '<') { inTag = true; continue; }
            if (ch === '>' && inTag) { inTag = false; continue; }
            if (!inTag && !/\s/.test(ch)) vis.push(j);
        }
        if (vis.length < 2) continue;
        const f = line[vis[0]], l = line[vis[vis.length - 1]];
        if (/[(（]/.test(f) && /[)）]/.test(l)) {
            return { a: s + vis[0] + 1, b: s + vis[vis.length - 1] };
        }
    }
    return null;
}

function applyTranslationHighlight(block) {
    if (!block || typeof block.content !== 'string') return false;
    const loc = locateTranslation(block.content);
    if (!loc) return false;

    const sp = SPEAKER_STYLE[block.type];
    let styleObj;
    if (sp) {
        styleObj = { 'color': sp.color, 'background-color': sp.background, 'padding': '0 2px', 'border-radius': '3px' };
    } else {
        const el = document.getElementById('highlightColor');
        styleObj = { 'background-color': el ? el.value : '#C4F0E9', 'padding': '0 2px', 'border-radius': '3px' };
    }

    const inner = block.content.slice(loc.a, loc.b);
    const wm = inner.match(/^\s*<span style="([^"]*)">([\s\S]*)<\/span>\s*$/);
    const singleWrap = wm && wm[2].indexOf('<span') < 0 && wm[2].indexOf('</span>') < 0;

    let replaced;
    if (singleWrap) {
        const st = parseStyleStr(wm[1]);
        if (st['background-color']) {
            Object.keys(styleObj).forEach(k => { delete st[k]; }); // 이미 칠해져 있으면 해제
        } else {
            Object.assign(st, styleObj);
        }
        replaced = Object.keys(st).length
            ? '<span style="' + buildStyleStr(st) + '">' + wm[2] + '</span>'
            : wm[2];
    } else {
        replaced = '<span style="' + buildStyleStr(styleObj) + '">' + inner + '</span>';
    }

    block.content = block.content.slice(0, loc.a) + replaced + block.content.slice(loc.b);
    return true;
}

/**
 * styles 예) { fontSize: '16px' } / { backgroundColor: '#fff0e6', padding: '0 2px' }
 * 값이 '' 이면 해당 속성 제거(= 기본값으로 복귀)
 */
function applyInlineStyle(styles) {
    // 1순위: 코드(block.content)를 직접 수정 → 화면과 코드가 항상 일치
    try {
        if (applyStyleViaData(styles)) return true;
    } catch (e) {
        console.error('[toolbar] 코드 직접 수정 실패, DOM 방식으로 대체', e);
    }
    // 2순위: 선택 범위가 줄/서식을 가로지르는 경우 등 → 화면에서만 적용 후 sync
    const ok = applyInlineStyleDom(styles);
    if (ok) tbNotify('선택 범위가 복잡해 코드 반영이 안 될 수 있어요. 한 줄 안에서 짧게 선택해 보세요.');
    return ok;
}

function applyInlineStyleDom(styles) {
    const range = getTargetRange();
    if (!range) return false;

    const preview = getPreviewEl();
    const props = Object.keys(styles);
    const reset = props.every(p => styles[p] === '' || styles[p] == null);

    const nodes = collectTextNodes(range);
    if (!nodes.length) return false;

    const selSet = new Set(nodes);
    const carriers = [];

    nodes.forEach(t => {
        let carrier = null;
        const par = t.parentNode;
        const reusable = isReusableSpan(par, preview);

        if (!reset) {
            if (reusable) {
                carrier = par;
            } else {
                carrier = document.createElement('span');
                par.insertBefore(carrier, t);
                carrier.appendChild(t);
            }
            props.forEach(p => { carrier.style[p] = styles[p]; });
        } else if (reusable) {
            props.forEach(p => { par.style[p] = ''; });
            cleanupSpan(par);
        }

        // 바깥쪽 span 정리 (블록 컨테이너 전까지만)
        const chain = [];
        let a = t.parentNode;
        while (a && a !== preview && a.nodeType === 1 && !(a.id && a.id.indexOf('preview-block-') === 0)) {
            chain.push(a);
            a = a.parentNode;
        }

        chain.forEach(A => {
            if (A === carrier || A.tagName !== 'SPAN' || !A.parentNode) return;
            if (!props.some(p => A.style[p])) return;

            if (isCovered(A, selSet)) {
                // 전체가 선택됨 → 바깥 속성을 지우고 새 값으로 "교체"
                props.forEach(p => { A.style[p] = ''; });
                cleanupSpan(A);
            } else if (reset) {
                // 일부만 선택 + 기본값 복귀 → 분할해서 선택 부분만 속성 제거
                const mid = splitOut(t, A);
                props.forEach(p => { mid.style[p] = ''; });
                cleanupSpan(mid);
            }
        });

        if (carrier) carriers.push(carrier);
    });

    carriers.forEach(c => { if (c.isConnected) mergeAdjacentSpans(c); });

    // 적용 후에도 같은 범위가 선택된 상태 유지
    const first = nodes[0], last = nodes[nodes.length - 1];
    const nr = document.createRange();
    nr.setStart(first, 0);
    nr.setEnd(last, last.length);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(nr);
    tbSavedRange = nr.cloneRange();

    notifyContentChanged(first);
    return true;
}

// 💡 직접 DOM을 바꾸면 브라우저가 'input' 이벤트를 안 보내서,
//    번역/원문 등 각 편집 영역의 저장 핸들러(oninput 등)가 변경을 모름.
//    execCommand 와 똑같이 input 이벤트를 직접 발생시킴.
function notifyContentChanged(node) {
    try {
        let el = node && (node.nodeType === 1 ? node : node.parentElement);
        const editable = el ? el.closest('[contenteditable]:not([contenteditable="false"])') : null;
        const target = editable || getPreviewEl();
        if (target) {
            target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatBackColor' }));
        }
    } catch (e) {
        console.error(e);
    }
    if (typeof syncPreviewToBlocks === 'function') syncPreviewToBlocks();
}

// 기존 함수명 유지 (다른 파일에서 호출해도 동작)
function wrapSelectionWithStyle(styles) {
    return applyInlineStyle(styles);
}

function applyQuickStyle(styleName) {
    if (styleName === 'javier') {
        wrapSelectionWithStyle({ color: '#d96b27', backgroundColor: '#fff0e6', padding: '0 2px', borderRadius: '3px' });
    } else if (styleName === 'ines') {
        wrapSelectionWithStyle({ color: '#5b8ce0', backgroundColor: '#eef4ff', padding: '0 2px', borderRadius: '3px' });
    } else if (styleName === 'highlight') {
        let hlColorEl = document.getElementById('highlightColor');
        let hlColor = hlColorEl ? hlColorEl.value : '#C4F0E9';
        // font-size / color 는 건드리지 않음 → 기본 텍스트 설정을 그대로 따라감
        wrapSelectionWithStyle({ backgroundColor: hlColor, padding: '0 2px', borderRadius: '2px' });
    }
    setTimeout(handleSelection, 10);
}

function formatPalette(command, value) {
    if (command === 'foreColor') {
        wrapSelectionWithStyle({ color: value });
    } else if (command === 'hiliteColor') {
        wrapSelectionWithStyle({ backgroundColor: value });
    }
    setTimeout(handleSelection, 10);
}

// =========================================================
// 💡 글자 크기 (+ / - / 숫자 직접 입력 / 적용 / 기본값 복귀)
// =========================================================

function updateFontSizeDisplay() {
    const el = document.getElementById('inlineFontSizeDisplay');
    if (!el) return;
    if (el.tagName === 'INPUT') el.value = getBrushSize();
    else el.innerText = getBrushSize();
}

// 지정한 크기를 선택 영역에 바로 적용 (+/- 없이도 가능)
function applyInlineFontSize(value) {
    let px = parseInt(value, 10);
    if (isNaN(px)) { updateFontSizeDisplay(); return; }
    px = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, px));

    currentInlineFontSize = px;
    updateFontSizeDisplay();

    applyInlineStyle({ fontSize: px + 'px' });
    setTimeout(handleSelection, 10);
}

function changeInlineFontSize(delta) {
    applyInlineFontSize(getBrushSize() + delta);
}

// 인라인 크기 제거 → 기본 텍스트 설정 크기로 복귀
function resetInlineFontSize() {
    applyInlineStyle({ fontSize: '' });
    updateFontSizeDisplay();
    setTimeout(handleSelection, 10);
}

// 입력창 값 확정 (비어 있으면 기본 크기로 복귀)
function commitFontSizeInput() {
    const input = document.getElementById('inlineFontSizeDisplay');
    if (!input) return;
    const raw = String(input.value || '').trim();
    if (raw === '') resetInlineFontSize();
    else applyInlineFontSize(raw);
    if (input.tagName === 'INPUT') input.blur();
}

// 숫자 표시 span → 직접 입력 가능한 input + [적용] [기본] 버튼으로 자동 교체 (HTML 수정 불필요)
document.addEventListener('DOMContentLoaded', function () {
    const old = document.getElementById('inlineFontSizeDisplay');
    if (!old || old.tagName === 'INPUT') return;

    const input = document.createElement('input');
    input.id = 'inlineFontSizeDisplay';
    input.className = old.className;
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.value = getBrushSize();
    input.title = '숫자 입력 후 Enter (비우고 Enter = 기본 크기)';
    input.style.cssText = 'width:38px; height:24px; text-align:center; border:1px solid #ddd; border-radius:4px; font-size:12px; padding:0; background:transparent; color:inherit;';
    old.parentNode.replaceChild(input, old);

    input.addEventListener('focus', () => input.select());
    input.addEventListener('input', () => {
        input.value = input.value.replace(/[^0-9]/g, '').slice(0, 3);
        const v = parseInt(input.value, 10);
        if (!isNaN(v)) currentInlineFontSize = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, v));
    });
    input.addEventListener('keydown', (e) => {
        e.stopPropagation(); // 다른 단축키(삭제 등)가 끼어들지 않게
        if (e.key === 'Enter') {
            e.preventDefault();
            commitFontSizeInput();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            updateFontSizeDisplay();
            input.blur();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            changeInlineFontSize(1);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            changeInlineFontSize(-1);
        }
    });

    const mkBtn = (id, text, title, handler) => {
        const b = document.createElement('button');
        b.id = id;
        b.type = 'button';
        b.textContent = text;
        b.title = title;
        b.style.cssText = 'min-width:26px; height:24px; border:1px solid #ddd; border-radius:4px; background:#fff; cursor:pointer; font-size:12px; padding:0 4px;';
        b.addEventListener('mousedown', (e) => e.preventDefault()); // 선택 영역 유지
        b.addEventListener('click', handler);
        return b;
    };

    const applyBtn = mkBtn('btn-font-apply', '✓', '표시된 크기를 선택 영역에 적용', commitFontSizeInput);
    const resetBtn = mkBtn('btn-font-reset', '기본', '기본 텍스트 크기로 되돌리기', resetInlineFontSize);
    input.insertAdjacentElement('afterend', applyBtn);
    applyBtn.insertAdjacentElement('afterend', resetBtn);
});

// 드래그 센서
document.addEventListener('selectionchange', () => setTimeout(handleSelection, 10));
document.addEventListener('mouseup', () => setTimeout(handleSelection, 10));
document.addEventListener('keyup', () => setTimeout(handleSelection, 10));
document.addEventListener('touchend', () => setTimeout(handleSelection, 10));

// =========================================================
// 💡 미리보기 내 블록 클릭 시 빠른 화자 전환 툴바
// =========================================================
let activePreviewIndex = -1;

function handleBlockClick(e) {
    let target = e.target;
    let blockEl = null;

    while (target && target.id !== 'htmlPreview') {
        if (target.id && target.id.startsWith('preview-block-')) {
            blockEl = target;
            break;
        }
        target = target.parentNode;
    }

    const speakerToolbar = document.getElementById('quickSpeakerToolbar');
    if (!blockEl) {
        if(speakerToolbar) speakerToolbar.style.display = 'none';
        return;
    }

    const index = parseInt(blockEl.id.replace('preview-block-', ''));
    activePreviewIndex = index;

    // 💡 [수정] 드래그 상태가 아닐 때만 노출하여 겹침 방지
    const selection = window.getSelection();
    if (selection.rangeCount && !selection.isCollapsed) {
        if(speakerToolbar) speakerToolbar.style.display = 'none';
        return;
    }

    if (speakerToolbar) {
        speakerToolbar.style.display = 'flex';
        const rect = blockEl.getBoundingClientRect();

        const toolbarHeight = speakerToolbar.offsetHeight || 36;
        const toolbarWidth = speakerToolbar.offsetWidth || 240; // 폭 늘림

        // 💡 [수정] 블록을 가리지 않도록 아예 왼쪽 상단 바깥쪽으로 위치 지정
        let top = rect.top + window.scrollY - toolbarHeight - 15;
        let left = rect.left + window.scrollX - 20;

        if (top < window.scrollY) {
            top = rect.bottom + window.scrollY + 10;
        }

        speakerToolbar.style.top = top + 'px';
        speakerToolbar.style.left = left + 'px';
    }
}

function changeSpeakerFromPreview(newType) {
    if (activePreviewIndex === -1) return;
    if (typeof changeBlockType === 'function') {
        changeBlockType(activePreviewIndex, newType);
    }
    const speakerToolbar = document.getElementById('quickSpeakerToolbar');
    if (speakerToolbar) speakerToolbar.style.display = 'none';
    activePreviewIndex = -1;
}

function deleteBlockFromPreview() {
    if (activePreviewIndex === -1) return;
    if (typeof deleteBlock === 'function') {
        deleteBlock(activePreviewIndex);
    }
    const speakerToolbar = document.getElementById('quickSpeakerToolbar');
    if (speakerToolbar) speakerToolbar.style.display = 'none';
    activePreviewIndex = -1;
}

// 💡 [추가] 블록 전체에 색상/형광펜 칠하기
function applyFullColorToBlock(type) {
    if (activePreviewIndex === -1) return;
    let block = blocks[activePreviewIndex];

    if (type === 'javier') {
        let color = document.getElementById('javierTextColor') ? document.getElementById('javierTextColor').value : '#ffb07c';
        block.content = `<span style="color: ${color}; font-weight: bold;">${block.content}</span>`;
    } else if (type === 'ines') {
        let color = document.getElementById('inesTextColor') ? document.getElementById('inesTextColor').value : '#9ec5fe';
        block.content = `<span style="color: ${color}; font-weight: bold;">${block.content}</span>`;
    } else if (type === 'highlight') {
        // 💡 번역 줄 "(…)" 만 하비/이네스 각각의 글자색 + 형광펜색으로. 한 번 더 누르면 해제.
        if (!applyTranslationHighlight(block)) {
            tbNotify('이 블록에는 (번역) 줄이 없어요.');
            const tb0 = document.getElementById('quickSpeakerToolbar');
            if (tb0) tb0.style.display = 'none';
            activePreviewIndex = -1;
            return;
        }
    }

    if (typeof renderEditor === 'function') renderEditor();
    if (typeof saveState === 'function') saveState();

    const speakerToolbar = document.getElementById('quickSpeakerToolbar');
    if (speakerToolbar) speakerToolbar.style.display = 'none';
    activePreviewIndex = -1;
}

// 💡 [추가] HTML 수정 없이 자바스크립트로 전체 색상 버튼 3개 자동 주입
document.addEventListener("DOMContentLoaded", function() {
    const tb = document.getElementById('quickSpeakerToolbar');
    if (tb && !document.getElementById('btn-all-orange')) {
        const divider = document.createElement('div');
        divider.className = 'tb-divider';
        divider.style.cssText = 'opacity: 0.3; margin: 0 4px;';

        const btnOr = document.createElement('button');
        btnOr.id = 'btn-all-orange';
        btnOr.title = '대사 전체 주황';
        btnOr.innerHTML = '🎨';
        btnOr.style.cssText = 'background: #fff0e6; color: #d96b27; border: 1px solid #ffccab; font-weight: bold; width: 26px; height: 26px; border-radius: 50%; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;';
        btnOr.onclick = () => applyFullColorToBlock('javier');

        const btnBl = document.createElement('button');
        btnBl.id = 'btn-all-blue';
        btnBl.title = '대사 전체 파랑';
        btnBl.innerHTML = '🎨';
        btnBl.style.cssText = 'background: #eef4ff; color: #5b8ce0; border: 1px solid #c2daff; font-weight: bold; width: 26px; height: 26px; border-radius: 50%; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;';
        btnBl.onclick = () => applyFullColorToBlock('ines');

        const btnHl = document.createElement('button');
        btnHl.id = 'btn-all-hl';
        btnHl.title = '번역 형광펜 (하비/이네스 색)';
        btnHl.innerHTML = '✏️';
        btnHl.style.cssText = 'background: #C4F0E9; color: #b45309; border: 1px solid #a7dfd5; font-weight: bold; width: 26px; height: 26px; border-radius: 50%; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;';
        btnHl.onclick = () => applyFullColorToBlock('highlight');

        tb.appendChild(divider);
        tb.appendChild(btnOr);
        tb.appendChild(btnBl);
        tb.appendChild(btnHl);
    }
});

document.addEventListener('click', (e) => {
    const htmlPreview = document.getElementById('htmlPreview');
    const speakerToolbar = document.getElementById('quickSpeakerToolbar');

    if (speakerToolbar && speakerToolbar.contains(e.target)) return;

    if (htmlPreview && htmlPreview.contains(e.target)) {
        handleBlockClick(e);
    } else {
        if (speakerToolbar) speakerToolbar.style.display = 'none';
    }
});
