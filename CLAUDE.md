# Show up

Points & forfeits board for the Code design team. Runs on Cloudflare Workers with a D1 database (`showup-db`).

- `public/index.html` is the Show up page; `public/design-club.html` is the Design club rota (served at `/design-club`). `public/avatar.js` draws the avatars and pets (shared by the page and the Worker).
- `src/worker.js` is the API (`/api/...`) and serves the page.
- Deploys automatically from `main` via Cloudflare Workers Builds.

## Inside waywo

Show up is also served inside Ben's waywo board at waywo's address + `/showup/`: waywo's Worker fetches each
request from this site and hands back the answer. Keep these working:

- All of the page's own URLs are relative (`api/…`, not `/api/…`), so they work at `/showup/` and at our own address.
- The top bar's left side is waywo's shared tool tabs, copied exactly (markup, CSS, icons, timings) from
  waywo, in the same spot (top-left corner 16px down, 32px in; 12px/16px at ≤640px wide). Every page has
  `@view-transition { navigation: auto; }` and the view-transition-names `tab-glow`, `tab-waywo`,
  `tab-showup`, `tab-club`, so the white square slides between waywo and Show up; never rename them.
  The tabs are in the server's HTML (not added by JS) and are plain links. `--i` on `.tabs` is the
  current tab: 1 on Show up, 2 on Design club. If waywo's tabs change, Ben will send the new version.
  At Show up's own address the tab links are rewritten to waywo's full address (paths like /showup/ don't exist there).
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
