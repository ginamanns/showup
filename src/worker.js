// The "back office" for the Show up board.
// Cloudflare serves everything in /public (the page) automatically.
// Anything starting with /api/ comes here, and we read or write the D1 database (env.DB).
//
// Show up also lives inside Ben's waywo board at waywo's address + /showup/.
// waywo forwards each request here and adds signed headers saying who the visitor is.

import { avatarSVG } from '../public/avatar.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      await migrate(env.DB);
      return await handleApi(request, env, url);
    } catch (err) {
      console.error(err);
      return json({ error: 'Something went wrong on the server' }, 500);
    }
  }
};

// Adds the column that remembers which waywo browsers belong to each card (only needed once)
let migrated = false;
async function migrate(db) {
  if (migrated) return;
  try { await db.prepare('ALTER TABLE members ADD COLUMN waywo_ids TEXT').run(); } catch { /* already there */ }
  migrated = true;
}

async function handleApi(request, env, url) {
  const db = env.DB;
  const method = request.method;
  const parts = url.pathname.split('/');            // "/api/members/abc" -> ["", "api", "members", "abc"]
  const [, , resource, id, extra] = parts;
  const body = ['POST', 'PATCH', 'PUT'].includes(method) ? await request.json().catch(() => ({})) : {};
  const visitor = await waywoUser(request, env.SHOWUP_SECRET); // null unless the signed waywo headers check out

  // ---- The shared contract with waywo (don't change without telling Ben) ----
  if (resource === 'waywo') {
    if (id === 'me' && method === 'GET') {
      const member = visitor ? await findOrAutoLink(db, visitor) : null;
      return json({ member: member ? { id: member.id, name: member.name } : null });
    }
    if (id === 'avatars' && extra && method === 'GET') {
      const memberId = extra.replace(/\.svg$/, '');
      const row = await db.prepare('SELECT avatar FROM members WHERE id = ?').bind(memberId).first();
      if (!row) return new Response('Not found', { status: 404 });
      return new Response(avatarSVG(safeParse(row.avatar)), {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' }
      });
    }
    return json({ error: 'Not found' }, 404);
  }

  // ---- Who is this? (used by our own page) ----
  if (resource === 'me' && method === 'GET') {
    if (!visitor) return json({ waywo: null, member: null });
    const member = await findOrAutoLink(db, visitor);
    return json({ waywo: { name: visitor.name, colour: visitor.colour }, member: member ? { id: member.id, name: member.name } : null });
  }

  // ---- "This is me": link this waywo browser to a card ----
  if (resource === 'link' && method === 'POST') {
    if (!visitor) return json({ error: 'Pick a name on waywo first' }, 401);
    const row = await db.prepare('SELECT id, name, waywo_ids FROM members WHERE id = ?').bind(String(body.member || '')).first();
    if (!row) return json({ error: 'Card not found' }, 404);
    const others = ids(row.waywo_ids).filter(x => x !== visitor.id);
    if (others.length && !body.confirm) return json({ needsConfirm: true }, 409);
    await linkId(db, row.id, visitor.id);
    return json({ member: { id: row.id, name: row.name } });
  }

  // ---- Load everything the page needs in one go ----
  if (resource === 'state' && method === 'GET') {
    const [members, forfeits, log, start] = await db.batch([
      db.prepare('SELECT * FROM members ORDER BY created_at'),
      db.prepare('SELECT * FROM forfeits ORDER BY created_at'),
      db.prepare('SELECT * FROM log ORDER BY at DESC LIMIT 40'),
      db.prepare("SELECT value FROM settings WHERE key = 'start'")
    ]);
    return json({
      members: members.results.map(m => ({
        id: m.id, name: m.name, avatar: safeParse(m.avatar), points: m.points, forfeit: m.forfeit, createdAt: m.created_at
      })),
      forfeits: forfeits.results.map(f => ({ id: f.id, text: f.text, createdAt: f.created_at })),
      log: log.results.map(l => ({ id: l.id, icon: l.icon, text: l.text, at: l.at })),
      start: start.results[0] ? Number(start.results[0].value) : 5
    });
  }

  // ---- Designers ----
  if (resource === 'members') {
    if (method === 'POST') {
      const name = text(body.name, 40);
      if (!name) return json({ error: 'Name is required' }, 400);
      const memberId = cleanId(body.id);
      await db.prepare('INSERT INTO members (id, name, avatar, points, forfeit, created_at, waywo_ids) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(memberId, name, avatarJSON(body.avatar), int(body.points, 0, 20, 5), null, Date.now(), '[]').run();
      // Someone adding themselves through waywo: this card is theirs (unless this browser already has a card)
      if (visitor && !(await cardForId(db, visitor.id))) await linkId(db, memberId, visitor.id);
      return json({ ok: true });
    }
    if (method === 'PATCH' && id) {
      // Only update the fields that were sent
      const sets = [], values = [];
      if ('name' in body) { sets.push('name = ?'); values.push(text(body.name, 40) || 'Someone'); }
      if ('avatar' in body) { sets.push('avatar = ?'); values.push(avatarJSON(body.avatar)); }
      if ('points' in body) { sets.push('points = ?'); values.push(int(body.points, 0, 20, 5)); }
      if ('forfeit' in body) { sets.push('forfeit = ?'); values.push(body.forfeit ? text(body.forfeit, 120) : null); }
      if (!sets.length) return json({ ok: true });
      await db.prepare(`UPDATE members SET ${sets.join(', ')} WHERE id = ?`).bind(...values, id).run();
      return json({ ok: true });
    }
    if (method === 'DELETE' && id) {
      await db.prepare('DELETE FROM members WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }

  // ---- Forfeits on the wheel ----
  if (resource === 'forfeits') {
    if (method === 'POST') {
      const t = text(body.text, 90);
      if (!t) return json({ error: 'Forfeit text is required' }, 400);
      await db.prepare('INSERT INTO forfeits (id, text, created_at) VALUES (?, ?, ?)').bind(cleanId(body.id), t, Date.now()).run();
      return json({ ok: true });
    }
    if (method === 'DELETE' && id) {
      await db.prepare('DELETE FROM forfeits WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
  }

  // ---- Activity log (keeps the latest 200) ----
  if (resource === 'log' && method === 'POST') {
    await db.batch([
      db.prepare('INSERT INTO log (id, icon, text, at) VALUES (?, ?, ?, ?)').bind(cleanId(body.id), text(body.icon, 8), text(body.text, 200), Date.now()),
      db.prepare('DELETE FROM log WHERE id NOT IN (SELECT id FROM log ORDER BY at DESC LIMIT 200)')
    ]);
    return json({ ok: true });
  }

  // ---- Settings (starting points) ----
  if (resource === 'settings' && method === 'PUT') {
    await db.prepare("INSERT INTO settings (key, value) VALUES ('start', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(String(int(body.start, 1, 12, 5))).run();
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

// ---- Who's visiting through waywo ----
// waywo signs a small JSON "passport" with a secret only our two sites know.
// Anyone can send made-up headers straight to our address, so we only trust them if the signature checks out.
async function waywoUser(request, secret) {
  const value = request.headers.get('X-Waywo-User');
  const signature = request.headers.get('X-Waywo-Signature');
  if (!secret || !value || !signature) return null;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const bytes = new Uint8Array(signature.match(/../g)?.map((h) => parseInt(h, 16)) ?? []);
    if (!(await crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(value)))) return null;
    const user = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))));
    if (!(user.exp > Date.now() / 1000) || typeof user.id !== 'string') return null;
    return user; // { id, name, colour, showup, exp }
  } catch {
    return null;
  }
}

// ---- Which card belongs to which waywo browser ----
const ids = (s) => { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
const norm = (s) => String(s || '').trim().toLowerCase();

async function cardForId(db, wid) {
  // Match the id as a whole JSON string inside the list, then double-check properly
  const rows = (await db.prepare('SELECT id, name, waywo_ids FROM members WHERE waywo_ids LIKE ?').bind(`%"${wid.replace(/[%_"\\]/g, '')}"%`).all()).results;
  return rows.find(r => ids(r.waywo_ids).includes(wid)) || null;
}

// The visitor's card: already linked, or (if exactly one unlinked card has their name) linked now
async function findOrAutoLink(db, visitor) {
  const linked = await cardForId(db, visitor.id);
  if (linked) return linked;
  const all = (await db.prepare('SELECT id, name, waywo_ids FROM members').all()).results;
  const matches = all.filter(r => norm(r.name) === norm(visitor.name) && ids(r.waywo_ids).length === 0);
  if (matches.length !== 1) return null;
  await linkId(db, matches[0].id, visitor.id);
  return matches[0];
}

// An id belongs to one card only; each card keeps up to 10 (oldest dropped first)
async function linkId(db, memberId, wid) {
  const old = await cardForId(db, wid);
  const stmts = [];
  if (old && old.id !== memberId) stmts.push(db.prepare('UPDATE members SET waywo_ids = ? WHERE id = ?').bind(JSON.stringify(ids(old.waywo_ids).filter(x => x !== wid)), old.id));
  const row = await db.prepare('SELECT waywo_ids FROM members WHERE id = ?').bind(memberId).first();
  const list = ids(row && row.waywo_ids).filter(x => x !== wid).concat(wid).slice(-10);
  stmts.push(db.prepare('UPDATE members SET waywo_ids = ? WHERE id = ?').bind(JSON.stringify(list), memberId));
  await db.batch(stmts);
}

// ---- Little helpers ----
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function text(v, max) { return String(v ?? '').trim().slice(0, max); }
function int(v, lo, hi, fallback) { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback; }
function cleanId(v) { const s = String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40); return s || crypto.randomUUID(); }
function avatarJSON(a) { const s = JSON.stringify(a && typeof a === 'object' ? a : {}); return s.length > 1000 ? '{}' : s; }
function safeParse(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }
