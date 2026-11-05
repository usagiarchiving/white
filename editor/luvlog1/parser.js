// ==========================================
// parser.js
// 신규 텍스트 파싱 엔진 (Javier & Ines 전용)
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

        // 💡 [신규] 특정 이미지 매핑 링크
        const imgMap = {
            'lowrider': 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2F1fc8d042-14e3-45e4-af75-03000fe8426a.webp?alt=media&token=e5d95796-8458-45ff-8f1b-3a5dfa10ea9d&v=1793377073787',
            'tattoo': 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2F4eed3b00-e45d-4f18-b496-3093d6fd89cd.webp?alt=media&token=fbcd8340-7571-43e6-9e7a-801118dfe3dd&v=1793377073946'
        };

        // 💡 [신규] 상태창 <Apogee ... /> 태그 보존을 위한 사전 치환
        text = text.replace(/<Apogee[\s\S]*?\/>/gi, (match) => {
            return `\n@@STATUS_BLOCK@@\n${match}\n@@STATUS_BLOCK_END@@\n`;
        });

        const lines = text.split(/\n/); 
        let isCodeBlock = false;
        let codeBuffer = [];

        lines.forEach(line => {
            let seg = line.trim();

            if (!seg || seg === '@@STATUS_BLOCK_END@@') return;

            // 상태창 블록 처리
            if (seg === '@@STATUS_BLOCK@@') return;
            if (seg.startsWith('<Apogee')) {
                blocks.push({ type: 'status', content: seg });
                return;
            }

            // HTML 마크다운 코드 블록
            if (seg.startsWith('```')) {
                if (isCodeBlock) {
                    blocks.push({ type: 'html', content: codeBuffer.join('\n') });
                    codeBuffer = [];
                    isCodeBlock = false;
                } else {
                    isCodeBlock = true;
                    codeBuffer = [];
                }
                return;
            }
            if (isCodeBlock) {
                codeBuffer.push(line);
                return;
            }

            // 💡 [신규] 특수 이미지 인식 블록 {{img::...}}
            const imgMatch = seg.match(/\{\{img::([^}]+)\}\}/);
            if (imgMatch) {
                const imgKey = imgMatch[1].trim();
                const imgUrl = imgMap[imgKey] || '';
                if (imgUrl) {
                    blocks.push({ type: 'image', content: imgUrl });
                }
                return;
            }

            // 일반 마크다운 구분선
            if (seg === '---' || seg === '***' || seg.startsWith('구분선:')) {
                blocks.push({ type: 'divider', content: 'solid-gray' });
                return;
            }

            seg = parseAdvancedMarkdown(seg);

            // 나레이션 지문 인식 (*...*)
            if (seg.startsWith('*') && seg.endsWith('*')) {
                blocks.push({ type: 'narration', content: stripSymbols(seg.replace(/^\*|\*$/g, '')) });
                return;
            }

            // 💡 [신규] 인물 대사 자동 인식 및 분류 (**Name** | "Dialogue")
            const dialogMatch = seg.match(/^\*\*([^*]+)\*\*\s*[|｜│]\s*(.*)$/);
            if (dialogMatch) {
                const charName = dialogMatch[1].trim();
                let dialogText = dialogMatch[2].trim().replace(/^["“]|["”]$/g, ''); 

                let blockType = 'custom';
                let customTextColor = '#333333';
                let customBgColor = '#E2E8F0';

                // 요청하신 Javier와 Ines 화자 분류 (그 외는 무조건 custom)
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

            // 번역 괄호 (<br>(...) 또는 (...)) 처리 -> 바로 위 블록이 대사라면 병합
            if (seg.startsWith('<br>') || (seg.startsWith('(') && seg.endsWith(')'))) {
                let lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
                if (lastBlock && ['javier', 'ines', 'custom'].includes(lastBlock.type)) {
                    let addition = seg.replace(/^<br>\s*/i, '').trim();
                    lastBlock.content += '\n' + addition;
                    return;
                }
            }

            // 분류되지 않은 나머지 일반 문장은 나레이션으로 처리
            blocks.push({ type: 'narration', content: stripSymbols(seg) });
        });

        // 닫히지 않은 코드 블록이 있을 경우 처리
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
