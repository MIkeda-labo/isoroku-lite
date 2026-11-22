---
name: next
description: isoroku-lite の講座で、いまの手順ができたので次の手順に進む。
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" *)
---

# 次の手順へ

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" next --data "${CLAUDE_PLUGIN_DATA}"`

上は isoroku-lite の道具が出した結果です。

- 次の手順に進んだとき: 前の手順ができたことを一言ほめてから、新しい手順の「すること」と「なぜ」を短く説明する。操作はこの人にやってもらう。
- 最後まで終えたとき: 講座で身についたことを3つ以内でまとめ、次に向いている講座を1つ勧める。
- 講座を始めていないとき: 一覧から選んで「/isoroku-lite:start <id>」で始められると伝える。
