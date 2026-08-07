// ==========================================
// preview.js
// 화면 출력(미리보기 HTML 생성) 및 최종 코드 변환 전용
// ==========================================

let renderTimer = null;

function debounceUpdateOutput(skipPreviewUpdate = false) {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
        if (typeof updateOutput === 'function') updateOutput(skipPreviewUpdate);
    }, 300);
}

function extractVideoId(url) {
    if (!url) return '';
    let match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : url.trim(); 
}

function applyTextStyles(text) {
    if (!text) return text;
    let hlColorEl = document.getElementById('highlightColor');
    let hlColor = hlColorEl ? hlColorEl.value : '#fef08a';

    let styledText = text;
    styledText = styledText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    styledText = styledText.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em style="font-style: italic;">$1</em>');
    styledText = styledText.replace(/~~([^~]+)~~/g, '<s style="text-decoration: line-through;">$1</s>');
    styledText = styledText.replace(/\+\+([^+]+)\+\+/g, '<u style="text-decoration: underline;">$1</u>');
    styledText = styledText.replace(/==([^=]+)==/g, `<mark style="background-color: ${hlColor}; color: inherit; padding: 0 2px; border-radius: 2px;">$1</mark>`);
    styledText = styledText.replace(/%%([^%]+)%%/g, '<span style="border-left: 3px solid #8e8e93; padding-left: 8px; margin-left: 4px; color: #8e8e93; display: inline-block;">$1</span>');
    return styledText;
}

function formatBubbleText(text) {
    if (!text) return '';
    let lines = text.split('\n');
    return lines.map(l => {
        let t = l.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: 600;">$1</strong>');
        t = t.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em style="font-style: italic;">$1</em>');
        return t;
    }).join('<br>');
}

function updateOutput(skipPreviewUpdate = false) {
    const mintTextColor = document.getElementById('mintTextColor').value || (isDarkMode ? '#B2E4D4' : '#237768');
    const pinkTextColor = document.getElementById('pinkTextColor').value || '#f5bdcc';
    const mobTextColor = document.getElementById('mobTextColor') ? document.getElementById('mobTextColor').value : '#3a414d';
    
    const mintBubbleTextColor = document.getElementById('mintBubbleTextColor') ? document.getElementById('mintBubbleTextColor').value : '#1d6f60';
    const mintBgColor = document.getElementById('mintBgColor') ? document.getElementById('mintBgColor').value : '#eef8f3';
    
    const pinkBubbleTextColor = document.getElementById('pinkBubbleTextColor') ? document.getElementById('pinkBubbleTextColor').value : '#9b3e61';
    const pinkBgColor = document.getElementById('pinkBgColor') ? document.getElementById('pinkBgColor').value : '#fdf2f6';
    
    const mobBubbleTextColor = document.getElementById('mobBubbleTextColor') ? document.getElementById('mobBubbleTextColor').value : '#3a414d';
    const mobBgColor = document.getElementById('mobBgColor') ? document.getElementById('mobBgColor').value : '#eff1f5';

    const narrColor = document.getElementById('narrColor').value || (isDarkMode ? '#F9F9F8' : '#48484A');
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
    let lastCustomName = null;
    let consecutivePostitCount = 0;
    let consecutivePolaroidCount = 0; 

    let gapBlock = currentBlockGap + 'px';
    let gapInner = currentInnerGap + 'px';

    blocks.forEach((block, index) => {
        if (!block.content.trim() && !['html', 'bgm', 'empty', 'divider', 'polaroid'].includes(block.type)) return;

        let curr = block.type;
        let isCurrDiag = ['mint', 'pink', 'mob', 'custom'].includes(curr);
        let isPrevDiag = prevValidType && ['mint', 'pink', 'mob', 'custom'].includes(prevValidType);
        
        let isCurrNarration = ['narration', 'thought'].includes(curr);
        let isPrevNarration = prevValidType && ['narration', 'thought'].includes(prevValidType);

        let isSameAsPrev = false;
        if (isCurrDiag && prevValidType === curr) {
            if (curr === 'custom') {
                if (lastCustomTextColor === block.customTextColor && lastCustomName === block.customName) isSameAsPrev = true;
            } else {
                isSameAsPrev = true;
            }
        }

        if (curr === 'postit') {
            consecutivePostitCount++;
        } else {
            consecutivePostitCount = 0;
        }

        if (curr === 'polaroid') {
            consecutivePolaroidCount++;
        } else {
            consecutivePolaroidCount = 0;
        }

        let mt = '0px';
        if (curr !== 'empty' && curr !== 'divider') {
            if (prevValidType) {
                if (isPrevDiag && isCurrDiag) {
                    mt = isSameAsPrev ? gapInner : gapBlock; 
                } else if (isPrevNarration && isCurrNarration) {
                    mt = gapInner;
                } else {
                    mt = gapBlock; 
                }
            }
        }

        let htmlStr = '';

        if (block.type === 'empty') {
            htmlStr = `<div id="preview-block-${index}" data-type="empty" onclick="focusAndScrollBlock(${index}, true)" style="height: 30px; width: 100%; cursor: pointer;"></div>\n`;
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
            
            htmlStr = `<div id="preview-block-${index}" data-type="divider" data-style="${dStyle}" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: 30px 0; padding: 0; box-sizing: border-box; display: flex; justify-content: center; align-items: center;">${dividerInner}</div>\n`;
        } else {
            let lines = block.content.split('\n');
            let divContent = lines.map(l => applyTextStyles(l)).join('<br>');

            if (block.type === 'title') {
                htmlStr = `<div id="preview-block-${index}" data-type="title" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: ${mt} 0 0; padding: 10px 0; box-sizing: border-box; font-size: 18pt; font-weight: bold; text-align: left; color: ${cTitle}; word-break: inherit;">${applyTextStyles(block.content)}</div>\n`;
            }
            else if ((outputMode === 'bubble1' || outputMode === 'bubble2') && isCurrDiag) {
                function extractProfileUrl(rawVal) {
                    if (!rawVal) return '';
                    let cleaned = rawVal.trim();
                    let match = cleaned.match(/\[.*?\]\((.*?)\)/);
                    return match && match[1] ? match[1].trim() : cleaned;
                }

                let bgColor = '';
                let textColor = '';
                let imageUrl = '';
                let charName = '';

                let mintUrlEl = document.getElementById('mintProfileUrl');
                let pinkUrlEl = document.getElementById('pinkProfileUrl');
                let mobUrlEl = document.getElementById('mobProfileUrl');

                if (curr === 'mint') {
                    bgColor = mintBgColor;
                    textColor = mintBubbleTextColor;
                    imageUrl = extractProfileUrl(mintUrlEl ? mintUrlEl.value : '') || 'https://i.ibb.co/VYrHdHd8/IMG-6825.jpg';
                    let nameEl = document.getElementById('mintName');
                    charName = nameEl ? nameEl.value : '하시온';
                } else if (curr === 'pink') {
                    bgColor = pinkBgColor;
                    textColor = pinkBubbleTextColor;
                    imageUrl = extractProfileUrl(pinkUrlEl ? pinkUrlEl.value : '') || 'https://i.ibb.co/Rkb6NzhF/IMG-0550.jpg';
                    let nameEl = document.getElementById('pinkName');
                    charName = nameEl ? nameEl.value : '김민정';
                } else if (curr === 'mob') {
                    bgColor = mobBgColor;
                    textColor = mobBubbleTextColor;
                    imageUrl = extractProfileUrl(mobUrlEl ? mobUrlEl.value : '') || 'https://i.ibb.co/jP5RR5gx/IMG-6832.jpg';
                    let nameEl = document.getElementById('mobName');
                    charName = nameEl ? nameEl.value : 'Mob';
                } else {
                    bgColor = block.customBgColor || '#E2E8F0';
                    textColor = block.customTextColor || '#333333';
                    imageUrl = extractProfileUrl(block.customProfileUrl) || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='${escapeHtml(bgColor).replace('#', '%23')}'/%3E%3C/svg%3E`;
                    charName = block.customName || '제3자';
                }

                let isPink = (curr === 'pink');

                if (outputMode === 'bubble1') {
                    let avatarHtml = '';
                    if (isSameAsPrev) {
                        avatarHtml = `<div style="flex-shrink: 0; width: 36px; height: 0;"></div>`;
                    } else {
                        avatarHtml = `<div class="av" style="flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: 2px solid ${bgColor}; box-sizing: border-box;"><img src="${imageUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; display: block; background-color: #f0f0f0;"></div>`;
                    }

                    let alignStyle = isPink ? 'flex-direction: row-reverse;' : '';

                    htmlStr = `<div id="preview-block-${index}" data-type="${curr}" onclick="focusAndScrollBlock(${index}, true)" class="scroll-msg-box" style="width: 100%; max-width: 600px; margin-top: ${mt}; margin-bottom: 0px; display: flex; ${alignStyle} align-items: flex-start; gap: 15px; box-sizing: border-box;">${avatarHtml}<div style="background-color: ${bgColor}; color: ${textColor}; padding: 12px 18px; border-radius: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); width: fit-content; word-break: inherit; line-height: 1.5; margin: 0 !important;">${formatBubbleText(block.content)}</div></div>\n`;
                
                } else if (outputMode === 'bubble2') {
                    let avatarHtml = '';
                    let nameHtml = '';
                    let tailHtml = '';

                    if (!isSameAsPrev) {
                        let avPos = isPink ? 'right: 0;' : 'left: 0;';
                        // 💡 사용자의 요청에 따라 모서리가 둥글게 깎이지 않는 완벽한 사각형(border-radius: 0)으로 유지됩니다.
                        avatarHtml = `<div class="av" style="position: absolute; ${avPos} top: 0; width: 36px; height: 36px; border-radius: 0; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: 2px solid ${bgColor}; box-sizing: border-box;"><img src="${imageUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; display: block; background-color: #f0f0f0;"></div>`;
                        
                        if (charName.trim() !== '') {
                            let nameAlign = isPink ? 'text-align: right;' : 'text-align: left;';
                            nameHtml = `<div class="m-name" style="font-size: 11.5px; font-weight: 600; margin: 0 3px 4px; color: ${textColor}; ${nameAlign}">${escapeHtml(charName)}</div>`;
                        }
                        
                        let tailPos = isPink 
                            ? `right: -8px; border-top: 2px solid transparent; border-bottom: 14px solid transparent; border-left: 12px solid ${bgColor};` 
                            : `left: -8px; border-top: 2px solid transparent; border-bottom: 14px solid transparent; border-right: 12px solid ${bgColor};`;
                        tailHtml = `<div class="bubble-tail" style="position: absolute; top: 8px; ${tailPos} z-index: -1;"></div>`;
                    }

                    let containerPadding = isPink ? 'padding-right: 50px;' : 'padding-left: 50px;';
                    let containerFlex = isPink ? 'display: flex; flex-direction: column; align-items: flex-end;' : '';

                    htmlStr = `<div id="preview-block-${index}" data-type="${curr}" onclick="focusAndScrollBlock(${index}, true)" class="scroll-msg-box" style="position: relative; ${containerPadding} margin-top: ${mt}; margin-bottom: 0px; ${containerFlex}">${avatarHtml}${nameHtml}<div class="m-bubble" style="position: relative; display: block; background-color: ${bgColor}; color: ${textColor}; padding: 12px 18px; border-radius: 14px; width: fit-content; word-break: inherit; line-height: 1.5; box-shadow: 0 1px 2px rgba(0,0,0,0.05); text-align: left; margin: 0 !important;">${tailHtml}${formatBubbleText(block.content)}</div></div>\n`;
                }
            }
            else if (isCurrDiag) { 
                let textColor;
                if (curr === 'mint') { textColor = mintTextColor; }
                else if (curr === 'pink') { textColor = pinkTextColor; }
                else if (curr === 'mob') { textColor = isDarkMode ? '#aaaaaa' : mobTextColor; }
                else { textColor = block.customTextColor || (isDarkMode ? '#F9F9F8' : '#333333'); }

                htmlStr = `<div id="preview-block-${index}" data-type="${curr}" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: ${mt} 0 0; padding: 5px 0; box-sizing: border-box; color: ${textColor}; word-break: inherit; text-align: left; line-height: inherit;">${divContent}</div>\n`;
            }
            else if (block.type === 'bgm') {
                hasBgm = true;
                let vid = extractVideoId(block.bgmUrl);
                htmlStr = `<div id="preview-block-${index}" data-type="bgm" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: 10px 0; text-align: center; box-sizing: border-box;"><div style="display: inline-flex; align-items: center; background-color: ${isDarkMode ? '#333' : '#ffffff'}; border: 1px solid ${isDarkMode ? '#444' : '#e5e5ea'}; border-radius: 20px; padding: 4px 12px; gap: 8px; font-size: 11px; color: ${isDarkMode ? '#ccc' : '#8e8e93'}; box-shadow: 0 1px 2px rgba(0,0,0,0.02); line-height: 1;"><span style="display: flex; align-items: center; color: ${isDarkMode ? '#888' : '#aeaeb2'};"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></span><span style="max-width: 120px; padding: 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${isDarkMode ? '#F9F9F8' : '#3a3a3c'};">${block.bgmTitle || 'BGM'}</span><span style="color: ${isDarkMode ? '#555' : '#d1d1d6'};">|</span><div style="display: flex; align-items: center; gap: 4px;"><div onclick="playBGM('${vid}', '${block.bgmTitle}')" style="cursor: pointer; width: 18px; height: 18px; border-radius: 50%; background-color: ${isDarkMode ? '#444' : '#f2f2f7'}; display: flex; align-items: center; justify-content: center; transition: 0.2s;" title="재생"><svg width="8" height="8" viewBox="0 0 24 24" fill="${isDarkMode ? '#F9F9F8' : '#3a3a3c'}"><path d="M8 5v14l11-7z"/></svg></div><div onclick="stopBGM()" style="cursor: pointer; width: 18px; height: 18px; border-radius: 50%; background-color: ${isDarkMode ? '#444' : '#f2f2f7'}; display: flex; align-items: center; justify-content: center; transition: 0.2s;" title="정지"><svg width="7" height="7" viewBox="0 0 24 24" fill="${isDarkMode ? '#F9F9F8' : '#3a3a3c'}"><path d="M6 6h12v12H6z"/></svg></div></div></div></div>\n`;
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
                            dateHtml = `<div><div style="font-size: 12px; color: ${cMainText};">🗓️ ${mainDate}</div>${subDate ? `<div style="font-size: 11px; color: ${cMuted}; margin-top: 2px;">${subDate}</div>` : ''}</div>`;
                        }
                        let locHtml = '<div></div>';
                        if (sData.loc) {
                            locHtml = `<div style="text-align: right; font-size: 12px; color: ${cMainText};">📍 ${sData.loc}</div>`;
                        }
                        statusHtml += `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid ${cBoxBorder}; padding-bottom: 8px; margin-bottom: 8px;">${dateHtml}${locHtml}</div>`;
                    }

                    if (sData.ring) {
                        statusHtml += `<div style="font-size: 11px; color: ${cStatusText}; margin-bottom: 10px; line-height: 1.5; word-break: break-all;">${sData.ring}</div>`;
                    }

                    if (sData.outfit) {
                        if (sData.outfit.includes('/')) {
                            let parts = sData.outfit.split('/');
                            let p1 = parts[0].trim();
                            let p2 = parts.slice(1).join('/').trim();
                            statusHtml += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin-bottom: 10px;"><div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; padding: 8px 10px; border-radius: 4px; box-sizing: border-box;"><div style="font-size: 11px; color: ${cMuted}; margin-bottom: 2px;">👕 OUTFIT</div><div style="font-size: 12px; color: ${cMainText}; line-height: 1.4;">${p1}</div></div><div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; padding: 8px 10px; border-radius: 4px; box-sizing: border-box;"><div style="font-size: 11px; color: ${cMuted}; margin-bottom: 2px;">👕 OUTFIT</div><div style="font-size: 12px; color: ${cMainText}; line-height: 1.4;">${p2}</div></div></div>`;
                        } else {
                            statusHtml += `<div style="margin-bottom: 10px;"><div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; padding: 8px 10px; border-radius: 4px; box-sizing: border-box;"><div style="font-size: 11px; color: ${cMuted}; margin-bottom: 2px;">👕 OUTFIT</div><div style="font-size: 12px; color: ${cMainText}; line-height: 1.4;">${sData.outfit}</div></div></div>`;
                        }
                    }

                    if (sData.state || sData.thought) {
                        statusHtml += `<div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; border-radius: 4px; padding: 10px; margin-bottom: 10px; box-sizing: border-box;">`;
                        if (sData.state) {
                            statusHtml += `<div style="${sData.thought ? 'margin-bottom: 8px;' : ''}"><span style="font-size: 11px; background-color: ${cBadgeBg}; color: ${cBadgeText}; padding: 2px 4px; border-radius: 2px;">👥 STATE</span><div style="margin-top: 4px; font-size: 12px; color: ${cMainText}; line-height: 1.5;">${sData.state}</div></div>`;
                        }
                        if (sData.state && sData.thought) {
                            statusHtml += `<hr style="border: 0; border-top: 1px dashed ${cBoxBorder}; margin: 8px 0;">`;
                        }
                        if (sData.thought) {
                            statusHtml += `<div><span style="font-size: 11px; background-color: ${cBadgeBg}; color: ${cBadgeText}; padding: 2px 4px; border-radius: 2px;">💭 INNER THOUGHT</span><div style="margin-top: 4px; font-size: 12px; color: ${cStatusText}; font-style: italic; line-height: 1.5;">${sData.thought}</div></div>`;
                        }
                        statusHtml += `</div>`;
                    }

                    if (sData.alert || sData.guide || sData.affection) {
                        statusHtml += `<div style="background-color: ${cAlertBg}; border-left: 3px solid ${cAlertBorder}; padding: 8px 10px; margin-bottom: 10px; box-sizing: border-box;">`;
                        if (sData.alert) {
                            statusHtml += `<div style="font-size: 12px; color: ${cStatusText}; margin-bottom: ${(sData.guide || sData.affection) ? '6px' : '0'};"><span class="bell">🔔</span> ${sData.alert}</div>`;
                        }
                        if (sData.guide) {
                            let parts = sData.guide.split('|').map(s=>s.trim());
                            let val = parts[0] || '0%';
                            let state = parts[1] || '';
                            let desc = parts[2] || '';
                            let num = val.replace(/[^0-9]/g, '');
                            statusHtml += `<div style="margin-bottom: ${sData.affection ? '6px' : '0'};"><div style="display: flex; justify-content: space-between; font-size: 11px; color: ${cMuted}; margin-bottom: 3px;"><span>🚨 가이딩 필요 수치</span><span>${val} ${state ? `(${state})` : ''}</span></div><div style="background-color: ${cProgressBar}; height: 4px; border-radius: 2px; overflow: hidden;"><div style="width: ${num}%; height: 100%; background-color: #A8E6CF;"></div></div>${desc ? `<div style="font-size: 10px; color: ${cMuted}; margin-top: 2px; text-align: right;">${desc}</div>` : ''}</div>`;
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
                            
                            statusHtml += `<div><div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: ${cMuted}; margin-bottom: 6px;"><span style="margin-bottom: 2px;">💕 호감도</span><div style="text-align: right;"><div style="color: #E598A6; font-weight: bold; font-size: 12px;">${mainVal}</div>${bracketText ? `<div style="font-size: 10.5px; color: ${cMuted}; margin-top: 3px; font-weight: normal; word-break: break-all;">${bracketText}</div>` : ''}</div></div><div style="background-color: ${cProgressBar}; height: 4px; border-radius: 2px; overflow: hidden;"><div style="width: ${num}%; height: 100%; background-color: #FFB6C1;"></div></div></div>`;
                        }
                        statusHtml += `</div>`;
                    }

                    if (sData.nsfw || sData.tmi) {
                        let gridCols = (sData.nsfw && sData.tmi) ? '110px 1fr' : '1fr';
                        statusHtml += `<div style="display: grid; grid-template-columns: ${gridCols}; gap: 8px; margin-bottom: 10px;">`;
                        if (sData.nsfw) {
                            statusHtml += `<div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; padding: 8px 10px; border-radius: 4px; box-sizing: border-box;"><div style="font-size: 11px; color: ${cMuted}; margin-bottom: 2px;">❤️‍🔥 NSFW COUNT</div><div style="font-size: 12px; color: ${cMainText};">${sData.nsfw}</div></div>`;
                        }
                        if (sData.tmi) {
                            statusHtml += `<div style="background-color: ${cBoxBg}; border: 1px solid ${cBoxBorder}; padding: 8px 10px; border-radius: 4px; box-sizing: border-box;"><div style="font-size: 11px; color: ${cMuted}; margin-bottom: 2px;">🔫 TMI</div><div style="font-size: 12px; color: ${cMainText}; line-height: 1.4;">${sData.tmi}</div></div>`;
                        }
                        statusHtml += `</div>`;
                    }

                    if (sData.interview || sData.relation) {
                        statusHtml += `<div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">`;
                        if (sData.interview) {
                            let ivText = sData.interview.replace(/^(PC에 대한 랜덤 인터뷰|랜덤 인터뷰|인터뷰)/i, '').replace(/^[|\s:]+/, '');
                            ivText = ivText.replace(/\s*(A\.)/g, '<br><br>$1').replace(/^(<br>)+/, '');
                            statusHtml += `<div style="background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'}; border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}; padding: 10px 12px; border-radius: 4px; box-sizing: border-box; border-left: 3px solid ${isDarkMode ? '#475569' : '#94a3b8'};"><div style="font-size: 11px; color: ${isDarkMode ? '#94a3b8' : '#64748b'}; margin-bottom: 4px; font-weight: bold;">📰 INTERVIEW</div><div style="font-size: 12px; color: ${isDarkMode ? '#e2e8f0' : '#334155'}; line-height: 1.5; font-style: italic;">${ivText}</div></div>`;
                        }
                        if (sData.relation) {
                            let relText = sData.relation.replace(/^(뱅이 생각하는 PC와의 관계|뱅이 생각하는 관계|PC와의 관계|관계)/i, '').replace(/^[|\s:]+/, '');
                            statusHtml += `<div style="background-color: ${isDarkMode ? '#4c0519' : '#fff0f2'}; border: 1px solid ${isDarkMode ? '#881337' : '#ffe4e6'}; padding: 10px 12px; border-radius: 4px; box-sizing: border-box; border-left: 3px solid ${isDarkMode ? '#e11d48' : '#fecdd3'};"><div style="font-size: 11px; color: ${isDarkMode ? '#fda4af' : '#e11d48'}; margin-bottom: 4px; font-weight: bold;">💘</div><div style="font-size: 12px; color: ${isDarkMode ? '#ffe4e6' : '#4c0519'}; line-height: 1.5;">${relText}</div></div>`;
                        }
                        statusHtml += `</div>`;
                    }

                    if (sData.doodle) {
                        statusHtml += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid ${cBoxBorder}; text-align: center; width: 100%; box-sizing: border-box;"><span style="font-size: 12px; color: ${cMuted}; display: inline-block;">${sData.doodle}</span></div>`;
                    }

                    statusHtml += `</div>\n`;
                    htmlStr = statusHtml;
                }
            }
            else if (block.type === 'narration') {
                htmlStr = `<div id="preview-block-${index}" data-type="narration" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: ${mt} 0 0; padding: 5px 0; box-sizing: border-box; color: ${narrColor}; font-style: ${narrItalic}; word-break: inherit; text-align: left; line-height: inherit;">${divContent}</div>\n`;
            }
            else if (block.type === 'thought') {
                htmlStr = `<div id="preview-block-${index}" data-type="thought" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: ${mt} 0 0; padding: 5px 0; box-sizing: border-box; color: ${isDarkMode ? '#8e8e93' : '#8e8e93'}; font-style: italic; word-break: inherit; text-align: left; line-height: inherit;">${divContent}</div>\n`;
            }
            else if (block.type === 'dday') {
                htmlStr = `<div id="preview-block-${index}" data-type="dday" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: 20px 0; text-align: left; padding: 0; box-sizing: border-box;"><span style="font-size: 13px; color: ${cMuted}; font-weight: 600;"> ${applyTextStyles(block.content)}</span></div>\n`;
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

                htmlStr = `<div id="preview-block-${index}" data-type="postit" onclick="focusAndScrollBlock(${index}, true)" style="margin: 25px auto 40px; max-width: 450px; background: ${bgStr}; color: ${textStr}; padding: 24px 24px 20px; ${shadowStr} border-radius: 1px; transform: ${rotStr}; position: relative; border-top: 1px solid ${borderStr}; word-break: break-all; ${zIdxStr}"><div style="position: absolute; ${tapePos} transform: translateX(-50%) ${tapeRot}; background: ${tapeBg}; border-left: 1px dashed rgba(0,0,0,0.05); border-right: 1px dashed rgba(0,0,0,0.05); pointer-events: none;"></div><div class="postit-scroll" style="line-height: 1.7; font-size: 14px;">${divContent}</div></div>\n`;
            }
            else if (block.type === 'polaroid') {
                let isEvenPol = consecutivePolaroidCount % 2 === 0;

                let bgStr = isDarkMode ? '#242424' : '#FFFFFF';
                let borderStr = isDarkMode ? '#444444' : '#E5E5EA';
                let imgBgStr = isDarkMode ? '#111111' : '#F2F2F7';
                let dateColor = isDarkMode ? '#888888' : '#AFAFB4';
                let capColor = isDarkMode ? '#eeeeee' : '#1C1C1E';
                let tapeBg = isDarkMode ? 'rgba(80, 80, 85, 0.5)' : 'rgba(235, 235, 240, 0.7)';
                
                let rotStr = isEvenPol ? 'rotate(-1.8deg)' : 'rotate(1.5deg)';
                let tapeRot = isEvenPol ? 'rotate(2deg)' : 'rotate(-2deg)';
                let tapePos = isEvenPol ? 'left: 48%;' : 'left: 50%;';

                let imgSrc = block.content || '[https://via.placeholder.com/380x380?text=Polaroid+Image](https://via.placeholder.com/380x380?text=Polaroid+Image)';
                
                let pDate = applyTextStyles(block.polaroidDate || '');
                let pCap = applyTextStyles(block.polaroidCaption || '');

                let captionHtml = '';
                if (pDate || pCap) {
                    captionHtml = `<div style="display: flex; flex-direction: column; gap: 5px; padding: 2px 4px 0;">${pDate ? `<div style="font-size: 11px; color: ${dateColor}; font-weight: 600; letter-spacing: 0.02em;">${pDate}</div>` : ''}${pCap ? `<div style="font-size: 13px; color: ${capColor}; line-height: 1.5; font-style: italic; word-break: break-all;">${pCap}</div>` : ''}</div>`;
                }

                htmlStr = `<div id="preview-block-${index}" data-type="polaroid" onclick="focusAndScrollBlock(${index}, true)" style="margin: 45px auto 25px; max-width: 380px; background: ${bgStr}; border: 1px solid ${borderStr}; box-shadow: 0 4px 12px rgba(0,0,0,0.04); padding: 16px 16px 24px 16px; border-radius: 1px; display: flex; flex-direction: column; gap: 14px; transform: ${rotStr}; position: relative;"><div style="position: absolute; top: -10px; ${tapePos} transform: translateX(-50%) ${tapeRot}; width: 80px; height: 20px; background: ${tapeBg}; border-left: 1px dashed rgba(0,0,0,0.04); border-right: 1px dashed rgba(0,0,0,0.04); pointer-events: none;"></div><div style="width: 100%; overflow: hidden; background-color: ${imgBgStr}; display: flex; justify-content: center; align-items: center;"><img src="${imgSrc}" style="width: 100%; height: auto; display: block; object-fit: contain;" alt="Polaroid Photo"></div>${captionHtml}</div>\n`;
            }
            else if (block.type === 'image') {
                htmlStr = `<div id="preview-block-${index}" data-type="image" onclick="focusAndScrollBlock(${index}, true)" style="width: 100%; margin: 15px 0; text-align: center; box-sizing: border-box;"><img src="${block.content}" style="max-width: 100%; border-radius: 8px;" alt="image"></div>\n`;
            }
            else if (block.type === 'html') {
                htmlStr = `<div id="preview-block-${index}" data-type="html" onclick="focusAndScrollBlock(${index}, true)">${block.content}</div>\n`;
            }
        }

        innerContent += htmlStr;

        if (curr !== 'empty' && curr !== 'bgm' && curr !== 'html' && curr !== 'divider') {
            prevValidType = curr;
            if (curr === 'custom') {
                lastCustomTextColor = block.customTextColor;
                lastCustomName = block.customName;
            }
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
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');

.tistory-post-wrapper {
    font-family: ${currentFontFamily};
    font-size: ${currentFontSize}px;
    line-height: ${currentLineHeight};
    letter-spacing: ${currentLetterSpacing}em;
    word-break: ${currentWordBreak};
    overflow-wrap: ${currentWordBreak === 'break-all' ? 'anywhere' : 'break-word'};
    padding: ${outputVersion === 2 ? '0 0px' : '0 25px'};
    box-sizing: border-box;
    max-width: 600px;
    margin: 0 auto;
    ${isDarkMode ? 'background-color: #1B1B1B; color: #F9F9F8;' : ''}
}
.tistory-post-wrapper * { box-sizing: border-box; }

/* 티스토리 스킨의 이미지 간섭 방지 및 아바타 고정 */
.tistory-post-wrapper img {
    max-width: none !important;
}
.tistory-post-wrapper .av img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    display: block !important;
    margin: 0 !important;
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
</style>
`;

    let previewHtml = globalStyle + `<div class="tistory-post-wrapper">\n` + innerContent + `</div>\n`;
    
    let cleanInnerContent = innerContent
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
    #content-wrapper { padding-top: 15px; padding-bottom: 50px; }

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
        finalHtml = globalStyle + `<div class="tistory-post-wrapper">\n${cleanInnerContent}\n</div>`;
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

    let container = tempDiv.querySelector('#content-wrapper') || tempDiv.querySelector('.tistory-post-wrapper') || tempDiv.querySelector('body') || tempDiv;
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
        let customBgColor = '#E2E8F0';
        let customName = '';
        let customProfileUrl = '';
        let bgmTitle = '';
        let bgmUrl = '';
        let polaroidDate = '';
        let polaroidCaption = '';
        
        let outerHtml = child.outerHTML;
        let innerTextClean = (child.textContent || "").replace(/\s+/g, '');

        if (!type) {
            if (outerHtml.includes('playBGM')) {
                type = 'bgm';
            } else if (outerHtml.includes('max-width: 500px') && (outerHtml.includes('#fdfdfd') || outerHtml.includes('상태창') || outerHtml.includes('INNER THOUGHT') || outerHtml.includes('#242424'))) {
                type = 'status'; 
            } else if (child.style.fontStyle === 'italic' && (child.style.color === 'rgb(119, 119, 119)' || child.style.color === 'rgb(142, 142, 147)')) {
                type = 'thought';
            } else if (child.style.color === 'rgb(69, 159, 165)' || child.style.color === 'rgb(178, 228, 212)' || child.style.color === 'rgb(35, 119, 104)' || child.style.color === 'rgb(29, 111, 96)') { 
                type = 'mint';
            } else if (child.style.color === 'rgb(245, 189, 204)' || child.style.color === 'rgb(155, 62, 97)') {
                type = 'pink';
            } else if (child.querySelector('img') && !outerHtml.includes('border-radius: 50%') && !outerHtml.includes('Polaroid') && !outerHtml.includes('av')) {
                type = 'image';
            } else if (outerHtml.includes('font-weight: bold') && child.style.textAlign === 'left') {
                type = 'title';
            } else if (outerHtml.includes('color: #8e8e93') || outerHtml.includes('0.8em') || outerHtml.includes('13px')) {
                type = 'dday';
            } else if (outerHtml.includes('background-color: #333333') || outerHtml.includes('background-color: #e5e5ea') || outerHtml.includes('rotate(45deg)') || outerHtml.includes('dashed')) {
                type = 'divider';
            } else if (outerHtml.includes('data-type="postit"') || (outerHtml.includes('max-width: 450px') && outerHtml.includes('rotate(') && !outerHtml.includes('Polaroid'))) {
                type = 'postit';
            } else if (outerHtml.includes('data-type="polaroid"') || outerHtml.includes('Polaroid')) {
                type = 'polaroid';
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
            let textTarget = child;
            let isBubbleMode = false;
            
            if (child.classList && (child.classList.contains('scroll-msg-box') || child.classList.contains('m-msg'))) {
                isBubbleMode = true;
                let bubble2Target = child.querySelector('.m-bubble');
                if (bubble2Target) {
                    textTarget = bubble2Target;
                    let nameEl = child.querySelector('.m-name');
                    if (nameEl) customName = nameEl.textContent.trim();
                    let imgEl = child.querySelector('.av img');
                    if (imgEl) customProfileUrl = imgEl.src;
                    customBgColor = rgbToHex(bubble2Target.style.backgroundColor) || '#E2E8F0';
                } else if (child.children.length > 1) {
                    textTarget = child.children[1];
                    let imgEl = child.querySelector('img');
                    if (imgEl) customProfileUrl = imgEl.src;
                    customBgColor = rgbToHex(textTarget.style.backgroundColor) || '#E2E8F0';
                }
            }

            let rawHtml = textTarget.innerHTML || '';
            rawHtml = rawHtml.replace(/<div class="bubble-tail"[^>]*>.*?<\/div>/gi, '');
            rawHtml = rawHtml.replace(/<br\s*[\/]?>/gi, '\n').replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '').replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '').replace(/&nbsp;/gi, ' ');
            content = rawHtml.replace(/^\n+|\n+$/g, '').trim();
            
            let textHex = rgbToHex(textTarget.style.color || child.style.color);

            if (type === 'mint') {
                if (!foundMint) {
                    if (textHex) {
                        if (isBubbleMode) {
                            let b1 = document.getElementById('mintBubbleTextColor');
                            let b2 = document.getElementById('mintBubbleTextColorPicker');
                            let bg1 = document.getElementById('mintBgColor');
                            let bg2 = document.getElementById('mintBgColorPicker');
                            if (b1) b1.value = textHex; if (b2) b2.value = textHex;
                            if (customBgColor) { if (bg1) bg1.value = customBgColor; if (bg2) bg2.value = customBgColor; }
                        } else {
                            let m1 = document.getElementById('mintTextColor');
                            let m2 = document.getElementById('mintTextColorPicker');
                            if (m1) m1.value = textHex; if (m2) m2.value = textHex;
                        }
                    }
                    foundMint = true;
                }
            } else if (type === 'pink') {
                if (!foundPink) {
                    if (textHex) { 
                        if (isBubbleMode) {
                            let b1 = document.getElementById('pinkBubbleTextColor');
                            let b2 = document.getElementById('pinkBubbleTextColorPicker');
                            let bg1 = document.getElementById('pinkBgColor');
                            let bg2 = document.getElementById('pinkBgColorPicker');
                            if (b1) b1.value = textHex; if (b2) b2.value = textHex;
                            if (customBgColor) { if (bg1) bg1.value = customBgColor; if (bg2) bg2.value = customBgColor; }
                        } else {
                            let p1 = document.getElementById('pinkTextColor');
                            let p2 = document.getElementById('pinkTextColorPicker');
                            if (p1) p1.value = textHex; if (p2) p2.value = textHex;
                        }
                    }
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
        } else if (type === 'narration') {
            let rawHtml = child.innerHTML.replace(/<br\s*[\/]?>/gi, '\n').replace(/<div[^>]*>/gi, '\n').replace(/<\/div>/gi, '').replace(/<p[^>]*>/gi, '\n').replace(/<\/p>/gi, '').replace(/&nbsp;/gi, ' ');
            content = rawHtml.replace(/^\n+|\n+$/g, '');

            if (!foundNarr) {
                let nColor = rgbToHex(child.style.color);
                if (nColor) {
                    let n1 = document.getElementById('narrColor');
                    let n2 = document.getElementById('narrColorPicker');
                    if (n1) n1.value = nColor;
                    if (n2) n2.value = nColor;
                }
                let italicCheck = document.getElementById('narrItalic');
                if (italicCheck) italicCheck.checked = child.style.fontStyle === 'italic';
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
            customBgColor: customBgColor,
            customName: customName,
            customProfileUrl: customProfileUrl,
            bgmTitle: bgmTitle,
            bgmUrl: bgmUrl,
            polaroidDate: polaroidDate,
            polaroidCaption: polaroidCaption
        });
    });

    if (newBlocks.length > 0) {
        blocks = newBlocks;
        if (typeof renderEditor === 'function') renderEditor();
        saveState(); 
    } else {
        showToast('유효한 블록이 없습니다. 코드를 확인해주세요.');
    }
}

function copyHtml() {
    const code = document.getElementById('finalHtmlCode');
    if(code) {
        code.select();
        document.execCommand('copy');
        showToast('최종 HTML이 복사되었습니다!');
    }
}
