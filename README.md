# hw.i.p

The site at [hwip.vejas.zip](https://hwip.vejas.zip) — a showcase of finished pieces, and an
enquiry form for commissioning one.

Built with [Eleventy](https://www.11ty.dev/) and deployed as a Cloudflare Worker with static
assets. The pages are plain HTML: no framework ships to the browser, and the only JavaScript is
28 lines that enhance the enquiry form.

## Layout

```
src/
  index.njk            homepage
  work.njk             /work/ — every piece
  order.njk            /order/ — the enquiry form
  order-thanks.njk     /order/thanks/ — where a no-JavaScript submission lands
  404.njk
  pieces/*.md          one file per piece; each becomes /work/<filename>/
  _includes/           layouts and partials
  _data/site.json      name, url, social links
  assets/              design-system tokens, logo files, form script
worker/index.js        serves the site; handles POST /api/order
schema.sql             the D1 table enquiries are written to
```

Design tokens in `src/assets/css/` are copied unchanged from the hw.i.p design system.
`site.css` composes them and adds nothing new — no colour, size or duration is invented there.

## Adding a piece

Drop a Markdown file in `src/pieces/`. The filename becomes the URL.

```markdown
---
title: Hinged enclosure
label: 01 — enclosure
summary: One line, shown on the tile and used as the page's meta description.
status: finished          # finished | in-progress | one-off
completed: 2026-08        # YYYY-MM, sorts the grid
featured: true            # the three newest featured pieces lead the homepage
madeToOrder: true
leadTime: 2 to 3 weeks
photo: /assets/img/hinged-enclosure.jpg
photoAlt: The enclosure open on the bench, lid resting to one side.
placeholder: false        # true prints a "photographs still to come" note
specs:
  - label: Material
    value: PLA
  - label: Wall
    value: 1.6 mm
---

Two or three sentences of notes. Bench voice: past tense, numbers with units.
```

Leave `photo` out and the page shows a striped placeholder box instead.

The three pieces currently in `src/pieces/` are placeholders. They are marked
`placeholder: true`, which prints a visible note on the page, so they cannot be mistaken for
real work once the site is live.

## Running it

```sh
npm install
npm run build          # Eleventy -> _site/
npm run dev            # build, then wrangler dev on http://127.0.0.1:8787
```

For the enquiry form to work locally, create the table once:

```sh
npm run db:init:local
```

## Deploying

1. **Log in**, once per machine:

   ```sh
   npx wrangler login
   ```

2. **Create the database.** `--update-config` writes the new database id straight into
   `wrangler.jsonc`, replacing the placeholder:

   ```sh
   npx wrangler d1 create hwip-orders --update-config
   npm run db:init          # creates the table on the remote database
   ```

   Add `--location weur` (or `eeur`, `enam`, `wnam`, `apac`, `oc`) to put the data near you.

3. **Set where enquiries go.** `ORDER_TO_EMAIL` in `wrangler.jsonc` is your address.
   `ORDER_FROM_EMAIL` must be on a domain verified with [Resend](https://resend.com).

4. **Set the secrets:**

   ```sh
   npx wrangler secret put RESEND_API_KEY   # optional — enables the notification email
   npx wrangler secret put IP_SALT          # any long random string
   ```

5. **Deploy:**

   ```sh
   npm run deploy
   ```

6. **Point the domain.** Add `hwip.vejas.zip` as a custom domain on the Worker in the
   Cloudflare dashboard, under Workers & Pages → hwip → Settings → Domains & Routes.

## How the enquiry form behaves

`POST /api/order` is the only route the Worker handles; everything else is a static file
served from the edge.

- **The D1 row is the record.** An enquiry is only reported as received once it is written.
  If the database is unreachable the form says so — it never claims to have sent something
  it dropped.
- **Email is a notification on top of that**, sent after the response and allowed to fail.
  A mail outage delays your notification; it does not lose the enquiry. Rows carry a
  `notified` flag so you can find any that did not get through.
- **Without JavaScript** the form posts normally and the Worker redirects to `/order/thanks/`.
  With JavaScript, the answer appears in place and the page does not navigate.
- **Spam handling:** a honeypot field (accepted and discarded silently, so a bot learns
  nothing), and a limit of 5 enquiries per IP per hour. Turnstile verification switches on
  automatically if you set `TURNSTILE_SECRET_KEY` — you would also need to add the widget to
  the form.
- **What is stored:** name, email, the message and the optional fields, plus a salted hash of
  the sender's IP. The raw IP is never written. The hash exists only so the rate limiter can
  recognise a repeat sender.

Read recent enquiries with:

```sh
npx wrangler d1 execute hwip-orders --remote \
  --command="SELECT created_at, name, email, piece, message FROM orders ORDER BY id DESC LIMIT 20"
```

## Before going live

- [ ] Replace the three placeholder pieces with real work and photographs
- [ ] Set `ORDER_TO_EMAIL` and the Resend key, then send yourself a test enquiry
- [ ] Confirm the lead times quoted on the piece pages are current
- [ ] Consider a dedicated 1200×630 share image; link previews currently use the 1000×1000
      profile mark
