// ==========================================
// toolbar.js
// 플로팅 툴바 전용 (파서 로직 분리 완료)
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
    // 💡 [수정] Mint/Pink를 Javier/Ines 색상으로 1:1 완벽 치환
    if (styleName === 'javier') {
        wrapSelectionWithStyle({ color: '#d96b27', backgroundColor: '#fff0e6', padding: '0 2px', borderRadius: '3px' });
    } else if (styleName === 'ines') {
        wrapSelectionWithStyle({ color: '#5b8ce0', backgroundColor: '#eef4ff', padding: '0 2px', borderRadius: '3px' });
    } else if (styleName === 'highlight') {
        let hlColorEl = document.getElementById('highlightColor');
        let hlColor = hlColorEl ? hlColorEl.value : '#C4F0E9';
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

    const selection = window.getSelection();
    if (selection.rangeCount && !selection.isCollapsed) {
        if(speakerToolbar) speakerToolbar.style.display = 'none';
        return;
    }

    if (speakerToolbar) {
        speakerToolbar.style.display = 'flex';
        const rect = blockEl.getBoundingClientRect();
        
        const toolbarHeight = speakerToolbar.offsetHeight || 36; 
        const toolbarWidth = speakerToolbar.offsetWidth || 180;
        
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
