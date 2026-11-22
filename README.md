# isoroku-lite

Claude Code の使い方を、**あなた自身の Claude Code がコーチする**プラグインです。
16 の講座（/goal、/loop、worktree、スキル作り、サブエージェント、計画モードで複雑な課題を仕上げる、など）を、1手順ずつ練習します。
練習中にエラーが続くと見守りが気づき、コーチ（同じ Claude）が**方向だけのヒント**で声をかけます。もっと知りたいときは、ヒントを「方向 → 具体例 → 答え」の順に1段ずつ深くできます。

- 画面共有はしません。外部のサーバー・API キー・ローカルの LLM も要りません。
- フックとスクリプトは、ネットワークを使いません。練習中の会話は、ふだんどおり、あなたの Claude Code だけが扱います。
- 講座を始めていない作業フォルダでは、何もしません（ふだんの作業の邪魔をしません）。

isoroku（VPS のコーチ・ローカルの Gemma・画面つき）を、プラグインだけで動く形にした軽い版です。

## 要るもの
- Claude Code（2.1.330 で確かめた）
- Node.js（フックとスキルの道具を動かすため。v24 で確かめた。`node --version` で入っているか見られる）
- git（Claude Code が GitHub から取ってくるのに使う。git が入った PC で確かめた）

## 入れ方（ほかの PC で、はじめて入れるとき）

**フォルダを作ったり、`git clone` したりする必要はありません。** 次の2行を打つと、Claude Code が自分で GitHub から取ってきて、自分の置き場所に入れます。

**1.** どこでもよいので Claude Code を起動し（ターミナルで `claude`）、プロンプト欄に1行ずつ打って Enter:
```
/plugin marketplace add MIkeda-labo/isoroku-lite
/plugin install isoroku-lite@isoroku-lite
```
- 1行目で「isoroku-lite という置き場所（マーケットプレイス）」を登録し、2行目でそこからプラグインを入れます。
- ターミナルで打つときは、`/` の代わりに頭に `claude` を付けます（`claude plugin marketplace add MIkeda-labo/isoroku-lite`、`claude plugin install isoroku-lite@isoroku-lite`）。
- 何もしなければ、その PC のあなたのすべての作業フォルダで使えるように入ります（user スコープ）。

**2.** 起動中の Claude Code ですぐに出てこないときは、`/reload-plugins` を打つか、Claude Code を開き直します。

**3.** 練習用のフォルダを作って、そこで Claude Code を開き、`/isoroku-lite:start` を打ちます（下の「使い方」）。

**どこに入るか**（自分で触る必要はありません）: Claude Code の設定フォルダ（ふつうは `~/.claude`）の中の `plugins/marketplaces/isoroku-lite/`（GitHub から取ってきた写し）と `plugins/cache/isoroku-lite/` です。講座の進み具合は `plugins/data/` の下に置かれます。

### 更新・削除
| すること | 打つもの（ターミナル） |
|---|---|
| 新しい版があるか取ってくる | `claude plugin marketplace update isoroku-lite` |
| プラグインを新しい版にする | `claude plugin update isoroku-lite@isoroku-lite` |
| プラグインを外す | `claude plugin uninstall isoroku-lite@isoroku-lite` |
| 置き場所ごと消す（入れたプラグインも外れる） | `claude plugin marketplace remove isoroku-lite` |

### 入れずに試す・手元のフォルダから入れる（作る人向け）
- このリポジトリを手元に持っているなら、`claude --plugin-dir ./isoroku-lite/plugins/isoroku-lite` で、入れずにそのときだけ読み込めます。
- 手元のフォルダを置き場所として登録するなら、`claude plugin marketplace add ./isoroku-lite` → `claude plugin install isoroku-lite@isoroku-lite`。

### 使えない場所
- デスクトップ版の **WSL のセッション**では、プラグインが使えません（公式の制限: 「Plugins aren't available in WSL sessions.」 https://code.claude.com/docs/en/desktop ）。
- デスクトップ版のローカルのセッション、VS Code では、まだ試していません。

## 使い方
練習用のフォルダで Claude Code を開いてから使います（講座ごとに目安のフォルダが出ます。例: `~/practice/goal`）。

| 打つもの | すること |
|---|---|
| `/isoroku-lite:start` | 講座の一覧を出す |
| `/isoroku-lite:start goal` | 講座を始める（手順1の案内） |
| `/isoroku-lite:next` | いまの手順ができたので、次へ |
| `/isoroku-lite:hint` | ヒントを1段深くする（1 方向 → 2 具体例 → 3 答え。手順ごとに数え直す） |
| `/isoroku-lite:status` | 進み具合 |
| `/isoroku-lite:stop` | この作業フォルダの講座をやめる（見守りも止まる） |

## しくみ
```
あなた ──操作──▶ Claude Code（作業の手伝い ＋ コーチ）
                     ▲ フックが足す文（additionalContext）
   SessionStart       … コーチの決まりと、いまの手順
   UserPromptSubmit   … いまの手順の短い念押し
   PostToolUse        … 成功したら「続いたエラー」を数え直す
   PostToolUseFailure … 5分以内にエラーが2回続いたら「方向のヒントで声をかけて」（一度言ったら3分は黙る）
```
- 状態は `${CLAUDE_PLUGIN_DATA}/state.json` に、作業フォルダごとに置きます（講座・手順・ヒントの段・最近のエラー）。
- 講座は `plugins/isoroku-lite/lessons/*.json`（正本は isoroku の `lessons/`。写して使う）。
- スキルは、本文の `` !`node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" …` `` で状態を変え、その結果を Claude に渡します。
  許すコマンドは `allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" *)` だけです。
- ユーザーが止めた失敗（`is_interrupt`）は数えません。フックはどんなときも終了コード 0 で終わります。

## 確かめたこと（2026-11-22、Claude Code 2.1.330）
- `claude plugin validate`: プラグイン・マーケットプレイスとも「Validation passed」。
- 本物の Claude Code（`claude -p --plugin-dir …`）で:
  - `/isoroku-lite:start goal` → 状態ができ、コーチが手順1を案内した（練習フォルダの違いにも気づいた）。
  - `ls` の失敗を2回続けさせる → フックが2件記録し、返事の終わりに「コーチから一言」（方向のヒントと `/isoroku-lite:hint` の案内）が出た。
- テスト: `node --test plugins/isoroku-lite/tests/*.test.mjs`（11 件）。

## 限界・まだ確かめていないこと
- 対話の画面（`claude` をふつうに起動）、デスクトップ版、VS Code では、まだ試していません。
- コーチは作業する Claude と同じなので、isoroku のように「別の目」で見るわけではありません。声をかける条件も、いまはエラーだけです。
- `!` を付けてあなたが打ったコマンドで、フックが走るかは確かめていません。別のターミナルでした作業は見えません。
- 講座の中身は isoroku の下書きのままです（多くは録画・本物での通しがまだ）。
- ライセンス: MIT（LICENSE）。

## 出典（公式ドキュメント）
- プラグインの作り・`${CLAUDE_PLUGIN_ROOT}`・`${CLAUDE_PLUGIN_DATA}`・`bin/`・`claude plugin validate`: https://code.claude.com/docs/en/plugins-reference
- `--plugin-dir`: https://code.claude.com/docs/en/plugins
- フックの入力・`hookSpecificOutput.additionalContext`・PostToolUseFailure: https://code.claude.com/docs/en/hooks
- スキルの `` !`…` ``・`$ARGUMENTS`・`allowed-tools`・`disable-model-invocation`: https://code.claude.com/docs/en/skills
- マーケットプレイスと入れ方・Claude Code が取ってくること・更新と削除: https://code.claude.com/docs/en/plugin-marketplaces
- スコープ（user・project・local）: https://code.claude.com/docs/en/discover-plugins
- デスクトップ版でのプラグイン: https://code.claude.com/docs/en/desktop
