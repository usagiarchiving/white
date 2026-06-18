<link rel="stylesheet" href="category/todo/todo.css">

<div class="todo-wrapper">

    <div id="todo-tab-matrix" class="todo-tab-content active">
        <div class="quick-add-bar">
            <button class="btn-icon" id="qa-color-btn" style="color: var(--cat-gray);" onclick="togglePalette('qa', event)">
                <i class="xi-heart-o"></i>
            </button>
            <input type="hidden" id="qa-color-val" value="gray">
            <div id="qa-color-palette" class="color-palette"></div>
            
            <input type="text" id="qa-input" class="quick-add-input" placeholder="" autocomplete="off" onkeypress="if(event.keyCode===13) { event.preventDefault(); quickAddTodo(); }">
            
            <select id="qa-quad" class="quick-add-select">
                <option value="0">미지정</option>
                <option value="1">실행</option>
                <option value="2">계획</option>
                <option value="3">위임</option>
                <option value="4">제거</option>
            </select>
            
            <button class="btn-icon" onclick="openDetailedModal()"><i class="xi-expand"></i></button>
            <button class="btn-icon" onclick="quickAddTodo()" style="font-size: 14px; font-weight: bold;">+</button>
        </div>

        <div class="matrix-grid">
            <div class="m-header-empty"></div>
            <div class="m-header-top">긴급함</div>
            <div class="m-header-top">긴급하지않음</div>

            <div class="m-header-left">중요함</div>
            <div class="quadrant-box" id="quad-1"></div>
            <div class="quadrant-box" id="quad-2"></div>

            <div class="m-header-left">중요하지않음</div>
            <div class="quadrant-box" id="quad-3"></div>
            <div class="quadrant-box" id="quad-4"></div>
        </div>

        <div class="inbox-area" id="quad-0"></div>
    </div>

    <div id="todo-tab-weekly" class="todo-tab-content">
        <div class="weekly-header">
            <i class="xi-angle-left btn-icon" onclick="changeWeek(-1)"></i>
            <div class="ym-selector-container">
                <span id="weekly-month-display" class="todo-ym-display" onclick="showTodoYMPicker('weekly')"></span>
                <input type="month" id="weekly-ym-picker" class="todo-ym-picker" style="display: none;" onchange="handleTodoYMChange('weekly')" onblur="handleTodoYMChange('weekly')">
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <div class="search-inner">
                    <input type="text" id="weekly-search" class="todo-search-input" autocomplete="off">
                    <i class="xi-search todo-search-icon"></i>
                </div>
                <i class="xi-angle-right btn-icon" onclick="changeWeek(1)"></i>
            </div>
        </div>
        <div class="weekly-strip" id="weekly-strip"></div>
        <div class="inbox-area" style="flex: 1;" id="weekly-list"></div>
    </div>

    <div id="todo-tab-calendar" class="todo-tab-content">
        <div class="cal-header">
            <i class="xi-angle-left btn-icon" onclick="changeMonth(-1)"></i>
            <div class="ym-selector-container">
                <span id="cal-month-display" class="todo-ym-display" onclick="showTodoYMPicker('cal')"></span>
                <input type="month" id="cal-ym-picker" class="todo-ym-picker" style="display: none;" onchange="handleTodoYMChange('cal')" onblur="handleTodoYMChange('cal')">
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <div class="search-inner">
                    <input type="text" id="cal-search" class="todo-search-input" autocomplete="off">
                    <i class="xi-search todo-search-icon"></i>
                </div>
                <i class="xi-angle-right btn-icon" onclick="changeMonth(1)"></i>
            </div>
        </div>
        <div class="cal-grid" id="cal-grid"></div>
        <div class="inbox-area" style="flex: 1; margin-top: 20px;" id="cal-list"></div>
    </div>

    <div id="todo-tab-stats" class="todo-tab-content">
        <div class="stats-header">
            <i class="xi-angle-left btn-icon" onclick="changeStatsMonth(-1)"></i>
            <div class="ym-selector-container">
                <span id="stats-month-display" class="todo-ym-display" onclick="showTodoYMPicker('stats')"></span>
                <input type="month" id="stats-ym-picker" class="todo-ym-picker" style="display: none;" onchange="handleTodoYMChange('stats')" onblur="handleTodoYMChange('stats')">
            </div>
            <i class="xi-angle-right btn-icon" onclick="changeStatsMonth(1)"></i>
        </div>
        <div class="stats-grid" id="stats-grid"></div>
    </div>

    <div class="todo-bottom-nav">
        <button class="nav-btn active" onclick="switchTab('matrix', this)"><i class="xi-border-all"></i></button>
        <button class="nav-btn" onclick="switchTab('weekly', this)"><i class="xi-view-day"></i></button>
        <button class="nav-btn" onclick="switchTab('calendar', this)"><i class="xi-calendar"></i></button>
        <button class="nav-btn" onclick="switchTab('stats', this)"><i class="xi-chart-bar"></i></button>
    </div>

</div>

<div id="detail-modal-overlay" class="todo-modal-overlay" onclick="closeDetailedModal()">
    <div class="detail-modal-card" onclick="event.stopPropagation()">
        <input type="hidden" id="dm-id">
        
        <div class="modal-input-row" style="padding-bottom: 10px; border-bottom: 1px solid var(--divider-bg); justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <button class="btn-icon" id="dm-color-btn" style="color: var(--cat-gray);" onclick="togglePalette('dm', event)">
                    <i class="xi-heart-o"></i>
                </button>
                <input type="hidden" id="dm-color-val" value="gray">
                <div id="dm-color-palette" class="color-palette" style="top: 100%; left: 0;"></div>
                <input type="text" id="dm-input" class="modal-input" placeholder="할 일 입력" autocomplete="off" style="font-weight: 600;">
            </div>
            <div style="display: flex; gap: 4px;">
                <button class="btn-icon" onclick="moveOrder('up')" title="위로"><i class="xi-arrow-up"></i></button>
                <button class="btn-icon" onclick="moveOrder('down')" title="아래로"><i class="xi-arrow-down"></i></button>
            </div>
        </div>
        
        <div class="modal-input-row" style="flex-direction: column; align-items: flex-start; gap: 6px; border-bottom: 1px solid var(--divider-bg); padding-bottom: 10px;">
            <div id="dm-subtasks-list" style="width: 100%; display: flex; flex-direction: column; gap: 4px;"></div>
            <div style="display: flex; width: 100%; gap: 6px; align-items: center;">
                <i class="xi-plus-square-o" style="color: var(--sub-color); font-size: 10px;"></i>
                <input type="text" id="dm-new-subtask" class="modal-input" placeholder="하위 할 일" autocomplete="off" onkeypress="if(event.keyCode===13) { event.preventDefault(); addSubtaskFromUI(); }">
                <button class="btn-icon" onclick="addSubtaskFromUI()"><i class="xi-arrow-right"></i></button>
            </div>
        </div>
        
        <div class="modal-input-row">
            <span class="modal-label">영역</span>
            <select id="dm-quad" class="modal-input">
                <option value="0">미지정</option>
                <option value="1">실행 (중요/긴급)</option>
                <option value="2">계획 (중요/안긴급)</option>
                <option value="3">위임 (안중요/긴급)</option>
                <option value="4">제거 (안중요/안긴급)</option>
            </select>
        </div>

        <div class="modal-input-row">
            <span class="modal-label">날짜</span>
            <input type="date" id="dm-date" class="modal-input date-left">
        </div>

        <div class="modal-input-row">
            <span class="modal-label">반복</span>
            <select id="dm-repeat" class="modal-input">
                <option value="none">반복 안함</option>
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
                <option value="monthly">매월</option>
            </select>
        </div>

        <div class="modal-footer" style="justify-content: space-between; margin-top: 15px;">
            <button class="modal-btn" id="dm-delete-btn" style="color: #ff3b30; display: none;" onclick="deleteTodoFromModal()">삭제</button>
            <div style="display: flex; gap: 15px; flex: 1; justify-content: flex-end;">
                <button class="modal-btn" style="color: var(--sub-color);" onclick="closeDetailedModal()">취소</button>
                <button class="modal-btn" style="color: var(--point-color);" onclick="saveDetailedTodo()">저장</button>
            </div>
        </div>
    </div>
</div>

<div id="stats-detail-overlay" class="todo-modal-overlay stats-detail-overlay">
    <div class="stats-detail-header">
        <i class="xi-angle-left btn-icon" style="font-size: 16px;" onclick="closeStatsDetail()"></i>
        <div style="flex:1; text-align:center;" id="sd-header-title"><i class="xi-heart"></i></div>
        <div class="search-inner">
            <input type="text" id="sd-search" class="todo-search-input" autocomplete="off">
            <i class="xi-search todo-search-icon"></i>
        </div>
    </div>
    <div class="stats-detail-content">
        <div class="stats-header" style="justify-content: center; gap: 20px;">
            <i class="xi-angle-left btn-icon" onclick="changeStatsMonth(-1)"></i>
            <div class="ym-selector-container">
                <span id="sd-month-display" class="todo-ym-display" onclick="showTodoYMPicker('sd')" style="font-size: 10px;"></span>
                <input type="month" id="sd-ym-picker" class="todo-ym-picker" style="display: none;" onchange="handleTodoYMChange('sd')" onblur="handleTodoYMChange('sd')">
            </div>
            <i class="xi-angle-right btn-icon" onclick="changeStatsMonth(1)"></i>
        </div>
        <div class="sd-summary-row">
            <div class="sd-summary-box"><div class="sd-summary-val" id="sd-val-days"><i class="xi-check-circle" style="color:var(--cat-green);"></i> <span>0일</span></div><div class="sd-summary-label">실천</div></div>
            <div class="sd-summary-box"><div class="sd-summary-val" id="sd-val-total"><i class="xi-fire" style="color:var(--cat-red);"></i> <span>0</span></div><div class="sd-summary-label">누적</div></div>
        </div>
        <div class="cal-grid" id="sd-cal-grid" style="margin-bottom: 15px;"></div>
        
        <div class="inbox-area" style="width: 100%; box-sizing: border-box; margin-bottom: 25px; min-height: 50px;" id="sd-list"></div>
        
        <div class="sd-chart-container">
            <div class="sd-chart-title">최근 추이 (주차별 실천 완료수)</div>
            <div class="sd-chart" id="sd-chart"></div>
        </div>
    </div>
</div>

<script src="category/todo/todo.js"></script>