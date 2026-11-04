# シンプルTODO（業務タスク管理・GAS 版）

締切なし・1画面の素直なTODOアプリ。タスクを追加し、完了チェック・削除ができ、自分の Google ドライブのスプレッドシートに保存されて開き直しても残る。

> この README は **技術仕様** をまとめた入口です。
> 機能ごとの詳しい仕様は [`spec/`](spec/) ディレクトリにあります。
>
> 【講座メモ】AIコーディング入門（スペック駆動開発）演習の配布ベースアプリ（Google Apps Script 版）。
> 演習では、このアプリに「締切機能」をスペック駆動で追加します。

---

## 概要

### 解決したい課題
- 日々の業務タスクを、余計な機能なしで素早く書き留めて消し込みたい
- 締切・優先度などは、必要になったら後から足していきたい（最初は最小構成で始めたい）

### 想定ユーザー
- 業務のタスクを自分用に管理したい人（非エンジニアを含む）。公開範囲は **自分だけ**

---

## 技術スタック

- **実行場所**：Google Apps Script（GAS）の Web アプリ
- **画面**：HtmlService（`Index.html`。CSS・JS も同じファイル。フレームワークなし）
- **データの保存先**：Google スプレッドシート（初回に「シンプルTODO_データ」を自動作成）
- **AI API**：なし
- **開発の道具**：clasp（PC のコードを Google に送る）
- **テスト**：Vitest（PC の中だけで動く。Google には送らない）

> フレームワークを使わない理由：非エンジニアが上から下まで追える「素直な構造」を優先するため。
> タスクの操作（追加・完了・削除）を、スプレッドシートにも画面にも触らない小さな関数に分け、テストしやすくしています。

---

## アーキテクチャ

```
ブラウザ（Index.html）… 画面の骨組み・見た目・イベント処理
  → google.script.run で呼び出し
  → Code.gs（Google のサーバーで動く）
      ├ タスクの操作 … addTask / toggleTask / removeTask（判定だけの小さな関数）
      ├ 表との変換   … rowsToTasks / tasksToRows
      └ 保存         … スプレッドシートの tasks シートに読み書き（LockService で順番待ち）
  ← 新しいタスク一覧を返す → 画面を描き直す
```

- **判定の関数と、保存・画面は分ける**。判定の関数は PC の中で自動テストでき、締切などの機能も後から足しやすい
- 操作のたびに「`Code.gs` が読む → 変える → 保存する → 新しい一覧を返す」の 1 本の流れ

---

## ディレクトリ構成

```
ai-coding-todo-sample-gas/
├── README.md          # 技術仕様（このファイル）          ← PC だけ
├── spec/              # 機能ごとの仕様書                    ← PC だけ
│   ├── index.md
│   ├── task-management.md    # 追加・完了・削除
│   ├── sheet-persistence.md  # スプレッドシート保存
│   └── design.md             # デザイン方針
├── appsscript.json    # GAS の設定（公開範囲・タイムゾーン） ← Google に送る
├── Code.gs            # サーバー側の処理                    ← Google に送る
├── Index.html         # 画面                                ← Google に送る
├── .claspignore       # Google に送るファイルの指定
├── package.json       # テスト用の設定                      ← PC だけ
└── tests/             # テスト                              ← PC だけ
    ├── gas-loader.js         # Code.gs を書き換えずに読み込む道具
    ├── todo.test.js          # タスク操作のテスト
    └── sheet.test.js         # 表との変換・読めないときのテスト
```

---

## このアプリが扱うデータ（安全メモ）

- このアプリは **タスクの文字列だけ** を、自分の Google ドライブのスプレッドシートに保存します
- **ログイン画面・個人情報・パスワード・API キー・お金の情報は扱いません**（Google アカウントで本人だけが開けます）
- 秘密情報を入れるスクリプトプロパティは不要です（保存先スプレッドシートの ID だけを、アプリが自動で覚えます）

---

## セットアップ（初回のみ）

1. テストの道具を入れる
   ```bash
   npm install
   ```
2. 自分の Google ドライブに Apps Script のファイルを作る（`.clasp.json` が作られます）
   ```bash
   cp appsscript.json appsscript.json.bak
   clasp create --type webapp --title "シンプルTODO"
   mv appsscript.json.bak appsscript.json
   ```
   `clasp create` は `appsscript.json` を上書きする（タイムゾーンが New York になり、Web アプリの設定が消える）ため、控えを取って戻す
3. 保存（push）する
   ```bash
   clasp push --force
   ```
   結果に「Pushed 3 files」と出れば送れています（`--force` を付けないと「Skipping push.」と出て送られないことがある）
4. 確認用 URL を開く。初回は「権限の確認」画面が出るので、自分のアプリとして許可する（スプレッドシートを作成・編集する権限）

> 開発エージェント（SpecDrivenCoder）に「この TODO アプリを自分の Google ドライブに置いて、動かしたい」と伝えれば、1〜3 は確認しながら進めてくれます。

---

## 保存して確認する

```bash
clasp push --force
```

確認用 URL（自分だけが開ける、最新の内容）：`https://script.google.com/macros/s/<@HEAD の ID>/dev`
（ID は `clasp deployments` の `@HEAD` の行で分かります）

---

## テスト

```bash
npm run test
```

テストは PC の中だけで動きます。Google への保存（push）をしなくても実行できます。

---

## 公開

このアプリは「自分だけ」で使う前提です。人に使ってもらう場合は、`/secure`（公開前の安全チェック）を通してから公開範囲を決めてください。

---

## 仕様（spec/）

機能ごとの詳しい仕様は [`spec/`](spec/) にあります。
一覧は [`spec/index.md`](spec/index.md) を参照してください。

---

## ダウンロードの仕方

1. GitHub のこのページ（https://github.com/xenkai-inc/ai-coding-todo-sample-gas ）を開く
2. 緑の「Code」ボタン →「Download ZIP」を押す
3. ZIP を展開し、できたフォルダ（`ai-coding-todo-sample-gas-main`）を Develop フォルダの下に置く

> git を使える人は `git clone https://github.com/xenkai-inc/ai-coding-todo-sample-gas.git` でも取得できます。
> どちらの方法でも、`node_modules/` や `.clasp.json` は含まれません（セットアップで各自作られます）。
