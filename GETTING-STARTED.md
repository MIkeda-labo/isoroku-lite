# isoroku-lite をはじめから使う手順

何も入っていない PC から、講座を1つ始めるまでの手順です。上から順に進めます。
すでに入っているもの（git・Node.js・Claude Code）は、「入っているかを見る」で入っていれば、入れる手順を飛ばしてかまいません。

- ⌨ = 打つもの（打ったら Enter）　**結果** = 画面に出るもの　**目的** = なぜやるか
- 確かめた環境: Windows 11 の WSL2（Ubuntu）、Claude Code 2.1.330、Node.js v24、2026-11-22。macOS・Linux も同じ手順のはずですが、まだ試していません。
- Windows で WSL を使わない場合（PowerShell）は、まだ試していません。最後の「Windows（WSL なし）の場合」を見てください。

---

## 0. 先に用意するもの

- **Claude Code が使えるアカウント**（Pro・Max・Ultra・Team・Enterprise、または Console）。無料の claude.ai のプランでは、Claude Code は使えません。
- PC: 4GB 以上のメモリ。macOS 13.0 以上、Windows 10（1809）以上、Ubuntu 20.04 以上など。インターネットにつながっていること。
- 出典: https://code.claude.com/docs/en/setup

---

## A. ターミナルを開く

**1.** ターミナルを開きます。
- Windows（WSL）: スタートメニューで **Ubuntu** を選ぶ
- macOS: 「ターミナル」アプリを開く
- **目的**: 以降のコマンドを打つ画面を用意します。

---

## B. git を用意する

**2.** ⌨ `git --version`
- **結果**: `git version 2.…` と出れば、入っています。**手順4へ進みます**。
- 「command not found」などと出たら、手順3で入れます。
- **目的**: Claude Code は、GitHub からプラグインを取ってくるときに git を使います。

**3.** git を入れます。
- Ubuntu / Debian（WSL も同じ）: ⌨ `sudo apt-get install git`（パスワードを聞かれたら、Ubuntu のパスワードを入れる）
- macOS: ⌨ `xcode-select --install`（または Homebrew があれば `brew install git`）
- 入れたら、もう一度 ⌨ `git --version` で、版の番号が出ることを確かめます。
- 出典: https://git-scm.com/install/linux 、https://git-scm.com/install/mac

---

## C. Node.js を用意する

**4.** ⌨ `node --version`
- **結果**: `v24.…` のように出れば、入っています。**手順6へ進みます**。
- 「command not found」と出たら、手順5で入れます。
- **目的**: isoroku-lite の見守り（フック）と講座の道具は、Node.js で動きます。

**5.** Node.js を入れます。
- https://nodejs.org/en/download を開き、自分の PC（OS）を選んで、表示される方法で入れます。LTS と書かれた版を選びます（isoroku-lite は v24 で確かめました）。
- 入れたら、**ターミナルを開き直して**、⌨ `node --version` で版の番号が出ることを確かめます。

---

## D. Claude Code を用意する

**6.** ⌨ `claude --version`
- **結果**: `2.1.… (Claude Code)` と出れば、入っています。**手順9へ進みます**。
- 「command not found」と出たら、手順7で入れます。

**7.** Claude Code を入れます（macOS・Linux・WSL）。
- ⌨ `curl -fsSL https://claude.ai/install.sh | bash`
- **結果**: 入れ終わったことを知らせる文が出ます。
- 出典: https://code.claude.com/docs/en/setup

**8.** **ターミナルを開き直して**、⌨ `claude --version`
- **結果**: `2.1.… (Claude Code)` と出れば成功です。
- まだ「command not found」のときは、もう一度ターミナルを開き直します。それでもだめなら ⌨ `claude doctor` で、入れた状態を調べられます。

**9.** ⌨ `claude`
- **結果**: Claude Code の画面が開きます。はじめてのときは、ブラウザが開いてログインを求められるので、画面の案内に従ってログインします。
- **目的**: ログインして、Claude Code を使える状態にします。

---

## E. isoroku-lite を入れる

**フォルダを作ったり、`git clone` したりする必要はありません。** Claude Code が自分で GitHub から取ってきます。

**10.** 手順9で開いた Claude Code の**プロンプト欄**（いつも Claude に話しかける入力欄）に、⌨ 1行目を打って Enter:
```
/plugin marketplace add MIkeda-labo/isoroku-lite
```
- **結果**: 置き場所（マーケットプレイス）を足したことを知らせる表示が出ます。
- **目的**: 「isoroku-lite」という置き場所を、Claude Code に登録します。

**11.** 続けて、⌨ 2行目を打って Enter:
```
/plugin install isoroku-lite@isoroku-lite
```
- **結果**: プラグインを入れたことを知らせる表示が出ます。
- **目的**: 置き場所から、isoroku-lite を入れます。この PC の、あなたのすべての作業フォルダで使えるようになります。

**12.** ⌨ `/reload-plugins`
- **目的**: いま開いている Claude Code に、入れたプラグインを読み込ませます（Claude Code を開き直しても同じです）。

ターミナルで入れたいときは、手順9で `claude` を起動せずに、⌨ `claude plugin marketplace add MIkeda-labo/isoroku-lite` → ⌨ `claude plugin install isoroku-lite@isoroku-lite` と打ってもかまいません（結果は同じです）。

---

## F. 講座を始める

**13.** いまの Claude Code のターミナルのウィンドウを閉じて、新しいターミナルを開きます（手順1と同じ）。
- **目的**: 練習用のフォルダで Claude Code を開き直すためです。講座の状態と見守りは、作業フォルダごとに分かれます。ふだんの作業フォルダでは練習しません。

**14.** ⌨ `mkdir -p ~/practice/goal`
- **結果**: 何も出ません。
- **目的**: 練習専用のフォルダを作ります（ここでは講座「goal」の例。ほかの講座なら、手順17で出る目安のフォルダにします）。

**15.** ⌨ `cd ~/practice/goal`
- **結果**: 何も出ません。

**16.** ⌨ `claude`
- **結果**: Claude Code の画面が開きます。

**17.** プロンプト欄に ⌨ `/isoroku-lite:start`
- **結果**: 講座の一覧が出ます（16 講座）。
- `/isoroku-lite:start` が見つからないときは、⌨ `/reload-plugins` を打ってから、もう一度打ちます。

**18.** 始めたい講座の id を選んで、⌨ `/isoroku-lite:start` + 半角スペース + id を打ちます。講座「goal」なら、打つのはこれだけです:
```
/isoroku-lite:start goal
```
- **結果**: 「講座を始めた」と出て、コーチ（あなたの Claude Code）が手順1を案内します。
- 講座の id は次のとおりです（手順17の一覧と同じ）。

| id | 講座 |
|---|---|
| `subagents` | サブエージェントを1つ作って、仕事を任せる |
| `skill-creation` | Claude Code のスキルを1つ作る |
| `model-selection` | モデルを選ぶ・切り替える |
| `effort-level` | エフォートレベルを、作業に合わせて変える |
| `claude-design` | /design で、画面の下絵（デザイン）を作る |
| `session-naming` | セッションに名前を付けて、あとで戻る |
| `external-editor` | 長い依頼文を、エディタで書いて送る（Ctrl+G） |
| `claude-md` | CLAUDE.md に、いつも守ってほしいことを書く |
| `notifications` | 作業が終わったら知らせてもらう（通知設定） |
| `security-review` | /security-review で、変更の安全性を調べる |
| `loop` | /loop で、決まった間隔で同じ仕事を繰り返させる |
| `goal` | /goal で、終わりの条件を満たすまで続けさせる |
| `worktree` | ワークツリーで、作業場所を分けて並べて進める |
| `remote-control` | /remote-control で、PC の Claude Code をスマホから続ける |
| `loop-engineering` | 内側と外側のループを、小さく組む（ループエンジニアリング） |
| `complex-task` | 複雑な課題を「計画 → 確かめ → 作る → 見直す」で仕上げる |

- 練習用のフォルダの目安がいまのフォルダと違うと言われたら、そのフォルダで手順13からやり直します。

---

## G. 講座の進め方

| 打つもの | すること |
|---|---|
| `/isoroku-lite:next` | いまの手順ができたので、次の手順へ |
| `/isoroku-lite:hint` | 詰まったとき。打つたびにヒントが深くなる（1 方向 → 2 具体例 → 3 答え） |
| `/isoroku-lite:status` | 進み具合を見る |
| `/isoroku-lite:stop` | この作業フォルダの講座をやめる（見守りも止まる） |

- 講座で練習する操作（コマンドやモードの切り替え）は、あなた自身が打ちます。コーチは先回りしてやりません。
- 練習中にエラーが続くと、見守りが気づき、コーチが「方向」のヒントで声をかけます。
- 講座を始めていないフォルダでは、isoroku-lite は何もしません。

---

## H. 更新する・消す（ターミナルで）

| すること | 打つもの |
|---|---|
| 新しい版があるか取ってくる | `claude plugin marketplace update isoroku-lite` |
| プラグインを新しい版にする | `claude plugin update isoroku-lite@isoroku-lite` |
| プラグインを外す | `claude plugin uninstall isoroku-lite@isoroku-lite` |
| 置き場所ごと消す（入れたプラグインも外れる） | `claude plugin marketplace remove isoroku-lite` |

出典: https://code.claude.com/docs/en/plugin-marketplaces

---

## 困ったとき

- **`claude` が「command not found」**: ターミナルを開き直します。だめなら `claude doctor`（手順8）。
- **`/isoroku-lite:start` が出てこない**: `/reload-plugins` を打つか、Claude Code を開き直します。それでも出ないときは、ターミナルで ⌨ `claude plugin list` を打ち、`isoroku-lite@isoroku-lite` が「enabled」になっているかを見ます。
- **講座の案内が出ず、エラーの文が出る**: ⌨ `node --version` で Node.js が入っているかを見ます（手順4）。
- **デスクトップ版の WSL のセッション**: プラグインが使えません（公式の制限。https://code.claude.com/docs/en/desktop ）。ターミナルの Claude Code で使ってください。

## Windows（WSL なし）の場合（まだ試していません）

- Claude Code は PowerShell で ⌨ `irm https://claude.ai/install.ps1 | iex` で入れられます（https://code.claude.com/docs/en/setup ）。
- git は Git for Windows（https://git-scm.com/install/windows ）、Node.js は https://nodejs.org/en/download の Windows Installer（.msi）で入れます。
- 手順14・15は、PowerShell なら ⌨ `mkdir ~\practice\goal` → ⌨ `cd ~\practice\goal` になります。
- この組み合わせで isoroku-lite が動くかは、まだ確かめていません。
