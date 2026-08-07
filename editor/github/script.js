// ==========================================
// script.js
// 전역 상태 관리, 히스토리(Undo/Redo), 블록 데이터 조작 전용
// ==========================================

// == 전역 상태 변수 ==
let blocks = [];
let outputVersion = 1; 
let outputMode = 'novel'; // 💡 기본 출력 모드 (novel / bubble1 / bubble2)
let isDarkMode = false;
let currentFontSize = 14;
let currentFontFamily = "'Noto Serif KR', serif";
let currentInlineFontSize = 13; 

// == 텍스트·간격 설정을 위한 전역 변수 ==
let currentLineHeight = 1.6;
let currentLetterSpacing = -0.02; // em
let currentBlockGap = 15; // 기본 문단 간격 (px)
let currentInnerGap = 4;  // 💡 [추가] 기본 내부 간격 (px) - 연속된 화자/나레이션 등
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

        const editorList = document.getElementById('editorList');
        const htmlPreview = document.getElementById('htmlPreview');
        const scrollPos = {
            editor: editorList ? editorList.scrollTop : 0,
            preview: htmlPreview ? htmlPreview.scrollTop : 0,
            window: window.scrollY
        };

        historyIndex--;
        blocks = JSON.parse(historyStack[historyIndex]);
        if (typeof renderEditor === 'function') renderEditor();

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

        const editorList = document.getElementById('editorList');
        const htmlPreview = document.getElementById('htmlPreview');
        const scrollPos = {
            editor: editorList ? editorList.scrollTop : 0,
            preview: htmlPreview ? htmlPreview.scrollTop : 0,
            window: window.scrollY
        };

        historyIndex++;
        blocks = JSON.parse(historyStack[historyIndex]);
        if (typeof renderEditor === 'function') renderEditor();

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
// 블록 제어 로직
// ===================================

function moveBlockUp(index) {
    if (index <= 0) return;
    const temp = blocks[index - 1];
    blocks[index - 1] = blocks[index];
    blocks[index] = temp;
    if (typeof renderEditor === 'function') renderEditor();
    saveState();
    if (typeof focusAndScrollBlock === 'function') focusAndScrollBlock(index - 1);
}

function moveBlockDown(index) {
    if (index >= blocks.length - 1) return;
    const temp = blocks[index + 1];
    blocks[index + 1] = blocks[index];
    blocks[index] = temp;
    if (typeof renderEditor === 'function') renderEditor();
    saveState();
    if (typeof focusAndScrollBlock === 'function') focusAndScrollBlock(index + 1);
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
    if (typeof renderEditor === 'function') renderEditor();
    saveState();
    if (typeof focusAndScrollBlock === 'function') focusAndScrollBlock(newIndex);
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.getElementById('darkModeBtn').innerText = isDarkMode ? '☀️ 라이트 모드' : '🌙 다크 모드';
    
    if (isDarkMode) {
        let elMint = document.getElementById('mintTextColor');
        let elMintP = document.getElementById('mintTextColorPicker');
        let elNarr = document.getElementById('narrColor');
        let elNarrP = document.getElementById('narrColorPicker');
        if(elMint) elMint.value = '#B2E4D4';
        if(elMintP) elMintP.value = '#B2E4D4';
        if(elNarr) elNarr.value = '#F9F9F8';
        if(elNarrP) elNarrP.value = '#F9F9F8';
    } else {
        let elMint = document.getElementById('mintTextColor');
        let elMintP = document.getElementById('mintTextColorPicker');
        let elNarr = document.getElementById('narrColor');
        let elNarrP = document.getElementById('narrColorPicker');
        if(elMint) elMint.value = '#237768';
        if(elMintP) elMintP.value = '#237768';
        if(elNarr) elNarr.value = '#48484A';
        if(elNarrP) elNarrP.value = '#48484A';
    }
    if (typeof updateOutput === 'function') updateOutput();
}

function changeGlobalFont(font) {
    currentFontFamily = font;
    document.body.style.fontFamily = font;
    if (typeof updateOutput === 'function') updateOutput();
}

function changeFontSize(delta) {
    let oldSize = currentFontSize;
    currentFontSize += delta;
    if(currentFontSize < 10) currentFontSize = 10;
    if(currentFontSize > 30) currentFontSize = 30;

    if (oldSize !== currentFontSize) {
        let ratio = currentFontSize / oldSize;
        currentBlockGap = Math.round(currentBlockGap * ratio);
        
        // 💡 [수정] 내부 간격도 비율에 맞춰 동일하게 스케일링
        currentInnerGap = Math.round(currentInnerGap * ratio);
        
        let gapSlider = document.getElementById('blockGapSlider');
        let gapVal = document.getElementById('blockGapVal');
        if (gapSlider) gapSlider.value = currentBlockGap;
        if (gapVal) gapVal.innerText = currentBlockGap + 'px';
        
        // 💡 [수정] 내부 간격 UI 동기화
        let innerGapSlider = document.getElementById('innerGapSlider');
        let innerGapVal = document.getElementById('innerGapVal');
        if (innerGapSlider) innerGapSlider.value = currentInnerGap;
        if (innerGapVal) innerGapVal.innerText = currentInnerGap + 'px';
    }

    document.getElementById('fontSizeDisplay').innerText = currentFontSize + 'px';
    if (typeof updateOutput === 'function') updateOutput();
}

function updateLayoutSetting(key, value) {
    if (key === 'lineHeight') currentLineHeight = parseFloat(value);
    if (key === 'letterSpacing') currentLetterSpacing = parseFloat(value);
    if (key === 'blockGap') currentBlockGap = parseInt(value, 10);
    if (key === 'innerGap') currentInnerGap = parseInt(value, 10); // 💡 [추가] 내부 간격 상태 업데이트
    if (key === 'wordBreak') currentWordBreak = value;
    if (typeof updateOutput === 'function') updateOutput();
}

function showToast(msg) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = 'position: fixed; bottom: 25px; left: 50%; transform: translateX(-50%); background-color: #333; color: #fff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; z-index: 10000; transition: opacity 0.3s ease; opacity: 0; pointer-events: none; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: "Noto Sans KR", "Noto Serif KR", sans-serif; word-break: keep-all; text-align: center;';
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
        if(!pickerId.includes('auto-bg') && !pickerId.includes('auto-text')) {
            if (typeof updateOutput === 'function') updateOutput();
        }
    });
    
    text.addEventListener('input', (e) => {
        let val = e.target.value.trim();
        
        if (/^#[0-9A-F]{3}$/i.test(val)) {
            val = '#' + val[1]+val[1] + val[2]+val[2] + val[3]+val[3];
        }
        
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            picker.value = val.toUpperCase();
        }
        
        if(!pickerId.includes('auto-bg') && !pickerId.includes('auto-text')) {
            if (typeof updateOutput === 'function') updateOutput();
        }
    });
}

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
        if(btnV1) { btnV1.style.background = 'var(--primary)'; btnV1.style.color = 'white'; }
        if(btnV2) { btnV2.style.background = 'transparent'; btnV2.style.color = 'var(--text-muted)'; }
    } else {
        if(btnV2) { btnV2.style.background = 'var(--primary)'; btnV2.style.color = 'white'; }
        if(btnV1) { btnV1.style.background = 'transparent'; btnV1.style.color = 'var(--text-muted)'; }
    }
    if (typeof updateOutput === 'function') updateOutput(); 
}

function setOutputMode(mode) {
    outputMode = mode;
    const btnNovel = document.getElementById('btnModeNovel');
    const btnBubble1 = document.getElementById('btnModeBubble1');
    const btnBubble2 = document.getElementById('btnModeBubble2');
    
    [btnNovel, btnBubble1, btnBubble2].forEach(btn => {
        if (btn) {
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text-muted)';
        }
    });

    let activeBtn = null;
    if (mode === 'novel') activeBtn = btnNovel;
    else if (mode === 'bubble1') activeBtn = btnBubble1;
    else if (mode === 'bubble2') activeBtn = btnBubble2;

    if (activeBtn) {
        activeBtn.style.background = 'var(--primary)';
        activeBtn.style.color = 'white';
    }
    
    if (typeof updateOutput === 'function') updateOutput(); 
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

    const htmlPreview = document.getElementById('htmlPreview');
    if (htmlPreview) {
        htmlPreview.addEventListener('keydown', function(e) {
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
                    
                    if (typeof syncPreviewToBlocks === 'function') syncPreviewToBlocks();
                    
                    let content = blocks[index].content;
                    let parts = content.split(marker);
                    
                    if (parts.length >= 2) {
                        blocks[index].content = parts[0].trim();
                        const newBlock = {
                            type: currentBlock.type,
                            content: parts.slice(1).join('').replace(/^[\n\r]+/, '').trim(),
                            customTextColor: currentBlock.customTextColor || '#333333',
                            customBgColor: currentBlock.customBgColor || '#E2E8F0',
                            customName: currentBlock.customName || '',
                            customProfileUrl: currentBlock.customProfileUrl || '',
                            bgmTitle: currentBlock.bgmTitle,
                            bgmUrl: currentBlock.bgmUrl,
                            polaroidDate: currentBlock.polaroidDate || '',
                            polaroidCaption: currentBlock.polaroidCaption || ''
                        };
                        blocks.splice(index + 1, 0, newBlock);
                        if (typeof renderEditor === 'function') renderEditor(); 
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
    }
});

function addBlock(type, index = -1) {
    let defaultContent = '';
    if (type === 'divider') defaultContent = 'solid-gray';
    
    const newBlock = { type, content: defaultContent, customTextColor: '#333333', customBgColor: '#E2E8F0', customName: '', customProfileUrl: '', bgmTitle: '', bgmUrl: '', polaroidDate: '', polaroidCaption: '' };
    let addedIndex = -1;
    if (index === -1) {
        blocks.push(newBlock);
        addedIndex = blocks.length - 1;
    } else {
        blocks.splice(index, 0, newBlock);
        addedIndex = index;
    }
    if (typeof renderEditor === 'function') renderEditor();
    saveState(); 
    if (typeof focusAndScrollBlock === 'function') focusAndScrollBlock(addedIndex); 
}

function insertEmptyLine(index) {
    const newBlock = { type: 'empty', content: '', customTextColor: '#333333', bgmTitle: '', bgmUrl: '', polaroidDate: '', polaroidCaption: '' };
    blocks.splice(index + 1, 0, newBlock);
    if (typeof renderEditor === 'function') renderEditor();
    saveState(); 
    if (typeof focusAndScrollBlock === 'function') focusAndScrollBlock(index + 1); 
}

function deleteBlock(index) {
    blocks.splice(index, 1);
    if (typeof renderEditor === 'function') renderEditor();
    saveState(); 
}

function updateBlockContent(index, value) {
    blocks[index].content = value;
    if (typeof updateOutput === 'function') updateOutput();
    debounceSaveState(); 
}

function updateBlockCustom(index, field, value) {
    if (field === 'textColor') blocks[index].customTextColor = value;
    if (field === 'bgColor') blocks[index].customBgColor = value;
    if (field === 'customName') blocks[index].customName = value;
    if (field === 'customProfileUrl') blocks[index].customProfileUrl = value;
    if (field === 'bgmTitle') blocks[index].bgmTitle = value;
    if (field === 'bgmUrl') blocks[index].bgmUrl = value;
    if (field === 'polaroidDate') blocks[index].polaroidDate = value;
    if (field === 'polaroidCaption') blocks[index].polaroidCaption = value;
    if (typeof updateOutput === 'function') updateOutput();
    debounceSaveState(); 
}

function changeBlockType(index, newType) {
    blocks[index].type = newType;
    if (newType === 'custom') {
        blocks[index].customTextColor = blocks[index].customTextColor || '#333333';
        blocks[index].customBgColor = blocks[index].customBgColor || '#E2E8F0';
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
    if (typeof renderEditor === 'function') renderEditor();
    saveState(); 
}

// 💡 복사하기 함수
function copyHtml() {
    const code = document.getElementById('finalHtmlCode');
    if(code) {
        code.select();
        document.execCommand('copy');
        showToast('최종 HTML이 복사되었습니다!');
    }
}

// 💡 전역 동기화 로직 (새롭게 분리된 소설/말풍선 색상 모두 포함)
document.addEventListener("DOMContentLoaded", function() {
    // 1. 에디터 메인 설정의 모든 컬러 피커와 텍스트 박스 양방향 동기화 연결
    setupColorPicker('mintTextColorPicker', 'mintTextColor');
    setupColorPicker('mintBubbleTextColorPicker', 'mintBubbleTextColor');
    setupColorPicker('mintBgColorPicker', 'mintBgColor');
    
    setupColorPicker('pinkTextColorPicker', 'pinkTextColor');
    setupColorPicker('pinkBubbleTextColorPicker', 'pinkBubbleTextColor');
    setupColorPicker('pinkBgColorPicker', 'pinkBgColor');
    
    setupColorPicker('mobTextColorPicker', 'mobTextColor');
    setupColorPicker('mobBubbleTextColorPicker', 'mobBubbleTextColor');
    setupColorPicker('mobBgColorPicker', 'mobBgColor');
    
    setupColorPicker('narrColorPicker', 'narrColor');
    setupColorPicker('highlightColorPicker', 'highlightColor');

    // 2. 글자색, 배경색, 이름, 프사 등 무엇이든 수정하면 실시간으로 미리보기가 변하도록 전체 이벤트 연결
    const inputsToSync = [
        'mintTextColor', 'mintBubbleTextColor', 'mintBgColor', 'mintName', 'mintProfileUrl',
        'pinkTextColor', 'pinkBubbleTextColor', 'pinkBgColor', 'pinkName', 'pinkProfileUrl',
        'mobTextColor', 'mobBubbleTextColor', 'mobBgColor', 'mobName', 'mobProfileUrl',
        'narrColor', 'highlightColor'
    ];

    inputsToSync.forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => { 
                if(typeof updateOutput === 'function') updateOutput(); 
            });
        }
    });

    let elNarrItalic = document.getElementById('narrItalic');
    if (elNarrItalic) {
        elNarrItalic.addEventListener('change', () => { 
            if(typeof updateOutput === 'function') updateOutput(); 
        });
    }
});


// ==========================================
// 💡 [추가] Supabase 프리셋(Preset) 동기화 로직
// ==========================================

const SUPABASE_URL = 'https://pqqvmppgpqmtyttfjyve.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcXZtcHBncHFtdHl0dGZqeXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzYxMDAsImV4cCI6MjA5NzAxMjEwMH0.86kBtiDT9J_FNeKDOqm82p53JObFTfQkQUAzsT94icw';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let presetList = [];

// 서버에서 프리셋 불러오기
async function fetchPresets() {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('category', 'preset')
            .order('created_at', { ascending: false });

        if (error) throw error;

        presetList = data || [];
        renderPresetSelect();
    } catch (err) {
        console.error('프리셋 불러오기 실패:', err);
    }
}

// 드롭다운 메뉴에 목록 그리기
function renderPresetSelect() {
    const select = document.getElementById('presetSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">기본 설정 불러오기...</option>';
    
    presetList.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = preset.title;
        select.appendChild(option);
    });
}

// 현재 화면의 설정을 서버에 새 프리셋으로 저장
async function savePreset() {
    const presetName = prompt('새로 저장할 프리셋의 이름을 입력하세요.\n(예: 실내, 야외, 특별 의상 등)');
    if (!presetName || !presetName.trim()) return;

    // 화면의 입력창 데이터 수집
    const currentSettings = {
        mintTextColor: document.getElementById('mintTextColor')?.value,
        mintBubbleTextColor: document.getElementById('mintBubbleTextColor')?.value,
        mintBgColor: document.getElementById('mintBgColor')?.value,
        mintName: document.getElementById('mintName')?.value,
        mintProfileUrl: document.getElementById('mintProfileUrl')?.value,
        
        pinkTextColor: document.getElementById('pinkTextColor')?.value,
        pinkBubbleTextColor: document.getElementById('pinkBubbleTextColor')?.value,
        pinkBgColor: document.getElementById('pinkBgColor')?.value,
        pinkName: document.getElementById('pinkName')?.value,
        pinkProfileUrl: document.getElementById('pinkProfileUrl')?.value,
        
        mobTextColor: document.getElementById('mobTextColor')?.value,
        mobBubbleTextColor: document.getElementById('mobBubbleTextColor')?.value,
        mobBgColor: document.getElementById('mobBgColor')?.value,
        mobName: document.getElementById('mobName')?.value,
        mobProfileUrl: document.getElementById('mobProfileUrl')?.value,
        
        narrColor: document.getElementById('narrColor')?.value,
        highlightColor: document.getElementById('highlightColor')?.value,
        narrItalic: document.getElementById('narrItalic')?.checked
    };

    // 기존 posts 구조에 맞게 |||#preset 으로 이어붙임
    const contentString = JSON.stringify(currentSettings) + '|||#preset';

    try {
        const { error } = await supabase
            .from('posts')
            .insert([
                { 
                    category: 'preset', 
                    title: presetName.trim(), 
                    content: contentString,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;

        showToast(`'${presetName}' 프리셋이 안전하게 보관되었습니다! 🚀`);
        fetchPresets(); // 목록 즉시 새로고침
    } catch (err) {
        console.error('프리셋 저장 실패:', err);
        showToast('프리셋 저장 중 오류가 발생했습니다.');
    }
}

// 선택된 프리셋 삭제
async function deletePreset() {
    const select = document.getElementById('presetSelect');
    const selectedId = select.value;
    
    if (!selectedId) {
        showToast('삭제할 프리셋을 선택해주세요.');
        return;
    }
    
    const selectedText = select.options[select.selectedIndex].text;
    
    if (!confirm(`'${selectedText}' 프리셋을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    try {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', selectedId);

        if (error) throw error;

        showToast(`'${selectedText}' 프리셋이 삭제되었습니다.`);
        fetchPresets(); // 목록 즉시 새로고침
    } catch (err) {
        console.error('프리셋 삭제 실패:', err);
        showToast('프리셋 삭제 중 오류가 발생했습니다.');
    }
}

// 선택한 프리셋의 데이터를 에디터에 적용
function applyPreset(presetId) {
    if (!presetId) return; // '기본 설정 불러오기...' 선택 시

    const preset = presetList.find(p => p.id == presetId);
    if (!preset) return;

    try {
        // 기존 구조 호환: '|||#preset' 앞부분의 JSON 데이터만 파싱
        const jsonString = preset.content.split('|||')[0];
        const settings = JSON.parse(jsonString);

        // 값 업데이트 및 컬러 피커 연동 헬퍼 함수
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && val !== undefined) {
                el.value = val;
                const picker = document.getElementById(id + 'Picker');
                // 색상 값일 경우 피커도 동기화
                if (picker && /^#[0-9A-Fa-f]{6}$/i.test(val)) {
                    picker.value = val.toUpperCase();
                }
            }
        };

        setVal('mintTextColor', settings.mintTextColor);
        setVal('mintBubbleTextColor', settings.mintBubbleTextColor);
        setVal('mintBgColor', settings.mintBgColor);
        setVal('mintName', settings.mintName);
        setVal('mintProfileUrl', settings.mintProfileUrl);
        
        setVal('pinkTextColor', settings.pinkTextColor);
        setVal('pinkBubbleTextColor', settings.pinkBubbleTextColor);
        setVal('pinkBgColor', settings.pinkBgColor);
        setVal('pinkName', settings.pinkName);
        setVal('pinkProfileUrl', settings.pinkProfileUrl);
        
        setVal('mobTextColor', settings.mobTextColor);
        setVal('mobBubbleTextColor', settings.mobBubbleTextColor);
        setVal('mobBgColor', settings.mobBgColor);
        setVal('mobName', settings.mobName);
        setVal('mobProfileUrl', settings.mobProfileUrl);
        
        setVal('narrColor', settings.narrColor);
        setVal('highlightColor', settings.highlightColor);
        
        const narrItalic = document.getElementById('narrItalic');
        if (narrItalic && settings.narrItalic !== undefined) {
            narrItalic.checked = settings.narrItalic;
        }

        showToast(`'${preset.title}' 프리셋 적용 완료! ✨`);
        
        // 미리보기 화면 실시간 업데이트
        if (typeof updateOutput === 'function') updateOutput();
    } catch (err) {
        console.error('프리셋 적용 실패:', err);
        showToast('프리셋을 적용하는 중 오류가 발생했습니다.');
    }
}

// 문서 로드 완료 시 프리셋 목록 최초 호출
document.addEventListener("DOMContentLoaded", fetchPresets);
