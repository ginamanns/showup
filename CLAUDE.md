# Show up

Points & forfeits board for the Code design team. Runs on Cloudflare Workers with a D1 database (`showup-db`).

- `public/index.html` is the page. `public/avatar.js` draws the avatars and pets (shared by the page and the Worker).
- `src/worker.js` is the API (`/api/...`) and serves the page.
- Deploys automatically from `main` via Cloudflare Workers Builds.

## Inside waywo

Show up is also served inside Ben's waywo board at waywo's address + `/showup/`: waywo's Worker fetches each
request from this site and hands back the answer. Keep these working:

- All of the page's own URLs are relative (`api/…`, not `/api/…`), so they work at `/showup/` and at our own address.
- The top bar's left side is the shared tool switcher ("Show up" in Instrument Serif 34px + 14px chevron 8px after it;
  menu: waywo → `/`, Show up → `/showup/` (current), Design club, coming soon), working like waywo's. It's the only
  shared part of the bar: the title pill and the buttons on the right are Show up's own.
- Who's visiting: requests through waywo carry `X-Waywo-User` (base64url JSON `{id, name, colour, showup, exp}`) and
  `X-Waywo-Signature` (hex HMAC-SHA256 of it, keyed with the `SHOWUP_SECRET` secret, the same value as on waywo).
  Only trust them after verifying the signature and that `exp` is in the future; without them the visitor is
  anonymous and Show up works as before.
- The session is waywo's: the signed `id` stays the same for as long as that browser's waywo cookie lasts. Cards
  store a list of linked ids (`waywoIds`, up to 10, one card per id). Link automatically when someone adds
  themselves, or when exactly one unlinked card has their name. "This is me" is only a backup (same names, cleared
  cookies, new browser) and adds the browser to the card, not replacing the others.
- Contract with waywo (don't change without telling Ben):
  - `GET /api/waywo/me` → `{"member": {"id", "name"}}` for the visitor's linked card (trying the name match first), or `{"member": null}`.
  - `GET /api/waywo/avatars/<id>.svg` → that member's face, square SVG with its background, `image/svg+xml`,
    `Cache-Control: public, max-age=300`, 404 if unknown, no scripts or outside resources.
- Never set cookies named `waywo_…`.
