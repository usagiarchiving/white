setupColorPicker('mintTextColorPicker', 'mintTextColor');
setupColorPicker('pinkTextColorPicker', 'pinkTextColor');
setupColorPicker('narrColorPicker', 'narrColor');

function updateCustomCharacterPanel() {
    const list = document.getElementById('customCharacterAutoList');
    if(!list) return;

    const uniqueChars = {};
    blocks.forEach(b => {
        if(b.type === 'custom') {
            const key = /^#[0-9A-Fa-f]{6}$/i.test(b.customTextColor) ? b.customTextColor.toUpperCase() : '#333333';
            if(!uniqueChars[key]) {
                uniqueChars[key] = { text: key };
            }
        }
    });

    Object.keys(uniqueChars).forEach(key => {
        const safeKey = getSafeId(key);
        let row = document.getElementById(`auto-custom-${safeKey}`);
        if(!row) {
            row = document.createElement('div');
            row.id = `auto-custom-${safeKey}`;
            row.dataset.originalColor = uniqueChars[key].text;
            row.style.cssText = "display: flex; gap: 8px; padding: 12px; background: var(--block-bg); border: 1px solid var(--border); border-radius: 6px; align-items: flex-end;";
            
            row.innerHTML = `
                <div style="flex: 1;">
                    <label style="font-size: 10px; color: var(--text-muted);">제3자 글자색 관리</label>
                    <div style="display: flex; gap: 4px; margin-top: 4px;">
                        <input type="color" id="auto-text-picker-${safeKey}" value="${escapeHtml(uniqueChars[key].text)}" style="width: 26px; height: 26px; border: 1px solid var(--border); border-radius: 4px; padding: 1px; cursor: pointer; background: #fff; flex-shrink: 0;">
                        <input type="text" id="auto-text-text-${safeKey}" value="${escapeHtml(uniqueChars[key].text)}" style="flex: 1; font-size: 11px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                    </div>
                </div>
                <button class="btn-small" style="background-color: var(--primary); color: white; border: none; height: 26px; font-weight: bold; padding: 0 12px; border-radius: 4px; cursor: pointer;" onclick="applyAutoCustomColor('${safeKey}')">일괄 적용</button>
            `;
            list.appendChild(row);
            setupColorPicker(`auto-text-picker-${safeKey}`, `auto-text-text-${safeKey}`);
        }
    });
}

function applyAutoCustomColor(safeKey) {
    const row = document.getElementById(`auto-custom-${safeKey}`);
    const originalColor = row.dataset.originalColor;
    const newText = document.getElementById(`auto-text-text-${safeKey}`).value.trim();

    let count = 0;
    blocks.forEach(b => {
        if (b.type === 'custom' && b.customTextColor === originalColor) {
            b.customTextColor = newText;
            count++;
        }
    });

    if (count > 0) {
        document.getElementById('customCharacterAutoList').innerHTML = ''; 
        renderEditor(); 
        saveState(); // 변경사항 히스토리 저장
        showToast(`총 ${count}개의 대사에 색상이 일괄 적용되었습니다! 🚀`);
    } else {
        showToast("해당 캐릭터를 사용하는 대사가 없습니다.");
    }
}

function scrollToPreview(index) {
    const target = document.getElementById(`preview-block-${index}`);
    const container = document.getElementById('htmlPreview');
    
    if (target && container) {
        const scrollPos = target.offsetTop - (container.clientHeight / 2) + (target.clientHeight / 2);
        container.scrollTo({ top: scrollPos, behavior: 'smooth' });
        
        if (target.dataset.focusTimeout) {
            clearTimeout(parseInt(target.dataset.focusTimeout));
        }
        
        const originalTransition = target.style.transition || '';
        const originalBoxShadow = target.style.boxShadow || '';
        
        target.style.transition = 'box-shadow 0.3s ease';
        target.style.boxShadow = '0 0 0 4px rgba(0, 122, 255, 0.3)';
        target.style.borderRadius = '8px';
        
        const timeoutId = setTimeout(() => {
            target.style.boxShadow = originalBoxShadow;
            setTimeout(() => {
                target.style.transition = originalTransition;
            }, 300);
        }, 1000); 
        
        target.dataset.focusTimeout = timeoutId;
    }
}

function focusAndScrollBlock(index, preventFocus = false) {
    setTimeout(() => {
        const item = document.getElementById(`editor-block-${index}`);
        const list = document.getElementById('editorList');
        if (item && list) {
            const scrollPos = item.offsetTop - (list.clientHeight / 2) + (item.clientHeight / 2);
            list.scrollTo({ top: scrollPos, behavior: 'smooth' });
            
            item.style.boxShadow = '0 0 0 2px var(--primary)';
            item.style.backgroundColor = 'var(--input-bg)';
            setTimeout(() => {
                item.style.boxShadow = 'none';
                item.style.backgroundColor = 'var(--block-bg)';
            }, 800);
        }
        if (!preventFocus) {
            const ta = document.getElementById(`textarea-${index}`);
            if (ta) ta.focus();
        }
    }, 100);
}

function handleTextareaKeydown(e, index) {
    if (e.isComposing || e.keyCode === 229) return;
}

document.addEventListener("DOMContentLoaded", function() {
    saveState(); // 최초 빈 상태 저장

    const previewEl = document.getElementById('htmlPreview');
    previewEl.addEventListener('mouseup', handleSelection);
    previewEl.addEventListener('keyup', handleSelection);
    previewEl.addEventListener('touchend', handleSelection);
    
    document.addEventListener('mousedown', function(e) {
        const toolbar = document.getElementById('floatingToolbar');
        const previewContainer = document.getElementById('htmlPreview');
        if (toolbar && !toolbar.contains(e.target) && !previewContainer.contains(e.target)) {
            toolbar.style.display = 'none';
        }
    });

    document.getElementById('htmlPreview').addEventListener('keydown', function(e) {
        if (e.isComposing || e.keyCode === 229) return;
        
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            
            let node = range.startContainer;
            let blockEl = null;
            while (node && node !== this) {
                if (node.id && node.id.startsWith('preview-block-')) {
                    blockEl = node;
                    break;
                }
                node = node.parentNode;
            }
            
            if (blockEl) {
                const index = parseInt(blockEl.id.replace('preview-block-', ''));
                const currentBlock = blocks[index];
                
                const marker = '|||SPLIT|||';
                const textNode = document.createTextNode(marker);
                range.deleteContents();
                range.insertNode(textNode);
                
                syncPreviewToBlocks();
                
                let content = blocks[index].content;
                let parts = content.split(marker);
                
                if (parts.length >= 2) {
                    blocks[index].content = parts[0].trim();
                    const newBlock = {
                        type: currentBlock.type,
                        content: parts.slice(1).join('').replace(/^[\n\r]+/, '').trim(),
                        customTextColor: currentBlock.customTextColor || '#333333',
                        bgmTitle: currentBlock.bgmTitle,
                        bgmUrl: currentBlock.bgmUrl,
                        polaroidDate: currentBlock.polaroidDate || '',
                        polaroidCaption: currentBlock.polaroidCaption || '',
                        foldStyle: currentBlock.foldStyle || 'notion',
                        foldTitle: currentBlock.foldTitle || '접은글'
                    };
                    blocks.splice(index + 1, 0, newBlock);
                    renderEditor(); 
                    saveState(); 
                    
                    setTimeout(() => {
                        const newBlockEl = document.getElementById(`preview-block-${index + 1}`);
                        if (newBlockEl) {
                            let targetNode = newBlockEl;
                            if (newBlock.type === 'dday') {
                                targetNode = newBlockEl.querySelector('span');
                            }
                            
                            if (targetNode) {
                                const sel = window.getSelection();
                                const r = document.createRange();
                                r.selectNodeContents(targetNode);
                                r.collapse(true);
                                sel.removeAllRanges();
                                sel.addRange(r);
                                
                                const container = document.getElementById('htmlPreview');
                                const scrollPos = newBlockEl.offsetTop - (container.clientHeight / 2) + (newBlockEl.clientHeight / 2);
                                container.scrollTo({ top: scrollPos, behavior: 'smooth' });
                            }
                        }
                    }, 50);
                }
            }
        }
    });
});

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

            seg = seg.replace(/\*\*/g, '');

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
                
                // 접은글 일괄 변환 처리
                if (seg.startsWith('접은글:')) { blocks.push({ type: 'fold', content: stripSymbols(seg.replace(/^접은글:\s*/, '')), foldStyle: 'notion', foldTitle: '접은글' }); return; }

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

function addBlock(type, index = -1) {
    let defaultContent = '';
    if (type === 'divider') defaultContent = 'solid-gray';
    
    const newBlock = { type, content: defaultContent, customTextColor: '#333333', bgmTitle: '', bgmUrl: '', polaroidDate: '', polaroidCaption: '', foldStyle: 'notion', foldTitle: '접은글' };
    let addedIndex = -1;
    if (index === -1) {
        blocks.push(newBlock);
        addedIndex = blocks.length - 1;
    } else {
        blocks.splice(index, 0, newBlock);
        addedIndex = index;
    }
    renderEditor();
    saveState(); 
    focusAndScrollBlock(addedIndex); 
}

function insertEmptyLine(index) {
    const newBlock = { type: 'empty', content: '', customTextColor: '#333333', bgmTitle: '', bgmUrl: '', polaroidDate: '', polaroidCaption: '', foldStyle: 'notion', foldTitle: '접은글' };
    blocks.splice(index + 1, 0, newBlock);
    renderEditor();
    saveState(); 
    focusAndScrollBlock(index + 1); 
}

function deleteBlock(index) {
    blocks.splice(index, 1);
    renderEditor();
    saveState(); 
}

function updateBlockContent(index, value) {
    blocks[index].content = value;
    updateOutput();
    debounceSaveState(); 
}

function updateBlockCustom(index, field, value) {
    if (field === 'textColor') blocks[index].customTextColor = value;
    if (field === 'bgmTitle') blocks[index].bgmTitle = value;
    if (field === 'bgmUrl') blocks[index].bgmUrl = value;
    if (field === 'polaroidDate') blocks[index].polaroidDate = value;
    if (field === 'polaroidCaption') blocks[index].polaroidCaption = value;
    if (field === 'foldStyle') blocks[index].foldStyle = value;
    if (field === 'foldTitle') blocks[index].foldTitle = value;
    updateOutput();
    debounceSaveState(); 
}

function changeBlockType(index, newType) {
    blocks[index].type = newType;
    if (newType === 'custom') {
        blocks[index].customTextColor = blocks[index].customTextColor || '#333333';
    }
    if (newType === 'bgm') {
        blocks[index].bgmTitle = blocks[index].bgmTitle || '';
        blocks[index].bgmUrl = blocks[index].bgmUrl || '';
    }
    if (newType === 'polaroid') {
        blocks[index].polaroidDate = blocks[index].polaroidDate || '';
        blocks[index].polaroidCaption = blocks[index].polaroidCaption || '';
    }
    if (newType === 'fold') {
        blocks[index].foldStyle = blocks[index].foldStyle || 'notion';
        blocks[index].foldTitle = blocks[index].foldTitle || '접은글';
    }
    if (newType === 'divider' && !['solid-black', 'solid-gray', 'dashed-gray', 'dots', 'diamond'].includes(blocks[index].content)) {
        blocks[index].content = 'solid-gray';
    }
    renderEditor();
    saveState(); 
}

function renderEditor() {
    const list = document.getElementById('editorList');
    list.innerHTML = '';

    blocks.forEach((block, index) => {
        const item = document.createElement('div');
        item.className = 'block-item';
        item.id = `editor-block-${index}`;
        
        item.addEventListener('click', () => {
            scrollToPreview(index);
        });
        
        let customFields = '';
        let isBgm = false;
        let isEmpty = block.type === 'empty';
        let isDivider = block.type === 'divider';
        let isPolaroid = block.type === 'polaroid';

        if (block.type === 'custom') {
            let validTextHex = /^#[0-9A-Fa-f]{6}$/i.test(block.customTextColor) ? block.customTextColor : '#333333';
            customFields = `
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                    <div style="display: flex; gap: 4px;">
                        <input type="color" value="${validTextHex}" oninput="document.getElementById('custom-textcolor-text-${index}').value = this.value.toUpperCase(); updateBlockCustom(${index}, 'textColor', this.value.toUpperCase());" style="width: 28px; height: 28px; border: 1px solid var(--border); border-radius: 4px; padding: 1px; cursor: pointer; background: #fff; flex-shrink: 0;">
                        <input type="text" id="custom-textcolor-text-${index}" placeholder="제3자 글자색 (#333333)" value="${escapeHtml(block.customTextColor)}" onclick="scrollToPreview(${index})" onfocus="scrollToPreview(${index})" oninput="updateBlockCustom(${index}, 'textColor', this.value); if(/^#[0-9A-Fa-f]{6}$/.test(this.value)) { this.previousElementSibling.value = this.value; }" style="flex: 1; font-size: 11px; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                    </div>
                </div>
            `;
        } else if (block.type === 'bgm') {
            isBgm = true;
            customFields = `
                <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                    <input type="text" placeholder="음악 제목" value="${escapeHtml(block.bgmTitle)}" onclick="scrollToPreview(${index})" onfocus="scrollToPreview(${index})" onchange="updateBlockCustom(${index}, 'bgmTitle', this.value)" style="flex: 1; font-size: 11px; padding: 6px; margin: 0; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                    <input type="text" placeholder="유튜브 링크" value="${escapeHtml(block.bgmUrl)}" onclick="scrollToPreview(${index})" onfocus="scrollToPreview(${index})" onchange="updateBlockCustom(${index}, 'bgmUrl', this.value)" style="flex: 1.5; font-size: 11px; padding: 6px; margin: 0; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                </div>
            `;
        } else if (block.type === 'polaroid') {
            customFields = `
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                    <input type="text" placeholder="이미지 URL" value="${escapeHtml(block.content)}" onchange="updateBlockContent(${index}, this.value)" style="font-size: 11px; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                    <div style="display: flex; gap: 8px;">
                        <input type="text" placeholder="날짜 (예: 2026. 06. 29)" value="${escapeHtml(block.polaroidDate || '')}" onchange="updateBlockCustom(${index}, 'polaroidDate', this.value)" style="flex: 1; font-size: 11px; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                        <input type="text" placeholder="캡션 (예: 그날의 기억...)" value="${escapeHtml(block.polaroidCaption || '')}" onchange="updateBlockCustom(${index}, 'polaroidCaption', this.value)" style="flex: 2; font-size: 11px; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                    </div>
                </div>
            `;
        } else if (block.type === 'fold') {
            customFields = `
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <select onchange="updateBlockCustom(${index}, 'foldStyle', this.value)" style="flex: 1; padding: 6px; border: 1px solid var(--border); border-radius: 4px; font-size: 11px; background: var(--input-bg); color: var(--text-main);">
                        <option value="notion" ${block.foldStyle === 'notion' ? 'selected' : ''}>양식 1 (노션 타입)</option>
                        <option value="panel" ${block.foldStyle === 'panel' ? 'selected' : ''}>양식 2 (패널 타입)</option>
                        <option value="more" ${block.foldStyle === 'more' ? 'selected' : ''}>양식 3 (더보기 타입)</option>
                        <option value="border" ${block.foldStyle === 'border' ? 'selected' : ''}>양식 4 (대시 라인 타입)</option>
                    </select>
                    <input type="text" placeholder="접은글 제목" value="${escapeHtml(block.foldTitle || '접은글')}" onclick="scrollToPreview(${index})" onfocus="scrollToPreview(${index})" onchange="updateBlockCustom(${index}, 'foldTitle', this.value)" style="flex: 2; font-size: 11px; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                </div>
            `;
        }

        let hideTextarea = ['empty', 'bgm', 'polaroid'].includes(block.type);

        item.innerHTML = `
            <div style="text-align: center; margin-bottom: 5px;">
                <button class="btn-small btn-secondary" onclick="addBlock('narration', ${index})">⬆ 이 위에 추가</button>
            </div>
            <div class="block-header">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <select class="block-type" onchange="changeBlockType(${index}, this.value)" style="background: var(--input-bg); color: var(--text-main); border: 1px solid var(--border); border-radius: 4px; padding: 4px;">
                        <option value="title" ${block.type==='title'?'selected':''}>제목</option>
                        <option value="narration" ${block.type==='narration'?'selected':''}>나레이션</option>
                        <option value="mint" ${block.type==='mint'?'selected':''}>민트 대사</option>
                        <option value="pink" ${block.type==='pink'?'selected':''}>핑크 대사</option>
                        <option value="mob" ${block.type==='mob'?'selected':''}>모브 대사</option>
                        <option value="custom" ${block.type==='custom'?'selected':''}>제3자 대사</option>
                        <option value="bgm" ${block.type==='bgm'?'selected':''}>BGM 재생</option>
                        <option value="thought" ${block.type==='thought'?'selected':''}>속마음</option>
                        <option value="status" ${block.type==='status'?'selected':''}>상태창</option>
                        <option value="postit" ${block.type==='postit'?'selected':''}>포스트잇</option>
                        <option value="polaroid" ${block.type==='polaroid'?'selected':''}>폴라로이드</option>
                        <option value="fold" ${block.type==='fold'?'selected':''}>접은글</option>
                        <option value="divider" ${block.type==='divider'?'selected':''}>구분선</option>
                        <option value="dday" ${block.type==='dday'?'selected':''}>작은 텍스트</option>
                        <option value="image" ${block.type==='image'?'selected':''}>이미지</option>
                        <option value="html" ${block.type==='html'?'selected':''}>HTML</option>
                        <option value="empty" ${block.type==='empty'?'selected':''}>공백 줄</option>
                    </select>
                    <button class="btn-small btn-quick-mint" onclick="changeBlockType(${index}, 'mint')">민트</button>
                    <button class="btn-small btn-quick-pink" onclick="changeBlockType(${index}, 'pink')">핑크</button>
                    <button class="btn-small btn-quick-status" onclick="changeBlockType(${index}, 'narration')">나레이션</button>
                </div>
                <div class="block-actions">
                    <button class="btn-small btn-danger" onclick="deleteBlock(${index})">삭제</button>
                </div>
            </div>
            ${customFields}
            ${isEmpty ? `<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:10px; background:var(--input-bg); border-radius:4px; border:1px solid var(--border);">[공백 줄 - 화면을 띄우는 용도]</div>` 
                      : isBgm ? `` 
                      : isPolaroid ? ``
                      : isDivider ? `
                        <select onchange="updateBlockContent(${index}, this.value)" style="width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 12px; font-family: inherit; background: var(--input-bg); color: var(--text-main);">
                            <option value="solid-black" ${block.content === 'solid-black' ? 'selected' : ''}>검은 1자선</option>
                            <option value="solid-gray" ${block.content === 'solid-gray' ? 'selected' : ''}>회색 1자선</option>
                            <option value="dashed-gray" ${block.content === 'dashed-gray' ? 'selected' : ''}>회색 점선</option>
                            <option value="dots" ${block.content === 'dots' ? 'selected' : ''}>점점점 (···)</option>
                            <option value="diamond" ${block.content === 'diamond' ? 'selected' : ''}>다이아몬드 (─ ◇ ─)</option>
                        </select>
                      `
                      : `<textarea id="textarea-${index}" rows="2" onclick="scrollToPreview(${index})" onfocus="scrollToPreview(${index})" oninput="updateBlockContent(${index}, this.value)" onchange="updateBlockContent(${index}, this.value); saveState();" onkeydown="handleTextareaKeydown(event, ${index})">${escapeHtml(block.content)}</textarea>`}
            <div style="text-align: center; margin-top: 5px;">
                <button class="btn-small btn-secondary" onclick="addBlock('narration', ${index + 1})">⬇ 이 아래에 추가</button>
            </div>
        `;
        list.appendChild(item);
    });

    updateCustomCharacterPanel();
    updateOutput();
}

function syncPreviewToBlocks() {
    blocks.forEach((block, index) => {
        const el = document.getElementById(`preview-block-${index}`);
        if (!el) return;

        if (block.type === 'status' || block.type === 'html') {
            block.content = el.innerHTML;
        } else if (['mint', 'pink', 'mob', 'custom', 'narration', 'thought', 'title', 'dday', 'postit', 'polaroid', 'fold'].includes(block.type)) {
            
            if (block.type === 'fold') {
                const summarySpan = el.querySelector('summary span[contenteditable="true"]');
                if (summarySpan) {
                    block.foldTitle = (summarySpan.innerText || summarySpan.textContent || '').trim();
                }
                const contentDiv = el.querySelector('.toggle-content > div');
                if (contentDiv) {
                    let htmlText = contentDiv.innerHTML;
                    htmlText = htmlText.replace(/<br\s*[\/]?>/gi, '\n').replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '').replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '').replace(/&nbsp;/gi, ' ');
                    block.content = htmlText.replace(/^\n+|\n+$/g, '');
                    
                    let ta = document.getElementById(`textarea-${index}`);
                    if (ta && document.activeElement !== ta && document.activeElement !== el) {
                        ta.value = block.content;
                    }
                }
            } else if (block.type === 'postit') {
                const txtDiv = el.querySelectorAll('div')[1]; 
                if (txtDiv) {
                    let htmlText = txtDiv.innerHTML.replace(/<br\s*[\/]?>/gi, '\n').replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '').replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '').replace(/&nbsp;/gi, ' ');
                    block.content = htmlText.replace(/^\n+|\n+$/g, '');
                    let ta = document.getElementById(`textarea-${index}`);
                    if (ta && document.activeElement !== ta && document.activeElement !== el) { ta.value = block.content; }
                }
            } else if (block.type === 'polaroid') {
                const img = el.querySelector('img');
                if (img) block.content = img.src;
                
                const textContainer = el.children[2];
                if (textContainer) {
                    const txtDivs = textContainer.querySelectorAll('div');
                    if (txtDivs.length >= 2) {
                        block.polaroidDate = txtDivs[0].innerText || txtDivs[0].textContent;
                        block.polaroidCaption = txtDivs[1].innerText || txtDivs[1].textContent;
                    }
                }
            } else {
                let target = el;
                if (block.type === 'dday') {
                    target = el.querySelector('span');
                }

                if (target) {
                    let htmlText = target.innerHTML;
                    htmlText = htmlText.replace(/<br\s*[\/]?>/gi, '\n');
                    htmlText = htmlText.replace(/<div[^>]*>/gi, '\n');
                    htmlText = htmlText.replace(/<\/div>/gi, '');
                    htmlText = htmlText.replace(/<p[^>]*>/gi, '\n');
                    htmlText = htmlText.replace(/<\/p>/gi, '');
                    htmlText = htmlText.replace(/&nbsp;/gi, ' ');
                    htmlText = htmlText.replace(/^\n+|\n+$/g, ''); 
                    
                    block.content = htmlText;
                    
                    let ta = document.getElementById(`textarea-${index}`);
                    if (ta && document.activeElement !== ta && document.activeElement !== el) {
                        ta.value = block.content;
                    }
                }
            }
        }
    });
    
    updateOutput(true); 
    debounceSaveState(); 
}

function updateOutput(skipPreviewUpdate = false) {
    const mintTextColor = document.getElementById('mintTextColor').value || (isDarkMode ? '#B2E4D4' : '#459fa5');
    const pinkTextColor = document.getElementById('pinkTextColor').value || '#f5bdcc';
    const narrColor = document.getElementById('narrColor').value || (isDarkMode ? '#F9F9F8' : '#2c2c2e');
    const narrItalic = document.getElementById('narrItalic').checked ? 'italic' : 'normal';

    const cTitle = isDarkMode ? '#F9F9F8' : '#1c1c1e';
    const cStatusBg = isDarkMode ? '#242424' : '#fdfdfd';
    const cStatusBorder = isDarkMode ? '#444444' : '#eeeeee';
    const cStatusText = isDarkMode ? '#dddddd' : '#555555';
    const cBoxBg = isDarkMode ? '#2a2a2a' : '#ffffff';
    const cBoxBorder = isDarkMode ? '#444444' : '#f0f0f0';
    const cMuted = isDarkMode ? '#aaaaaa' : '#999999';
    const cMainText = isDarkMode ? '#F9F9F8' : '#444444';
    const cBadgeBg = isDarkMode ? '#444444' : '#f6f6f6';
    const cBadgeText = isDarkMode ? '#dddddd' : '#666666';
    const cAlertBg = isDarkMode ? '#2a2a2a' : '#fcfcfc';
    const cAlertBorder = isDarkMode ? '#555555' : '#cccccc';
    const cProgressBar = isDarkMode ? '#444444' : '#eeeeee';

    let innerContent = '';
    
    let hasBgm = false;
    let prevValidType = null;
    let lastCustomTextColor = null;
    let consecutivePostitCount = 0;

    innerContent += `<div class="preview-gap" onclick="insertEmptyLine(-1)" title="클릭하여 공백 줄 추가"><span>+ 공백 줄 추가</span></div>\n`;

    blocks.forEach((block, index) => {
        if (!block.content.trim() && !['html', 'bgm', 'empty', 'divider', 'polaroid', 'fold'].includes(block.type)) return;

        let curr = block.type;
        let isCurrDiag = ['mint', 'pink', 'mob', 'custom'].includes(curr);
        let isPrevDiag = prevValidType && ['mint', 'pink', 'mob', 'custom'].includes(prevValidType);
        
        let isCurrNarration = ['narration', 'thought'].includes(curr);
        let isPrevNarration = prevValidType && ['narration', 'thought'].includes(prevValidType);

        let isSameAsPrev = false;
        if (isCurrDiag && prevValidType === curr) {
            if (curr === 'custom') {
                if (lastCustomTextColor === block.customTextColor) isSameAsPrev = true;
            } else {
                isSameAsPrev = true;
            }
        }

        if (curr === 'postit') {
            consecutivePostitCount++;
        } else {
            consecutivePostitCount = 0;
        }

        let mt = '0px';
        if (curr !== 'empty' && curr !== 'divider') {
            if (prevValidType) {
                if ((isPrevDiag && isCurrNarration) || (isPrevNarration && isCurrDiag)) {
                    mt = '20px'; 
                } else if (isPrevDiag && isCurrDiag) {
                    mt = isSameAsPrev ? '4px' : '15px'; 
                } else if (isPrevNarration && isCurrNarration) {
                    mt = '4px';  
                } else {
                    mt = '15px'; 
                }
            }
        }

        let htmlStr = '';

        if (block.type === 'empty') {
            htmlStr = `<div id="preview-block-${index}" data-type="empty" class="empty-line-preview" onclick="focusAndScrollBlock(${index}, true)">공백 줄 (Enter)</div>\n`;
        } else if (block.type === 'divider') {
            let dStyle = block.content || 'solid-gray';
            let dividerInner = '';
            
            if (dStyle === 'solid-black') {
                dividerInner = `<div style="width: 100%; height: 1px; background-color: ${isDarkMode ? '#F9F9F8' : '#333333'};"></div>`;
            } else if (dStyle === 'solid-gray') {
                dividerInner = `<div style="width: 100%; height: 1px; background-color: ${isDarkMode ? '#555555' : '#e5e5ea'};"></div>`;
            } else if (dStyle === 'dashed-gray') {
                dividerInner = `<div style="width: 100%; border-top: 1px dashed ${isDarkMode ? '#666666' : '#c7c7cc'};"></div>`;
            } else if (dStyle === 'dots') {
                dividerInner = `<div style="display: flex; gap: 16px; align-items: center; justify-content: center;"><div style="width: 4px; height: 4px; background-color: ${isDarkMode ? '#666666' : '#aeaeb2'}; border-radius: 50%;"></div><div style="width: 4px; height: 4px; background-color: ${isDarkMode ? '#666666' : '#aeaeb2'}; border-radius: 50%;"></div><div style="width: 4px; height: 4px; background-color: ${isDarkMode ? '#666666' : '#aeaeb2'}; border-radius: 50%;"></div></div>`;
            } else if (dStyle === 'diamond') {
                dividerInner = `<div style="display: flex; align-items: center; width: 100%;"><div style="flex: 1; height: 1px; background-color: ${isDarkMode ? '#555555' : '#e5e5ea'};"></div><div style="width: 9px; height: 9px; border: 1px solid ${isDarkMode ? '#666666' : '#c7c7cc'}; background-color: transparent; transform: rotate(45deg); margin: 0 15px; box-sizing: border-box;"></div><div style="flex: 1; height: 1px; background-color: ${isDarkMode ? '#555555' : '#e5e5ea'};"></div></div>`;
            }
            
            htmlStr = `<div id="preview-block-${index}" data-type="divider" data-style="${dStyle}" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: 30px 0; padding: 0; box-sizing: border-box; display: flex; justify-content: center; align-items: center;">\n    ${dividerInner}\n</div>\n`;
        } else {
            let lines = block.content.split('\n').filter(l => l.trim() !== '' || curr === 'fold');
            let divContent = lines.map(l => applyTextStyles(l)).join('<br>');

            if (block.type === 'title') {
                htmlStr = `<div id="preview-block-${index}" data-type="title" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: ${mt === '0px' ? '15px' : mt} 0 0; padding: 10px 0; box-sizing: border-box; font-size: 18pt; font-weight: bold; text-align: left; color: ${cTitle}; word-break: keep-all;">\n    ${applyTextStyles(block.content)}\n</div>\n`;
            }
            else if (isCurrDiag) {
                let textColor;
                if (curr === 'mint') { textColor = mintTextColor; }
                else if (curr === 'pink') { textColor = pinkTextColor; }
                else if (curr === 'mob') { textColor = isDarkMode ? '#aaaaaa' : '#666666'; }
                else { textColor = block.customTextColor || (isDarkMode ? '#F9F9F8' : '#333333'); }

                htmlStr = `<div id="preview-block-${index}" data-type="${curr}" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: ${mt === '0px' ? '10px' : mt} 0 0; padding: 5px 0; box-sizing: border-box; color: ${textColor}; word-break: keep-all; text-align: left; line-height: 1.6;">\n    ${divContent}\n</div>\n`;
            }
            else if (block.type === 'bgm') {
                hasBgm = true;
                let vid = extractVideoId(block.bgmUrl);
                htmlStr = `<div id="preview-block-${index}" data-type="bgm" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: 10px 0; text-align: center; box-sizing: border-box;">\n    <div style="display: inline-flex; align-items: center; background-color: ${isDarkMode ? '#333' : '#ffffff'}; border: 1px solid ${isDarkMode ? '#444' : '#e5e5ea'}; border-radius: 20px; padding: 4px 12px; gap: 8px; font-size: 11px; color: ${isDarkMode ? '#ccc' : '#8e8e93'}; box-shadow: 0 1px 2px rgba(0,0,0,0.02); line-height: 1;">\n        <span style="display: flex; align-items: center; color: ${isDarkMode ? '#888' : '#aeaeb2'};">\n            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>\n        </span>\n        <span style="max-width: 120px; padding: 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${isDarkMode ? '#F9F9F8' : '#3a3a3c'};">${block.bgmTitle || 'BGM'}</span>\n        <span style="color: ${isDarkMode ? '#555' : '#d1d1d6'};">|</span>\n        <div style="display: flex; align-items: center; gap: 4px;">\n            <div onclick="playBGM('${vid}', '${block.bgmTitle}')" style="cursor: pointer; width: 18px; height: 18px; border-radius: 50%; background-color: ${isDarkMode ? '#444' : '#f2f2f7'}; display: flex; align-items: center; justify-content: center; transition: 0.2s;" title="재생">\n                <svg width="8" height="8" viewBox="0 0 24 24" fill="${isDarkMode ? '#F9F9F8' : '#3a3a3c'}"><path d="M8 5v14l11-7z"/></svg>\n            </div>\n            <div onclick="stopBGM()" style="cursor: pointer; width: 18px; height: 18px; border-radius: 50%; background-color: ${isDarkMode ? '#444' : '#f2f2f7'}; display: flex; align-items: center; justify-content: center; transition: 0.2s;" title="정지">\n                <svg width="7" height="7" viewBox="0 0 24 24" fill="${isDarkMode ? '#F9F9F8' : '#3a3a3c'}"><path d="M6 6h12v12H6z"/></svg>\n            </div>\n        </div>\n    </div>\n</div>\n`;
            }
            else if (block.type === 'status') {
                if (block.content.trim().startsWith('<div')) {
                    htmlStr = `<div id="preview-block-${index}" data-type="status" onclick="focusAndScrollBlock(${index}, true)" style="max-width: 500px; width: 100%; margin: 40px auto; padding: 15px 12px; background-color: ${cStatusBg}; border: 1px solid ${cStatusBorder}; border-radius: 6px; box-sizing: border-box; color: ${cStatusText};">\n${block.content}\n</div>\n`;
                } else {
                    let sData = {};
                    lines.forEach(line => {
                        let getVal = () => {
                            let idx = line.search(/[|:]/);
                            let rawText = idx !== -1 ? line.substring(idx+1).trim() : line.replace(/^.*? /, '').trim();
                            return applyTextStyles(rawText);
                        }
                        if (line.includes('🗓')) sData.date = getVal();
                        else if (line.includes('💍')) sData.ring = getVal();
                        else if (line.includes('📍')) sData.loc = getVal();
                        else if (line.includes('👕')) sData.outfit = getVal();
                        else if (line.includes('👥')) sData.state = getVal();
                        else if (line.includes('💭')) sData.thought = getVal();
                        else if (line.includes('🔔')) sData.alert = getVal();
                        else if (line.includes('🚨')) sData.guide = getVal();
                        else if (line.includes('💕')) sData.affection = getVal().replace(/뱅\s*→\s*(유이|민정)/g, '').replace(/호감도/g, '').replace(/^[|\s:]+/, '');
                        else if (line.includes('❤') || line.includes('🔥')) sData.nsfw = getVal();
                        else if (line.includes('🔫')) sData.tmi = getVal();
                        else if (line.includes('✏')) sData.doodle = getVal();
                        else if (line.includes('📰')) sData.interview = getVal();
                        else if (line.includes('💘')) sData.relation = getVal();
                    });

                    let statusHtml = `<div id="preview-block-${index}" data-type="status" onclick="focusAndScrollBlock(${index}, true)" style="max-width: 500px; width: 100%; margin: 40px auto; padding: 15px 12px; background-color: ${cStatusBg}; border: 1px solid ${cStatusBorder}; border-radius: 6px; box-sizing: border-box; color: ${cStatusText};">`;

                    if (sData.date || sData.loc) {
                        let dateHtml = '<div></div>';
                        if (sData.date) {
                            let parts = sData.date.split('/');
                            let mainDate = parts[0]?.trim() || '';
                            let subDate = parts[1]?.trim() || '';
                            dateHtml = `
                            <div>
                              <div style="font-size: 12px; color: ${cMainText};">🗓️ ${mainDate}</div>
                              ${subDate ? `<div style="font-size: 11px; color: ${cMuted}; margin-top: 2px;">${subDate}</div>` : ''}
                            </div>`;
                        }
                        let locHtml = '<div></div>';
                        if (sData.loc) {
                            locHtml = `
                            <div style="text-align: right; font-size: 12px; color: ${cMainText};">
                              📍 ${sData.loc}
                            </div>`;
                        }
                        statusHtml += `\n                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${cBoxBorder}; padding-bottom: 8px; margin-bottom: 8px;">\n                        ${dateHtml}\n                        ${locHtml}\n                    </div>`;
                    }

                    if (sData.ring) {
                        statusHtml += `\n                    <div style="font-size: 11px; color: ${cStatusText}; margin-bottom: 10px; line-height: 1.5; word-break: break-all;">\n                        ${sData.ring}\n                    </div>`;
                    }

                    if (sData.outfit) {
                        if (sData.outfit.includes('/')) {
                            let parts = sData.outfit.split('/');
                            let p1 = parts[0].trim();
                            let p2 = parts.slice(1).join('/').trim();
                            statusHtml += `\n                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin-bottom: 10px;">\n                        <div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; padding: 8px 10px; border-radius: 4px; box-sizing: border-box;">\n                          <div style="font-size: 11px; color: ${cMuted}; margin-bottom: 2px;">👕 OUTFIT</div>\n                          <div style="font-size: 12px; color: ${cMainText}; line-height: 1.4;">${p1}</div>\n                        </div>\n                        <div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; padding: 8px 10px; border-radius: 4px; box-sizing: border-box;">\n                          <div style="font-size: 11px; color: ${cMuted}; margin-bottom: 2px;">👕 OUTFIT</div>\n                          <div style="font-size: 12px; color: ${cMainText}; line-height: 1.4;">${p2}</div>\n                        </div>\n                    </div>`;
                        } else {
                            statusHtml += `\n                    <div style="margin-bottom: 10px;">\n                        <div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; padding: 8px 10px; border-radius: 4px; box-sizing: border-box;">\n                          <div style="font-size: 11px; color: ${cMuted}; margin-bottom: 2px;">👕 OUTFIT</div>\n                          <div style="font-size: 12px; color: ${cMainText}; line-height: 1.4;">${sData.outfit}</div>\n                        </div>\n                    </div>`;
                        }
                    }

                    if (sData.state || sData.thought) {
                        statusHtml += `\n                    <div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; border-radius: 4px; padding: 10px; margin-bottom: 10px; box-sizing: border-box;">`;
                        if (sData.state) {
                            statusHtml += `\n                        <div style="${sData.thought ? 'margin-bottom: 8px;' : ''}">\n                          <span style="font-size: 11px; background-color: ${cBadgeBg}; color: ${cBadgeText}; padding: 2px 4px; border-radius: 2px;">👥 STATE</span>\n                          <div style="margin-top: 4px; font-size: 12px; color: ${cMainText}; line-height: 1.5;">${sData.state}</div>\n                        </div>`;
                        }
                        if (sData.state && sData.thought) {
                            statusHtml += `\n                        <hr style="border: 0; border-top: 1px dashed ${cBoxBorder}; margin: 8px 0;">`;
                        }
                        if (sData.thought) {
                            statusHtml += `\n                        <div>\n                          <span style="font-size: 11px; background-color: ${cBadgeBg}; color: ${cBadgeText}; padding: 2px 4px; border-radius: 2px;">💭 INNER THOUGHT</span>\n                          <div style="margin-top: 4px; font-size: 12px; color: ${cStatusText}; font-style: italic; line-height: 1.5;">${sData.thought}</div>\n                        </div>`;
                        }
                        statusHtml += `\n                    </div>`;
                    }

                    if (sData.alert || sData.guide || sData.affection) {
                        statusHtml += `\n                    <div style="background-color: ${cAlertBg}; border-left: 3px solid ${cAlertBorder}; padding: 8px 10px; margin-bottom: 10px; box-sizing: border-box;">`;
                        if (sData.alert) {
                            statusHtml += `\n                        <div style="font-size: 12px; color: ${cStatusText}; margin-bottom: ${(sData.guide || sData.affection) ? '6px' : '0'};">\n                          <span class="bell">🔔</span> ${sData.alert}\n                        </div>`;
                        }
                        if (sData.guide) {
                            let parts = sData.guide.split('|').map(s=>s.trim());
                            let val = parts[0] || '0%';
                            let state = parts[1] || '';
                            let desc = parts[2] || '';
                            let num = val.replace(/[^0-9]/g, '');
                            statusHtml += `\n                        <div style="margin-bottom: ${sData.affection ? '6px' : '0'};">\n                          <div style="display: flex; justify-content: space-between; font-size: 11px; color: ${cMuted}; margin-bottom: 3px;">\n                            <span>🚨 가이딩 필요 수치</span>\n                            <span>${val} ${state ? `(${state})` : ''}</span>\n                          </div>\n                          <div style="background-color: ${cProgressBar}; height: 4px; border-radius: 2px; overflow: hidden;">\n                            <div style="width: ${num}%; height: 100%; background-color: #A8E6CF;"></div>\n                          </div>\n                          ${desc ? `<div style="font-size: 10px; color: ${cMuted}; margin-top: 2px; text-align: right;">${desc}</div>` : ''}\n                        </div>`;
                        }
                        if (sData.affection) {
                            let val = sData.affection;
                            let mainVal = val;
                            let bracketText = '';
                            if (val.includes('(')) {
                                let parenIdx = val.indexOf('(');
                                mainVal = val.substring(0, parenIdx).trim();
                                bracketText = val.substring(parenIdx).trim();
                            }
                            let num = (mainVal === 'MAX' || mainVal.includes('∞')) ? '100' : mainVal.replace(/[^0-9]/g, '');
                            
                            statusHtml += `\n                        <div>\n                          <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: ${cMuted}; margin-bottom: 6px;">\n                            <span style="margin-bottom: 2px;">💕 호감도</span>\n                            <div style="text-align: right;">\n                              <div style="color: #E598A6; font-weight: bold; font-size: 12px;">${mainVal}</div>\n                              ${bracketText ? `<div style="font-size: 10.5px; color: ${cMuted}; margin-top: 3px; font-weight: normal; word-break: break-all;">${bracketText}</div>` : ''}\n                            </div>\n                          </div>\n                          <div style="background-color: ${cProgressBar}; height: 4px; border-radius: 2px; overflow: hidden;">\n                            <div style="width: ${num}%; height: 100%; background-color: #FFB6C1;"></div>\n                          </div>\n                        </div>`;
                        }
                        statusHtml += `\n                    </div>`;
                    }

                    if (sData.nsfw || sData.tmi) {
                        let gridCols = (sData.nsfw && sData.tmi) ? '110px 1fr' : '1fr';
                        statusHtml += `\n                    <div style="display: grid; grid-template-columns: ${gridCols}; gap: 8px; margin-bottom: 10px;">`;
                        if (sData.nsfw) {
                            statusHtml += `\n                        <div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; padding: 8px 10px; border-radius: 4px; box-sizing: border-box;">\n                          <div style="font-size: 11px; color: ${cMuted}; margin-bottom: 2px;">❤️‍🔥 NSFW COUNT</div>\n                          <div style="font-size: 12px; color: ${cMainText};">${sData.nsfw}</div>\n                        </div>`;
                        }
                        if (sData.tmi) {
                            statusHtml += `\n                        <div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; padding: 8px 10px; border-radius: 4px; box-sizing: border-box;">\n                          <div style="font-size: 11px; color: ${cMuted}; margin-bottom: 2px;">🔫 TMI</div>\n                          <div style="font-size: 12px; color: ${cMainText}; line-height: 1.4;">${sData.tmi}</div>\n                        </div>`;
                        }
                        statusHtml += `\n                    </div>`;
                    }

                    if (sData.interview || sData.relation) {
                        statusHtml += `\n                    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">`;
                        if (sData.interview) {
                            let ivText = sData.interview.replace(/^(PC에 대한 랜덤 인터뷰|랜덤 인터뷰|인터뷰)/i, '').replace(/^[|\s:]+/, '');
                            ivText = ivText.replace(/\s*(A\.)/g, '<br><br>$1').replace(/^(<br>)+/, '');
                            statusHtml += `\n                        <div style="background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'}; border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}; padding: 10px 12px; border-radius: 4px; box-sizing: border-box; border-left: 3px solid ${isDarkMode ? '#475569' : '#94a3b8'};">\n                          <div style="font-size: 11px; color: ${isDarkMode ? '#94a3b8' : '#64748b'}; margin-bottom: 4px; font-weight: bold;">📰 INTERVIEW</div>\n                          <div style="font-size: 12px; color: ${isDarkMode ? '#e2e8f0' : '#334155'}; line-height: 1.5; font-style: italic;">${ivText}</div>\n                        </div>`;
                        }
                        if (sData.relation) {
                            let relText = sData.relation.replace(/^(뱅이 생각하는 PC와의 관계|뱅이 생각하는 관계|PC와의 관계|관계)/i, '').replace(/^[|\s:]+/, '');
                            statusHtml += `\n                        <div style="background-color: ${isDarkMode ? '#4c0519' : '#fff0f2'}; border: 1px solid ${isDarkMode ? '#881337' : '#ffe4e6'}; padding: 10px 12px; border-radius: 4px; box-sizing: border-box; border-left: 3px solid ${isDarkMode ? '#e11d48' : '#fecdd3'};">\n                          <div style="font-size: 11px; color: ${isDarkMode ? '#fda4af' : '#e11d48'}; margin-bottom: 4px; font-weight: bold;">💘</div>\n                          <div style="font-size: 12px; color: ${isDarkMode ? '#ffe4e6' : '#4c0519'}; line-height: 1.5;">${relText}</div>\n                        </div>`;
                        }
                        statusHtml += `\n                    </div>`;
                    }

                    if (sData.doodle) {
                        statusHtml += `\n                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid ${cBoxBorder}; text-align: center; width: 100%; box-sizing: border-box;">\n                      <span style="font-size: 12px; color: ${cMuted}; display: inline-block;">\n                        ${sData.doodle}\n                      </span>\n                    </div>`;
                    }

                    statusHtml += `\n</div>\n`;
                    htmlStr = statusHtml;
                }
            }
            else if (block.type === 'narration') {
                htmlStr = `<div id="preview-block-${index}" data-type="narration" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: ${mt === '0px' ? '4px' : mt} 0 0; padding: 5px 0; box-sizing: border-box; color: ${narrColor}; font-style: ${narrItalic}; word-break: keep-all; text-align: left; line-height: 1.6;">\n    ${lines.join('<br>')}\n</div>\n`;
            }
            else if (block.type === 'thought') {
                htmlStr = `<div id="preview-block-${index}" data-type="thought" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: ${mt === '0px' ? '4px' : mt} 0 0; padding: 5px 0; box-sizing: border-box; color: ${isDarkMode ? '#8e8e93' : '#8e8e93'}; font-style: italic; word-break: keep-all; text-align: left; line-height: 1.6;">\n    ${lines.join('<br>')}\n</div>\n`;
            }
            else if (block.type === 'dday') {
                htmlStr = `<div id="preview-block-${index}" data-type="dday" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: 20px 0; text-align: left; padding: 0; box-sizing: border-box;">\n    <span style="font-size: 13px; color: ${cMuted}; font-weight: 600;"> ${applyTextStyles(block.content)}</span>\n</div>\n`;
            }
            else if (block.type === 'postit') {
                let isEven = consecutivePostitCount % 2 === 0;
                
                let bgStr = isDarkMode ? (isEven ? '#333333' : '#2A2A2A') : (isEven ? '#F4F4F6' : '#FAFAFA');
                let borderStr = isDarkMode ? '#555555' : (isEven ? '#D1D1D6' : '#E5E5EA');
                let textStr = isDarkMode ? '#dddddd' : '#333333';
                let rotStr = isEven ? 'rotate(1.2deg)' : 'rotate(-1.5deg)';
                let zIdxStr = isEven ? 'z-index: 2;' : '';
                let shadowStr = isDarkMode ? 'box-shadow: 2px 3px 8px rgba(0,0,0,0.3);' : (isEven ? 'box-shadow: 3px 4px 10px rgba(0,0,0,0.05);' : 'box-shadow: 2px 3px 8px rgba(0,0,0,0.04);');
                
                let tapeBg = isEven ? 'rgba(211, 211, 218, 0.5)' : 'rgba(229, 229, 234, 0.6)';
                if (isDarkMode) tapeBg = isEven ? 'rgba(80, 80, 85, 0.5)' : 'rgba(100, 100, 105, 0.6)';
                let tapeRot = isEven ? 'rotate(-3deg)' : 'rotate(1deg)';
                let tapePos = isEven ? 'left: 45%; top: -10px; width: 75px; height: 20px;' : 'left: 50%; top: -12px; width: 70px; height: 22px;';

                htmlStr = `<div id="preview-block-${index}" data-type="postit" onclick="focusAndScrollBlock(${index}, true)" style="margin: 25px auto 40px; max-width: 450px; background: ${bgStr}; color: ${textStr}; padding: 24px 24px 20px; ${shadowStr} border-radius: 1px; transform: ${rotStr}; position: relative; border-top: 1px solid ${borderStr}; word-break: break-all; ${zIdxStr}">\n    <div style="position: absolute; ${tapePos} transform: translateX(-50%) ${tapeRot}; background: ${tapeBg}; border-left: 1px dashed rgba(0,0,0,0.05); border-right: 1px dashed rgba(0,0,0,0.05); pointer-events: none;"></div>\n    <div class="postit-scroll" style="line-height: 1.7; font-size: 14px;">${divContent}</div>\n</div>\n`;
            }
            else if (block.type === 'polaroid') {
                let bgStr = isDarkMode ? '#242424' : '#FFFFFF';
                let borderStr = isDarkMode ? '#444444' : '#E5E5EA';
                let imgBgStr = isDarkMode ? '#111111' : '#F2F2F7';
                let dateColor = isDarkMode ? '#888888' : '#AFAFB4';
                let capColor = isDarkMode ? '#eeeeee' : '#1C1C1E';
                let tapeBg = isDarkMode ? 'rgba(80, 80, 85, 0.5)' : 'rgba(235, 235, 240, 0.7)';
                
                let imgSrc = block.content || '[https://via.placeholder.com/380x380?text=Polaroid+Image](https://via.placeholder.com/380x380?text=Polaroid+Image)';
                let pDate = applyTextStyles(block.polaroidDate || '2026. 06. 29');
                let pCap = applyTextStyles(block.polaroidCaption || '그날의 기억...');

                htmlStr = `<div id="preview-block-${index}" data-type="polaroid" onclick="focusAndScrollBlock(${index}, true)" style="margin: 45px auto 25px; max-width: 380px; background: ${bgStr}; border: 1px solid ${borderStr}; box-shadow: 0 4px 12px rgba(0,0,0,0.04); padding: 16px 16px 24px 16px; border-radius: 1px; display: flex; flex-direction: column; gap: 14px; transform: rotate(1.5deg); position: relative;">\n    <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%) rotate(-2deg); width: 80px; height: 20px; background: ${tapeBg}; border-left: 1px dashed rgba(0,0,0,0.04); border-right: 1px dashed rgba(0,0,0,0.04); pointer-events: none;"></div>\n    <div style="width: 100%; overflow: hidden; background-color: ${imgBgStr}; display: flex; justify-content: center; align-items: center;">\n        <img src="${imgSrc}" style="width: 100%; height: auto; display: block; object-fit: contain;" alt="Polaroid Photo">\n    </div>\n    <div style="display: flex; flex-direction: column; gap: 5px; padding: 2px 4px 0;">\n        <div style="font-size: 11px; color: ${dateColor}; font-weight: 600; letter-spacing: 0.02em;">${pDate}</div>\n        <div style="font-size: 13px; color: ${capColor}; line-height: 1.5; font-style: italic; word-break: break-all;">${pCap}</div>\n    </div>\n</div>\n`;
            }
            else if (block.type === 'image') {
                htmlStr = `<div id="preview-block-${index}" data-type="image" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: 15px 0; text-align: center; box-sizing: border-box;">\n    <img src="${block.content}" style="max-width: 100%; border-radius: 8px;" alt="image">\n</div>\n`;
            }
            else if (block.type === 'fold') {
                let fStyle = block.foldStyle || 'notion';
                let fTitle = block.foldTitle || '지문이나 비밀 단서 접어두기 (클릭하여 수정 가능)';
                let fTitleStyled = applyTextStyles(fTitle);
                
                let detailsStyle = '';
                let summaryHtml = '';
                let contentWrapStyle = '';
                let contentInnerStyle = '';

                if (fStyle === 'notion') {
                    detailsStyle = `width: 100%; margin: 20px 0; padding: 4px 0; box-sizing: border-box; text-align: left;`;
                    summaryHtml = `<summary style="cursor: pointer; font-size: 14px; font-weight: 600; color: ${isDarkMode?'#F9F9F8':'#1c1c1e'}; display: flex; align-items: center; gap: 6px; user-select: none; outline: none;">
                        <span class="toggle-arrow" style="font-size: 9px; color: ${isDarkMode?'#aaaaaa':'#8e8e93'}; transition: transform 0.2s ease; display: inline-block;">▶</span>
                        <span contenteditable="true" style="outline: none; word-break: break-all; flex: 1;">${fTitleStyled}</span>
                    </summary>`;
                    contentWrapStyle = `padding: 12px 0 4px 18px; margin-top: 4px; border-left: 1px solid ${isDarkMode?'#444444':'#e5e5ea'}; box-sizing: border-box;`;
                    contentInnerStyle = `color: ${isDarkMode?'#dddddd':'#444444'}; font-size: 14px; line-height: 1.6;`;
                } else if (fStyle === 'panel') {
                    detailsStyle = `width: 100%; margin: 24px 0; padding: 14px 20px; background-color: ${isDarkMode?'#2a2a2a':'#ffffff'}; border: 1px solid ${isDarkMode?'#444444':'#e5e5ea'}; border-radius: 16px; box-sizing: border-box; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.01);`;
                    summaryHtml = `<summary style="cursor: pointer; font-size: 14px; font-weight: 600; color: ${isDarkMode?'#F9F9F8':'#3a3a3c'}; display: flex; align-items: center; justify-content: space-between; user-select: none; outline: none;">
                        <span contenteditable="true" style="outline: none; word-break: break-all; color: ${isDarkMode?'#F9F9F8':'#1c1c1e'}; flex: 1;">${fTitleStyled}</span>
                        <div class="toggle-btn-icon" style="background-color: ${isDarkMode?'#444444':'#f2f2f7'}; padding: 6px 12px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: ${isDarkMode?'#cccccc':'#8e8e93'}; transition: transform 0.2s ease; margin-left: 10px;">▼</div>
                    </summary>`;
                    contentWrapStyle = `padding-top: 14px; margin-top: 12px; border-top: 1px dashed ${isDarkMode?'#444444':'#e5e5ea'}; box-sizing: border-box;`;
                    contentInnerStyle = `color: ${isDarkMode?'#dddddd':'#444444'}; font-size: 14px; line-height: 1.6;`;
                } else if (fStyle === 'more') {
                    detailsStyle = `width: 100%; margin: 24px 0; padding: 16px 20px; background-color: ${isDarkMode?'#2a2a2a':'#ffffff'}; border: 1px solid ${isDarkMode?'#444444':'#e5e5ea'}; border-radius: 14px; box-sizing: border-box; text-align: left;`;
                    summaryHtml = `<summary style="cursor: pointer; font-size: 14px; font-weight: 600; color: ${isDarkMode?'#F9F9F8':'#1c1c1e'}; display: flex; align-items: center; gap: 10px; user-select: none; outline: none;">
                        <div style="width: 22px; height: 22px; background-color: ${isDarkMode?'#444444':'#e5e5ea'}; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 13px; color: ${isDarkMode?'#cccccc':'#636366'}; font-weight: bold; line-height: 1; flex-shrink: 0;">+</div>
                        <span contenteditable="true" style="outline: none; color: ${isDarkMode?'#dddddd':'#636366'}; word-break: break-all; flex: 1;">${fTitleStyled}</span>
                    </summary>`;
                    contentWrapStyle = `padding: 14px 4px 2px; box-sizing: border-box;`;
                    contentInnerStyle = `color: ${isDarkMode?'#dddddd':'#444444'}; font-size: 14px; line-height: 1.6;`;
                } else if (fStyle === 'border') {
                    detailsStyle = `width: 100%; margin: 28px 0; padding: 10px 4px; border-top: 1px solid ${isDarkMode?'#555555':'#e5e5ea'}; border-bottom: 1px solid ${isDarkMode?'#555555':'#e5e5ea'}; box-sizing: border-box; text-align: left;`;
                    summaryHtml = `<summary style="cursor: pointer; font-size: 13px; font-weight: 600; color: ${isDarkMode?'#aaaaaa':'#8e8e93'}; display: flex; align-items: center; gap: 8px; user-select: none; outline: none; letter-spacing: 0.02em;">
                        <span style="font-size: 9px; color: ${isDarkMode?'#666666':'#aeaeb2'};">◆</span>
                        <span contenteditable="true" style="outline: none; color: ${isDarkMode?'#dddddd':'#636366'}; word-break: break-all; flex: 1;">${fTitleStyled}</span>
                    </summary>`;
                    contentWrapStyle = `padding: 10px 4px 2px; box-sizing: border-box;`;
                    contentInnerStyle = `color: ${isDarkMode?'#cccccc':'#636366'}; font-size: 13px; line-height: 1.6; font-style: italic;`;
                }

                htmlStr = `<details id="preview-block-${index}" data-type="fold" data-style="${fStyle}" onclick="focusAndScrollBlock(${index}, true)" style="${detailsStyle}">\n    ${summaryHtml}\n    <div class="toggle-content" style="${contentWrapStyle}">\n        <div style="${contentInnerStyle}">${divContent}</div>\n    </div>\n</details>\n`;
            }
            else if (block.type === 'html') {
                htmlStr = `<div id="preview-block-${index}" data-type="html" onclick="focusAndScrollBlock(${index}, true)">\n${block.content}\n</div>\n`;
            }
        }

        innerContent += htmlStr;
        innerContent += `<div class="preview-gap" onclick="insertEmptyLine(${index})" title="클릭하여 공백 줄 추가"><span>+ 공백 줄 추가</span></div>\n`;

        if (curr !== 'empty' && curr !== 'bgm' && curr !== 'html' && curr !== 'divider') {
            prevValidType = curr;
            if (curr === 'custom') lastCustomTextColor = block.customTextColor;
        }
    });
    
    if (hasBgm) {
        innerContent += `
<iframe id="bgmPlayerFrame" src="[https://loading-lovebullets.naru.pub/editor/bgm.html](https://loading-lovebullets.naru.pub/editor/bgm.html)" style="position: fixed; bottom: 20px; right: 20px; width: 32px; height: 32px; border: none; z-index: 9999; background: transparent; transition: 0.3s;" allow="autoplay"></iframe>
<script>
window.addEventListener('message', function(e) {
    var frame = document.getElementById('bgmPlayerFrame');
    if (!frame) return;
    if (e.data.action === 'minimize') {
        frame.style.width = '32px';
        frame.style.height = '32px';
    } else if (e.data.action === 'expand') {
        frame.style.width = '240px';
        frame.style.height = '140px';
    }
});

function playBGM(videoId, title) {
    var frame = document.getElementById('bgmPlayerFrame');
    if (frame) {
        frame.contentWindow.postMessage({ action: 'playBGM', videoId: videoId, title: title }, '*');
    }
}

function stopBGM() {
    var frame = document.getElementById('bgmPlayerFrame');
    if (frame) {
        frame.src = frame.src; 
    }
}
<\/script>\n`;
    }

    let globalStyle = `
<style>
/* 폰트 및 전체 스타일 일괄 설정 */
@import url('[https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&display=swap](https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&display=swap)');
@import url('[https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css](https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css)');

.tistory-post-wrapper {
    font-family: ${currentFontFamily};
    font-size: ${currentFontSize}px;
    line-height: 1.6;
    word-break: keep-all;
    padding: 0 25px;
    box-sizing: border-box;
    max-width: 600px;
    margin: 0 auto;
    ${isDarkMode ? 'background-color: #1B1B1B; color: #F9F9F8;' : ''}
}
.tistory-post-wrapper * { box-sizing: border-box; }
/*나레이션 간격*/
[data-type="narration"] {
    margin-bottom: 3px !important;
    word-break: break-all !important;
}
/* 포스트잇 내부 내용 길어질 때 스크롤 */
.postit-scroll {
    max-height: 350px;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 8px;
}
.postit-scroll::-webkit-scrollbar { width: 5px; }
.postit-scroll::-webkit-scrollbar-track { background: transparent; }
.postit-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
/* 접은글(Details) 기호 회전 및 공통 스타일 설정 */
details[data-style="notion"][open] .toggle-arrow { transform: rotate(90deg) !important; }
details[data-style="panel"][open] .toggle-btn-icon { transform: rotate(180deg) !important; }
details[data-type="fold"] summary::-webkit-details-marker { display: none; }
details[data-type="fold"] summary { list-style: none; }
</style>
`;

    let previewHtml = globalStyle + `<div class="tistory-post-wrapper">\n` + innerContent + `</div>\n`;
    
    let cleanInnerContent = innerContent
        .replace(/<div class="preview-gap"[^>]*>.*?<\/div>\n?/g, '')
        .replace(/<div id="preview-block-\d+" data-type="empty"[^>]*>.*?<\/div>\n?/g, '<div style="height: 30px;"></div>\n')
        .replace(/ id="preview-block-\d+"/g, '')
        .replace(/ onclick="focusAndScrollBlock\(\d+, true\)"/g, ''); 
    
    let finalHtml = '';
    
    if (outputVersion === 1) {
        finalHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🐇</title>
<style>
    body { margin: 0; padding: 0; background-color: transparent; overflow-x: hidden; }
</style>
</head>
<body>
${globalStyle}
<div id="content-wrapper" class="tistory-post-wrapper">
${cleanInnerContent}
</div>
</body>
</html>`;
    } else {
        finalHtml = globalStyle + cleanInnerContent;
    }

    if (!skipPreviewUpdate) {
        document.getElementById('htmlPreview').innerHTML = previewHtml;
    }
    document.getElementById('finalHtmlCode').value = finalHtml;
}

function importFromHtml() {
    const htmlText = document.getElementById('finalHtmlCode').value;
    if (!htmlText.trim()) {
        showToast('불러올 HTML 코드를 입력해주세요.');
        return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlText;

    let container = tempDiv.querySelector('#content-wrapper') || tempDiv.querySelector('body') || tempDiv;
    const newBlocks = [];

    let foundMint = false;
    let foundPink = false;
    let foundNarr = false;

    function rgbToHex(rgb) {
        if (!rgb) return '';
        if (rgb.startsWith('#')) return rgb.toUpperCase();
        let match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return rgb;
        return "#" + (1 << 24 | match[1] << 16 | match[2] << 8 | match[3]).toString(16).slice(1).toUpperCase();
    }

    Array.from(container.children).forEach(child => {
        if (['STYLE', 'SCRIPT', 'IFRAME', 'LINK', 'META', 'TITLE'].includes(child.tagName)) return;

        let type = child.getAttribute('data-type');
        let content = '';
        let customTextColor = '#333333';
        let bgmTitle = '';
        let bgmUrl = '';
        let polaroidDate = '';
        let polaroidCaption = '';
        let foldStyle = 'notion';
        let foldTitle = '접은글';
        
        let outerHtml = child.outerHTML;
        let innerTextClean = (child.textContent || "").replace(/\s+/g, '');

        if (!type) {
            if (outerHtml.includes('playBGM')) {
                type = 'bgm';
            } else if (outerHtml.includes('max-width: 500px') && (outerHtml.includes('#fdfdfd') || outerHtml.includes('상태창') || outerHtml.includes('INNER THOUGHT') || outerHtml.includes('#242424'))) {
                type = 'status'; 
            } else if (child.style.fontStyle === 'italic' && (child.style.color === 'rgb(119, 119, 119)' || child.style.color === 'rgb(142, 142, 147)')) {
                type = 'thought';
            } else if (child.style.color === 'rgb(69, 159, 165)' || child.style.color === 'rgb(178, 228, 212)') {
                type = 'mint';
            } else if (child.style.color === 'rgb(245, 189, 204)') {
                type = 'pink';
            } else if (child.querySelector('img') && !outerHtml.includes('border-radius: 50%') && !outerHtml.includes('Polaroid')) {
                type = 'image';
            } else if (outerHtml.includes('font-weight: bold') && child.style.textAlign === 'left') {
                type = 'title';
            } else if (outerHtml.includes('color: #8e8e93') || outerHtml.includes('0.8em') || outerHtml.includes('13px')) {
                type = 'dday';
            } else if (outerHtml.includes('background-color: #333333') || outerHtml.includes('background-color: #e5e5ea') || outerHtml.includes('rotate(45deg)') || outerHtml.includes('dashed')) {
                type = 'divider';
            } else if (outerHtml.includes('data-type="postit"') || outerHtml.includes('max-width: 450px') && outerHtml.includes('rotate(') && !outerHtml.includes('Polaroid')) {
                type = 'postit';
            } else if (outerHtml.includes('data-type="polaroid"') || outerHtml.includes('Polaroid')) {
                type = 'polaroid';
            } else if (outerHtml.includes('data-type="fold"') || child.tagName === 'DETAILS') {
                type = 'fold';
            } else if (innerTextClean === '' && !child.querySelector('img')) {
                type = 'empty';
            } else {
                type = 'narration';
            }
        }

        if (type === 'divider') {
            let styleMatch = child.getAttribute('data-style');
            content = styleMatch || 'solid-gray';
        } else if (['mint', 'pink', 'mob', 'custom'].includes(type)) {
            let rawHtml = child.innerHTML;
            rawHtml = rawHtml.replace(/<br\s*[\/]?>/gi, '\n').replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '').replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '').replace(/&nbsp;/gi, ' ');
            content = rawHtml.replace(/^\n+|\n+$/g, '');
            
            let textHex = rgbToHex(child.style.color);

            if (type === 'mint') {
                if (!foundMint) {
                    if (textHex) { document.getElementById('mintTextColor').value = textHex; document.getElementById('mintTextColorPicker').value = textHex; }
                    foundMint = true;
                }
            } else if (type === 'pink') {
                if (!foundPink) {
                    if (textHex) { document.getElementById('pinkTextColor').value = textHex; document.getElementById('pinkTextColorPicker').value = textHex; }
                    foundPink = true;
                }
            } else if (type === 'custom') {
                customTextColor = textHex || '#333333';
            }
        } else if (type === 'thought') {
            let rawHtml = child.innerHTML.replace(/<br\s*[\/]?>/gi, '\n').replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '').replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '').replace(/&nbsp;/gi, ' ');
            content = rawHtml.replace(/^\n+|\n+$/g, '');
        } else if (type === 'title') {
            let rawHtml = child.innerHTML.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**').replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
            let tDiv = document.createElement('div');
            tDiv.innerHTML = rawHtml;
            content = (tDiv.textContent || tDiv.innerText || "").trim();
        } else if (type === 'postit') {
            const txtDiv = child.querySelectorAll('div')[1];
            if (txtDiv) {
                let rawHtml = txtDiv.innerHTML.replace(/<br\s*[\/]?>/gi, '\n');
                content = rawHtml.replace(/^\n+|\n+$/g, '').replace(/<[^>]*>?/gm, ''); 
            }
        } else if (type === 'polaroid') {
            const img = child.querySelector('img');
            if (img) content = img.src;
            
            const textContainer = child.children[2];
            if (textContainer) {
                const txtDivs = textContainer.querySelectorAll('div');
                if (txtDivs.length >= 2) {
                    polaroidDate = txtDivs[0].textContent || '';
                    polaroidCaption = txtDivs[1].textContent || '';
                }
            }
        } else if (type === 'fold') {
            foldStyle = child.getAttribute('data-style') || 'notion';
            const summarySpan = child.querySelector('summary span[contenteditable="true"]');
            if (summarySpan) {
                let rawHtml = summarySpan.innerHTML.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**').replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
                let tDiv = document.createElement('div');
                tDiv.innerHTML = rawHtml;
                foldTitle = (tDiv.textContent || tDiv.innerText || "").trim();
            }
            
            const contentDiv = child.querySelector('.toggle-content > div');
            if (contentDiv) {
                let rawHtml = contentDiv.innerHTML.replace(/<br\s*[\/]?>/gi, '\n').replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '').replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '').replace(/&nbsp;/gi, ' ');
                content = rawHtml.replace(/^\n+|\n+$/g, '');
            }
        } else if (type === 'narration') {
            let rawHtml = child.innerHTML.replace(/<br\s*[\/]?>/gi, '\n').replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '').replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '').replace(/&nbsp;/gi, ' ');
            content = rawHtml.replace(/^\n+|\n+$/g, '');

            if (!foundNarr) {
                let nColor = rgbToHex(child.style.color);
                if (nColor) {
                    document.getElementById('narrColor').value = nColor;
                    document.getElementById('narrColorPicker').value = nColor;
                }
                document.getElementById('narrItalic').checked = child.style.fontStyle === 'italic';
                foundNarr = true;
            }
        } else if (type === 'dday') {
            let rawHtml = child.innerHTML.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**').replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
            let tDiv = document.createElement('div');
            tDiv.innerHTML = rawHtml;
            content = (tDiv.textContent || tDiv.innerText || "").trim();
        } else if (type === 'status' || type === 'html') {
            content = child.innerHTML.trim(); 
        } else if (type === 'bgm') {
            const titleSpan = child.querySelector('span[style*="max-width: 120px"]');
            if (titleSpan) bgmTitle = titleSpan.textContent.trim();
            
            const playDiv = child.querySelector('div[onclick*="playBGM"]');
            if (playDiv) {
                const match = playDiv.getAttribute('onclick').match(/playBGM\('([^']+)'/);
                if (match) bgmUrl = '[https://youtu.be/](https://youtu.be/)' + match[1];
            }
        } else if (type === 'image') {
            const img = child.querySelector('img');
            if (img) content = img.src;
        } else if (type === 'empty') {
            content = '';
        }

        if (type === 'narration' && !content) type = 'empty'; 

        newBlocks.push({
            type: type,
            content: content || '',
            customTextColor: customTextColor,
            bgmTitle: bgmTitle,
            bgmUrl: bgmUrl,
            polaroidDate: polaroidDate,
            polaroidCaption: polaroidCaption,
            foldStyle: foldStyle,
            foldTitle: foldTitle
        });
    });

    if (newBlocks.length > 0) {
        blocks = newBlocks;
        renderEditor();
        saveState(); 
    } else {
        showToast('유효한 블록이 없습니다. 코드를 확인해주세요.');
    }
}

function copyHtml() {
    const code = document.getElementById('finalHtmlCode');
    code.select();
    document.execCommand('copy');
}
