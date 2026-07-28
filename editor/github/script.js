// ==========================================
// script.js
// 전역 상태 관리, 히스토리(Undo/Redo), 블록 데이터 조작 전용
// ==========================================

// == 전역 상태 변수 ==
let blocks = [];
let outputVersion = 1; 
let outputMode = 'novel'; // 💡 기본 출력 모드 (novel / bubble)
let isDarkMode = false;
let currentFontSize = 14;
let currentFontFamily = "'Noto Serif KR', serif";
let currentInlineFontSize = 13; 

// == 텍스트·간격 설정을 위한 전역 변수 ==
let currentLineHeight = 1.6;
let currentLetterSpacing = -0.02; // em
let currentBlockGap = 15; // 기본 문단 간격 (px)
let currentWordBreak = 'break-all'; // 줄바꿈 방식 기본값을 글자 단위로 설정

// == 전체 히스토리(Undo/Redo) 관리를 위한 전역 변수 ==
let historyStack = [];
let historyIndex = -1;
let typingTimer;

// == 히스토리 관리 함수 ==
function saveState() {
    const currentState = JSON.stringify(blocks);
    if (historyIndex >= 0 && historyStack[historyIndex] === currentState) {
        return;
    }
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(currentState);
    historyIndex++;
}

function debounceSaveState() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        saveState();
    }, 500);
}

function restoreFocus(focusInfo) {
    if (!focusInfo) return;
    setTimeout(() => {
        if (focusInfo.type === 'editor') {
            const ta = document.getElementById(`textarea-${focusInfo.index}`);
            if (ta) {
                ta.focus();
                ta.selectionStart = ta.value.length;
                ta.selectionEnd = ta.value.length;
            }
        } else if (focusInfo.type === 'preview') {
            const previewEl = document.getElementById('htmlPreview');
            if (previewEl) previewEl.focus();
        }
    }, 50);
}

function undo() {
    if (historyIndex > 0) {
        clearTimeout(typingTimer);
        const activeEl = document.activeElement;
        let focusInfo = null;
        if (activeEl) {
            if (activeEl.id && activeEl.id.startsWith('textarea-')) {
                focusInfo = { type: 'editor', index: parseInt(activeEl.id.replace('textarea-', '')) };
            } else if (activeEl.closest('.preview-container') || activeEl.id === 'htmlPreview') {
                focusInfo = { type: 'preview' };
            }
        }

        // 💡 렌더링 전 현재 스크롤 위치 임시 저장 (튕김 방지)
        const editorList = document.getElementById('editorList');
        const htmlPreview = document.getElementById('htmlPreview');
        const scrollPos = {
            editor: editorList ? editorList.scrollTop : 0,
            preview: htmlPreview ? htmlPreview.scrollTop : 0,
            window: window.scrollY
        };

        historyIndex--;
        blocks = JSON.parse(historyStack[historyIndex]);
        renderEditor();

        // 💡 렌더링 직후 스크롤 위치 원상 복구
        setTimeout(() => {
            if (editorList) editorList.scrollTop = scrollPos.editor;
            if (htmlPreview) htmlPreview.scrollTop = scrollPos.preview;
            window.scrollTo(0, scrollPos.window);
        }, 0);

        restoreFocus(focusInfo);
    }
}

function redo() {
    if (historyIndex < historyStack.length - 1) {
        clearTimeout(typingTimer);
        const activeEl = document.activeElement;
        let focusInfo = null;
        if (activeEl) {
            if (activeEl.id && activeEl.id.startsWith('textarea-')) {
                focusInfo = { type: 'editor', index: parseInt(activeEl.id.replace('textarea-', '')) };
            } else if (activeEl.closest('.preview-container') || activeEl.id === 'htmlPreview') {
                focusInfo = { type: 'preview' };
            }
        }

        // 💡 렌더링 전 현재 스크롤 위치 임시 저장 (튕김 방지)
        const editorList = document.getElementById('editorList');
        const htmlPreview = document.getElementById('htmlPreview');
        const scrollPos = {
            editor: editorList ? editorList.scrollTop : 0,
            preview: htmlPreview ? htmlPreview.scrollTop : 0,
            window: window.scrollY
        };

        historyIndex++;
        blocks = JSON.parse(historyStack[historyIndex]);
        renderEditor();

        // 💡 렌더링 직후 스크롤 위치 원상 복구
        setTimeout(() => {
            if (editorList) editorList.scrollTop = scrollPos.editor;
            if (htmlPreview) htmlPreview.scrollTop = scrollPos.preview;
            window.scrollTo(0, scrollPos.window);
        }, 0);

        restoreFocus(focusInfo);
    }
}

document.addEventListener('keydown', function(e) {
    if (e.isComposing || e.keyCode === 229) return;
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    
    if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
            redo();
        } else {
            undo();
        }
    } else if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
    }
});

// ===================================
// 블록 제어 함수들
// ===================================

function moveBlockUp(index) {
    if (index <= 0) return;
    const temp = blocks[index - 1];
    blocks[index - 1] = blocks[index];
    blocks[index] = temp;
    renderEditor();
    saveState();
    focusAndScrollBlock(index - 1);
}

function moveBlockDown(index) {
    if (index >= blocks.length - 1) return;
    const temp = blocks[index + 1];
    blocks[index + 1] = blocks[index];
    blocks[index] = temp;
    renderEditor();
    saveState();
    focusAndScrollBlock(index + 1);
}

function moveBlockTo(oldIndex, targetInputId) {
    const el = document.getElementById(targetInputId);
    if(!el) return;
    let newIndex = parseInt(el.value) - 1; 
    if (isNaN(newIndex) || newIndex < 0 || newIndex >= blocks.length) {
        showToast('유효한 순서를 입력해주세요. (1 ~ ' + blocks.length + ')');
        return;
    }
    if (oldIndex === newIndex) return;
    
    const block = blocks.splice(oldIndex, 1)[0];
    blocks.splice(newIndex, 0, block);
    renderEditor();
    saveState();
    focusAndScrollBlock(newIndex);
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.getElementById('darkModeBtn').innerText = isDarkMode ? '☀️ 라이트 모드' : '🌙 다크 모드';
    
    if (isDarkMode) {
        document.getElementById('mintTextColor').value = '#B2E4D4';
        document.getElementById('mintTextColorPicker').value = '#B2E4D4';
        document.getElementById('narrColor').value = '#F9F9F8';
        document.getElementById('narrColorPicker').value = '#F9F9F8';
    } else {
        document.getElementById('mintTextColor').value = '#459fa5';
        document.getElementById('mintTextColorPicker').value = '#459fa5';
        document.getElementById('narrColor').value = '#2c2c2e';
        document.getElementById('narrColorPicker').value = '#2c2c2e';
    }
    updateOutput();
}

function changeGlobalFont(font) {
    currentFontFamily = font;
    document.body.style.fontFamily = font;
    updateOutput();
}

function changeFontSize(delta) {
    let oldSize = currentFontSize;
    currentFontSize += delta;
    if(currentFontSize < 10) currentFontSize = 10;
    if(currentFontSize > 30) currentFontSize = 30;

    if (oldSize !== currentFontSize) {
        let ratio = currentFontSize / oldSize;
        currentBlockGap = Math.round(currentBlockGap * ratio);
        
        let gapSlider = document.getElementById('blockGapSlider');
        let gapVal = document.getElementById('blockGapVal');
        if (gapSlider) gapSlider.value = currentBlockGap;
        if (gapVal) gapVal.innerText = currentBlockGap + 'px';
    }

    document.getElementById('fontSizeDisplay').innerText = currentFontSize + 'px';
    updateOutput();
}

function updateLayoutSetting(key, value) {
    if (key === 'lineHeight') currentLineHeight = parseFloat(value);
    if (key === 'letterSpacing') currentLetterSpacing = parseFloat(value);
    if (key === 'blockGap') currentBlockGap = parseInt(value, 10);
    if (key === 'wordBreak') currentWordBreak = value;
    updateOutput();
}

function showToast(msg) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = 'position: fixed; bottom: 25px; left: 50%; transform: translateX(-50%); background-color: #333; color: #fff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; z-index: 10000; transition: opacity 0.3s ease; opacity: 0; pointer-events: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: "Noto Serif KR", serif; word-break: keep-all; text-align: center;';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    
    if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
    toast.hideTimeout = setTimeout(() => {
        toast.style.opacity = '0';
    }, 2500);
}

function escapeHtml(unsafe) {
    return (unsafe || '').toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function setupColorPicker(pickerId, textId) {
    const picker = document.getElementById(pickerId);
    const text = document.getElementById(textId);
    if (!picker || !text) return;
    
    picker.addEventListener('input', (e) => {
        text.value = e.target.value.toUpperCase();
        if(!pickerId.includes('auto-bg') && !pickerId.includes('auto-text')) updateOutput();
    });
    
    text.addEventListener('input', (e) => {
        let val = e.target.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            picker.value = val;
        }
        if(!pickerId.includes('auto-bg') && !pickerId.includes('auto-text')) updateOutput();
    });
}

// 💡 초기 컬러 피커 설정 연결 유지
setupColorPicker('mintTextColorPicker', 'mintTextColor');
setupColorPicker('pinkTextColorPicker', 'pinkTextColor');
setupColorPicker('narrColorPicker', 'narrColor');
setupColorPicker('highlightColorPicker', 'highlightColor');

function getSafeId(str) {
    let hash = 0;
    if (!str || str.length === 0) return 'empty';
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'id' + Math.abs(hash);
}

function setVersion(v) {
    outputVersion = v;
    const btnV1 = document.getElementById('btnV1');
    const btnV2 = document.getElementById('btnV2');
    
    if (v === 1) {
        btnV1.style.background = 'var(--primary)';
        btnV1.style.color = 'white';
        btnV2.style.background = 'transparent';
        btnV2.style.color = 'var(--text-muted)';
    } else {
        btnV2.style.background = 'var(--primary)';
        btnV2.style.color = 'white';
        btnV1.style.background = 'transparent';
        btnV1.style.color = 'var(--text-muted)';
    }
    updateOutput(); 
}

function setOutputMode(mode) {
    outputMode = mode;
    const btnNovel = document.getElementById('btnModeNovel');
    const btnBubble = document.getElementById('btnModeBubble');
    
    if (mode === 'novel') {
        btnNovel.style.background = 'var(--primary)';
        btnNovel.style.color = 'white';
        btnBubble.style.background = 'transparent';
        btnBubble.style.color = 'var(--text-muted)';
    } else {
        btnBubble.style.background = 'var(--primary)';
        btnBubble.style.color = 'white';
        btnNovel.style.background = 'transparent';
        btnNovel.style.color = 'var(--text-muted)';
    }
    updateOutput(); 
}

function stripSymbols(str) {
    str = (str || '').replace(/^["“"]|["”"]$/g, '');
    return str.trim();
}

function insertFmt(index, mark) {
    const ta = document.getElementById(`textarea-${index}`);
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const selectedText = text.substring(start, end) || '텍스트';
    const newText = text.substring(0, start) + mark + selectedText + mark + text.substring(end);
    
    ta.value = newText;
    updateBlockContent(index, newText); 
    setTimeout(() => {
        ta.focus();
        ta.selectionStart = start + mark.length;
        ta.selectionEnd = start + mark.length + selectedText.length;
    }, 0);
}

function handleTextareaKeydown(e, index) {
    if (e.isComposing || e.keyCode === 229) return;
}

document.addEventListener("DOMContentLoaded", function() {
    saveState(); 

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
                        polaroidCaption: currentBlock.polaroidCaption || ''
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

function addBlock(type, index = -1) {
    let defaultContent = '';
    if (type === 'divider') defaultContent = 'solid-gray';
    
    const newBlock = { type, content: defaultContent, customTextColor: '#333333', bgmTitle: '', bgmUrl: '', polaroidDate: '', polaroidCaption: '' };
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
    const newBlock = { type: 'empty', content: '', customTextColor: '#333333', bgmTitle: '', bgmUrl: '', polaroidDate: '', polaroidCaption: '' };
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
    if (newType === 'divider' && !['solid-black', 'solid-gray', 'dashed-gray', 'dots', 'diamond'].includes(blocks[index].content)) {
        blocks[index].content = 'solid-gray';
    }
    renderEditor();
    saveState(); 
}
