// isoroku-lite の中身（依存なし）。講座・状態・見守りの判定・コーチへの指示文。
// コーチは、使う人自身の Claude Code（同じセッション）。ここは「何を Claude に渡すか」だけを決める。
// ネットワークは使わない。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const HINT_LEVELS = ['方向', '具体例', '答え'];

export const DEFAULT_CONFIG = {
  /** この回数だけエラーが続いたら、声をかける。 */
  errorsToSpeak: 2,
  /** この時間より古いエラーは数えない。 */
  windowMs: 5 * 60 * 1000,
  /** 一度声をかけたら、この時間は黙る。 */
  cooldownMs: 3 * 60 * 1000,
};

const LESSON_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function isLessonId(id) {
  return typeof id === 'string' && LESSON_ID.test(id);
}

// ---------- 講座 ----------

/** lessons/*.json を order の順に読む。形の壊れたものは飛ばす。 */
export function loadLessons(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    try {
      const l = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (isLessonId(l.id) && typeof l.title === 'string' && Array.isArray(l.steps) && l.steps.length > 0) out.push(l);
    } catch {
      // 壊れた講座は出さない
    }
  }
  return out.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.id.localeCompare(b.id));
}

// ---------- 状態（作業フォルダごと） ----------

export function dataDir(env = process.env) {
  return env.ISOROKU_LITE_DATA || env.CLAUDE_PLUGIN_DATA || path.join(os.homedir(), '.isoroku-lite');
}

/** 作業フォルダの名前をそろえる（末尾の / や、Windows の大文字小文字の違いで別物にならないように）。 */
export function projectKey(dir) {
  const p = path.resolve(dir);
  return process.platform === 'win32' ? p.toLowerCase() : p;
}

export function readState(dir) {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
    if (s && typeof s === 'object' && s.projects && typeof s.projects === 'object') return s;
  } catch {
    // 無い・壊れている → 空から
  }
  return { version: 1, projects: {} };
}

/** 途中で切れても壊れないように、別名で書いてから置き換える。 */
export function writeState(dir, state) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'state.json');
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}

function freshEntry(lessonId, now) {
  return { lessonId, step: 0, hintLevel: 0, startedAt: now, errors: [], lastSpokeAt: null, done: false };
}

export function startLesson(state, key, lesson, now) {
  state.projects[key] = freshEntry(lesson.id, now);
  return state.projects[key];
}

export function currentStep(lesson, entry) {
  return lesson.steps[Math.min(entry.step, lesson.steps.length - 1)];
}

/** 次の手順へ。最後の手順の次は「終わり」。ヒントの段は手順ごとに数え直す。 */
export function nextStep(lesson, entry) {
  entry.hintLevel = 0;
  entry.errors = [];
  if (entry.step >= lesson.steps.length - 1) {
    entry.done = true;
    return null;
  }
  entry.step += 1;
  return lesson.steps[entry.step];
}

/** ヒントを1段深くする（方向 → 具体例 → 答え。答えより先には進まない）。返すのは、いまの段（1〜3）。 */
export function deepenHint(entry) {
  entry.hintLevel = Math.min(entry.hintLevel + 1, HINT_LEVELS.length);
  return entry.hintLevel;
}

// ---------- 見守りの判定 ----------

/** 道具が成功した: 「続いたエラー」を数え直す。 */
export function onToolSuccess(entry) {
  entry.errors = [];
}

/**
 * 道具が失敗した: 記録して、声をかけるかを決める。
 * ユーザーが止めた失敗（is_interrupt）は数えない。
 */
export function onToolFailure(entry, failure, now, cfg = DEFAULT_CONFIG) {
  if (failure.isInterrupt) return { speak: false, reason: 'interrupt' };
  entry.errors = [...entry.errors.filter((e) => now - e.at <= cfg.windowMs), { at: now, tool: String(failure.tool ?? ''), error: brief(failure.error) }].slice(-10);
  if (entry.errors.length < cfg.errorsToSpeak) return { speak: false, reason: 'few' };
  if (entry.lastSpokeAt !== null && now - entry.lastSpokeAt < cfg.cooldownMs) return { speak: false, reason: 'cooldown' };
  entry.lastSpokeAt = now;
  return { speak: true, reason: 'repeated_error' };
}

export function brief(text, max = 300) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// ---------- Claude（コーチ）に渡す文 ----------

const COACH_RULES = [
  'あなたは、この人の Claude Code の練習を手伝うコーチも兼ねている（isoroku-lite）。',
  '- 頼まれた作業は、いつもどおり手伝ってよい。ただし、講座で練習している Claude Code の操作（コマンド・モードの切り替え・設定）は、この人自身にやってもらう。先回りして代わりにやらない。',
  '- ヒントは浅いほうから: 方向 → 具体例 → 答え。この人が「答えを教えて」と言うまでは答えを出さない。',
  '- 手順ができたら「/isoroku-lite:next」、詰まったら「/isoroku-lite:hint」と打てることを、必要なときだけ短く伝える。',
  '- 講座の中身は、講座に書かれたことと公式ドキュメント（sources）に沿う。確かめていないことは「確かめていない」と言う。',
];

export function stepText(lesson, entry) {
  const st = currentStep(lesson, entry);
  const lines = [
    `講座「${lesson.title}」（${lesson.id}）の手順 ${st.id}/${lesson.steps.length}: ${st.title}`,
    `- すること: ${st.do}`,
  ];
  if (st.why) lines.push(`- なぜ: ${st.why}`);
  lines.push(`- できた目安: ${st.success}`);
  if (st.pitfalls?.length) lines.push(`- つまずきやすい所: ${st.pitfalls.join(' / ')}`);
  return lines.join('\n');
}

export function sessionContext(lesson, entry) {
  if (entry.done) return `${COACH_RULES[0]}\n講座「${lesson.title}」は最後まで終わっている。次の講座は /isoroku-lite:start で選べる。`;
  return [...COACH_RULES, '', stepText(lesson, entry), lesson.sources?.length ? `出典: ${lesson.sources.join(' , ')}` : ''].join('\n').trim();
}

export function promptReminder(lesson, entry) {
  if (entry.done) return '';
  const st = currentStep(lesson, entry);
  return `（isoroku-lite: この人は講座「${lesson.title}」の手順 ${st.id}「${st.title}」を練習中。操作はこの人にやってもらい、ヒントは浅いほうから。）`;
}

export function failureCoaching(lesson, entry) {
  const errs = entry.errors.map((e) => `- ${e.tool}: ${e.error}`).join('\n');
  return [
    '（isoroku-lite の見守り）エラーが続いている。次の返事の終わりに、コーチとして短く声をかける。',
    '- まず、何が起きているかを1文で言う。',
    '- ヒントは「方向」だけ（どこを疑うか）。答えや、直したコマンドそのものは出さない。',
    '- 続けて手伝ってほしいときは /isoroku-lite:hint で、ヒントが1段深くなると伝える。',
    '',
    stepText(lesson, entry),
    '',
    '続いたエラー:',
    errs,
  ].join('\n');
}

export function hintInstruction(lesson, entry) {
  const level = entry.hintLevel;
  const how = {
    1: '「方向」だけを出す: どこを疑うか、何を確かめるかを1〜2文で。答えやコマンドそのものは出さない。',
    2: '「具体例」を出す: 似た例や、打つものの形（全部ではなく、肝心な所を伏せた形）を見せる。まだ答えそのものは出さない。',
    3: '「答え」を出す: すること・打つものをそのまま示し、なぜそうするかを1文添える。',
  }[level];
  return [
    `ヒントの段: ${level}/3（${HINT_LEVELS[level - 1]}）`,
    `出し方: ${how}`,
    '',
    stepText(lesson, entry),
    entry.errors.length ? `\n最近のエラー:\n${entry.errors.map((e) => `- ${e.tool}: ${e.error}`).join('\n')}` : '',
  ].join('\n').trim();
}
