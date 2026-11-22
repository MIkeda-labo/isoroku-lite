---
name: stop
description: この作業フォルダの isoroku-lite の講座をやめ、見守りも止める。
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" *)
---

# 講座をやめる

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" stop --data "${CLAUDE_PLUGIN_DATA}"`

上の結果を伝えてください。これ以降、この作業フォルダでは、コーチとしての声かけをしません。
