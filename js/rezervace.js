/* =========================================================
   Rezervační kalendář, výpočet ceny a odeslání poptávky
   ========================================================= */
(() => {
  const C = window.CONFIG;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Datumy ---------- */
  const pad = n => String(n).padStart(2, '0');
  const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const add = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
  const diff = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const dow = k => parse(k).getDay(); // 0 = neděle
  const todayKey = key(new Date());

  const fmtLong = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' });
  const fmtShort = new Intl.DateTimeFormat('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' });
  const fmtMonth = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' });
  const dateLong = k => fmtLong.format(parse(k));
  const dateShort = k => fmtShort.format(parse(k));
  const kc = n => n.toLocaleString('cs-CZ') + ' Kč';
  const plural = (n, one, few, many) => `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;
  const noci = n => plural(n, 'noc', 'noci', 'nocí');

  /* ---------- Státní svátky ČR ---------- */
  const holidayCache = {};
  const holidays = y => {
    if (holidayCache[y]) return holidayCache[y];
    // Velikonoce (Meeus/Jones/Butcher)
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = key(new Date(y, month - 1, day));
    const fixed = ['01-01', '05-01', '05-08', '07-05', '07-06', '09-28', '10-28', '11-17', '12-24', '12-25', '12-26'].map(md => `${y}-${md}`);
    return (holidayCache[y] = new Set([...fixed, add(easter, -2), add(easter, 1)]));
  };
  const isHoliday = k => holidays(+k.slice(0, 4)).has(k);

  /* ---------- Obsazenost ---------- */
  const busy = new Set();
  (window.OBSAZENO || []).forEach(r => { for (let k = r.od; k < r.do; k = add(k, 1)) busy.add(k); });
  const nightBusy = k => busy.has(k);
  const rangeFree = (a, b) => { for (let k = a; k < b; k = add(k, 1)) if (busy.has(k)) return false; return true; };

  /* ---------- Sezóna a ceny ---------- */
  const seasonOf = k => C.hlavniSezona.find(s => k >= s.od && k < s.do);
  const inWeekendPeriod = k => C.vikendovaObdobi.some(p => k >= p.od && k < p.do);
  const nightPrice = k => {
    const wd = dow(k);
    const weekend = wd === 5 || wd === 6 || wd === 0 || isHoliday(k) || isHoliday(add(k, 1)) || inWeekendPeriod(k);
    return weekend ? C.mimoSezonu.nocVikend : C.mimoSezonu.nocVsedni;
  };

  const validate = (a, b) => {
    const n = diff(a, b);
    let high = false;
    for (let k = a; k < b; k = add(k, 1)) if (seasonOf(k)) { high = true; break; }
    if (!rangeFree(a, b)) return 'Mezi vybranými dny je už obsazeno. Zkuste prosím jiný termín.';
    if (high && (dow(a) !== 6 || dow(b) !== 6 || n % 7)) {
      const s = seasonOf(a) || seasonOf(add(b, -1)) || C.hlavniSezona[0];
      return `V hlavní sezóně (${dateShort(s.od).replace(/^\S+ /, '')} – ${dateShort(s.do).replace(/^\S+ /, '')}) přijímáme jen týdenní pobyty od soboty do soboty.`;
    }
    if (!high && n < C.minNoci) return `Minimální délka pobytu jsou ${noci(C.minNoci)}.`;
    return null;
  };

  const price = (a, b) => {
    const n = diff(a, b);
    const lines = [];
    let total = 0;
    let high = false;
    for (let k = a; k < b; k = add(k, 1)) if (seasonOf(k)) high = true;

    if (high) {
      let hw = 0, ow = 0, hp = 0;
      for (let w = 0; w < n / 7; w++) {
        const ws = add(a, w * 7);
        let s = null;
        for (let i = 0; i < 7; i++) s = s || seasonOf(add(ws, i));
        if (s) { hw++; hp = s.tyden; total += s.tyden; } else { ow++; total += C.mimoSezonu.tyden; }
      }
      if (hw) lines.push([`${plural(hw, 'týden', 'týdny', 'týdnů')} v hlavní sezóně`, hw * hp]);
      if (ow) lines.push([`${plural(ow, 'týden', 'týdny', 'týdnů')} mimo sezónu`, ow * C.mimoSezonu.tyden]);
      return { total, lines, n };
    }

    const nights = [];
    for (let k = a; k < b; k = add(k, 1)) nights.push(nightPrice(k));
    const sum = arr => arr.reduce((x, y) => x + y, 0);
    const perNight = sum(nights);
    const weeks = Math.floor(n / 7);
    const rest = nights.slice(weeks * 7);
    const withWeeks = weeks * C.mimoSezonu.tyden + sum(rest);

    const groupNights = arr => {
      const g = {};
      arr.forEach(p => { g[p] = (g[p] || 0) + 1; });
      Object.keys(g).sort((x, y) => x - y).forEach(p => lines.push([`${noci(g[p])} × ${kc(+p)}`, g[p] * p]));
    };
    if (weeks && withWeeks < perNight) {
      lines.push([`${plural(weeks, 'týdenní pobyt', 'týdenní pobyty', 'týdenních pobytů')}`, weeks * C.mimoSezonu.tyden]);
      groupNights(rest);
      total = withWeeks;
    } else {
      groupNights(nights);
      total = perNight;
    }
    return { total, lines, n };
  };

  /* ---------- Stav ---------- */
  const state = { start: null, end: null, view: null, guests: { dospeli: 2, miminka: 0, psi: 0 } };
  const first = new Date(); first.setDate(1);
  const minView = key(first);
  const maxView = (() => { const d = new Date(first); d.setMonth(d.getMonth() + 18); return key(d); })();
  state.view = minView;

  /* ---------- Kalendář ---------- */
  const monthsEl = $('#calMonths');
  const msgEl = $('#calMsg');
  const prevBtn = $('#calPrev');
  const nextBtn = $('#calNext');
  const DOW = ['po', 'út', 'st', 'čt', 'pá', 'so', 'ne'];

  const addMonths = (k, n) => { const d = parse(k); d.setMonth(d.getMonth() + n); return key(d); };

  const dayClasses = k => {
    const cls = ['day'];
    const past = k < todayKey;
    const busyNow = nightBusy(k), busyPrev = nightBusy(add(k, -1));
    if (seasonOf(k)) cls.push('is-season');
    if (dow(k) === 6) cls.push('is-sat');
    if (k === todayKey) cls.push('is-today');
    if (!past) {
      if (busyNow && busyPrev) cls.push('is-busy');
      else if (busyNow) cls.push('is-busy-start');
      else if (busyPrev) cls.push('is-busy-end');
    }
    const { start, end } = state;
    if (start === k) cls.push('is-start');
    if (start === k && end) cls.push('has-end');
    if (end === k) cls.push('is-end');
    if (start && end && k > start && k < end) cls.push('in-range');
    return { cls: cls.join(' '), disabled: past || (busyNow && busyPrev) };
  };

  const render = (dir = 0) => {
    const months = [state.view, addMonths(state.view, 1)];
    monthsEl.innerHTML = months.map(m => {
      const d0 = parse(m);
      const y = d0.getFullYear(), mo = d0.getMonth();
      const offset = (d0.getDay() + 6) % 7;
      const count = new Date(y, mo + 1, 0).getDate();
      let cells = DOW.map(d => `<span class="dow">${d}</span>`).join('');
      for (let i = 0; i < offset; i++) cells += '<span class="day is-blank"></span>';
      for (let i = 1; i <= count; i++) {
        const k = `${y}-${pad(mo + 1)}-${pad(i)}`;
        const { cls, disabled } = dayClasses(k);
        cells += `<button type="button" class="${cls}" data-d="${k}" ${disabled ? 'disabled' : ''} aria-label="${fmtLong.format(parse(k))}${nightBusy(k) && nightBusy(add(k, -1)) ? ', obsazeno' : ''}"><span>${i}</span></button>`;
      }
      return `<div class="month${dir ? (dir > 0 ? ' slide-r' : ' slide-l') : ''}"><div class="month__name">${fmtMonth.format(d0)}</div><div class="month__grid">${cells}</div></div>`;
    }).join('');
    prevBtn.disabled = state.view <= minView;
    nextBtn.disabled = state.view >= maxView;
  };

  const refresh = () => {
    $$('.day[data-d]', monthsEl).forEach(b => {
      const { cls } = dayClasses(b.dataset.d);
      b.className = cls;
    });
    updateSteps();
    renderSummary();
  };

  const say = (text, ok = false) => {
    msgEl.textContent = text || '';
    msgEl.classList.toggle('is-ok', ok);
  };

  const updateSteps = () => {
    $('#stepIn b').textContent = state.start ? dateShort(state.start) : '—';
    $('#stepOut b').textContent = state.end ? dateShort(state.end) : '—';
    $('#stepIn').classList.toggle('is-active', !state.start || (state.start && state.end));
    $('#stepOut').classList.toggle('is-active', !!state.start && !state.end);
  };

  const pick = k => {
    const { start, end } = state;
    const highWeek = start && end && seasonOf(start) && dow(k) === 6 && k > start;

    // prodloužení týdenního pobytu v sezóně dalším kliknutím na sobotu
    if (highWeek && !validate(start, k)) {
      state.end = k;
      say(`Vybráno ${noci(diff(start, k))}. Pro změnu příjezdu klikněte na jiný den.`, true);
      return refresh();
    }

    if (!start || end || k <= start) {
      if (nightBusy(k)) { say('Tento den je obsazený pro příjezd – můžete ho ale vybrat jako den odjezdu.'); return; }
      if (seasonOf(k) && dow(k) !== 6) { say('V hlavní sezóně je příjezd i odjezd jen v sobotu. Vyberte prosím sobotu (tučně).'); return; }
      state.start = k; state.end = null;
      // v sezóně rovnou nabídnout celý týden
      if (seasonOf(k) && !validate(k, add(k, 7))) {
        state.end = add(k, 7);
        say('Vybrán týden sobota – sobota. Kliknutím na další sobotu pobyt prodloužíte.', true);
      } else {
        say('Teď vyberte den odjezdu.', true);
      }
      return refresh();
    }

    const err = validate(start, k);
    if (err) { say(err); return; }
    state.end = k;
    say(`Skvělé – ${noci(diff(start, k))}. Vyplňte prosím kontakt vpravo.`, true);
    refresh();
    if (innerWidth <= 1080) setTimeout(() => $('#summary').scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
  };

  monthsEl.addEventListener('click', e => {
    const b = e.target.closest('.day[data-d]');
    if (b && !b.disabled) pick(b.dataset.d);
  });

  // náhled rozsahu při najetí myší
  monthsEl.addEventListener('mouseover', e => {
    const b = e.target.closest('.day[data-d]');
    $$('.in-hover', monthsEl).forEach(x => x.classList.remove('in-hover'));
    if (!b || !state.start || state.end || b.dataset.d <= state.start) return;
    for (let k = add(state.start, 1); k <= b.dataset.d; k = add(k, 1)) {
      if (nightBusy(add(k, -1))) break;
      const el = $(`[data-d="${k}"]`, monthsEl);
      if (el) el.classList.add('in-hover');
    }
  });
  monthsEl.addEventListener('mouseleave', () => $$('.in-hover', monthsEl).forEach(x => x.classList.remove('in-hover')));

  prevBtn.addEventListener('click', () => { state.view = addMonths(state.view, -1); render(-1); });
  nextBtn.addEventListener('click', () => { state.view = addMonths(state.view, 1); render(1); });

  // swipe mezi měsíci na mobilu
  let tx = null;
  monthsEl.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  monthsEl.addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 60) (dx < 0 ? nextBtn : prevBtn).click();
    tx = null;
  });

  /* ---------- Hosté ---------- */
  const limits = { dospeli: C.kapacita.maxHoste, miminka: C.kapacita.maxMiminka, psi: C.kapacita.maxPsi };
  $$('.stepper').forEach(st => {
    const field = st.dataset.field, min = +st.dataset.min;
    const [minus, plus] = $$('button', st);
    const out = $('output', st);
    const sync = () => {
      out.textContent = state.guests[field];
      minus.disabled = state.guests[field] <= min;
      plus.disabled = state.guests[field] >= limits[field];
    };
    minus.addEventListener('click', () => { state.guests[field]--; sync(); renderSummary(); });
    plus.addEventListener('click', () => { state.guests[field]++; sync(); renderSummary(); });
    sync();
  });

  /* ---------- Souhrn ---------- */
  const summaryEl = $('#summary');
  let shownTotal = 0;
  const animateNumber = (el, from, to) => {
    const t0 = performance.now(), dur = 700;
    const step = t => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = kc(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const renderSummary = () => {
    const { start, end, guests } = state;
    if (!start || !end) {
      summaryEl.innerHTML = `<div class="summary__empty"><svg><use href="#i-sun"/></svg><p>${start ? `Příjezd <b>${dateLong(start)}</b>.<br><small>Teď vyberte v kalendáři den odjezdu.</small>` : `Zatím nemáte vybraný termín.<br><small>Minimální pobyt mimo sezónu jsou ${noci(C.minNoci)}, v létě týden od soboty do soboty.</small>`}</p></div>`;
      summaryEl.classList.remove('has-data');
      shownTotal = 0;
      return;
    }
    const p = price(start, end);
    const dogs = guests.psi ? guests.psi * C.poplatky.pesNoc * p.n : 0;
    summaryEl.innerHTML = `
      <div class="sum__dates">
        <div><small>příjezd ${C.prijezd}</small><strong>${dateShort(start)}</strong></div>
        <span class="sum__nights">${noci(p.n)} →</span>
        <div><small>odjezd ${C.odjezd}</small><strong>${dateShort(end)}</strong></div>
      </div>
      <div class="sum__lines">
        ${p.lines.map(([l, v]) => `<p><span>${l}</span><span>${kc(v)}</span></p>`).join('')}
        <p><span>Místní poplatek obci</span><span>v ceně</span></p>
        ${dogs ? `<p><span>${plural(guests.psi, 'pes', 'psi', 'psů')} – platí se na místě</span><span>${kc(dogs)}</span></p>` : ''}
      </div>
      <div class="sum__total"><span>Celkem za ubytování<br>${plural(guests.dospeli + guests.miminka, 'host', 'hosté', 'hostů')}</span><b id="sumTotal">${kc(shownTotal)}</b></div>
      <p class="sum__note">Záloha ${C.poplatky.zalohaProcent} %: ${kc(Math.round(p.total * C.poplatky.zalohaProcent / 100))} až po potvrzení termínu. Energie se doplácí podle spotřeby.</p>`;
    animateNumber($('#sumTotal'), shownTotal, p.total);
    shownTotal = p.total;
    summaryEl.classList.add('has-data');
    summaryEl.classList.remove('is-bump'); void summaryEl.offsetWidth; summaryEl.classList.add('is-bump');
  };

  /* ---------- Nejbližší volný termín ---------- */
  const findNextFree = () => {
    const from = new Date().getHours() < 12 ? todayKey : add(todayKey, 1);
    for (let k = from, i = 0; i < 540; i++, k = add(k, 1)) {
      if (nightBusy(k)) continue;
      if (seasonOf(k)) { if (dow(k) === 6 && !validate(k, add(k, 7))) return [k, add(k, 7)]; continue; }
      const e = add(k, C.minNoci);
      if (!validate(k, e)) return [k, e];
    }
    return null;
  };
  const next = findNextFree();
  const nextEl = $('#nextFree');
  if (next) {
    nextEl.textContent = `${dateShort(next[0])} – ${dateShort(next[1])}`;
    $('.hero__free').addEventListener('click', () => {
      state.start = next[0]; state.end = next[1];
      const d = parse(next[0]); d.setDate(1); state.view = key(d);
      render(); updateSteps(); renderSummary();
      say(`Předvybrali jsme nejbližší volný termín. Můžete ho v kalendáři změnit.`, true);
    });
  } else nextEl.textContent = 'napište nám';

  /* ---------- Ceník z nastavení ---------- */
  const upcoming = C.hlavniSezona.find(s => s.do > todayKey) || C.hlavniSezona[C.hlavniSezona.length - 1];
  const dm = k => { const d = parse(k); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
  $('#seasonDates').textContent = `${dm(upcoming.od)} – ${dm(upcoming.do)} ${upcoming.od.slice(0, 4)}`;
  $('[data-year-price]').textContent = upcoming.od.slice(0, 4);
  const fmtN = n => n.toLocaleString('cs-CZ');
  $('[data-price="sezona"]').textContent = fmtN(upcoming.tyden);
  $('[data-price="vsedni"]').textContent = fmtN(C.mimoSezonu.nocVsedni);
  $('[data-price="vikend"]').textContent = fmtN(C.mimoSezonu.nocVikend);
  $('[data-price="tyden"]').textContent = fmtN(C.mimoSezonu.tyden);

  /* ---------- Odeslání ---------- */
  const form = $('#bookingForm');
  const modal = $('#doneModal');
  const openModal = (title, html) => {
    $('#doneTitle').textContent = title;
    $('#doneText').innerHTML = html;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    $('[data-close]', modal).focus();
  };
  const closeModal = () => {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { modal.hidden = true; }, 300);
  };
  $('[data-close]', modal).addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  const markInvalid = (el, bad) => {
    const wrap = el.closest('.field, .check');
    wrap.classList.remove('is-invalid');
    if (bad) { void wrap.offsetWidth; wrap.classList.add('is-invalid'); }
    return bad;
  };
  form.addEventListener('input', e => { const w = e.target.closest('.field, .check'); if (w) w.classList.remove('is-invalid'); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.start || !state.end) {
      say('Nejdřív prosím vyberte v kalendáři příjezd a odjezd.');
      $('#calendar').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const f = form.elements;
    let bad = false;
    bad = markInvalid(f.jmeno, f.jmeno.value.trim().length < 3) || bad;
    bad = markInvalid(f.email, !f.email.validity.valid || !f.email.value) || bad;
    bad = markInvalid(f.telefon, f.telefon.value.replace(/\D/g, '').length < 9) || bad;
    bad = markInvalid(f.souhlas, !f.souhlas.checked) || bad;
    if (bad) { form.querySelector('.is-invalid input, .is-invalid textarea')?.focus(); return; }

    const p = price(state.start, state.end);
    const g = state.guests;
    const data = {
      'Příjezd': dateLong(state.start),
      'Odjezd': dateLong(state.end),
      'Počet nocí': p.n,
      'Hosté (od 3 let)': g.dospeli,
      'Děti do 3 let': g.miminka,
      'Psi': g.psi,
      'Orientační cena': kc(p.total),
      'Jméno': f.jmeno.value.trim(),
      'E-mail': f.email.value.trim(),
      'Telefon': f.telefon.value.trim(),
      'Zpráva': f.zprava.value.trim() || '—'
    };
    const text = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n');
    const subject = `Poptávka pobytu ${dateShort(state.start)} – ${dateShort(state.end)} (${data['Jméno']})`;

    const thanks = `<p>Poptávku na termín <b>${dateLong(state.start)} – ${dateLong(state.end)}</b> jsme přijali. Ozveme se vám na <b>${data['E-mail']}</b> obvykle do 24 hodin a pošleme platební údaje k záloze.</p>`;

    if (f.botcheck.checked) { openModal('Děkujeme!', thanks); return; }

    const mailto = `mailto:${C.kontakt.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Dobrý den,\n\nrád(a) bych si u vás rezervoval(a) pobyt:\n\n${text}\n\nDěkuji.`)}`;
    const wa = `https://wa.me/${C.kontakt.whatsapp}?text=${encodeURIComponent(`Dobrý den, rád(a) bych poptal(a) pobyt:\n${text}`)}`;
    const fallback = `
      <p>Zbývá poslední krok – odešlete nám poptávku jedním kliknutím. Text už je předvyplněný.</p>
      <p><a class="btn btn--wine" href="${mailto}">Odeslat e-mailem</a><a class="btn btn--outline" href="${wa}" target="_blank" rel="noopener">Poslat přes WhatsApp</a></p>
      <p><small>Nebo zavolejte na <a href="tel:${C.kontakt.telefon.replace(/\s/g, '')}">${C.kontakt.telefon}</a>.</small></p>`;

    if (!C.web3formsKey) { openModal('Skoro hotovo', fallback); return; }

    const btn = $('#submitBtn');
    btn.classList.add('is-loading'); btn.disabled = true;
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: C.web3formsKey, subject, from_name: 'Web – Dům u Slunce a Vína', replyto: data['E-mail'], ...data })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      openModal('Děkujeme!', thanks);
      form.reset();
    } catch (err) {
      openModal('Nepodařilo se odeslat', `<p>Omlouváme se, poptávku se nepodařilo odeslat automaticky.</p>${fallback}`);
    } finally {
      btn.classList.remove('is-loading'); btn.disabled = false;
    }
  });

  /* ---------- Start ---------- */
  render();
  updateSteps();
  renderSummary();
})();
