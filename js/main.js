/* =========================================================
   Animace, menu, řez domem, album, mapa výletů
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hlavička a plovoucí tlačítko ---------- */
  const header = $('#header');
  const fab = $('#fab');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-solid', y > 30);
    if (!document.body.classList.contains('nav-open')) {
      if (y > 500 && y > lastY + 4) header.classList.add('is-hidden');
      if (y < lastY - 4) header.classList.remove('is-hidden');
    }
    lastY = y;
    const b = $('#rezervace').getBoundingClientRect();
    fab.classList.toggle('is-visible', y > innerHeight * .8 && !(b.top < innerHeight && b.bottom > 0));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobilní menu ---------- */
  const burger = $('#burger');
  const toggleNav = open => {
    document.body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
    if (open) header.classList.remove('is-hidden');
  };
  burger.addEventListener('click', () => toggleNav(!document.body.classList.contains('nav-open')));
  $$('#nav a').forEach(a => a.addEventListener('click', () => toggleNav(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') toggleNav(false); });

  /* ---------- Aktivní položka menu ---------- */
  const navLinks = $$('#nav a');
  const sectionObs = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) sectionObs.observe(s); });

  /* ---------- Nadpis po slovech ---------- */
  $$('[data-split]').forEach(el => {
    let i = 0;
    const wrap = node => [...node.childNodes].forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(' ');
          const w = document.createElement('span');
          w.className = 'w';
          w.innerHTML = `<span style="--i:${i++}">${part}</span>`;
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) wrap(child);
    });
    wrap(el);
  });

  /* ---------- Fotky v úvodu ---------- */
  const slides = $$('.hero__slide');
  const slideNo = $('#slideNo');
  let current = 0;
  if (!reduced) setInterval(() => {
    slides[current].classList.remove('is-active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('is-active');
    slideNo.textContent = String(current + 1).padStart(2, '0');
  }, 6000);

  /* ---------- Čáry kreslené při zobrazení ---------- */
  $$('.cut__drawing .ln').forEach(p => p.setAttribute('pathLength', '1'));

  /* ---------- Postupné zobrazování ---------- */
  const groups = new Map();
  $$('.reveal').forEach(el => {
    const n = groups.get(el.parentElement) || 0;
    el.style.setProperty('--d', n);
    groups.set(el.parentElement, n + 1);
  });
  const revealObs = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-visible');
    revealObs.unobserve(en.target);
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => revealObs.observe(el));

  /* ---------- Slunce se při scrollu otáčí a zapadá ---------- */
  const sun = $('.hero__sun');
  let ticking = false;
  const onFrame = () => {
    ticking = false;
    if (reduced) return;
    const y = Math.min(scrollY, innerHeight * 1.2);
    sun.style.setProperty('--sun-r', `${y * .25}deg`);
    sun.style.setProperty('--sun-y', `${y * .35}px`);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } }, { passive: true });

  /* ---------- Dům v řezu ---------- */
  const spots = {
    1: ['terasa-posezeni', 'Terasa s posezením a grilem'],
    2: ['spolecenska-mistnost', 'Společenská místnost s krbem'],
    3: ['loznice-velka', 'Ložnice'],
    4: ['kuchyne', 'Kuchyně'],
    5: ['koupelna', 'Koupelna s rohovou vanou'],
    6: ['zahrada-terasa', 'Zahrada'],
    7: ['sklep-klenba', 'Klenutý sklep']
  };
  Object.values(spots).forEach(([f]) => { new Image().src = `img/${f}-s.jpg`; });
  const drawing = $('#cutDrawing');
  const cutImg = $('#cutImg');
  let active = 0, auto = null, swapTimer;
  const setSpot = n => {
    if (n === active) return;
    active = n;
    $$('[data-spot]').forEach(el => el.classList.toggle('is-active', +el.dataset.spot === n));
    const [f, alt] = spots[n];
    cutImg.classList.add('is-swap');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => { cutImg.src = `img/${f}-s.jpg`; cutImg.alt = alt; cutImg.classList.remove('is-swap'); }, 250);
  };
  const stopAuto = () => { clearInterval(auto); auto = 'stopped'; };
  $$('[data-spot]').forEach(el => {
    const n = +el.dataset.spot;
    el.addEventListener('mouseenter', () => { stopAuto(); setSpot(n); });
    el.addEventListener('click', () => { stopAuto(); setSpot(n); });
    el.addEventListener('focus', () => { stopAuto(); setSpot(n); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stopAuto(); setSpot(n); } });
  });
  setSpot(1);
  new IntersectionObserver((entries, obs) => entries.forEach(en => {
    if (!en.isIntersecting) return;
    drawing.classList.add('is-drawn');
    if (auto === null && !reduced) auto = setInterval(() => setSpot(active % 7 + 1), 3800);
    obs.disconnect();
  }), { threshold: .3 }).observe(drawing);

  /* ---------- Album ---------- */
  const photos = [
    ['dum-pruceli', 'venku', 'Dům ve Sklepní uličce'],
    ['spolecenska-mistnost', 'uvnitr', 'Společenská místnost'],
    ['sklep-chodba', 'sklep', 'Cihlová chodba do sklepa'],
    ['terasa-posezeni', 'venku', 'Terasa'],
    ['loznice-velka', 'uvnitr', 'Velká ložnice'],
    ['vyhled-krajina', 'okoli', 'Výhled do kraje'],
    ['kuchyne', 'uvnitr', 'Kuchyně'],
    ['zahrada-terasa', 'venku', 'Zahrada s terasou'],
    ['sklep-klenba', 'sklep', 'Klenba sklepa'],
    ['loznice', 'uvnitr', 'Ložnice'],
    ['terasa-vstup', 'venku', 'Vstup do domu'],
    ['koupelna', 'uvnitr', 'Koupelna'],
    ['vyhled-vinice', 'okoli', 'Vinice a Nové Mlýny na obzoru'],
    ['spolecenska-mistnost-2', 'uvnitr', 'Stůl pro celou partu'],
    ['zahrada-travnik', 'venku', 'Oplocená zahrada'],
    ['sklep', 'sklep', 'Ve sklepě'],
    ['loznice-velka-2', 'uvnitr', 'Ložnice'],
    ['dum-zahrada', 'venku', 'Dům ze zahrady'],
    ['kuchyne-2', 'uvnitr', 'Kuchyňský kout'],
    ['spolecenska-mistnost-3', 'uvnitr', 'Trámový strop'],
    ['terasa-zahrada', 'venku', 'Pergola'],
    ['loznice-2', 'uvnitr', 'Druhá ložnice'],
    ['vyhled-obec', 'okoli', 'Olbramovice'],
    ['koupelna-2', 'uvnitr', 'Koupelna'],
    ['sklenka-vina', 'venku', 'Sklenka na terase'],
    ['loznice-velka-3', 'uvnitr', 'Ložnice'],
    ['dum-ulice', 'venku', 'Sklepní ulička'],
    ['pes', 'venku', 'Pejsci jsou vítáni']
  ];
  const track = $('#gallery');
  track.innerHTML = photos.map(([f, cat, cap], i) => `
    <figure class="shot" data-cat="${cat}" data-i="${i}">
      <div class="shot__img" tabindex="0" role="button" aria-label="Zvětšit: ${cap}"><img src="img/${f}-s.jpg" alt="${cap}" loading="lazy" decoding="async" draggable="false"></div>
      <figcaption><b>${String(i + 1).padStart(2, '0')}</b>${cap}</figcaption>
    </figure>`).join('');
  const shots = $$('.shot', track);

  // počty u filtrů
  $$('.album__tabs button').forEach(b => {
    const f = b.dataset.filter;
    $('sup', b).textContent = f === 'vse' ? photos.length : photos.filter(p => p[1] === f).length;
    b.addEventListener('click', () => {
      $$('.album__tabs button').forEach(x => x.classList.toggle('is-active', x === b));
      shots.forEach(s => s.classList.toggle('is-out', f !== 'vse' && s.dataset.cat !== f));
      track.scrollTo({ left: 0, behavior: 'smooth' });
      if (!reduced) shots.filter(s => !s.classList.contains('is-out')).slice(0, 6).forEach((s, i) =>
        s.animate([{ opacity: 0, transform: 'translateX(60px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: i * 60, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' }));
      updateBar();
    });
  });

  // ukazatel posunu
  const bar = $('#albumBar');
  const updateBar = () => {
    const max = track.scrollWidth - track.clientWidth;
    const vis = track.clientWidth / track.scrollWidth;
    bar.style.width = `${Math.max(vis * 100, 8)}%`;
    bar.style.left = `${max > 0 ? (track.scrollLeft / max) * (100 - Math.max(vis * 100, 8)) : 0}%`;
  };
  track.addEventListener('scroll', updateBar, { passive: true });
  addEventListener('resize', updateBar);
  addEventListener('load', updateBar);
  const page = dir => track.scrollBy({ left: dir * track.clientWidth * .8, behavior: 'smooth' });
  $('#albumPrev').addEventListener('click', () => page(-1));
  $('#albumNext').addEventListener('click', () => page(1));
  track.addEventListener('keydown', e => {
    if (e.target !== track) return;
    if (e.key === 'ArrowRight') page(1);
    if (e.key === 'ArrowLeft') page(-1);
  });

  // tažení myší (na dotyku funguje nativní posun)
  let drag = null;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft, moved: false, v: 0, t: performance.now() };
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 5) { drag.moved = true; track.classList.add('is-drag'); }
    const now = performance.now();
    drag.v = (track.scrollLeft - (drag.left - dx)) / Math.max(now - drag.t, 1);
    drag.t = now;
    track.scrollLeft = drag.left - dx;
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    const { moved } = drag;
    let v = -drag.v * 16;
    drag = null;
    track.classList.remove('is-drag');
    if (moved) {
      track.dataset.justDragged = '1';
      setTimeout(() => delete track.dataset.justDragged, 50);
      const glide = () => { if (Math.abs(v) < .5 || reduced) return; track.scrollLeft += v; v *= .92; requestAnimationFrame(glide); };
      requestAnimationFrame(glide);
    }
  });

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox');
  const lbImg = $('img', lb);
  const lbCap = $('figcaption', lb);
  let lbList = [], lbPos = 0, lastFocus;
  const lbSet = (pos, animate = true) => {
    lbPos = (pos + lbList.length) % lbList.length;
    const [f, , cap] = photos[lbList[lbPos]];
    const apply = () => { lbImg.src = `img/${f}.jpg`; lbImg.alt = cap; lbCap.textContent = `${cap} · ${lbPos + 1}/${lbList.length}`; };
    if (!animate) return apply();
    lbImg.classList.add('is-swap');
    setTimeout(() => { apply(); lbImg.onload = () => lbImg.classList.remove('is-swap'); }, 180);
  };
  const lbOpen = i => {
    lastFocus = document.activeElement;
    lbList = shots.filter(s => !s.classList.contains('is-out')).map(s => +s.dataset.i);
    lbSet(lbList.indexOf(i), false);
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    $('.lightbox__close', lb).focus();
  };
  const lbClose = () => {
    lb.classList.remove('is-open');
    setTimeout(() => { lb.hidden = true; }, 300);
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  };
  shots.forEach(s => {
    const btn = $('.shot__img', s);
    btn.addEventListener('click', () => { if (!track.dataset.justDragged) lbOpen(+s.dataset.i); });
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbOpen(+s.dataset.i); } });
  });
  $('.lightbox__close', lb).addEventListener('click', lbClose);
  $('.lightbox__prev', lb).addEventListener('click', () => lbSet(lbPos - 1));
  $('.lightbox__next', lb).addEventListener('click', () => lbSet(lbPos + 1));
  lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowLeft') lbSet(lbPos - 1);
    if (e.key === 'ArrowRight') lbSet(lbPos + 1);
  });
  let touchX = null;
  lb.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) lbSet(lbPos + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- Mapa výletů (Leaflet + OpenStreetMap) ---------- */
  const HOME = [48.99407, 16.39274]; // Olbramovice 344 – sklípek
  const trips = [
    ['Zámek Bohutice', 4, 48.9913, 16.3576, 'Renesanční arkády a expozice křížové cesty.'],
    ['Čertova díra', 6, 49.0227, 16.3862, 'Rozervané skály u Vedrovic, kde prý sídlí čert.'],
    ['Moravský Krumlov', 10, 49.049, 16.307, 'Zámek s arkádami, hradby a kaple sv. Floriána.'],
    ['Pohořelice', 11, 48.9817, 16.5242, 'Městečko na cestě k Novým Mlýnům.'],
    ['Rosa Coeli', 14, 49.0689, 16.4714, 'Zřícenina nejstaršího ženského kláštera na Moravě.'],
    ['Nové Mlýny', 18, 48.8997, 16.6282, 'Koupání, lodě a cyklostezky pod Pálavou.'],
    ['Zámek Dukovany', 22, 49.0819, 16.1951, 'Sály s freskami a anglický park.'],
    ['Mikulov', 32, 48.8069, 16.6364, 'Zámek, Svatý kopeček a židovská čtvrť.'],
    ['Děvičky', 32, 48.8759, 16.6619, 'Zřícenina Dívčí hrad s výhledem na Pálavu.'],
    ['Laa an der Thaya', 34, 48.721, 16.3853, 'Termály kousek za rakouskou hranicí.']
  ];

  const list = $('#trips');
  list.innerHTML = trips.map(([name, km, , , text], i) => `
    <li class="trip" data-trip="${i}" tabindex="0"><span class="trip__km">${km}<small>km</small></span><div><h3>${name}</h3><p>${text}</p></div></li>`).join('');

  const mapEl = $('#tripMap');
  const mapBox = $('#tripMapBox');
  const navLinks2 = `
    <a href="https://mapy.cz/zakladni?source=coor&id=${HOME[1]},${HOME[0]}&x=${HOME[1]}&y=${HOME[0]}&z=18" target="_blank" rel="noopener">Mapy.cz</a>
    <a href="https://www.google.com/maps/dir/?api=1&destination=${HOME[0]},${HOME[1]}" target="_blank" rel="noopener">Google Maps</a>`;
  let map = null, homeMarker, tripMarkers = [], mode = 'trips', pendingCellar = false;

  const setTrip = i => {
    $$('.trip').forEach(el => el.classList.toggle('is-active', el.dataset.trip === String(i)));
    tripMarkers.forEach((m, j) => m.getElement() && m.getElement().classList.toggle('is-active', j === +i));
  };

  const showTrips = () => {
    if (!map) return;
    mode = 'trips';
    mapBox.classList.remove('is-cellar');
    map.closePopup();
    map.flyToBounds(L.latLngBounds([HOME, ...trips.map(t => [t[2], t[3]])]), { padding: [40, 40], duration: 1.4 });
  };
  const showCellar = () => {
    if (!map) { pendingCellar = true; return initMap(); }
    mode = 'cellar';
    mapBox.classList.add('is-cellar');
    setTrip(-1);
    map.closePopup();
    // dům posadit níž, ať se nad něj vejde okénko s fotkou
    const z = 17.5;
    const target = map.unproject(map.project(HOME, z).subtract([0, mapEl.clientHeight / 2 - 70]), z);
    map.flyTo(target, z, { duration: reduced ? 0 : 2.2 });
    map.once('moveend', () => { if (mode === 'cellar') homeMarker.openPopup(); });
    // pojistka, kdyby animace nedoběhla (např. skrytá záložka)
    setTimeout(() => { if (mode === 'cellar' && !homeMarker.isPopupOpen()) { map.setView(target, z, { animate: false }); homeMarker.openPopup(); } }, 2800);
  };

  const initMap = () => {
    if (map || !window.L) return;
    map = L.map(mapEl, {
      zoomControl: false, scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false,
      attributionControl: true, zoomSnap: .25
    });
    // pohled nastavit dřív, než přidáme vrstvy
    map.fitBounds(L.latLngBounds([HOME, ...trips.map(t => [t[2], t[3]])]), { padding: [40, 40] });
    L.control.zoom({ position: 'bottomright', zoomInTitle: 'Přiblížit', zoomOutTitle: 'Oddálit' }).addTo(map);
    map.attributionControl.setPrefix('');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, className: 'tiles',
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(map);

    // „paprsky“ od domu k výletům
    trips.forEach(([, , lat, lon]) => L.polyline([HOME, [lat, lon]], { className: 'ray', interactive: false }).addTo(map));

    tripMarkers = trips.map(([name, km, lat, lon, text], i) => {
      const m = L.marker([lat, lon], {
        icon: L.divIcon({ className: '', html: `<span class="pin" style="--i:${i}"><b>${i + 1}</b></span>`, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16] }),
        title: name, riseOnHover: true
      }).addTo(map);
      m.bindPopup(`<div class="pop"><small>${km} km od nás</small><strong>${name}</strong><p>${text}</p></div>`, { closeButton: false, offset: [0, -2] });
      m.on('mouseover', () => setTrip(i));
      m.on('mouseout', () => setTrip(-1));
      m.on('click', e => { L.DomEvent.stopPropagation(e); setTrip(i); });
      return m;
    });

    homeMarker = L.marker(HOME, {
      icon: L.divIcon({ className: '', html: '<span class="home"><svg><use href="#i-sun"/></svg></span>', iconSize: [56, 56], iconAnchor: [28, 28], popupAnchor: [0, -26] }),
      title: 'Dům u Slunce a Vína', zIndexOffset: -1000
    }).addTo(map);
    homeMarker.bindPopup(`
      <div class="pop pop--home">
        <img src="img/dum-pruceli-s.jpg" alt="Dům u Slunce a Vína">
        <small>tady jsme</small>
        <strong>Dům u Slunce a Vína</strong>
        <p>Olbramovice 344, 671 76<br>GPS ${HOME[0].toFixed(5)}N, ${HOME[1].toFixed(5)}E</p>
        <div class="pop__nav">Navigovat: ${navLinks2}</div>
      </div>`, { closeButton: false, maxWidth: 260, autoPanPaddingTopLeft: [20, 46], autoPanPaddingBottomRight: [20, 20] });
    homeMarker.on('click', e => { L.DomEvent.stopPropagation(e); if (mode !== 'cellar') showCellar(); });

    // klik kamkoli do mapy = ukázat sklípek
    map.on('click', () => { if (mode !== 'cellar') showCellar(); });

    mapBox.classList.add('is-ready');
    if (pendingCellar) { pendingCellar = false; setTimeout(showCellar, 300); }
  };

  // mapa se načte, až se k ní návštěvník přiblíží
  new IntersectionObserver((en, obs) => { if (en[0].isIntersecting) { initMap(); obs.disconnect(); } }, { rootMargin: '300px' }).observe(mapEl);

  $('#mapCellar').addEventListener('click', e => { e.stopPropagation(); showCellar(); });
  $('#mapTrips').addEventListener('click', e => { e.stopPropagation(); showTrips(); });

  $$('.trip').forEach(el => {
    const i = +el.dataset.trip;
    el.addEventListener('mouseenter', () => setTrip(i));
    el.addEventListener('mouseleave', () => setTrip(-1));
    const go = () => {
      if (!map) return;
      mode = 'trips';
      mapBox.classList.remove('is-cellar');
      setTrip(i);
      map.flyTo([trips[i][2], trips[i][3]], 13, { duration: reduced ? 0 : 1.6 });
      map.once('moveend', () => { if (mode === 'trips') tripMarkers[i].openPopup(); });
      if (innerWidth <= 900) mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    el.addEventListener('click', go);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  });

  /* ---------- Kontakt: ukázat sklípek na mapě ---------- */
  $('#mapBtn').addEventListener('click', () => {
    mapEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    setTimeout(showCellar, reduced ? 0 : 700);
  });

  /* ---------- Podmínky z formuláře ---------- */
  $$('[data-open-terms]').forEach(a => a.addEventListener('click', () => $$('#podminky details').forEach(d => { d.open = true; })));

  /* ---------- Rok v patičce ---------- */
  $('#year').textContent = new Date().getFullYear();
})();
