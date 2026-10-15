<div align="center">

# 🌸 Hanahira Claude UI

**Claude Code を、ひと目でわかるダッシュボードに。**

プロンプト上のステータスバンド・リング型ゲージ・エージェントカード・コード増減のローソク足チャートを追加する、Claude Code 用インターフェース Mod です。

[![Language: 日本語](https://img.shields.io/badge/lang-日本語-e8825f?style=for-the-badge)](README.md)
[![Language: English](https://img.shields.io/badge/lang-English-9b8cf7?style=for-the-badge)](README.en.md)

![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-9b8cf7?style=flat-square)
![Version](https://img.shields.io/badge/version-0.1.0-34c38f?style=flat-square)
![Interface mod](https://img.shields.io/badge/type-interface_mod-4aa3f0?style=flat-square)

**🇯🇵 日本語（このページ）** ｜ [🇬🇧 English](README.en.md)

</div>

---

## ✨ 主な機能

| | 機能 | 内容 |
| :-: | :-- | :-- |
| 📊 | **ステータスバンド** | プロンプトの上に、プロジェクト名・git ブランチ・作業中を示すローディングバー・経過時間・状態・ツール呼び出し数（`⚡ 8 tools`）を表示します。 |
| ⭕ | **リングゲージ** | コンテキスト使用率、5時間制限、7日制限をリングで表示。制限にはリセットまでの時間（例：`resets in 3h 20m`）も出ます。 |
| 💰 | **合計カード** | 費用（Cost）・トークン（Tokens）・稼働時間（Time）をカードで表示。値が変わった瞬間だけアニメーションします。 |
| 📈 | **コード増減チャート** | ファイルを編集したプロンプトごとに 1 本のローソク足を描画。正味の行数の増減を株価チャートのように表示します。 |
| 🤖 | **エージェントカード** | バックグラウンドのサブエージェントを横並びのカードで表示。完了したカードは約 3 秒でチェックを見せて消えます。 |
| 🧾 | **会話ログの装飾** | 自分のメッセージをカード化。ツール行は丸アイコン・色付き動詞・ステータス・所要時間つき。差分は行番号つきカードで表示します。 |
| 🎞️ | **アニメーション** | 値が実際に変わったとき、または処理が動いているときだけ動きます。変化がなければ静止したままです。 |
| 🛡️ | **安全ガード** | Bash の `docker compose down -v` と `ufw enable` をブロックします。 |

> **正直さの原則：** エージェントカードの表示はすべて実際の値です。モデル名は API が返したもの、effort はエンジンが送った値だけを表示し、不明なものは推測せず省略するか `model pending` と表示します。エージェントごとの費用は価格表（`hooks/agents.ts`）からの **概算** で、`≈` を付けています。

### 画面イメージ（概念図）

```text
┌─ spa  ⎇ main  ▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱  45:30  ● working   ⚡ 8 tools ─┐
│  ◔ 15%            ◔ 4%                ◔ 22%             ┌ Code · net lines ──┐ │
│  context 151k/1M  of 5-hour limit     of 7-day limit    │    ▂ ▅ ▇ █   +207 │ │
│                   resets in 3h 59m    resets in 2d 8h   └────────────────────┘ │
│  [ Cost ≈$46.22 ] [ Tokens 172M ] [ Time 45:30 ]                              │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 インストール

### 方法 1：マーケットプレイスから（推奨）

Claude Code の **ターミナル** で次を入力します（デスクトップアプリのチャット欄ではありません）。

```text
/plugin install hanahira-claude-ui --marketplace KBYSHanahira/ClaudeHanahiraUI
```

1. マーケットプレイスを追加するか聞かれたら `y` と答えます。
2. スコープを選びます。**user スコープ**にすると、すべてのセッションで有効になります。
3. 同じマシンで user スコープに入れておくと、デスクトップアプリから始めたセッションでも読み込まれます。

> 🔒 リポジトリが **private** の場合は、インストールするマシンが GitHub にログイン済みで、このリポジトリへのアクセス権が必要です（`gh auth login` または SSH キー）。

### 方法 2：ZIP / `.plugin` ファイルをアップロード

**設定 → Plugins → Upload a plugin** から `hanahira-claude-ui.zip`（または `.plugin`）を選びます。

### 方法 3：フォルダを直接指定（開発・試用向け）

```bash
claude --plugin-dir /path/to/hanahira-claude-ui
```

環境変数で常時有効にすることもできます。

```bash
export CLAUDE_CODE_PLUGIN_DIRS=/path/to/hanahira-claude-ui
```

### 🌐 SSH 接続先で使う場合

Claude Code Desktop で SSH 接続先を使う場合、Claude Code 本体は **接続先のマシン** で動きます。Desktop は手元のプラグインを接続先へ同期しますが、**`hooks/` フォルダは同期されません**。しかも同期された（中身のない）同名のコピーが、接続先にインストールした本物を上書きしてしまうため、普通に入れても何も表示されません。

そこで、接続先には **別名（`hanahira-claude-ui-ssh`）のコピー** を入れます。**接続先のマシンで**、このリポジトリをクローンして次を実行してください:

```bash
git clone https://github.com/KBYSHanahira/ClaudeHanahiraUI.git
cd ClaudeHanahiraUI
scripts/install-ssh.sh
```

その後、Desktop で **新しいセッション** を開きます（開いているセッションには反映されません）。`git pull` で更新したら、もう一度 `scripts/install-ssh.sh` を実行してください。手元のマシン（ローカル）で使う場合はこの手順は不要で、方法 1 のままで動きます。

---

## 🚀 使い方

インストール後は **設定不要** です。Claude Code を開くと、プロンプトの上にバンドが現れます。

| 表示 | 見方 |
| :-- | :-- |
| **ローディングバー** | Claude が作業している間は光が流れ、待機中は静かなラインになります。 |
| **`⚡ N tools`** | このプロンプトで呼ばれたツールの数。増えた瞬間にフラッシュします。 |
| **コンテキストのリング** | 現在のコンテキストの使用率と、使用トークン／ウィンドウ（例：`151k/1M`）。 |
| **5時間 / 7日のリング** | 利用制限の消費率と、リセットまでの残り時間。アカウントが制限情報を返す場合のみ表示されます。 |
| **Cost** | エンジンが報告するセッション合計費用（`≈` つき）。 |
| **Tokens** | プラグインの読み込み後に数えた合計トークン。サブエージェント分を含み、キャッシュの読み書きも含みます。 |
| **Time** | 作業に費やした合計時間。 |
| **Code · net lines** | 下記参照。 |
| **エージェントカード** | バンドの枠の上に横並び。実行中は枠が脈打ち、完了すると緑に光って消えます。 |

### 📈 コード増減チャートの読み方

- **1 本のローソク足 ＝ ファイルを変更した 1 回のプロンプト**（編集がなかったプロンプトには出ません）
- **縦軸 ＝ 正味の行数**（追加した行数 − 削除した行数、セッションを通した累計）
- 🟩 **緑**＝増えた　🟥 **赤**＝減った　🟨 **黄**＝変化なし
- **ヒゲ**＝そのプロンプトの間に行数が到達した最低値と最高値
- 右上の数字（例：`+207`）は現在の正味の行数です
- データは Edit / Write の結果（パッチ）から数えた実測値で、サブエージェントの編集も含みます
- 直近 24 本を表示します

> **トークン数が大きく見える理由：** Tokens は、モデルの応答ごとの入力・出力・キャッシュ読み込み・キャッシュ書き込みをすべて足した累計です。コンテキストが大きい長いセッションでは、同じ文脈が毎回キャッシュから読み直されるため、数億の値になります。キャッシュ読み込みは通常の入力よりずっと安価です。

---

## 🎛️ カスタマイズ

- 色・アイコン・リングの大きさ・バーの長さ・カード表示数・完了カードの表示時間は、`hooks/register.tsx` 冒頭の `THEME` と `RING` で変更できます。
- ツール行の見た目は `hooks/chat.ts`、エージェントカードと価格表は `hooks/agents.ts`、アイコンは `hooks/icons.ts` です。
- ブロックするコマンドは `hooks/register.tsx` の `DANGEROUS` で編集できます。
- 制限リングは、アカウントがレート制限を報告する場合だけ表示されます。

## 🧪 動作要件と注意

- アニメーションは SVG（SMIL）を再生できる画面でのみ動きます。それ以外では静止表示になります。
- 公式の Mod 機構（`hooks/hooks.json` の `modules`）を使うインターフェース Mod です。対応する Claude Code のビルドが必要です。
- 変更はターン終了時にホットリロードされます。反映されないときは、会話ログの `reload failed` の行を確認してください。

## 🛠️ 開発

```bash
claude plugin validate /path/to/hanahira-claude-ui
claude --plugin-dir /path/to/hanahira-claude-ui
```

純粋関数は `hooks/chat.ts` などにまとめ、テスト（`hooks/*.test.ts`）があります。構成：

```text
.claude-plugin/   plugin.json / marketplace.json
hooks/
  hooks.json      モジュールの登録
  register.tsx    フック本体（バンド・ログ・エージェント）
  chat.ts         表示用の純粋関数（SVG・書式・チャート）
  agents.ts       エージェントカード・価格表
  icons.ts        線アイコン一式
types/index.d.ts  状態（$.state）の型
```

---

<div align="center">

Made with 🌸 by **Hanahira**

[日本語](README.md) ｜ [English](README.en.md)

</div>
