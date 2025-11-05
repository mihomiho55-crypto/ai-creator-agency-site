// js/script.js  --- 全差し替え版 ---
// ページ共通：DOMContentLoadedでページごとに初期化
document.addEventListener('DOMContentLoaded', () => {
  safeInit(initDashboard);            // U-001
  safeInit(initSeminarManagement);    // U-004
  safeInit(initCourseContent);        // U-005
  safeInit(initStudentManagement);    // U-006
+ safeInit(initTestManagement);       // U-007 ← これを追加
});

/* -------------------------------------------
 * ユーティリティ
 * ----------------------------------------- */
function safeInit(fn) {
  try { fn && fn(); } catch (e) { console.error(e); }
}
const STORAGE = {
  seminars: 'app.seminars',
  reminders: 'app.seminarReminders',
  draft: 'app.seminarDraft',
  activity: 'app.reservationActivity'
};
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : (fallback ?? null);
  } catch {
    return fallback ?? null;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}
function pad(n){ return n.toString().padStart(2,'0'); }
function toLocalDTValue(d) {
  // HTML input type=datetime-local 表示用
  const y = d.getFullYear(); const m = pad(d.getMonth()+1); const day = pad(d.getDate());
  const hh = pad(d.getHours()); const mm = pad(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}
function parseLocalDTValue(v) {
  // "YYYY-MM-DDTHH:MM" をローカル日時としてDate化
  if (!v) return null;
  const [date, time] = v.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m-1, d, hh, mm, 0, 0);
}
function formatDateTime(d) {
  // 2025/11/04 19:00 形式
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatDate(d) {
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}
function formatTime(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function addDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function addMinutes(d, n){ const x=new Date(d); x.setMinutes(x.getMinutes()+n); return x; }
function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function within(d, start, end){ return d>=start && d<=end; }

/* -------------------------------------------
 * U-001 ダッシュボード（index.html）既存グラフ
 * ----------------------------------------- */
function initDashboard() {
  const canvas = document.getElementById('performanceChart');
  if (!canvas || !window.Chart) return; // index.html以外ではスキップ

  const ctx = canvas.getContext('2d');
  const performanceData = {
    labels: ['11/1', '11/5', '11/10', '11/15', '11/20', '11/25', '11/30'],
    datasets: [
      {
        label:'エンゲージメント',
        data: [350, 420, 580, 510, 630, 800, 890],
        borderColor: '#7B68EE',
        backgroundColor: 'rgba(123, 104, 238, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label:'リーチ数',
        data: [1200, 1350, 1800, 1650, 1920, 2300, 2500],
        borderColor: '#5AC8FA',
        backgroundColor: 'rgba(90, 200, 250, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const performanceChart = new Chart(ctx, {
    type: 'line',
    data: performanceData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: { family: 'Nunito' }
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        }
      }
    }
  });

  const periodSel = document.getElementById('chartPeriod');
  if (periodSel) {
    periodSel.addEventListener('change', function() {
      let newData, newLabels;
      switch(this.value) {
        case 'week':
          newLabels = ['11/24', '11/25', '11/26', '11/27', '11/28', '11/29', '11/30'];
          newData = [
            [500, 580, 620, 710, 750, 800, 890],
            [1800, 1900, 2000, 2100, 2200, 2300, 2500]
          ];
          break;
        case 'quarter':
          newLabels = ['9/1', '9/15', '10/1', '10/15', '11/1', '11/15', '11/30'];
          newData = [
            [200, 280, 320, 380, 450, 520, 890],
            [800, 1000, 1200, 1400, 1600, 1900, 2500]
          ];
          break;
        default:
          newLabels = ['11/1', '11/5', '11/10', '11/15', '11/20', '11/25', '11/30'];
          newData = [
            [350, 420, 580, 510, 630, 800, 890],
            [1200, 1350, 1800, 1650, 1920, 2300, 2500]
          ];
      }
      performanceChart.data.labels = newLabels;
      performanceChart.data.datasets[0].data = newData[0];
      performanceChart.data.datasets[1].data = newData[1];
      performanceChart.update();
    });
  }
}

/* -------------------------------------------
 * U-004 セミナー管理（seminar-management.html）
 * ----------------------------------------- */
function initSeminarManagement() {
  // セミナー管理ページの要素を確認
  const form = document.getElementById('seminarForm');
  const calendarGrid = document.getElementById('calendarGrid');
  const seminarList = document.getElementById('seminarList');
  if (!form || !calendarGrid || !seminarList) return; // 該当ページ以外はスキップ

  // 状態
  let seminars = loadJSON(STORAGE.seminars, []);
  let reminders = loadJSON(STORAGE.reminders, {}); // { [seminarId]: {d3, d1, h1, template} }
  let activity = loadJSON(STORAGE.activity, []);
  let editingId = null;

  // 要素参照
  const titleEl = document.getElementById('seminarTitle');
  const dtEl = document.getElementById('seminarDateTime');
  const durationEl = document.getElementById('seminarDuration');
  const capEl = document.getElementById('seminarCapacity');
  const typeEl = document.getElementById('seminarType');
  const linkEl = document.getElementById('seminarLink');
  const descEl = document.getElementById('seminarDescription');

  const draftBtn = document.getElementById('seminarDraftBtn');

  const viewSel = document.getElementById('calendarView');
  const headerEl = document.getElementById('calendarHeader');
  const prevBtn = document.getElementById('calendarPrev');
  const nextBtn = document.getElementById('calendarNext');

  const statusFilter = document.getElementById('seminarStatusFilter');
  const searchInput = document.getElementById('seminarSearch');
  const refreshBtn = document.getElementById('refreshSeminarList');

  const modalDetail = document.getElementById('modalSeminarDetail');
  const closeDetailBtn = document.getElementById('closeSeminarDetail');
  const detailBody = document.getElementById('seminarDetailBody');
  const editBtn = document.getElementById('editSeminarBtn');
  const dupBtn = document.getElementById('duplicateSeminarBtn');
  const delBtn = document.getElementById('deleteSeminarBtn');

  const openReminderBtn = document.getElementById('openReminderModalBtn');
  const modalReminder = document.getElementById('modalReminder');
  const closeReminderBtn = document.getElementById('closeReminderModalBtn');
  const reminderForm = document.getElementById('reminderForm');
  const reminderSeminarId = document.getElementById('reminderSeminarId');
  const remind3d = document.getElementById('remind3d');
  const remind1d = document.getElementById('remind1d');
  const remind1h = document.getElementById('remind1h');
  const testReminderBtn = document.getElementById('sendTestReminder');
  const reminderTemplate = document.getElementById('reminderTemplate');
  const disableReminderBtn = document.getElementById('disableReminder');

  const activityWrap = document.getElementById('reservationActivity');

  // カレンダー状態
  const calState = {
    view: (viewSel && viewSel.value) || 'month',
    cursor: new Date()
  };

  /* ---------- 初期データ（空の場合のみ） ---------- */
  if (!seminars || seminars.length === 0) {
    const now = new Date();
    const s1 = {
      id: uid('semi'),
      title: '効果的なSNS運用の基礎',
      dateTime: addDays(new Date(now.getFullYear(), now.getMonth(), 10, 19, 0), 0).toISOString(),
      duration: 60,
      capacity: 100,
      type: 'recorded',
      link: '',
      description: 'SNSのアルゴリズムと実践的な投稿手順を60分で解説。',
      createdAt: new Date().toISOString()
    };
    const s2 = {
      id: uid('semi'),
      title: 'ショート動画で集客を2倍にする方法',
      dateTime: addDays(new Date(now.getFullYear(), now.getMonth(), 18, 20, 0), 0).toISOString(),
      duration: 45,
      capacity: 150,
      type: 'live',
      link: 'https://zoom.us/j/xxxx',
      description: '60秒のショートでCVまで運ぶ導線',
      createdAt: new Date().toISOString()
    };
    const s3 = {
      id: uid('semi'),
      title: 'AIリライト実践ワークショップ',
      dateTime: addDays(new Date(now.getFullYear(), now.getMonth(), 25, 12, 0), 0).toISOString(),
      duration: 90,
      capacity: 80,
      type: 'recorded',
      link: '',
      description: 'バズ投稿→個性化→自動スケジュールの一連をハンズオン',
      createdAt: new Date().toISOString()
    };
    seminars = [s1, s2, s3];
    saveJSON(STORAGE.seminars, seminars);
  }

  if (!activity || activity.length === 0) {
    activity = [
      { id: uid('act'), text: '山田花子 さんが「効果的なSNS運用の基礎」を予約しました', at: addDays(new Date(), -1).toISOString() },
      { id: uid('act'), text: '田中一郎 さんが「AIリライト実践ワークショップ」をキャンセルしました', at: addDays(new Date(), -2).toISOString() }
    ];
    saveJSON(STORAGE.activity, activity);
  }

  /* ---------- 下書き復元 ---------- */
  const draft = loadJSON(STORAGE.draft, null);
  if (draft) {
    if (titleEl) titleEl.value = draft.title || '';
    if (dtEl) dtEl.value = draft.dateTime || '';
    if (durationEl) durationEl.value = draft.duration || '';
    if (capEl) capEl.value = draft.capacity || '';
    if (typeEl) typeEl.value = draft.type || 'recorded';
    if (linkEl) linkEl.value = draft.link || '';
    if (descEl) descEl.value = draft.description || '';
  }

  /* ---------- イベント：下書き保存 ---------- */
  if (draftBtn) {
    draftBtn.addEventListener('click', () => {
      const d = {
        title: titleEl.value.trim(),
        dateTime: dtEl.value,
        duration: durationEl.value,
        capacity: capEl.value,
        type: typeEl.value,
        link: linkEl.value.trim(),
        description: descEl.value.trim()
      };
      saveJSON(STORAGE.draft, d);
      toast('下書きを保存しました');
    });
  }

  /* ---------- イベント：作成/更新 ---------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = titleEl.value.trim();
    const dateTimeStr = dtEl.value;
    const dateObj = parseLocalDTValue(dateTimeStr);
    const duration = parseInt(durationEl.value || '60', 10);
    const capacity = parseInt(capEl.value || '100', 10);
    const type = typeEl.value;
    const link = linkEl.value.trim();
    const description = descEl.value.trim();

    if (!title || !dateTimeStr || !dateObj) {
      toast('必須項目を入力してください', true);
      return;
    }

    if (editingId) {
      // 更新
      seminars = seminars.map(s => s.id === editingId ? {
        ...s,
        title, dateTime: dateObj.toISOString(),
        duration, capacity, type, link, description
      } : s);
      editingId = null;
      toast('セミナーを更新しました');
    } else {
      // 新規
      const s = {
        id: uid('semi'),
        title,
        dateTime: dateObj.toISOString(),
        duration,
        capacity,
        type,
        link,
        description,
        createdAt: new Date().toISOString()
      };
      seminars.push(s);
      toast('セミナーを作成しました');
    }
    saveJSON(STORAGE.seminars, seminars);
    // 下書きクリア
    localStorage.removeItem(STORAGE.draft);
    form.reset();
    // 再描画
    renderSeminarList();
    renderCalendar();
    // リマインド対象セレクト更新
    populateReminderTarget();
  });

  /* ---------- カレンダー描画 ---------- */
  function daysInMonth(year, month) {
    return new Date(year, month+1, 0).getDate();
  }
  function monthMatrix(year, month) {
    const first = new Date(year, month, 1);
    const firstWeekday = (first.getDay() + 6) % 7; // 月曜=0 にしたい場合の調整（今回は日曜=0のまま使う）
    const total = daysInMonth(year, month);
    const cells = [];
    // 前月埋め
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i=0; i<first.getDay(); i++){
      const day = prevMonthLastDate - (first.getDay()-1) + i;
      cells.push({ date: new Date(year, month-1, day), current:false });
    }
    // 当月
    for (let d=1; d<=total; d++){
      cells.push({ date: new Date(year, month, d), current:true });
    }
    // 翌月埋め
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length-1].date;
      const nd = addDays(last, 1);
      cells.push({ date: nd, current:false });
    }
    return cells;
  }
  function getSeminarsOnDay(day) {
    return seminars.filter(s => {
      const start = new Date(s.dateTime);
      const end = addMinutes(start, s.duration || 60);
      return isSameDay(start, day) || isSameDay(end, day) || within(day, start, end);
    }).sort((a,b) => new Date(a.dateTime)-new Date(b.dateTime));
  }
  function viewHeaderText() {
    if (calState.view === 'week') {
      const start = startOfWeek(calState.cursor);
      const end = addDays(start, 6);
      return `${start.getFullYear()}年${start.getMonth()+1}月${start.getDate()}日 〜 ${end.getFullYear()}年${end.getMonth()+1}月${end.getDate()}日`;
    } else if (calState.view === 'list') {
      return `${calState.cursor.getFullYear()}年${calState.cursor.getMonth()+1}月のリスト`;
    }
    return `${calState.cursor.getFullYear()}年${calState.cursor.getMonth()+1}月`;
  }
  function startOfWeek(d) {
    const x = new Date(d);
    const dow = x.getDay(); // 0=日
    return addDays(x, -dow);
  }
  function renderCalendar() {
    if (headerEl) headerEl.textContent = viewHeaderText();
    calendarGrid.innerHTML = '';

    if (calState.view === 'list') {
      // 当月のセミナーを日時順に縦並び
      const y = calState.cursor.getFullYear();
      const m = calState.cursor.getMonth();
      const monthSemis = seminars.filter(s => {
        const dt = new Date(s.dateTime);
        return dt.getFullYear()===y && dt.getMonth()===m;
      }).sort((a,b)=> new Date(a.dateTime)-new Date(b.dateTime));

      if (monthSemis.length === 0) {
        calendarGrid.innerHTML = `<div style="padding:12px;color:var(--text-secondary);">この月のセミナーはありません</div>`;
        return;
      }
      calendarGrid.style.display = 'block';
      calendarGrid.style.gridTemplateColumns = '1fr';
      monthSemis.forEach(s => {
        const dt = new Date(s.dateTime);
        const card = document.createElement('div');
        card.className = 'notification-item';
        card.style.cursor = 'pointer';
        card.innerHTML = `
          <div class="notification-icon" style="background-color: rgba(123, 104, 238, 0.1); color: var(--primary);">
            <i class="material-icons-round">event</i>
          </div>
          <div class="notification-info">
            <div class="notification-title"><b>${formatDate(dt)} ${formatTime(dt)}</b>｜${escapeHTML(s.title)}</div>
            <div class="notification-time">${s.duration || 60}分・定員${s.capacity || 0}</div>
          </div>
        `;
        card.addEventListener('click', ()=> openDetail(s.id));
        calendarGrid.appendChild(card);
      });
      return;
    }

    if (calState.view === 'week') {
      const start = startOfWeek(calState.cursor);
      calendarGrid.style.display = 'grid';
      calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
      for (let i=0;i<7;i++){
        const day = addDays(start, i);
        const cell = document.createElement('div');
        cell.style.border = '1px solid rgba(0,0,0,0.06)';
        cell.style.borderRadius = '12px';
        cell.style.minHeight = '120px';
        cell.style.padding = '8px';
        const head = document.createElement('div');
        head.style.fontWeight = '600';
        head.style.marginBottom = '6px';
        head.textContent = `${day.getMonth()+1}/${day.getDate()}`;
        cell.appendChild(head);

        const list = getSeminarsOnDay(day);
        list.forEach(s=>{
          const dt = new Date(s.dateTime);
          const badge = document.createElement('div');
          badge.className = 'notification-item';
          badge.style.margin = '0 0 6px 0';
          badge.style.background = 'rgba(123, 104, 238, 0.05)';
          badge.style.cursor = 'pointer';
          badge.innerHTML = `
            <div class="notification-icon" style="width:32px;height:32px;background-color: rgba(123, 104, 238, 0.15); color: var(--primary);">
              <i class="material-icons-round" style="font-size:18px;">schedule</i>
            </div>
            <div class="notification-info">
              <div class="notification-title" style="font-size:13px;">${formatTime(dt)}｜${escapeHTML(s.title)}</div>
              <div class="notification-time">${s.duration || 60}分</div>
            </div>
          `;
          badge.addEventListener('click', ()=> openDetail(s.id));
          cell.appendChild(badge);
        });

        calendarGrid.appendChild(cell);
      }
      return;
    }

    // 月表示
    const y = calState.cursor.getFullYear();
    const m = calState.cursor.getMonth();
    const matrix = monthMatrix(y, m);
    calendarGrid.style.display = 'grid';
    calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    matrix.forEach(({date, current}) => {
      const cell = document.createElement('div');
      cell.style.border = '1px solid rgba(0,0,0,0.06)';
      cell.style.borderRadius = '12px';
      cell.style.minHeight = '120px';
      cell.style.padding = '8px';
      cell.style.opacity = current ? '1' : '0.55';

      const head = document.createElement('div');
      head.style.fontWeight = '600';
      head.style.marginBottom = '6px';
      head.textContent = `${date.getMonth()+1}/${date.getDate()}`;
      cell.appendChild(head);

      const list = getSeminarsOnDay(date);
      list.slice(0,3).forEach(s=>{
        const dt = new Date(s.dateTime);
        const badge = document.createElement('div');
        badge.className = 'notification-item';
        badge.style.margin = '0 0 6px 0';
        badge.style.background = 'rgba(123, 104, 238, 0.05)';
        badge.style.cursor = 'pointer';
        badge.innerHTML = `
          <div class="notification-icon" style="width:32px;height:32px;background-color: rgba(123, 104, 238, 0.15); color: var(--primary);">
            <i class="material-icons-round" style="font-size:18px;">event</i>
          </div>
          <div class="notification-info">
            <div class="notification-title" style="font-size:13px;">${formatTime(dt)}｜${escapeHTML(s.title)}</div>
            <div class="notification-time">${s.duration || 60}分</div>
          </div>
        `;
        badge.addEventListener('click', ()=> openDetail(s.id));
        cell.appendChild(badge);
      });
      if (list.length > 3) {
        const more = document.createElement('div');
        more.style.fontSize = '12px';
        more.style.color = 'var(--primary)';
        more.style.cursor = 'pointer';
        more.textContent = `他 ${list.length - 3} 件`;
        more.addEventListener('click', () => {
          // 当日分のリストビュー簡易表示
          openDayListModal(date, list);
        });
        cell.appendChild(more);
      }
      calendarGrid.appendChild(cell);
    });
  }

  function openDayListModal(day, list) {
    // 簡易的に詳細モーダルに挿入して使い回し
    const html = `
      <div style="font-weight:600;margin-bottom:8px;">${formatDate(day)} のセミナー</div>
      ${list.map(s=>{
        const dt=new Date(s.dateTime);
        return `
          <div class="notification-item" style="cursor:pointer;background:rgba(123,104,238,0.05);margin-bottom:6px;" data-id="${s.id}">
            <div class="notification-icon" style="width:32px;height:32px;background-color: rgba(123, 104, 238, 0.15); color: var(--primary);">
              <i class="material-icons-round" style="font-size:18px;">event</i>
            </div>
            <div class="notification-info">
              <div class="notification-title" style="font-size:13px;">${formatTime(dt)}｜${escapeHTML(s.title)}</div>
              <div class="notification-time">${s.duration||60}分・定員${s.capacity||0}</div>
            </div>
          </div>
        `;
      }).join('')}
    `;
    detailBody.innerHTML = html;
    openModal(modalDetail);
    detailBody.querySelectorAll('.notification-item').forEach(item=>{
      item.addEventListener('click', ()=>{
        const id=item.getAttribute('data-id');
        openDetail(id);
      });
    });
  }

  /* ---------- 一覧描画 ---------- */
  function getStatus(s) {
    const start = new Date(s.dateTime);
    const end = addMinutes(start, s.duration || 60);
    const now = new Date();
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'ended';
  }
  function renderSeminarList() {
    const f = statusFilter ? statusFilter.value : 'all';
    const q = (searchInput ? searchInput.value.trim() : '').toLowerCase();
    let arr = [...seminars];
    if (f !== 'all') arr = arr.filter(s => getStatus(s) === f);
    if (q) arr = arr.filter(s => s.title.toLowerCase().includes(q));

    arr.sort((a,b)=> new Date(a.dateTime)-new Date(b.dateTime));
    seminarList.innerHTML = '';
    if (arr.length === 0) {
      seminarList.innerHTML = `<div style="padding:12px;color:var(--text-secondary);">該当するセミナーがありません</div>`;
      return;
    }
    arr.forEach(s=>{
      const dt = new Date(s.dateTime);
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-header" style="margin-bottom:10px;">
          <div class="card-title">${escapeHTML(s.title)}</div>
          <a class="card-action" data-open="${s.id}">詳細</a>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="font-size:14px;color:var(--text-secondary);"><i class="material-icons-round" style="font-size:16px;vertical-align:middle;">event</i> <b>${formatDate(dt)} ${formatTime(dt)}</b>（${s.duration||60}分）</div>
          <div style="font-size:14px;color:var(--text-secondary);"><i class="material-icons-round" style="font-size:16px;vertical-align:middle;">group</i> 定員 ${s.capacity||0}</div>
          <div style="font-size:14px;color:var(--text-secondary);"><i class="material-icons-round" style="font-size:16px;vertical-align:middle;">smart_display</i> ${typeLabel(s.type)}</div>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-secondary" data-edit="${s.id}"><i class="material-icons-round" style="font-size:18px;vertical-align:middle;">edit</i><span style="margin-left:6px;">編集</span></button>
          <button class="btn-secondary" data-dup="${s.id}"><i class="material-icons-round" style="font-size:18px;vertical-align:middle;">content_copy</i><span style="margin-left:6px;">複製</span></button>
          <button class="btn-secondary" data-del="${s.id}" style="color:var(--error);border-color:var(--error);"><i class="material-icons-round" style="font-size:18px;vertical-align:middle;">delete</i><span style="margin-left:6px;">削除</span></button>
        </div>
      `;
      card.querySelector('[data-open]')?.addEventListener('click', ()=> openDetail(s.id));
      card.querySelector('[data-edit]')?.addEventListener('click', ()=> editSeminar(s.id));
      card.querySelector('[data-dup]')?.addEventListener('click', ()=> duplicateSeminar(s.id));
      card.querySelector('[data-del]')?.addEventListener('click', ()=> deleteSeminar(s.id));
      seminarList.appendChild(card);
    });
  }
  function typeLabel(t) {
    if (t==='live') return 'ライブ配信';
    if (t==='offline') return 'オフライン';
    return '録画配信';
  }

  /* ---------- 詳細モーダル ---------- */
  function openDetail(id) {
    const s = seminars.find(x=>x.id===id);
    if (!s) return;
    const dt = new Date(s.dateTime);
    detailBody.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div><b>タイトル</b><br>${escapeHTML(s.title)}</div>
        <div><b>日時</b><br>${formatDate(dt)} ${formatTime(dt)}（${s.duration||60}分）</div>
        <div><b>定員</b><br>${s.capacity||0}</div>
        <div><b>形式</b><br>${typeLabel(s.type)}</div>
        <div style="grid-column:1/-1;"><b>配信リンク</b><br>${s.link ? `<a href="${s.link}" target="_blank" style="color:var(--primary);">${s.link}</a>` : '-'}</div>
        <div style="grid-column:1/-1;"><b>説明</b><br>${s.description ? escapeHTML(s.description) : '-'}</div>
      </div>
    `;
    // モーダル内ボタンに現在対象IDを持たせる
    editBtn.setAttribute('data-id', id);
    dupBtn.setAttribute('data-id', id);
    delBtn.setAttribute('data-id', id);
    openModal(modalDetail);
  }
  if (closeDetailBtn) closeDetailBtn.addEventListener('click', ()=> closeModal(modalDetail));
  if (editBtn) editBtn.addEventListener('click', ()=>{
    const id = editBtn.getAttribute('data-id');
    closeModal(modalDetail);
    editSeminar(id);
  });
  if (dupBtn) dupBtn.addEventListener('click', ()=>{
    const id = dupBtn.getAttribute('data-id');
    duplicateSeminar(id);
  });
  if (delBtn) delBtn.addEventListener('click', ()=>{
    const id = delBtn.getAttribute('data-id');
    deleteSeminar(id);
  });

  function editSeminar(id) {
    const s = seminars.find(x=>x.id===id);
    if (!s) return;
    editingId = id;
    titleEl.value = s.title;
    dtEl.value = toLocalDTValue(new Date(s.dateTime));
    durationEl.value = s.duration || 60;
    capEl.value = s.capacity || 0;
    typeEl.value = s.type || 'recorded';
    linkEl.value = s.link || '';
    descEl.value = s.description || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('編集モード：変更して「セミナーを作成」を押すと更新されます');
  }
  function duplicateSeminar(id) {
    const s = seminars.find(x=>x.id===id);
    if (!s) return;
    const copy = { ...s, id: uid('semi'), title: s.title + '（複製）', createdAt: new Date().toISOString() };
    seminars.push(copy);
    saveJSON(STORAGE.seminars, seminars);
    renderSeminarList();
    renderCalendar();
    populateReminderTarget();
    toast('複製しました');
  }
  function deleteSeminar(id) {
    if (!confirm('このセミナーを削除しますか？')) return;
    seminars = seminars.filter(x=>x.id!==id);
    saveJSON(STORAGE.seminars, seminars);
    renderSeminarList();
    renderCalendar();
    populateReminderTarget();
    toast('削除しました');
    closeModal(modalDetail);
  }

  /* ---------- リマインド設定 ---------- */
  function populateReminderTarget() {
    if (!reminderSeminarId) return;
    reminderSeminarId.innerHTML = seminars
      .sort((a,b)=> new Date(a.dateTime)-new Date(b.dateTime))
      .map(s=>`<option value="${s.id}">${escapeHTML(s.title)}</option>`).join('');
    applyReminderFormValues();
  }
  function applyReminderFormValues(){
    const sid = reminderSeminarId.value;
    const r = reminders[sid] || { d3:'off', d1:'off', h1:'off', template:'' };
    remind3d.value = r.d3 || 'off';
    remind1d.value = r.d1 || 'off';
    remind1h.value = r.h1 || 'off';
    reminderTemplate.value = r.template || '';
  }

  if (openReminderBtn) openReminderBtn.addEventListener('click', ()=>{
    populateReminderTarget();
    openModal(modalReminder);
  });
  if (closeReminderBtn) closeReminderBtn.addEventListener('click', ()=> closeModal(modalReminder));
  if (reminderSeminarId) reminderSeminarId.addEventListener('change', applyReminderFormValues);

  if (reminderForm) {
    reminderForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const sid = reminderSeminarId.value;
      reminders[sid] = {
        d3: remind3d.value,
        d1: remind1d.value,
        h1: remind1h.value,
        template: reminderTemplate.value
      };
      saveJSON(STORAGE.reminders, reminders);
      toast('リマインド設定を保存しました');
      closeModal(modalReminder);
    });
  }
  if (disableReminderBtn) {
    disableReminderBtn.addEventListener('click', ()=>{
      const sid = reminderSeminarId.value;
      delete reminders[sid];
      saveJSON(STORAGE.reminders, reminders);
      applyReminderFormValues();
      toast('リマインドを停止しました');
    });
  }
  if (testReminderBtn) {
    testReminderBtn.addEventListener('click', ()=>{
      const sid = reminderSeminarId.value;
      const s = seminars.find(x=>x.id===sid);
      const tpl = (reminderTemplate.value || '『{title}』は {date} {time} 開催です。参加リンク：{link}')
        .replace('{title}', s?.title || '')
        .replace('{date}', s ? formatDate(new Date(s.dateTime)) : '')
        .replace('{time}', s ? formatTime(new Date(s.dateTime)) : '')
        .replace('{link}', s?.link || '(未設定)');
      alert('【テスト送信プレビュー】\n\n' + tpl);
    });
  }

  /* ---------- アクティビティ描画 ---------- */
  function renderActivity() {
    if (!activityWrap) return;
    activityWrap.innerHTML = '';
    const arr = [...activity].sort((a,b)=> new Date(b.at)-new Date(a.at));
    arr.forEach(it=>{
      const item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML = `
        <div class="activity-avatar" style="background: var(--info);">EV</div>
        <div class="activity-content">
          <div class="activity-text">${escapeHTML(it.text)}</div>
          <div class="activity-time">${formatDateTime(new Date(it.at))}</div>
        </div>
      `;
      activityWrap.appendChild(item);
    });
  }

  /* ---------- モーダル汎用 ---------- */
  function openModal(el) {
    el.style.display = 'flex';
  }
  function closeModal(el) {
    el.style.display = 'none';
  }

  /* ---------- フィルタ/検索/ビュー切替/前後移動 ---------- */
  if (statusFilter) statusFilter.addEventListener('change', renderSeminarList);
  if (searchInput) searchInput.addEventListener('input', renderSeminarList);
  if (refreshBtn) refreshBtn.addEventListener('click', ()=> { seminars = loadJSON(STORAGE.seminars, []); renderSeminarList(); });

  if (viewSel) viewSel.addEventListener('change', ()=>{
    calState.view = viewSel.value;
    renderCalendar();
  });
  if (prevBtn) prevBtn.addEventListener('click', ()=>{
    if (calState.view === 'week') calState.cursor = addDays(calState.cursor, -7);
    else calState.cursor = new Date(calState.cursor.getFullYear(), calState.cursor.getMonth()-1, 1);
    renderCalendar();
  });
  if (nextBtn) nextBtn.addEventListener('click', ()=>{
    if (calState.view === 'week') calState.cursor = addDays(calState.cursor, 7);
    else calState.cursor = new Date(calState.cursor.getFullYear(), calState.cursor.getMonth()+1, 1);
    renderCalendar();
  });

  /* ---------- 初期描画 ---------- */
  renderSeminarList();
  renderCalendar();
  renderActivity();
  populateReminderTarget();
}

/* -------------------------------------------
 * 補助：トースト（簡易）
 * ----------------------------------------- */
let __toastTimer = null;
function toast(msg, danger=false){
  let el = document.getElementById('__toast');
  if (!el) {
    el = document.createElement('div');
    el.id='__toast';
    el.style.position='fixed';
    el.style.bottom='20px';
    el.style.right='20px';
    el.style.zIndex='9999';
    el.style.padding='12px 16px';
    el.style.borderRadius='10px';
    el.style.boxShadow='var(--shadow)';
    el.style.fontWeight='600';
    el.style.color='#fff';
    document.body.appendChild(el);
  }
  el.style.background = danger ? '#FF7E7E' : '#7B68EE';
  el.textContent = msg;
  el.style.opacity='1';
  clearTimeout(__toastTimer);
  __toastTimer = setTimeout(()=>{ el.style.opacity='0'; }, 1800);
}

/* -------------------------------------------
 * 補助：escapeHTML
 * ----------------------------------------- */
function escapeHTML(str){
  if (str == null) return '';
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
/* -------------------------------------------
 * U-005 講座コンテンツ管理（course-content.html）
 * ----------------------------------------- */
function initCourseContent(){
  // ページ要素の存在で分岐
  const courseList = document.getElementById('courseList');
  const courseSearch = document.getElementById('courseSearch');
  const courseStatusFilter = document.getElementById('courseStatusFilter');
  const newCourseBtn = document.getElementById('newCourseBtn');

  const selectedCourseSummary = document.getElementById('selectedCourseSummary');
  const contentList = document.getElementById('contentList');

  const editCourseBtn = document.getElementById('editCourseBtn');
  const togglePublishBtn = document.getElementById('togglePublishBtn');
  const duplicateCourseBtn = document.getElementById('duplicateCourseBtn');
  const deleteCourseBtn = document.getElementById('deleteCourseBtn');
  const previewCourseBtn = document.getElementById('previewCourseBtn');

  const courseModal = document.getElementById('courseModal');
  const closeCourseModal = document.getElementById('closeCourseModal');
  const courseForm = document.getElementById('courseForm');
  const courseModalTitle = document.getElementById('courseModalTitle');
  const courseTitle = document.getElementById('courseTitle');
  const coursePrice = document.getElementById('coursePrice');
  const courseCategory = document.getElementById('courseCategory');
  const courseThumb = document.getElementById('courseThumb');
  const courseDescription = document.getElementById('courseDescription');
  const saveDraftCourseBtn = document.getElementById('saveDraftCourseBtn');

  const contentModal = document.getElementById('contentModal');
  const closeContentModal = document.getElementById('closeContentModal');
  const contentForm = document.getElementById('contentForm');
  const contentModalTitle = document.getElementById('contentModalTitle');
  const contentType = document.getElementById('contentType');
  const contentDuration = document.getElementById('contentDuration');
  const contentTitle = document.getElementById('contentTitle');
  const contentURL = document.getElementById('contentURL');
  const addContentBtn = document.getElementById('addContentBtn');

  if (!courseList || !contentList) return; // 他ページはスキップ

  const KEYS = {
    courses: 'app.courses',
    contents: 'app.courseContents',
    courseDraft: 'app.courseDraft'
  };

  let courses = loadJSON(KEYS.courses, []);
  let contents = loadJSON(KEYS.contents, {}); // { [courseId]: [ {id, type, title, url, duration, required, published} ] }
  let selectedCourseId = null;
  let editingCourseId = null;
  let editingContentId = null;

  // 初期データ（なければ投入）
  if (courses.length === 0) {
    const c1 = { id: uid('course'), title: 'SNSコンテンツ作成マスター', price: 128000, status: 'published', category: 'マーケティング', thumb: '', description: 'ショート動画とリールを武器に月内で結果を出す実践講座', updatedAt: new Date().toISOString() };
    const c2 = { id: uid('course'), title: 'AIリライト基礎', price: 68000, status: 'draft', category: 'AI/自動化', thumb: '', description: 'AIを使ったリライトと投稿テンプレの作り方', updatedAt: new Date().toISOString() };
    courses = [c1, c2];
    contents[c1.id] = [
      { id: uid('item'), type:'video', title:'イントロダクション', url:'https://example.com/v1', duration:10, required:true,  published:true },
      { id: uid('item'), type:'pdf',   title:'台本テンプレ集',     url:'/files/script.pdf',      duration:0,  required:false, published:true },
      { id: uid('item'), type:'video', title:'撮影と照明の基本',   url:'https://example.com/v2', duration:18, required:true,  published:false },
      { id: uid('item'), type:'quiz',  title:'理解度チェック #1',   url:'quiz:001',               duration:5,  required:true,  published:false },
    ];
    contents[c2.id] = [
      { id: uid('item'), type:'video', title:'AIリライトの考え方', url:'https://example.com/v3', duration:14, required:true, published:false },
    ];
    saveJSON(KEYS.courses, courses);
    saveJSON(KEYS.contents, contents);
  }

  // ---------- コース一覧描画 ----------
  function renderCourseList() {
    const q = (courseSearch?.value || '').trim().toLowerCase();
    const f = (courseStatusFilter?.value || 'all');
    let arr = [...courses];
    if (f !== 'all') arr = arr.filter(c => c.status === f);
    if (q) arr = arr.filter(c => c.title.toLowerCase().includes(q));

    arr.sort((a,b)=> new Date(b.updatedAt) - new Date(a.updatedAt));

    courseList.innerHTML = '';
    if (arr.length === 0) {
      courseList.innerHTML = `<div style="grid-column:1/-1; color:var(--text-secondary); padding:8px;">該当するコースがありません</div>`;
      return;
    }

    arr.forEach(c=>{
      const lessons = (contents[c.id] || []).length;
      const publishedCount = (contents[c.id] || []).filter(x=>x.published).length;
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="card-header" style="margin-bottom:8px;">
          <div class="card-title">${escapeHTML(c.title)}</div>
          <span class="card-action" data-open="${c.id}">${c.status==='published' ? '公開中' : '下書き'}</span>
        </div>
        <div style="display:flex; gap:14px; flex-wrap: wrap; font-size:14px; color:var(--text-secondary);">
          <div><i class="material-icons-round" style="font-size:16px; vertical-align:middle;">payments</i> ¥${(c.price||0).toLocaleString()}</div>
          <div><i class="material-icons-round" style="font-size:16px; vertical-align:middle;">view_list</i> レッスン ${lessons}（公開 ${publishedCount}）</div>
          <div><i class="material-icons-round" style="font-size:16px; vertical-align:middle;">category</i> ${escapeHTML(c.category||'-')}</div>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn-secondary" data-select="${c.id}"><i class="material-icons-round" style="font-size:18px;vertical-align:middle;">open_in_new</i><span style="margin-left:6px;">選択</span></button>
          <button class="btn-secondary" data-edit="${c.id}"><i class="material-icons-round" style="font-size:18px;vertical-align:middle;">edit</i><span style="margin-left:6px;">編集</span></button>
          <button class="btn-secondary" data-dup="${c.id}"><i class="material-icons-round" style="font-size:18px;vertical-align:middle;">content_copy</i><span style="margin-left:6px;">複製</span></button>
          <button class="btn-secondary" data-del="${c.id}" style="color:var(--error); border-color:var(--error);"><i class="material-icons-round" style="font-size:18px;vertical-align:middle;">delete</i><span style="margin-left:6px;">削除</span></button>
        </div>
      `;
      card.querySelector('[data-open]')?.addEventListener('click', ()=> selectCourse(c.id));
      card.querySelector('[data-select]')?.addEventListener('click', ()=> selectCourse(c.id));
      card.querySelector('[data-edit]')?.addEventListener('click', ()=> openCourseModal(c.id));
      card.querySelector('[data-dup]')?.addEventListener('click', ()=> duplicateCourse(c.id));
      card.querySelector('[data-del]')?.addEventListener('click', ()=> deleteCourse(c.id));
      courseList.appendChild(card);
    });
  }

  // ---------- コース選択・要約 ----------
  function selectCourse(id){
    selectedCourseId = id;
    const c = courses.find(x=>x.id===id);
    const lessons = (contents[id] || []);
    const totalMin = lessons.reduce((sum, it)=> sum + (parseInt(it.duration||0, 10) || 0), 0);
    const reqCount = lessons.filter(x=>x.required).length;
    const pubCount = lessons.filter(x=>x.published).length;

    selectedCourseSummary.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <div><b>タイトル</b><br>${escapeHTML(c.title)}</div>
        <div><b>ステータス</b><br>${c.status==='published'?'公開':'下書き'}</div>
        <div><b>価格</b><br>¥${(c.price||0).toLocaleString()}</div>
        <div><b>カテゴリー</b><br>${escapeHTML(c.category||'-')}</div>
        <div style="grid-column:1/-1;"><b>説明</b><br>${escapeHTML(c.description||'-')}</div>
        <div><b>レッスン数</b><br>${lessons.length}（必須 ${reqCount} / 公開 ${pubCount}）</div>
        <div><b>総学習時間目安</b><br>${totalMin} 分</div>
      </div>
    `;
    if (previewCourseBtn) {
      // 仮のプレイヤーページへ（本実装では /student/course/:id など）
      previewCourseBtn.href = 'course-viewer.html';
    }
    renderContentList();
  }

  // ---------- コンテンツ一覧（並び替え/トグル/編集/削除） ----------
  function renderContentList(){
    contentList.innerHTML = '';
    if (!selectedCourseId) {
      contentList.innerHTML = `<div style="color:var(--text-secondary);">左上のコース一覧からコースを選択してください。</div>`;
      return;
    }
    const arr = contents[selectedCourseId] || [];
    if (arr.length === 0) {
      contentList.innerHTML = `<div style="color:var(--text-secondary);">このコースにはまだコンテンツがありません。「コンテンツ追加」から登録してください。</div>`;
      return;
    }

    arr.forEach((it, idx)=>{
      const row = document.createElement('div');
      row.className = 'notification-item';
      row.style.alignItems = 'center';
      row.innerHTML = `
        <div class="notification-icon" style="width:42px;height:42px;background:rgba(123,104,238,0.12); color:var(--primary);">
          <i class="material-icons-round">${iconForType(it.type)}</i>
        </div>
        <div class="notification-info" style="min-width:0;">
          <div class="notification-title" style="display:flex; gap:6px; align-items:center;">
            <span style="white-space:nowrap; font-size:12px; padding:2px 6px; border:1px solid rgba(0,0,0,0.08); border-radius:999px;">#${idx+1}</span>
            <b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(it.title)}</b>
            <span style="font-size:12px; color:var(--text-secondary);">(${it.duration||0}分)</span>
            ${it.required ? `<span style="font-size:11px; padding:2px 6px; background:rgba(111,207,151,0.15); color:var(--success); border-radius:999px;">必須</span>` : ''}
            ${it.published ? `<span style="font-size:11px; padding:2px 6px; background:rgba(123,104,238,0.15); color:var(--primary); border-radius:999px;">公開</span>` : `<span style="font-size:11px; padding:2px 6px; background:rgba(0,0,0,0.06); color:var(--text-secondary); border-radius:999px;">非公開</span>`}
          </div>
          <div class="notification-time" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(it.url||'-')}</div>
        </div>
        <div style="margin-left:auto; display:flex; gap:6px; align-items:center;">
          <button class="btn-secondary" data-up="${it.id}" title="上へ"><i class="material-icons-round" style="font-size:18px;">arrow_upward</i></button>
          <button class="btn-secondary" data-down="${it.id}" title="下へ"><i class="material-icons-round" style="font-size:18px;">arrow_downward</i></button>
          <button class="btn-secondary" data-req="${it.id}" title="必須/任意"><i class="material-icons-round" style="font-size:18px;">check_circle</i></button>
          <button class="btn-secondary" data-pub="${it.id}" title="公開/非公開"><i class="material-icons-round" style="font-size:18px;">public</i></button>
          <button class="btn-secondary" data-edit="${it.id}" title="編集"><i class="material-icons-round" style="font-size:18px;">edit</i></button>
          <button class="btn-secondary" data-del="${it.id}" title="削除" style="color:var(--error); border-color:var(--error);"><i class="material-icons-round" style="font-size:18px;">delete</i></button>
        </div>
      `;
      row.querySelector('[data-up]')?.addEventListener('click', ()=> moveItem(it.id, -1));
      row.querySelector('[data-down]')?.addEventListener('click', ()=> moveItem(it.id, +1));
      row.querySelector('[data-req]')?.addEventListener('click', ()=> toggleItem(it.id, 'required'));
      row.querySelector('[data-pub]')?.addEventListener('click', ()=> toggleItem(it.id, 'published'));
      row.querySelector('[data-edit]')?.addEventListener('click', ()=> openContentModal(it.id));
      row.querySelector('[data-del]')?.addEventListener('click', ()=> deleteItem(it.id));
      contentList.appendChild(row);
    });
  }

  function iconForType(t){
    if (t==='pdf') return 'description';
    if (t==='quiz') return 'quiz';
    return 'smart_display';
  }

  function moveItem(id, delta){
    const arr = contents[selectedCourseId] || [];
    const idx = arr.findIndex(x=>x.id===id);
    if (idx<0) return;
    const newIdx = idx + delta;
    if (newIdx<0 || newIdx>=arr.length) return;
    const [sp] = arr.splice(idx,1);
    arr.splice(newIdx,0,sp);
    contents[selectedCourseId] = arr;
    saveJSON(KEYS.contents, contents);
    renderContentList();
  }
  function toggleItem(id, key){
    const arr = contents[selectedCourseId] || [];
    const it = arr.find(x=>x.id===id);
    if (!it) return;
    it[key] = !it[key];
    saveJSON(KEYS.contents, contents);
    renderContentList();
  }
  function deleteItem(id){
    if (!confirm('このコンテンツを削除しますか？')) return;
    const arr = contents[selectedCourseId] || [];
    contents[selectedCourseId] = arr.filter(x=>x.id!==id);
    saveJSON(KEYS.contents, contents);
    renderContentList();
  }

  // ---------- コース作成/編集 ----------
  function openCourseModal(id){
    editingCourseId = id || null;
    const d = id ? courses.find(x=>x.id===id) : (loadJSON(KEYS.courseDraft, {})||{});
    courseModalTitle.textContent = id ? 'コース編集' : '新規コース';
    courseTitle.value = d?.title || '';
    coursePrice.value = d?.price || '';
    courseCategory.value = d?.category || '';
    courseThumb.value = d?.thumb || '';
    courseDescription.value = d?.description || '';
    courseModal.style.display = 'flex';
  }
  function closeCourse(){
    courseModal.style.display = 'none';
  }
  if (closeCourseModal) closeCourseModal.addEventListener('click', closeCourse);
  if (newCourseBtn) newCourseBtn.addEventListener('click', ()=> openCourseModal(null));
  if (saveDraftCourseBtn) {
    saveDraftCourseBtn.addEventListener('click', ()=>{
      const d = {
        title: courseTitle.value.trim(),
        price: parseInt(coursePrice.value||'0',10),
        category: courseCategory.value.trim(),
        thumb: courseThumb.value.trim(),
        description: courseDescription.value.trim()
      };
      saveJSON(KEYS.courseDraft, d);
      toast('コース下書きを保存しました');
    });
  }
  if (courseForm) {
    courseForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const item = {
        title: courseTitle.value.trim(),
        price: parseInt(coursePrice.value||'0',10),
        category: courseCategory.value.trim(),
        thumb: courseThumb.value.trim(),
        description: courseDescription.value.trim()
      };
      if (!item.title) {
        toast('タイトルは必須です', true);
        return;
      }
      if (editingCourseId) {
        // 更新
        courses = courses.map(c => c.id===editingCourseId ? { ...c, ...item, updatedAt:new Date().toISOString() } : c);
        toast('コースを更新しました');
      } else {
        // 追加
        const id = uid('course');
        courses.push({ id, status:'draft', updatedAt:new Date().toISOString(), ...item });
        contents[id] = [];
        toast('コースを作成しました');
      }
      saveJSON(KEYS.courses, courses);
      saveJSON(KEYS.contents, contents);
      localStorage.removeItem(KEYS.courseDraft);
      editingCourseId = null;
      closeCourse();
      renderCourseList();
    });
  }

  // 右側アクション
  if (editCourseBtn) editCourseBtn.addEventListener('click', ()=>{
    if (!selectedCourseId) return toast('コースを選択してください', true);
    openCourseModal(selectedCourseId);
  });
  if (togglePublishBtn) togglePublishBtn.addEventListener('click', ()=>{
    if (!selectedCourseId) return toast('コースを選択してください', true);
    courses = courses.map(c => c.id===selectedCourseId ? { ...c, status: c.status==='published'?'draft':'published', updatedAt:new Date().toISOString() } : c);
    saveJSON(KEYS.courses, courses);
    toast('コースの公開状態を切り替えました');
    renderCourseList();
    selectCourse(selectedCourseId);
  });
  if (duplicateCourseBtn) duplicateCourseBtn.addEventListener('click', ()=>{
    if (!selectedCourseId) return toast('コースを選択してください', true);
    const src = courses.find(c=>c.id===selectedCourseId);
    if (!src) return;
    const id = uid('course');
    courses.push({ ...src, id, title: src.title+'（複製）', status:'draft', updatedAt:new Date().toISOString() });
    contents[id] = (contents[selectedCourseId]||[]).map(it=> ({ ...it, id: uid('item'), published:false }));
    saveJSON(KEYS.courses, courses);
    saveJSON(KEYS.contents, contents);
    toast('コースを複製しました');
    renderCourseList();
  });
  if (deleteCourseBtn) deleteCourseBtn.addEventListener('click', ()=>{
    if (!selectedCourseId) return toast('コースを選択してください', true);
    if (!confirm('このコースを削除しますか？（コンテンツも削除されます）')) return;
    courses = courses.filter(c=>c.id!==selectedCourseId);
    delete contents[selectedCourseId];
    saveJSON(KEYS.courses, courses);
    saveJSON(KEYS.contents, contents);
    selectedCourseId = null;
    selectedCourseSummary.innerHTML = '';
    contentList.innerHTML = '';
    toast('コースを削除しました');
    renderCourseList();
  });

  function duplicateCourse(id){
    selectedCourseId = id;
    duplicateCourseBtn?.click();
  }
  function deleteCourse(id){
    selectedCourseId = id;
    deleteCourseBtn?.click();
  }

  // ---------- コンテンツ作成/編集 ----------
  function openContentModal(id){
    if (!selectedCourseId) return toast('コースを選択してください', true);
    editingContentId = id || null;
    const arr = contents[selectedCourseId] || [];
    const d = id ? arr.find(x=>x.id===id) : null;
    contentModalTitle.textContent = id ? 'コンテンツ編集' : 'コンテンツ追加';
    contentType.value = d?.type || 'video';
    contentDuration.value = d?.duration || '';
    contentTitle.value = d?.title || '';
    contentURL.value = d?.url || '';
    contentModal.style.display = 'flex';
  }
  function closeContent(){
    contentModal.style.display = 'none';
  }
  if (closeContentModal) closeContentModal.addEventListener('click', closeContent);
  if (addContentBtn) addContentBtn.addEventListener('click', ()=> openContentModal(null));

  if (contentForm) {
    contentForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const item = {
        type: contentType.value,
        duration: parseInt(contentDuration.value||'0',10),
        title: contentTitle.value.trim(),
        url: contentURL.value.trim()
      };
      if (!item.title) { toast('タイトルは必須です', true); return; }

      const arr = contents[selectedCourseId] || [];
      if (editingContentId) {
        // 更新
        const idx = arr.findIndex(x=>x.id===editingContentId);
        if (idx>=0) arr[idx] = { ...arr[idx], ...item };
        toast('コンテンツを更新しました');
      } else {
        arr.push({ id: uid('item'), required: true, published:false, ...item });
        toast('コンテンツを追加しました');
      }
      contents[selectedCourseId] = arr;
      saveJSON(KEYS.contents, contents);
      // コース更新日時も更新
      courses = courses.map(c => c.id===selectedCourseId ? { ...c, updatedAt:new Date().toISOString() } : c);
      saveJSON(KEYS.courses, courses);

      editingContentId = null;
      closeContent();
      renderContentList();
      renderCourseList();
    });
  }

  // 検索/フィルタ
  courseSearch?.addEventListener('input', renderCourseList);
  courseStatusFilter?.addEventListener('change', renderCourseList);

  // 初期表示
  renderCourseList();
}
/* -------------------------------------------
 * U-006 受講生管理（student-management.html）
 * ----------------------------------------- */
function initStudentManagement(){
  // 要素取得
  const listEl = document.getElementById('studentList');
  const searchEl = document.getElementById('studentSearch');
  const courseFilter = document.getElementById('courseFilter');
  const statusFilter = document.getElementById('statusFilter');
  const newStudentBtn = document.getElementById('newStudentBtn');

  const studentSummary = document.getElementById('studentSummary');
  const saveNoteBtn = document.getElementById('saveNoteBtn');
  const studentNote = document.getElementById('studentNote');
  const studentTags = document.getElementById('studentTags');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const toggleStatusBtn = document.getElementById('toggleStatusBtn');

  const studentModal = document.getElementById('studentModal');
  const closeStudentModal = document.getElementById('closeStudentModal');
  const studentForm = document.getElementById('studentForm');
  const studentModalTitle = document.getElementById('studentModalTitle');
  const stName = document.getElementById('stName');
  const stEmail = document.getElementById('stEmail');
  const stCourse = document.getElementById('stCourse');
  const stStatus = document.getElementById('stStatus');
  const stMemo = document.getElementById('stMemo');

  const messageModal = document.getElementById('messageModal');
  const closeMessageModal = document.getElementById('closeMessageModal');
  const messageForm = document.getElementById('messageForm');
  const msgTo = document.getElementById('msgTo');
  const msgSubject = document.getElementById('msgSubject');
  const msgBody = document.getElementById('msgBody');

  const progressCanvas = document.getElementById('progressChart');

  // 他ページなら抜ける
  if (!listEl || !progressCanvas) return;

  // キー
  const KEYS = {
    students: 'app.students',
    enrollments: 'app.enrollments',
    notes: 'app.studentNotes',
    tags: 'app.studentTags',
    courses: 'app.courses',
    contents: 'app.courseContents'
  };

  // データ
  let courses = loadJSON(KEYS.courses, []);
  let contents = loadJSON(KEYS.contents, {});
  let students = loadJSON(KEYS.students, []);
  let enrollments = loadJSON(KEYS.enrollments, []); // {id, studentId, courseId, status:'active|completed|paused', progress:[{contentId, completed}]}
  let notes = loadJSON(KEYS.notes, {}); // { [studentId]: "text..." }
  let tags = loadJSON(KEYS.tags, {});   // { [studentId]: ["VIP","..."] }

  // ダミーデータ投入（なければ）
  if (students.length === 0) {
    const s1 = { id: uid('stu'), name: '鈴木 健太', email: 'kenta@example.com', createdAt: new Date().toISOString() };
    const s2 = { id: uid('stu'), name: '田中 美智子', email: 'michiko@example.com', createdAt: new Date().toISOString() };
    const s3 = { id: uid('stu'), name: '木村 優斗', email: 'yuto@example.com', createdAt: new Date().toISOString() };
    students = [s1, s2, s3];
    saveJSON(KEYS.students, students);

    // コースがなければ、最低1つは用意
    if (courses.length === 0) {
      const c1 = { id: uid('course'), title:'SNSコンテンツ作成マスター', price:128000, status:'published', category:'マーケティング', updatedAt:new Date().toISOString() };
      courses = [c1]; saveJSON(KEYS.courses, courses);
      contents[c1.id] = [
        { id: uid('item'), type:'video', title:'イントロ', url:'https://example.com/intro', duration:8, required:true, published:true },
        { id: uid('item'), type:'pdf', title:'リール台本テンプレ', url:'/files/reel.pdf', duration:0, required:false, published:true },
        { id: uid('item'), type:'video', title:'撮影のコツ', url:'https://example.com/tips', duration:15, required:true, published:true },
      ];
      saveJSON(KEYS.contents, contents);
    }

    // 受講登録
    enrollments = [
      { id: uid('enr'), studentId: students[0].id, courseId: courses[0].id, status:'active', progress: [{contentId: contents[courses[0].id][0].id, completed:true}] },
      { id: uid('enr'), studentId: students[1].id, courseId: courses[0].id, status:'paused', progress: [] },
      { id: uid('enr'), studentId: students[2].id, courseId: courses[0].id, status:'completed', progress: contents[courses[0].id].map(x=>({contentId:x.id, completed:true})) },
    ];
    saveJSON(KEYS.enrollments, enrollments);
  }

  // フィルタのコース選択肢
  function populateCourseFilterOptions() {
    courseFilter.innerHTML = '<option value="all">すべてのコース</option>';
    courses.forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.title;
      courseFilter.appendChild(opt);
    });
  }
  // 追加/編集モーダルのコース選択肢
  function populateStudentModalCourses(){
    stCourse.innerHTML = '';
    courses.forEach(c=>{
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.title;
      stCourse.appendChild(opt);
    });
  }

  // 選択中学生
  let selectedStudentId = null;
  let progressChart = null;

  // レンダリング：受講生一覧
  function renderStudentList(){
    const q = (searchEl?.value || '').trim().toLowerCase();
    const cf = (courseFilter?.value || 'all');
    const sf = (statusFilter?.value || 'all');

    // 学生に対して、最新の受講状態（複数コース中でもフィルタに一致する登録）を集計
    const enriched = students.map(st=>{
      const regs = enrollments.filter(e=>e.studentId===st.id);
      let display = {...st, enrollments: regs};
      return display;
    });

    let arr = enriched;

    if (q) {
      arr = arr.filter(s => (s.name||'').toLowerCase().includes(q) || (s.email||'').toLowerCase().includes(q));
    }
    if (cf !== 'all') {
      arr = arr.filter(s => s.enrollments.some(e => e.courseId===cf));
    }
    if (sf !== 'all') {
      arr = arr.filter(s => s.enrollments.some(e => e.status===sf));
    }

    listEl.innerHTML = '';
    if (arr.length === 0) {
      listEl.innerHTML = `<div style="grid-column:1/-1; color:var(--text-secondary); padding:8px;">該当する受講生がいません</div>`;
      return;
    }

    arr.forEach(s=>{
      // 表示用：代表の登録（フィルタ優先／なければ最初）
      const rep = (cf!=='all' ? s.enrollments.find(e=>e.courseId===cf) : null) || s.enrollments[0] || null;
      const courseTitle = rep ? (courses.find(c=>c.id===rep.courseId)?.title || '-') : '-';
      const statusBadge = rep ? rep.status : '—';
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="card-header" style="margin-bottom:8px;">
          <div class="card-title" style="display:flex; gap:8px; align-items:center;">
            <div class="activity-avatar" style="background: var(--accent2);">${initials(s.name)}</div>
            <div>${escapeHTML(s.name)}</div>
          </div>
          <span class="card-action" data-open="${s.id}">${statusLabel(statusBadge)}</span>
        </div>
        <div style="display:flex; gap:14px; flex-wrap:wrap; font-size:14px; color:var(--text-secondary);">
          <div><i class="material-icons-round" style="font-size:16px; vertical-align:middle;">email</i> ${escapeHTML(s.email)}</div>
          <div><i class="material-icons-round" style="font-size:16px; vertical-align:middle;">school</i> ${escapeHTML(courseTitle)}</div>
          <div><i class="material-icons-round" style="font-size:16px; vertical-align:middle;">event</i> 登録 ${formatDate(s.createdAt)}</div>
        </div>
        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn-secondary" data-select="${s.id}"><i class="material-icons-round" style="font-size:18px;vertical-align:middle;">open_in_new</i><span style="margin-left:6px;">選択</span></button>
          <button class="btn-secondary" data-edit="${s.id}"><i class="material-icons-round" style="font-size:18px;vertical-align:middle;">edit</i><span style="margin-left:6px;">編集</span></button>
          <button class="btn-secondary" data-del="${s.id}" style="color:var(--error); border-color:var(--error);"><i class="material-icons-round" style="font-size:18px;vertical-align:middle;">delete</i><span style="margin-left:6px;">削除</span></button>
        </div>
      `;
      card.querySelector('[data-open]')?.addEventListener('click', ()=> selectStudent(s.id));
      card.querySelector('[data-select]')?.addEventListener('click', ()=> selectStudent(s.id));
      card.querySelector('[data-edit]')?.addEventListener('click', ()=> openStudentModal(s.id));
      card.querySelector('[data-del]')?.addEventListener('click', ()=> deleteStudent(s.id));
      listEl.appendChild(card);
    });
  }

  function statusLabel(s){
    if (s==='active') return '受講中';
    if (s==='completed') return '修了';
    if (s==='paused') return '一時停止';
    return '—';
  }
  function initials(name){
    const t = (name||'').trim();
    if (!t) return 'ST';
    const parts = t.split(/\s+/);
    const a = parts[0]?.[0] || '';
    const b = parts[1]?.[0] || '';
    return (a+b || a).toUpperCase();
  }
  function formatDate(iso){
    try { return new Date(iso).toLocaleDateString('ja-JP'); } catch { return '-'; }
  }

  // 選択 → 詳細と進捗
  let progressChartInstance = null;
  function selectStudent(id){
    selectedStudentId = id;
    const st = students.find(x=>x.id===id);
    if (!st) return;

    // 最新の登録を全て取得
    const regs = enrollments.filter(e=>e.studentId===id);
    const lines = regs.map(e=>{
      const c = courses.find(cc=>cc.id===e.courseId);
      const total = (contents[e.courseId] || []).length;
      const done = (e.progress || []).filter(p=>p.completed).length;
      const pct = total>0 ? Math.round(done/total*100) : 0;
      return `<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <span style="font-weight:600;">${escapeHTML(c?.title||'-')}</span>
        <span style="font-size:12px; color:var(--text-secondary);">(${statusLabel(e.status)})</span>
        <span style="font-size:12px; padding:2px 8px; border:1px solid rgba(0,0,0,0.08); border-radius:999px;">${done}/${total} 完了（${pct}%）</span>
      </div>`;
    }).join('');

    studentSummary.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <div><b>氏名</b><br>${escapeHTML(st.name)}</div>
        <div><b>メール</b><br>${escapeHTML(st.email)}</div>
        <div><b>登録数</b><br>${regs.length} コース</div>
        <div><b>登録日</b><br>${formatDate(st.createdAt)}</div>
        <div style="grid-column:1/-1; margin-top:6px;">${lines || '<span style="color:var(--text-secondary);">登録がありません</span>'}</div>
      </div>
    `;

    // ノート/タグ表示
    studentNote.value = notes[id] || '';
    studentTags.value = (tags[id] || []).join(', ');

    // 進捗チャート（コースごと積み上げ）
    const labels = regs.map(e=>{
      const c = courses.find(cc=>cc.id===e.courseId);
      return c?.title || 'コース';
    });
    const totalArr = regs.map(e => (contents[e.courseId]||[]).length);
    const doneArr = regs.map(e => (e.progress||[]).filter(p=>p.completed).length);

    const ctx = progressCanvas.getContext('2d');
    if (progressChartInstance) progressChartInstance.destroy();
    progressChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label:'完了', data: doneArr, backgroundColor: 'rgba(111, 207, 151, 0.6)' },
          { label:'残り', data: totalArr.map((t,i)=> Math.max(t - doneArr[i], 0)), backgroundColor: 'rgba(0,0,0,0.08)' },
        ]
      },
      options: {
        responsive:true,
        maintainAspectRatio:false,
        plugins:{ legend:{ position:'top' } },
        scales:{ x:{ stacked:true }, y:{ beginAtZero:true, stacked:true } }
      }
    });
  }

  // 受講生 追加/編集/削除
  let editingStudentId = null;

  function openStudentModal(id){
    editingStudentId = id || null;
    studentModalTitle.textContent = id ? '受講生を編集' : '受講生を追加';
    populateStudentModalCourses();

    if (id){
      const st = students.find(s=>s.id===id);
      const rep = enrollments.find(e=>e.studentId===id) || {};
      stName.value = st?.name || '';
      stEmail.value = st?.email || '';
      stCourse.value = rep?.courseId || (courses[0]?.id || '');
      stStatus.value = rep?.status || 'active';
      stMemo.value = notes[id] || '';
    } else {
      stName.value = '';
      stEmail.value = '';
      stCourse.value = courses[0]?.id || '';
      stStatus.value = 'active';
      stMemo.value = '';
    }
    studentModal.style.display = 'flex';
  }
  function closeStudent(){ studentModal.style.display = 'none'; }
  function openMessage(){ 
    if (!selectedStudentId) return toast('受講生を選択してください', true);
    const st = students.find(s=>s.id===selectedStudentId);
    msgTo.value = `${st?.name || ''} <${st?.email || ''}>`;
    msgSubject.value = '';
    msgBody.value = '';
    messageModal.style.display = 'flex';
  }
  function closeMessage(){ messageModal.style.display = 'none'; }

  if (closeStudentModal) closeStudentModal.addEventListener('click', closeStudent);
  if (closeMessageModal) closeMessageModal.addEventListener('click', closeMessage);
  if (newStudentBtn) newStudentBtn.addEventListener('click', ()=> openStudentModal(null));

  if (studentForm){
    studentForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const item = {
        name: stName.value.trim(),
        email: stEmail.value.trim(),
        courseId: stCourse.value,
        status: stStatus.value,
        memo: stMemo.value.trim()
      };
      if (!item.name || !item.email) { toast('氏名とメールは必須です', true); return; }

      if (editingStudentId){
        // 更新
        students = students.map(s=> s.id===editingStudentId ? { ...s, name:item.name, email:item.email } : s);
        // 登録（代表1件だけ更新 or 追加）
        let found = enrollments.find(e=> e.studentId===editingStudentId && e.courseId===item.courseId);
        if (found) {
          found.status = item.status;
        } else {
          enrollments.push({ id: uid('enr'), studentId: editingStudentId, courseId:item.courseId, status:item.status, progress:[] });
        }
        if (item.memo) notes[editingStudentId] = item.memo; else delete notes[editingStudentId];
        toast('受講生を更新しました');
      } else {
        // 追加
        const id = uid('stu');
        students.push({ id, name:item.name, email:item.email, createdAt:new Date().toISOString() });
        enrollments.push({ id: uid('enr'), studentId:id, courseId:item.courseId, status:item.status, progress:[] });
        if (item.memo) notes[id] = item.memo;
        toast('受講生を追加しました');
      }

      saveJSON(KEYS.students, students);
      saveJSON(KEYS.enrollments, enrollments);
      saveJSON(KEYS.notes, notes);

      editingStudentId = null;
      closeStudent();
      renderStudentList();
    });
  }

  function deleteStudent(id){
    if (!confirm('この受講生を削除しますか？（登録・メモ・タグも削除）')) return;
    students = students.filter(s=>s.id!==id);
    enrollments = enrollments.filter(e=>e.studentId!==id);
    delete notes[id];
    delete tags[id];
    if (selectedStudentId===id){ selectedStudentId=null; studentSummary.innerHTML=''; studentNote.value=''; studentTags.value=''; }
    saveJSON(KEYS.students, students);
    saveJSON(KEYS.enrollments, enrollments);
    saveJSON(KEYS.notes, notes);
    saveJSON(KEYS.tags, tags);
    renderStudentList();
    toast('受講生を削除しました');
  }

  // ノート/タグ保存
  if (saveNoteBtn){
    saveNoteBtn.addEventListener('click', ()=>{
      if (!selectedStudentId) return toast('受講生を選択してください', true);
      notes[selectedStudentId] = studentNote.value;
      tags[selectedStudentId] = (studentTags.value || '')
        .split(',')
        .map(s=>s.trim())
        .filter(Boolean);
      saveJSON(KEYS.notes, notes);
      saveJSON(KEYS.tags, tags);
      toast('ノートとタグを保存しました');
    });
  }

  // メッセージ（モック送信）
  if (sendMessageBtn) sendMessageBtn.addEventListener('click', openMessage);
  if (messageForm){
    messageForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      // 実装時はAPI送信
      toast('メッセージを送信しました（モック）');
      closeMessage();
    });
  }

  // 受講状態の切替（代表登録に対して）
  if (toggleStatusBtn){
    toggleStatusBtn.addEventListener('click', ()=>{
      if (!selectedStudentId) return toast('受講生を選択してください', true);
      const regs = enrollments.filter(e=>e.studentId===selectedStudentId);
      if (regs.length===0) return toast('登録がありません', true);
      const order = ['active','paused','completed'];
      regs.forEach(r=>{
        const idx = order.indexOf(r.status);
        r.status = order[(idx+1)%order.length];
      });
      saveJSON(KEYS.enrollments, enrollments);
      selectStudent(selectedStudentId);
      renderStudentList();
      toast('受講状態を切り替えました');
    });
  }

  // イベント
  searchEl?.addEventListener('input', renderStudentList);
  courseFilter?.addEventListener('change', renderStudentList);
  statusFilter?.addEventListener('change', renderStudentList);

  // 初期化
  populateCourseFilterOptions();
  renderStudentList();
}
/* =========================
   U-007: テスト・課題管理
   ========================= */
function initTestManagement() {
  // 要素取得
  const listEl = document.getElementById('testList');
  if (!listEl) return; // このページ以外では何もしない

  // 二重初期化ガード（任意）
  if (window.__initTestManagement) return;
  window.__initTestManagement = true;

  const searchEl = document.getElementById('testSearch');
  const courseFilter = document.getElementById('courseFilterTest');
  const statusFilter = document.getElementById('statusFilterTest');
  const selectAllToggle = document.getElementById('selectAllToggle');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

  const newTestBtn = document.getElementById('newTestBtn');
  const newAssignmentBtn = document.getElementById('newAssignmentBtn');

  const modal = document.getElementById('testModal');
  const closeModalBtn = document.getElementById('closeModal');
  const form = document.getElementById('testForm');
  const deleteBtn = document.getElementById('deleteBtn');
  const modalTitle = document.getElementById('modalTitle');

  // フォーム要素
  const testId = document.getElementById('testId');
  const titleInput = document.getElementById('titleInput');
  const typeInput = document.getElementById('typeInput');
  const courseInput = document.getElementById('courseInput');
  const questionsInput = document.getElementById('questionsInput');
  const passingInput = document.getElementById('passingInput');
  const statusInput = document.getElementById('statusInput');
  const descInput = document.getElementById('descInput');

  // モックデータ
  const courses = [
    { id: 'c1', title: 'マーケティング基礎' },
    { id: 'c2', title: 'SNSコンテンツ作成術' },
    { id: 'c3', title: '売上アップ実践' },
  ];

  let items = [
    {
      id: 't1',
      title: '第1回 小テスト',
      type: 'test', // test | assignment
      courseId: 'c1',
      courseTitle: 'マーケティング基礎',
      questions: 10,
      passing: 70,
      status: 'published', // draft | published | closed
      submissions: 42,
      passRate: 76,
      desc: '各章の理解確認',
    },
    {
      id: 't2',
      title: 'LP改善の提案レポート',
      type: 'assignment',
      courseId: 'c2',
      courseTitle: 'SNSコンテンツ作成術',
      questions: 0,
      passing: 0,
      status: 'draft',
      submissions: 0,
      passRate: 0,
      desc: '実案件を想定した改善提案',
    },
    {
      id: 't3',
      title: '第2回 小テスト',
      type: 'test',
      courseId: 'c3',
      courseTitle: '売上アップ実践',
      questions: 12,
      passing: 80,
      status: 'published',
      submissions: 37,
      passRate: 68,
      desc: 'CVR改善に関する知識確認',
    },
    {
      id: 't4',
      title: '動画スクリプト提出',
      type: 'assignment',
      courseId: 'c2',
      courseTitle: 'SNSコンテンツ作成術',
      questions: 0,
      passing: 0,
      status: 'closed',
      submissions: 55,
      passRate: 0,
      desc: '60秒のショート動画台本を作成',
    },
  ];

  // コース選択肢
  function populateCourseOptions() {
    courseInput.innerHTML = '';
    courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.title;
      courseInput.appendChild(opt);
    });

    // フィルター側にも
    const filterInit = courseFilter.querySelectorAll('option').length <= 1;
    if (filterInit) {
      courses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.title;
        courseFilter.appendChild(opt);
      });
    }
  }

  // レンダリング
  function createRow(item) {
    const tr = document.createElement('tr');
    tr.style.background = 'var(--surface)';
    tr.style.boxShadow = 'var(--shadow)';
    tr.style.borderRadius = '12px';

    const badge = (text, colorVar) => {
      const span = document.createElement('span');
      span.textContent = text;
      span.style.fontSize = '12px';
      span.style.fontWeight = '600';
      span.style.padding = '4px 8px';
      span.style.borderRadius = '999px';
      span.style.background = `rgba(${colorVar === 'primary' ? '123,104,238' :
                                      colorVar === 'success' ? '111,207,151' :
                                      colorVar === 'error' ? '255,126,126' :
                                      colorVar === 'warning' ? '255,207,92' :
                                      '90,200,250'},0.15)`;
      span.style.color = `var(--${colorVar})`;
      return span;
    };

    // チェック
    const tdCheck = document.createElement('td');
    tdCheck.style.padding = '8px 12px';
    const ck = document.createElement('input');
    ck.type = 'checkbox';
    ck.className = 'row-check';
    ck.dataset.id = item.id;
    tdCheck.appendChild(ck);

    // タイトル
    const tdTitle = document.createElement('td');
    tdTitle.style.padding = '14px 12px';
    const t = document.createElement('div');
    t.style.fontWeight = '600';
    t.textContent = item.title;
    const d = document.createElement('div');
    d.className = 'chart-label';
    d.textContent = item.desc || '';
    tdTitle.appendChild(t);
    tdTitle.appendChild(d);

    // タイプ
    const tdType = document.createElement('td');
    tdType.style.padding = '8px 12px';
    tdType.appendChild(
      badge(item.type === 'test' ? 'テスト' : '課題', item.type === 'test' ? 'info' : 'secondary')
    );

    // コース
    const tdCourse = document.createElement('td');
    tdCourse.style.padding = '8px 12px';
    tdCourse.textContent = item.courseTitle;

    // 問題数/配点
    const tdQP = document.createElement('td');
    tdQP.style.padding = '8px 12px';
    tdQP.textContent = item.type === 'test' ? `${item.questions}問 / 合格${item.passing}` : '-';

    // 状態
    const tdStatus = document.createElement('td');
    tdStatus.style.padding = '8px 12px';
    const statusMap = {
      draft: { label: '下書き', color: 'warning' },
      published: { label: '公開中', color: 'success' },
      closed: { label: '受付終了', color: 'error' },
    };
    tdStatus.appendChild(badge(statusMap[item.status].label, statusMap[item.status].color));

    // 提出/合格率
    const tdStats = document.createElement('td');
    tdStats.style.padding = '8px 12px';
    tdStats.textContent = item.type === 'test'
      ? `提出${item.submissions} / 合格率${item.passRate}%`
      : `提出${item.submissions}`;

    // 操作
    const tdOps = document.createElement('td');
    tdOps.style.padding = '8px 12px';
    tdOps.style.textAlign = 'right';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-secondary';
    editBtn.style.padding = '8px 12px';
    editBtn.textContent = '編集';
    editBtn.addEventListener('click', () => openModal(item.id));
    tdOps.appendChild(editBtn);

    tr.appendChild(tdCheck);
    tr.appendChild(tdTitle);
    tr.appendChild(tdType);
    tr.appendChild(tdCourse);
    tr.appendChild(tdQP);
    tr.appendChild(tdStatus);
    tr.appendChild(tdStats);
    tr.appendChild(tdOps);
    return tr;
  }

  function renderList() {
    const q = (searchEl?.value || '').toLowerCase();
    const c = courseFilter?.value || '';
    const s = statusFilter?.value || '';

    const filtered = items.filter(it => {
      const okQ = !q || it.title.toLowerCase().includes(q) || (it.desc || '').toLowerCase().includes(q);
      const okC = !c || it.courseId === c;
      const okS = !s || it.status === s;
      return okQ && okC && okS;
    });

    listEl.innerHTML = '';
    filtered.forEach(it => listEl.appendChild(createRow(it)));
  }

  // Modal
  function openModal(id, forceType) {
    const edit = !!id;
    modal.style.display = 'flex';
    deleteBtn.style.display = edit ? 'inline-flex' : 'none';
    modalTitle.textContent = edit ? 'テストを編集' : (forceType === 'assignment' ? '課題作成' : 'テスト作成');

    if (edit) {
      const it = items.find(x => x.id === id);
      testId.value = it.id;
      titleInput.value = it.title;
      typeInput.value = it.type;
      courseInput.value = it.courseId;
      questionsInput.value = it.questions || 0;
      passingInput.value = it.passing || 0;
      statusInput.value = it.status;
      descInput.value = it.desc || '';
    } else {
      testId.value = '';
      titleInput.value = '';
      typeInput.value = forceType || 'test';
      courseInput.value = courses[0]?.id || '';
      questionsInput.value = typeInput.value === 'test' ? 10 : 0;
      passingInput.value = typeInput.value === 'test' ? 70 : 0;
      statusInput.value = 'draft';
      descInput.value = '';
    }
  }
  function closeModal() { modal.style.display = 'none'; }
  closeModalBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // 保存/削除
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = testId.value.trim();
    const payload = {
      id: id || `t${Date.now()}`,
      title: titleInput.value.trim() || '無題',
      type: typeInput.value,
      courseId: courseInput.value,
      courseTitle: courses.find(c => c.id === courseInput.value)?.title || '',
      questions: Number(questionsInput.value || 0),
      passing: Number(passingInput.value || 0),
      status: statusInput.value,
      submissions: id ? (items.find(x => x.id === id)?.submissions || 0) : 0,
      passRate: id ? (items.find(x => x.id === id)?.passRate || 0) : 0,
      desc: descInput.value.trim(),
    };

    if (id) {
      items = items.map(x => x.id === id ? payload : x);
    } else {
      items.unshift(payload);
    }
    closeModal();
    renderList();
  });

  deleteBtn.addEventListener('click', () => {
    const id = testId.value.trim();
    if (!id) return;
    items = items.filter(x => x.id !== id);
    closeModal();
    renderList();
  });

  // 一括操作
  selectAllToggle?.addEventListener('click', () => {
    const checks = document.querySelectorAll('.row-check');
    const anyUnchecked = Array.from(checks).some(c => !c.checked);
    checks.forEach(c => c.checked = anyUnchecked);
  });

  bulkDeleteBtn?.addEventListener('click', () => {
    const checks = Array.from(document.querySelectorAll('.row-check'));
    const ids = checks.filter(c => c.checked).map(c => c.dataset.id);
    if (!ids.length) return;
    items = items.filter(x => !ids.includes(x.id));
    renderList();
  });

  // 新規作成ボタン
  newTestBtn?.addEventListener('click', () => openModal(null, 'test'));
  newAssignmentBtn?.addEventListener('click', () => openModal(null, 'assignment'));

  // フィルター/検索
  searchEl?.addEventListener('input', renderList);
  courseFilter?.addEventListener('change', renderList);
  statusFilter?.addEventListener('change', renderList);

  // 初期化
  populateCourseOptions();
  renderList();
}

// DOM準備後に起動（既存のinit群の後でOK）
document.addEventListener('DOMContentLoaded', initTestManagement);
/* =========================
   U-008: 売上・支払い管理
   ========================= */
function initRevenueManagement() {
  const listEl = document.getElementById('txList');
  if (!listEl) return; // このページ以外では何もしない
  if (window.__initRevenueManagement) return;
  window.__initRevenueManagement = true;

  // UI要素
  const txSearch = document.getElementById('txSearch');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  const statusFilterTx = document.getElementById('statusFilterTx');
  const methodFilterTx = document.getElementById('methodFilterTx');
  const selectAllTxToggle = document.getElementById('selectAllTxToggle');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const markPaidBtn = document.getElementById('markPaidBtn');
  const requestPayoutBtn = document.getElementById('requestPayoutBtn');

  const payoutModal = document.getElementById('payoutModal');
  const closePayoutModal = document.getElementById('closePayoutModal');
  const submitPayout = document.getElementById('submitPayout');
  const payoutAmount = document.getElementById('payoutAmount');
  const payoutDest = document.getElementById('payoutDest');

  const invoiceModal = document.getElementById('invoiceModal');
  const closeInvoiceModal = document.getElementById('closeInvoiceModal');
  const invoiceBody = document.getElementById('invoiceBody');
  const downloadInvoiceBtn = document.getElementById('downloadInvoiceBtn');

  // Summary
  const revMonthly = document.getElementById('revMonthly');
  const revMonthlyChange = document.getElementById('revMonthlyChange');
  const revTotal = document.getElementById('revTotal');
  const revAvailable = document.getElementById('revAvailable');
  const revRefunds = document.getElementById('revRefunds');
  const revRefundsChange = document.getElementById('revRefundsChange');

  // モック取引データ
  let txs = [
    { id:'TX-1008', date:'2025-11-03T10:12:00', product:'SNSコンテンツ作成術', student:'田中美智子', amount:19800, method:'card', status:'paid' },
    { id:'TX-1007', date:'2025-11-02T20:30:00', product:'セミナー「効果的なSNS運用法」', student:'木村優斗', amount:5500, method:'bank', status:'pending' },
    { id:'TX-1006', date:'2025-11-02T09:10:00', product:'売上アップ実践コース', student:'中村春香', amount:49800, method:'card', status:'paid' },
    { id:'TX-1005', date:'2025-11-01T21:00:00', product:'マーケ基礎コース', student:'鈴木健太', amount:29800, method:'token', status:'paid' },
    { id:'TX-1004', date:'2025-11-01T18:45:00', product:'セミナー録画パック', student:'佐藤涼太', amount:3300, method:'card', status:'refunded' },
    { id:'TX-1003', date:'2025-10-30T12:21:00', product:'マーケ基礎コース', student:'田村愛', amount:29800, method:'card', status:'paid' },
    { id:'TX-1002', date:'2025-10-29T08:02:00', product:'LP改善ワーク', student:'高橋京子', amount:9800, method:'bank', status:'failed' },
    { id:'TX-1001', date:'2025-10-28T14:15:00', product:'ショート動画台本テンプレ', student:'佐々木蓮', amount:2200, method:'card', status:'paid' },
  ];

  // フォーマット補助
  const yen = n => '¥' + (n||0).toLocaleString();
  const dt = s => {
    const d = new Date(s);
    const m = (d.getMonth()+1).toString().padStart(2,'0');
    const day = d.getDate().toString().padStart(2,'0');
    const hh = d.getHours().toString().padStart(2,'0');
    const mm = d.getMinutes().toString().padStart(2,'0');
    return `${d.getFullYear()}/${m}/${day} ${hh}:${mm}`;
  };

  // バッジ生成
  function badge(text, colorVar) {
    const span = document.createElement('span');
    span.textContent = text;
    span.style.fontSize = '12px';
    span.style.fontWeight = '600';
    span.style.padding = '4px 8px';
    span.style.borderRadius = '999px';
    span.style.background = `rgba(${colorVar === 'primary' ? '123,104,238' :
                                  colorVar === 'success' ? '111,207,151' :
                                  colorVar === 'error' ? '255,126,126' :
                                  colorVar === 'warning' ? '255,207,92' :
                                  '90,200,250'},0.15)`;
    span.style.color = `var(--${colorVar})`;
    return span;
  }

  // 行生成
  function createRow(t) {
    const tr = document.createElement('tr');
    tr.style.background = 'var(--surface)';
    tr.style.boxShadow = 'var(--shadow)';
    tr.style.borderRadius = '12px';

    // チェック
    const tdCheck = document.createElement('td');
    tdCheck.style.padding = '8px 12px';
    const ck = document.createElement('input');
    ck.type = 'checkbox';
    ck.className = 'tx-check';
    ck.dataset.id = t.id;
    tdCheck.appendChild(ck);

    // 日時
    const tdDate = document.createElement('td');
    tdDate.style.padding = '14px 12px';
    tdDate.textContent = dt(t.date);

    // 商品
    const tdProd = document.createElement('td');
    tdProd.style.padding = '14px 12px';
    const title = document.createElement('div');
    title.style.fontWeight = '600';
    title.textContent = t.product;
    const sub = document.createElement('div');
    sub.className = 'chart-label';
    sub.textContent = `TX: ${t.id}`;
    tdProd.appendChild(title); tdProd.appendChild(sub);

    // 受講生
    const tdStu = document.createElement('td');
    tdStu.style.padding = '14px 12px';
    tdStu.textContent = t.student;

    // 金額
    const tdAmt = document.createElement('td');
    tdAmt.style.padding = '14px 12px';
    tdAmt.textContent = yen(t.amount);

    // 決済
    const tdMethod = document.createElement('td');
    tdMethod.style.padding = '14px 12px';
    const methodLabel = { card:'カード', bank:'銀行振込', token:'トークン' }[t.method] || t.method;
    tdMethod.appendChild(badge(methodLabel, 'primary'));

    // 状態
    const tdStatus = document.createElement('td');
    tdStatus.style.padding = '14px 12px';
    const sMap = {
      paid: {label:'支払い済み', color:'success'},
      pending: {label:'保留', color:'warning'},
      refunded: {label:'返金', color:'error'},
      failed: {label:'失敗', color:'error'}
    };
    tdStatus.appendChild(badge(sMap[t.status].label, sMap[t.status].color));

    // 操作
    const tdOps = document.createElement('td');
    tdOps.style.padding = '8px 12px';
    tdOps.style.textAlign = 'right';

    const invoiceBtn = document.createElement('button');
    invoiceBtn.className = 'btn-secondary';
    invoiceBtn.style.padding = '8px 12px';
    invoiceBtn.textContent = '請求書';
    invoiceBtn.addEventListener('click', ()=> openInvoice(t));

    const refundBtn = document.createElement('button');
    refundBtn.className = 'btn-secondary';
    refundBtn.style.padding = '8px 12px';
    refundBtn.style.marginLeft = '8px';
    refundBtn.textContent = '返金（モック）';
    refundBtn.addEventListener('click', ()=> refundTx(t.id));

    tdOps.appendChild(invoiceBtn);
    tdOps.appendChild(refundBtn);

    tr.appendChild(tdCheck);
    tr.appendChild(tdDate);
    tr.appendChild(tdProd);
    tr.appendChild(tdStu);
    tr.appendChild(tdAmt);
    tr.appendChild(tdMethod);
    tr.appendChild(tdStatus);
    tr.appendChild(tdOps);
    return tr;
  }

  // レンダリング
  function renderList() {
    const q = (txSearch?.value || '').toLowerCase();
    const df = dateFrom?.value ? new Date(dateFrom.value) : null;
    const dtv = dateTo?.value ? new Date(dateTo.value) : null;
    const st = statusFilterTx?.value || '';
    const md = methodFilterTx?.value || '';

    const filtered = txs.filter(t => {
      const okQ = !q || [t.product, t.student, t.id].join(' ').toLowerCase().includes(q);
      const d = new Date(t.date);
      const okDF = !df || d >= df;
      const okDT = !dtv || d <= new Date(dtv.getTime() + 24*60*60*1000 -1);
      const okS = !st || t.status === st;
      const okM = !md || t.method === md;
      return okQ && okDF && okDT && okS && okM;
    });

    listEl.innerHTML = '';
    filtered
      .sort((a,b)=> new Date(b.date) - new Date(a.date))
      .forEach(t => listEl.appendChild(createRow(t)));

    updateSummary(filtered);
  }

  // サマリー更新
  function updateSummary(rows) {
    // 今月のみ
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const thisMonthRows = rows.filter(t => t.date.startsWith(ym) && t.status === 'paid');
    const thisMonthSum = thisMonthRows.reduce((s,t)=> s + (t.amount||0), 0);

    const totalPaid = txs.filter(t => t.status === 'paid')
                         .reduce((s,t)=> s + (t.amount||0), 0);

    const available = Math.max(0, totalPaid - 15000); // モック: 例として手数料/未清算分差引の計算
    const refundsMonth = rows.filter(t => t.date.startsWith(ym) && t.status === 'refunded')
                             .reduce((s,t)=> s + (t.amount||0), 0);
    const refundsCountMonth = rows.filter(t => t.date.startsWith(ym) && t.status === 'refunded').length;

    revMonthly.textContent = yen(thisMonthSum);
    revTotal.textContent = yen(totalPaid);
    revAvailable.textContent = yen(available);
    revRefunds.textContent = yen(refundsMonth);
    revRefundsChange.innerHTML = `<i class="material-icons-round" style="font-size:16px;margin-right:4px;">arrow_upward</i>+${refundsCountMonth}件`;

    // 簡易に：前月比はダミー表示
    revMonthlyChange.innerHTML = `<i class="material-icons-round" style="font-size:16px;margin-right:4px;">arrow_upward</i>+12% 前月比`;
  }

  // 操作系
  selectAllTxToggle?.addEventListener('click', () => {
    const checks = document.querySelectorAll('.tx-check');
    const anyUnchecked = Array.from(checks).some(c => !c.checked);
    checks.forEach(c => c.checked = anyUnchecked);
  });

  exportCsvBtn?.addEventListener('click', () => {
    // モックCSV
    const header = ['id','date','product','student','amount','method','status'];
    const lines = [header.join(',')].concat(
      txs.map(t => [t.id, t.date, `"${t.product}"`, `"${t.student}"`, t.amount, t.method, t.status].join(','))
    );
    const blob = new Blob([lines.join('\n')], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  markPaidBtn?.addEventListener('click', () => {
    const ids = Array.from(document.querySelectorAll('.tx-check'))
      .filter(c => c.checked)
      .map(c => c.dataset.id);
    if (!ids.length) return;
    txs = txs.map(t => ids.includes(t.id) ? {...t, status:'paid'} : t);
    renderList();
  });

  requestPayoutBtn?.addEventListener('click', () => {
    payoutAmount.value = '';
    payoutDest.value = 'bank';
    payoutModal.style.display = 'flex';
  });
  closePayoutModal?.addEventListener('click', ()=> payoutModal.style.display = 'none');
  payoutModal?.addEventListener('click', (e)=>{ if (e.target === payoutModal) payoutModal.style.display = 'none'; });
  submitPayout?.addEventListener('click', () => {
    const amt = Number(payoutAmount.value || 0);
    if (!amt) return;
    // モック：出金処理
    payoutModal.style.display = 'none';
    // 残高を視覚的に減らすため、paidから差し引いた計算風に再描画
    renderList();
  });

  function openInvoice(t) {
    invoiceBody.innerHTML = '';
    const rows = [
      ['取引ID', t.id],
      ['日時', dt(t.date)],
      ['商品/コース', t.product],
      ['受講生', t.student],
      ['金額', yen(t.amount)],
      ['決済', {card:'カード', bank:'銀行振込', token:'トークン'}[t.method] || t.method],
      ['状態', {paid:'支払い済み',pending:'保留',refunded:'返金',failed:'失敗'}[t.status] || t.status],
      ['備考', '本書はモックの請求書です。']
    ];
    rows.forEach(([k,v]) => {
      const line = document.createElement('div');
      line.style.display = 'flex';
      line.style.justifyContent = 'space-between';
      line.style.gap = '16px';
      const lk = document.createElement('div'); lk.style.fontWeight='600'; lk.textContent = k;
      const lv = document.createElement('div'); lv.textContent = v;
      line.appendChild(lk); line.appendChild(lv);
      invoiceBody.appendChild(line);
    });
    invoiceModal.style.display = 'flex';
  }
  closeInvoiceModal?.addEventListener('click', ()=> invoiceModal.style.display='none');
  invoiceModal?.addEventListener('click', (e)=>{ if (e.target === invoiceModal) invoiceModal.style.display='none'; });
  downloadInvoiceBtn?.addEventListener('click', () => {
    // ダミーDL
    const blob = new Blob(['INVOICE (mock)\n\n— この請求書はモックです —'], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'invoice.txt'; a.click();
    URL.revokeObjectURL(url);
  });

  // フィルター/検索
  txSearch?.addEventListener('input', renderList);
  dateFrom?.addEventListener('change', renderList);
  dateTo?.addEventListener('change', renderList);
  statusFilterTx?.addEventListener('change', renderList);
  methodFilterTx?.addEventListener('change', renderList);

  // 初期表示
  renderList();
}

// DOM準備
document.addEventListener('DOMContentLoaded', initRevenueManagement);
/* =========================
   U-009: 設定
   ========================= */
function initSettingsPage() {
  const tabBtns = document.querySelectorAll('.settings-tab-btn');
  if (!tabBtns.length) return; // このページ以外は何もしない
  if (window.__initSettingsPage) return;
  window.__initSettingsPage = true;

  // タブ切替
  const tabs = {
    profile: document.getElementById('tab-profile'),
    social: document.getElementById('tab-social'),
    notifications: document.getElementById('tab-notifications'),
    billing: document.getElementById('tab-billing'),
    security: document.getElementById('tab-security'),
    api: document.getElementById('tab-api'),
  };
  function showTab(name) {
    Object.keys(tabs).forEach(k => tabs[k].style.display = (k === name ? 'block' : 'none'));
    // クリック感
    document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.settings-tab-btn[data-tab="${name}"]`)?.classList.add('active');
    localStorage.setItem('settings.activeTab', name);
  }
  tabBtns.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
  showTab(localStorage.getItem('settings.activeTab') || 'profile');

  // プロフィール -----------------------------
  const avatarInput = document.getElementById('avatarInput');
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarFallback = document.getElementById('avatarFallback');
  const settingsAvatarTop = document.getElementById('settingsAvatarTop');

  const profName = document.getElementById('profName');
  const profTitle = document.getElementById('profTitle');
  const profBio = document.getElementById('profBio');
  const profEmail = document.getElementById('profEmail');
  const profSite = document.getElementById('profSite');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  // 既存ロード
  const prof = JSON.parse(localStorage.getItem('settings.profile') || '{}');
  if (prof.name) profName.value = prof.name;
  if (prof.title) profTitle.value = prof.title;
  if (prof.bio) profBio.value = prof.bio;
  if (prof.email) profEmail.value = prof.email;
  if (prof.site) profSite.value = prof.site;
  if (prof.avatar) {
    avatarPreview.src = prof.avatar; avatarPreview.style.display = 'block';
    avatarFallback.style.display = 'none';
    settingsAvatarTop.style.backgroundImage = `url(${prof.avatar})`;
    settingsAvatarTop.style.backgroundSize = 'cover';
    settingsAvatarTop.textContent = '';
  }

  avatarInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      avatarPreview.src = url; avatarPreview.style.display = 'block';
      avatarFallback.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });

  saveProfileBtn?.addEventListener('click', () => {
    const data = {
      name: profName.value.trim(),
      title: profTitle.value.trim(),
      bio: profBio.value.trim(),
      email: profEmail.value.trim(),
      site: profSite.value.trim(),
      avatar: avatarPreview.style.display === 'block' ? avatarPreview.src : null,
    };
    localStorage.setItem('settings.profile', JSON.stringify(data));
    // ヘッダー反映（トップのアバター）
    if (data.avatar) {
      settingsAvatarTop.style.backgroundImage = `url(${data.avatar})`;
      settingsAvatarTop.style.backgroundSize = 'cover';
      settingsAvatarTop.textContent = '';
    } else {
      settingsAvatarTop.style.backgroundImage = '';
      settingsAvatarTop.textContent = (data.name || 'TS').trim().slice(0,2).toUpperCase();
    }
    alert('プロフィールを保存しました（モック）');
  });

  // SNS連携（モック） ------------------------
  const socialState = JSON.parse(localStorage.getItem('settings.social') || '{"inst":false,"yt":false,"x":false}');
  const statusInst = document.getElementById('social-status-inst');
  const statusYt = document.getElementById('social-status-yt');
  const statusX = document.getElementById('social-status-x');
  const btnInst = document.getElementById('btnConnectInst');
  const btnYt = document.getElementById('btnConnectYt');
  const btnX = document.getElementById('btnConnectX');

  function renderSocial() {
    statusInst.textContent = socialState.inst ? '接続済み' : '未接続';
    statusYt.textContent = socialState.yt ? '接続済み' : '未接続';
    statusX.textContent = socialState.x ? '接続済み' : '未接続';
  }
  renderSocial();

  btnInst?.addEventListener('click', () => {
    socialState.inst = !socialState.inst;
    localStorage.setItem('settings.social', JSON.stringify(socialState));
    renderSocial();
  });
  btnYt?.addEventListener('click', () => {
    socialState.yt = !socialState.yt;
    localStorage.setItem('settings.social', JSON.stringify(socialState));
    renderSocial();
  });
  btnX?.addEventListener('click', () => {
    socialState.x = !socialState.x;
    localStorage.setItem('settings.social', JSON.stringify(socialState));
    renderSocial();
  });

  // 通知設定 --------------------------------
  const noti = JSON.parse(localStorage.getItem('settings.notifications') || '{"email":true,"push":false,"digest":true}');
  const notiEmail = document.getElementById('notiEmail');
  const notiPush = document.getElementById('notiPush');
  const notiDigest = document.getElementById('notiDigest');
  const saveNotiBtn = document.getElementById('saveNotiBtn');

  notiEmail.checked = !!noti.email;
  notiPush.checked = !!noti.push;
  notiDigest.checked = !!noti.digest;

  saveNotiBtn?.addEventListener('click', () => {
    const data = { email: notiEmail.checked, push: notiPush.checked, digest: notiDigest.checked };
    localStorage.setItem('settings.notifications', JSON.stringify(data));
    alert('通知設定を保存しました（モック）');
  });

  // 請求・出金 --------------------------------
  const billing = JSON.parse(localStorage.getItem('settings.billing') || '{}');
  const billName = document.getElementById('billName');
  const billAddr = document.getElementById('billAddr');
  const billTax = document.getElementById('billTax');

  const payoutMethod = document.getElementById('payoutMethod');
  const payoutBankBox = document.getElementById('payoutBankBox');
  const payoutTokenBox = document.getElementById('payoutTokenBox');
  const bankName = document.getElementById('bankName');
  const bankBranch = document.getElementById('bankBranch');
  const bankAcc = document.getElementById('bankAcc');
  const bankHolder = document.getElementById('bankHolder');
  const walletAddr = document.getElementById('walletAddr');
  const walletNet = document.getElementById('walletNet');
  const saveBillingBtn = document.getElementById('saveBillingBtn');

  // 既存ロード
  if (billing.billName) billName.value = billing.billName;
  if (billing.billAddr) billAddr.value = billing.billAddr;
  if (billing.billTax) billTax.value = billing.billTax;
  payoutMethod.value = billing.payoutMethod || 'bank';

  function togglePayoutBoxes() {
    const m = payoutMethod.value;
    payoutBankBox.style.display = (m === 'bank') ? 'grid' : 'none';
    payoutTokenBox.style.display = (m === 'token') ? 'grid' : 'none';
  }
  togglePayoutBoxes();

  if (billing.bankName) bankName.value = billing.bankName;
  if (billing.bankBranch) bankBranch.value = billing.bankBranch;
  if (billing.bankAcc) bankAcc.value = billing.bankAcc;
  if (billing.bankHolder) bankHolder.value = billing.bankHolder;
  if (billing.walletAddr) walletAddr.value = billing.walletAddr;
  if (billing.walletNet) walletNet.value = billing.walletNet;

  payoutMethod.addEventListener('change', togglePayoutBoxes);

  saveBillingBtn?.addEventListener('click', () => {
    const data = {
      billName: billName.value.trim(),
      billAddr: billAddr.value.trim(),
      billTax: billTax.value.trim(),
      payoutMethod: payoutMethod.value,
      bankName: bankName.value.trim(),
      bankBranch: bankBranch.value.trim(),
      bankAcc: bankAcc.value.trim(),
      bankHolder: bankHolder.value.trim(),
      walletAddr: walletAddr.value.trim(),
      walletNet: walletNet.value,
    };
    localStorage.setItem('settings.billing', JSON.stringify(data));
    alert('請求・出金設定を保存しました（モック）');
  });

  // セキュリティ -------------------------------
  const twoFA = document.getElementById('twoFA');
  const sec = JSON.parse(localStorage.getItem('settings.security') || '{"twoFA":false}');
  twoFA.checked = !!sec.twoFA;

  twoFA.addEventListener('change', () => {
    const data = { twoFA: twoFA.checked };
    localStorage.setItem('settings.security', JSON.stringify(data));
  });

  const btnChangePw = document.getElementById('btnChangePw');
  const pwCurrent = document.getElementById('pwCurrent');
  const pwNew = document.getElementById('pwNew');
  const pwNew2 = document.getElementById('pwNew2');

  btnChangePw?.addEventListener('click', () => {
    if (!pwCurrent.value || !pwNew.value || !pwNew2.value) {
      alert('全て入力してください'); return;
    }
    if (pwNew.value !== pwNew2.value) {
      alert('新しいパスワードが一致しません'); return;
    }
    // モック成功
    pwCurrent.value = ''; pwNew.value = ''; pwNew2.value = '';
    alert('パスワードを変更しました（モック）');
  });

  // APIキー -----------------------------------
  const apiState = JSON.parse(localStorage.getItem('settings.api') || '{}');
  const apiKeyDisplay = document.getElementById('apiKeyDisplay');
  const btnRevealKey = document.getElementById('btnRevealKey');
  const btnGenKey = document.getElementById('btnGenKey');

  function maskKey(k) {
    if (!k) return '—';
    if (k.length <= 8) return '********';
    return k.slice(0,4) + '********' + k.slice(-4);
    }
  function renderApiKey(masked=true) {
    const key = apiState.key || '';
    apiKeyDisplay.textContent = masked ? maskKey(key) : key || '—';
  }
  if (!apiState.key) {
    apiState.key = 'cs_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    localStorage.setItem('settings.api', JSON.stringify(apiState));
  }
  let reveal = false;
  renderApiKey(true);

  btnRevealKey?.addEventListener('click', () => {
    reveal = !reveal;
    renderApiKey(!reveal ? true : false);
  });

  btnGenKey?.addEventListener('click', () => {
    if (!confirm('APIキーを再発行しますか？（既存キーは無効になる想定のモック）')) return;
    apiState.key = 'cs_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    localStorage.setItem('settings.api', JSON.stringify(apiState));
    reveal = false;
    renderApiKey(true);
    alert('APIキーを再発行しました（モック）');
  });
}

document.addEventListener('DOMContentLoaded', initSettingsPage);
/* =========================
   S-001: 受講生ダッシュボード
   ========================= */
function initStudentDashboard() {
  // このページでなければ何もしない
  if (!document.getElementById('studentStudyChart')) return;
  if (window.__initStudentDashboard) return;
  window.__initStudentDashboard = true;

  // モックデータのシード（未保存なら投入）
  if (!localStorage.getItem('student.courses')) {
    const seedCourses = [
      { id: 'c1', title: 'SNSコンテンツ作成術', progress: 72, lastPlayedAt: '2025-11-02T13:00:00Z', thumb: '', teacher:'桜井 美帆' },
      { id: 'c2', title: 'マーケティング基礎', progress: 35, lastPlayedAt: '2025-11-01T08:00:00Z', thumb: '', teacher:'田中 メンター' },
      { id: 'c3', title: '引き込み力の文章術', progress: 10, lastPlayedAt: '2025-10-31T09:30:00Z', thumb: '', teacher:'中村 メンター' }
    ];
    localStorage.setItem('student.courses', JSON.stringify(seedCourses));
  }
  if (!localStorage.getItem('student.notifications')) {
    const seedNoti = [
      { id:'n1', type:'task', text:'課題「第2章ミニテスト」期限：11/05', time:'2時間前' },
      { id:'n2', type:'seminar', text:'明日のセミナーが開始30分前にリマインド', time:'昨日' },
      { id:'n3', type:'comment', text:'コースに新しいコメントが届きました', time:'2日前' },
    ];
    localStorage.setItem('student.notifications', JSON.stringify(seedNoti));
  }
  if (!localStorage.getItem('student.tasks')) {
    const seedTasks = [
      { id:'t1', title:'第2章ミニテスト', course:'SNSコンテンツ作成術', due:'2025-11-05', status:'未提出' },
      { id:'t2', title:'ワーク：理想顧客の定義', course:'マーケティング基礎', due:'2025-11-06', status:'未提出' },
      { id:'t3', title:'小テスト：要約スキル', course:'引き込み力の文章術', due:'2025-11-08', status:'未提出' },
    ];
    localStorage.setItem('student.tasks', JSON.stringify(seedTasks));
  }
  if (!localStorage.getItem('student.studyLog')) {
    // 学習時間ログ（直近30日・時間）
    const days = Array.from({length: 30}).map((_,i)=>({
      day: i, // ダミー
      hours: Math.max(0, Math.round((Math.random()*2 + (i>22?1.5:1))*10)/10) // 後半伸び気味
    }));
    localStorage.setItem('student.studyLog', JSON.stringify(days));
  }

  const courses = JSON.parse(localStorage.getItem('student.courses')||'[]');
  const noti = JSON.parse(localStorage.getItem('student.notifications')||'[]');
  const tasks = JSON.parse(localStorage.getItem('student.tasks')||'[]');
  const studyLog = JSON.parse(localStorage.getItem('student.studyLog')||'[]');

  // ヘッダー通知数
  const notiCountEl = document.getElementById('studentNotiCount');
  if (notiCountEl) notiCountEl.textContent = String(noti.length);

  // 簡易アバター（設定にプロフィールがあればイニシャル反映）
  const studentAvatarTop = document.getElementById('studentAvatarTop');
  const prof = JSON.parse(localStorage.getItem('settings.profile') || '{}');
  if (studentAvatarTop && prof.name) {
    studentAvatarTop.textContent = prof.name.trim().slice(0,2).toUpperCase();
  }

  // KPI
  const kpiCourses = document.getElementById('kpiCourses');
  const kpiStudyHrs = document.getElementById('kpiStudyHrs');
  const kpiLatestProgress = document.getElementById('kpiLatestProgress');
  const kpiDueTasks = document.getElementById('kpiDueTasks');

  // 今週学習時間（直近7件合計）
  const recent7 = studyLog.slice(-7).reduce((sum,d)=>sum + (d.hours||0), 0);
  // 先週（その前の7件）
  const prev7 = studyLog.slice(-14,-7).reduce((sum,d)=>sum + (d.hours||0), 0);
  const diffHrs = Math.round((recent7 - prev7)*10)/10;

  if (kpiCourses) kpiCourses.textContent = String(courses.length);
  if (kpiStudyHrs) kpiStudyHrs.textContent = `${Math.round(recent7*10)/10}h`;
  if (kpiLatestProgress) kpiLatestProgress.textContent = (courses[0]?.progress ?? 0) + '%';
  if (kpiDueTasks) kpiDueTasks.textContent = String(tasks.length);

  const kpiStudyHrsChange = document.getElementById('kpiStudyHrsChange');
  if (kpiStudyHrsChange) {
    kpiStudyHrsChange.innerHTML = `<i class="material-icons-round" style="font-size:16px; margin-right:4px;">${diffHrs>=0?'arrow_upward':'arrow_downward'}</i>${diffHrs>=0?'+':''}${diffHrs}h`;
    kpiStudyHrsChange.classList.toggle('positive', diffHrs>=0);
    kpiStudyHrsChange.classList.toggle('negative', diffHrs<0);
  }

  const kpiCoursesChange = document.getElementById('kpiCoursesChange');
  if (kpiCoursesChange) {
    kpiCoursesChange.innerHTML = `<i class="material-icons-round" style="font-size:16px; margin-right:4px;">arrow_upward</i>今月 +${Math.max(0, Math.floor(Math.random()*2))}`;
  }
  const kpiLatestProgressChange = document.getElementById('kpiLatestProgressChange');
  if (kpiLatestProgressChange) {
    const up = Math.max(0, Math.floor(Math.random()*8));
    kpiLatestProgressChange.innerHTML = `<i class="material-icons-round" style="font-size:16px; margin-right:4px;">arrow_upward</i>+${up}%`;
  }

  // 通知リスト
  const notiList = document.getElementById('studentNotiList');
  if (notiList) {
    notiList.innerHTML = '';
    noti.forEach(n => {
      const colorMap = {
        task: {bg:'rgba(255, 207, 92, 0.2)', c:'var(--warning)', icon:'assignment' },
        seminar: {bg:'rgba(111, 207, 151, 0.2)', c:'var(--success)', icon:'event' },
        comment: {bg:'rgba(123, 104, 238, 0.2)', c:'var(--primary)', icon:'comment' },
      };
      const s = colorMap[n.type] || colorMap.comment;
      const item = document.createElement('div');
      item.className = 'notification-item';
      item.innerHTML = `
        <div class="notification-icon" style="background-color:${s.bg}; color:${s.c};">
          <i class="material-icons-round">${s.icon}</i>
        </div>
        <div class="notification-info">
          <div class="notification-title">${n.text}</div>
          <div class="notification-time">${n.time||''}</div>
        </div>
      `;
      notiList.appendChild(item);
    });
  }

  // マイコース
  const grid = document.getElementById('studentCourseGrid');
  if (grid) {
    grid.innerHTML = '';
    courses.forEach(c => {
      const card = document.createElement('div');
      card.className = 'action-btn';
      card.style.alignItems = 'stretch';
      card.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center;">
          <div class="action-icon" style="width:56px; height:56px;">
            <i class="material-icons-round">ondemand_video</i>
          </div>
          <div style="flex:1;">
            <div style="font-weight:600; margin-bottom:4px;">${c.title}</div>
            <div class="chart-label" style="margin-bottom:6px;">講師：${c.teacher||'—'}</div>
            <div style="height:8px; background:#f1f2f6; border-radius:8px; overflow:hidden;">
              <div style="width:${c.progress}%; height:100%; background: var(--gradient1);"></div>
            </div>
            <div class="chart-label" style="margin-top:6px;">進捗 ${c.progress}%</div>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:12px;">
          <a href="course-viewer.html?id=${encodeURIComponent(c.id)}" class="card-action">続きから再生</a>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // 期限間近タスク
  const taskList = document.getElementById('studentTaskList');
  if (taskList) {
    taskList.innerHTML = '';
    tasks.forEach(t => {
      const row = document.createElement('div');
      row.className = 'activity-item';
      row.innerHTML = `
        <div class="activity-avatar" style="background: var(--warning);">T</div>
        <div class="activity-content">
          <div class="activity-text"><b>${t.title}</b> ／ コース：${t.course} ／ 期限：${t.due}</div>
          <div class="activity-time">${t.status}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <a class="card-action" href="test-taking.html?task=${encodeURIComponent(t.id)}">受験/提出へ</a>
        </div>
      `;
      taskList.appendChild(row);
    });
  }

  // 学習時間チャート
  const chartEl = document.getElementById('studentStudyChart');
  const periodSel = document.getElementById('studentChartPeriod');
  const ctx = chartEl.getContext('2d');

  function makeLabels(len) {
    const today = new Date();
    return Array.from({length: len}).map((_,i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (len - 1 - i));
      return `${d.getMonth()+1}/${d.getDate()}`;
    });
  }
  function pickData(len) {
    const arr = studyLog.slice(-len);
    return arr.map(a => a.hours || 0);
  }

  let studentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: makeLabels(7),
      datasets: [{
        label:'学習時間（h）',
        data: pickData(7),
        borderColor: '#7B68EE',
        backgroundColor: 'rgba(123, 104, 238, 0.2)',
        borderWidth: 1.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { usePointStyle:true, padding: 12, font:{ family:'Nunito' } }
        }
      },
      scales: {
        x: { grid: { display:false } },
        y: { beginAtZero:true, grid: { color:'rgba(0,0,0,0.05)' } }
      }
    }
  });

  periodSel?.addEventListener('change', function() {
    const len = Number(this.value) || 7;
    studentChart.data.labels = makeLabels(len);
    studentChart.data.datasets[0].data = pickData(len);
    studentChart.update();
  });
}

document.addEventListener('DOMContentLoaded', initStudentDashboard);
/* =========================
   U-008: 売上・支払い管理（月別グラフ & PDFモック）
   ========================= */
function initRevenueManagement() {
  // このページでなければ何もしない
  if (!document.getElementById('revenueMonthlyChart')) return;
  if (window.__initRevenueManagement) return;
  window.__initRevenueManagement = true;

  // ---------- モックデータ投入 ----------
  // 取引（売上=income / 返金/支出=expense）
  if (!localStorage.getItem('revenue.transactions')) {
    const mockTxns = [
      // 2025年
      { id:'t1',  date:'2025-01-12', type:'income',  label:'コース販売：文章術', amount:18000, method:'card' },
      { id:'t2',  date:'2025-01-20', type:'expense', label:'返金：講座A', amount: -4000, method:'refund' },
      { id:'t3',  date:'2025-02-02', type:'income',  label:'セミナー参加費', amount:12000, method:'bank'  },
      { id:'t4',  date:'2025-02-25', type:'income',  label:'コース販売：SNS運用', amount:22000, method:'card' },
      { id:'t5',  date:'2025-03-05', type:'expense', label:'広告費', amount:-6000, method:'expense' },
      { id:'t6',  date:'2025-03-18', type:'income',  label:'コース販売：マーケ基礎', amount:24000, method:'card' },
      { id:'t7',  date:'2025-04-10', type:'income',  label:'コース販売：動画編集', amount:26000, method:'card' },
      { id:'t8',  date:'2025-04-28', type:'expense', label:'返金：セミナー', amount:-8000, method:'refund' },
      { id:'t9',  date:'2025-05-03', type:'income',  label:'セミナー参加費', amount:14000, method:'card' },
      { id:'t10', date:'2025-05-21', type:'income',  label:'コース販売：ライティング', amount:20000, method:'card' },
      { id:'t11', date:'2025-06-08', type:'income',  label:'コンテンツパック販売', amount:32000, method:'card' },
      { id:'t12', date:'2025-06-16', type:'expense', label:'手数料', amount:-3000, method:'expense' },
      { id:'t13', date:'2025-07-01', type:'income',  label:'セミナー参加費', amount:15000, method:'bank'  },
      { id:'t14', date:'2025-07-13', type:'income',  label:'コース販売：AI応用', amount:28000, method:'card' },
      { id:'t15', date:'2025-08-09', type:'income',  label:'コーチング契約初回', amount:55000, method:'bank'  },
      { id:'t16', date:'2025-08-22', type:'expense', label:'返金：コース', amount:-10000, method:'refund' },
      { id:'t17', date:'2025-09-07', type:'income',  label:'コース販売：戦略設計', amount:36000, method:'card' },
      { id:'t18', date:'2025-10-03', type:'income',  label:'セミナー参加費', amount:16000, method:'card' },
      { id:'t19', date:'2025-10-19', type:'expense', label:'広告費', amount:-7000, method:'expense' },
      { id:'t20', date:'2025-11-01', type:'income',  label:'コース販売：短期集中', amount:30000, method:'card' },
      { id:'t21', date:'2025-11-03', type:'income',  label:'サブスクリプション', amount:9800,  method:'card' },
      // 2024年（比較用）
      { id:'t22', date:'2024-11-12', type:'income',  label:'コース販売', amount:15000, method:'card' },
      { id:'t23', date:'2024-12-05', type:'expense', label:'返金', amount:-5000, method:'refund' },
    ];
    localStorage.setItem('revenue.transactions', JSON.stringify(mockTxns));
  }

  // ---------- 要素参照 ----------
  const yearSelect = document.getElementById('revYearSelect');
  const chartEl    = document.getElementById('revenueMonthlyChart');
  const kpiThisMonth = document.getElementById('revKpiThisMonth');
  const kpiThisMonthDiff = document.getElementById('revKpiThisMonthDiff');
  const kpiTotal = document.getElementById('revKpiTotal');
  const kpiPending = document.getElementById('revKpiPending');
  const kpiRefund = document.getElementById('revKpiRefund');
  const txnList   = document.getElementById('revTxnList');
  const btnReport = document.getElementById('btnDownloadReport');
  const btnCsv    = document.getElementById('revExportCsvBtn');

  const ctx = chartEl.getContext('2d');
  const txns = JSON.parse(localStorage.getItem('revenue.transactions')||'[]');

  // ---------- 集計関数 ----------
  function aggregateByMonth(year) {
    const months = Array.from({length:12}, ()=>({income:0, expense:0}));
    txns.forEach(t => {
      const d = new Date(t.date);
      const y = d.getFullYear();
      if (y !== Number(year)) return;
      const m = d.getMonth(); // 0-11
      if (t.type === 'income') months[m].income += t.amount;
      else months[m].expense += Math.abs(t.amount); // expenseは正で持つ
    });
    return months;
  }

  function formatJPY(num) {
    return '¥' + num.toLocaleString('ja-JP');
  }

  function sumYear(year) {
    let income=0, expense=0, refund=0;
    txns.forEach(t=>{
      const d = new Date(t.date);
      if (d.getFullYear() !== Number(year)) return;
      if (t.type==='income') income += t.amount;
      else {
        expense += Math.abs(t.amount);
        if (t.method === 'refund') refund += Math.abs(t.amount);
      }
    });
    return { income, expense, refund, net: income - expense };
  }

  function monthIncome(year, monthIndex) {
    return txns
      .filter(t=> {
        const d=new Date(t.date);
        return d.getFullYear()===Number(year) && d.getMonth()===monthIndex && t.type==='income';
      })
      .reduce((s,t)=>s+t.amount,0);
  }

  // ---------- チャート描画 ----------
  let revChart;
  function renderChart(year) {
    const agg = aggregateByMonth(year);
    const labels = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const incomeData = agg.map(m=>m.income);
    const expenseData = agg.map(m=>m.expense);

    if (revChart) revChart.destroy();
    revChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label:'売上（収入）',
            data: incomeData,
            backgroundColor: 'rgba(123, 104, 238, 0.25)',
            borderColor: '#7B68EE',
            borderWidth: 1.5
          },
          {
            label:'支出（返金・経費）',
            data: expenseData,
            backgroundColor: 'rgba(90, 200, 250, 0.25)',
            borderColor: '#5AC8FA',
            borderWidth: 1.5
          }
        ]
      },
      options: {
        responsive:true,
        maintainAspectRatio:false,
        plugins: {
          legend: {
            position:'top',
            labels:{ usePointStyle:true, padding:12, font:{ family:'Nunito' } }
          },
          tooltip: { mode:'index', intersect:false }
        },
        scales: {
          x: { grid:{ display:false } },
          y: { beginAtZero:true, grid:{ color:'rgba(0,0,0,0.05)' } }
        }
      }
    });
  }

  // ---------- KPIレンダリング ----------
  function renderKpis(year) {
    const now = new Date();
    const thisMonthIdx = now.getMonth();
    const prevMonthIdx = (thisMonthIdx - 1 + 12) % 12;

    const total = sumYear(year);
    const thisMonthIncome = monthIncome(year, thisMonthIdx);
    const prevMonthIncome = monthIncome(year, prevMonthIdx);

    if (kpiThisMonth) kpiThisMonth.textContent = formatJPY(thisMonthIncome);
    const diffPct = prevMonthIncome>0 ? Math.round(((thisMonthIncome - prevMonthIncome)/prevMonthIncome)*100) : 100;
    if (kpiThisMonthDiff) {
      const up = diffPct >= 0;
      kpiThisMonthDiff.classList.toggle('positive', up);
      kpiThisMonthDiff.classList.toggle('negative', !up);
      kpiThisMonthDiff.innerHTML =
        `<i class="material-icons-round" style="font-size:16px; margin-right:4px;">${up?'arrow_upward':'arrow_downward'}</i>先月比 ${up?'+':''}${diffPct}%`;
    }
    if (kpiTotal)  kpiTotal.textContent = formatJPY(total.income);
    if (kpiRefund) kpiRefund.textContent = formatJPY(total.refund);

    // 保留支払い（モック：今月売上の20%を振込待ちとして表示）
    const pendingMock = Math.round(thisMonthIncome * 0.2);
    if (kpiPending) kpiPending.textContent = formatJPY(pendingMock);
  }

  // ---------- 取引一覧 ----------
  function renderTxnList(year) {
    if (!txnList) return;
    txnList.innerHTML = '';
    const filtered = txns
      .map(t => ({...t, dt: new Date(t.date)}))
      .filter(t => t.dt.getFullYear() === Number(year))
      .sort((a,b)=> b.dt - a.dt);

    filtered.forEach(t => {
      const isIncome = t.type === 'income';
      const avBg = isIncome ? 'var(--success)' : 'var(--error)';
      const sign = isIncome ? '+' : '-';
      const row = document.createElement('div');
      row.className = 'activity-item';
      row.innerHTML = `
        <div class="activity-avatar" style="background:${avBg};">${isIncome?'I':'E'}</div>
        <div class="activity-content">
          <div class="activity-text">
            <b>${t.label}</b>（${t.method}） ／ ${t.date}
          </div>
          <div class="activity-time">${isIncome ? '売上' : '支出・返金'}</div>
        </div>
        <div style="display:flex; align-items:center; font-weight:600;">${sign}${formatJPY(Math.abs(t.amount))}</div>
      `;
      txnList.appendChild(row);
    });
  }

  // ---------- PDF（モック） ----------
  function openReportWindow(year) {
    const agg = aggregateByMonth(year);
    const totals = sumYear(year);
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>入出金レポート（モック）_${year}</title>
<style>
  body{ font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Poppins", "Yu Gothic", "Meiryo", sans-serif; margin:24px; color:#222; }
  h1{ font-size:22px; margin:0 0 8px; }
  h2{ font-size:16px; margin:24px 0 8px; }
  .meta{ color:#666; margin-bottom:16px; }
  table{ width:100%; border-collapse:collapse; font-size:12px; }
  th, td{ border:1px solid #ddd; padding:8px; text-align:right; }
  th:first-child, td:first-child{ text-align:left; }
  tfoot td{ font-weight:700; }
  .stamp{ margin-top:24px; font-size:12px; color:#888; }
  @media print {
    @page { size: A4; margin: 16mm; }
  }
</style>
</head>
<body>
  <h1>入出金レポート（モック）</h1>
  <div class="meta">対象期間：${year}-01-01 〜 ${year}-12-31 ／ 生成日時：${new Date().toLocaleString('ja-JP')}</div>

  <h2>月別サマリー</h2>
  <table>
    <thead>
      <tr><th>月</th><th>売上（収入）</th><th>支出（返金等）</th><th>純額</th></tr>
    </thead>
    <tbody>
      ${agg.map((m,i)=>{
        const net = m.income - m.expense;
        return `<tr>
          <td>${i+1}月</td>
          <td>${(m.income).toLocaleString('ja-JP')}</td>
          <td>${(m.expense).toLocaleString('ja-JP')}</td>
          <td>${(net).toLocaleString('ja-JP')}</td>
        </tr>`;
      }).join('')}
    </tbody>
    <tfoot>
      <tr>
        <td>合計</td>
        <td>${(totals.income).toLocaleString('ja-JP')}</td>
        <td>${(totals.expense).toLocaleString('ja-JP')}</td>
        <td>${(totals.net).toLocaleString('ja-JP')}</td>
      </tr>
    </tfoot>
  </table>

  <div class="stamp">※本書はモック（テスト用）レポートです。ブラウザの印刷からPDFとして保存できます。</div>
  <script>window.onload = () => setTimeout(()=>window.print(), 300);</script>
</body>
</html>`;
    const w = window.open('', '_blank');
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  // ---------- CSV（モック） ----------
  function exportCsv(year) {
    const filtered = txns
      .map(t=>({...t, dt:new Date(t.date)}))
      .filter(t=>t.dt.getFullYear()===Number(year))
      .sort((a,b)=>a.dt - b.dt);
    const header = ['id','date','type','label','amount','method'];
    const rows = filtered.map(t=>[t.id, t.date, t.type, `"${t.label.replace(/"/g,'""')}"`, t.amount, t.method]);
    const csv = [header.join(','), ...rows.map(r=>r.join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- 初期描画 ----------
  const startYear = yearSelect?.value || new Date().getFullYear();
  renderChart(startYear);
  renderKpis(startYear);
  renderTxnList(startYear);

  // ---------- イベント ----------
  yearSelect?.addEventListener('change', () => {
    const y = yearSelect.value;
    renderChart(y);
    renderKpis(y);
    renderTxnList(y);
  });

  btnReport?.addEventListener('click', () => {
    const y = yearSelect?.value || new Date().getFullYear();
    openReportWindow(y);
  });

  btnCsv?.addEventListener('click', (e) => {
    e.preventDefault();
    const y = yearSelect?.value || new Date().getFullYear();
    exportCsv(y);
  });
}

document.addEventListener('DOMContentLoaded', initRevenueManagement);
/* =========================
   U-008 売上・支払い管理 モジュール
   年セレクタ + 月別グラフ + 支出科目円グラフ + PDF(モック) + CSV
   ========================= */
(function () {
  // DOM が無ければ何もしない（他ページ安全化）
  const root = document.getElementById('revenueRoot');
  if (!root) return;

  // ---- モックデータ（年ごと） ----
  // income/expense: 月別集計（1-12）; transactions: 取引明細（フィルターに使用）
  const REV_MOCK = {
    2024: {
      monthly: {
        income: [320000, 280000, 340000, 360000, 390000, 420000, 410000, 450000, 470000, 520000, 560000, 600000],
        expense:[120000, 130000, 110000, 140000, 150000, 160000, 155000, 170000, 165000, 180000, 190000, 210000]
      },
      expenseBreakdown: { // 年間合計の科目内訳（例）
        広告費: 420000, 決済手数料: 280000, 外注費: 350000, 旅費: 160000, 通信費: 120000, 雑費: 90000
      },
      transactions: genTransactions(2024)
    },
    2025: {
      monthly: {
        income: [380000, 360000, 420000, 450000, 480000, 520000, 540000, 560000, 590000, 620000, 650000, 700000],
        expense:[140000, 135000, 150000, 165000, 175000, 185000, 190000, 200000, 205000, 215000, 225000, 240000]
      },
      expenseBreakdown: {
        広告費: 520000, 決済手数料: 330000, 外注費: 420000, 旅費: 220000, 通信費: 140000, 雑費: 110000
      },
      transactions: genTransactions(2025)
    }
  };

  // 取引ダミー生成
  function genTransactions(year) {
    const methods = ['card', 'bank', 'token'];
    const expenseCats = ['広告費', '決済手数料', '外注費', '旅費', '通信費', '雑費'];
    const result = [];
    for (let m = 1; m <= 12; m++) {
      // 月ごとに収入3件、支出2件のダミー
      for (let i = 0; i < 3; i++) {
        result.push({
          date: `${year}-${String(m).padStart(2, '0')}-${String(3 + i).padStart(2, '0')}`,
          type: 'income',
          subject: '講座販売',
          memo: `オンライン講座売上 #${year}${m}${i}`,
          method: methods[(m + i) % methods.length],
          amount: 50000 + (i * 10000)
        });
      }
      for (let j = 0; j < 2; j++) {
        const cat = expenseCats[(m + j) % expenseCats.length];
        result.push({
          date: `${year}-${String(m).padStart(2, '0')}-${String(18 + j).padStart(2, '0')}`,
          type: 'expense',
          subject: cat,
          memo: `${cat} 支払い`,
          method: methods[(m + j) % methods.length],
          amount: 20000 + (j * 8000)
        });
      }
    }
    return result;
  }

  // ---- 要素参照 ----
  const yearEl   = document.getElementById('revYearSelect');
  const monthEl  = document.getElementById('revMonthSelect');
  const methodEl = document.getElementById('revMethodSelect');
  const applyBtn = document.getElementById('revApplyBtn');
  const resetBtn = document.getElementById('revResetBtn');

  const kpiTotalRevenue = document.getElementById('kpiTotalRevenue');
  const kpiTotalYoY     = document.getElementById('kpiTotalYoY');
  const kpiIncome       = document.getElementById('kpiIncome');
  const kpiExpense      = document.getElementById('kpiExpense');
  const kpiNet          = document.getElementById('kpiNet');

  const tableBody       = document.getElementById('revTableBody');
  const monthlyCanvas   = document.getElementById('revMonthlyChart');
  const pieCanvas       = document.getElementById('revExpensePie');
  const chartDl         = document.getElementById('revChartDownload');
  const pieDl           = document.getElementById('revPieDownload');
  const printBtn        = document.getElementById('revPrintPdfBtn');
  const csvBtn          = document.getElementById('revCsvBtn');

  // ---- 初期セットアップ ----
  const years = Object.keys(REV_MOCK).map(Number).sort();
  populateYears(years);
  yearEl.value = Math.max(...years).toString(); // 最新年
  monthEl.value = 'all';
  methodEl.value = 'all';

  // チャート作成
  let monthlyChart = buildMonthlyChart();
  let pieChart     = buildExpensePie();

  // 初期描画
  renderAll();

  // ---- イベント ----
  applyBtn.addEventListener('click', renderAll);
  resetBtn.addEventListener('click', () => {
    yearEl.value = Math.max(...years).toString();
    monthEl.value = 'all';
    methodEl.value = 'all';
    renderAll();
  });

  chartDl.addEventListener('click', () => downloadChart(monthlyChart, 'monthly-income-expense.png'));
  pieDl.addEventListener('click', () => downloadChart(pieChart, 'expense-breakdown.png'));
  printBtn.addEventListener('click', handleMockPdf);
  csvBtn.addEventListener('click', handleCsvExport);

  // ---- 関数群 ----
  function populateYears(ys) {
    yearEl.innerHTML = ys.map(y => `<option value="${y}">${y}年</option>`).join('');
  }

  function getFilters() {
    return {
      year: Number(yearEl.value),
      month: monthEl.value === 'all' ? null : Number(monthEl.value),
      method: methodEl.value === 'all' ? null : methodEl.value
    };
  }

  function renderAll() {
    const {year, month, method} = getFilters();
    const pack = REV_MOCK[year];
    if (!pack) return;

    // KPI 年間総売上
    const totalYearRevenue = pack.monthly.income.reduce((a,b)=>a+b,0);
    kpiTotalRevenue.textContent = `¥${totalYearRevenue.toLocaleString()}`;

    // 前年比（あれば）
    const prev = REV_MOCK[year - 1];
    if (prev) {
      const prevYearRevenue = prev.monthly.income.reduce((a,b)=>a+b,0);
      const rate = prevYearRevenue ? Math.round(((totalYearRevenue - prevYearRevenue) / prevYearRevenue) * 100) : 0;
      const positive = rate >= 0;
      kpiTotalYoY.classList.toggle('positive', positive);
      kpiTotalYoY.classList.toggle('negative', !positive);
      kpiTotalYoY.innerHTML = `<i class="material-icons-round" style="font-size:16px;margin-right:4px;">${positive ? 'arrow_upward' : 'arrow_downward'}</i>${Math.abs(rate)}% 前年比`;
    } else {
      kpiTotalYoY.classList.add('positive');
      kpiTotalYoY.innerHTML = `<i class="material-icons-round" style="font-size:16px;margin-right:4px;">arrow_upward</i>— 前年データなし`;
    }

    // 月別グラフのデータ
    const labels = Array.from({length:12}, (_,i)=> `${i+1}月`);
    const income = [...pack.monthly.income];
    const expense= [...pack.monthly.expense];

    // 月フィルタ（KPI期間計算用）
    let filteredTx = pack.transactions.filter(tx => {
      const m = Number(tx.date.slice(5,7));
      const byMonth  = month ? (m === month) : true;
      const byMethod = method ? (tx.method === method) : true;
      return byMonth && byMethod;
    });

    // KPI（期間）
    const incomeSum  = filteredTx.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
    const expenseSum = filteredTx.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
    kpiIncome.textContent  = `¥${incomeSum.toLocaleString()}`;
    kpiExpense.textContent = `¥${expenseSum.toLocaleString()}`;
    kpiNet.textContent     = `¥${(incomeSum - expenseSum).toLocaleString()}`;

    // テーブル
    renderTable(filteredTx);

    // 月別グラフ更新
    monthlyChart.data.labels = labels;
    monthlyChart.data.datasets[0].data = income;
    monthlyChart.data.datasets[1].data = expense;
    monthlyChart.update();

    // 円グラフ（支出内訳）— 月指定があればその月の支出から内訳集計、なければ年間内訳
    let breakdown = {};
    if (month) {
      const onlyExpense = filteredTx.filter(t=>t.type==='expense');
      for (const t of onlyExpense) {
        breakdown[t.subject] = (breakdown[t.subject] || 0) + t.amount;
      }
    } else {
      breakdown = {...pack.expenseBreakdown};
    }
    const pieLabels = Object.keys(breakdown);
    const pieValues = Object.values(breakdown);
    pieChart.data.labels = pieLabels.length ? pieLabels : ['データなし'];
    pieChart.data.datasets[0].data = pieLabels.length ? pieValues : [1];
    pieChart.update();
  }

  function renderTable(rows) {
    const html = rows.map(r => `
      <tr>
        <td>${r.date}</td>
        <td>${r.type === 'income' ? '収入' : '支出'}</td>
        <td>${r.subject}</td>
        <td>${r.memo}</td>
        <td>${toMethodLabel(r.method)}</td>
        <td class="text-end">${(r.type==='expense' ? '-' : '')}¥${r.amount.toLocaleString()}</td>
      </tr>
    `).join('');
    tableBody.innerHTML = html || `<tr><td colspan="6" class="text-center text-muted">対象データがありません</td></tr>`;
  }

  function toMethodLabel(v) {
    switch(v) {
      case 'card': return 'クレジットカード';
      case 'bank': return '銀行振込';
      case 'token': return 'トークン';
      default: return v;
    }
  }

  function buildMonthlyChart() {
    const ctx = monthlyCanvas.getContext('2d');
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: '収入',
            data: [],
            borderColor: '#7B68EE',
            backgroundColor: 'rgba(123,104,238,0.12)',
            tension: 0.35,
            fill: true
          },
          {
            label: '支出',
            data: [],
            borderColor: '#FF7E7E',
            backgroundColor: 'rgba(255,126,126,0.12)',
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, padding: 14, font: { family: 'Nunito' } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ¥${Number(ctx.parsed.y).toLocaleString()}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }},
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: v => `¥${Number(v).toLocaleString()}` }
          }
        }
      }
    });
  }

  function buildExpensePie() {
    const ctx = pieCanvas.getContext('2d');
    return new Chart(ctx, {
      type: 'pie',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [
            '#FF9D9D','#FFCF5C','#A6E1FA','#BADA55','#78A9FF','#C3A6FF',
            '#FFA8D2','#9DE0B5','#F7B267','#C9D6FF','#FFC7A6','#C2F970'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 14, usePointStyle: true, font: { family: 'Nunito' }}},
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a,b)=>a+b,0) || 1;
                const v = Number(ctx.parsed);
                const pct = Math.round((v/total)*100);
                return `${ctx.label}: ¥${v.toLocaleString()}（${pct}%）`;
              }
            }
          }
        }
      }
    });
  }

  function downloadChart(chart, filename) {
    const a = document.createElement('a');
    a.href = chart.toBase64Image();
    a.download = filename;
    a.click();
  }

  // PDF（モック）：印刷レイアウトのHTMLを開いてブラウザの印刷→PDF保存
  function handleMockPdf() {
    const {year, month, method} = getFilters();
    const pack = REV_MOCK[year];
    const rows = pack.transactions.filter(tx => {
      const m = Number(tx.date.slice(5,7));
      const byMonth  = month ? (m === month) : true;
      const byMethod = method ? (tx.method === method) : true;
      return byMonth && byMethod;
    });

    const incomeSum  = rows.filter(r=>r.type==='income').reduce((a,b)=>a+b.amount,0);
    const expenseSum = rows.filter(r=>r.type==='expense').reduce((a,b)=>a+b.amount,0);
    const net        = incomeSum - expenseSum;

    const w = window.open('', '_blank');
    const title = `入出金レポート（モック） - ${year}年 ${month? month+'月':''}`;
    const html = `
      <html><head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Poppins', 'Noto Sans JP', sans-serif; margin: 32px; color: #333; }
          h1 { font-size: 20px; margin: 0 0 12px; }
          .meta { color: #666; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #eee; padding: 8px 6px; font-size: 12px; }
          th { text-align: left; background: #fafafa; }
          tfoot td { font-weight: 600; }
          .right { text-align: right; }
          .badge { display:inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
          .income { background:#EAE7FF; color:#5b53c6; } .expense { background:#FFE7E7; color:#bf4f4f;}
          .footer { margin-top: 18px; font-size: 11px; color: #888;}
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">発行日: ${new Date().toLocaleString()}</div>
        <table>
          <thead><tr><th>日付</th><th>区分</th><th>科目</th><th>メモ</th><th>方法</th><th class="right">金額</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.date}</td>
                <td><span class="badge ${r.type==='income'?'income':'expense'}">${r.type==='income'?'収入':'支出'}</span></td>
                <td>${r.subject}</td>
                <td>${r.memo}</td>
                <td>${toMethodLabel(r.method)}</td>
                <td class="right">${r.type==='expense'?'-':''}¥${r.amount.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="5" class="right">収入計</td><td class="right">¥${incomeSum.toLocaleString()}</td></tr>
            <tr><td colspan="5" class="right">支出計</td><td class="right">¥${expenseSum.toLocaleString()}</td></tr>
            <tr><td colspan="5" class="right">差引</td><td class="right">¥${net.toLocaleString()}</td></tr>
          </tfoot>
        </table>
        <div class="footer">※本レポートはモックです。数値はサンプルであり、会計上の確定値ではありません。</div>
        <script>window.print()</script>
      </body></html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function handleCsvExport() {
    const {year, month, method} = getFilters();
    const pack = REV_MOCK[year];
    const rows = pack.transactions.filter(tx => {
      const m = Number(tx.date.slice(5,7));
      const byMonth  = month ? (m === month) : true;
      const byMethod = method ? (tx.method === method) : true;
      return byMonth && byMethod;
    });
    const header = ['date','type','subject','memo','method','amount'];
    const csv = [header.join(',')]
      .concat(rows.map(r => [
        r.date, r.type, esc(r.subject), esc(r.memo), r.method, r.amount
      ].join(',')))
      .join('\n');

    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = `transactions_${year}${month ? ('_' + String(month).padStart(2,'0')) : ''}.csv`;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function esc(s) {
    if (s == null) return '';
    const needsQuote = /[",\n]/.test(s);
    const body = String(s).replace(/"/g, '""');
    return needsQuote ? `"${body}"` : body;
  }
})();
/* =========================
   U-008 売上・支払い管理（拡張）
   ・年セレクタ
   ・月別グラフ：バー/ライン切替
   ・支出科目の固定配色（円グラフ）
   ・PDF(モック) / CSV
   ========================= */
(function () {
  const root = document.getElementById('revenueRoot');
  if (!root) return;

  // --- 固定配色（勘定科目） ---
  const CATEGORY_COLORS = {
    '広告費':      '#FF9D9D', // var(--accent1)
    '決済手数料':  '#FFCF5C', // var(--warning)
    '外注費':      '#A6E1FA', // var(--accent2)
    '旅費':        '#BADA55', // var(--accent3)
    '通信費':      '#78A9FF', // var(--info)
    '雑費':        '#C3A6FF'  // 補助色
  };
  const FALLBACK_COLORS = ['#FFA8D2','#9DE0B5','#F7B267','#C9D6FF','#FFC7A6','#C2F970'];

  // --- モックデータ ---
  const REV_MOCK = {
    2024: {
      monthly: {
        income: [320000,280000,340000,360000,390000,420000,410000,450000,470000,520000,560000,600000],
        expense:[120000,130000,110000,140000,150000,160000,155000,170000,165000,180000,190000,210000]
      },
      expenseBreakdown: { 広告費:420000, 決済手数料:280000, 外注費:350000, 旅費:160000, 通信費:120000, 雑費:90000 },
      transactions: genTransactions(2024)
    },
    2025: {
      monthly: {
        income: [380000,360000,420000,450000,480000,520000,540000,560000,590000,620000,650000,700000],
        expense:[140000,135000,150000,165000,175000,185000,190000,200000,205000,215000,225000,240000]
      },
      expenseBreakdown: { 広告費:520000, 決済手数料:330000, 外注費:420000, 旅費:220000, 通信費:140000, 雑費:110000 },
      transactions: genTransactions(2025)
    }
  };

  function genTransactions(year) {
    const methods = ['card', 'bank', 'token'];
    const expenseCats = Object.keys(CATEGORY_COLORS);
    const result = [];
    for (let m = 1; m <= 12; m++) {
      for (let i = 0; i < 3; i++) {
        result.push({
          date: `${year}-${String(m).padStart(2,'0')}-${String(3+i).padStart(2,'0')}`,
          type: 'income',
          subject: '講座販売',
          memo: `オンライン講座売上 #${year}${m}${i}`,
          method: methods[(m+i)%methods.length],
          amount: 50000 + (i*10000)
        });
      }
      for (let j = 0; j < 2; j++) {
        const cat = expenseCats[(m+j)%expenseCats.length];
        result.push({
          date: `${year}-${String(m).padStart(2,'0')}-${String(18+j).padStart(2,'0')}`,
          type: 'expense',
          subject: cat,
          memo: `${cat} 支払い`,
          method: methods[(m+j)%methods.length],
          amount: 20000 + (j*8000)
        });
      }
    }
    return result;
  }

  // --- 要素参照 ---
  const yearEl   = document.getElementById('revYearSelect');
  const monthEl  = document.getElementById('revMonthSelect');
  const methodEl = document.getElementById('revMethodSelect');
  const applyBtn = document.getElementById('revApplyBtn');
  const resetBtn = document.getElementById('revResetBtn');

  const kpiTotalRevenue = document.getElementById('kpiTotalRevenue');
  const kpiTotalYoY     = document.getElementById('kpiTotalYoY');
  const kpiIncome       = document.getElementById('kpiIncome');
  const kpiExpense      = document.getElementById('kpiExpense');
  const kpiNet          = document.getElementById('kpiNet');

  const tableBody       = document.getElementById('revTableBody');
  const monthlyCanvas   = document.getElementById('revMonthlyChart');
  const pieCanvas       = document.getElementById('revExpensePie');
  const chartDl         = document.getElementById('revChartDownload');
  const pieDl           = document.getElementById('revPieDownload');
  const printBtn        = document.getElementById('revPrintPdfBtn');
  const csvBtn          = document.getElementById('revCsvBtn');
  const chartTypeEl     = document.getElementById('revChartType');

  // --- 初期セットアップ ---
  const years = Object.keys(REV_MOCK).map(Number).sort();
  populateYears(years);
  yearEl.value = Math.max(...years).toString();
  monthEl.value = 'all';
  methodEl.value = 'all';
  chartTypeEl.value = 'line';

  // チャート
  let monthlyChart = buildMonthlyChart(chartTypeEl.value);
  let pieChart     = buildExpensePie();

  // 初期描画
  renderAll();

  // --- イベント ---
  applyBtn.addEventListener('click', renderAll);
  resetBtn.addEventListener('click', () => {
    yearEl.value = Math.max(...years).toString();
    monthEl.value = 'all';
    methodEl.value = 'all';
    chartTypeEl.value = 'line';
    rebuildMonthlyChart(); // タイプも戻す
    renderAll();
  });
  chartTypeEl.addEventListener('change', () => {
    rebuildMonthlyChart();
    renderAll();
  });

  chartDl.addEventListener('click', () => downloadChart(monthlyChart, 'monthly-income-expense.png'));
  pieDl.addEventListener('click', () => downloadChart(pieChart, 'expense-breakdown.png'));
  printBtn.addEventListener('click', handleMockPdf);
  csvBtn.addEventListener('click', handleCsvExport);

  // --- 関数群 ---
  function populateYears(ys) {
    yearEl.innerHTML = ys.map(y => `<option value="${y}">${y}年</option>`).join('');
  }

  function getFilters() {
    return {
      year: Number(yearEl.value),
      month: monthEl.value === 'all' ? null : Number(monthEl.value),
      method: methodEl.value === 'all' ? null : methodEl.value
    };
  }

  function renderAll() {
    const {year, month, method} = getFilters();
    const pack = REV_MOCK[year];
    if (!pack) return;

    // KPI 年間総売上
    const totalYearRevenue = pack.monthly.income.reduce((a,b)=>a+b,0);
    kpiTotalRevenue.textContent = `¥${totalYearRevenue.toLocaleString()}`;

    // 前年比
    const prev = REV_MOCK[year - 1];
    if (prev) {
      const prevYearRevenue = prev.monthly.income.reduce((a,b)=>a+b,0);
      const rate = prevYearRevenue ? Math.round(((totalYearRevenue - prevYearRevenue) / prevYearRevenue) * 100) : 0;
      const positive = rate >= 0;
      kpiTotalYoY.classList.toggle('positive', positive);
      kpiTotalYoY.classList.toggle('negative', !positive);
      kpiTotalYoY.innerHTML = `<i class="material-icons-round" style="font-size:16px;margin-right:4px;">${positive ? 'arrow_upward' : 'arrow_downward'}</i>${Math.abs(rate)}% 前年比`;
    } else {
      kpiTotalYoY.classList.add('positive');
      kpiTotalYoY.innerHTML = `<i class="material-icons-round" style="font-size:16px;margin-right:4px;">arrow_upward</i>— 前年データなし`;
    }

    // テーブル行（フィルタ適用）
    const rows = pack.transactions.filter(tx => {
      const m = Number(tx.date.slice(5,7));
      const byMonth  = month ? (m === month) : true;
      const byMethod = method ? (tx.method === method) : true;
      return byMonth && byMethod;
    });
    renderTable(rows);

    // KPI（期間）
    const incomeSum  = rows.filter(r=>r.type==='income').reduce((a,b)=>a+b.amount,0);
    const expenseSum = rows.filter(r=>r.type==='expense').reduce((a,b)=>a+b.amount,0);
    kpiIncome.textContent  = `¥${incomeSum.toLocaleString()}`;
    kpiExpense.textContent = `¥${expenseSum.toLocaleString()}`;
    kpiNet.textContent     = `¥${(incomeSum - expenseSum).toLocaleString()}`;

    // 月別（全月表示）
    const labels = Array.from({length:12}, (_,i)=> `${i+1}月`);
    monthlyChart.data.labels = labels;
    monthlyChart.data.datasets[0].data = [...pack.monthly.income];
    monthlyChart.data.datasets[1].data = [...pack.monthly.expense];
    monthlyChart.update();

    // 支出内訳（固定配色）
    let breakdown = {};
    if (month) {
      const onlyExpense = rows.filter(t=>t.type==='expense');
      for (const t of onlyExpense) breakdown[t.subject] = (breakdown[t.subject] || 0) + t.amount;
    } else {
      breakdown = {...pack.expenseBreakdown};
    }
    const pieLabels = Object.keys(breakdown);
    const pieValues = Object.values(breakdown);
    const colors = pieLabels.map((lab,i) => CATEGORY_COLORS[lab] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]);

    pieChart.data.labels = pieLabels.length ? pieLabels : ['データなし'];
    pieChart.data.datasets[0].data = pieLabels.length ? pieValues : [1];
    pieChart.data.datasets[0].backgroundColor = pieLabels.length ? colors : ['#EAEAEA'];
    pieChart.update();
  }

  function renderTable(rows) {
    const html = rows.map(r => `
      <tr>
        <td>${r.date}</td>
        <td>${r.type === 'income' ? '収入' : '支出'}</td>
        <td>${r.subject}</td>
        <td>${r.memo}</td>
        <td>${toMethodLabel(r.method)}</td>
        <td class="text-end">${(r.type==='expense' ? '-' : '')}¥${r.amount.toLocaleString()}</td>
      </tr>
    `).join('');
    tableBody.innerHTML = html || `<tr><td colspan="6" class="text-center text-muted">対象データがありません</td></tr>`;
  }

  function toMethodLabel(v) {
    switch(v) {
      case 'card': return 'クレジットカード';
      case 'bank': return '銀行振込';
      case 'token': return 'トークン';
      default: return v;
    }
  }

  // ---- 月別チャート（タイプ切替対応） ----
  function rebuildMonthlyChart() {
    if (monthlyChart) {
      monthlyChart.destroy();
    }
    monthlyChart = buildMonthlyChart(chartTypeEl.value);
  }

  function buildMonthlyChart(type) {
    const isLine = type === 'line';
    const ctx = monthlyCanvas.getContext('2d');
    return new Chart(ctx, {
      type,
      data: {
        labels: [],
        datasets: [
          {
            label: '収入',
            data: [],
            borderColor: '#7B68EE',
            backgroundColor: isLine ? 'rgba(123,104,238,0.12)' : 'rgba(123,104,238,0.6)',
            tension: 0.35,
            fill: isLine
          },
          {
            label: '支出',
            data: [],
            borderColor: '#FF7E7E',
            backgroundColor: isLine ? 'rgba(255,126,126,0.12)' : 'rgba(255,126,126,0.6)',
            tension: 0.35,
            fill: isLine
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, padding: 14, font: { family: 'Nunito' } } },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ¥${Number(ctx.parsed.y).toLocaleString()}` }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: v => `¥${Number(v).toLocaleString()}` }
          }
        }
      }
    });
  }

  // ---- 円グラフ ----
  function buildExpensePie() {
    const ctx = pieCanvas.getContext('2d');
    return new Chart(ctx, {
      type: 'pie',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 14, usePointStyle: true, font: { family: 'Nunito' }}},
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a,b)=>a+b,0) || 1;
                const v = Number(ctx.parsed);
                const pct = Math.round((v/total)*100);
                return `${ctx.label}: ¥${v.toLocaleString()}（${pct}%）`;
              }
            }
          }
        }
      }
    });
  }

  // ---- 共通ユーティリティ ----
  function downloadChart(chart, filename) {
    const a = document.createElement('a');
    a.href = chart.toBase64Image();
    a.download = filename;
    a.click();
  }

  // PDF（モック）
  function handleMockPdf() {
    const {year, month, method} = getFilters();
    const pack = REV_MOCK[year];
    const rows = pack.transactions.filter(tx => {
      const m = Number(tx.date.slice(5,7));
      const byMonth  = month ? (m === month) : true;
      const byMethod = method ? (tx.method === method) : true;
      return byMonth && byMethod;
    });

    const incomeSum  = rows.filter(r=>r.type==='income').reduce((a,b)=>a+b.amount,0);
    const expenseSum = rows.filter(r=>r.type==='expense').reduce((a,b)=>a+b.amount,0);
    const net        = incomeSum - expenseSum;

    const w = window.open('', '_blank');
    const title = `入出金レポート（モック） - ${year}年 ${month? month+'月':''}`;
    const html = `
      <html><head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Poppins','Noto Sans JP',sans-serif; margin: 32px; color: #333; }
          h1 { font-size: 20px; margin: 0 0 12px; }
          .meta { color: #666; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #eee; padding: 8px 6px; font-size: 12px; }
          th { text-align: left; background: #fafafa; }
          tfoot td { font-weight: 600; }
          .right { text-align: right; }
          .badge { display:inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
          .income { background:#EAE7FF; color:#5b53c6; } .expense { background:#FFE7E7; color:#bf4f4f; }
          .footer { margin-top: 18px; font-size: 11px; color: #888; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">発行日: ${new Date().toLocaleString()}</div>
        <table>
          <thead><tr><th>日付</th><th>区分</th><th>科目</th><th>メモ</th><th>方法</th><th class="right">金額</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.date}</td>
                <td><span class="badge ${r.type==='income'?'income':'expense'}">${r.type==='income'?'収入':'支出'}</span></td>
                <td>${r.subject}</td>
                <td>${r.memo}</td>
                <td>${toMethodLabel(r.method)}</td>
                <td class="right">${r.type==='expense'?'-':''}¥${r.amount.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="5" class="right">収入計</td><td class="right">¥${incomeSum.toLocaleString()}</td></tr>
            <tr><td colspan="5" class="right">支出計</td><td class="right">¥${expenseSum.toLocaleString()}</td></tr>
            <tr><td colspan="5" class="right">差引</td><td class="right">¥${net.toLocaleString()}</td></tr>
          </tfoot>
        </table>
        <div class="footer">※本レポートはモックです。数値はサンプルであり、会計上の確定値ではありません。</div>
        <script>window.print()</script>
      </body></html>
    `;
    w.document.open(); w.document.write(html); w.document.close();
  }

  function handleCsvExport() {
    const {year, month, method} = getFilters();
    const pack = REV_MOCK[year];
    const rows = pack.transactions.filter(tx => {
      const m = Number(tx.date.slice(5,7));
      const byMonth  = month ? (m === month) : true;
      const byMethod = method ? (tx.method === method) : true;
      return byMonth && byMethod;
    });
    const header = ['date','type','subject','memo','method','amount'];
    const csv = [header.join(',')]
      .concat(rows.map(r => [r.date, r.type, esc(r.subject), esc(r.memo), r.method, r.amount].join(',')))
      .join('\n');

    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = `transactions_${year}${month ? ('_' + String(month).padStart(2,'0')) : ''}.csv`;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function esc(s) {
    if (s == null) return '';
    const needsQuote = /[",\n]/.test(s);
    const body = String(s).replace(/"/g, '""');
    return needsQuote ? `"${body}"` : body;
  }
})();
/* =========================
   U-008 売上・支払い管理（拡張2）
   ・複合（バー＋ライン）追加
   ・移動平均線（期間可変・表示切替）
   ・既存：固定配色円グラフ / PDFモック / CSV / 年セレクタ 等
   ========================= */
(function () {
  const root = document.getElementById('revenueRoot');
  if (!root) return;

  // --- 固定配色（勘定科目） ---
  const CATEGORY_COLORS = {
    '広告費':      '#FF9D9D', // var(--accent1)
    '決済手数料':  '#FFCF5C', // var(--warning)
    '外注費':      '#A6E1FA', // var(--accent2)
    '旅費':        '#BADA55', // var(--accent3)
    '通信費':      '#78A9FF', // var(--info)
    '雑費':        '#C3A6FF'  // 補助色
  };
  const FALLBACK_COLORS = ['#FFA8D2','#9DE0B5','#F7B267','#C9D6FF','#FFC7A6','#C2F970'];

  // --- モックデータ ---
  const REV_MOCK = {
    2024: {
      monthly: {
        income: [320000,280000,340000,360000,390000,420000,410000,450000,470000,520000,560000,600000],
        expense:[120000,130000,110000,140000,150000,160000,155000,170000,165000,180000,190000,210000]
      },
      expenseBreakdown: { 広告費:420000, 決済手数料:280000, 外注費:350000, 旅費:160000, 通信費:120000, 雑費:90000 },
      transactions: genTransactions(2024)
    },
    2025: {
      monthly: {
        income: [380000,360000,420000,450000,480000,520000,540000,560000,590000,620000,650000,700000],
        expense:[140000,135000,150000,165000,175000,185000,190000,200000,205000,215000,225000,240000]
      },
      expenseBreakdown: { 広告費:520000, 決済手数料:330000, 外注費:420000, 旅費:220000, 通信費:140000, 雑費:110000 },
      transactions: genTransactions(2025)
    }
  };

  function genTransactions(year) {
    const methods = ['card', 'bank', 'token'];
    const expenseCats = Object.keys(CATEGORY_COLORS);
    const result = [];
    for (let m = 1; m <= 12; m++) {
      for (let i = 0; i < 3; i++) {
        result.push({
          date: `${year}-${String(m).padStart(2,'0')}-${String(3+i).padStart(2,'0')}`,
          type: 'income',
          subject: '講座販売',
          memo: `オンライン講座売上 #${year}${m}${i}`,
          method: methods[(m+i)%methods.length],
          amount: 50000 + (i*10000)
        });
      }
      for (let j = 0; j < 2; j++) {
        const cat = expenseCats[(m+j)%expenseCats.length];
        result.push({
          date: `${year}-${String(m).padStart(2,'0')}-${String(18+j).padStart(2,'0')}`,
          type: 'expense',
          subject: cat,
          memo: `${cat} 支払い`,
          method: methods[(m+j)%methods.length],
          amount: 20000 + (j*8000)
        });
      }
    }
    return result;
  }

  // --- 要素参照 ---
  const yearEl   = document.getElementById('revYearSelect');
  const monthEl  = document.getElementById('revMonthSelect');
  const methodEl = document.getElementById('revMethodSelect');
  const applyBtn = document.getElementById('revApplyBtn');
  const resetBtn = document.getElementById('revResetBtn');

  const kpiTotalRevenue = document.getElementById('kpiTotalRevenue');
  const kpiTotalYoY     = document.getElementById('kpiTotalYoY');
  const kpiIncome       = document.getElementById('kpiIncome');
  const kpiExpense      = document.getElementById('kpiExpense');
  const kpiNet          = document.getElementById('kpiNet');

  const tableBody       = document.getElementById('revTableBody');
  const monthlyCanvas   = document.getElementById('revMonthlyChart');
  const pieCanvas       = document.getElementById('revExpensePie');
  const chartDl         = document.getElementById('revChartDownload');
  const pieDl           = document.getElementById('revPieDownload');
  const printBtn        = document.getElementById('revPrintPdfBtn');
  const csvBtn          = document.getElementById('revCsvBtn');

  const chartTypeEl     = document.getElementById('revChartType');
  const showMaEl        = document.getElementById('revShowMA');
  const maWindowEl      = document.getElementById('revMaWindow');

  // --- 初期セットアップ ---
  const years = Object.keys(REV_MOCK).map(Number).sort();
  populateYears(years);
  yearEl.value = Math.max(...years).toString();
  monthEl.value = 'all';
  methodEl.value = 'all';
  chartTypeEl.value = 'combo';
  showMaEl.checked = true;
  maWindowEl.value = '3';

  // チャート
  let monthlyChart = buildMonthlyChart(chartTypeEl.value);
  let pieChart     = buildExpensePie();

  // 初期描画
  renderAll();

  // --- イベント ---
  applyBtn.addEventListener('click', renderAll);
  resetBtn.addEventListener('click', () => {
    yearEl.value = Math.max(...years).toString();
    monthEl.value = 'all';
    methodEl.value = 'all';
    chartTypeEl.value = 'combo';
    showMaEl.checked = true;
    maWindowEl.value = '3';
    rebuildMonthlyChart();
    renderAll();
  });

  chartTypeEl.addEventListener('change', () => { rebuildMonthlyChart(); renderAll(); });
  showMaEl.addEventListener('change', renderAll);
  maWindowEl.addEventListener('change', renderAll);

  chartDl.addEventListener('click', () => downloadChart(monthlyChart, 'monthly-income-expense.png'));
  pieDl.addEventListener('click', () => downloadChart(pieChart, 'expense-breakdown.png'));
  printBtn.addEventListener('click', handleMockPdf);
  csvBtn.addEventListener('click', handleCsvExport);

  // --- 関数群 ---
  function populateYears(ys) {
    yearEl.innerHTML = ys.map(y => `<option value="${y}">${y}年</option>`).join('');
  }

  function getFilters() {
    return {
      year: Number(yearEl.value),
      month: monthEl.value === 'all' ? null : Number(monthEl.value),
      method: methodEl.value === 'all' ? null : methodEl.value
    };
  }

  function renderAll() {
    const {year, month, method} = getFilters();
    const pack = REV_MOCK[year];
    if (!pack) return;

    // KPI 年間総売上
    const totalYearRevenue = pack.monthly.income.reduce((a,b)=>a+b,0);
    kpiTotalRevenue.textContent = `¥${totalYearRevenue.toLocaleString()}`;

    // 前年比
    const prev = REV_MOCK[year - 1];
    if (prev) {
      const prevYearRevenue = prev.monthly.income.reduce((a,b)=>a+b,0);
      const rate = prevYearRevenue ? Math.round(((totalYearRevenue - prevYearRevenue) / prevYearRevenue) * 100) : 0;
      const positive = rate >= 0;
      kpiTotalYoY.classList.toggle('positive', positive);
      kpiTotalYoY.classList.toggle('negative', !positive);
      kpiTotalYoY.innerHTML = `<i class="material-icons-round" style="font-size:16px;margin-right:4px;">${positive ? 'arrow_upward' : 'arrow_downward'}</i>${Math.abs(rate)}% 前年比`;
    } else {
      kpiTotalYoY.classList.add('positive');
      kpiTotalYoY.innerHTML = `<i class="material-icons-round" style="font-size:16px;margin-right:4px;">arrow_upward</i>— 前年データなし`;
    }

    // テーブル行（フィルタ適用）
    const rows = pack.transactions.filter(tx => {
      const m = Number(tx.date.slice(5,7));
      const byMonth  = month ? (m === month) : true;
      const byMethod = method ? (tx.method === method) : true;
      return byMonth && byMethod;
    });
    renderTable(rows);

    // KPI（期間）
    const incomeSum  = rows.filter(r=>r.type==='income').reduce((a,b)=>a+b.amount,0);
    const expenseSum = rows.filter(r=>r.type==='expense').reduce((a,b)=>a+b.amount,0);
    kpiIncome.textContent  = `¥${incomeSum.toLocaleString()}`;
    kpiExpense.textContent = `¥${expenseSum.toLocaleString()}`;
    kpiNet.textContent     = `¥${(incomeSum - expenseSum).toLocaleString()}`;

    // 月別（全月表示）
    const labels = Array.from({length:12}, (_,i)=> `${i+1}月`);
    const income  = [...pack.monthly.income];
    const expense = [...pack.monthly.expense];

    // 移動平均
    const showMA = showMaEl.checked;
    const win = Number(maWindowEl.value);
    const maIncome  = showMA ? simpleMA(income, win)  : Array(12).fill(null);
    const maExpense = showMA ? simpleMA(expense, win) : Array(12).fill(null);

    // データセットを更新（タイプごとに挙動を変える）
    const type = chartTypeEl.value;
    const isLine = type === 'line';
    const isBar  = type === 'bar';
    const isCombo= type === 'combo';

    // 収入/支出の見た目をタイプに合わせて調整
    const incDs = monthlyChart.data.datasets[0];
    const expDs = monthlyChart.data.datasets[1];
    const incMa = monthlyChart.data.datasets[2];
    const expMa = monthlyChart.data.datasets[3];

    monthlyChart.data.labels = labels;

    // 収入 / 支出
    incDs.data = income;
    expDs.data = expense;

    if (isCombo) {
      // 収入・支出はバー、MAはライン
      incDs.type = 'bar';
      expDs.type = 'bar';
      incDs.backgroundColor = 'rgba(123,104,238,0.6)';
      expDs.backgroundColor = 'rgba(255,126,126,0.6)';
      incDs.borderWidth = 0;
      expDs.borderWidth = 0;
      incDs.fill = false;
      expDs.fill = false;

      incMa.type = 'line';
      expMa.type = 'line';
    } else if (isBar) {
      incDs.type = 'bar';
      expDs.type = 'bar';
      incDs.backgroundColor = 'rgba(123,104,238,0.6)';
      expDs.backgroundColor = 'rgba(255,126,126,0.6)';
      incDs.borderWidth = 0;
      expDs.borderWidth = 0;
      incDs.fill = false;
      expDs.fill = false;

      incMa.type = 'line';
      expMa.type = 'line';
    } else {
      // line
      incDs.type = 'line';
      expDs.type = 'line';
      incDs.backgroundColor = 'rgba(123,104,238,0.12)';
      expDs.backgroundColor = 'rgba(255,126,126,0.12)';
      incDs.borderWidth = 2;
      expDs.borderWidth = 2;
      incDs.fill = true;
      expDs.fill = true;

      incMa.type = 'line';
      expMa.type = 'line';
    }

    // MAデータ / 表示
    incMa.data = maIncome;
    expMa.data = maExpense;
    incMa.hidden = !showMA;
    expMa.hidden = !showMA;

    monthlyChart.update();

    // 支出内訳（固定配色）
    let breakdown = {};
    if (month) {
      const onlyExpense = rows.filter(t=>t.type==='expense');
      for (const t of onlyExpense) breakdown[t.subject] = (breakdown[t.subject] || 0) + t.amount;
    } else {
      breakdown = {...pack.expenseBreakdown};
    }
    const pieLabels = Object.keys(breakdown);
    const pieValues = Object.values(breakdown);
    const colors = pieLabels.map((lab,i) => CATEGORY_COLORS[lab] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]);

    pieChart.data.labels = pieLabels.length ? pieLabels : ['データなし'];
    pieChart.data.datasets[0].data = pieLabels.length ? pieValues : [1];
    pieChart.data.datasets[0].backgroundColor = pieLabels.length ? colors : ['#EAEAEA'];
    pieChart.update();
  }

  function renderTable(rows) {
    const html = rows.map(r => `
      <tr>
        <td>${r.date}</td>
        <td>${r.type === 'income' ? '収入' : '支出'}</td>
        <td>${r.subject}</td>
        <td>${r.memo}</td>
        <td>${toMethodLabel(r.method)}</td>
        <td class="text-end">${(r.type==='expense' ? '-' : '')}¥${r.amount.toLocaleString()}</td>
      </tr>
    `).join('');
    tableBody.innerHTML = html || `<tr><td colspan="6" class="text-center text-muted">対象データがありません</td></tr>`;
  }

  function toMethodLabel(v) {
    switch(v) {
      case 'card': return 'クレジットカード';
      case 'bank': return '銀行振込';
      case 'token': return 'トークン';
      default: return v;
    }
  }

  // ---- 月別チャート（タイプ切替＆MAレイヤー対応） ----
  function rebuildMonthlyChart() {
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = buildMonthlyChart(chartTypeEl.value);
  }

  function buildMonthlyChart(type) {
    const ctx = monthlyCanvas.getContext('2d');
    // 初期は空データ。datasetsは4本（収入・支出・収入MA・支出MA）
    return new Chart(ctx, {
      type: type === 'bar' ? 'bar' : 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: '収入',
            data: [],
            type: type === 'bar' ? 'bar' : (type === 'combo' ? 'bar' : 'line'),
            borderColor: '#7B68EE',
            backgroundColor: type === 'bar' || type === 'combo' ? 'rgba(123,104,238,0.6)' : 'rgba(123,104,238,0.12)',
            borderWidth: type === 'line' ? 2 : 0,
            tension: 0.35,
            fill: type === 'line'
          },
          {
            label: '支出',
            data: [],
            type: type === 'bar' ? 'bar' : (type === 'combo' ? 'bar' : 'line'),
            borderColor: '#FF7E7E',
            backgroundColor: type === 'bar' || type === 'combo' ? 'rgba(255,126,126,0.6)' : 'rgba(255,126,126,0.12)',
            borderWidth: type === 'line' ? 2 : 0,
            tension: 0.35,
            fill: type === 'line'
          },
          {
            label: '収入（移動平均）',
            data: [],
            type: 'line',
            borderColor: '#4C3FD1',
            borderWidth: 2,
            borderDash: [6,4],
            pointRadius: 0,
            fill: false
          },
          {
            label: '支出（移動平均）',
            data: [],
            type: 'line',
            borderColor: '#E15B5B',
            borderWidth: 2,
            borderDash: [6,4],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, padding: 14, font: { family: 'Nunito' } } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const lab = ctx.dataset.label || '';
                const v = Number(ctx.parsed.y);
                if (Number.isFinite(v)) return `${lab}: ¥${v.toLocaleString()}`;
                return lab;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: v => `¥${Number(v).toLocaleString()}` }
          }
        }
      }
    });
  }

  // ---- 円グラフ ----
  function buildExpensePie() {
    const ctx = pieCanvas.getContext('2d');
    return new Chart(ctx, {
      type: 'pie',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 14, usePointStyle: true, font: { family: 'Nunito' }}},
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a,b)=>a+b,0) || 1;
                const v = Number(ctx.parsed);
                const pct = Math.round((v/total)*100);
                return `${ctx.label}: ¥${v.toLocaleString()}（${pct}%）`;
              }
            }
          }
        }
      }
    });
  }

  // ---- ユーティリティ ----
  function simpleMA(arr, window) {
    const out = Array(arr.length).fill(null);
    let sum = 0;
    for (let i=0;i<arr.length;i++){
      sum += arr[i];
      if (i >= window) sum -= arr[i-window];
      if (i >= window-1) out[i] = Math.round(sum / window);
    }
    return out;
  }

  function downloadChart(chart, filename) {
    const a = document.createElement('a');
    a.href = chart.toBase64Image();
    a.download = filename;
    a.click();
  }

  // PDF（モック）
  function handleMockPdf() {
    const {year, month, method} = getFilters();
    const pack = REV_MOCK[year];
    const rows = pack.transactions.filter(tx => {
      const m = Number(tx.date.slice(5,7));
      const byMonth  = month ? (m === month) : true;
      const byMethod = method ? (tx.method === method) : true;
      return byMonth && byMethod;
    });

    const incomeSum  = rows.filter(r=>r.type==='income').reduce((a,b)=>a+b.amount,0);
    const expenseSum = rows.filter(r=>r.type==='expense').reduce((a,b)=>a+b.amount,0);
    const net        = incomeSum - expenseSum;

    const w = window.open('', '_blank');
    const title = `入出金レポート（モック） - ${year}年 ${month? month+'月':''}`;
    const html = `
      <html><head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: 'Poppins','Noto Sans JP',sans-serif; margin: 32px; color: #333; }
          h1 { font-size: 20px; margin: 0 0 12px; }
          .meta { color: #666; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #eee; padding: 8px 6px; font-size: 12px; }
          th { text-align: left; background: #fafafa; }
          tfoot td { font-weight: 600; }
          .right { text-align: right; }
          .badge { display:inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
          .income { background:#EAE7FF; color:#5b53c6; } .expense { background:#FFE7E7; color:#bf4f4f; }
          .footer { margin-top: 18px; font-size: 11px; color: #888; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">発行日: ${new Date().toLocaleString()}</div>
        <table>
          <thead><tr><th>日付</th><th>区分</th><th>科目</th><th>メモ</th><th>方法</th><th class="right">金額</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.date}</td>
                <td><span class="badge ${r.type==='income'?'income':'expense'}">${r.type==='income'?'収入':'支出'}</span></td>
                <td>${r.subject}</td>
                <td>${r.memo}</td>
                <td>${toMethodLabel(r.method)}</td>
                <td class="right">${r.type==='expense'?'-':''}¥${r.amount.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="5" class="right">収入計</td><td class="right">¥${incomeSum.toLocaleString()}</td></tr>
            <tr><td colspan="5" class="right">支出計</td><td class="right">¥${expenseSum.toLocaleString()}</td></tr>
            <tr><td colspan="5" class="right">差引</td><td class="right">¥${net.toLocaleString()}</td></tr>
          </tfoot>
        </table>
        <div class="footer">※本レポートはモックです。数値はサンプルであり、会計上の確定値ではありません。</div>
        <script>window.print()</script>
      </body></html>
    `;
    w.document.open(); w.document.write(html); w.document.close();
  }

  function handleCsvExport() {
    const {year, month, method} = getFilters();
    const pack = REV_MOCK[year];
    const rows = pack.transactions.filter(tx => {
      const m = Number(tx.date.slice(5,7));
      const byMonth  = month ? (m === month) : true;
      const byMethod = method ? (tx.method === method) : true;
      return byMonth && byMethod;
    });
    const header = ['date','type','subject','memo','method','amount'];
    const csv = [header.join(',')]
      .concat(rows.map(r => [r.date, r.type, esc(r.subject), esc(r.memo), r.method, r.amount].join(',')))
      .join('\n');

    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = `transactions_${year}${month ? ('_' + String(month).padStart(2,'0')) : ''}.csv`;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function esc(s) {
    if (s == null) return '';
    const needsQuote = /[",\n]/.test(s);
    const body = String(s).replace(/"/g, '""');
    return needsQuote ? `"${body}"` : body;
  }
})();
/* =========================
   U-009 設定（Settings）モック
   - ローカルストレージ保存/読込
   - SNS連携のオン/オフ（モック）
   - テスト通知 / パスワード変更（モック）
   - APIキー表示/再発行 / Webhookテスト
   ========================= */
(function () {
  const root = document.getElementById('settingsRoot');
  if (!root) return;

  // ---- 既定値 ----
  const DEFAULTS = {
    profile: { name: 'Teacher Sample', email: 'you@example.com' },
    org: { name: 'Creator Suite Academy', lang: 'ja', tz: 'Asia/Dubai', currency: 'JPY' },
    theme: 'auto',
    notify: { email:false, inapp:true, weekly:false, critical:true },
    security: { twofa:false },
    billing: { name:'', taxId:'', addr:'', method:'card' },
    api: { key: genKey(), masked:true, webhook:'' },
    social: {
      twitter: false, instagram: false, youtube: true, facebook: false, tiktok: false
    }
  };

  // ---- 要素 ----
  const nameEl = document.getElementById('stgName');
  const emailEl = document.getElementById('stgEmail');
  const avatarEl = document.getElementById('stgAvatarPreview');

  const orgEl = document.getElementById('stgOrg');
  const langEl = document.getElementById('stgLang');
  const tzEl = document.getElementById('stgTz');
  const curEl = document.getElementById('stgCurrency');
  const themeEl = document.getElementById('stgTheme');

  const notifyEmailEl = document.getElementById('stgNotifyEmail');
  const notifyInappEl = document.getElementById('stgNotifyInapp');
  const notifyWeeklyEl = document.getElementById('stgNotifyWeekly');
  const notifyCriticalEl = document.getElementById('stgNotifyCritical');
  const testNotifyBtn = document.getElementById('stgTestNotifyBtn');

  const pwdCurEl = document.getElementById('stgPwdCur');
  const pwdNewEl = document.getElementById('stgPwdNew');
  const pwdNew2El = document.getElementById('stgPwdNew2');
  const twofaEl = document.getElementById('stg2fa');
  const changePwdBtn = document.getElementById('stgChangePwdBtn');

  const billNameEl = document.getElementById('stgBillName');
  const taxIdEl = document.getElementById('stgTaxId');
  const billAddrEl = document.getElementById('stgBillAddr');
  const payMethodEl = document.getElementById('stgPayMethod');

  const apiKeyEl = document.getElementById('stgApiKey');
  const apiToggleBtn = document.getElementById('stgApiToggleBtn');
  const apiRegenBtn = document.getElementById('stgApiRegenBtn');
  const webhookUrlEl = document.getElementById('stgWebhookUrl');
  const webhookTestBtn = document.getElementById('stgWebhookTestBtn');

  const socialList = document.getElementById('stgSocialList');

  const saveBtn = document.getElementById('stgSaveBtn');
  const resetBtn = document.getElementById('stgResetBtn');

  // ---- ステート ----
  let state = load() || DEFAULTS;

  // ---- 初期描画 ----
  paintAll();

  // ---- イベント ----
  [nameEl,emailEl].forEach(el => el.addEventListener('input', updateAvatar));
  testNotifyBtn.addEventListener('click', () => {
    alert('✅ テスト通知（モック）: 「新規購入が発生しました」\n※本番ではメール/アプリ内に送信されます。');
  });

  changePwdBtn.addEventListener('click', () => {
    const cur = pwdCurEl.value.trim();
    const n1 = pwdNewEl.value.trim();
    const n2 = pwdNew2El.value.trim();
    if (!cur || !n1 || !n2) return alert('パスワードをすべて入力してください。');
    if (n1.length < 8) return alert('新しいパスワードは8文字以上にしてください。');
    if (n1 !== n2) return alert('新しいパスワード（確認）が一致しません。');
    alert('🔒 パスワード変更（モック）が完了しました。');
    pwdCurEl.value = pwdNewEl.value = pwdNew2El.value = '';
  });

  apiToggleBtn.addEventListener('click', () => {
    state.api.masked = !state.api.masked;
    apiKeyEl.value = state.api.masked ? maskKey(state.api.key) : state.api.key;
  });
  apiRegenBtn.addEventListener('click', () => {
    if (!confirm('APIキーを再発行しますか？（元のキーは無効化されます）')) return;
    state.api.key = genKey();
    apiKeyEl.value = state.api.masked ? maskKey(state.api.key) : state.api.key;
    alert('🔑 APIキーを再発行しました（モック）。');
  });
  webhookTestBtn.addEventListener('click', () => {
    const url = webhookUrlEl.value.trim() || '(未設定)';
    alert(`📨 Webhook テスト送信（モック）\nPOST ${url}\n{\n  "event":"payment.succeeded",\n  "amount": 120000,\n  "currency":"JPY"\n}`);
  });

  saveBtn.addEventListener('click', () => {
    collectState();
    save(state);
    alert('💾 設定を保存しました（ブラウザに保存）。');
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm('設定を既定値に戻しますか？')) return;
    state = JSON.parse(JSON.stringify(DEFAULTS));
    paintAll();
    save(state);
  });

  // ---- 関数群 ----
  function paintAll() {
    // プロフィール
    nameEl.value = state.profile.name || '';
    emailEl.value = state.profile.email || '';
    updateAvatar();

    // 組織・地域
    orgEl.value = state.org.name || '';
    langEl.value = state.org.lang || 'ja';
    tzEl.value = state.org.tz || 'Asia/Dubai';
    curEl.value = state.org.currency || 'JPY';

    // テーマ
    themeEl.value = state.theme || 'auto';

    // 通知
    notifyEmailEl.checked = !!state.notify.email;
    notifyInappEl.checked = !!state.notify.inapp;
    notifyWeeklyEl.checked = !!state.notify.weekly;
    notifyCriticalEl.checked = !!state.notify.critical;

    // セキュリティ
    twofaEl.checked = !!state.security.twofa;

    // 請求
    billNameEl.value = state.billing.name || '';
    taxIdEl.value = state.billing.taxId || '';
    billAddrEl.value = state.billing.addr || '';
    payMethodEl.value = state.billing.method || 'card';

    // API
    apiKeyEl.value = state.api.masked ? maskKey(state.api.key) : state.api.key;
    webhookUrlEl.value = state.api.webhook || '';

    // SNS
    renderSocialList();
  }

  function collectState() {
    state.profile.name = nameEl.value.trim();
    state.profile.email = emailEl.value.trim();

    state.org.name = orgEl.value.trim();
    state.org.lang = langEl.value;
    state.org.tz = tzEl.value;
    state.org.currency = curEl.value;

    state.theme = themeEl.value;

    state.notify.email = notifyEmailEl.checked;
    state.notify.inapp = notifyInappEl.checked;
    state.notify.weekly = notifyWeeklyEl.checked;
    state.notify.critical = notifyCriticalEl.checked;

    state.security.twofa = twofaEl.checked;

    state.billing.name = billNameEl.value.trim();
    state.billing.taxId = taxIdEl.value.trim();
    state.billing.addr = billAddrEl.value.trim();
    state.billing.method = payMethodEl.value;

    state.api.webhook = webhookUrlEl.value.trim();
  }

  function updateAvatar() {
    const initials = toInitials(nameEl.value || 'TS');
    avatarEl.textContent = initials;
  }

  function toInitials(name) {
    const s = name.replace(/\s+/g,' ').trim();
    if (!s) return 'TS';
    const parts = s.split(' ');
    const a = parts[0][0] || '';
    const b = (parts[1] && parts[1][0]) || '';
    return (a + b).toUpperCase();
  }

  function renderSocialList() {
    const rows = [
      { key:'twitter',  label:'X（Twitter）', icon:'tag' },
      { key:'instagram',label:'Instagram',    icon:'photo_camera' },
      { key:'youtube',  label:'YouTube',      icon:'smart_display' },
      { key:'facebook', label:'Facebook',     icon:'thumb_up' },
      { key:'tiktok',   label:'TikTok',       icon:'music_note' },
    ];
    socialList.innerHTML = rows.map(r => {
      const connected = !!state.social[r.key];
      return `
      <div class="col-md-6">
        <div class="d-flex align-items-center justify-content-between p-3" style="border:1px solid rgba(0,0,0,0.08); border-radius:12px;">
          <div class="d-flex align-items-center gap-2">
            <div class="notification-icon" style="width:40px;height:40px;background:rgba(123,104,238,0.1);">
              <i class="material-icons-round" style="color:var(--primary);">${r.icon}</i>
            </div>
            <div>
              <div style="font-weight:600">${r.label}</div>
              <div style="font-size:12px;color:var(--text-secondary);">状態: 
                <span class="${connected ? 'text-success' : 'text-muted'}">${connected ? '接続済み' : '未接続'}</span>
              </div>
            </div>
          </div>
          <div>
            ${connected 
              ? `<button class="btn btn-outline-secondary btn-sm" data-social="${r.key}" data-action="disconnect">切断</button>`
              : `<button class="btn btn-primary btn-sm btn-primary" data-social="${r.key}" data-action="connect">接続</button>`
            }
          </div>
        </div>
      </div>`;
    }).join('');

    // ボタンのイベント
    socialList.querySelectorAll('button[data-social]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-social');
        const action = btn.getAttribute('data-action');
        state.social[key] = action === 'connect';
        renderSocialList();
      });
    });
  }

  // ---- storage ----
  function load() {
    try {
      const raw = localStorage.getItem('creatorSuite.settings');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function save(s) {
    localStorage.setItem('creatorSuite.settings', JSON.stringify(s));
  }

  // ---- APIキー ----
  function genKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let out = 'cs_live_';
    for (let i=0;i<28;i++) out += chars[Math.floor(Math.random()*chars.length)];
    return out;
  }
  function maskKey(k) {
    if (!k) return '';
    return k.slice(0,8) + '••••••••••••••••••••' + k.slice(-4);
  }
})();
/* =========================
   S-002 セミナー予約（受講生）
   - 時間表示 + カレンダー追加
   - キーワード事例クリック反映
   - 空き有無の「色分けモード」（非絞り込み）
   ========================= */
(function () {
  const root = document.getElementById('seminarBookingRoot');
  if (!root) return;

  /* ---- 追加CSS（色分けモード用） ---- */
  (function injectAvailStyles() {
    const STYLE_ID = '__seminar_avail_style__';
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      .card-availability--available{
        outline:2px solid rgba(16,185,129,.55);
        background:linear-gradient(0deg, rgba(16,185,129,.08), rgba(16,185,129,.08));
      }
      .card-availability--unavailable{
        opacity:.55; filter:grayscale(.15); position:relative;
      }
      .card-availability--unavailable .soldout-badge{
        position:absolute; top:8px; right:8px;
        font-size:11px; padding:2px 6px; border-radius:999px;
        background:rgba(239,68,68,.12); color:#ef4444;
        border:1px solid rgba(239,68,68,.25);
      }
    `;
    document.head.appendChild(st);
  })();

  // ---- 要素 ----
  const monthLabel = document.getElementById('monthLabel');
  const listDateLabel = document.getElementById('listDateLabel');
  const calendarGrid = document.getElementById('calendarGrid');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnToday = document.getElementById('btnToday');
  const viewModeEl = document.getElementById('viewMode');

  const searchEl = document.getElementById('searchSeminar');
  const keywordExamples = document.getElementById('keywordExamples');
  const onlyAvailableEl = document.getElementById('onlyAvailable');
  const chips = Array.from(document.querySelectorAll('.filter-chip'));
  const seminarList = document.getElementById('seminarList');
  const emptyState = document.getElementById('emptyState');
  const btnShowAll = document.getElementById('btnShowAll');

  // モーダル
  const modal = document.getElementById('bookingModal');
  const modalClose = document.getElementById('modalClose');
  const modalName = document.getElementById('modalName');
  const modalTeacher = document.getElementById('modalTeacher');
  const modalDateTime = document.getElementById('modalDateTime');
  const modalDesc = document.getElementById('modalDesc');
  const modalThumb = document.getElementById('modalThumb');
  const modalSeats = document.getElementById('modalSeats');
  const btnReserve = document.getElementById('btnReserve');
  const btnCancelReserve = document.getElementById('btnCancelReserve');
  const rm3d = document.getElementById('rm3d');
  const rm1d = document.getElementById('rm1d');
  const rm1h = document.getElementById('rm1h');
  const modalTimeLinePrimary = document.getElementById('modalTimeLinePrimary');
  const modalTimeLineLocal = document.getElementById('modalTimeLineLocal');
  const btnAddGoogle = document.getElementById('btnAddGoogle');
  const btnAddICS = document.getElementById('btnAddICS');

  // ---- モックデータ ----
  const LS_SEMINARS = 'creatorSuite.seminars';
  const LS_BOOKINGS = 'creatorSuite.bookings';

  const initialSeminars = [
    mkSem('効果的なSNS運用法', '佐藤あや', '2025-11-05T20:00:00+04:00', 60, 50, 'marketing', 'SNSの設計から投稿設計、CTA設計までの黄金ループを学びます。'),
    mkSem('引き寄せ×行動設計の実践', '桜井美帆', '2025-11-06T21:00:00+04:00', 60, 100, 'mind', '行動心理のフレームで「再現性のある運」を作ろう。'),
    mkSem('ショート動画で売上化', '田中優', '2025-11-08T19:00:00+04:00', 45, 40, 'sales', '30秒で刺す導線。スクリプト/撮影/編集/CTA。'),
    mkSem('AIライティングの基礎', '中村光', '2025-11-10T20:00:00+04:00', 60, 80, 'tech', 'AIを「共同著者」にする実務フロー。'),
    mkSem('セールスの型：成約率を2倍に', '小林涼', '2025-11-12T20:00:00+04:00', 60, 60, 'sales', 'ヒアリング→要約→価値提示→クロージング。'),
    mkSem('ライブ配信マスタークラス', '山本葵', '2025-11-15T18:00:00+04:00', 90, 120, 'marketing', 'StreamYard構成と同時配信のチェックリスト付き。'),
    mkSem('メンタルマネジメント90', '桜井美帆', '2025-11-18T21:00:00+04:00', 90, 100, 'mind', '自己効力感とルーティンで高出力を維持する。'),
    mkSem('自動化ファネルの設計図', '田中優', '2025-11-22T19:30:00+04:00', 75, 50, 'sales', '無料→低単価→コア→上位の導線と計測。'),
    mkSem('ノーコードでLPを作る', '中村光', '2025-11-25T20:00:00+04:00', 60, 70, 'tech', 'テンプレ/構成/コンバージョンの基本。'),
    mkSem('年末企画の勝ち筋', '佐藤あや', '2025-11-28T20:00:00+04:00', 60, 80, 'marketing', '年末年始の波で売上を伸ばす作戦会議。'),
  ];

  if (!localStorage.getItem(LS_SEMINARS)) {
    localStorage.setItem(LS_SEMINARS, JSON.stringify(initialSeminars));
  }
  if (!localStorage.getItem(LS_BOOKINGS)) {
    localStorage.setItem(LS_BOOKINGS, JSON.stringify([]));
  }

  // ---- 状態 ----
  let state = {
    cursor: startOfMonth(new Date()),
    view: 'month',
    category: 'all',
    query: '',
    onlyAvailable: false, // ← チェックONで「色分けモード」
    activeDate: null,
    selectedSeminarId: null
  };

  // 初期化
  paintCalendar();
  setTodayList();

  // ナビ
  btnPrev.addEventListener('click', () => { shift(-1); });
  btnNext.addEventListener('click', () => { shift(1); });
  btnToday.addEventListener('click', () => { state.cursor = startOfMonth(new Date()); paintCalendar(); setTodayList(); });
  viewModeEl.addEventListener('change', () => { state.view = viewModeEl.value; paintCalendar(); });

  // 一覧
  btnShowAll.addEventListener('click', (e) => {
    e.preventDefault();
    state.activeDate = null;
    renderSeminarList(getSeminars(), '今月の全件');
  });

  // フィルタ：テキスト
  searchEl.addEventListener('input', () => { state.query = searchEl.value.trim(); refreshList(); });

  // キーワード事例（イベント委譲）
  if (keywordExamples) {
    keywordExamples.addEventListener('click', (e) => {
      const pill = e.target.closest('.keyword-pill');
      if (!pill) return;
      const word = pill.getAttribute('data-keyword') || pill.textContent.trim();
      searchEl.value = word;
      const ev = new Event('input', { bubbles: true });
      searchEl.dispatchEvent(ev);
    });
  }

  // フィルタ：空きあり（＝色分けモード ON/OFF）
  onlyAvailableEl.addEventListener('change', () => { state.onlyAvailable = onlyAvailableEl.checked; refreshList(); });

  // フィルタ：カテゴリ
  chips.forEach(ch => ch.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    ch.classList.add('active');
    state.category = ch.getAttribute('data-cat') || 'all';
    refreshList();
  }));

  // モーダル
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  btnReserve.addEventListener('click', onReserve);
  btnCancelReserve.addEventListener('click', onCancelReserve);
  btnAddGoogle.addEventListener('click', addToGoogle);
  btnAddICS.addEventListener('click', addToICS);

  /* ===== 関数群 ===== */
  function mkSem(title, teacher, iso, duration, max, category, desc) {
    return { id: 'sem_' + Math.random().toString(36).slice(2, 10), title, teacher, iso, duration, max, category, desc, location: 'Online' };
  }
  function getSeminars() { return JSON.parse(localStorage.getItem(LS_SEMINARS) || '[]'); }
  function setSeminars(data) { localStorage.setItem(LS_SEMINARS, JSON.stringify(data)); }
  function getBookings() { return JSON.parse(localStorage.getItem(LS_BOOKINGS) || '[]'); }
  function setBookings(data) { localStorage.setItem(LS_BOOKINGS, JSON.stringify(data)); }

  function shift(n) {
    if (state.view === 'month') {
      const d = new Date(state.cursor); d.setMonth(d.getMonth() + n); state.cursor = startOfMonth(d);
    } else {
      const d = new Date(state.cursor); d.setDate(d.getDate() + n * 7); state.cursor = startOfWeek(d);
    }
    paintCalendar(); refreshList();
  }

  function paintCalendar() {
    const now = new Date();
    const seminars = getSeminars();

    if (state.view === 'month') {
      const y = state.cursor.getFullYear();
      const m = state.cursor.getMonth();
      monthLabel.textContent = `${y}年 ${m + 1}月`;

      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      const start = startOfWeek(first);
      const end = endOfWeek(last);

      const days = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));

      calendarGrid.innerHTML = days.map(d => {
        const inMonth = d.getMonth() === m;
        const isToday = isSameDate(d, now);
        const count = seminars.filter(s => isSameDate(new Date(s.iso), d)).length;
        return `
          <div class="calendar-day ${!inMonth ? 'muted' : ''} ${isToday ? 'today' : ''}" data-date="${fmtDateKey(d)}" title="クリックで一覧表示">
            <div class="date-num">${d.getDate()}</div>
            ${count ? `<span class="badge bg-primary">${count} 件</span>` : ''}
          </div>
        `;
      }).join('');

      calendarGrid.querySelectorAll('.calendar-day').forEach(el => {
        el.addEventListener('click', () => {
          const key = el.getAttribute('data-date');
          const date = parseDateKey(key);
          state.activeDate = date;
          const items = seminars.filter(s => isSameDate(new Date(s.iso), date));
          renderSeminarList(items, `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日`);
        });
      });
    } else {
      const start = startOfWeek(state.cursor);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      monthLabel.textContent = `${start.getFullYear()}年 ${start.getMonth()+1}月 ${start.getDate()}日 〜 ${end.getMonth()+1}月 ${end.getDate()}日`;

      const days = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));

      calendarGrid.innerHTML = days.map(d => {
        const isToday = isSameDate(d, new Date());
        const count = getSeminars().filter(s => isSameDate(new Date(s.iso), d)).length;
        return `
          <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${fmtDateKey(d)}" title="クリックで一覧表示">
            <div class="date-num">${d.getMonth()+1}/${d.getDate()}</div>
            ${count ? `<span class="badge bg-primary">${count} 件</span>` : ''}
          </div>
        `;
      }).join('');

      calendarGrid.querySelectorAll('.calendar-day').forEach(el => {
        el.addEventListener('click', () => {
          const key = el.getAttribute('data-date');
          const date = parseDateKey(key);
          state.activeDate = date;
          const items = getSeminars().filter(s => isSameDate(new Date(s.iso), date));
          renderSeminarList(items, `${date.getMonth()+1}月${date.getDate()}日`);
        });
      });
    }
  }

  function refreshList() {
    const all = getSeminars();
    let base = [];

    if (state.activeDate) {
      base = all.filter(s => isSameDate(new Date(s.iso), state.activeDate));
    } else {
      const y = state.cursor.getFullYear();
      const m = state.cursor.getMonth();
      base = all.filter(s => {
        const d = new Date(s.iso);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    }
    renderSeminarList(base);
  }

  /* ここがポイント：
     - state.onlyAvailable === true のときも絞り込みはしない
     - 代わりに各カードへ空き状況で色分けクラスを付与
  */
  function renderSeminarList(items, labelOverride) {
    const bookings = getBookings();
    const query = (state.query || '').toLowerCase();
    let list = items.slice();

    if (state.category !== 'all') list = list.filter(s => s.category === state.category);
    // 旧：if (state.onlyAvailable) list = list.filter(s => seatsLeft(s, bookings) > 0);
    // 新：色分け表示なので絞り込みは行わない

    if (query) {
      list = list.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.teacher.toLowerCase().includes(query)
      );
    }

    list.sort((a, b) => new Date(a.iso) - new Date(b.iso));

    listDateLabel.textContent = labelOverride || (state.activeDate
      ? `${state.activeDate.getFullYear()}年${state.activeDate.getMonth()+1}月${state.activeDate.getDate()}日`
      : '今月');

    if (!list.length) {
      seminarList.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    seminarList.innerHTML = list.map(s => {
      const dt = new Date(s.iso);
      const booked = bookings.some(b => b.id === s.id);
      const left = seatsLeft(s, bookings);
      const cap = s.max;
      const percent = Math.round((1 - left / cap) * 100);
      const utc4Range = fmtTimeRangeUTC4(dt, s.duration);
      const dateChip = `${fmtDate(dt)}・${s.duration}分`;

      // 色分けモードのクラス
      const availClass = state.onlyAvailable
        ? (left > 0 ? 'card-availability--available' : 'card-availability--unavailable')
        : '';

      const soldOutBadge = state.onlyAvailable && left <= 0
        ? `<span class="soldout-badge">満席</span>`
        : '';

      return `
        <div class="seminar-card ${availClass}" data-id="${s.id}">
          ${soldOutBadge}
          <div class="seminar-thumb">${s.title.slice(0,2).toUpperCase()}</div>
          <div style="flex:1; position:relative;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <div style="font-weight:700;">${escapeHTML(s.title)}</div>
              <div class="d-flex gap-2">
                <span class="time-chip"><i class="material-icons-round" style="font-size:14px;vertical-align:middle;">schedule</i> ${utc4Range}</span>
                <span class="tag">${dateChip}</span>
              </div>
            </div>
            <div class="text-muted" style="font-size:13px;">講師：${escapeHTML(s.teacher)} ／ カテゴリ：${s.category}</div>
            <div class="mt-1" style="font-size:13px;color:var(--text-secondary);">${escapeHTML(s.desc || '')}</div>
            <div class="mt-2 d-flex justify-content-between align-items-center">
              <div style="font-size:12px;color:var(--text-secondary);">定員 ${cap}／残り ${left}</div>
              <div class="d-flex align-items-center gap-2">
                <div class="progress" style="width:140px;height:8px;background:rgba(0,0,0,0.06);border-radius:999px;overflow:hidden;">
                  <div style="width:${percent}%;height:100%;background:linear-gradient(135deg,#7B68EE,#5AC8FA);"></div>
                </div>
                ${booked
                  ? `<button class="btn btn-outline-secondary btn-sm" data-open="${s.id}">詳細/予約済み</button>`
                  : `<button class="btn btn-primary btn-sm" data-open="${s.id}" ${left<=0 ? 'disabled' : ''}>${left<=0 ? '満席' : '予約する'}</button>`
                }
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    seminarList.querySelectorAll('button[data-open]').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.getAttribute('data-open')));
    });
  }

  function openModal(id) {
    const s = getSeminars().find(x => x.id === id);
    if (!s) return;
    state.selectedSeminarId = id;

    const bookings = getBookings();
    const booked = bookings.find(b => b.id === id);
    const start = new Date(s.iso);
    const end = new Date(start.getTime() + s.duration * 60000);

    modalName.textContent = s.title;
    modalTeacher.textContent = '講師：' + s.teacher;

    const utc4Range = fmtTimeRangeUTC4(start, s.duration);
    modalTimeLinePrimary.textContent = `${utc4Range}（UTC+4）｜所要 ${s.duration}分`;

    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
    const localRange = fmtTimeRangeLocal(start, end);
    modalTimeLineLocal.textContent = `あなたの端末時間（${tzName}）：${localRange}`;

    modalDateTime.textContent = `${fmtDate(start)}・${s.duration}分`;
    modalDesc.textContent = s.desc || '';
    modalThumb.textContent = s.title.slice(0,2).toUpperCase();

    const left = seatsLeft(s, bookings);
    modalSeats.textContent = `定員 ${s.max}／残り ${left}`;

    rm3d.checked = booked?.reminders?.d3 || false;
    rm1d.checked = booked?.reminders?.d1 || false;
    rm1h.checked = booked?.reminders?.h1 || false;

    btnReserve.style.display = booked ? 'none' : 'block';
    btnCancelReserve.style.display = booked ? 'block' : 'none';
    if (left <= 0) btnReserve.setAttribute('disabled', 'true'); else btnReserve.removeAttribute('disabled');

    modal.style.display = 'flex';
  }
  function closeModal() {
    modal.style.display = 'none';
    state.selectedSeminarId = null;
  }

  function onReserve() {
    const id = state.selectedSeminarId;
    if (!id) return;
    const s = getSeminars().find(x => x.id === id);
    const bookings = getBookings();

    if (seatsLeft(s, bookings) <= 0) {
      alert('満席のため予約できません。');
      return;
    }
    bookings.push({
      id,
      reminders: { d3: rm3d.checked, d1: rm1d.checked, h1: rm1h.checked },
      bookedAt: new Date().toISOString(),
    });
    setBookings(bookings);
    alert('✅ 予約を受け付けました（モック）。');
    closeModal();
    refreshList();
  }

  function onCancelReserve() {
    const id = state.selectedSeminarId;
    if (!id) return;
    let bookings = getBookings();
    bookings = bookings.filter(b => b.id !== id);
    setBookings(bookings);
    alert('🗑️ 予約をキャンセルしました（モック）。');
    closeModal();
    refreshList();
  }

  // ーーー カレンダー追加（Google / ICS） ーーー
  function addToGoogle() {
    const s = currentSelectedSeminar();
    if (!s) return;
    const start = new Date(s.iso);
    const end = new Date(start.getTime() + s.duration * 60000);

    const datesParam = `${toGCalDate(start)}/${toGCalDate(end)}`;
    const text = encodeURIComponent(s.title);
    const details = encodeURIComponent(`講師: ${s.teacher}\n${s.desc || ''}`);
    const location = encodeURIComponent(s.location || 'Online');

    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${datesParam}&details=${details}&location=${location}&sf=true&output=xml`;
    window.open(url, '_blank', 'noopener');
  }

  function addToICS() {
    const s = currentSelectedSeminar();
    if (!s) return;
    const start = new Date(s.iso);
    const end = new Date(start.getTime() + s.duration * 60000);

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Creator Suite//JP',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${cryptoRandom()}@creator-suite.local`,
      `DTSTAMP:${toICSDate(new Date())}`,
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${escapeICS(s.title)}`,
      `DESCRIPTION:${escapeICS(`講師: ${s.teacher}\n${s.desc || ''}`)}`,
      `LOCATION:${escapeICS(s.location || 'Online')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName(s.title)}.ics`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  function currentSelectedSeminar() {
    if (!state.selectedSeminarId) {
      alert('先にセミナー詳細を開いてください。');
      return null;
    }
    const s = getSeminars().find(x => x.id === state.selectedSeminarId);
    if (!s) {
      alert('セミナーが見つかりませんでした。');
      return null;
    }
    return s;
  }

  // ---- ユーティリティ ----
  function seatsLeft(s, bookings) {
    const count = bookings.filter(b => b.id === s.id).length;
    return Math.max(s.max - count, 0);
  }
  function pad2(n){ return String(n).padStart(2,'0'); }
  function fmtTimeRangeLocal(start, end) {
    const opts = { hour: '2-digit', minute: '2-digit', hour12: false };
    const s = new Intl.DateTimeFormat(undefined, opts).format(start);
    const e = new Intl.DateTimeFormat(undefined, opts).format(end);
    return `${s}–${e}`;
  }
  function fmtTimeRangeUTC4(start, durationMin) {
    const s = new Date(start);
    const e = new Date(s.getTime() + durationMin * 60000);
    return `${pad2(s.getHours())}:${pad2(s.getMinutes())}–${pad2(e.getHours())}:${pad2(e.getMinutes())}`;
  }
  function fmtDate(d) {
    const w = '日月火水木金土'[d.getDay()];
    return `${d.getMonth()+1}/${d.getDate()}(${w}) ${pad2(d.getHours())}:${pad2(d.getMinutes())} UTC+4`;
  }
  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function startOfWeek(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; }
  function endOfWeek(d) { const x = startOfWeek(d); x.setDate(x.getDate() + 6); return x; }
  function isSameDate(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function fmtDateKey(d) { const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0'); return `${d.getFullYear()}-${m}-${day}`; }
  function parseDateKey(s) { const [y,m,d] = s.split('-').map(n=>parseInt(n,10)); return new Date(y, m-1, d); }
  function escapeHTML(str) { return (str||'').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function toGCalDate(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; }
  function toICSDate(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; }
  function escapeICS(str='') { return String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function cryptoRandom() { if (window.crypto && crypto.getRandomValues) { const arr = new Uint32Array(4); crypto.getRandomValues(arr); return Array.from(arr).map(x => x.toString(16)).join(''); } return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function safeFileName(name='event') { return name.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60); }

  function setTodayList() {
    state.activeDate = new Date();
    const items = getSeminars().filter(s => isSameDate(new Date(s.iso), state.activeDate));
    if (items.length) {
      renderSeminarList(items, `今日（${state.activeDate.getMonth()+1}/${state.activeDate.getDate()}）`);
    } else {
      state.activeDate = null;
      refreshList();
    }
  }
})();
