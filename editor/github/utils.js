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

        // 💡 렌더링 전 현재 스크롤 위치 임시 저장 (튕김 방지)
        const editorList = document.getElementById('editorList');
        const htmlPreview = document.getElementById('htmlPreview');
        const scrollPos = {
            editor: editorList ? editorList.scrollTop : 0,
            preview: htmlPreview ? htmlPreview.scrollTop : 0,
            window: window.scrollY
        };

        historyIndex--;
        blocks = JSON.parse(historyStack[historyIndex]);
        renderEditor();

        // 💡 렌더링 직후 스크롤 위치 원상 복구
        setTimeout(() => {
            if (editorList) editorList.scrollTop = scrollPos.editor;
            if (htmlPreview) htmlPreview.scrollTop = scrollPos.preview;
            window.scrollTo(0, scrollPos.window);
        }, 0);

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

        // 💡 렌더링 전 현재 스크롤 위치 임시 저장 (튕김 방지)
        const editorList = document.getElementById('editorList');
        const htmlPreview = document.getElementById('htmlPreview');
        const scrollPos = {
            editor: editorList ? editorList.scrollTop : 0,
            preview: htmlPreview ? htmlPreview.scrollTop : 0,
            window: window.scrollY
        };

        historyIndex++;
        blocks = JSON.parse(historyStack[historyIndex]);
        renderEditor();

        // 💡 렌더링 직후 스크롤 위치 원상 복구
        setTimeout(() => {
            if (editorList) editorList.scrollTop = scrollPos.editor;
            if (htmlPreview) htmlPreview.scrollTop = scrollPos.preview;
            window.scrollTo(0, scrollPos.window);
        }, 0);

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

// == BGM 플레이어 템플릿 (Data URI 용) ==
const BGM_PLAYER_TEMPLATE = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>BGM Player</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        /* - - - 색상 변경 - -  */
        :root{
            --bgm-main: #F5F5F5;
            --bgm-mdark: #D4D4D4;
            --bgm-mdark2: #E6E6E6;
            --bgm-bright: #FFFFFF;
            --bgm-font: #8F8F8F;
        }

        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/variable/pretendardvariable-dynamic-subset.css");

        body {
            margin: 0;
            padding: 0;
            font-family: 'Pretendard Variable', sans-serif;
            background: transparent;
            overflow: hidden;
        }

        .bgm-wrapper {
            width: 100%;
            height: 100%;
            z-index: 999;
            transition: 0.3s;
            visibility: visible;
            position: absolute;
            top: 0;
            right: 0;
        }
        
        .bgm-player {
            background: var(--bgm-main);
            padding: 12px 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            height: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .control-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-bottom: 8px;
        }
        
        .control-btn {
            background-color: white;
            color: var(--bgm-font);
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }
        
        .control-btn:hover {
            background-color: var(--bgm-mdark);
            color: white;
            transform: scale(1.1);
        }
        
        .volume-control {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--bgm-mdark);
            transform: scale(0.85);
            margin-left: -5px;
        }
        
        .volume-slider {
            flex-grow: 1;
            height: 4px;
            -webkit-appearance: none;
            background: var(--bgm-mdark2);
            outline: none;
            border-radius: 3px;
        }
        
        .volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--bgm-mdark);
            cursor: pointer;
        }
        
        .minimize-btn {
            position: absolute;
            top: 6px;
            right: 8px;
            background: none;
            border: none;
            color: var(--bgm-font);
            cursor: pointer;
            font-size: 11px;
        }
        
        /* 🔥 중앙 정렬 및 잘림 방지 수정! 🔥 */
        .mini-player {
            position: absolute;
            top: 4px; /* 잘리지 않게 안으로 조금 넣음 */
            right: 4px; /* 잘리지 않게 안으로 조금 넣음 */
            width: 24px; 
            height: 24px; 
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: white;
            z-index: 999;
            visibility: visible;
            font-size: 11px; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.15);
            transition: 0.2s;
            box-sizing: border-box;
        }
        
        .mini-player:hover { transform: scale(1.1); }
        
        .current-song-title {
            background-color: white;
            color: var(--bgm-font);
            padding: 4px 8px;
            border-radius: 12px;
            margin-bottom: 10px;
            text-align: center;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 4px;
        }
        
        .hidden {
            visibility: hidden;
            pointer-events: none;
            opacity: 0;
        }

        #player { display: none; }
        
        /* 프로그레스바 스타일 */
        .progress-container {
            margin-bottom: 8px;
            padding: 0 5px;
            position: relative;
        }
        .progress-bar {
            height: 4px;
            background: var(--bgm-mdark2);
            border-radius: 3px;
            cursor: pointer;
            position: relative;
        }
        .progress-fill {
            height: 100%;
            background: var(--bgm-mdark);
            width: 0;
            border-radius: 3px;
        }
        .progress-thumb {
            width: 6px;
            height: 6px;
            background: var(--bgm-bright);
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            border-radius: 50%;
            pointer-events: none;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .time-display {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: var(--bgm-font);
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="mini-player hidden" id="miniPlayer" onclick="expandPlayer()">
        <i class="fas fa-music"></i>
    </div>
    
    <div class="bgm-wrapper hidden" id="mainPlayer">
        <div class="bgm-player">
            <button class="minimize-btn" onclick="minimizePlayer()">
                <i class="fas fa-times"></i>
            </button>
            <div id="player"></div>
            
            <div class="current-song-title" id="currentSongTitle">음악을 재생해주세요</div>
            
            <div class="progress-container">
                <div class="progress-bar" id="progressBar">
                    <div class="progress-fill" id="progressFill"></div>
                    <div class="progress-thumb" id="progressThumb"></div>
                </div>
                <div class="time-display">
                    <span id="currentTime">0:00</span>
                    <span id="totalTime">0:00</span>
                </div>
            </div>

            <div class="control-buttons">
                <button class="control-btn" onclick="playVideo()" title="재생">
                    <i class="fas fa-play"></i>
                </button>
                <button class="control-btn" onclick="pauseVideo()" title="일시정지">
                    <i class="fas fa-pause"></i>
                </button>
            </div>

            <div class="volume-control">
                <i class="fas fa-volume-down"></i>
                <input type="range" min="0" max="100" value="50" class="volume-slider" id="volumeSlider">
                <i class="fas fa-volume-up"></i>
            </div>
        </div>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const miniPlayer = document.querySelector('.mini-player');
                    const bgmWrapper = document.querySelector('.bgm-wrapper');
                    
                    if (miniPlayer && !miniPlayer.classList.contains('hidden')) {
                        window.parent.postMessage({ action: 'minimize' }, '*');
                    }
                    if (bgmWrapper && !bgmWrapper.classList.contains('hidden')) {
                        window.parent.postMessage({ action: 'expand' }, '*');
                    }
                }
            });
        });
        
        observer.observe(document.querySelector('.mini-player'), { attributes: true });
        observer.observe(document.querySelector('.bgm-wrapper'), { attributes: true });
        
        window.parent.postMessage({ action: 'minimize' }, '*');
    });
    </script>
    
    <script>
        const STORAGE_KEY = 'bgm_player_state';
        let playerState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"volume": 50}');
        
        var player;
        var progressInterval;
        let pendingVideoId = null;

        window.addEventListener('message', function(e) {
            if (e.data && e.data.action === 'playBGM') {
                const videoId = e.data.videoId;
                const title = e.data.title;
                
                expandPlayer();
                document.getElementById('currentSongTitle').textContent = title || '알 수 없는 곡';
                
                if (player && player.loadVideoById) {
                    player.loadVideoById({ 'videoId': videoId, 'startSeconds': 0 });
                    player.playVideo();
                } else {
                    pendingVideoId = videoId;
                }
            }
        });

        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        function onYouTubeIframeAPIReady() {
            player = new YT.Player('player', {
                height: '0',
                width: '0',
                playerVars: {
                    'playsinline': 1,
                    'controls': 0,
                    'autoplay': 0,
                    'mute': 0
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange
                }
            });
        }

        function onPlayerReady(event) {
            player.setVolume(playerState.volume);
            document.getElementById('volumeSlider').value = playerState.volume;

            if (pendingVideoId) {
                player.loadVideoById({ 'videoId': pendingVideoId, 'startSeconds': 0 });
                player.playVideo();
                pendingVideoId = null;
            }

            document.getElementById('volumeSlider').addEventListener('input', function(e) {
                const volume = parseInt(e.target.value);
                player.setVolume(volume);
                playerState.volume = volume;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(playerState));
            });
        }

        function onPlayerStateChange(event) {
            if (event.data === YT.PlayerState.ENDED) {
                player.seekTo(0);
                player.playVideo();
            }
            
            if (event.data === YT.PlayerState.PLAYING) {
                if (progressInterval) clearInterval(progressInterval);
                progressInterval = setInterval(updateProgressBar, 500);
            } else {
                updateProgressBar();
                if (progressInterval) clearInterval(progressInterval);
            }
        }

        function formatTime(seconds) {
            seconds = Math.floor(seconds);
            const minutes = Math.floor(seconds / 60);
            seconds = seconds % 60;
            return \`\${minutes}:\${seconds < 10 ? '0' : ''}\${seconds}\`;
        }

        function updateProgressBar() {
            if (!player || !player.getCurrentTime || !player.getDuration) return;
            const currentTime = player.getCurrentTime() || 0;
            const duration = player.getDuration() || 1;
            const progress = (currentTime / duration) * 100;
            
            document.getElementById('progressFill').style.width = \`\${progress}%\`;
            document.getElementById('progressThumb').style.left = \`\${progress}%\`;
            document.getElementById('currentTime').textContent = formatTime(currentTime);
            document.getElementById('totalTime').textContent = formatTime(duration);
        }

        function playVideo() { if (player && player.playVideo) player.playVideo(); }
        function pauseVideo() { if (player && player.pauseVideo) player.pauseVideo(); }
        
        function minimizePlayer() {
            document.getElementById('mainPlayer').classList.add('hidden');
            document.getElementById('miniPlayer').classList.remove('hidden');
        }
        
        function expandPlayer() {
            document.getElementById('mainPlayer').classList.remove('hidden');
            document.getElementById('miniPlayer').classList.add('hidden');
        }

        document.getElementById('progressBar').addEventListener('click', function(e) {
            if (!player || !player.getDuration) return;
            const rect = this.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            player.seekTo(pos * player.getDuration());
            updateProgressBar();
        });
        
        document.getElementById('mainPlayer').classList.add('hidden');
        document.getElementById('miniPlayer').classList.remove('hidden');
    </script>
</body>
</html>`;
