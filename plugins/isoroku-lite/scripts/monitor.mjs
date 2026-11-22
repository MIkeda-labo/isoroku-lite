#!/usr/bin/env node
// isoroku-lite の時間を区切る見守り（プラグインのモニター）。/isoroku-lite:start を打つと Claude Code が起動し、セッションが終わるまで動く。
// 15 秒ごとに、講座を始めた作業フォルダの会話の記録（フックが覚えた transcript_path）の末尾を読み、
// 声をかけるときだけ1行出す。出した行は、通知として Claude に届く（https://code.claude.com/docs/en/plugins/components の Monitors）。
// 何も起きていなければ何も出さない（トークンを使わない）。ネットワークは使わない。
//   node monitor.mjs --data <dir> --project <dir> [--once]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { currentStep, dataDir, loadLessons, projectKey, readState, writeState } from './lib.mjs';
import { decide, parseTranscript, readTail, recordSpoke, WATCH_CONFIG } from './watch.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(argv, name) {
  const i = argv.indexOf(name);
  const v = i >= 0 ? argv[i + 1] : null;
  // ${...} が置き換わらずに文字のまま届いたときは使わない
  return v && !v.includes('${') ? v : null;
}

function message(reason, lesson, entry, events) {
  const st = currentStep(lesson, entry);
  const lastErr = [...events].reverse().find((e) => e.kind === 'tool_error');
  const why = reason === 'stuck_idle' ? 'エラーのあと、2分以上動きが止まっている' : 'エラーが続いている';
  return [
    `isoroku-lite の見守り: ${why}（講座「${lesson.title}」手順 ${st.id}「${st.title}」）。`,
    'コーチとして、この人に短く声をかけて: 何が起きていそうかを1文、ヒントは「方向」だけ（答えやコマンドそのものは出さない）、もっと要るなら /isoroku-lite:hint。',
    lastErr ? `最後のエラー: ${lastErr.text}` : '',
  ].join(' ').trim();
}

/** 1回分の確認。出す行（無ければ null）を返す。テストから直接呼べるように分けてある。 */
export function tick({ data, project, now = Date.now(), lessonsDir = path.join(ROOT, 'lessons'), cfg = WATCH_CONFIG }) {
  const state = readState(data);
  const entry = state.projects[projectKey(project)];
  if (!entry || entry.done || !entry.transcriptPath) return null;
  const lesson = loadLessons(lessonsDir).find((l) => l.id === entry.lessonId);
  if (!lesson) return null;
  const lines = readTail(entry.transcriptPath, cfg.maxBytes);
  if (!lines) return null;
  const { events } = parseTranscript(lines);
  const d = decide(events, now, { lastSpokeAt: entry.lastSpokeAt ?? null, watch: entry.watch ?? {} }, cfg);
  if (!d.speak) return null;
  recordSpoke(entry, d.triggerId, now);
  writeState(data, state);
  return message(d.reason, lesson, entry, events);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const data = arg(argv, '--data') || dataDir();
  const project = arg(argv, '--project') || process.cwd();
  const interval = Number(process.env.ISOROKU_LITE_INTERVAL_MS) || WATCH_CONFIG.intervalMs;
  const run = () => {
    try {
      const line = tick({ data, project });
      if (line) process.stdout.write(`${line}\n`);
    } catch (e) {
      process.stderr.write(`isoroku-lite monitor: ${e?.message ?? e}\n`);
    }
  };
  if (argv.includes('--once')) run();
  else {
    run();
    setInterval(run, interval);
  }
}
