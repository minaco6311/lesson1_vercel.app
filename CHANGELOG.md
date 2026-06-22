# CHANGELOG

## [222d5c4] 2026-06-23 — UIの改善：背景・ターミナルデザイン・花吹雪アニメーション

### 変更ファイル
- `style.css` / `index.html` / `app.js`

### 変更内容

#### 背景デザイン
- ページ背景をロイヤルブルーのグラデーションに変更
  - ライトモード: `#7aa3e8 → #93b8f0 → #b8d4f8 → #daeafd`
  - ダークモード: `#1a2d6b → #243d8f → #3a5fc0`

#### ターミナルUI
- 入力欄をウェルカムメッセージ（出力エリア）の直下に配置
- 入力エリア全体をグリーン（`#4ade80`）の枠線で囲み、フォーカス時にグロー効果
- 「⌨️ ここにコマンドを入力 → Enter で実行」ラベルを入力欄の上に追加
- ターミナルパネルは画面の下まで黒い背景で埋まるよう `.terminal-spacer` を追加
- 出力テキストのフォントサイズを `0.88rem → 1rem` に拡大
- プロンプト・入力テキストのフォントサイズを `0.9rem → 1.15rem` に拡大
- 中央カラムの入力欄を削除し、ターミナルパネル内に一本化

#### 花吹雪アニメーション（app.js）
- ミッション達成時にターミナルエリアへ花吹雪を表示
- `position: fixed` + `getBoundingClientRect()` を使用（`overflow: hidden` の回避）
- 140個のパーティクル（円・四角）が7色でランダムに落下、3.2秒後にフェードアウト

---

## [a21500c] 2026-06-23 — first commit

### 新規作成ファイル
- `index.html` — サイト本体のHTML構造
- `style.css` — ライト/ダークテーマ対応のスタイル
- `filesystem.js` — ブラウザ内仮想ファイルシステム
- `commands.js` — 20種類のLinuxコマンド実装（ls/cd/cat/mkdir/touch/rm/cp/mv/echo/grep/wc 等）
- `lessons.js` — 8レッスン分の教材とミッション定義
- `app.js` — ターミナル入出力・進捗管理・Tab補完・コマンド履歴
- `vercel.json` — Vercel静的サイト設定
- `Linuxコマンド道場.pptx` — レッスン内容をPowerPoint化（python-pptxで生成）
- `build_pptx.py` — pptx生成スクリプト

### 主な機能
- ブラウザ内で動く模擬ターミナル（実機に影響なし）
- レッスンごとのミッション自動判定
- 進捗をlocalStorageに保存
- Tab補完・↑↓キーでコマンド履歴
- Vercelにデプロイ済み: https://lesson1-olive.vercel.app
