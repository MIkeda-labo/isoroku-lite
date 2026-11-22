// 時間を区切る見守り（モニターから 15 秒ごとに呼ぶ）。isoroku の frontend/lib/transcript.ts と watch-rules.ts を移したもの。
// 会話の記録（.jsonl）の末尾を読んで「出来事」にし、「いま声をかけるか」をコードで決める（LLM は使わない）。
//
// 声をかける条件（どちらか）:
//   repeated_error … 直近 windowMs の間に、道具の失敗が repeatedErrors 回以上
//   stuck_idle     … 最後の失敗のあと、idleAfterErrorMs 以上、何も起きていない（フックでは気づけない）
// 声をかけないとき:
//   （前に声をかけた時刻より前のエラーは数えない）/
//   resolved（直近の道具が2回続けて成功）/ already_spoke（同じ失敗にはもう声をかけた）/
//   cooldown（フックと共有。前回から cooldownMs 以内）/ hourly_cap（直近1時間で maxPerHour 回）
//
// 注意: 記録の形式は Claude Code の内部のもので、バージョンで変わりうる（https://code.claude.com/docs/en/sessions ）。
//   知らない形は黙って読み飛ばす。読めた数は stats で返す。
import fs from 'node:fs';

export const WATCH_CONFIG = {
  intervalMs: 15_000,
  windowMs: 10 * 60_000,
  repeatedErrors: 2,
  idleAfterErrorMs: 2 * 60_000,
  cooldownMs: 3 * 60_000, // フック（lib.mjs の DEFAULT_CONFIG.cooldownMs）とそろえる
  maxPerHour: 6,
  maxBytes: 512 * 1024,
};

const clip = (s, n = 300) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

function textOfResult(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((b) => (b && typeof b.text === 'string' ? b.text : '')).filter(Boolean).join(' ');
  return '';
}

/** 差し込まれた行（<command-name> や <system-reminder> など）。 */
const looksInjected = (s) => /^\s*<[A-Za-z][\w-]*[\s>]/.test(s);

/**
 * 記録の行を出来事にする。kind: user / assistant / tool_use / tool_ok / tool_error / tool_misuse / api_error
 * tool_misuse（<tool_use_error>）と api_error は、学ぶ人が詰まっているサインではないので、判定では数えない。
 */
export function parseTranscript(lines) {
  const stats = { lines: 0, invalid: 0, considered: 0, recognized: 0 };
  const events = [];
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    stats.lines += 1;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      stats.invalid += 1;
      return;
    }
    if (!row || (row.type !== 'user' && row.type !== 'assistant')) return;
    if (row.isSidechain === true || row.isMeta === true) return;
    stats.considered += 1;
    const at = typeof row.timestamp === 'string' ? Date.parse(row.timestamp) : NaN;
    const msg = row.message;
    if (!Number.isFinite(at) || !msg || typeof msg !== 'object') return;
    const baseId = typeof row.uuid === 'string' ? row.uuid : `line-${index}`;
    const content = msg.content;
    const before = events.length;
    const push = (kind, text, suffix, tool) => events.push({ id: suffix ? `${baseId}:${suffix}` : baseId, at, kind, text, ...(tool ? { tool } : {}) });

    if (row.type === 'user') {
      if (typeof content === 'string') {
        if (!looksInjected(content) && content.trim()) push('user', clip(content));
      } else if (Array.isArray(content)) {
        content.forEach((b, bi) => {
          if (!b || typeof b !== 'object') return;
          if (b.type === 'text' && typeof b.text === 'string') {
            if (!looksInjected(b.text) && b.text.trim()) push('user', clip(b.text), `t${bi}`);
          } else if (b.type === 'tool_result') {
            const text = clip(textOfResult(b.content), b.is_error === true ? 300 : 120);
            push(b.is_error !== true ? 'tool_ok' : text.startsWith('<tool_use_error>') ? 'tool_misuse' : 'tool_error', text, `r${bi}`);
          }
        });
      }
    } else if (Array.isArray(content)) {
      content.forEach((b, bi) => {
        if (!b || typeof b !== 'object') return;
        if (b.type === 'text' && typeof b.text === 'string' && b.text.trim()) push(row.isApiErrorMessage === true ? 'api_error' : 'assistant', clip(b.text), `t${bi}`);
        else if (b.type === 'tool_use' && typeof b.name === 'string') push('tool_use', clip(b.input?.command ?? b.input?.file_path ?? '', 160), `u${bi}`, b.name);
      });
    }
    if (events.length > before) stats.recognized += 1;
  });
  events.sort((a, b) => a.at - b.at);
  return { events, stats };
}

/** 記録の末尾 maxBytes を行にする。通常のファイルでなければ null。 */
export function readTail(file, maxBytes = WATCH_CONFIG.maxBytes) {
  let st;
  try {
    st = fs.lstatSync(file);
  } catch {
    return null;
  }
  if (!st.isFile()) return null;
  const fd = fs.openSync(file, 'r');
  try {
    const start = Math.max(0, st.size - maxBytes);
    const buf = Buffer.alloc(st.size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    let text = buf.toString('utf8');
    if (start > 0) {
      const nl = text.indexOf('\n');
      text = nl === -1 ? '' : text.slice(nl + 1); // 途中から始まる行は捨てる
    }
    return text.split('\n').filter((l) => l.trim() !== '');
  } finally {
    fs.closeSync(fd);
  }
}

const isError = (e) => e.kind === 'tool_error';

function trailingOks(events) {
  let n = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].kind === 'tool_ok') n += 1;
    else if (isError(events[i])) break;
  }
  return n;
}

/**
 * 声をかけるかを決める。watch = { lastTriggerId, spokeTimes }、lastSpokeAt はフックと共有の最後に声をかけた時刻。
 * 返り値: { speak, reason, triggerId, blockedBy }
 */
export function decide(events, now, { lastSpokeAt = null, watch = {} } = {}, cfg = WATCH_CONFIG) {
  const none = { speak: false, reason: null, triggerId: null, blockedBy: null };
  const recent = events.filter((e) => e.at >= now - cfg.windowMs);
  // 前に声をかけた（フックでも見守りでも）時刻より前のエラーは、もう扱ったものとして数えない（同じエラーで二度言わない）
  const errors = recent.filter((e) => isError(e) && (lastSpokeAt === null || e.at > lastSpokeAt));
  if (errors.length === 0) return none;
  const lastError = errors[errors.length - 1];
  const lastEvent = recent[recent.length - 1];

  let reason = null;
  if (errors.length >= cfg.repeatedErrors) reason = 'repeated_error';
  else if (now - lastError.at >= cfg.idleAfterErrorMs && now - lastEvent.at >= cfg.idleAfterErrorMs) reason = 'stuck_idle';
  if (!reason) return none;

  const blocked = (blockedBy) => ({ speak: false, reason, triggerId: lastError.id, blockedBy });
  if (trailingOks(events) >= 2) return blocked('resolved');
  if (watch.lastTriggerId === lastError.id) return blocked('already_spoke');
  if (lastSpokeAt !== null && now - lastSpokeAt < cfg.cooldownMs) return blocked('cooldown');
  const lastHour = (watch.spokeTimes ?? []).filter((t) => now - t < 60 * 60_000).length;
  if (lastHour >= cfg.maxPerHour) return blocked('hourly_cap');
  return { speak: true, reason, triggerId: lastError.id, blockedBy: null };
}

/** 声をかけたことを状態に残す。 */
export function recordSpoke(entry, triggerId, now) {
  const w = entry.watch ?? {};
  entry.lastSpokeAt = now;
  entry.watch = { lastTriggerId: triggerId, spokeTimes: [...(w.spokeTimes ?? []).filter((t) => now - t < 60 * 60_000), now] };
}
