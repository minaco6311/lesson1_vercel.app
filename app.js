/* ============================================================
 * app.js — UI制御・ターミナル入出力・進捗管理
 * ============================================================ */

(function () {
  const fs = new FileSystem();
  const term = { history: [], historyIdx: -1, last: { command: '', output: '' } };

  // 状態
  let currentLesson = 0;
  const completed = loadCompleted();

  // DOM
  const $ = (sel) => document.querySelector(sel);
  const output = $('#terminalOutput');
  const input = $('#terminalInput');
  const promptEl = $('#prompt');
  const lessonList = $('#lessonList');
  const lessonCard = $('#lessonCard');
  const missionText = $('#missionText');
  const missionStatus = $('#missionStatus');

  /* ---------- 永続化（localStorage） ---------- */
  function loadCompleted() {
    try { return new Set(JSON.parse(localStorage.getItem('linux_dojo_done') || '[]')); }
    catch { return new Set(); }
  }
  function saveCompleted() {
    localStorage.setItem('linux_dojo_done', JSON.stringify([...completed]));
  }

  /* ---------- ターミナル出力 ---------- */
  function printLine(text, opts = {}) {
    const div = document.createElement('div');
    div.className = 'term-line';
    if (opts.html) div.innerHTML = text;
    else div.textContent = text;
    if (opts.className) div.classList.add(opts.className);
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  function printCommandEcho(cmd) {
    const div = document.createElement('div');
    div.className = 'term-line term-cmd';
    div.innerHTML = `<span class="term-prompt">${escapeHtml(fs.cwdString())} $</span> ${escapeHtml(cmd)}`;
    output.appendChild(div);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  /* ---------- コマンド実行 ---------- */
  function runCommand(raw) {
    const cmd = raw.trim();
    printCommandEcho(cmd);
    if (cmd === '') return;

    // 履歴
    term.history.push(cmd);
    term.historyIdx = term.history.length;

    if (cmd === 'clear') { output.innerHTML = ''; finalize(cmd, ''); return; }

    const tokens = tokenize(cmd);
    const name = tokens[0];
    const args = tokens.slice(1);
    const command = COMMANDS[name];

    let outText = '';
    if (!command) {
      printLine(`${name}: コマンドが見つかりません。'help' で一覧を表示できます。`, { className: 'term-red' });
    } else {
      const result = command.run(args, { fs, term });
      if (result.error) {
        printLine(result.error, { className: 'term-red' });
        outText = result.error;
      } else if (result.output !== '') {
        printLine(result.output, { html: !!result.html });
        outText = stripHtml(result.output);
      }
    }
    finalize(cmd, outText);
    updatePrompt();
  }

  function finalize(cmd, outText) {
    term.last = { command: cmd, output: outText };
    checkMission();
  }

  function stripHtml(s) {
    const tmp = document.createElement('div');
    tmp.innerHTML = s;
    return tmp.textContent || '';
  }

  /* シンプルなトークナイザ（引用符を考慮） */
  function tokenize(str) {
    const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
    const out = [];
    let m;
    while ((m = re.exec(str)) !== null) {
      out.push(m[1] ?? m[2] ?? m[3]);
    }
    return out;
  }

  function updatePrompt() {
    promptEl.textContent = `user@dojo:${fs.cwdString()}$`;
  }

  /* ---------- ミッション判定 ---------- */
  function checkMission() {
    const lesson = LESSONS[currentLesson];
    if (!lesson || !lesson.mission) return;
    const ctx = { fs, lastCommand: term.last.command, lastOutput: term.last.output };
    let ok = false;
    try { ok = lesson.mission.check(ctx); } catch { ok = false; }
    if (ok && !completed.has(lesson.id)) {
      completed.add(lesson.id);
      saveCompleted();
      printLine('✅ ミッション達成！次のレッスンへ進めます。', { className: 'term-green' });
      renderMissionStatus();
      renderLessonList();
      updateProgress();
      lessonCard.classList.remove('celebrate');
      void lessonCard.offsetWidth;
      lessonCard.classList.add('celebrate');
    } else {
      renderMissionStatus();
    }
  }

  function renderMissionStatus() {
    const lesson = LESSONS[currentLesson];
    if (completed.has(lesson.id)) {
      missionStatus.textContent = '✅ クリア済み';
      missionStatus.className = 'mission-status done';
    } else {
      missionStatus.textContent = '⏳ 未クリア — 上のミッションに挑戦しよう';
      missionStatus.className = 'mission-status pending';
    }
  }

  /* ---------- レッスン描画 ---------- */
  function renderLesson() {
    const lesson = LESSONS[currentLesson];
    lessonCard.innerHTML = lesson.body + `
      <div class="lesson-nav">
        <button class="nav-btn" id="prevBtn" ${currentLesson === 0 ? 'disabled' : ''}>← 前へ</button>
        <button class="nav-btn" id="nextBtn" ${currentLesson === LESSONS.length - 1 ? 'disabled' : ''}>次へ →</button>
      </div>`;
    missionText.innerHTML = lesson.mission.text;
    renderMissionStatus();

    const prev = $('#prevBtn'), next = $('#nextBtn');
    if (prev) prev.onclick = () => gotoLesson(currentLesson - 1);
    if (next) next.onclick = () => gotoLesson(currentLesson + 1);
    renderLessonList();
  }

  function renderLessonList() {
    lessonList.innerHTML = '';
    LESSONS.forEach((l, i) => {
      const li = document.createElement('li');
      li.className = 'lesson-item' + (i === currentLesson ? ' active' : '');
      const check = completed.has(l.id) ? '✅' : '⚪';
      li.innerHTML = `<span class="lesson-check">${check}</span> <span>${l.icon} ${l.title}</span>`;
      li.onclick = () => gotoLesson(i);
      lessonList.appendChild(li);
    });
  }

  function gotoLesson(i) {
    if (i < 0 || i >= LESSONS.length) return;
    currentLesson = i;
    renderLesson();
    checkMission(); // すでに条件を満たしていれば反映
  }

  function updateProgress() {
    const total = LESSONS.length;
    const done = LESSONS.filter(l => completed.has(l.id)).length;
    $('#progressFill').style.width = `${(done / total) * 100}%`;
    $('#progressText').textContent = `${done} / ${total}`;
  }

  /* ---------- 入力ハンドリング ---------- */
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value;
      input.value = '';
      runCommand(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (term.historyIdx > 0) { term.historyIdx--; input.value = term.history[term.historyIdx]; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (term.historyIdx < term.history.length - 1) {
        term.historyIdx++; input.value = term.history[term.historyIdx];
      } else { term.historyIdx = term.history.length; input.value = ''; }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      autocomplete();
    }
  });

  function autocomplete() {
    const val = input.value;
    const tokens = val.split(' ');
    if (tokens.length === 1) {
      // コマンド名補完
      const cands = Object.keys(COMMANDS).filter(c => c.startsWith(tokens[0]));
      if (cands.length === 1) input.value = cands[0] + ' ';
      else if (cands.length > 1) printLine(cands.join('   '), { className: 'term-muted' });
    } else {
      // ファイル名補完
      const partial = tokens[tokens.length - 1];
      const node = fs.getNode(fs.cwd);
      if (node && node.type === 'dir') {
        const cands = Object.keys(node.children).filter(n => n.startsWith(partial));
        if (cands.length === 1) {
          tokens[tokens.length - 1] = cands[0];
          input.value = tokens.join(' ');
        } else if (cands.length > 1) {
          printLine(cands.join('   '), { className: 'term-muted' });
        }
      }
    }
  }

  // ターミナル領域クリックで入力にフォーカス
  $('.terminal-pane').addEventListener('click', () => input.focus());

  /* ---------- リセット ---------- */
  $('#resetFs').addEventListener('click', () => {
    fs.reset();
    output.innerHTML = '';
    updatePrompt();
    printLine('ファイルシステムをリセットしました。', { className: 'term-muted' });
  });

  /* ---------- テーマ切替 ---------- */
  const themeBtn = $('#themeToggle');
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('linux_dojo_theme', t);
  }
  themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });
  applyTheme(localStorage.getItem('linux_dojo_theme') || 'light');

  /* ---------- 初期化 ---------- */
  printLine('Linuxコマンド道場 へようこそ！ 🐧', { className: 'term-green' });
  printLine("左のレッスンを読みながら、ここにコマンドを打って練習しましょう。", { className: 'term-muted' });
  printLine("まずは 'help' と打って Enter を押してみてください。\n", { className: 'term-muted' });

  renderLesson();
  updateProgress();
  updatePrompt();
  input.focus();
})();
