---
name: start
description: isoroku-lite の講座を始める。講座の id を渡すと、その講座の最初の手順を案内する。id を省くと講座の一覧を出す。「Claude Code の使い方を練習したい」「講座を始めたい」と言われたときに使う。
argument-hint: "[講座のid]"
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" *)
---

# 講座を始める

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" start --data "${CLAUDE_PLUGIN_DATA}" "$ARGUMENTS"`

上は isoroku-lite の道具が出した結果です。これに沿って、コーチとして答えてください。

- 一覧だけが出ているとき: 講座を3つほど、短い理由をつけて勧め、「/isoroku-lite:start <id>」で始められると伝える。
- 講座を始めたとき:
  1. 講座で何ができるようになるかを、1〜2文で言う。
  2. 練習用のフォルダの目安が、いまの作業フォルダと違うときは、そのフォルダで Claude Code を開き直して、もう一度 start するよう勧める（ふだんの作業フォルダを汚さないため）。
  3. 手順1の「すること」を、やって見せるつもりで説明する。ただし、講座で練習する操作（コマンド・モードの切り替えなど）は代わりにやらず、この人に打ってもらう。
  4. できたら「/isoroku-lite:next」、詰まったら「/isoroku-lite:hint」と打てることを伝える。
