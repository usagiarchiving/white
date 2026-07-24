// == (기존 원본) 플로팅 툴바 기능 ==
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
    syncPreviewToBlocks();
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
        syncPreviewToBlocks();
        return;
    }
    if (Object.keys(styles).length === 1 && styles.backgroundColor) {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('hiliteColor', false, styles.backgroundColor);
        syncPreviewToBlocks();
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
    syncPreviewToBlocks();
}

function applyQuickStyle(styleName) {
    if (styleName === 'mint') {
        wrapSelectionWithStyle({ color: '#0E865E', backgroundColor: '#E1F9F1', padding: '0 2px', borderRadius: '3px' });
    } else if (styleName === 'pink') {
        wrapSelectionWithStyle({ color: '#D04978', backgroundColor: '#FDEDF4', padding: '0 2px', borderRadius: '3px' });
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

// 마크다운 서식을 텍스트 내부 마크업으로 정밀 변환하는 헬퍼 함수
function parseAdvancedMarkdown(text) {
    if (!text) return text;
    let t = text;
    t = t.replace(/~~([^~]+)~~/g, '<s style="text-decoration: line-through;">$1</s>');
    t = t.replace(/\+\+([^+]+)\+\+/g, '<u style="text-decoration: underline;">$1</u>');
    t = t.replace(/==([^=]+)==/g, '<mark style="background-color: #fef08a; color: inherit; padding: 0 2px; border-radius: 2px;">$1</mark>');
    return t;
}

function parseBulkInput() {
    try {
        const bulkInput = document.getElementById('bulkInput');
        let text = bulkInput.value;
        
        if (!text.trim()) {
            showToast('변환할 텍스트를 입력해주세요.');
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

        renderEditor();
        saveState(); 
        bulkInput.value = ''; 
    } catch(e) {
        console.error(e);
        showToast('텍스트 변환 중 오류가 발생했습니다.');
    }
}
