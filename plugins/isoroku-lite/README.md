# isoroku-lite

Claude Code の使い方を、あなた自身の Claude Code がコーチするプラグインです。16 の講座を1手順ずつ練習し、エラーが続くと見守りが気づいて、方向だけのヒントで声をかけます。ヒントは「方向 → 具体例 → 答え」の順に深くできます。画面共有・外部のサーバー・API キーは使いません。Node.js が要ります。

使い方: 練習用のフォルダで Claude Code を開き、`/isoroku-lite:start` で講座を選びます。手順ができたら `/isoroku-lite:next`、詰まったら `/isoroku-lite:hint`、進み具合は `/isoroku-lite:status`、やめるときは `/isoroku-lite:stop`。

くわしい説明（しくみ・確かめたこと・限界・出典）は、リポジトリの根の README.md にあります。

## English

isoroku-lite turns your own Claude Code into a coach that teaches you how to use Claude Code. It ships 16 step-by-step lessons (in Japanese). Hooks watch for repeated tool errors during a lesson and ask Claude to give a direction-only hint; `/isoroku-lite:hint` deepens the hint from direction, to example, to answer. It needs Node.js, uses no screen sharing, no external server, no API key, and its hooks make no network requests. Hooks do nothing in folders where no lesson has been started.
