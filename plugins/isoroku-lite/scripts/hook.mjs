#!/usr/bin/env node
// isoroku-lite のフック。Claude Code が渡す入力（JSON）を標準入力で受け取り、必要なときだけ Claude に文を足す。
// 講座を始めていない作業フォルダでは、何もしない（ふだんの作業の邪魔をしない）。
// どんなときも終了コード 0 で終わる（壊れても Claude Code を止めない）。ネットワークは使わない。
// 公式: https://code.claude.com/docs/en/hooks （hookSpecificOutput.additionalContext）
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dataDir, failureCoaching, loadLessons, onToolFailure, onToolSuccess, projectKey,
  promptReminder, readState, sessionContext, writeState,
} from './lib.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 入力を読んで、出す文（無ければ null）を返す。テストから直接呼べるように分けてある。 */
export function handle(input, { env = process.env, now = Date.now(), lessonsDir = path.join(ROOT, 'lessons') } = {}) {
  const event = input?.hook_event_name;
  const cwd = env.CLAUDE_PROJECT_DIR || input?.cwd;
  if (!event || !cwd) return null;

  const dir = dataDir(env);
  const state = readState(dir);
  const key = projectKey(cwd);
  const entry = state.projects[key];
  if (!entry) return null; // 講座を始めていない
  const lesson = loadLessons(lessonsDir).find((l) => l.id === entry.lessonId);
  if (!lesson) return null;

  let text = null;
  switch (event) {
    case 'SessionStart':
      text = sessionContext(lesson, entry);
      break;
    case 'UserPromptSubmit':
      text = promptReminder(lesson, entry) || null;
      break;
    case 'PostToolUse':
      if (entry.errors.length > 0) {
        onToolSuccess(entry);
        writeState(dir, state);
      }
      break;
    case 'PostToolUseFailure': {
      if (entry.done) break;
      const d = onToolFailure(entry, { tool: input.tool_name, error: input.error, isInterrupt: input.is_interrupt === true }, now);
      writeState(dir, state);
      if (d.speak) text = failureCoaching(lesson, entry);
      break;
    }
    default:
      break;
  }
  return text ? { hookSpecificOutput: { hookEventName: event, additionalContext: text } } : null;
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const out = handle(JSON.parse(await readStdin()));
    if (out) process.stdout.write(JSON.stringify(out));
  } catch (e) {
    process.stderr.write(`isoroku-lite: ${e?.message ?? e}\n`);
  }
  process.exit(0);
}
