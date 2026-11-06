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
        
        if (!text.trim()) return; // 💡 팝업창(Toast) 삭제

        const imgMap = {
          'lowrider': 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2F1fc8d042-14e3-45e4-af75-03000fe8426a.webp?alt=media&token=e5d95796-8458-45ff-8f1b-3a5dfa10ea9d&v=1793377073787',
          'peek': 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2Fc91c63c9-8f91-477a-8800-4bb4816d43d7.webp?alt=media&token=0565f751-1a1d-4276-8c28-f373b55cf7bd&v=1793377073573',
          'cold': 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2Fb5693ccc-eb98-4929-9941-ce79e0b1a218.webp?alt=media&token=aa915222-668b-4cbc-acaa-108911a1568b&v=1793377073573',
          'poker': 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2Fc9426974-fc2d-4e32-8c2d-87f0b380d647.webp?alt=media&token=5816dd13-0b06-4062-9629-396b0a4ea8df&v=1793377073936',
          'chip': 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2Fca627f84-71c5-499d-8e92-215261da2600.webp?alt=media&token=abd31c93-536e-4358-84e9-0edb847b77fe&v=1793377073738',
          'tattoo': 'https://firebasestorage.googleapis.com/v0/b/chat-ai-7a275.firebasestorage.app/o/users%2FpWJxBI4kB7P9LX5pzwTTRZ10P1C2%2Fcharacter_images%2Fcircumstances%2F4eed3b00-e45d-4f18-b496-3093d6fd89cd.webp?alt=media&token=fbcd8340-7571-43e6-9e7a-801118dfe3dd&v=1793377073946'

        };

        text = text.replace(/<Apogee[\s\S]*?\/>/gi, (match) => {
            return `\n@@STATUS_BLOCK@@\n${match}\n@@STATUS_BLOCK_END@@\n`;
        });

        const lines = text.split(/\n/); 
        let statusBuffer = [];
        let isCodeBlock = false;
        let codeBuffer = [];

        lines.forEach(line => {
            let seg = line.trim();

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

            const isEmojiStart = /^(🗓|💍|📍|👕|👥|💭|🔔|🚨|💕|❤|🔥|🔫|✏|📰|💘)/.test(seg);

            if (isEmojiStart) {
                if (seg.startsWith('🗓') && statusBuffer.length > 0) {
                    blocks.push({ type: 'status', content: statusBuffer.join('\n') });
                    statusBuffer = [];
                }
                statusBuffer.push(seg);
            } else {
                if (statusBuffer.length > 0) {
                    blocks.push({ type: 'status', content: statusBuffer.join('\n') });
                    statusBuffer = [];
                }

                // 💡 [추가] 인물 대사 인식 (이름 | "대사") -> 제3자(회색) 처리
                const nameDialogMatch = seg.match(/^(.*?)\s*[|｜│]\s*(["“].*)$/);
                if (nameDialogMatch) {
                    let rawName = nameDialogMatch[1].replace(/^\*\*?|\*\*?$/g, '').trim(); 
                    
                    let blockType = 'custom';
                    let textColor = '#8e8e93'; 

                    if (rawName.toLowerCase().includes('javier') || rawName.includes('하비에르')) {
                        blockType = 'javier';
                    } else if (rawName.toLowerCase().includes('ines') || rawName.includes('이네스')) {
                        blockType = 'ines';
                    }

                    blocks.push({
                        type: blockType,
                        content: seg, // **Javier Espinoza | "..." 형태 보존 (소설 렌더링용)
                        customName: blockType === 'custom' ? rawName : '',
                        customTextColor: textColor,
                        customBgColor: '#E2E8F0'
                    });
                    return;
                }

                // 💡 [추가] 이름 없는 대사 ("대사") -> 기본 Javier로 할당 (나중에 모브 변경 가능)
                if (/^["“].*?["”]/.test(seg)) {
                    blocks.push({ type: 'javier', content: seg });
                    return;
                }

                // 💡 [추가] 번역 괄호 (...) -> 직전 대사 블록에 병합
                if (seg.startsWith('(') && seg.endsWith(')')) {
                    let lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
                    if (lastBlock && ['javier', 'ines', 'mob', 'custom'].includes(lastBlock.type)) {
                        lastBlock.content += '\n' + seg;
                        return;
                    }
                }

                // 💡 [추가] 연속된 문장은 하나의 나레이션 블록으로 합치기
                let lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;
                if (lastBlock && lastBlock.type === 'narration') {
                    lastBlock.content += '\n' + seg; 
                } else {
                    blocks.push({ type: 'narration', content: seg });
                }
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
    } catch(e) {
        console.error(e);
    }
}
