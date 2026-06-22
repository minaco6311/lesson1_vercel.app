/* ============================================================
 * commands.js — 模擬ターミナルが解釈する Linux コマンド群
 * 各コマンドは (args, ctx) => { output, error } を返す
 *   ctx = { fs, term }
 * ============================================================ */

const COMMANDS = {};

function defineCommand(name, help, fn) {
  COMMANDS[name] = { help, run: fn };
}

/* ---------- ls ---------- */
defineCommand('ls', 'ファイルやディレクトリの一覧を表示（-l で詳細, -a で隠しファイル）', (args, { fs }) => {
  const flags = args.filter(a => a.startsWith('-')).join('');
  const targets = args.filter(a => !a.startsWith('-'));
  const path = targets[0] || '.';
  const node = fs.getNodeByPath(path);
  if (!node) return { error: `ls: '${path}' にアクセスできません: そのようなファイルやディレクトリはありません` };

  let names;
  if (node.type === 'file') {
    names = [path];
  } else {
    names = Object.keys(node.children).sort();
  }
  if (names.length === 0) return { output: '' };

  if (flags.includes('l')) {
    const lines = names.map(n => {
      const child = node.type === 'dir' ? node.children[n] : node;
      const isDir = child.type === 'dir';
      const perm = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
      const size = isDir ? 4096 : (child.content ? child.content.length : 0);
      const colored = isDir ? `<span class="term-blue">${n}</span>` : n;
      return `${perm}  user user  ${String(size).padStart(5)}  ${colored}`;
    });
    return { output: lines.join('\n'), html: true };
  }

  const cells = names.map(n => {
    const child = node.type === 'dir' ? node.children[n] : node;
    return child.type === 'dir' ? `<span class="term-blue">${n}/</span>` : n;
  });
  return { output: cells.join('   '), html: true };
});

/* ---------- pwd ---------- */
defineCommand('pwd', '現在いるディレクトリの絶対パスを表示', (args, { fs }) => {
  const p = fs.cwd.length ? '/' + fs.cwd.join('/') : '/';
  return { output: p };
});

/* ---------- cd ---------- */
defineCommand('cd', 'ディレクトリを移動（cd .. で一つ上、cd ~ でホーム）', (args, { fs }) => {
  const path = args[0] || '~';
  const parts = fs.resolve(path);
  const node = fs.getNode(parts);
  if (!node) return { error: `cd: ${path}: そのようなファイルやディレクトリはありません` };
  if (node.type !== 'dir') return { error: `cd: ${path}: ディレクトリではありません` };
  fs.cwd = parts;
  return { output: '' };
});

/* ---------- cat ---------- */
defineCommand('cat', 'ファイルの中身を表示', (args, { fs }) => {
  if (args.length === 0) return { error: 'cat: ファイル名を指定してください' };
  const out = [];
  for (const path of args) {
    const node = fs.getNodeByPath(path);
    if (!node) return { error: `cat: ${path}: そのようなファイルやディレクトリはありません` };
    if (node.type === 'dir') return { error: `cat: ${path}: ディレクトリです` };
    out.push(node.content.replace(/\n$/, ''));
  }
  return { output: out.join('\n') };
});

/* ---------- echo ---------- */
defineCommand('echo', '文字列を表示（> でファイルに書き込み）', (args, { fs }) => {
  // リダイレクト対応: echo text > file
  const redirIdx = args.findIndex(a => a === '>' || a === '>>');
  if (redirIdx !== -1) {
    const text = args.slice(0, redirIdx).join(' ').replace(/^["']|["']$/g, '');
    const append = args[redirIdx] === '>>';
    const path = args[redirIdx + 1];
    if (!path) return { error: 'echo: リダイレクト先のファイル名がありません' };
    const parts = fs.resolve(path);
    const { parent, name } = fs.getParent(parts);
    if (!parent || parent.type !== 'dir') return { error: `echo: ${path}: ディレクトリがありません` };
    const existing = parent.children[name];
    const prev = (append && existing && existing.type === 'file') ? existing.content : '';
    parent.children[name] = { type: 'file', content: prev + text + '\n' };
    return { output: '' };
  }
  return { output: args.join(' ').replace(/^["']|["']$/g, '') };
});

/* ---------- mkdir ---------- */
defineCommand('mkdir', '新しいディレクトリを作成', (args, { fs }) => {
  if (args.length === 0) return { error: 'mkdir: ディレクトリ名を指定してください' };
  for (const path of args) {
    const parts = fs.resolve(path);
    const { parent, name } = fs.getParent(parts);
    if (!parent || parent.type !== 'dir') return { error: `mkdir: ${path}: 親ディレクトリがありません` };
    if (parent.children[name]) return { error: `mkdir: ${name}: すでに存在します` };
    parent.children[name] = { type: 'dir', children: {} };
  }
  return { output: '' };
});

/* ---------- touch ---------- */
defineCommand('touch', '空のファイルを作成（既存なら何もしない）', (args, { fs }) => {
  if (args.length === 0) return { error: 'touch: ファイル名を指定してください' };
  for (const path of args) {
    const parts = fs.resolve(path);
    const { parent, name } = fs.getParent(parts);
    if (!parent || parent.type !== 'dir') return { error: `touch: ${path}: 親ディレクトリがありません` };
    if (!parent.children[name]) parent.children[name] = { type: 'file', content: '' };
  }
  return { output: '' };
});

/* ---------- rm ---------- */
defineCommand('rm', 'ファイルを削除（-r でディレクトリも削除）', (args, { fs }) => {
  const recursive = args.some(a => a === '-r' || a === '-rf' || a === '-fr');
  const targets = args.filter(a => !a.startsWith('-'));
  if (targets.length === 0) return { error: 'rm: 削除対象を指定してください' };
  for (const path of targets) {
    const parts = fs.resolve(path);
    const { parent, name } = fs.getParent(parts);
    if (!parent || !parent.children[name]) return { error: `rm: ${path}: そのようなファイルやディレクトリはありません` };
    const node = parent.children[name];
    if (node.type === 'dir' && !recursive) return { error: `rm: ${path}: ディレクトリです（-r を付けてください）` };
    delete parent.children[name];
  }
  return { output: '' };
});

/* ---------- cp ---------- */
defineCommand('cp', 'ファイルをコピー（cp 元 先）', (args, { fs }) => {
  const targets = args.filter(a => !a.startsWith('-'));
  if (targets.length < 2) return { error: 'cp: cp <コピー元> <コピー先> の形式で指定してください' };
  const src = fs.getNodeByPath(targets[0]);
  if (!src) return { error: `cp: ${targets[0]}: そのようなファイルやディレクトリはありません` };
  if (src.type === 'dir') return { error: `cp: ${targets[0]}: ディレクトリです（-r が必要）` };
  const parts = fs.resolve(targets[1]);
  let { parent, name } = fs.getParent(parts);
  const destNode = fs.getNode(parts);
  // コピー先がディレクトリならその中に同名で
  if (destNode && destNode.type === 'dir') {
    parent = destNode;
    name = targets[0].split('/').pop();
  }
  if (!parent || parent.type !== 'dir') return { error: `cp: ${targets[1]}: 保存先がありません` };
  parent.children[name] = { type: 'file', content: src.content };
  return { output: '' };
});

/* ---------- mv ---------- */
defineCommand('mv', 'ファイルを移動 / 名前を変更（mv 元 先）', (args, { fs }) => {
  const targets = args.filter(a => !a.startsWith('-'));
  if (targets.length < 2) return { error: 'mv: mv <元> <先> の形式で指定してください' };
  const srcParts = fs.resolve(targets[0]);
  const { parent: srcParent, name: srcName } = fs.getParent(srcParts);
  if (!srcParent || !srcParent.children[srcName]) return { error: `mv: ${targets[0]}: そのようなファイルやディレクトリはありません` };
  const node = srcParent.children[srcName];

  let destParts = fs.resolve(targets[1]);
  let destNode = fs.getNode(destParts);
  let { parent: destParent, name: destName } = fs.getParent(destParts);
  if (destNode && destNode.type === 'dir') {
    destParent = destNode;
    destName = srcName;
  }
  if (!destParent || destParent.type !== 'dir') return { error: `mv: ${targets[1]}: 保存先がありません` };
  destParent.children[destName] = node;
  delete srcParent.children[srcName];
  return { output: '' };
});

/* ---------- head / tail ---------- */
defineCommand('head', 'ファイルの先頭数行を表示（既定10行）', (args, { fs }) => {
  const path = args.filter(a => !a.startsWith('-')).pop();
  const node = fs.getNodeByPath(path || '');
  if (!node || node.type !== 'file') return { error: `head: ${path}: ファイルがありません` };
  return { output: node.content.replace(/\n$/, '').split('\n').slice(0, 10).join('\n') };
});
defineCommand('tail', 'ファイルの末尾数行を表示（既定10行）', (args, { fs }) => {
  const path = args.filter(a => !a.startsWith('-')).pop();
  const node = fs.getNodeByPath(path || '');
  if (!node || node.type !== 'file') return { error: `tail: ${path}: ファイルがありません` };
  return { output: node.content.replace(/\n$/, '').split('\n').slice(-10).join('\n') };
});

/* ---------- wc ---------- */
defineCommand('wc', '行数・単語数・文字数を数える（-l で行数のみ）', (args, { fs }) => {
  const path = args.filter(a => !a.startsWith('-')).pop();
  const node = fs.getNodeByPath(path || '');
  if (!node || node.type !== 'file') return { error: `wc: ${path}: ファイルがありません` };
  const text = node.content;
  const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  if (args.includes('-l')) return { output: `${lines} ${path}` };
  return { output: `${lines} ${words} ${chars} ${path}` };
});

/* ---------- grep ---------- */
defineCommand('grep', 'ファイルから文字列を検索（grep パターン ファイル）', (args, { fs }) => {
  const positional = args.filter(a => !a.startsWith('-'));
  if (positional.length < 2) return { error: 'grep: grep <検索語> <ファイル> の形式で指定してください' };
  const pattern = positional[0];
  const path = positional[1];
  const node = fs.getNodeByPath(path);
  if (!node || node.type !== 'file') return { error: `grep: ${path}: ファイルがありません` };
  const matched = node.content.replace(/\n$/, '').split('\n')
    .filter(line => line.includes(pattern))
    .map(line => line.replace(pattern, `<span class="term-red">${pattern}</span>`));
  return { output: matched.join('\n'), html: true };
});

/* ---------- whoami / date / hostname ---------- */
defineCommand('whoami', '現在のユーザー名を表示', () => ({ output: 'user' }));
defineCommand('hostname', 'ホスト名を表示', () => ({ output: 'dojo' }));
defineCommand('date', '現在の日時を表示', () => ({ output: new Date().toString() }));

/* ---------- tree ---------- */
defineCommand('tree', '現在地以下をツリー表示', (args, { fs }) => {
  const start = fs.getNode(fs.cwd);
  const lines = ['.'];
  function walk(node, prefix) {
    const keys = Object.keys(node.children).sort();
    keys.forEach((k, i) => {
      const last = i === keys.length - 1;
      const child = node.children[k];
      const branch = last ? '└── ' : '├── ';
      const label = child.type === 'dir' ? `<span class="term-blue">${k}</span>` : k;
      lines.push(prefix + branch + label);
      if (child.type === 'dir') walk(child, prefix + (last ? '    ' : '│   '));
    });
  }
  walk(start, '');
  return { output: lines.join('\n'), html: true };
});

/* ---------- man ---------- */
defineCommand('man', 'コマンドの説明を表示（man ls など）', (args) => {
  const name = args[0];
  if (!name) return { error: 'man: コマンド名を指定してください' };
  const cmd = COMMANDS[name];
  if (!cmd) return { error: `man: ${name} のマニュアルがありません` };
  return { output: `${name.toUpperCase()}\n  ${cmd.help}` };
});

/* ---------- help ---------- */
defineCommand('help', '使えるコマンドの一覧を表示', () => {
  const names = Object.keys(COMMANDS).sort();
  const rows = names.map(n => `  <span class="term-green">${n.padEnd(10)}</span> ${COMMANDS[n].help}`);
  return {
    output: '使えるコマンド一覧:\n' + rows.join('\n') +
      '\n\n<span class="term-muted">ヒント: clear で画面消去 / Tab で補完 / ↑↓ で履歴</span>',
    html: true
  };
});

window.COMMANDS = COMMANDS;
