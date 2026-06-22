/* ============================================================
 * lessons.js — レッスン教材とクリア判定（ミッション）の定義
 *
 * 各レッスン:
 *   id, title, body(HTML), commands[], mission{ text, check(ctx) }
 *   check は { fs, lastCommand, lastOutput } を受け取り true でクリア
 * ============================================================ */

const LESSONS = [
  {
    id: 'intro',
    title: 'はじめに / ls',
    icon: '📂',
    body: `
      <h2>📂 ファイルの一覧を見る — <code>ls</code></h2>
      <p>Linuxの操作は <strong>コマンド</strong> を打つことで進めます。
      まず最も使う <code>ls</code>（list の略）から。今いる場所にある
      ファイルやディレクトリ（フォルダ）の一覧を表示します。</p>
      <table class="cmd-table">
        <tr><td><code>ls</code></td><td>一覧を表示</td></tr>
        <tr><td><code>ls -l</code></td><td>詳細（権限・サイズ）付きで表示</td></tr>
        <tr><td><code>ls -a</code></td><td>隠しファイルも表示</td></tr>
      </table>
      <p>右のターミナルで実際に打ってみましょう。青色はディレクトリ、白色はファイルです。</p>
    `,
    mission: {
      text: '右のターミナルで <code>ls</code> を実行して、ホームにあるファイルを表示してみよう。',
      check: ({ lastCommand }) => /^\s*ls\b/.test(lastCommand)
    }
  },
  {
    id: 'pwd-cd',
    title: '移動する / pwd・cd',
    icon: '🧭',
    body: `
      <h2>🧭 今どこにいる？ 移動する — <code>pwd</code> / <code>cd</code></h2>
      <p>Linuxはフォルダ（ディレクトリ）が階層構造になっています。
      <code>pwd</code>（print working directory）で「今いる場所」、
      <code>cd</code>（change directory）で「移動」します。</p>
      <table class="cmd-table">
        <tr><td><code>pwd</code></td><td>現在地の絶対パスを表示</td></tr>
        <tr><td><code>cd documents</code></td><td>documents の中へ移動</td></tr>
        <tr><td><code>cd ..</code></td><td>一つ上の階層へ戻る</td></tr>
        <tr><td><code>cd ~</code></td><td>ホームディレクトリへ戻る</td></tr>
      </table>
      <p>まず <code>ls</code> で行き先を確認してから <code>cd documents</code> で移動してみましょう。</p>
    `,
    mission: {
      text: '<code>cd documents</code> で documents ディレクトリへ移動しよう。',
      check: ({ fs }) => fs.cwd.join('/') === 'home/user/documents'
    }
  },
  {
    id: 'cat',
    title: 'ファイルを読む / cat',
    icon: '📄',
    body: `
      <h2>📄 ファイルの中身を見る — <code>cat</code></h2>
      <p><code>cat</code> はファイルの中身を画面に表示します。
      ホームには <code>welcome.txt</code> や <code>memo.txt</code> があります。</p>
      <table class="cmd-table">
        <tr><td><code>cat welcome.txt</code></td><td>welcome.txt の中身を表示</td></tr>
        <tr><td><code>head todo.md</code></td><td>先頭10行だけ表示</td></tr>
        <tr><td><code>tail todo.md</code></td><td>末尾10行だけ表示</td></tr>
      </table>
      <p>ヒント: <code>cd ~</code> でホームに戻ってから試すと分かりやすいです。</p>
    `,
    mission: {
      text: '<code>cat memo.txt</code> で買い物メモを表示しよう（ホームディレクトリで実行）。',
      check: ({ lastCommand, lastOutput }) =>
        /^\s*cat\b/.test(lastCommand) && /りんご/.test(lastOutput)
    }
  },
  {
    id: 'mkdir-touch',
    title: '作る / mkdir・touch',
    icon: '🛠️',
    body: `
      <h2>🛠️ ディレクトリとファイルを作る — <code>mkdir</code> / <code>touch</code></h2>
      <p><code>mkdir</code>（make directory）で新しいフォルダ、
      <code>touch</code> で空のファイルを作れます。</p>
      <table class="cmd-table">
        <tr><td><code>mkdir practice</code></td><td>practice フォルダを作成</td></tr>
        <tr><td><code>touch note.txt</code></td><td>空の note.txt を作成</td></tr>
        <tr><td><code>echo "やあ" > hi.txt</code></td><td>文字を書き込みつつ作成</td></tr>
      </table>
      <p>作ったら <code>ls</code> で確認してみましょう。</p>
    `,
    mission: {
      text: '<code>mkdir practice</code> で practice という新しいフォルダを作ろう。',
      check: ({ fs }) => {
        const node = fs.getNode(fs.cwd);
        return node && node.children && node.children['practice'] &&
               node.children['practice'].type === 'dir';
      }
    }
  },
  {
    id: 'echo-write',
    title: '書き込む / echo >',
    icon: '✍️',
    body: `
      <h2>✍️ ファイルに書き込む — <code>echo</code> と <code>></code></h2>
      <p><code>echo</code> は文字をそのまま表示しますが、
      <code>></code>（リダイレクト）と組み合わせるとファイルに保存できます。
      <code>>></code> なら末尾に追記です。</p>
      <table class="cmd-table">
        <tr><td><code>echo こんにちは</code></td><td>画面に表示するだけ</td></tr>
        <tr><td><code>echo こんにちは > greet.txt</code></td><td>greet.txt に書き込み</td></tr>
        <tr><td><code>echo またね >> greet.txt</code></td><td>greet.txt に追記</td></tr>
      </table>
      <p>書き込んだら <code>cat greet.txt</code> で確認しましょう。</p>
    `,
    mission: {
      text: '<code>echo hello > greet.txt</code> を実行して、greet.txt を作って中身を書き込もう。',
      check: ({ fs }) => {
        const node = fs.getNode(fs.cwd);
        const f = node && node.children && node.children['greet.txt'];
        return f && f.type === 'file' && f.content.includes('hello');
      }
    }
  },
  {
    id: 'cp-mv-rm',
    title: 'コピー・移動・削除',
    icon: '🔁',
    body: `
      <h2>🔁 コピー / 移動 / 削除 — <code>cp</code> <code>mv</code> <code>rm</code></h2>
      <table class="cmd-table">
        <tr><td><code>cp a.txt b.txt</code></td><td>a.txt を b.txt としてコピー</td></tr>
        <tr><td><code>mv a.txt sub/</code></td><td>a.txt を sub フォルダへ移動</td></tr>
        <tr><td><code>mv old.txt new.txt</code></td><td>名前を変更（リネーム）</td></tr>
        <tr><td><code>rm a.txt</code></td><td>ファイルを削除</td></tr>
        <tr><td><code>rm -r folder</code></td><td>フォルダごと削除</td></tr>
      </table>
      <p>⚠️ 本物のLinuxでは <code>rm</code> したファイルは元に戻りません。慎重に！
      （ここは模擬環境なので <code>⟳ reset</code> でいつでも戻せます）</p>
    `,
    mission: {
      text: '<code>cp welcome.txt hello.txt</code> で welcome.txt をコピーして hello.txt を作ろう（ホームで実行）。',
      check: ({ fs }) => {
        const home = fs.getNode(['home', 'user']);
        return home.children['hello.txt'] && home.children['hello.txt'].type === 'file';
      }
    }
  },
  {
    id: 'grep-wc',
    title: '検索・集計 / grep・wc',
    icon: '🔍',
    body: `
      <h2>🔍 検索と集計 — <code>grep</code> / <code>wc</code></h2>
      <p><code>grep</code> はファイルの中から特定の文字を含む行を探します。
      <code>wc</code> は行数や単語数を数えます。</p>
      <table class="cmd-table">
        <tr><td><code>grep りんご memo.txt</code></td><td>「りんご」を含む行を表示</td></tr>
        <tr><td><code>wc -l memo.txt</code></td><td>行数を数える</td></tr>
        <tr><td><code>tree</code></td><td>フォルダ構造をツリー表示</td></tr>
      </table>
      <p>ヒント: <code>cd ~</code> でホームに戻ってから試しましょう。</p>
    `,
    mission: {
      text: '<code>grep ぱん memo.txt</code> で memo.txt から「ぱん」を含む行を探そう。',
      check: ({ lastCommand }) => /^\s*grep\b/.test(lastCommand) && /memo\.txt/.test(lastCommand)
    }
  },
  {
    id: 'graduation',
    title: '卒業 / 総合演習',
    icon: '🎓',
    body: `
      <h2>🎓 総合演習 — 学んだことを組み合わせよう</h2>
      <p>おめでとうございます。ここまでで基本コマンドが一通り使えるようになりました。
      最後に複数のコマンドを組み合わせて、ちょっとした作業をしてみましょう。</p>
      <p><strong>お題:</strong> ホームに <code>backup</code> というフォルダを作り、
      その中に <code>documents/report.txt</code> をコピーしてみてください。</p>
      <table class="cmd-table">
        <tr><td>1.</td><td><code>cd ~</code> でホームへ</td></tr>
        <tr><td>2.</td><td><code>mkdir backup</code></td></tr>
        <tr><td>3.</td><td><code>cp documents/report.txt backup/</code></td></tr>
        <tr><td>4.</td><td><code>ls backup</code> で確認</td></tr>
      </table>
      <p>うまくいったら、あなたはLinuxコマンド道場の卒業生です！🎉</p>
    `,
    mission: {
      text: 'ホームに <code>backup</code> フォルダを作り、その中に report.txt をコピーしよう。',
      check: ({ fs }) => {
        const backup = fs.getNode(['home', 'user', 'backup']);
        return backup && backup.type === 'dir' && backup.children['report.txt'];
      }
    }
  }
];

window.LESSONS = LESSONS;
