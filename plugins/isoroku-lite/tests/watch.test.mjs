// 時間を区切る見守り（watch.mjs・monitor.mjs）のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decide, parseTranscript, WATCH_CONFIG } from '../scripts/watch.mjs';
import { tick } from '../scripts/monitor.mjs';
import { handle } from '../scripts/hook.mjs';
import { run } from '../scripts/cli.mjs';
import { readState } from '../scripts/lib.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS = path.join(ROOT, 'lessons');
const T0 = Date.parse('2026-11-22T10:00:00Z');
const iso = (ms) => new Date(ms).toISOString();
const MIN = 60_000;

// 実物の記録と同じ形（isoroku の transcript.ts の「観測した形」）
const userText = (at, text, uuid) => JSON.stringify({ type: 'user', uuid, timestamp: iso(at), message: { content: text } });
const toolUse = (at, cmd, uuid) => JSON.stringify({ type: 'assistant', uuid, timestamp: iso(at), message: { content: [{ type: 'tool_use', id: `t-${uuid}`, name: 'Bash', input: { command: cmd } }] } });
const toolResult = (at, isError, text, uuid) => JSON.stringify({ type: 'user', uuid, timestamp: iso(at), message: { content: [{ type: 'tool_result', tool_use_id: `t-${uuid}`, is_error: isError, content: text }] } });

test('記録の読み取り: 失敗・成功・道具の使い方の誤り・差し込まれた行・サブエージェントを分ける', () => {
  const lines = [
    userText(T0, 'ls して', 'u1'),
    userText(T0, '<system-reminder>x</system-reminder>', 'u2'),
    toolUse(T0 + 1, 'ls nofile', 'a1'),
    toolResult(T0 + 2, true, 'Exit code 2 ls: cannot access', 'r1'),
    toolResult(T0 + 3, true, '<tool_use_error>bad</tool_use_error>', 'r2'),
    toolResult(T0 + 4, false, 'ok', 'r3'),
    JSON.stringify({ type: 'user', isSidechain: true, uuid: 's', timestamp: iso(T0), message: { content: 'x' } }),
    'not json',
  ];
  const { events, stats } = parseTranscript(lines);
  assert.deepEqual(events.map((e) => e.kind), ['user', 'tool_use', 'tool_error', 'tool_misuse', 'tool_ok']);
  assert.equal(stats.invalid, 1);
});

test('判定: エラーが1回だけなら様子見、2分止まると stuck_idle、2回続くと repeated_error', () => {
  const one = parseTranscript([toolUse(T0, 'ls a', 'a1'), toolResult(T0, true, 'Exit code 2', 'r1')]).events;
  assert.equal(decide(one, T0 + 30_000).speak, false);
  const idle = decide(one, T0 + 2 * MIN + 1);
  assert.deepEqual([idle.speak, idle.reason], [true, 'stuck_idle']);
  const two = parseTranscript([toolResult(T0, true, 'e1', 'r1'), toolResult(T0 + 1000, true, 'e2', 'r2')]).events;
  assert.equal(decide(two, T0 + 2000).reason, 'repeated_error');
});

test('判定: 解決した・もう言った・クールダウン・1時間の上限・前に声をかけた時刻より前のエラーでは、声をかけない', () => {
  const ev = parseTranscript([
    toolResult(T0, true, 'e1', 'r1'),
    toolResult(T0 + 1000, true, 'e2', 'r2'),
  ]).events;
  const now = T0 + 2000;
  const solved = parseTranscript([toolResult(T0, true, 'e1', 'r1'), toolResult(T0 + 1000, true, 'e2', 'r2'), toolResult(T0 + 1500, false, 'ok', 'r3'), toolResult(T0 + 1600, false, 'ok', 'r4')]).events;
  assert.equal(decide(solved, now).blockedBy, 'resolved');
  assert.equal(decide(ev, now, { watch: { lastTriggerId: 'r2:r0' } }).blockedBy, 'already_spoke');
  assert.equal(decide(ev, now, { lastSpokeAt: T0 + 500 }).speak, false); // e1 は扱い済み、e2 だけでは2回にならない
  assert.equal(decide(ev, T0 + 3 * MIN, { lastSpokeAt: T0 + 1500 }).speak, false); // どちらも扱い済み
  const ev2 = parseTranscript([toolResult(now + 10, true, 'e3', 'r5'), toolResult(now + 20, true, 'e4', 'r6')]).events;
  assert.equal(decide(ev2, now + 30, { lastSpokeAt: now }).blockedBy, 'cooldown');
  const full = { spokeTimes: Array.from({ length: WATCH_CONFIG.maxPerHour }, (_, i) => now - i * 1000 - 4 * MIN) };
  assert.equal(decide(ev2, now + 30, { lastSpokeAt: now - 4 * MIN, watch: full }).blockedBy, 'hourly_cap');
});

function lesson(env) {
  run(['start', 'goal'], { env, lessonsDir: LESSONS, now: T0 - MIN });
}

test('モニター: フックが覚えた記録を読み、エラーのあと止まっていれば1回だけ知らせる', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'il-data-'));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'il-proj-'));
  const transcript = path.join(project, 'session.jsonl');
  const env = { ISOROKU_LITE_DATA: data, CLAUDE_PROJECT_DIR: project };
  lesson(env);

  // 記録の場所を、まだフックが覚えていない → 何もしない
  assert.equal(tick({ data, project, now: T0, lessonsDir: LESSONS }), null);

  fs.writeFileSync(transcript, [userText(T0, 'ls して', 'u1'), toolUse(T0, 'ls nofile', 'a1'), toolResult(T0 + 1000, true, 'Exit code 2 ls: cannot access nofile', 'r1')].join('\n') + '\n');
  handle({ hook_event_name: 'UserPromptSubmit', cwd: project, transcript_path: transcript, prompt: 'x' }, { env, lessonsDir: LESSONS, now: T0 });
  assert.equal(readState(data).projects[path.resolve(project)].transcriptPath, transcript);

  assert.equal(tick({ data, project, now: T0 + 30_000, lessonsDir: LESSONS }), null); // まだ様子見
  const line = tick({ data, project, now: T0 + 2 * MIN + 5000, lessonsDir: LESSONS });
  assert.match(line, /見守り: エラーのあと、2分以上動きが止まっている[\s\S]*手順 1[\s\S]*「方向」だけ[\s\S]*cannot access nofile/);
  assert.equal(tick({ data, project, now: T0 + 10 * MIN, lessonsDir: LESSONS }), null); // 同じエラーで二度言わない
});

test('モニター: フックがもう声をかけたエラーでは、知らせない', () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'il-data-'));
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'il-proj-'));
  const transcript = path.join(project, 'session.jsonl');
  const env = { ISOROKU_LITE_DATA: data, CLAUDE_PROJECT_DIR: project };
  lesson(env);
  fs.writeFileSync(transcript, [toolResult(T0, true, 'e1', 'r1'), toolResult(T0 + 1000, true, 'e2', 'r2')].join('\n') + '\n');
  const h = (input, now) => handle({ cwd: project, transcript_path: transcript, ...input }, { env, lessonsDir: LESSONS, now });
  const f = { hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', error: 'e' };
  h(f, T0 + 10);
  assert.ok(h(f, T0 + 1010)); // フックが声をかけた
  assert.equal(tick({ data, project, now: T0 + 6 * MIN, lessonsDir: LESSONS }), null);
});

test('モニター（実物の起動）: --once で、置き換わらなかった ${...} の引数を使わずに動き、終了コード 0', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/monitor.mjs'), '--once', '--data', '${CLAUDE_PLUGIN_DATA}', '--project', '${CLAUDE_PROJECT_DIR}'], {
    env: { ...process.env, ISOROKU_LITE_DATA: fs.mkdtempSync(path.join(os.tmpdir(), 'il-data-')) },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('作り: monitors.json は start のときに起動し、プラグインの道具を指す', () => {
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'monitors/monitors.json'), 'utf8'));
  assert.equal(m.length, 1);
  assert.equal(m[0].when, 'on-skill-invoke:isoroku-lite:start'); // 名前空間つきでないと起動しなかった（2026-11-22 に確かめた）
  assert.match(m[0].command, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/monitor\.mjs/);
});
