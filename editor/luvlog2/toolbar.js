// ==========================================
// toolbar.js
// 플로팅 툴바 전용 (겹침 방지 및 퀵 컬러 버튼)
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
        if (block.content.startsWith('==') && block.content.endsWith('==')) {
            block.content = block.content.slice(2, -2); // 이미 칠해져 있으면 지우기
        } else {
            block.content = `==${block.content}==`; // 형광펜 마크다운 씌우기
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
        btnHl.title = '전체 형광펜';
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