// == 전역 상태 변수 ==
let blocks = [];
let outputVersion = 1; 
let isDarkMode = false;
let currentFontSize = 14;
let currentFontFamily = "'Noto Serif KR', serif";
let currentInlineFontSize = 13; // 툴바 폰트 사이즈 상태값

// == 추가된 전체 히스토리(Undo/Redo) 관리를 위한 전역 변수 ==
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
        historyIndex--;
        blocks = JSON.parse(historyStack[historyIndex]);
        renderEditor();
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
        historyIndex++;
        blocks = JSON.parse(historyStack[historyIndex]);
        renderEditor();
        restoreFocus(focusInfo);
    }
}

// == 전역 키보드 이벤트 (Ctrl+Z / Cmd+Z, Ctrl+Y) ==
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
    currentFontSize += delta;
    if(currentFontSize < 10) currentFontSize = 10;
    if(currentFontSize > 30) currentFontSize = 30;
    document.getElementById('fontSizeDisplay').innerText = currentFontSize + 'px';
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

function stripSymbols(str) {
    str = (str || '').replace(/^["“"]|["”"]$/g, '');
    return str.trim();
}

function applyTextStyles(text) {
    if (!text) return text;
    let styledText = text.replace(/\*\*/g, ''); // 연이은 별표(**) 무시/제거
    styledText = styledText.replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>');
    return styledText;
}

function extractVideoId(url) {
    if (!url) return '';
    let match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : url.trim(); 
}
