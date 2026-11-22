---
name: hint
description: isoroku-lite の講座で詰まったときに、ヒントを1段深くして出す（方向 → 具体例 → 答え）。
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" *)
---

# ヒント

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" hint --data "${CLAUDE_PLUGIN_DATA}"`

上は isoroku-lite の道具が出した結果です。「出し方」に書かれた段のとおりに、ヒントを1つだけ出してください。

- 段より深いこと（たとえば段1で答え）は出さない。
- 会話の流れ（直前のエラーや、この人の試したこと）があれば、それに合わせる。
- 最後に、まだ詰まっていればもう一度「/isoroku-lite:hint」で、もう1段深くなると伝える（段3のときは言わない）。
