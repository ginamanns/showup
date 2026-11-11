// The "back office" for the Show up board.
// Cloudflare serves everything in /public (the page) automatically.
// Anything starting with /api/ comes here, and we read or write the D1 database (env.DB).

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await handleApi(request, env, url);
    } catch (err) {
      console.error(err);
      return json({ error: 'Something went wrong on the server' }, 500);
    }
  }
};

async function handleApi(request, env, url) {
  const db = env.DB;
  const method = request.method;
  // e.g. "/api/members/abc123" -> ["members", "abc123"]
  const [, , resource, id] = url.pathname.split('/');
  const body = ['POST', 'PATCH', 'PUT'].includes(method) ? await request.json().catch(() => ({})) : {};

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
      await db.prepare('INSERT INTO members (id, name, avatar, points, forfeit, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(cleanId(body.id), name, avatarJSON(body.avatar), int(body.points, 0, 20, 5), null, Date.now()).run();
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

// ---- Little helpers ----
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
function text(v, max) { return String(v ?? '').trim().slice(0, max); }
function int(v, lo, hi, fallback) { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback; }
function cleanId(v) { const s = String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40); return s || crypto.randomUUID(); }
function avatarJSON(a) { const s = JSON.stringify(a && typeof a === 'object' ? a : {}); return s.length > 1000 ? '{}' : s; }
function safeParse(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }
