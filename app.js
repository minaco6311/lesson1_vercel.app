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

  /* ---------- 花吹雪 ---------- */
  function launchConfetti() {
    const pane = document.querySelector('.terminal-pane');
    const rect = pane.getBoundingClientRect();

    const canvas = document.createElement('canvas');
    canvas.width  = rect.width;
    canvas.height = rect.height;
    // position:fixed でターミナルの上に重ねる（overflow:hidden を回避）
    canvas.style.cssText = [
      'position:fixed',
      `top:${rect.top}px`,
      `left:${rect.left}px`,
      `width:${rect.width}px`,
      `height:${rect.height}px`,
      'pointer-events:none',
      'z-index:9999',
      'border-radius:14px',
    ].join(';');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const COLORS = ['#4ade80','#60a5fa','#f472b6','#facc15','#fb923c','#a78bfa','#34d399'];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height * 0.4,
      r: Math.random() * 7 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3.5 + 2,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.15,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));

    const DURATION = 3200;
    const startTime = performance.now();

    function draw(now) {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const alpha = elapsed < DURATION - 700
        ? 1
        : Math.max(0, 1 - (elapsed - (DURATION - 700)) / 700);

      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        }
        ctx.restore();
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
      });

      if (elapsed < DURATION) {
        requestAnimationFrame(draw);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(draw);
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
      updateTerminalNav();
      launchConfetti();
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
    clearTerminalForLesson(LESSONS[i]);
    updateTerminalNav();
    checkMission();
  }

  function updateTerminalNav() {
    const prev = document.getElementById('termPrevBtn');
    const next = document.getElementById('termNextBtn');
    const dotsEl = document.getElementById('termLessonDots');
    if (!prev || !next) return;

    prev.disabled = currentLesson === 0;
    next.disabled = currentLesson === LESSONS.length - 1;
    next.textContent = currentLesson === LESSONS.length - 1 ? '🎓 完了！' : '次のレッスンへ →';

    // ドットインジケーター
    if (dotsEl) {
      dotsEl.innerHTML = '';
      LESSONS.forEach((l, i) => {
        const dot = document.createElement('span');
        dot.className = 'term-lesson-dot' +
          (i === currentLesson ? ' active' : completed.has(l.id) ? ' done' : '');
        dotsEl.appendChild(dot);
      });
    }
  }

  function clearTerminalForLesson(lesson) {
    output.innerHTML = '';
    fs.reset();
    updatePrompt();

    // レッスンごとのヒント: [タイトル行(green), 説明(muted), コマンド例(blue)]
    const hints = {
      'intro':       ['📂 LESSON 01 — ls', 'ファイルの一覧を表示するコマンドです。',
                      '▶ まずは ls と打ってみましょう！'],
      'pwd-cd':      ['🧭 LESSON 02 — pwd / cd', '現在地の確認と移動のコマンドです。',
                      '▶ ls で確認してから cd documents で移動しましょう。'],
      'cat':         ['📄 LESSON 03 — cat', 'ファイルの中身を表示するコマンドです。',
                      '▶ cat memo.txt で買い物メモを見てみましょう。'],
      'mkdir-touch': ['🛠️ LESSON 04 — mkdir / touch', 'フォルダとファイルを作るコマンドです。',
                      '▶ mkdir practice で新しいフォルダを作りましょう。'],
      'echo-write':  ['✍️ LESSON 05 — echo >', 'ファイルへの書き込みコマンドです。',
                      '▶ echo hello > greet.txt を試してみましょう。'],
      'cp-mv-rm':    ['🔁 LESSON 06 — cp / mv / rm', 'コピー・移動・削除のコマンドです。',
                      '▶ cp welcome.txt hello.txt でコピーしましょう。'],
      'grep-wc':     ['🔍 LESSON 07 — grep / wc', '検索と集計のコマンドです。',
                      '▶ grep ぱん memo.txt で「ぱん」を検索しましょう。'],
      'graduation':  ['🎓 LESSON 08 — 総合演習', 'これまで学んだコマンドを組み合わせましょう。',
                      '▶ mkdir backup → cp documents/report.txt backup/ → ls backup'],
    };

    const [title, desc, tip] = hints[lesson.id] || [`${lesson.icon} ${lesson.title}`, 'コマンドを入力して練習しましょう。', ''];
    printLine(title, { className: 'term-green' });
    printLine(desc,  { className: 'term-muted' });
    if (tip) printLine(tip, { className: 'term-blue' });
    printLine('');
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

  // ターミナルナビゲーションボタン
  document.getElementById('termPrevBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    gotoLesson(currentLesson - 1);
  });
  document.getElementById('termNextBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    gotoLesson(currentLesson + 1);
  });

  // ターミナル領域クリックで入力にフォーカス（ボタン以外）
  $('.terminal-pane').addEventListener('click', (e) => {
    if (!e.target.closest('button')) input.focus();
  });

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
  renderLesson();
  clearTerminalForLesson(LESSONS[0]);
  updateTerminalNav();
  updateProgress();
  input.focus();
})();
