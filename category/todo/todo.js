/* ==========================================================================
   토끼굴 Todo 전용 Javascript 엔진 (Supabase 연동 & 커스텀 체크박스 장착)
   ========================================================================== */

(function() {
    if (typeof window.supabase === 'undefined') {
        alert("🚨 Supabase 라이브러리를 불러오지 못했습니다. index.html 하단의 script 태그를 확인해주세요.");
        return;
    }

    var SUPABASE_URL = 'https://ofhadtlrsccipnvdohqh.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9maGFkdGxyc2NjaXBudmRvaHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTMzODksImV4cCI6MjA5NzMyOTM4OX0.bNdMzGKMCimJtRdtluzaecIM0ZYvBx72-XQdD3WFCv0';
    var supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const colors = ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'navy', 'purple'];
    
    let todosData = []; 
    let currentDate = new Date();
    let selectedDate = new Date();
    let statsDate = new Date();
    let currentStatsCategory = null;
    let currentSubtasks = [];

    async function fetchTodos() {
        const { data, error } = await supabase.from('todos').select('*').order('created_at', { ascending: true });
        
        if (error) {
            console.error("데이터 로드 실패:", error);
            alert("🚨 DB 데이터 불러오기 실패: " + error.message);
        } else if (data) {
            todosData = data;
            refreshAllViews();
        }
    }

    window.showTodoYMPicker = function(type) {
        $(`#${type}-month-display`).hide();
        $(`#${type}-ym-picker`).show().focus();
    };

    window.handleTodoYMChange = function(type) {
        const val = $(`#${type}-ym-picker`).val();
        if(val) {
            const parts = val.split('-');
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            
            if (type === 'stats' || type === 'sd') statsDate.setFullYear(y, m, 1);
            else currentDate.setFullYear(y, m, 1);
        }
        $(`#${type}-ym-picker`).hide();
        $(`#${type}-month-display`).show();
        refreshAllViews();
    };

    window.togglePalette = function(type) {
        const palette = $(`#${type}-color-palette`);
        const currentVal = $(`#${type}-color-val`).val();
        
        if (palette.is(':visible')) { palette.hide(); return; }
        
        $('.color-palette').hide();
        palette.empty();
        
        colors.forEach(color => {
            const isSelected = color === currentVal;
            const iconClass = color === 'gray' ? 'xi-heart-o' : 'xi-heart';
            palette.append(`
                <button style="color: var(--cat-${color}); opacity: ${isSelected ? '1' : '0.5'};" 
                        onclick="selectColor('${color}', '${type}')">
                    <i class="${iconClass}"></i>
                </button>
            `);
        });
        palette.css('display', 'flex');
    };

    window.selectColor = function(color, type) {
        $(`#${type}-color-val`).val(color);
        const iconClass = color === 'gray' ? 'xi-heart-o' : 'xi-heart';
        $(`#${type}-color-btn`).html(`<i class="${iconClass}"></i>`).css('color', `var(--cat-${color})`);
        if (type === 'dm') renderSubtasksUI();
        $(`#${type}-color-palette`).hide();
    };

    $(document).on('click', function(e) {
        if (!$(e.target).closest('#qa-color-btn, #qa-color-palette, #dm-color-btn, #dm-color-palette').length) {
            $('.color-palette').hide();
        }
    });

    window.switchTab = function(tabName, btn) {
        $('.todo-tab-content').removeClass('active');
        $(`#todo-tab-${tabName}`).addClass('active');
        $('.nav-btn').removeClass('active');
        $(btn).addClass('active');
        refreshAllViews();
    };

    function getFormatDate(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // 🚨 커스텀 체크박스 엔진 적용 (테두리는 색상 유지, 완료 시 색상으로 채움)
    function createTodoHTML(todo) {
        const heartClass = todo.category === 'gray' ? 'xi-heart-o' : 'xi-heart';
        const compClass = todo.is_completed ? 'completed' : '';
        const colorHex = `var(--cat-${todo.category})`;
        const targetStr = todo.target_date ? `<span style="font-size: 8px;">${todo.target_date.substring(5).replace('-','.')}</span>` : '';
        
        const boxBg = todo.is_completed ? colorHex : 'transparent';
        const toggleCheckBtn = `<div class="custom-checkbox" style="border: 1.2px solid ${colorHex}; background-color: ${boxBg};" onclick="event.stopPropagation(); toggleComplete(${todo.id})"></div>`;

        let progressHtml = '';
        if (todo.subtasks && Array.isArray(todo.subtasks) && todo.subtasks.length > 0) {
            const total = todo.subtasks.length;
            const completed = todo.subtasks.filter(st => st.is_completed).length;
            const percent = (completed / total) * 100;
            
            progressHtml = `
                <div class="todo-subtasks-progress">
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percent}%; background: ${colorHex};"></div>
                    </div>
                    <span class="progress-text">${completed}/${total}</span>
                </div>
            `;
        }

        return `
            <div class="todo-item ${compClass}" onclick="openDetailedModal(${todo.id})">
                <div class="todo-item-top">
                    ${toggleCheckBtn}
                    <i class="${heartClass} todo-cat-icon" style="color: ${colorHex}; margin-left: 2px;"></i>
                    <div class="todo-text">${todo.content}</div>
                    <div class="todo-meta">${targetStr}</div>
                </div>
                ${progressHtml}
            </div>
        `;
    }

    // 매트릭스 렌더링: 완료된 것은 숨김 처리
    function renderMatrix() {
        $('#quad-1, #quad-2, #quad-3, #quad-4, #quad-0').empty();
        const todayStr = getFormatDate(new Date());

        todosData.forEach(todo => {
            if (todo.is_completed) return;

            if (!todo.target_date || todo.target_date <= todayStr) {
                $(`#quad-${todo.matrix_quadrant}`).append(createTodoHTML(todo));
            }
        });
    }

    window.changeWeek = function(dir) {
        currentDate.setDate(currentDate.getDate() + (dir * 7));
        renderWeekly();
    };

    function renderWeekly() {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth() + 1;
        $('#weekly-month-display').text(`${y}년 ${m}월`);
        $('#weekly-ym-picker').val(`${y}-${String(m).padStart(2,'0')}`);

        const strip = $('#weekly-strip');
        strip.empty();

        const todayDate = new Date();
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); 
        startOfWeek.setDate(diff);

        const daysKor = ['월', '화', '수', '목', '금', '토', '일'];

        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            const isToday = getFormatDate(d) === getFormatDate(todayDate);
            const isSelected = getFormatDate(d) === getFormatDate(selectedDate);
            const colClass = `day-col ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`;
            
            strip.append(`
                <div class="${colClass}" onclick="selectDate('${getFormatDate(d)}')">
                    <span class="day-name">${daysKor[i]}</span>
                    <span class="day-date">${d.getDate()}</span>
                </div>
            `);
        }
        renderDateList('weekly-list');
    }

    window.selectDate = function(dateStr) {
        selectedDate = new Date(dateStr);
        refreshAllViews();
    };

    function renderDateList(containerId) {
        const list = $(`#${containerId}`);
        list.empty();
        const targetStr = getFormatDate(selectedDate);
        
        const filtered = todosData.filter(t => t.target_date === targetStr);
        if (filtered.length === 0) {
            list.append('<div style="width: 100%; text-align:center; color:var(--sub-color); padding: 20px 0; font-size: 8px;">할 일이 없습니다.</div>');
            return;
        }
        filtered.forEach(todo => list.append(createTodoHTML(todo)));
    }

    window.changeMonth = function(dir) {
        currentDate.setMonth(currentDate.getMonth() + dir);
        renderCalendar();
    };

    function renderCalendar() {
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth() + 1;
        $('#cal-month-display').text(`${y}년 ${m}월`);
        $('#cal-ym-picker').val(`${y}-${String(m).padStart(2,'0')}`);

        const grid = $('#cal-grid');
        grid.empty();
        
        const daysKor = ['일', '월', '화', '수', '목', '금', '토'];
        daysKor.forEach(d => grid.append(`<div class="cal-day-name">${d}</div>`));

        const firstDay = new Date(y, m - 1, 1).getDay();
        const daysInMonth = new Date(y, m, 0).getDate();
        
        for (let i = 0; i < firstDay; i++) grid.append('<div></div>');

        const todayStr = getFormatDate(new Date());
        const selectedStr = getFormatDate(selectedDate);

        for (let i = 1; i <= daysInMonth; i++) {
            const dStr = `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const isToday = dStr === todayStr;
            const isSelected = dStr === selectedStr;
            const hasTodo = todosData.some(t => t.target_date === dStr);
            const classes = `cal-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${hasTodo ? 'has-todo' : ''}`;
            
            grid.append(`<div class="${classes}" onclick="selectDate('${dStr}')">${i}</div>`);
        }
        renderDateList('cal-list');
    }

    function renderStatsMain() {
        const y = statsDate.getFullYear();
        const m = statsDate.getMonth() + 1;
        $('#stats-month-display').text(`${y}년 ${m}월`);
        $('#stats-ym-picker').val(`${y}-${String(m).padStart(2,'0')}`);

        const grid = $('#stats-grid');
        grid.empty();

        const firstDay = new Date(y, m - 1, 1).getDay();
        const daysInMonth = new Date(y, m, 0).getDate();
        const monthPrefix = `${y}-${String(m).padStart(2, '0')}`;

        colors.forEach(color => {
            const catTodos = todosData.filter(t => t.category === color && t.target_date && t.target_date.startsWith(monthPrefix));
            
            let html = `<div class="stats-card" onclick="openStatsDetail('${color}')">`;
            html += `<div class="stats-card-title"><i class="xi-heart" style="color: var(--cat-${color}); font-size: 16px;"></i></div>`;
            html += `<div class="mini-cal">`;
            
            for (let i = 0; i < firstDay; i++) html += `<div class="mini-day" style="background: transparent;"></div>`;

            let completedCount = 0;
            for (let i = 1; i <= daysInMonth; i++) {
                const dStr = `${monthPrefix}-${String(i).padStart(2, '0')}`;
                const dayTodos = catTodos.filter(t => t.target_date === dStr);
                const total = dayTodos.length;
                const completed = dayTodos.filter(t => t.is_completed).length;

                let bgStyle = ``;
                if (total > 0 && completed > 0) {
                    const ratio = Math.max(0.3, completed / total);
                    bgStyle = `background: var(--cat-${color}); opacity: ${ratio};`;
                    completedCount += completed;
                }
                html += `<div class="mini-day" style="${bgStyle}"></div>`;
            }
            html += `</div>`; 
            html += `<div class="stats-card-total"><i class="xi-check-circle"></i> ${completedCount}</div>`;
            html += `</div>`; 
            grid.append(html);
        });
    }

    window.changeStatsMonth = function(dir) {
        statsDate.setMonth(statsDate.getMonth() + dir);
        if ($('#stats-detail-overlay').is(':visible') && currentStatsCategory) renderStatsDetail(currentStatsCategory);
        else renderStatsMain();
    };

    window.openStatsDetail = function(color) {
        currentStatsCategory = color;
        $('#sd-header-title').html(`<i class="xi-heart" style="color: var(--cat-${color}); font-size: 16px;"></i>`);
        renderStatsDetail(color);
        $('#stats-detail-overlay').css('display', 'flex').hide().fadeIn(150);
    };

    window.closeStatsDetail = function() {
        $('#stats-detail-overlay').fadeOut(150, function() { currentStatsCategory = null; });
    };

    function renderStatsDetail(color) {
        const y = statsDate.getFullYear();
        const m = statsDate.getMonth() + 1;
        $('#sd-month-display').text(`${y}년 ${m}월`);
        $('#sd-ym-picker').val(`${y}-${String(m).padStart(2,'0')}`);

        const monthPrefix = `${y}-${String(m).padStart(2, '0')}`;
        const catTodos = todosData.filter(t => t.category === color && t.target_date && t.target_date.startsWith(monthPrefix));
        const completedTodos = catTodos.filter(t => t.is_completed);

        const uniqueDays = new Set(completedTodos.map(t => t.target_date));
        $('#sd-val-days span').text(`${uniqueDays.size}일`);
        $('#sd-val-total span').text(`${completedTodos.length}`);
        
        const grid = $('#sd-cal-grid');
        grid.empty();
        const daysKor = ['일', '월', '화', '수', '목', '금', '토'];
        daysKor.forEach(d => grid.append(`<div class="cal-day-name">${d}</div>`));

        const firstDay = new Date(y, m - 1, 1).getDay();
        const daysInMonth = new Date(y, m, 0).getDate();
        for (let i = 0; i < firstDay; i++) grid.append('<div></div>');

        let weeklyCounts = [0, 0, 0, 0, 0]; 

        for (let i = 1; i <= daysInMonth; i++) {
            const dStr = `${monthPrefix}-${String(i).padStart(2, '0')}`;
            const dayTodos = completedTodos.filter(t => t.target_date === dStr);
            
            const weekIdx = Math.floor((i - 1 + firstDay) / 7);
            if (weekIdx < 5) weeklyCounts[weekIdx] += dayTodos.length;

            let classes = "cal-day-cell";
            let inlineStyle = "";
            let extraHtml = "";

            if (dayTodos.length > 0) {
                inlineStyle = `background: var(--cat-${color}); color: #fff; font-weight: bold;`;
                if (dayTodos.length > 1) {
                    extraHtml = `<div style="position:absolute; bottom:-12px; font-size:7px; color:var(--cat-${color});">+${dayTodos.length - 1}</div>`;
                }
            }
            grid.append(`<div class="${classes}" style="${inlineStyle}">${i}${extraHtml}</div>`);
        }

        const chart = $('#sd-chart');
        chart.empty();
        const maxCount = Math.max(...weeklyCounts, 1); 

        for (let w = 0; w < 5; w++) {
            const count = weeklyCounts[w];
            const heightPct = (count / maxCount) * 100;
            const barBg = count > 0 ? `var(--cat-${color})` : 'rgba(0,0,0,0.05)';
            
            chart.append(`
                <div class="sd-bar-wrap">
                    <div class="sd-bar" style="height: ${heightPct}%; background: ${barBg};">
                        ${count > 0 ? `<div class="sd-bar-val">${count}</div>` : ''}
                    </div>
                    <div class="sd-bar-label">${w+1}주차</div>
                </div>
            `);
        }
    }

    window.quickAddTodo = async function() {
        const content = $('#qa-input').val().trim();
        if (!content) return;
        
        const newTodo = {
            content: content,
            category: $('#qa-color-val').val(),
            matrix_quadrant: parseInt($('#qa-quad').val()),
            is_completed: false,
            target_date: getFormatDate(new Date()),
            subtasks: [] 
        };
        
        const { data, error } = await supabase.from('todos').insert([newTodo]).select();
        
        if (error) {
            console.error("1줄 추가 에러:", error);
            alert("🚨 할 일 추가 실패!\n원인: " + error.message);
            return;
        }

        if (data) {
            todosData.push(data[0]);
            $('#qa-input').val('');
            selectColor('gray', 'qa');
            refreshAllViews();
        }
    };

    window.toggleComplete = async function(id) {
        const todo = todosData.find(t => t.id == id);
        if(!todo) return;
        const newVal = !todo.is_completed;
        
        const { error } = await supabase.from('todos').update({ is_completed: newVal }).eq('id', id);
        
        if (error) {
            alert("🚨 상태 변경 실패: " + error.message);
            return;
        }

        todo.is_completed = newVal;
        refreshAllViews();
    };

    window.openDetailedModal = function(id = null) {
        currentSubtasks = []; 
        
        if (id) {
            const todo = todosData.find(t => t.id == id);
            if (todo) {
                $('#dm-id').val(todo.id);
                $('#dm-input').val(todo.content);
                $('#dm-quad').val(todo.matrix_quadrant);
                $('#dm-date').val(todo.target_date || '');
                $('#dm-repeat').val(todo.repeat_type || 'none');
                selectColor(todo.category, 'dm'); 
                
                if (todo.subtasks && Array.isArray(todo.subtasks)) {
                    currentSubtasks = JSON.parse(JSON.stringify(todo.subtasks)); 
                }
                $('#dm-delete-btn').show(); 
            }
        } else {
            $('#dm-id').val('');
            $('#dm-input').val('');
            $('#dm-date').val(getFormatDate(new Date()));
            $('#dm-quad').val($('#qa-quad').val() || 0);
            $('#dm-repeat').val('none');
            selectColor($('#qa-color-val').val() || 'gray', 'dm'); 
            $('#dm-delete-btn').hide();
        }
        
        $('#dm-new-subtask').val('');
        renderSubtasksUI();
        $('#detail-modal-overlay').css('display', 'flex').hide().fadeIn(150);
    };
    
    window.closeDetailedModal = function() { 
        $('#detail-modal-overlay').fadeOut(150); 
        currentSubtasks = [];
    };

    /* 하위 할 일 관리 (체크박스 디자인 연동) */
    window.addSubtaskFromUI = function() {
        const text = $('#dm-new-subtask').val().trim();
        if (!text) return;
        currentSubtasks.push({ content: text, is_completed: false });
        $('#dm-new-subtask').val('');
        renderSubtasksUI();
    };

    window.toggleSubtask = function(index) {
        if (currentSubtasks[index]) {
            currentSubtasks[index].is_completed = !currentSubtasks[index].is_completed;
            renderSubtasksUI();
        }
    };

    window.deleteSubtask = function(index) {
        currentSubtasks.splice(index, 1);
        renderSubtasksUI();
    };

    window.updateSubtaskText = function(index, val) {
        if (currentSubtasks[index]) currentSubtasks[index].content = val.trim();
    };

    function renderSubtasksUI() {
        const list = $('#dm-subtasks-list');
        list.empty();
        const currentColor = $('#dm-color-val').val();
        const colorHex = `var(--cat-${currentColor})`;
        
        currentSubtasks.forEach((st, idx) => {
            const boxBg = st.is_completed ? colorHex : 'transparent';
            const checkBox = `<div class="custom-checkbox" style="border: 1.2px solid ${colorHex}; background-color: ${boxBg};" onclick="toggleSubtask(${idx})"></div>`;
            const textClass = st.is_completed ? 'completed' : '';
            
            list.append(`
                <div class="modal-subtask-item">
                    ${checkBox}
                    <input type="text" class="modal-subtask-text ${textClass}" value="${st.content}" onchange="updateSubtaskText(${idx}, this.value)">
                    <i class="xi-close" style="color: var(--sub-color); font-size: 10px; cursor: pointer; opacity: 0.5;" onclick="deleteSubtask(${idx})"></i>
                </div>
            `);
        });
    }

    window.saveDetailedTodo = async function() {
        const id = $('#dm-id').val();
        const content = $('#dm-input').val().trim();
        if (!content) return;

        const todoData = {
            content: content,
            category: $('#dm-color-val').val(),
            matrix_quadrant: parseInt($('#dm-quad').val()),
            target_date: $('#dm-date').val() || null,
            repeat_type: $('#dm-repeat').val(),
            subtasks: currentSubtasks 
        };

        if (id) {
            const { data, error } = await supabase.from('todos').update(todoData).eq('id', id).select();
            if(error) {
                alert("🚨 수정 저장 실패: " + error.message);
                return;
            }
            if(data) {
                const index = todosData.findIndex(t => t.id == id);
                if(index > -1) todosData[index] = data[0];
            }
        } else {
            todoData.is_completed = false;
            const { data, error } = await supabase.from('todos').insert([todoData]).select();
            if(error) {
                alert("🚨 새로 저장 실패: " + error.message);
                return;
            }
            if(data) todosData.push(data[0]);
        }

        closeDetailedModal();
        refreshAllViews();
    };

    window.deleteTodoFromModal = async function() {
        const id = $('#dm-id').val();
        if (!id) return;
        if (!confirm("정말 이 할 일을 삭제하시겠습니까?")) return;
        
        const { error } = await supabase.from('todos').delete().eq('id', id);
        
        if (error) {
            alert('🚨 삭제 실패: ' + error.message);
            return;
        }

        todosData = todosData.filter(t => t.id != id);
        closeDetailedModal();
        refreshAllViews();
    };

    function refreshAllViews() {
        renderMatrix();
        renderWeekly();
        renderCalendar();
        renderStatsMain();
        if ($('#stats-detail-overlay').is(':visible') && currentStatsCategory) {
            renderStatsDetail(currentStatsCategory);
        }
    }

    setTimeout(() => {
        fetchTodos(); 
    }, 100);

})();
