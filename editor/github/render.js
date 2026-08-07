// ==========================================
// render.js
// 에디터 패널 및 UI 조작 전용
// ==========================================

let syncTimer = null;

function debounceSyncPreviewToBlocks() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
        if (typeof syncPreviewToBlocks === 'function') syncPreviewToBlocks();
    }, 300);
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

function updateCustomCharacterPanel() {
    const list = document.getElementById('customCharacterAutoList');
    if(!list) return;

    const uniqueChars = {};
    blocks.forEach(b => {
        if(b.type === 'custom') {
            const key = (b.customName || '제3자') + '|' + (b.customTextColor || '#333333');
            if(!uniqueChars[key]) {
                uniqueChars[key] = { 
                    textColor: b.customTextColor || '#333333',
                    bgColor: b.customBgColor || '#E2E8F0',
                    name: b.customName || '',
                    profileUrl: b.customProfileUrl || ''
                };
            }
        }
    });

    list.innerHTML = ''; 

    Object.keys(uniqueChars).forEach(key => {
        const safeKey = getSafeId(key);
        const charData = uniqueChars[key];
        
        let row = document.createElement('div');
        row.id = `auto-custom-${safeKey}`;
        row.dataset.originalKey = key;
        row.style.cssText = "display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--block-hover); border: 1px solid var(--border); border-radius: 6px;";
        
        row.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: bold; color: var(--primary);">[${escapeHtml(charData.name || '제3자')}] 일괄 설정</span>
                <button class="btn-small" style="background-color: var(--primary); color: white; border: none; font-weight: bold; padding: 4px 12px; border-radius: 4px; cursor: pointer;" onclick="applyAutoCustomColor('${safeKey}')">이 캐릭터 일괄 적용</button>
            </div>
            <div style="display: flex; gap: 8px;">
                <div style="flex: 1;">
                    <label style="font-size: 10px; color: var(--text-muted);">이름</label>
                    <input type="text" id="auto-name-${safeKey}" value="${escapeHtml(charData.name)}" placeholder="제3자" style="width: 100%; font-size: 11px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main); box-sizing: border-box;">
                </div>
                <div style="flex: 2;">
                    <label style="font-size: 10px; color: var(--text-muted);">프로필 URL</label>
                    <input type="text" id="auto-profile-${safeKey}" value="${escapeHtml(charData.profileUrl)}" placeholder="https://..." style="width: 100%; font-size: 11px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main); box-sizing: border-box;">
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <div style="flex: 1; display: flex; align-items: center; gap: 4px;">
                    <input type="color" id="auto-text-picker-${safeKey}" value="${escapeHtml(charData.textColor)}" style="width: 24px; height: 24px; border: 1px solid var(--border); border-radius: 4px; padding: 0; cursor: pointer; background: #fff; flex-shrink: 0;">
                    <input type="text" id="auto-text-text-${safeKey}" value="${escapeHtml(charData.textColor)}" placeholder="글자색" style="flex: 1; font-size: 11px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                </div>
                <div style="flex: 1; display: flex; align-items: center; gap: 4px;">
                    <input type="color" id="auto-bg-picker-${safeKey}" value="${escapeHtml(charData.bgColor)}" style="width: 24px; height: 24px; border: 1px solid var(--border); border-radius: 4px; padding: 0; cursor: pointer; background: #fff; flex-shrink: 0;">
                    <input type="text" id="auto-bg-text-${safeKey}" value="${escapeHtml(charData.bgColor)}" placeholder="배경색" style="flex: 1; font-size: 11px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                </div>
            </div>
        `;
        list.appendChild(row);
        
        setupColorPicker(`auto-text-picker-${safeKey}`, `auto-text-text-${safeKey}`);
        setupColorPicker(`auto-bg-picker-${safeKey}`, `auto-bg-text-${safeKey}`);
    });
}

function applyAutoCustomColor(safeKey) {
    const row = document.getElementById(`auto-custom-${safeKey}`);
    const originalKey = row.dataset.originalKey;
    
    const newName = document.getElementById(`auto-name-${safeKey}`).value.trim();
    const newProfile = document.getElementById(`auto-profile-${safeKey}`).value.trim();
    const newTextCol = document.getElementById(`auto-text-text-${safeKey}`).value.trim();
    const newBgCol = document.getElementById(`auto-bg-text-${safeKey}`).value.trim();

    let count = 0;
    blocks.forEach(b => {
        if (b.type === 'custom') {
            const bKey = (b.customName || '제3자') + '|' + (b.customTextColor || '#333333');
            if (bKey === originalKey) {
                b.customName = newName;
                b.customProfileUrl = newProfile;
                b.customTextColor = newTextCol;
                b.customBgColor = newBgCol;
                count++;
            }
        }
    });

    if (count > 0) {
        renderEditor(); 
        saveState(); 
        showToast(`총 ${count}개의 대사에 캐릭터 설정이 일괄 적용되었습니다! 🚀`);
    } else {
        showToast("해당 캐릭터를 사용하는 대사가 없습니다.");
    }
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
        let isNarration = block.type === 'narration';

        if (block.type === 'custom') {
            let validTextHex = /^#[0-9A-Fa-f]{6}$/i.test(block.customTextColor) ? block.customTextColor : '#333333';
            let validBgHex = /^#[0-9A-Fa-f]{6}$/i.test(block.customBgColor) ? block.customBgColor : '#E2E8F0';
            let cName = block.customName || '';
            let cProf = block.customProfileUrl || '';

            customFields = `
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                    <div style="display: flex; gap: 8px;">
                        <div style="flex: 1; display: flex; align-items: center; gap: 4px;">
                            <input type="color" value="${validTextHex}" oninput="document.getElementById('custom-textcolor-text-${index}').value = this.value.toUpperCase(); updateBlockCustom(${index}, 'textColor', this.value.toUpperCase());" style="width: 24px; height: 24px; border: 1px solid var(--border); border-radius: 4px; padding: 0; cursor: pointer; background: #fff; flex-shrink: 0;">
                            <input type="text" id="custom-textcolor-text-${index}" placeholder="글자색" value="${escapeHtml(block.customTextColor)}" oninput="updateBlockCustom(${index}, 'textColor', this.value); if(/^#[0-9A-Fa-f]{6}$/.test(this.value)) { this.previousElementSibling.value = this.value; }" style="flex: 1; font-size: 11px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                        </div>
                        <div style="flex: 1; display: flex; align-items: center; gap: 4px;">
                            <input type="color" value="${validBgHex}" oninput="document.getElementById('custom-bgcolor-text-${index}').value = this.value.toUpperCase(); updateBlockCustom(${index}, 'bgColor', this.value.toUpperCase());" style="width: 24px; height: 24px; border: 1px solid var(--border); border-radius: 4px; padding: 0; cursor: pointer; background: #fff; flex-shrink: 0;">
                            <input type="text" id="custom-bgcolor-text-${index}" placeholder="배경색" value="${escapeHtml(block.customBgColor)}" oninput="updateBlockCustom(${index}, 'bgColor', this.value); if(/^#[0-9A-Fa-f]{6}$/.test(this.value)) { this.previousElementSibling.value = this.value; }" style="flex: 1; font-size: 11px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" placeholder="이름" value="${escapeHtml(cName)}" oninput="updateBlockCustom(${index}, 'customName', this.value)" style="flex: 1; font-size: 11px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                        <input type="text" placeholder="프로필 URL" value="${escapeHtml(cProf)}" oninput="updateBlockCustom(${index}, 'customProfileUrl', this.value)" style="flex: 2; font-size: 11px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
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
                        <input type="text" placeholder="날짜 입력 (선택)" value="${escapeHtml(block.polaroidDate || '')}" onchange="updateBlockCustom(${index}, 'polaroidDate', this.value)" style="flex: 1; font-size: 11px; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                        <input type="text" placeholder="캡션 입력 (선택)" value="${escapeHtml(block.polaroidCaption || '')}" onchange="updateBlockCustom(${index}, 'polaroidCaption', this.value)" style="flex: 2; font-size: 11px; padding: 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--input-bg); color: var(--text-main);">
                    </div>
                </div>
            `;
        }

        let hideTextarea = ['empty', 'bgm', 'polaroid'].includes(block.type);

        let narrationToolbar = '';
        if (isNarration) {
            narrationToolbar = `
                <div style="display: flex; gap: 4px; margin-bottom: 6px; padding: 4px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; overflow-x: auto;">
                    <button class="btn-secondary btn-small" style="padding: 2px 8px; font-weight: bold;" onclick="insertFmt(${index}, '**')">B</button>
                    <button class="btn-secondary btn-small" style="padding: 2px 8px; font-style: italic; font-family: serif;" onclick="insertFmt(${index}, '*')">I</button>
                    <button class="btn-secondary btn-small" style="padding: 2px 8px; text-decoration: line-through;" onclick="insertFmt(${index}, '~~')">S</button>
                    <button class="btn-secondary btn-small" style="padding: 2px 8px; text-decoration: underline;" onclick="insertFmt(${index}, '++')">U</button>
                    <span style="width: 1px; background: var(--border); margin: 0 2px;"></span>
                    <button class="btn-secondary btn-small" style="padding: 2px 8px;" onclick="insertFmt(${index}, '%%')" title="인용구">❞</button>
                    <button class="btn-secondary btn-small" style="padding: 2px 8px;" onclick="insertFmt(${index}, '==')" title="형광펜">✏️</button>
                </div>
            `;
        }

        item.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; gap: 6px; margin-bottom: 5px;">
                <span style="font-size:11px; font-weight:bold; color:var(--text-muted);">#${index + 1}</span>
                <button class="btn-small btn-secondary" onclick="addBlock('narration', ${index})">⬆ 이 위에 추가</button>
                <div style="display:flex; gap:2px; background:var(--input-bg); border:1px solid var(--border); border-radius:4px; overflow:hidden;">
                    <button class="btn-secondary" style="border:none; border-radius:0; padding:2px 6px;" onclick="moveBlockUp(${index})" title="위로 이동">▲</button>
                    <button class="btn-secondary" style="border:none; border-radius:0; padding:2px 6px; border-left:1px solid var(--border); border-right:1px solid var(--border);" onclick="moveBlockDown(${index})" title="아래로 이동">▼</button>
                    <input type="number" id="move-input-${index}" style="width:36px; padding:2px; font-size:11px; border:none; text-align:center; background:transparent; color:var(--text-main);" placeholder="${index + 1}">
                    <button class="btn-secondary" style="border:none; border-radius:0; padding:2px 6px; border-left:1px solid var(--border);" onclick="moveBlockTo(${index}, 'move-input-${index}')">이동</button>
                </div>
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
                      : `
                        ${narrationToolbar}
                        <textarea id="textarea-${index}" rows="2" onclick="scrollToPreview(${index})" onfocus="scrollToPreview(${index})" oninput="updateBlockContent(${index}, this.value)" onchange="updateBlockContent(${index}, this.value); saveState();" onkeydown="handleTextareaKeydown(event, ${index})">${escapeHtml(block.content)}</textarea>
                      `}
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
        } else if (['mint', 'pink', 'mob', 'custom', 'narration', 'thought', 'title', 'dday', 'postit', 'polaroid'].includes(block.type)) {
            
            if (block.type === 'postit') {
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
                } else if ((outputMode === 'bubble1' || outputMode === 'bubble2') && el.classList.contains('scroll-msg-box')) {
                    if (outputMode === 'bubble2') {
                        let clone = el.querySelector('.m-bubble').cloneNode(true);
                        let tail = clone.querySelector('.bubble-tail');
                        if (tail) tail.remove(); 
                        target = clone;
                    } else {
                        target = el.children[1]; 
                    }
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

document.addEventListener("DOMContentLoaded", function() {
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
