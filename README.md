<div align="center">

# 🌸 Hanahira Claude UI

**Claude Code を、ひと目でわかるダッシュボードに。**

プロンプト上のステータスバンド・リング型ゲージ・エージェントカードを追加する、Claude Code 用インターフェース Mod です。

[![Language: 日本語](https://img.shields.io/badge/lang-日本語-e8825f?style=for-the-badge)](README.md)
[![Language: English](https://img.shields.io/badge/lang-English-9b8cf7?style=for-the-badge)](README.en.md)

![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-9b8cf7?style=flat-square)
![Version](https://img.shields.io/badge/version-1.12.4-34c38f?style=flat-square)
![Interface mod](https://img.shields.io/badge/type-interface_mod-4aa3f0?style=flat-square)

**🇯🇵 日本語（このページ）** ｜ [🇬🇧 English](README.en.md)

</div>

---

## ✨ 主な機能

| | 機能 | 内容 |
| :-: | :-- | :-- |
| 📊 | **ステータスバンド** | プロンプトの上に表示され、各部分はアプリのライト／ダークテーマに合わせたガラス風のカードに載ります。上の行：プロジェクト名、git ブランチ、作業中は赤・ターン完了で緑になるブロックのバー、経過時間、状態チップ（作業中は赤い `working`、完了で緑の `success`、または `error` / `stopped`）、ツール呼び出し数（`⚡ 8 tools`）。 |
| ▮▮▮ | **コンテキストスライダー** | コンテキスト使用率を大きな数字とスライダー（オレンジ→クリーム→青、白いつまみ）で表示。残り量とウィンドウサイズが続きます。85% を超えると数字が赤くなります。 |
| ⭕ | **リングゲージ** | 5時間制限、7日制限、モデル速度を小さなリングで表示。制限にはリセットまでの時間（例：`resets in 3h 20m`）も出ます。 |
| 💰 | **合計カード** | 費用（Cost）・トークン（Tokens）・稼働時間（Time）・モデルを、それぞれの色のタイルに載せたアイコンとともに表示。Time はセッションの稼働時間の合計で、ターンの実行中は毎秒進みます。上の行の時計は現在のターンだけの時間です。 |
| 🤖 | **エージェントカード** | バックグラウンドのサブエージェントを横並びのカードで表示。完了したカードは約 3 秒でチェックを見せて消えます。 |
| 🧾 | **会話ログの装飾** | 自分のメッセージはバンドと同じ枠のカード。ツール呼び出し・まとめられた実行・バックグラウンドタスクの行はすべて同じ形です：種類タイル、色付き動詞、対象（ファイルは等幅）、続いて同じ形の状態（状態の色のタイルとその色の言葉：緑の `Done`、赤の `Error`、紫の `Running`）と所要時間。`rm` によるファイル削除は赤い **Delete** 行になります。 |
| ✏️ | **コード変更をその場で表示** | Edit・Write は変更内容を行のすぐ下に表示します：行番号つき、追加行は緑、削除行は赤の背景、パッチが飛ばした所は `⋯`。ピルは `saved` の代わりに `+N` / `−N`。全体表示（ctrl+o）ではエンジン本来の表示のままです。 |
| 🎞️ | **リアルタイムの動き（点滅なし）** | 作業中はローディングバーのブロックの上を柔らかい光が流れ、working チップがふわっと現れて点が波のように光り、ステータスの点が呼吸し、実行中のエージェントカードはリングが回りバーが途切れず行き来し、終わったカードはチェックが描かれてバーが端まで満ちて止まります。Hanahira のスイッチはモードがオンになるとスライドしてオンになります。値が変わると（コンテキスト、リミット、コスト、トークン、ツール数、モデル、毎秒進む Time と上の行の時計）スロットのリールのように切り替わります。古い値が上へ抜け、新しい値が下から少し行き過ぎて入り、ぴたりと止まります。リミットのリングは新しい値へなめらかに動き、コンテキストのスライダーは塗りとつまみがなめらかに動き、tok/s の針はストリームの値ごとに振れます。動きは各画像内の CSS で、画面のフレームレートのまま再生され、動いている間に再描画はありません。時刻も含まないため、再描画でやり直しになることはなく、「視差効果を減らす」設定では止まります。トランスクリプトの行は静止のままです。 |
| 🛡️ | **安全ガード** | Compose のボリュームを削除する Bash コマンド（`docker compose down -v` / `--volumes`、`docker-compose` も）と `ufw enable` をブロックします。 |

> **正直さの原則：** エージェントカードの表示はすべて実際の値です。モデル名は API が返したもの、effort はエンジンが送った値だけを表示し、不明なものは推測せず省略するか `model pending` と表示します。エージェントごとの費用は価格表（`hooks/agents.ts`）からの **概算** で、`≈` を付けています。

### 画面イメージ

<div align="center">

<img src="docs/preview.png" alt="Hanahira Claude UI compact status band: agent cards, top-line chips, two lines of stats" width="900">

*プラグイン自身の SVG 描画関数で作った画像です（数値はサンプル）。再生成: `bun scripts/preview.ts`*

<img src="docs/preview-chat.svg" alt="Hanahira Claude UI transcript rows: your card, tool rows with kind tiles and status pills, an edit with its inline diff, a delete, a folded run, a running call, a task notification, an error" width="780">

*会話ログの行も同じ方法で描いています。再生成: `bun scripts/preview-chat.ts`*

</div>

#### 画面イメージ（概念図）

```text
┌─ spa  ⎇ main  ▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱  45:30  ● working   ⚡ 8 tools ─┐
│  ◔ 15%            ◔ 4%                ◔ 22%                                    │
│  context 151k/1M  of 5-hour limit     of 7-day limit                           │
│                   resets in 3h 59m    resets in 2d 8h                          │
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

**SSH ホスト（Desktop）でのホットリロード。** Desktop はすべてのセッションに空の `hanahira-claude-ui` を同期し、それが同名の `--plugin-dir` より先に読み込まれるため、リポジトリをそのままでは読み込めません。`scripts/dev.ts` は名前を変えたコピー `hanahira-claude-ui-dev` を `~/.claude/hanahira-dev/` に置き、保存のたびに同期します。

1. `~/.claude/settings.json` に `"env": { "CLAUDE_CODE_PLUGIN_DIRS": "/root/.claude/hanahira-dev/hanahira-claude-ui-dev", "CLAUDE_CODE_PLUGIN_DIR_WATCH": "1" }` を追加し（`/root` は自分のホームに）、`enabledPlugins` の `"hanahira-claude-ui-ssh@hanahira-ssh"` を `false` にします。そうしないとバンドが 2 つ表示されます。
2. `bun scripts/dev.ts` を起動したままにし、新しいセッションを一度開きます。再起動後も動かし続けるには `scripts/systemd/hanahira-claude-ui-dev.service` を入れます（手順はファイル冒頭）。
3. 保存したら、開いているセッションで `/reload-plugins` と入力すると読み込まれます。新しいセッションは不要です。Desktop のセッションはフォルダを自動では監視しません。SSH 経由で `CLAUDE_CODE_PLUGIN_DIR_WATCH` なしで起動され、`settings.json` のキーでは監視が有効にならないためです。やめるときは `env` の 2 つのキーを消し、`-ssh` を有効に戻します。

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

スキルはどちらの場合も 1 回だけ表示されます。claude.ai のアカウントにプラグインがあれば、スキルは Desktop が同期するコピーでいつもの `hanahira-claude-ui:` の名前のまま届き、このコピーに入るのは hooks だけです。アカウントにない場合は、スキルもこのコピーに入ります（`hanahira-claude-ui-ssh:` の名前）。この判定はスクリプト実行時に行われるため、アカウントのプラグインを追加・削除したら再実行してください。`HANAHIRA_SSH_SKILLS=1` または `0` で判定を上書きできます（同期されるコピーが古いバージョンのままのときは `1`）。

その後、Desktop で **新しいセッション** を開きます（開いているセッションには反映されません）。`git pull` で更新したら、もう一度 `scripts/install-ssh.sh` を実行してください。手元のマシン（ローカル）で使う場合はこの手順は不要で、方法 1 のままで動きます。

## 🔄 アップデート

新しいバージョンが出たら、**インストールした方法に合わせて** 更新します。更新後は **新しいセッション** を開いてください（開いているセッションには反映されません）。

### 🧰 一発で更新（`update.sh`）

コマンドを覚えなくても、次の 1 行でマーケットプレイス版を更新できます（SSH 接続先でクローン済みなら、`scripts/update.sh` が `git pull` と `install-ssh.sh` まで行います）。

```bash
curl -fsSL https://raw.githubusercontent.com/KBYSHanahira/ClaudeHanahiraUI/main/scripts/update.sh | bash
```

### マーケットプレイスから入れた場合（方法 1）

Claude Code の **ターミナル** で、次の 2 つを順に入力します。

```text
/plugin marketplace update hanahira-plugins
/plugin update hanahira-claude-ui@hanahira-plugins
```

または、`/plugin` を開いて **Marketplaces** → `hanahira-plugins` → **Update**、続けて **Installed** → `hanahira-claude-ui` → **Update** でも更新できます。

### ZIP / `.plugin` で入れた場合（方法 2）

最新の ZIP を入手し、もう一度 **設定 → Plugins → Upload a plugin** からアップロードします（上書きされます）。

### フォルダを指定している場合（方法 3）

そのフォルダで `git pull` するだけです。

```bash
cd /path/to/hanahira-claude-ui
git pull
```

### SSH 接続先の場合

**接続先のマシンで**、クローンしたフォルダを更新して、インストールスクリプトをもう一度実行します。

```bash
cd ClaudeHanahiraUI
git pull
scripts/install-ssh.sh
```

> 💡 バージョンは `.claude-plugin/plugin.json` の `version` で確認できます。更新したのに変わらないときは、Claude Code を一度終了して開き直してください。

---

## 🚀 使い方

インストール後は **設定不要** です。Claude Code を開くと、プロンプトの上にバンドが現れます。

| 表示 | 見方 |
| :-- | :-- |
| **ローディングバー** | 作業中は赤く光が流れ、ターンが終わると緑になります（停止・エラー時はグレー）。 |
| **状態チップ** | 作業中は赤い `working`、完了すると緑の `success`。最後まで終わらなかった場合は `error` か `stopped`。 |
| **`⚡ N tools`** | このプロンプトで呼ばれたツールの数。増えた瞬間にフラッシュします。 |
| **コンテキストスライダー** | 現在のコンテキストの使用率、残り量、ウィンドウ（例：`11% ━━○── context · 889k left · 1M window`）。 |
| **5時間 / 7日のリング** | 利用制限の消費率と、リセットまでの残り時間。アカウントが制限情報を返す場合のみ表示されます。 |
| **Cost** | エンジンが報告するセッション合計費用（`≈` つき）。 |
| **Tokens** | プラグインの読み込み後に数えた合計トークン。サブエージェント分を含み、キャッシュの読み書きも含みます。 |
| **Time** | 作業に費やした合計時間。 |
| **Hanahira スイッチ** | Hanahira Claude UI モードがオンの間は緑のオン、それ以外はグレーのオフ。 |
| **エージェントカード** | バンドの上に横並び。実行中は枠が脈打ち、完了すると緑に光って消えます。 |


> **トークン数が大きく見える理由：** Tokens は、モデルの応答ごとの入力・出力・キャッシュ読み込み・キャッシュ書き込みをすべて足した累計です。コンテキストが大きい長いセッションでは、同じ文脈が毎回キャッシュから読み直されるため、数億の値になります。キャッシュ読み込みは通常の入力よりずっと安価です。

---

## 🎛️ カスタマイズ

- `hooks/register.tsx` の `THEME.compact`（既定でオン）は、統計を 1 行ずつのゲージと数値の 2 段（列がそろう）で描き、高さをおよそ半分にします。`false` で従来のカードに戻ります。
- 色・アイコン・リングの大きさ・バーの長さ・カード表示数・完了カードの表示時間は、`hooks/register.tsx` 冒頭の `THEME` と `RING` で変更できます。
- ツール行の見た目は `hooks/chat.ts`、エージェントカードと価格表は `hooks/agents.ts`、アイコンは `hooks/icons.ts` です。
- ブロックするコマンドは `hooks/register.tsx` の `dangerous` で編集できます。
- 制限リングは、アカウントがレート制限を報告する場合だけ表示されます。

## 🧪 動作要件と注意

- 公式の Mod 機構（`hooks/hooks.json` の `modules`）を使うインターフェース Mod です。対応する Claude Code のビルドが必要です。
- 変更はターン終了時にホットリロードされます（SSH 経由の Desktop セッションでは代わりに `/reload-plugins` と入力します）。反映されないときは、会話ログの `reload failed` の行を確認してください。

## 🛠️ 開発

```bash
claude plugin validate /path/to/hanahira-claude-ui
claude --plugin-dir /path/to/hanahira-claude-ui
```

純粋関数は `hooks/chat.ts` などにまとめ、テスト（`hooks/*.test.ts`）があります。`bun test` で実行できます（`scripts/test-preload.ts` がエンジンのモジュールの代わりを務めます。`claude plugin test` のある CLI ではそちらでも）。構成：

```text
.claude-plugin/   plugin.json / marketplace.json
hooks/
  hooks.json      モジュールの登録
  register.tsx    フック本体（バンド・ログ・エージェント）
  chat.ts         表示用の純粋関数（SVG・書式・チャート）
  agents.ts       エージェントカード・価格表
  icons.ts        線アイコン一式
scripts/
  test-preload.ts bun test 用のエンジン代替モジュール
  preview.ts      docs/preview.svg を描く
  preview-chat.ts docs/preview-chat.svg を描く
  dev.ts          ホットリロード用の名前を変えたコピー
  systemd/        dev.ts を再起動後も動かし続ける
types/index.d.ts  状態（$.state）の型
```

---

<div align="center">

Made with 🌸 by **Hanahira**

[日本語](README.md) ｜ [English](README.en.md)

</div>
