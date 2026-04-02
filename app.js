/* ===== LINEAL — app.js ===== */

// ── Signup Form Handler ──────────────────────────────
function handleSignupForm(formEl, source) {
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = formEl.querySelector('input[type="email"]');
    const btn = formEl.querySelector('button[type="submit"]');
    const email = emailInput.value.trim();
    if (!email) return;

    btn.disabled = true;
    btn.textContent = 'Joining…';

    const urlParams = new URLSearchParams(window.location.search);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
          utm_source: urlParams.get('utm_source') || '',
          utm_medium: urlParams.get('utm_medium') || '',
          utm_campaign: urlParams.get('utm_campaign') || '',
          utm_content: urlParams.get('utm_content') || '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        formEl.innerHTML = '<div class="form-success">✓ You\'re on the list! We\'ll be in touch.</div>';
        if (typeof posthog !== 'undefined') {
          posthog.capture('waitlist_signup', { source });
        }
      } else {
        throw new Error(data.error || 'Signup failed');
      }
    } catch (err) {
      formEl.innerHTML = `<div class="form-error">Something went wrong — please email hello@majorsolutions.biz</div>`;
    }
  });
}

// ── AI Research Plan Generator ───────────────────────
const aiSubmitBtn = document.getElementById('ai-submit');
const aiResult = document.getElementById('ai-result');
const aiLoading = document.getElementById('ai-loading');
const aiPrompt = document.getElementById('ai-prompt');

if (aiSubmitBtn) {
  aiSubmitBtn.addEventListener('click', async () => {
    const prompt = aiPrompt ? aiPrompt.value.trim() : '';
    if (!prompt) {
      aiResult.style.display = 'block';
      aiResult.textContent = 'Please describe what you know about the ancestor before generating a plan.';
      return;
    }

    aiSubmitBtn.disabled = true;
    aiLoading.style.display = 'block';
    aiResult.style.display = 'none';

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      aiLoading.style.display = 'none';
      aiResult.style.display = 'block';

      if (res.ok && data.result) {
        aiResult.textContent = data.result;
      } else {
        aiResult.textContent = 'Could not generate plan right now — our AI is warming up. Try again in a moment!';
      }
    } catch (err) {
      aiLoading.style.display = 'none';
      aiResult.style.display = 'block';
      aiResult.textContent = 'Connection error. Please try again.';
    } finally {
      aiSubmitBtn.disabled = false;
    }
  });
}

// ── Pricing Tier View Tracking ───────────────────────
const pricingGrid = document.getElementById('pricing-grid');
if (pricingGrid && typeof IntersectionObserver !== 'undefined') {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && typeof posthog !== 'undefined') {
        posthog.capture('pricing_tier_view', { visible_tier: 'all' });
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });
  observer.observe(pricingGrid);
}

// ── Initialize Forms ─────────────────────────────────
const heroForm = document.getElementById('hero-form');
const footerForm = document.getElementById('footer-form');
if (heroForm) handleSignupForm(heroForm, 'hero');
if (footerForm) handleSignupForm(footerForm, 'footer');
