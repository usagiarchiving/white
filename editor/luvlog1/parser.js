// ==========================================
// parser.js
// 신규 텍스트 파싱 엔진 (Javier & Ines 연동)
// ==========================================

function parseAdvancedMarkdown(text) {
    if (!text) return text;
    let hlColorEl = document.getElementById('highlightColor');
    let hlColor = hlColorEl ? hlColorEl.value : '#C4F0E9';

    let t = text;
    t = t.replace(/~~([^~]+)~~/g, '<s style="text-decoration: line-through;">$1</s>');
    t = t.replace(/\+\+([^+]+)\+\+/g, '<u style="text-decoration: underline;">$1</u>');
    t = t.replace(/==([^=]+)==/g, `<mark style="background-color: ${hlColor}; color: inherit; padding: 0 2px; border-radius: 2px;">$1</mark>`);
    return t;
}

function parseBulkInput() {
    try {
        const bulkInput = document.getElementById('bulkInput');
        let text = bulkInput.value;
        
        if (!text.trim()) {
            if (typeof showToast === 'function') showToast('변환할 텍스트를 입력해주세요.');
            return;
        }

        // 💡 [추가] 특정 이미지 매핑 링크
        const imgMap = {
            'lowrider': 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2F1fc8d042-14e3-45e4-af75-03000fe8426a.webp?alt=media&token=e5d95796-8458-45ff-8f1b-3a5dfa10ea9d&v=1793377073787',
            'tattoo': 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2F4eed3b00-e45d-4f18-b496-3093d6fd89cd.webp?alt=media&token=fbcd8340-7571-43e6-9e7a-801118dfe3dd&v=1793377073946'
        };

        // 💡 [추가] 상태창 <Apogee ... /> 태그 보존을 위한 치환
        text = text.replace(/<Apogee[\s\S]*?\/>/gi, (match) => {
            return `\n@@STATUS_BLOCK@@\n${match}\n@@STATUS_BLOCK_END@@\n`;
        });

        const lines = text.split(/\n/); 
        let statusBuffer = [];
        let isCodeBlock = false;
        let codeBuffer = [];

        lines.forEach(line => {
            let seg = line.trim();

            // 💡 [추가] 상태창 블록 처리
            if (seg === '@@STATUS_BLOCK@@' || seg === '@@STATUS_BLOCK_END@@') return;
            if (seg.startsWith('<Apogee')) {
                blocks.push({ type: 'status', content: seg });
                return;
            }

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

            // 💡 [추가] 특수 이미지 인식 블록 {{img::...}}
            const imgMatch = seg.match(/\{\{img::([^}]+)\}\}/);
            if (imgMatch) {
                const imgKey = imgMatch[1].trim();
                const imgUrl = imgMap[imgKey] || '';
                if (imgUrl) {
                    blocks.push({ type: 'image', content: imgUrl });
                }
                return;
            }

            if (seg === '---' || seg === '***' || seg.startsWith('구분선:')) {
                blocks.push({ type: 'divider', content: 'solid-gray' });
                return;
            }

            seg = parseAdvancedMarkdown(seg);

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

                // 기존 레거시 태그 호환성 유지 (Mint/Pink -> Javier/Ines)
                if (seg.startsWith('제목:')) { blocks.push({ type: 'title', content: stripSymbols(seg.replace(/^제목:\s*/, '')) }); return; }
                if (seg.startsWith('민트:') || seg.startsWith('Javier:')) { blocks.push({ type: 'javier', content: stripSymbols(seg.replace(/^(민트|Javier):\s*/, '')) }); return; }
                if (seg.startsWith('핑크:') || seg.startsWith('Ines:')) { blocks.push({ type: 'ines', content: stripSymbols(seg.replace(/^(핑크|Ines):\s*/, '')) }); return; }
                if (seg.startsWith('모브:')) { blocks.push({ type: 'mob', content: stripSymbols(seg.replace(/^모브:\s*/, '')) }); return; }
                if (seg.startsWith('제3자:')) { blocks.push({ type: 'custom', content: stripSymbols(seg.replace(/^제3자:\s*/, '')), customTextColor: '#333333' }); return; }
                if (seg.startsWith('속마음:')) { blocks.push({ type: 'thought', content: stripSymbols(seg.replace(/^속마음:\s*/, '')) }); return; }
                
                if (seg.startsWith('포스트잇:')) { blocks.push({ type: 'postit', content: stripSymbols(seg.replace(/^포스트잇:\s*/, '')) }); return; }
                if (seg.startsWith('폴라로이드:')) { 
                    let parts = stripSymbols(seg.replace(/^폴라로이드:\s*/, '')).split('|');
                    blocks.push({ type: 'polaroid', content: parts[0] ? parts[0].trim() : '', polaroidDate: parts[1] ? parts[1].trim() : '', polaroidCaption: parts[2] ? parts[2].trim() : '' });
                    return;
                }

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

                // 💡 [추가] 인물 대사 자동 인식 및 분류 (**Name** | "Dialogue")
                const dialogMatch = seg.match(/^\*\*([^*]+)\*\*\s*[|｜│]\s*(.*)$/);
                if (dialogMatch) {
                    const charName = dialogMatch[1].trim();
                    let dialogText = dialogMatch[2].trim().replace(/^["“]|["”]$/g, ''); 

                    let blockType = 'custom';
                    let customTextColor = '#333333';
                    let customBgColor = '#E2E8F0';

                    if (charName.includes('Javier')) {
                        blockType = 'javier';
                    } else if (charName.includes('Ines')) {
                        blockType = 'ines';
                    } else {
                        blockType = 'custom';
                        customTextColor = '#4A4A4A'; 
                    }

                    blocks.push({
                        type: blockType,
                        content: dialogText,
                        customName: blockType === 'custom' ? charName : '',
                        customTextColor: customTextColor,
                        customBgColor: customBgColor
                    });
                    return;
                }

                // 번역 괄호 처리 (<br>(...) 또는 (...)) -> 바로 위 블록과 병합
                if (seg.startsWith('<br>') || (seg.startsWith('(') && seg.endsWith(')'))) {
                    let lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
                    if (lastBlock && ['javier', 'ines', 'mob', 'custom'].includes(lastBlock.type)) {
                        let addition = seg.replace(/^<br>\s*/i, '').trim();
                        lastBlock.content += '\n' + addition;
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
                            // 💡 [수정] 따옴표만 있는 텍스트는 요청하신 대로 '제3자(custom)'로 자동 분류
                            if (diag) blocks.push({ type: 'custom', content: diag });
                        } else { 
                           if (/^\(.*\)$/.test(part)) {
                              let lastBlock = blocks[blocks.length - 1];
                               if (lastBlock && ['javier', 'ines', 'mob', 'custom'].includes(lastBlock.type)) {
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

        if (typeof renderEditor === 'function') renderEditor();
        if (typeof saveState === 'function') saveState(); 
        bulkInput.value = ''; 
        if (typeof showToast === 'function') showToast('로그가 성공적으로 변환되었습니다! 🚀');
    } catch(e) {
        console.error(e);
        if (typeof showToast === 'function') showToast('텍스트 변환 중 오류가 발생했습니다.');
    }
}
