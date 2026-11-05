// ==========================================
// toolbar.js
// 드래그 툴바 및 텍스트 퀵 스타일 제어 (Javier / Ines)
// ==========================================

let savedSelection = null;
let activePreviewIndex = -1;

// 💡 텍스트 드래그 시 플로팅 툴바 표시
document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    const toolbar = document.getElementById('floatingToolbar');
    const container = document.getElementById('htmlPreview');
    if (!toolbar || !container) return;

    if (!sel.isCollapsed && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (container.contains(range.commonAncestorContainer)) {
            const rect = range.getBoundingClientRect();
            toolbar.style.display = 'flex';
            let topPos = rect.top + window.scrollY - toolbar.offsetHeight - 10;
            let leftPos = rect.left + window.scrollX + (rect.width / 2) - (toolbar.offsetWidth / 2);
            if (topPos < 0) topPos = rect.bottom + window.scrollY + 10;
            toolbar.style.top = topPos + 'px';
            toolbar.style.left = Math.max(10, leftPos) + 'px';
            return;
        }
    }
    toolbar.style.display = 'none';
});

// 💡 프리뷰 블록 클릭 시 퀵 화자 변경 툴바 표시
document.addEventListener('click', (e) => {
    const sel = window.getSelection();
    const quickToolbar = document.getElementById('quickSpeakerToolbar');
    const container = document.getElementById('htmlPreview');
    
    if (!sel.isCollapsed || !quickToolbar || !container) {
        if (quickToolbar) quickToolbar.style.display = 'none';
        return;
    }

    let target = e.target;
    let blockDiv = null;
    while (target && target !== container) {
        if (target.id && target.id.startsWith('preview-block-')) {
            blockDiv = target;
            break;
        }
        target = target.parentNode;
    }

    if (blockDiv) {
        const idxStr = blockDiv.id.replace('preview-block-', '');
        activePreviewIndex = parseInt(idxStr, 10);
        
        const rect = blockDiv.getBoundingClientRect();
        quickToolbar.style.display = 'flex';
        
        let tLeft = rect.right + window.scrollX - quickToolbar.offsetWidth;
        let tTop = rect.top + window.scrollY - quickToolbar.offsetHeight - 5;
        
        if (tTop < window.scrollY) tTop = rect.bottom + window.scrollY + 5;
        
        quickToolbar.style.top = tTop + 'px';
        quickToolbar.style.left = tLeft + 'px';
    } else if (!e.target.closest('#quickSpeakerToolbar')) {
        quickToolbar.style.display = 'none';
        activePreviewIndex = -1;
    }
});

// 💡 [수정] 퀵 화자 변경 기능
function changeSpeakerFromPreview(type) {
    if (activePreviewIndex !== -1 && blocks[activePreviewIndex]) {
        blocks[activePreviewIndex].type = type;
        document.getElementById('quickSpeakerToolbar').style.display = 'none';
        if(typeof renderEditor === 'function') renderEditor();
        saveState();
    }
}

// 💡 퀵 블록 삭제 기능
function deleteBlockFromPreview() {
    if (activePreviewIndex !== -1 && blocks[activePreviewIndex]) {
        blocks.splice(activePreviewIndex, 1);
        document.getElementById('quickSpeakerToolbar').style.display = 'none';
        if(typeof renderEditor === 'function') renderEditor();
        saveState();
    }
}

function formatText(command) {
    document.execCommand(command, false, null);
    if(typeof debounceSyncPreviewToBlocks === 'function') debounceSyncPreviewToBlocks();
}

function formatPalette(command, value) {
    document.execCommand(command, false, value);
    if(typeof debounceSyncPreviewToBlocks === 'function') debounceSyncPreviewToBlocks();
}

function changeInlineFontSize(delta) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    let parent = range.commonAncestorContainer;
    if (parent.nodeType === 3) parent = parent.parentNode;
    
    let currentSize = 13;
    if (parent.style && parent.style.fontSize) {
        currentSize = parseInt(parent.style.fontSize, 10);
    }
    
    let newSize = currentSize + delta;
    if (newSize < 10) newSize = 10;
    if (newSize > 30) newSize = 30;
    
    document.getElementById('inlineFontSizeDisplay').innerText = newSize;
    
    let span = document.createElement('span');
    span.style.fontSize = newSize + 'px';
    range.surroundContents(span);
    
    sel.removeAllRanges();
    sel.addRange(range);
    
    if(typeof debounceSyncPreviewToBlocks === 'function') debounceSyncPreviewToBlocks();
}

// 💡 [수정] 플로팅 툴바 빠른 색상 입히기 (Mint/Pink -> Javier/Ines)
function applyQuickStyle(type) {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    let text = range.extractContents();
    let span = document.createElement('span');
    
    if (type === 'javier') {
        let color = document.getElementById('javierTextColor') ? document.getElementById('javierTextColor').value : '#ffb07c';
        span.style.color = color;
        span.style.fontWeight = 'bold';
    } else if (type === 'ines') {
        let color = document.getElementById('inesTextColor') ? document.getElementById('inesTextColor').value : '#9ec5fe';
        span.style.color = color;
        span.style.fontWeight = 'bold';
    } else if (type === 'highlight') {
        let hl = document.getElementById('highlightColor') ? document.getElementById('highlightColor').value : '#C4F0E9';
        span.style.backgroundColor = hl;
        span.style.padding = '0 2px';
        span.style.borderRadius = '2px';
        span.style.color = 'inherit';
    }
    
    span.appendChild(text);
    range.insertNode(span);
    
    sel.removeAllRanges();
    if(typeof debounceSyncPreviewToBlocks === 'function') debounceSyncPreviewToBlocks();
}

// 💡 텍스트 마크다운 포맷 삽입 기능
function insertFmt(index, tag) {
    const ta = document.getElementById(`textarea-${index}`);
    if (!ta) return;
    
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = ta.value;
    const selectedText = val.substring(start, end);
    
    let newText = '';
    if (tag === '%%') {
        newText = `%%${selectedText || '인용구 내용'}%%`;
    } else {
        newText = `${tag}${selectedText || '내용'}${tag}`;
    }
    
    ta.value = val.substring(0, start) + newText + val.substring(end);
    if(typeof updateBlockContent === 'function') updateBlockContent(index, ta.value);
    saveState();
    
    ta.focus();
    ta.setSelectionRange(start + tag.length, start + tag.length + (selectedText ? selectedText.length : 2));
}
