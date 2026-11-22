# isoroku-lite

Claude Code の使い方を、**あなた自身の Claude Code がコーチする**プラグインです。
16 の講座（/goal、/loop、worktree、スキル作り、サブエージェント、計画モードで複雑な課題を仕上げる、など）を、1手順ずつ練習します。
練習中にエラーが続くと見守りが気づき、コーチ（同じ Claude）が**方向だけのヒント**で声をかけます。もっと知りたいときは、ヒントを「方向 → 具体例 → 答え」の順に1段ずつ深くできます。

- 画面共有はしません。外部のサーバー・API キー・ローカルの LLM も要りません。
- フックとスクリプトは、ネットワークを使いません。練習中の会話は、ふだんどおり、あなたの Claude Code だけが扱います。
- 講座を始めていない作業フォルダでは、何もしません（ふだんの作業の邪魔をしません）。

isoroku（VPS のコーチ・ローカルの Gemma・画面つき）を、プラグインだけで動く形にした軽い版です。

**はじめて使う人は [GETTING-STARTED.md](GETTING-STARTED.md)（何も入っていない PC から講座を始めるまでの手順）を、上から順に見てください。**

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

## 講座の一覧
講座を始めるときは、プロンプト欄に `/isoroku-lite:start` と打ち、続けて半角スペースと下の id を打ちます（例: `/isoroku-lite:start goal`）。

| id（`/isoroku-lite:start <id>`） | 講座 | 手順の数 |
|---|---|---|
| `subagents` | サブエージェントを1つ作って、仕事を任せる | 4 |
| `skill-creation` | Claude Code のスキルを1つ作る | 6 |
| `model-selection` | モデルを選ぶ・切り替える | 4 |
| `effort-level` | エフォートレベルを、作業に合わせて変える | 4 |
| `claude-design` | /design で、画面の下絵（デザイン）を作る | 3 |
| `session-naming` | セッションに名前を付けて、あとで戻る | 4 |
| `external-editor` | 長い依頼文を、エディタで書いて送る（Ctrl+G） | 4 |
| `claude-md` | CLAUDE.md に、いつも守ってほしいことを書く | 4 |
| `notifications` | 作業が終わったら知らせてもらう（通知設定） | 4 |
| `security-review` | /security-review で、変更の安全性を調べる | 4 |
| `loop` | /loop で、決まった間隔で同じ仕事を繰り返させる | 5 |
| `goal` | /goal で、終わりの条件を満たすまで続けさせる | 5 |
| `worktree` | ワークツリーで、作業場所を分けて並べて進める | 5 |
| `remote-control` | /remote-control で、PC の Claude Code をスマホから続ける | 5 |
| `loop-engineering` | 内側と外側のループを、小さく組む（ループエンジニアリング） | 6 |
| `complex-task` | 複雑な課題を「計画 → 確かめ → 作る → 見直す」で仕上げる | 6 |

isoroku-lite は、ターミナルの Claude Code（CLI）で使う前提です。どの講座も CLI で練習できます。

## しくみ
```
あなた ──操作──▶ Claude Code（作業の手伝い ＋ コーチ）
                     ▲ フックが足す文（additionalContext）
   SessionStart       … コーチの決まりと、いまの手順
   UserPromptSubmit   … いまの手順の短い念押し
   PostToolUse        … 成功したら「続いたエラー」を数え直す
   PostToolUseFailure … 5分以内にエラーが2回続いたら「方向のヒントで声をかけて」（一度言ったら3分は黙る）
                     ▲ モニターの通知（時間を区切る見守り）
   monitor.mjs        … 15秒ごとに会話の記録の末尾を読む（isoroku の判定を移したもの）
                        ・10分以内にエラーが2回 → 声をかけて
                        ・エラーのあと2分、何も起きていない → 声をかけて（フックでは気づけない「止まっている」）
```
- **見守り（モニター）**: `/isoroku-lite:start` を打つと起動し、セッションが終わるまで動きます（画面の下に「1 monitor」と出ます）。
  声をかけるときだけ1行を出し、それが通知として Claude に届きます。何も起きていなければ何も出さないので、トークンを使いません。
  声をかけないとき: 直近の道具が2回続けて成功した（解決した）／同じエラーにはもう声をかけた／前に声をかけた時刻より前のエラー（フックと共有）／前回から3分以内／直近1時間で6回。
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
- 対話の画面（tmux の中で `claude --plugin-dir …`）で、見守り（モニター）を:
  - `/isoroku-lite:start goal` でモニターが起動した（「1 monitor」）。`${CLAUDE_PLUGIN_DATA}`・`${CLAUDE_PROJECT_DIR}` も置き換わった。
    `when` は `on-skill-invoke:isoroku-lite:start`（名前空間つき）でないと起動しなかった。
  - `ls` の失敗を1回だけ起こして、2分あまり何もしない → 「Monitor event: isoroku-lite の見守り: エラーのあと、2分以上動きが止まっている…」が届き、
    **手の空いていた Claude が起きて**、こちらが何も打たないうちに、方向だけのヒントで声をかけた。
- テスト: `node --test plugins/isoroku-lite/tests/*.test.mjs`（18 件）。

## 限界・まだ確かめていないこと
- デスクトップ版（ローカルのセッション）、VS Code では、まだ試していません。モニターは `claude -p` では起動しません（公式）。
- コーチは作業する Claude と同じなので、isoroku のように「別の目」で見るわけではありません。声をかける条件は、エラーが続く・エラーのあと止まる、の2つだけです。
- `!` を付けてあなたが打ったコマンドで、フックが走るかは確かめていません。別のターミナルでした作業は見えません。
- 講座の中身は isoroku の下書きのままです（多くは録画・本物での通しがまだ）。
- ライセンス: MIT（LICENSE）。

## 出典（公式ドキュメント）
- プラグインの作り・`${CLAUDE_PLUGIN_ROOT}`・`${CLAUDE_PLUGIN_DATA}`・`bin/`・`claude plugin validate`: https://code.claude.com/docs/en/plugins-reference
- `--plugin-dir`: https://code.claude.com/docs/en/plugins
- フックの入力・`hookSpecificOutput.additionalContext`・PostToolUseFailure: https://code.claude.com/docs/en/hooks
- モニター（`monitors/monitors.json`・`when`・出した行が通知として Claude に届く・`-p` では起動しない）: https://code.claude.com/docs/en/plugins/components 、https://code.claude.com/docs/en/plugins-reference
- `/loop` ではなくモニターにした理由（「often more token-efficient and responsive than re-running a prompt on an interval」）: https://code.claude.com/docs/en/scheduled-tasks
- スキルの `` !`…` ``・`$ARGUMENTS`・`allowed-tools`・`disable-model-invocation`: https://code.claude.com/docs/en/skills
- マーケットプレイスと入れ方・Claude Code が取ってくること・更新と削除: https://code.claude.com/docs/en/plugin-marketplaces
- スコープ（user・project・local）: https://code.claude.com/docs/en/discover-plugins
- デスクトップ版でのプラグイン: https://code.claude.com/docs/en/desktop
