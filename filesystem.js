/* ============================================================
 * filesystem.js — ブラウザ内で動く仮想ファイルシステム
 * ノードは { type: 'dir'|'file', children?, content? } で表現する
 * ============================================================ */

function createInitialFS() {
  return {
    type: 'dir',
    children: {
      home: {
        type: 'dir',
        children: {
          user: {
            type: 'dir',
            children: {
              'welcome.txt': {
                type: 'file',
                content: 'ようこそ Linuxコマンド道場へ！\nまずは ls と打ってみましょう。\n'
              },
              'memo.txt': {
                type: 'file',
                content: '買い物リスト\n- りんご\n- ぱん\n- ぎゅうにゅう\n'
              },
              documents: {
                type: 'dir',
                children: {
                  'report.txt': {
                    type: 'file',
                    content: '四半期レポート\n売上は前年比120%でした。\n'
                  },
                  'todo.md': {
                    type: 'file',
                    content: '# やること\n1. Linuxを学ぶ\n2. シェルスクリプトを書く\n3. サーバーを立てる\n'
                  }
                }
              },
              projects: {
                type: 'dir',
                children: {
                  'hello.sh': {
                    type: 'file',
                    content: '#!/bin/bash\necho "Hello, Linux!"\n'
                  }
                }
              }
            }
          }
        }
      },
      etc: {
        type: 'dir',
        children: {
          'hostname': { type: 'file', content: 'dojo\n' }
        }
      },
      tmp: { type: 'dir', children: {} }
    }
  };
}

class FileSystem {
  constructor() {
    this.root = createInitialFS();
    this.cwd = ['home', 'user']; // 現在地（rootからの配列）
  }

  reset() {
    this.root = createInitialFS();
    this.cwd = ['home', 'user'];
  }

  /* パス文字列を絶対パスの配列に正規化する */
  resolve(path) {
    let parts;
    if (path.startsWith('/')) {
      parts = path.split('/').filter(Boolean);
    } else if (path === '~' || path.startsWith('~/')) {
      const rest = path.slice(1).split('/').filter(Boolean);
      parts = ['home', 'user', ...rest];
    } else {
      parts = [...this.cwd, ...path.split('/').filter(Boolean)];
    }
    const stack = [];
    for (const p of parts) {
      if (p === '.') continue;
      if (p === '..') { stack.pop(); continue; }
      stack.push(p);
    }
    return stack;
  }

  /* 配列パスからノードを取得（なければ null） */
  getNode(parts) {
    let node = this.root;
    for (const p of parts) {
      if (node.type !== 'dir' || !node.children[p]) return null;
      node = node.children[p];
    }
    return node;
  }

  getNodeByPath(path) {
    return this.getNode(this.resolve(path));
  }

  /* 親ディレクトリのノードと末尾名を返す */
  getParent(parts) {
    const parent = this.getNode(parts.slice(0, -1));
    const name = parts[parts.length - 1];
    return { parent, name };
  }

  cwdString() {
    if (this.cwd.length === 2 && this.cwd[0] === 'home' && this.cwd[1] === 'user') {
      return '~';
    }
    if (this.cwd.join('/').startsWith('home/user')) {
      return '~/' + this.cwd.slice(2).join('/');
    }
    return '/' + this.cwd.join('/');
  }
}

window.FileSystem = FileSystem;
