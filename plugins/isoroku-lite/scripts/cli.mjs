#!/usr/bin/env node
// isoroku-lite のスキルから呼ぶ道具。状態を変えて、Claude（コーチ）に渡す文を標準出力に出す。
//   node cli.mjs list
//   node cli.mjs start [講座のid]     id が無ければ一覧を出す
//   node cli.mjs next | hint | status | stop
//   --data <dir>     状態の置き場所（スキルは ${CLAUDE_PLUGIN_DATA} を渡す）
//   --project <dir>  作業フォルダ（省けば、いまのフォルダ）
// どんなときも終了コード 0（スキルの読み込みを止めない）。困ったことは文で返す。
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  currentStep, dataDir, deepenHint, hintInstruction, isLessonId, loadLessons, nextStep,
  projectKey, readState, startLesson, stepText, writeState,
} from './lib.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const opts = { cmd: argv[0], rest: [], data: null, project: null };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--data') opts.data = argv[++i] || null;
    else if (argv[i] === '--project') opts.project = argv[++i] || null;
    else if (argv[i].trim() !== '') opts.rest.push(...argv[i].trim().split(/\s+/));
  }
  return opts;
}

function listText(lessons) {
  return ['講座の一覧（/isoroku-lite:start <id> で始める）:', ...lessons.map((l) => `- ${l.id}: ${l.title}`)].join('\n');
}

/** 1回分の処理。文を返す。テストから直接呼べるように分けてある。 */
export function run(argv, { env = process.env, cwd = process.cwd(), now = Date.now(), lessonsDir = path.join(ROOT, 'lessons') } = {}) {
  const o = parseArgs(argv);
  // スキルの中で ${CLAUDE_PLUGIN_DATA} が置き換わらなかったとき（文字のまま届く）は、既定の場所に戻す
  const dir = o.data && !o.data.includes('${') ? o.data : dataDir(env);
  const key = projectKey(o.project || env.CLAUDE_PROJECT_DIR || cwd);
  const lessons = loadLessons(lessonsDir);
  const state = readState(dir);
  const entry = state.projects[key];
  const lesson = entry ? lessons.find((l) => l.id === entry.lessonId) : null;
  const noLesson = `この作業フォルダ（${key}）では、まだ講座を始めていない。\n${listText(lessons)}`;

  switch (o.cmd) {
    case 'list':
      return listText(lessons);
    case 'start': {
      const id = o.rest[0];
      if (!id) return listText(lessons);
      const l = isLessonId(id) ? lessons.find((x) => x.id === id) : null;
      if (!l) return `講座「${id}」は見つからない。\n${listText(lessons)}`;
      const e = startLesson(state, key, l, now);
      writeState(dir, state);
      const practice = l.practice?.dir ? `\n練習用のフォルダの目安: ${l.practice.dir}（いまの作業フォルダ: ${key}）` : '';
      return [`講座を始めた: ${l.title}`, l.summary ?? '', practice, '', stepText(l, e)].join('\n').trim();
    }
    case 'next': {
      if (!lesson) return noLesson;
      const st = nextStep(lesson, entry);
      writeState(dir, state);
      if (!st) return `講座「${lesson.title}」の手順を、最後まで終えた。\n${listText(lessons)}`;
      return `次の手順に進んだ。\n\n${stepText(lesson, entry)}`;
    }
    case 'hint': {
      if (!lesson) return noLesson;
      if (entry.done) return `講座「${lesson.title}」は最後まで終わっている。`;
      deepenHint(entry);
      writeState(dir, state);
      return hintInstruction(lesson, entry);
    }
    case 'status': {
      if (!lesson) return noLesson;
      if (entry.done) return `講座「${lesson.title}」は最後まで終わっている。`;
      const st = currentStep(lesson, entry);
      return [
        `講座: ${lesson.title}（${lesson.id}）`,
        `手順: ${st.id}/${lesson.steps.length}「${st.title}」`,
        `ヒントの段: ${entry.hintLevel}/3`,
        `続いているエラー: ${entry.errors.length} 回`,
      ].join('\n');
    }
    case 'stop': {
      if (!entry) return noLesson;
      delete state.projects[key];
      writeState(dir, state);
      return `この作業フォルダの講座（${entry.lessonId}）をやめた。見守りも止まった。`;
    }
    default:
      return '使い方: list | start [id] | next | hint | status | stop';
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${run(process.argv.slice(2))}\n`);
  } catch (e) {
    process.stdout.write(`isoroku-lite でエラー: ${e?.message ?? e}\n`);
  }
  process.exit(0);
}
