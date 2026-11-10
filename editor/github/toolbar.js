// ==========================================
// toolbar.js
// 플로팅 툴바 기능 및 일괄 변환 파서 전용
// ==========================================

function handleSelection() {
    const selection = window.getSelection();
    const toolbar = document.getElementById('floatingToolbar');
    
    if (!selection.rangeCount || selection.isCollapsed) {
        toolbar.style.display = 'none';
        return;
    }
    
    const range = selection.getRangeAt(0);
    const previewContainer = document.getElementById('htmlPreview');
    if (!previewContainer.contains(range.commonAncestorContainer)) {
        toolbar.style.display = 'none';
        return;
    }
    
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

function wrapSelectionWithStyle(styles) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    if (Object.keys(styles).length === 1 && styles.color) {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, styles.color);
        if (typeof syncPreviewToBlocks === 'function') syncPreviewToBlocks();
        return;
    }
    if (Object.keys(styles).length === 1 && styles.backgroundColor) {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('hiliteColor', false, styles.backgroundColor);
        if (typeof syncPreviewToBlocks === 'function') syncPreviewToBlocks();
        return;
    }

    const span = document.createElement('span');
    for (let key in styles) {
        span.style[key] = styles[key];
    }
    
    try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.addRange(newRange);
    } catch(e) {
        console.error(e);
    }
    if (typeof syncPreviewToBlocks === 'function') syncPreviewToBlocks();
}

function applyQuickStyle(styleName) {
    if (styleName === 'mint') {
        wrapSelectionWithStyle({ color: '#1d6f60', backgroundColor: '#eef8f3', padding: '0 2px', borderRadius: '3px' });
    } else if (styleName === 'pink') {
        wrapSelectionWithStyle({ color: '#9b3e61', backgroundColor: '#fdf2f6', padding: '0 2px', borderRadius: '3px' });
    } else if (styleName === 'highlight') {
        let hlColorEl = document.getElementById('highlightColor');
        let hlColor = hlColorEl ? hlColorEl.value : '#C4F0E9';
        wrapSelectionWithStyle({ backgroundColor: hlColor, color: 'inherit', padding: '0 2px', borderRadius: '2px' });
    }
    setTimeout(handleSelection, 10);
    // 📝 형광펜/민트/핑크를 칠한 직후 메모창 자동 열기
    if (MEMO_AUTO_OPEN) setTimeout(openMemoForSelection, 30);
}

function formatPalette(command, value) {
    if (command === 'foreColor') {
        wrapSelectionWithStyle({ color: value });
    } else if (command === 'hiliteColor') {
        wrapSelectionWithStyle({ backgroundColor: value });
    }
    setTimeout(handleSelection, 10);
}

function changeInlineFontSize(delta) {
    currentInlineFontSize += delta;
    if(currentInlineFontSize < 10) currentInlineFontSize = 10;
    if(currentInlineFontSize > 40) currentInlineFontSize = 40;
    
    const display = document.getElementById('inlineFontSizeDisplay');
    if(display) display.innerText = currentInlineFontSize;
    
    wrapSelectionWithStyle({ fontSize: currentInlineFontSize + 'px' });
    setTimeout(handleSelection, 10);
}

// =========================================================
// (1) 일괄 변환 파싱 로직 (발췌기 기능 이식)
// =========================================================

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

function parseBulkInput() {
    try {
        const bulkInput = document.getElementById('bulkInput');
        let text = bulkInput.value;
        
        if (!text.trim()) {
            if (typeof showToast === 'function') showToast('변환할 텍스트를 입력해주세요.');
            return;
        }

        const lines = text.split(/\n/); 
        let statusBuffer = [];
        let isCodeBlock = false;
        let codeBuffer = [];

        lines.forEach(line => {
            let seg = line.trim();

            if (seg.startsWith('```')) {
                if (isCodeBlock) {
                    blocks.push({ type: 'html', content: codeBuffer.join('\n') });
                    codeBuffer = [];
                    isCodeBlock = false;
                } else {
                    if (statusBuffer.length > 0) {
                        blocks.push({ type: 'status', content: statusBuffer.join('\n') });
                        statusBuffer = [];
                    }
                    isCodeBlock = true;
                    codeBuffer = [];
                }
                return;
            }

            if (isCodeBlock) {
                codeBuffer.push(line);
                return;
            }

            if (!seg) return;

            let mdImgMatch = seg.match(/^!\[.*?\]\((.*?)\)$/);
            if (mdImgMatch) {
                blocks.push({ type: 'image', content: mdImgMatch[1].trim() });
                return;
            }

            if (seg === '---' || seg === '***' || seg.startsWith('구분선:')) {
                blocks.push({ type: 'divider', content: 'solid-gray' });
                return;
            }

            seg = parseAdvancedMarkdown(seg);

            const isEmojiStart = /^(🗓|💍|📍|👕|👥|💭|🔔|🚨|💕|❤|🔥|🔫|✏|📰|💘)/.test(seg);

            if (isEmojiStart) {
                if (seg.startsWith('🗓') && statusBuffer.length > 0) {
                    blocks.push({ type: 'status', content: statusBuffer.join('\n') });
                    statusBuffer = [];
                }
                statusBuffer.push(stripSymbols(seg));
            } else {
                if (statusBuffer.length > 0) {
                    blocks.push({ type: 'status', content: statusBuffer.join('\n') });
                    statusBuffer = [];
                }

                if (seg.startsWith('제목:')) { blocks.push({ type: 'title', content: stripSymbols(seg.replace(/^제목:\s*/, '')) }); return; }
                if (seg.startsWith('민트:')) { blocks.push({ type: 'mint', content: stripSymbols(seg.replace(/^민트:\s*/, '')) }); return; }
                if (seg.startsWith('핑크:')) { blocks.push({ type: 'pink', content: stripSymbols(seg.replace(/^핑크:\s*/, '')) }); return; }
                if (seg.startsWith('모브:')) { blocks.push({ type: 'mob', content: stripSymbols(seg.replace(/^모브:\s*/, '')) }); return; }
                if (seg.startsWith('제3자:')) { blocks.push({ type: 'custom', content: stripSymbols(seg.replace(/^제3자:\s*/, '')), customTextColor: '#333333' }); return; }
                if (seg.startsWith('속마음:')) { blocks.push({ type: 'thought', content: stripSymbols(seg.replace(/^속마음:\s*/, '')) }); return; }
                
                if (seg.startsWith('포스트잇:')) { blocks.push({ type: 'postit', content: stripSymbols(seg.replace(/^포스트잇:\s*/, '')) }); return; }
                if (seg.startsWith('폴라로이드:')) { 
                    let parts = stripSymbols(seg.replace(/^폴라로이드:\s*/, '')).split('|');
                    blocks.push({ type: 'polaroid', content: parts[0] ? parts[0].trim() : '', polaroidDate: parts[1] ? parts[1].trim() : '', polaroidCaption: parts[2] ? parts[2].trim() : '' });
                    return;
                }

                if (seg.startsWith('브금:')) {
                    let parts = stripSymbols(seg.replace(/^브금:\s*/, '')).split('|');
                    blocks.push({ type: 'bgm', content: '', bgmTitle: parts[0] ? parts[0].trim() : '', bgmUrl: parts[1] ? parts[1].trim() : '' });
                    return;
                }
                if (seg.startsWith('디데이:') || seg.startsWith('작은텍스트:')) { blocks.push({ type: 'dday', content: stripSymbols(seg.replace(/^(디데이|작은텍스트):\s*/, '')) }); return; }
                if (seg.startsWith('상태창:')) { blocks.push({ type: 'status', content: stripSymbols(seg.replace(/^상태창:\s*/, '')) }); return; }

                if (seg.startsWith('*') && seg.endsWith('*')) {
                    blocks.push({ type: 'narration', content: stripSymbols(seg.replace(/^\*|\*$/g, '')) });
                    return;
                }

                if (seg.startsWith('(') && seg.endsWith(')')) {
                    let lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
                    if (lastBlock && ['mint', 'pink', 'mob', 'custom'].includes(lastBlock.type)) {
                        lastBlock.content += '\n' + seg;
                        return;
                    }
                }

                let rawText = seg;

                if (/(["“"].*?["”"])/.test(rawText)) {
                    let parts = rawText.split(/(["“"].*?["”"])/g);
                    parts.forEach(part => {
                        part = part.trim();
                        if (!part) return;

                        if (/^["“"].*?["”"]$/.test(part)) {
                            let diag = part.replace(/^["“"]|["”"]$/g, '').trim();
                            if (diag) blocks.push({ type: 'mint', content: diag });
                        } else { 
                           if (/^\(.*\)$/.test(part)) {
                              let lastBlock = blocks[blocks.length - 1];
                               if (lastBlock && ['mint', 'pink', 'mob', 'custom'].includes(lastBlock.type)) {
                                  lastBlock.content += '\n' + part;
                                 return;
                                }
                             }
                          
                            let nar = part.replace(/^\*|\*$/g, '').trim();
                            if (nar) blocks.push({ type: 'narration', content: nar });
                        }
                    });
                    return;
                }

                blocks.push({ type: 'narration', content: stripSymbols(seg) });
            }
        });

        if (statusBuffer.length > 0) {
            blocks.push({ type: 'status', content: statusBuffer.join('\n') });
        }
        if (isCodeBlock && codeBuffer.length > 0) {
            blocks.push({ type: 'html', content: codeBuffer.join('\n') });
        }

        if (typeof renderEditor === 'function') renderEditor();
        if (typeof saveState === 'function') saveState(); 
        bulkInput.value = ''; 
    } catch(e) {
        console.error(e);
        if (typeof showToast === 'function') showToast('텍스트 변환 중 오류가 발생했습니다.');
    }
}

// 드래그 센서 복구 (모바일 환경 호환)
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

    // 💡 [수정] 드래그(선택) 중일 때는 화자 툴바를 숨겨서 서식(형광펜) 툴바 우선권 부여
    const selection = window.getSelection();
    if (selection.rangeCount && !selection.isCollapsed) {
        if(speakerToolbar) speakerToolbar.style.display = 'none';
        return;
    }

    if (speakerToolbar) {
        speakerToolbar.style.display = 'flex';
        const rect = blockEl.getBoundingClientRect();
        
        const toolbarHeight = speakerToolbar.offsetHeight || 36; 
        
        // 💡 [수정] 클릭한 블록 바로 위 좌측으로 위치를 조정하여 텍스트를 덜 가리게 변경
        let top = rect.top + window.scrollY - toolbarHeight - 15;
        let left = rect.left + window.scrollX - 20; 
        
        if (top < window.scrollY) {
            top = rect.bottom + window.scrollY + 10;
        }
        if (left < window.scrollX + 10) left = window.scrollX + 10;
        
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
    
    if (typeof showToast === 'function') {
        showToast('문단이 삭제되었습니다.');
    }
}

// 💡 [추가] 블록 전체에 색상/형광펜 칠하기 (기본 민트, 핑크 복구)
function applyFullColorToBlock(type) {
    if (activePreviewIndex === -1) return;
    let block = blocks[activePreviewIndex];
    
    if (type === 'mint') {
        block.content = `<span style="color: #1d6f60; background-color: #eef8f3; padding: 0 2px; border-radius: 3px;">${block.content}</span>`;
    } else if (type === 'pink') {
        block.content = `<span style="color: #9b3e61; background-color: #fdf2f6; padding: 0 2px; border-radius: 3px;">${block.content}</span>`;
    } else if (type === 'highlight') {
        // 이미 형광펜이 칠해져 있다면 지우고, 아니면 씌우기 (토글)
        if (block.content.startsWith('==') && block.content.endsWith('==')) {
            block.content = block.content.slice(2, -2);
        } else {
            block.content = `==${block.content}==`;
        }
    }
    
    if (typeof renderEditor === 'function') renderEditor();
    if (typeof saveState === 'function') saveState();
    
    const speakerToolbar = document.getElementById('quickSpeakerToolbar');
    if (speakerToolbar) speakerToolbar.style.display = 'none';
    activePreviewIndex = -1;
}

// 💡 [추가] 자바스크립트로 전체 색상(민트, 핑크, 형광펜) 버튼 3개 자동 주입
document.addEventListener("DOMContentLoaded", function() {
    const tb = document.getElementById('quickSpeakerToolbar');
    if (tb && !document.getElementById('btn-all-mint')) {
        const divider = document.createElement('div');
        divider.className = 'tb-divider';
        divider.style.cssText = 'width: 1px; height: 20px; background-color: #e5e5ea; margin: 0 8px;';
        
        const btnMint = document.createElement('button');
        btnMint.id = 'btn-all-mint';
        btnMint.title = '대사 전체 민트';
        btnMint.innerHTML = '🎨';
        btnMint.style.cssText = 'background: #eef8f3; color: #1d6f60; border: 1px solid #c3e6d6; font-weight: bold; width: 26px; height: 26px; border-radius: 50%; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-right: 4px;';
        btnMint.onclick = () => applyFullColorToBlock('mint');
        
        const btnPink = document.createElement('button');
        btnPink.id = 'btn-all-pink';
        btnPink.title = '대사 전체 핑크';
        btnPink.innerHTML = '🎨';
        btnPink.style.cssText = 'background: #fdf2f6; color: #9b3e61; border: 1px solid #f6d1df; font-weight: bold; width: 26px; height: 26px; border-radius: 50%; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-right: 4px;';
        btnPink.onclick = () => applyFullColorToBlock('pink');
        
        const btnHl = document.createElement('button');
        btnHl.id = 'btn-all-hl';
        btnHl.title = '전체 형광펜';
        btnHl.innerHTML = '✏️';
        btnHl.style.cssText = 'background: #C4F0E9; color: #1d6f60; border: 1px solid #a7dfd5; font-weight: bold; width: 26px; height: 26px; border-radius: 50%; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;';
        btnHl.onclick = () => applyFullColorToBlock('highlight');
        
        tb.appendChild(divider);
        tb.appendChild(btnMint);
        tb.appendChild(btnPink);
        tb.appendChild(btnHl);
    }
});

// =========================================================
// 📝 메모 기능 (형광펜 / 민트 / 핑크 영역에 메모 달기)
//  - 편집기: 칠한 직후 or 칠해진 곳 클릭 → 메모 팝업 (바깥 클릭 시 자동 저장)
//  - 결과물: 칠한 영역 오른쪽 위에 아주 작은 모서리 표시 → 누르면 메모 말풍선
//  - 메모 글씨: 글꼴 설정 없음(본문 글꼴 상속), 크기 10px 고정
//  - 메모는 data-memo 속성에 저장돼서 본문 텍스트는 건드리지 않음
// =========================================================
const MEMO_AUTO_OPEN = true;   // 칠한 직후 메모창 자동 열기 (끄려면 false)
const MEMO_NL = '↵';           // 줄바꿈 대체 문자 (결과물 변환 시 깨짐 방지)

// 모서리 표시: 오른쪽 위에 작은 삼각형 (CSS 인라인만 사용)
const MEMO_MARK_IMG = 'linear-gradient(225deg, rgba(90,90,100,0.55) 3.5px, transparent 0)';

// 결과물에서 클릭 시 말풍선을 띄우는 코드 (외부 함수 없이 단독 동작 / 한 줄 유지 필수)
const MEMO_READER_JS = [
    "var d=document,t=this,o=d.getElementById('mm');",
    "if(t.closest('[contenteditable],#htmlPreview'))return;",
    "event.stopPropagation();",
    "if(!d.__m){d.__m=1;d.addEventListener('click',function(){var q=d.getElementById('mm');if(q)q.remove()})}",
    "if(o){o.remove();if(o.__s==t)return}",
    "var p=d.createElement('div'),r=t.getClientRects()[0]||t.getBoundingClientRect();",
    "p.id='mm';p.__s=t;",
    "p.textContent=t.dataset.memo.split('" + MEMO_NL + "').join(String.fromCharCode(10));",
    "p.style.cssText='position:absolute;z-index:9999;max-width:200px;padding:6px 9px;background:#fff;border:1px solid #e5e5ea;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);font:10px/1.5 '+getComputedStyle(t).fontFamily+';letter-spacing:0;color:#636366;white-space:pre-wrap;word-break:keep-all';",
    "d.body.appendChild(p);",
    "p.style.top=(r.bottom+pageYOffset+6)+'px';",
    "p.style.left=Math.max(8,Math.min(r.left+pageXOffset,d.documentElement.clientWidth-p.offsetWidth-8))+'px'"
].join('');

let memoPopupEl = null;
let memoTarget = null;
let memoOrig = '';

// 형광펜(배경색)이 칠해진 요소인지 판별 (기본 형광펜 / 민트 / 핑크 / == 마크다운)
function isHighlightEl(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.id && el.id.startsWith('preview-block-')) return false;
    if (el.tagName === 'MARK') return true;
    if (el.tagName !== 'SPAN') return false;
    const bg = el.style.backgroundColor;
    return !!bg && bg !== 'transparent' && bg !== 'inherit' && bg !== 'initial';
}

function findHighlightEl(node) {
    const preview = document.getElementById('htmlPreview');
    let n = node && node.nodeType === 3 ? node.parentNode : node;
    while (n && n !== preview) {
        if (isHighlightEl(n)) return n;
        n = n.parentNode;
    }
    return null;
}

function getMemo(el) {
    return (el.getAttribute('data-memo') || '').split(MEMO_NL).join('\n');
}

function setMemo(el, text) {
    el.setAttribute('data-memo', text.replace(/\r?\n/g, MEMO_NL));
    el.style.backgroundImage = MEMO_MARK_IMG;
    el.style.backgroundRepeat = 'no-repeat';
    el.style.cursor = 'pointer';
    el.setAttribute('onclick', MEMO_READER_JS);
}

function clearMemo(el) {
    el.removeAttribute('data-memo');
    el.removeAttribute('onclick');
    el.style.backgroundImage = '';
    el.style.backgroundRepeat = '';
    el.style.cursor = '';
    if (!el.getAttribute('style')) el.removeAttribute('style');
}

function commitMemoChange() {
    if (typeof syncPreviewToBlocks === 'function') syncPreviewToBlocks();
    if (typeof saveState === 'function') saveState();
}

function memoTheme() {
    const dark = document.body.classList.contains('dark-mode');
    return dark
        ? { bg: '#2c2c2e', bd: '#48484a', tx: '#f2f2f7', sub: '#8e8e93', inBg: '#1c1c1e', acc: '#B2E4D4', dot: '#B2E4D4', focus: '#5fa898', del: '#ff8a8a' }
        : { bg: '#ffffff', bd: '#e5e5ea', tx: '#3a3a3c', sub: '#8e8e93', inBg: '#fafafa', acc: '#1d6f60', dot: '#7fd1bf', focus: '#a7dfd5', del: '#c2576b' };
}

function positionMemoPopup(el) {
    if (!memoPopupEl) return;
    const rects = el.getClientRects();
    const rect = rects.length ? rects[rects.length - 1] : el.getBoundingClientRect();
    const popH = memoPopupEl.offsetHeight;
    const popW = memoPopupEl.offsetWidth;

    // 기본은 칠한 영역 아래쪽 (위쪽엔 서식/화자 툴바가 뜨니까)
    let top = rect.bottom + window.scrollY + 8;
    if (rect.bottom + popH + 16 > window.innerHeight && rect.top - popH - 16 > 0) {
        top = rect.top + window.scrollY - popH - 8;
    }
    let left = rect.left + window.scrollX;
    const maxLeft = window.scrollX + document.documentElement.clientWidth - popW - 10;
    if (left > maxLeft) left = maxLeft;
    if (left < window.scrollX + 10) left = window.scrollX + 10;

    memoPopupEl.style.top = top + 'px';
    memoPopupEl.style.left = left + 'px';
}

function openMemoPopup(el, autoFocus) {
    if (!el) return;
    if (memoPopupEl && memoTarget === el) return;   // 같은 곳 다시 클릭하면 유지
    closeMemoPopup(true);

    const c = memoTheme();
    const existing = getMemo(el);
    memoTarget = el;
    memoOrig = existing.trim();

    const pop = document.createElement('div');
    pop.id = 'memoPopup';
    pop.style.cssText = `position:absolute;z-index:10002;width:220px;box-sizing:border-box;padding:9px 10px 8px;background:${c.bg};border:1px solid ${c.bd};border-radius:12px;box-shadow:0 6px 18px rgba(0,0,0,0.12);font-family:"Noto Sans KR",sans-serif;`;
    pop.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">
            <span style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:${c.acc};">
                <i style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${c.dot};"></i>메모
            </span>
            ${existing ? `<button type="button" id="memoDelBtn" style="background:none;border:none;padding:0;font-size:11px;color:${c.del};cursor:pointer;">삭제</button>` : ''}
        </div>
        <textarea id="memoInput" rows="3" placeholder="메모를 입력하세요" style="display:block;width:100%;box-sizing:border-box;resize:none;border:1px solid ${c.bd};border-radius:8px;padding:7px 8px;font-size:13px;line-height:1.5;font-family:inherit;color:${c.tx};background:${c.inBg};outline:none;"></textarea>
        <div style="margin-top:6px;font-size:10px;color:${c.sub};">바깥을 누르면 자동 저장돼요</div>
    `;
    document.body.appendChild(pop);
    memoPopupEl = pop;

    const ta = pop.querySelector('#memoInput');
    ta.value = existing;
    ta.addEventListener('focus', () => { ta.style.borderColor = c.focus; });
    ta.addEventListener('blur', () => { ta.style.borderColor = c.bd; });
    // Ctrl+Z 등이 전역 undo로 새지 않도록 막기
    ta.addEventListener('keydown', (ev) => {
        ev.stopPropagation();
        if (ev.isComposing || ev.keyCode === 229) return;
        if (ev.key === 'Escape' || ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter')) {
            ev.preventDefault();
            closeMemoPopup(true);
        }
    });
    ta.addEventListener('keyup', (ev) => ev.stopPropagation());

    const delBtn = pop.querySelector('#memoDelBtn');
    if (delBtn) {
        delBtn.addEventListener('click', () => {
            ta.value = '';
            closeMemoPopup(true);
        });
    }

    positionMemoPopup(el);
    if (autoFocus) ta.focus({ preventScroll: true });
}

function closeMemoPopup(save) {
    if (!memoPopupEl) return;
    const ta = memoPopupEl.querySelector('#memoInput');
    const target = memoTarget;

    if (save !== false && ta && target && target.isConnected) {
        const text = ta.value.trim();
        if (text !== memoOrig) {
            if (text) setMemo(target, text);
            else clearMemo(target);
            commitMemoChange();
        }
    }

    memoPopupEl.remove();
    memoPopupEl = null;
    memoTarget = null;
    memoOrig = '';
}

// 현재 선택 영역에서 칠해진 요소를 찾아 메모창 열기 (칠한 직후 자동 호출)
function openMemoForSelection() {
    const sel = window.getSelection();
    const preview = document.getElementById('htmlPreview');
    if (!sel || !sel.rangeCount || !preview) return;

    const range = sel.getRangeAt(0);
    if (!preview.contains(range.commonAncestorContainer)) return;

    let el = findHighlightEl(range.commonAncestorContainer);
    if (!el) {
        const root = range.commonAncestorContainer.nodeType === 1
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentElement;
        if (root) {
            el = Array.from(root.querySelectorAll('span, mark')).find(n => isHighlightEl(n) && range.intersectsNode(n));
        }
    }
    if (el) openMemoPopup(el, true);
}

// 미리보기 스크롤하면 메모창은 저장하고 닫기 (위치 어긋남 방지)
document.addEventListener('DOMContentLoaded', function() {
    const pv = document.getElementById('htmlPreview');
    if (pv) pv.addEventListener('scroll', () => closeMemoPopup(true));
});

// 클릭 이벤트 감지 (바탕을 누르면 팝업 숨김)
document.addEventListener('click', (e) => {
    const htmlPreview = document.getElementById('htmlPreview');
    const speakerToolbar = document.getElementById('quickSpeakerToolbar');
    
    if (speakerToolbar && speakerToolbar.contains(e.target)) return;
    if (memoPopupEl && memoPopupEl.contains(e.target)) return;

    if (htmlPreview && htmlPreview.contains(e.target)) {
        handleBlockClick(e);

        // 칠해진 곳을 클릭(드래그 아님)하면 메모창, 아니면 닫기
        const sel = window.getSelection();
        const hl = findHighlightEl(e.target);
        if (hl && sel && sel.isCollapsed) {
            openMemoPopup(hl, false);
        } else {
            closeMemoPopup(true);
        }
    } else {
        closeMemoPopup(true);
        if (speakerToolbar) speakerToolbar.style.display = 'none';
    }
});
