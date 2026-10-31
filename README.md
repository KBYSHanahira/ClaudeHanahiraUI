<div align="center">

# 🌸 Hanahira Claude UI

**Claude Code をひと目で読めるダッシュボードに。そして、頼れる先輩のような働き方を。**

[![Language: 日本語](https://img.shields.io/badge/lang-日本語-e8825f?style=for-the-badge)](README.md)
[![Language: English](https://img.shields.io/badge/lang-English-9b8cf7?style=for-the-badge)](README.en.md)

![Claude Code plugin](https://img.shields.io/badge/Claude_Code-plugin-9b8cf7?style=flat-square)
![Version](https://img.shields.io/badge/version-1.13.0-34c38f?style=flat-square)
![Skills](https://img.shields.io/badge/skills-Version_25-e8825f?style=flat-square)
![Interface mod](https://img.shields.io/badge/type-interface_mod-4aa3f0?style=flat-square)

**🇯🇵 日本語（このページ）** ｜ [🇬🇧 English](README.en.md)

<img src="docs/preview.png" alt="Hanahira Claude UI のステータスバンド：エージェントカード、上の行のチップ、コンテキストメーター、2 段の統計" width="900">

</div>

---

ひとつのプラグインに 2 つの部分があります。

- **🖥️ インターフェース** — プロンプトの上のステータスバンド（コンテキスト、利用制限、費用、トークン、速度、エージェント）と、コード変更をその場で見せるカード風の会話ログ。常にオンで、設定は不要です。
- **🧠 スキル** — *Hanahira Claude UI モード*。自分でオンにする働き方で、Claude はタスクの大きさを見極め、必要なときだけ質問し、「完了」と言う前に確認し、事実を削らずに短く答えます。データ・デザイン・セキュリティ・デバッグ・新規プロジェクト向けの 5 つのコンパニオンがルールを加えます。

## 🚀 クイックスタート

Claude Code の **ターミナル** で（デスクトップアプリのチャット欄ではありません）：

```text
/plugin install hanahira-claude-ui --marketplace KBYSHanahira/ClaudeHanahiraUI
```

マーケットプレイスの追加に `y` と答え、**User scope** を選んでから、新しいセッションを開きます。プロンプトの上にバンドが現れます。働き方のモードをオンにするには `/Hanahira Claude UI on` を送ります。

SSH 接続先を含むほかの入れ方：[📦 インストール](#-インストール)

---

## 🖥️ インターフェース

### ステータスバンド

| | 部分 | 表示内容 |
| :-: | :-- | :-- |
| 📊 | **上の行** | プロジェクト、git ブランチ、ローディングバー（作業中は赤、ターン完了で緑、停止・失敗はグレー）、ターンの時計、状態チップ（`working` → `success`、または `error` / `stopped`）、このプロンプトのツール呼び出し数（`⚡ 8 tools`）、バージョン。 |
| ▮▮▮ | **コンテキストスライダー** | コンテキスト使用率を大きな数字で、残り量とウィンドウサイズも表示。85% を超えると数字が赤くなります。 |
| ⭕ | **リングゲージ** | 5 時間制限、7 日制限、モデル速度（tok/s）。制限にはリセットまでの時間（`resets in 3h 20m`）が出ます。アカウントがレート制限を報告する場合だけ表示されます。 |
| 💰 | **合計** | 費用（エンジンの報告値、`≈` つき）、トークン、作業時間、モデル。 |
| 🤖 | **エージェントカード** | バックグラウンドのサブエージェントを横並びのカードで表示：モデル、effort、ツール数、トークン、概算費用。完了したカードは約 3 秒チェックを見せて消えます。 |
| 🔘 | **Hanahira スイッチ** | Hanahira Claude UI モードがオンの間は緑、それ以外はグレー。 |

バージョン表示は、どのスキルのコピーを使っているかも示します：`v1.13.0 Account`（claude.ai のアカウントから同期）または `v1.13.0 SSH`（`install-ssh.sh` で SSH 接続先に入れたもの）。

> **正直さの原則：** エージェントカードの表示はすべて実際の値です。モデル名は API が返したもの、effort はエンジンが送った値だけで、不明なものは推測せず省略するか `model pending` と表示します。エージェントごとの費用は `hooks/agents.ts` の価格表からの **概算** で、`≈` を付けています。

> **トークン数が大きく見える理由：** Tokens は応答ごとの入力・出力・キャッシュ読み込み・キャッシュ書き込みをすべて足した累計です。長いセッションでは同じ文脈が毎回キャッシュから読み直されるため、数億になります。キャッシュ読み込みは通常の入力よりずっと安価です。

### 会話ログ

<div align="center">

<img src="docs/preview-chat.svg" alt="Hanahira Claude UI の会話ログ：自分のカード、種類タイルと状態ピルつきのツール行、差分つきの編集、削除、まとめられた実行、実行中の呼び出し、タスク通知、エラー" width="780">

</div>

- **すべての行が同じ形** — ツール呼び出し、まとめられた実行、バックグラウンドタスク：種類タイル、色付きの動詞、対象（ファイルは等幅）、状態ピル（緑の `Done`、赤の `Error`、紫の `Running`）、所要時間。自分のメッセージはバンドと同じ枠のカードです。
- **コード変更をその場で表示** — Edit・Write は行のすぐ下に差分を表示：行番号つき、追加は緑、削除は赤、飛ばした所は `⋯`、ピルは `+N` / `−N`。全体表示（ctrl+o）はエンジン本来の表示のままです。
- **削除は目立つように** — `rm` は赤い **Delete** 行になります。

### 動き

値が変わるとスロットのリールのように切り替わり、リングとコンテキストスライダーは新しい値へなめらかに動き、tok/s の針はストリームに合わせて振れ、作業中はローディングバーと実行中のエージェントカードが動きます。すべて各画像内の CSS で、画面のフレームレートで再生されます。再描画でやり直しや点滅は起きず、「視差効果を減らす」設定では止まります。会話ログの行は静止のままです。

### 安全ガード

Compose のボリュームを削除する Bash コマンド（`docker compose down -v` / `--volumes`、`docker-compose` も）と `ufw enable` を、実行前にブロックします。

---

## 🧠 スキル — Hanahira Claude UI モード

このモードは **自分でオンにするもの** です。タスクの種類、ファイル、メモリ、貼り付けたテキストで勝手にオンになることはなく、頼んだときだけオンになり、オフにするか新しいチャットを始めるまで続きます。オンの間は毎回の返答が緑のバナーで始まり、長いチャットや要約のあともモードが続きます。

| コマンド | 内容 |
| :-- | :-- |
| `/Hanahira Claude UI on` | オン（標準レベル）。どの言語の「Hanahira Claude UI をオンにして」でも、スキル自身のスラッシュコマンド（`/hanahira-claude-ui`）でも同じです。 |
| `/Hanahira Claude UI ultra` | ウルトラレベルでオン：答えを要点だけに絞ります。ただし行動に必要な情報は削りません。 |
| `/Hanahira Claude UI status` | オンかどうかと、そのレベルを表示。 |
| `/Hanahira Claude UI off` | オフ。 |

**オンの間に変わること**

- **大きさに合わせた進め方** — 簡単な質問には答えだけ、元に戻せる数ステップなら 1 行の計画、ビルド・マイグレーション・元に戻せない作業は計画を見せて了承を得てから。
- **質問は必要なときだけ** — 読み取りと頼まれた編集はすぐ実行。実際のシステムを変える操作（サービス、DB への書き込み、ファイアウォール、`sudo`、ファイル削除、push）は了承を待ちます。質問は 1 回の返答に 1 つまで、選ぶつもりの既定値つき。
- **完了 ＝ 確認済み** — 最後の変更のあとに確認を実行するまで「直りました」「動くはずです」とは言いません。
- **短く、でも曖昧にしない** — 答えが先、編集は `file:line — 何を — なぜ`、正確な値はそのまま。
- **あなたの言語で** — タスクリストや要約も含め、読む文はすべて、あなたが書いた言語に合わせます。
- **作業に合ったヘルパー** — 検索、長いビルド、レビュー、調査はヘルパーエージェントに任せ、モデルと effort を作業ごとに選びます。あなたが決めるべきことは手放しません。

**コンパニオン** はモードがオンの間、自動で加わります。バナーには、その返答に使われたものが並びます。

| コンパニオン | 対象 |
| :-- | :-- |
| **Data** | MySQL、PostgreSQL、SQLite、SQL Server、MongoDB — クエリ、マイグレーション、バックアップ、インデックス、一括更新 |
| **Design** | 見た目の方向性、配色、書体（タイ語の組版を含む）、レスポンシブレイアウト、デザイントークン、CSS、描画の確認 |
| **Security** | TLS と証明書、ファイアウォールとポート、認証とセッション、シークレット、ヘッダー、不安定な接続 |
| **Debug-Test** | バグの再現、根本原因、ログとトレース、不安定なテスト、修正の証明 |
| **Project-Create** | Bun 上の Hono + Vite + TypeScript プロジェクトを、ホストの MySQL につながる 1 つの Docker コンテナで。既存プロジェクトのコンテナ化も |

---

## 📦 インストール

| 方法 | こんなとき | 手順 |
| :-- | :-- | :-- |
| **1. マーケットプレイス**（おすすめ） | ほとんどの人 | ターミナルで `/plugin install hanahira-claude-ui --marketplace KBYSHanahira/ClaudeHanahiraUI`。User scope で入れると、同じマシンのデスクトップアプリのセッションでも読み込まれます。 |
| **2. ZIP / `.plugin`** | ターミナルを使わない | **設定 → Plugins → Upload a plugin** で `hanahira-claude-ui.zip`（または `.plugin`）を選びます。 |
| **3. フォルダを指定** | お試し、開発 | `claude --plugin-dir /path/to/hanahira-claude-ui`。常に使うなら `export CLAUDE_CODE_PLUGIN_DIRS=/path/to/hanahira-claude-ui`。 |

> 🔒 **プライベート** リポジトリの場合、そのマシンが GitHub にアクセスできる状態でサインインしている必要があります（`gh auth login` または SSH キー）。

### 🌐 SSH 接続で使う（Claude Code Desktop）

Desktop で SSH 接続すると、Claude Code は **接続先のマシン** で動きます。Desktop はプラグインを接続先へ同期しますが **`hooks/` フォルダは含まれず**、同じ名前の空のコピーが通常のインストールを隠すため、バンドが表示されません。そこで接続先には別名 `hanahira-claude-ui-ssh` のコピーを入れます。**接続先のマシンで：**

```bash
git clone https://github.com/KBYSHanahira/ClaudeHanahiraUI.git
cd ClaudeHanahiraUI
scripts/install-ssh.sh
```

その後、Desktop で **新しいセッション** を開きます。

- **スキルはこのクローンのもの**（`hanahira-claude-ui-ssh:` の名前）になり、SSH セッションでは開発中のバージョンが動きます。スクリプトはアカウントから同期されるコピー（`hanahira-claude-ui@inline`）をこのホストでだけ無効にするので、スキルは 1 回だけ表示されます。手元のマシンのセッションでは、これまでどおりアカウントのコピーが使われます。
- **どのコピーかはひと目でわかります** — バンドのバージョン表示は `v1.13.0 SSH`、スキルのバナーは `V25 · SSH` になります。
- **`HANAHIRA_SSH_SKILLS=0 scripts/install-ssh.sh`** で元に戻せます（ここは hooks だけ、スキルはアカウントから）。

手元のマシンで使う場合はこの手順は不要で、方法 1 のままで動きます。

## 🔄 アップデート

どの方法で入れた場合も、この 1 行で更新できます（クローンのある SSH 接続先では `git pull` と `install-ssh.sh` も実行します）：

```bash
curl -fsSL https://raw.githubusercontent.com/KBYSHanahira/ClaudeHanahiraUI/main/scripts/update.sh | bash
```

手動で更新する場合：

| 入れ方 | 更新方法 |
| :-- | :-- |
| マーケットプレイス | `/plugin marketplace update hanahira-plugins` のあと `/plugin update hanahira-claude-ui@hanahira-plugins`（または `/plugin` → **Marketplaces** → **Update**、続けて **Installed** → **Update**） |
| ZIP / `.plugin` | 最新のファイルを **設定 → Plugins → Upload a plugin** からもう一度アップロード |
| フォルダ | そのフォルダで `git pull` |
| SSH 接続先 | クローンで `git pull` のあと `scripts/install-ssh.sh` |

更新後は **新しいセッション** を開いてください（開いているセッションには反映されません）。変わらないときは Claude Code を一度終了して開き直します。入っているバージョンは `.claude-plugin/plugin.json` の `version` です。

---

## 🎛️ カスタマイズ

| 変えたいもの | 編集する場所 |
| :-- | :-- |
| コンパクトなバンド（1 行ゲージの 2 段、既定でオン）か、従来のカードか | `hooks/register.tsx` の `THEME.compact` |
| 色、アイコン、リングの大きさ、バーの長さ、エージェントカードの数と完了カードの表示時間 | `hooks/register.tsx` 冒頭の `THEME` と `RING` |
| ブロックするコマンド | `hooks/register.tsx` の `dangerous` |
| 会話ログの行の見た目 | `hooks/chat.ts` |
| エージェントカードと価格表 | `hooks/agents.ts` |
| アイコン | `hooks/icons.ts` |

## 🧪 動作要件

- インターフェース mod（`hooks/hooks.json` の `modules`）に対応した Claude Code。
- 変更はターンの終わりにホットリロードされます。SSH 接続の Desktop セッションでは `/reload-plugins` と入力してください。読み込まれないときは、会話ログに `reload failed` の行がないか確認します。

## 🛠️ 開発

```bash
bun test                                        # 単体テスト（hooks/*.test.ts、scripts/repo.spec.ts）
claude plugin validate /path/to/hanahira-claude-ui
bun scripts/preview.ts                          # docs/preview.svg と .png を描き直す
bun scripts/preview-chat.ts                     # docs/preview-chat.svg を描き直す
```

`scripts/test-preload.ts` は `bun test` でエンジンのモジュールの代わりをします。`scripts/repo.spec.ts` は `plugin.json`・`hooks/version.ts`・プレビューのバージョンが一致していることを確かめ、`install-ssh.sh` が書き換える文字列を固定しています。

<details>
<summary><b>SSH 接続先でのホットリロード（Desktop）</b></summary>

Desktop は空の `hanahira-claude-ui` をすべてのセッションに同期し、それが同じ名前の `--plugin-dir` より先に読み込まれるため、リポジトリをそのまま読み込むことはできません。`scripts/dev.ts` は名前を変えたコピー `hanahira-claude-ui-dev` を `~/.claude/hanahira-dev/` に置き、保存のたびに同期します。

1. `~/.claude/settings.json` に `"env": { "CLAUDE_CODE_PLUGIN_DIRS": "/root/.claude/hanahira-dev/hanahira-claude-ui-dev", "CLAUDE_CODE_PLUGIN_DIR_WATCH": "1" }` を追加し（`/root` は自分のホームに）、`enabledPlugins` で `"hanahira-claude-ui-ssh@hanahira-ssh": false` にします。そうしないとバンドが 2 つ描かれます。
2. `bun scripts/dev.ts` を起動したままにして、新しいセッションを一度開きます。再起動後も動かし続けるには `scripts/systemd/hanahira-claude-ui-dev.service` を入れます（手順はファイル冒頭）。
3. 保存したら、開いているセッションで `/reload-plugins` と入力します。SSH 接続の Desktop セッションは、フォルダを自動では監視しません。

やめるときは `env` の 2 つのキーを消し、`-ssh` をオンに戻します。

</details>

```text
.claude-plugin/     plugin.json、marketplace.json
hooks/
  hooks.json        モジュールの登録
  register.tsx      フック本体：バンド、会話ログ、エージェント、安全ガード
  chat.ts           表示用の純粋関数（SVG、書式、チャート）
  agents.ts         エージェントカード、価格表
  icons.ts          線画アイコン
  version.ts        バンドに表示するバージョン
skills/
  hanahira-claude-ui/                 モード本体とその references/
  hanahira-claude-ui-data/            コンパニオン：データ、デザイン、
  hanahira-claude-ui-design/          セキュリティ、デバッグ・テスト、
  hanahira-claude-ui-security/        プロジェクト作成
  hanahira-claude-ui-debug-test/
  hanahira-claude-ui-project-create/
scripts/
  install-ssh.sh    SSH 接続先へのインストール
  update.sh         1 コマンドでアップデート
  dev.ts            ホットリロード用の名前を変えたコピー（systemd/ で常駐）
  preview.ts        docs/preview.svg / .png を描く
  preview-chat.ts   docs/preview-chat.svg を描く
  test-preload.ts   bun test 用のエンジンの代役
types/index.d.ts    状態（$.state）の形
```

---

<div align="center">

Made with 🌸 by **Hanahira**

[日本語](README.md) ｜ [English](README.en.md)

</div>
