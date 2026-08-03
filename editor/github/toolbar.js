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
        let hlColor = hlColorEl ? hlColorEl.value : '#fef08a';
        wrapSelectionWithStyle({ backgroundColor: hlColor, color: 'inherit', padding: '0 2px', borderRadius: '2px' });
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
    let hlColor = hlColorEl ? hlColorEl.value : '#fef08a';

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
// 💡 [신규] 미리보기 내 블록 클릭 시 빠른 화자 전환 툴바
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

    // 드래그(선택) 중일 때는 서식 툴바가 뜨므로 미니 툴바는 충돌을 막기 위해 띄우지 않음
    const selection = window.getSelection();
    if (selection.rangeCount && !selection.isCollapsed) {
        if(speakerToolbar) speakerToolbar.style.display = 'none';
        return;
    }

    if (speakerToolbar) {
        speakerToolbar.style.display = 'flex';
        const rect = blockEl.getBoundingClientRect();
        
        const toolbarHeight = speakerToolbar.offsetHeight || 36; 
        const toolbarWidth = speakerToolbar.offsetWidth || 180; // 💡 버튼 추가로 인한 너비 조정
        
        // 클릭한 블록 바로 위 좌측쯤에 귀엽게 나타남
        let top = rect.top + window.scrollY - toolbarHeight - 8;
        let left = rect.left + window.scrollX + 10; 
        
        if (top < window.scrollY) {
            top = rect.bottom + window.scrollY + 8;
        }
        
        speakerToolbar.style.top = top + 'px';
        speakerToolbar.style.left = left + 'px';
    }
}

function changeSpeakerFromPreview(newType) {
    if (activePreviewIndex === -1) return;
    
    // script.js에 있는 기존 타입 변경 함수를 그대로 사용하여 100% 안전한 연동
    if (typeof changeBlockType === 'function') {
        changeBlockType(activePreviewIndex, newType);
    }
    
    const speakerToolbar = document.getElementById('quickSpeakerToolbar');
    if (speakerToolbar) speakerToolbar.style.display = 'none';
    activePreviewIndex = -1;
}

// 💡 [추가] 툴바에서 문단 삭제를 안전하게 수행하는 함수
function deleteBlockFromPreview() {
    if (activePreviewIndex === -1) return;
    
    // script.js의 완벽하게 검증된 기본 삭제 로직(배열 삭제 + 렌더링 + 상태저장)을 호출
    if (typeof deleteBlock === 'function') {
        deleteBlock(activePreviewIndex);
    }
    
    const speakerToolbar = document.getElementById('quickSpeakerToolbar');
    if (speakerToolbar) speakerToolbar.style.display = 'none';
    activePreviewIndex = -1;
    
    // 삭제되었다는 부드러운 피드백 토스트 알림
    if (typeof showToast === 'function') {
        showToast('문단이 삭제되었습니다.');
    }
}

// 클릭 이벤트 감지 (바탕을 누르면 팝업이 스르륵 사라짐)
document.addEventListener('click', (e) => {
    const htmlPreview = document.getElementById('htmlPreview');
    const speakerToolbar = document.getElementById('quickSpeakerToolbar');
    
    // 툴바 자체를 클릭한 경우 무시
    if (speakerToolbar && speakerToolbar.contains(e.target)) return;

    // 미리보기 안을 클릭한 경우
    if (htmlPreview && htmlPreview.contains(e.target)) {
        handleBlockClick(e);
    } else {
        // 완전 바깥을 클릭하면 툴바 숨김
        if (speakerToolbar) speakerToolbar.style.display = 'none';
    }
});
