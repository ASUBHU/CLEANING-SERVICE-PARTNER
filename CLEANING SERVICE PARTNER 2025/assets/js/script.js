/*
  Single-file JS for interactions:
  - Pricing toggle
  - Booking autopopulate
  - Lead capture (localStorage + optional webhook)
  - Export CSV
  - Scroll reveal animations
  - Form validation
*/

/* =========== CONFIG ================ */
const GOOGLE_SHEETS_URL = ""; // <-- INSERT your webhook URL here (optional)
const WHATSAPP_NUMBER   = "918926200461"; // default WhatsApp number for quick send

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- SAFE HELPERS ---------- */
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const on = (el, evt, fn) => el && el.addEventListener(evt, fn);
  const hasBootstrap = typeof window.bootstrap !== 'undefined';

  /* ---------- Dynamic year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- REVEAL ON SCROLL ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    reveals.forEach(r => obs.observe(r));
  } else {
    // Fallback: reveal immediately
    reveals.forEach(r => r.classList.add('visible'));
  }

  /* ---------- PRICING TOGGLE ---------- */
  const btnMonthly = $('#toggle-monthly');
  const btnOne     = $('#toggle-onetime');
  const priceEls   = $$('.price');

  function setPricing(mode) { // mode = 'monthly' or 'onetime'
    if (!priceEls.length) return;
    priceEls.forEach(el => {
      const m = el.getAttribute('data-monthly') ?? '';
      const o = el.getAttribute('data-onetime') ?? '';
      el.textContent = (mode === 'monthly' ? '₹' + m : '₹' + o);
    });
    if (btnMonthly && btnOne) {
      const isMonthly = mode === 'monthly';
      btnMonthly.classList.toggle('active', isMonthly);
      btnOne.classList.toggle('active', !isMonthly);
      btnMonthly.setAttribute('aria-pressed', String(isMonthly));
      btnOne.setAttribute('aria-pressed', String(!isMonthly));
    }
  }
  if (btnMonthly && btnOne) {
    on(btnMonthly, 'click', () => setPricing('monthly'));
    on(btnOne,     'click', () => setPricing('onetime'));
    setPricing('monthly'); // default
  }

  /* ---------- BOOK BUTTONS (prefill form) ---------- */
  $$('.btn-book').forEach(btn => {
    on(btn, 'click', () => {
      const service = btn.getAttribute('data-service') || '';
      const sel = $('#lead_service');
      if (sel) { sel.value = service; sel.classList.add('is-valid'); }
      // Scroll to contact
      location.hash = '#contact';
      // Focus name field if present
      setTimeout(() => { const n = $('#lead_name'); if (n) n.focus(); }, 300);
    });
  });

  /* ---------- Lead storage helpers ---------- */
  function getLeads() {
    try { return JSON.parse(localStorage.getItem('csp_leads') || '[]'); }
    catch { return []; }
  }
  function saveLeadLocal(lead) {
    const arr = getLeads();
    arr.unshift(lead);
    localStorage.setItem('csp_leads', JSON.stringify(arr));
  }
  function exportLeadsCSV() {
    const arr = getLeads();
    if (!arr.length) { alert('No leads to export'); return; }
    const keys = Object.keys(arr[0]);
    const rows = arr.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g,'""')}"`).join(','));
    const csv  = [keys.join(','), ...rows].join('\n'); // correct newline
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'csp_leads.csv'; a.click();
    URL.revokeObjectURL(url);
  }
  async function postToWebhook(lead) {
    if (!GOOGLE_SHEETS_URL) return { ok: false, reason: 'no-url' };
    try {
      const r = await fetch(GOOGLE_SHEETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      // Accept either {ok:true} or status 200
      const data = await r.json().catch(() => ({}));
      return data?.ok ? data : { ok: r.ok, status: r.status };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  /* ---------- FORM VALIDATION + SUBMIT ---------- */
  const form       = $('#leadForm');
  const submitBtn  = $('#submitBtn');
  const whBtn      = $('#whBtn');
  const leadStatus = $('#leadStatus');

  if (form) {
    on(form, 'submit', async (e) => {
      e.preventDefault();
      form.classList.add('was-validated');
      if (!form.checkValidity()) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Sending...';
      }

      const lead = {
        id: Date.now(),
        name:   ($('#lead_name')?.value || '').trim(),
        email:  ($('#lead_email')?.value || '').trim(),
        phone:  ($('#lead_phone')?.value || '').trim(),
        service: $('#lead_service')?.value || '',
        datetime: $('#lead_datetime')?.value || '',
        message: ($('#lead_message')?.value || '').trim(),
        created_at: new Date().toISOString()
      };

      try { saveLeadLocal(lead); } catch (err) { console.error('local save failed', err); }

      const webhookRes = await postToWebhook(lead);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane me-2"></i>Send Enquiry';
      }
      if (leadStatus) {
        leadStatus.textContent = (webhookRes && webhookRes.ok)
          ? 'Lead saved and sent. We will contact you soon.'
          : 'Lead saved locally. (No webhook configured or send failed.)';
      }

      // clear message & datetime; keep contact info
      const msgEl = $('#lead_message');  if (msgEl) msgEl.value = '';
      const dtEl  = $('#lead_datetime'); if (dtEl)  dtEl.value  = '';
      form.classList.remove('was-validated');

      alert('Thanks! Your enquiry is saved. We will contact you soon.');
    });
  }

  /* ---------- WhatsApp quick send ---------- */
  if (whBtn) {
    on(whBtn, 'click', () => {
      const name    = ($('#lead_name')?.value || '').trim();
      const phone   = ($('#lead_phone')?.value || '').trim();
      const service = $('#lead_service')?.value || '';
      const message = ($('#lead_message')?.value || '').trim();
      if (!name || !phone || !service) {
        alert('Please fill Name, Phone and Service to send WhatsApp');
        return;
      }
      const text =
        `Enquiry from website\n` +
        `Name: ${name}\n` +
        `Phone: ${phone}\n` +
        `Service: ${service}\n` +
        `Message: ${message}`;
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });
  }

  /* ---------- ADMIN CONTROLS ---------- */
  const viewBtn    = $('#viewLeadsBtn');
  const exportBtn  = $('#exportBtn');
  const clearBtn   = $('#clearBtn');
  const leadsModalEl = $('#leadsModal');
  const leadsList  = $('#leadsList');
  const leadsModal = (hasBootstrap && leadsModalEl)
    ? bootstrap.Modal.getOrCreateInstance(leadsModalEl)
    : null;

  if (viewBtn && leadsList) {
    on(viewBtn, 'click', () => {
      const arr = getLeads();
      leadsList.innerHTML = '';
      if (!arr.length) {
        leadsList.innerHTML = '<div class="text-center text-muted">No saved leads.</div>';
        leadsModal?.show?.();
        return;
      }
      arr.forEach(l => {
        const el = document.createElement('div');
        el.className = 'list-group-item';
        el.innerHTML =
          `<div class="d-flex justify-content-between">` +
            `<div><strong>${escapeHtml(l.name||'—')}</strong>` +
              `<div class="small text-muted">${escapeHtml(l.email||'')} • ${escapeHtml(l.phone||'')}</div>` +
            `</div>` +
            `<div class="small text-muted">${new Date(l.created_at).toLocaleString()}</div>` +
          `</div>` +
          `<div class="pt-2 small">${escapeHtml(l.service||'')}` +
          `${l.datetime ? (' • ' + escapeHtml(l.datetime)) : ''}` +
          `<div class="mt-2">${escapeHtml(l.message||'')}</div></div>`;
        leadsList.appendChild(el);
      });
      leadsModal?.show?.();
    });
  }
  if (exportBtn) on(exportBtn, 'click', exportLeadsCSV);
  if (clearBtn) {
    on(clearBtn, 'click', () => {
      if (!confirm('Clear all saved leads from localStorage? This cannot be undone.')) return;
      localStorage.removeItem('csp_leads');
      alert('Leads cleared.');
    });
  }

  /* ---------- UTIL: escape HTML ---------- */
  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;');
  }

  /* ---------- OPTIONAL: Testimonials auto-rotate ---------- */
  const testi = $('#testimonials');
  if (testi && hasBootstrap?.Carousel) {
    bootstrap.Carousel.getOrCreateInstance(testi, { interval: 5000 });
  }

  /* ---------- OPTIONAL: Reset button clears validation ---------- */
  const resetBtn = $('#resetBtn');
  if (resetBtn && form) {
    on(resetBtn, 'click', () => form.classList.remove('was-validated'));
  }
});

/* about page js code*/

// IntersectionObserver: reveal on scroll
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){ e.target.classList.add('show'); io.unobserve(e.target); }
      })
    },{threshold:.12});
    document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

    // Smooth counter animation when in view
    const counters = document.querySelectorAll('.counter');
    const counterIO = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          const el = entry.target;
          const target = +el.getAttribute('data-target');
          const duration = 1400; // ms
          const start = performance.now();
          const from = 0;
          function tick(now){
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
            el.textContent = Math.round(from + (target - from) * eased).toLocaleString();
            if(p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          counterIO.unobserve(el);
        }
      })
    },{threshold:.35});
    counters.forEach(c=>counterIO.observe(c));

    // Navbar shadow on scroll
    const nav = document.querySelector('.navbar');
    const navShadow = ()=>{ nav.style.boxShadow = window.scrollY>10 ? '0 10px 30px rgba(0,0,0,.25)' : 'none'; };
    window.addEventListener('scroll', navShadow); navShadow();