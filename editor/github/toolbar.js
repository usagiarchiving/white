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
