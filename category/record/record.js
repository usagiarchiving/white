<!-- ==========================================================================
         [추가] 글쓰기 & 수정 팝업창 (반투명 블러 모달)
         ========================================================================== -->
    <div id="record-lightbox" class="record-lightbox" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(150, 150, 150, 0.2); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 20000; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;" onclick="if(event.target === this) closeRecordModal()">
        
        <div class="record-lightbox-card" style="background: #ffffff; border: 1px solid var(--divider-bg); border-radius: 8px; padding: 30px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 15px 40px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 15px; box-sizing: border-box; animation: fadeIn 0.3s ease;">
            
            <!-- 상단: 닫기 버튼 및 이미지/API 버튼 -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <!-- 수동 이미지 업로드 버튼 -->
                    <label for="record-file-input" style="cursor: pointer; color: var(--sub-color); font-size: 18px; transition: 0.2s;" onmouseover="this.style.color='var(--point-color)'" onmouseout="this.style.color='var(--sub-color)'" title="수정/수동 이미지 업로드"><i class="xi-image-o"></i></label>
                    <input type="file" id="record-file-input" accept="image/*" style="display: none;">
                    
                    <!-- API 검색 버튼 (다음 단계에서 연결) -->
                    <button id="btn-api-search" style="background: none; border: 1px solid var(--divider-bg); border-radius: 12px; padding: 4px 10px; font-family: 'Noto Serif KR', serif; font-size: 11px; color: var(--main-color); cursor: pointer; transition: 0.2s;"><i class="xi-search"></i> 작품 정보 자동 불러오기</button>
                </div>
                <i class="xi-close" onclick="closeRecordModal()" style="color: var(--sub-color); cursor: pointer; font-size: 16px;"></i>
            </div>

            <!-- 이미지 썸네일 미리보기 영역 -->
            <div id="record-preview-wrap" style="position: relative; display: none; margin-bottom: 10px; width: 100%; text-align: center;">
                <button onclick="removeRecordPreview()" style="position: absolute; top: -6px; right: -6px; background: var(--point-color); color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; z-index: 12;"><i class="xi-close"></i></button>
                <img id="record-image-preview" src="" style="max-width: 100%; height: auto; max-height: 250px; object-fit: contain; border-radius: 4px; border: 1px solid var(--divider-bg); display: block; margin: 0 auto;">
                <input type="hidden" id="record-cover-url" value=""> <!-- API로 불러온 URL이나 스토리지 URL이 담길 숨김 칸 -->
            </div>

            <!-- 기본 정보 입력 폼 -->
            <div style="display: flex; gap: 10px;">
                <select id="modal-category" style="background: transparent; border: none; border-bottom: 1px solid var(--divider-bg); color: var(--main-color); font-family: 'Noto Serif KR', serif; font-size: 13px; outline: none; padding: 5px 0; width: 30%; cursor: pointer;">
                    <option value="movie" selected>영화</option>
                    <option value="drama">드라마</option>
                    <option value="book">책</option>
                    <option value="character">캐릭터</option>
                    <option value="game">게임</option>
                    <option value="song">노래</option>
                    <option value="webtoon">웹툰/소설</option>
                    <option value="show">공연/전시</option>
                    <option value="video">영상</option>
                </select>
                <input type="text" id="modal-title" placeholder="작품명 (Title)" autocomplete="off" style="background: transparent; border: none; border-bottom: 1px solid var(--divider-bg); color: var(--main-color); font-family: 'Noto Serif KR', serif; font-size: 13px; outline: none; padding: 5px 0; width: 70%; font-weight: 600;">
            </div>

            <div style="display: flex; gap: 10px;">
                <input type="text" id="modal-release-year" placeholder="출시 연도 (예: 1998)" autocomplete="off" style="background: transparent; border: none; border-bottom: 1px solid var(--divider-bg); color: var(--main-color); font-family: 'Noto Serif KR', serif; font-size: 12px; outline: none; padding: 5px 0; width: 33%;">
                <input type="text" id="modal-creator" placeholder="감독/저자/아티스트" autocomplete="off" style="background: transparent; border: none; border-bottom: 1px solid var(--divider-bg); color: var(--main-color); font-family: 'Noto Serif KR', serif; font-size: 12px; outline: none; padding: 5px 0; width: 33%;">
                <input type="text" id="modal-nth" placeholder="N회차 (예: 1st)" autocomplete="off" style="background: transparent; border: none; border-bottom: 1px solid var(--divider-bg); color: var(--main-color); font-family: 'Noto Serif KR', serif; font-size: 12px; outline: none; padding: 5px 0; width: 33%;">
            </div>

            <input type="text" id="modal-oneliner" placeholder="한 줄 평 (목록에서 보일 문구)" autocomplete="off" style="background: transparent; border: none; border-bottom: 1px solid var(--divider-bg); color: var(--sub-color); font-family: 'Noto Serif KR', serif; font-size: 12px; font-style: italic; outline: none; padding: 5px 0; width: 100%;">

            <!-- 본문 에디터 -->
            <div id="modal-content" contenteditable="true" spellcheck="false" placeholder="기록을 남겨주세요..." style="width: 100%; min-height: 120px; background: transparent; border: none; color: var(--main-color); font-family: 'Noto Serif KR', serif; font-size: 13px; line-height: 1.8; outline: none; padding: 10px 0; word-break: break-all;"></div>

            <!-- 하단: 별점, 대표설정, 날짜, 제출 -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 1px solid var(--divider-bg); padding-top: 15px;">
                
                <div style="display: flex; align-items: center; gap: 15px;">
                    <!-- 별점 입력 (간단한 숫자형) -->
                    <div style="display: flex; align-items: center; gap: 4px; color: var(--point-color); font-size: 13px;">
                        <i class="xi-star"></i>
                        <input type="number" id="modal-rating" placeholder="5.0" step="0.1" min="0" max="5" style="background: transparent; border: none; outline: none; color: var(--main-color); font-family: 'Courier New', monospace; font-size: 12px; width: 30px; font-weight: bold;">
                    </div>
                    
                    <!-- 캘린더 대표 이미지 설정 -->
                    <label style="font-size: 11px; color: var(--sub-color); cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <input type="checkbox" id="modal-is-main" style="accent-color: var(--point-color);"> 대표 지정
                    </label>
                </div>

                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="date" id="modal-date-picker" style="background: transparent; border: none; outline: none; color: var(--sub-color); font-family: 'Noto Serif KR', serif; font-size: 11px; cursor: pointer;">
                    <button id="btn-save-record" onclick="saveRecordPost()" style="background: none; border: none; color: var(--point-color); font-size: 20px; cursor: pointer; transition: 0.2s; opacity: 0.7;" onmouseover="this.style.opacity='1'; this.style.transform='translateX(3px)'" onmouseout="this.style.opacity='0.7'; this.style.transform='translateX(0)'">
                        <i class="xi-arrow-right"></i>
                    </button>
                </div>
            </div>

        </div>
    </div>
