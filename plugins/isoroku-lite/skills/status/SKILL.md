---
name: status
description: isoroku-lite の講座の進み具合（講座・手順・ヒントの段・続いているエラー）を見る。
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" *)
---

# 進み具合

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" status --data "${CLAUDE_PLUGIN_DATA}"`

上の結果を、そのまま短く伝えてください。付け足すのは「次に何をすればいいか」の1文だけにします。
