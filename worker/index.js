/**
 * hw.i.p — static site plus one endpoint.
 *
 * Cloudflare serves everything in _site/ from the edge before this Worker runs.
 * The only request that gets here is POST /api/order, the commission enquiry form.
 *
 * The form works with and without JavaScript: a fetch with `Accept: application/json`
 * gets JSON back, a plain browser form post gets a 303 to /order/thanks/.
 */

const MAX_LENGTHS = {
  name: 120,
  email: 200,
  piece: 120,
  message: 4000,
  deadline: 120,
  budget: 120,
};

const RATE_LIMIT_PER_HOUR = 5;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/order") {
      if (request.method !== "POST") {
        return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
      }
      return handleOrder(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleOrder(request, env, ctx) {
  const wantsJson = (request.headers.get("Accept") || "").includes("application/json");

  if (!env.DB) {
    // Better a clear failure than a form that says "sent" and drops the enquiry.
    return fail(wantsJson, "The enquiry form is not connected yet.", 503);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail(wantsJson, "That submission could not be read.", 400);
  }

  // Honeypot: hidden from people, filled in by bots. Accept and discard, so
  // the bot has nothing to learn from the response.
  if (str(form.get("company"))) {
    return succeed(wantsJson);
  }

  const fields = {
    name: str(form.get("name")),
    email: str(form.get("email")),
    piece: str(form.get("piece")),
    message: str(form.get("message")),
    deadline: str(form.get("deadline")),
    budget: str(form.get("budget")),
  };

  const problem = validate(fields);
  if (problem) return fail(wantsJson, problem, 400);

  if (env.TURNSTILE_SECRET_KEY) {
    const ok = await verifyTurnstile(env.TURNSTILE_SECRET_KEY, str(form.get("cf-turnstile-response")), clientIp(request));
    if (!ok) return fail(wantsJson, "Could not verify that submission came from a browser.", 400);
  }

  const ipHash = await hashIp(clientIp(request), env.IP_SALT);

  if (ipHash) {
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM orders WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')"
    )
      .bind(ipHash)
      .first();
    if (recent && recent.n >= RATE_LIMIT_PER_HOUR) {
      return fail(wantsJson, "That is a lot of enquiries in one hour. Try again later.", 429);
    }
  }

  let inserted;
  try {
    inserted = await env.DB.prepare(
      `INSERT INTO orders (name, email, piece, message, deadline, budget, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`
    )
      .bind(
        fields.name,
        fields.email,
        fields.piece || null,
        fields.message,
        fields.deadline || null,
        fields.budget || null,
        ipHash,
        (request.headers.get("User-Agent") || "").slice(0, 300)
      )
      .first();
  } catch (error) {
    console.error("order insert failed", error);
    return fail(wantsJson, "The enquiry could not be recorded.", 500);
  }

  // The row is the record of truth. Email is a notification on top of it, so a
  // mail outage must not lose an enquiry or fail the request.
  if (env.RESEND_API_KEY && env.ORDER_TO_EMAIL) {
    ctx.waitUntil(notify(env, fields, inserted && inserted.id));
  }

  return succeed(wantsJson);
}

function validate(fields) {
  if (!fields.name) return "Add your name.";
  if (!fields.email) return "Add an email address so there is somewhere to reply.";
  // Deliberately loose: the only real test of an address is sending to it.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return "That email address does not look right.";
  if (!fields.message) return "Say what the piece has to do.";

  for (const [key, limit] of Object.entries(MAX_LENGTHS)) {
    if (fields[key] && fields[key].length > limit) return `That ${key} is too long.`;
  }
  return null;
}

async function notify(env, fields, id) {
  const lines = [
    `Name:     ${fields.name}`,
    `Email:    ${fields.email}`,
    `Piece:    ${fields.piece || "something new"}`,
    `Needed:   ${fields.deadline || "not given"}`,
    `Budget:   ${fields.budget || "not given"}`,
    "",
    fields.message,
    "",
    `Enquiry #${id}`,
  ];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.ORDER_FROM_EMAIL,
        to: [env.ORDER_TO_EMAIL],
        reply_to: fields.email,
        subject: `hw.i.p enquiry — ${fields.piece || "something new"}`,
        text: lines.join("\n"),
      }),
    });

    if (!response.ok) {
      console.error("resend failed", response.status, await response.text());
      return;
    }
    await env.DB.prepare("UPDATE orders SET notified = 1 WHERE id = ?").bind(id).run();
  } catch (error) {
    console.error("resend threw", error);
  }
}

async function verifyTurnstile(secret, token, ip) {
  if (!token) return false;
  try {
    const body = new FormData();
    body.append("secret", secret);
    body.append("response", token);
    if (ip) body.append("remoteip", ip);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error("turnstile threw", error);
    return false;
  }
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "";
}

/** Rate limiting needs to recognise a repeat sender, not identify them. */
async function hashIp(ip, salt) {
  if (!ip) return null;
  const data = new TextEncoder().encode(`${salt || "hwip"}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function str(value) {
  return typeof value === "string" ? value.trim() : "";
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

function succeed(wantsJson) {
  if (wantsJson) return json({ ok: true }, 200);
  return new Response(null, { status: 303, headers: { Location: "/order/thanks/" } });
}

function fail(wantsJson, message, status) {
  if (wantsJson) return json({ error: message }, status);
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
