// node --test plugins/isoroku-lite/tests
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, deepenHint, loadLessons, onToolFailure, onToolSuccess, readState } from '../scripts/lib.mjs';
import { handle } from '../scripts/hook.mjs';
import { run } from '../scripts/cli.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LESSONS = path.join(ROOT, 'lessons');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'isoroku-lite-'));

function setup() {
  const data = tmp();
  const project = tmp();
  const env = { ISOROKU_LITE_DATA: data, CLAUDE_PROJECT_DIR: project };
  return { data, project, env };
}

test('講座: 16 個が order の順に読め、どれにも手順がある', () => {
  const ls = loadLessons(LESSONS);
  assert.equal(ls.length, 16);
  const orders = ls.map((l) => l.order ?? 999);
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  for (const l of ls) assert.ok(l.steps.every((s) => s.title && s.do && s.success));
});

test('見守り: エラー2回で声をかけ、クールダウン中は黙り、成功で数え直す。止めた失敗は数えない', () => {
  const e = { errors: [], lastSpokeAt: null };
  const t0 = 1_000_000;
  assert.equal(onToolFailure(e, { tool: 'Bash', error: 'x' }, t0).speak, false);
  assert.equal(onToolFailure(e, { tool: 'Bash', error: 'y', isInterrupt: true }, t0 + 1).reason, 'interrupt');
  assert.equal(onToolFailure(e, { tool: 'Bash', error: 'y' }, t0 + 2).speak, true);
  assert.equal(onToolFailure(e, { tool: 'Bash', error: 'z' }, t0 + 3).reason, 'cooldown');
  onToolSuccess(e);
  assert.equal(e.errors.length, 0);
  // 古いエラーは数えない
  onToolFailure(e, { tool: 'Bash', error: 'a' }, t0 + DEFAULT_CONFIG.cooldownMs + 10);
  assert.equal(onToolFailure(e, { tool: 'Bash', error: 'b' }, t0 + DEFAULT_CONFIG.cooldownMs + 10 + DEFAULT_CONFIG.windowMs + 1).speak, false);
});

test('ヒントの段: 方向 → 具体例 → 答えで止まる', () => {
  const e = { hintLevel: 0 };
  assert.deepEqual([deepenHint(e), deepenHint(e), deepenHint(e), deepenHint(e)], [1, 2, 3, 3]);
});

test('道具: start → status → hint ×2 → next → stop', () => {
  const { env, project, data } = setup();
  const o = { env, lessonsDir: LESSONS, now: 1 };
  assert.match(run(['start'], o), /講座の一覧/);
  assert.match(run(['start', 'nope'], o), /見つからない/);
  assert.match(run(['start', 'goal'], o), /講座を始めた[\s\S]*手順 1\/5/);
  assert.match(run(['status'], o), /手順: 1\/5/);
  assert.match(run(['hint'], o), /ヒントの段: 1\/3（方向）/);
  assert.match(run(['hint'], o), /ヒントの段: 2\/3（具体例）/);
  assert.match(run(['next'], o), /次の手順に進んだ[\s\S]*手順 2\/5/);
  assert.match(run(['hint'], o), /1\/3/); // 手順ごとに数え直す
  assert.match(run(['stop'], o), /やめた/);
  assert.equal(readState(data).projects[project], undefined);
  assert.match(run(['status'], o), /まだ講座を始めていない/);
});

test('道具: スキルの中で置き換わらなかった ${CLAUDE_PLUGIN_DATA} は使わない。引数が1つにまとまって届いても読める', () => {
  const { env, data } = setup();
  const o = { env, lessonsDir: LESSONS, now: 1 };
  assert.match(run(['start', '--data', '${CLAUDE_PLUGIN_DATA}', ' goal '], o), /講座を始めた/);
  assert.ok(fs.existsSync(path.join(data, 'state.json')));
});

test('道具: 最後の手順の次は「終わり」', () => {
  const { env } = setup();
  const o = { env, lessonsDir: LESSONS, now: 1 };
  run(['start', 'goal'], o);
  for (let i = 0; i < 4; i++) run(['next'], o);
  assert.match(run(['next'], o), /最後まで終えた/);
  assert.match(run(['hint'], o), /最後まで終わっている/);
});

test('フック: 講座を始めていない作業フォルダでは、何も足さない', () => {
  const { env } = setup();
  for (const ev of ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'PostToolUseFailure']) {
    assert.equal(handle({ hook_event_name: ev, cwd: env.CLAUDE_PROJECT_DIR, tool_name: 'Bash', error: 'x' }, { env, lessonsDir: LESSONS }), null);
  }
});

test('フック: 始めた講座の手順を渡し、エラーが2回続くと方向のヒントを頼む', () => {
  const { env } = setup();
  run(['start', 'goal'], { env, lessonsDir: LESSONS, now: 1 });
  const h = (input, now = 10) => handle({ cwd: env.CLAUDE_PROJECT_DIR, ...input }, { env, lessonsDir: LESSONS, now });

  const s = h({ hook_event_name: 'SessionStart', source: 'startup' });
  assert.equal(s.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.match(s.hookSpecificOutput.additionalContext, /コーチ[\s\S]*手順 1\/5/);

  assert.match(h({ hook_event_name: 'UserPromptSubmit', prompt: 'hi' }).hookSpecificOutput.additionalContext, /練習中/);

  const f = { hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', tool_input: {}, error: 'Exit code 1 No such file' };
  assert.equal(h(f, 20), null);
  const second = h(f, 30);
  assert.equal(second.hookSpecificOutput.hookEventName, 'PostToolUseFailure');
  assert.match(second.hookSpecificOutput.additionalContext, /エラーが続いている[\s\S]*「方向」だけ[\s\S]*No such file/);

  assert.equal(h({ hook_event_name: 'PostToolUse', tool_name: 'Bash' }, 40), null);
  assert.equal(readState(env.ISOROKU_LITE_DATA).projects[path.resolve(env.CLAUDE_PROJECT_DIR)].errors.length, 0);
});

test('フック（実物の起動）: 壊れた入力でも終了コード 0 で、何も出さない', () => {
  const { env } = setup();
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/hook.mjs')], { input: 'not json', env: { ...process.env, ...env }, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('フック（実物の起動）: JSON を出す', () => {
  const { env } = setup();
  run(['start', 'goal'], { env, lessonsDir: LESSONS, now: 1 });
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/hook.mjs')], {
    input: JSON.stringify({ hook_event_name: 'SessionStart', cwd: env.CLAUDE_PROJECT_DIR, source: 'startup' }),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /goal/);
});

test('作り: plugin.json・marketplace.json・hooks.json・スキルの形', () => {
  const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/plugin.json'), 'utf8'));
  assert.equal(plugin.name, 'isoroku-lite');
  const market = JSON.parse(fs.readFileSync(path.join(ROOT, '../../.claude-plugin/marketplace.json'), 'utf8'));
  assert.equal(market.plugins[0].source, './plugins/isoroku-lite');
  const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks/hooks.json'), 'utf8'));
  assert.deepEqual(Object.keys(hooks.hooks).sort(), ['PostToolUse', 'PostToolUseFailure', 'SessionStart', 'UserPromptSubmit']);
  for (const s of ['start', 'next', 'hint', 'status', 'stop']) {
    const md = fs.readFileSync(path.join(ROOT, 'skills', s, 'SKILL.md'), 'utf8');
    assert.match(md, new RegExp(`^---\\nname: ${s}\\n`));
    assert.match(md, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/cli\.mjs/);
  }
});
