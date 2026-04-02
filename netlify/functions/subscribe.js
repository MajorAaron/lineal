// subscribe.js — Lineal waitlist signup function
const { createClient } = require('@libsql/client');

function lazyClient() {
  return createClient({
    url: process.env.TURSO_DB_URL,
    authToken: process.env.TURSO_DB_TOKEN,
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { email, source, utm_source, utm_medium, utm_campaign, utm_content } = body;
  if (!email || !email.includes('@')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Valid email required' }) };
  }

  const idea_slug = process.env.IDEA_SLUG || 'lineal';

  try {
    // Insert into Turso
    const db = lazyClient();
    await db.execute({
      sql: `INSERT INTO subscribers (email, idea_slug, source, utm_source, utm_medium, utm_campaign, utm_content)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email, idea_slug) DO UPDATE SET
              source = excluded.source,
              utm_source = COALESCE(excluded.utm_source, subscribers.utm_source),
              utm_medium = COALESCE(excluded.utm_medium, subscribers.utm_medium),
              utm_campaign = COALESCE(excluded.utm_campaign, subscribers.utm_campaign),
              utm_content = COALESCE(excluded.utm_content, subscribers.utm_content)`,
      args: [email, idea_slug, source || 'landing', utm_source || null, utm_medium || null, utm_campaign || null, utm_content || null],
    });

    // Send welcome email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'hello@majorsolutions.biz',
          to: email,
          subject: "You're on the Lineal early access list",
          html: `
            <div style="max-width:560px;margin:0 auto;font-family:Georgia,serif;color:#2c2c2c;padding:2rem;">
              <h1 style="font-size:2rem;color:#1a2744;margin-bottom:0.5rem;">You're in.</h1>
              <p style="font-size:1rem;line-height:1.7;margin-bottom:1.25rem;">
                Thanks for joining the Lineal waitlist. You're one of 340+ professional genealogists who are tired of managing their practice with Word documents and spreadsheets.
              </p>
              <p style="font-size:1rem;line-height:1.7;margin-bottom:1.25rem;">
                We'll reach out with early access details shortly. First 100 members lock in <strong>40% off forever</strong>.
              </p>
              <hr style="border:none;border-top:1px solid #e8dcbf;margin:1.5rem 0;" />
              <p style="font-size:0.85rem;color:#888;">
                Lineal — The business platform professional genealogists actually need.<br />
                <a href="https://lineal.majorsolutions.biz" style="color:#c9973b;">lineal.majorsolutions.biz</a>
              </p>
            </div>
          `,
        }),
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Subscribe error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Subscription failed', details: err.message }),
    };
  }
};
