/* ================================================================
   CARRUSEL DE TESTIMONIOS (beta) — Paltas Marujita
   Datos en CONFIG.testimonios. Se muestra solo si activo = true y hay
   testimonios reales (los marcados con `ejemplo: true` nunca se muestran).
   CSS scroll-snap + flechas, puntos, autoplay suave que se pausa,
   deslizable con el dedo y respetando prefers-reduced-motion.
   ================================================================ */
(function (raiz, api) {
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Testimonios = api;
})(typeof self !== 'undefined' ? self : this, (function () {
  /** Testimonios publicables: con texto y nombre, y sin la marca de ejemplo. */
  const visibles = (cfg) =>
    cfg && cfg.activo
      ? (cfg.lista || []).filter(
          (t) => !t.ejemplo && t.texto && t.texto.trim() && t.nombre,
        )
      : [];

  /** "Consuelo Ramírez" → "CR"; "ana" → "A". */
  const iniciales = (nombre) =>
    String(nombre || '')
      .replace(/\(.*?\)/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');

  /** "vecina de San Borja"; sin prefijo → "de San Borja". */
  const procedencia = (t) =>
    t.distrito ? `${t.prefijo || 'de'} ${t.distrito}` : '';

  function crearTarjeta(t, i, total) {
    const fig = document.createElement('figure');
    fig.className = 'car-item';
    fig.setAttribute('role', 'group');
    fig.setAttribute('aria-roledescription', 'testimonio');
    fig.setAttribute('aria-label', `${i + 1} de ${total}`);

    const cita = document.createElement('blockquote');
    const p = document.createElement('p');
    p.textContent = `“${t.texto.trim()}”`;
    cita.appendChild(p);

    const pie = document.createElement('figcaption');
    const avatar = document.createElement('span');
    avatar.className = 'car-avatar';
    const ponerIniciales = () => {
      avatar.replaceChildren(iniciales(t.nombre));
      avatar.setAttribute('aria-hidden', 'true');
    };
    if (t.foto) {
      const img = document.createElement('img');
      img.src = t.foto;
      img.alt = '';
      img.loading = 'lazy';
      img.width = 56;
      img.height = 56;
      img.addEventListener('error', ponerIniciales);
      avatar.appendChild(img);
    } else ponerIniciales();

    const quien = document.createElement('span');
    const nombre = document.createElement('b');
    nombre.textContent = t.nombre;
    quien.appendChild(nombre);
    const donde = procedencia(t);
    if (donde) {
      quien.append(', ');
      const small = document.createElement('span');
      small.className = 'car-donde';
      small.textContent = donde;
      quien.appendChild(small);
    }
    pie.append(avatar, quien);
    fig.append(cita, pie);
    return fig;
  }

  /** Arma el carrusel en el DOM. el = { seccion, pista, puntos, prev, next, pausa } */
  function iniciar(cfg, el) {
    const lista = visibles(cfg);
    if (!lista.length) {
      el.seccion.hidden = true;
      return null;
    }
    el.seccion.hidden = false;
    const items = lista.map((t, i) => crearTarjeta(t, i, lista.length));
    el.pista.replaceChildren(...items);

    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)');
    const comportamiento = () => (reducido.matches ? 'auto' : 'smooth');
    const puntos = items.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'car-punto';
      b.setAttribute('aria-label', `Ir al testimonio ${i + 1}`);
      b.addEventListener('click', () => {
        detener();
        ir(i);
      });
      return b;
    });
    el.puntos.replaceChildren(...puntos);

    const maxScroll = () => el.pista.scrollWidth - el.pista.clientWidth;
    const actual = () => {
      const x = el.pista.scrollLeft;
      if (x >= maxScroll() - 2) return items.length - 1;
      let mejor = 0;
      items.forEach((it, i) => {
        if (
          Math.abs(it.offsetLeft - items[0].offsetLeft - x) <
          Math.abs(items[mejor].offsetLeft - items[0].offsetLeft - x)
        )
          mejor = i;
      });
      return mejor;
    };
    const ir = (i) =>
      el.pista.scrollTo({
        left: items[(i + items.length) % items.length].offsetLeft - items[0].offsetLeft,
        behavior: comportamiento(),
      });
    const siguiente = () =>
      el.pista.scrollLeft >= maxScroll() - 2 ? ir(0) : ir(actual() + 1);
    const anterior = () =>
      el.pista.scrollLeft <= 2 ? ir(items.length - 1) : ir(actual() - 1);

    const marcar = () => {
      const a = actual();
      puntos.forEach((p, i) =>
        i === a ? p.setAttribute('aria-current', 'true') : p.removeAttribute('aria-current'),
      );
    };
    let raf = 0;
    el.pista.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(marcar);
    });

    // Si todo entra en pantalla, no hacen falta controles ni autoplay.
    let desborda = true;
    const medir = () => {
      desborda = maxScroll() > 2;
      el.seccion.classList.toggle('car-estatico', !desborda);
      marcar();
    };
    window.addEventListener('resize', medir);

    // ---- Autoplay ----
    // pausadoUsuario: lo pausó la persona (botón, toque, flechas o puntos).
    // pausadoTemp: el cursor o el foco están sobre el carrusel.
    let pausadoUsuario = reducido.matches;
    let pausadoTemp = false;
    const ms = Math.max(3, Number(cfg.autoplaySegundos) || 6) * 1000;
    const pintarPausa = () => {
      el.pausa.textContent = pausadoUsuario ? '▶' : '❚❚';
      el.pausa.setAttribute(
        'aria-label',
        pausadoUsuario ? 'Reanudar el carrusel' : 'Pausar el carrusel',
      );
      // Mientras se mueve solo no se anuncia cada cambio.
      el.pista.setAttribute('aria-live', pausadoUsuario ? 'polite' : 'off');
    };
    const detener = () => {
      pausadoUsuario = true;
      pintarPausa();
    };
    setInterval(() => {
      if (!pausadoUsuario && !pausadoTemp && desborda && !document.hidden) siguiente();
    }, ms);
    reducido.addEventListener &&
      reducido.addEventListener('change', () => {
        if (reducido.matches) detener();
      });

    el.pausa.addEventListener('click', () => {
      pausadoUsuario = !pausadoUsuario;
      pintarPausa();
    });
    el.prev.addEventListener('click', () => {
      detener();
      anterior();
    });
    el.next.addEventListener('click', () => {
      detener();
      siguiente();
    });
    el.pista.addEventListener('pointerdown', detener);
    el.pista.addEventListener('wheel', detener, { passive: true });
    el.pista.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') (detener(), siguiente(), e.preventDefault());
      if (e.key === 'ArrowLeft') (detener(), anterior(), e.preventDefault());
    });
    const carrusel = el.pista.parentElement;
    carrusel.addEventListener('mouseenter', () => (pausadoTemp = true));
    carrusel.addEventListener('mouseleave', () => (pausadoTemp = false));
    el.seccion.addEventListener('focusin', () => (pausadoTemp = true));
    el.seccion.addEventListener('focusout', () => (pausadoTemp = false));

    pintarPausa();
    medir();
    return { ir, siguiente, anterior, actual };
  }

  return { visibles, iniciales, procedencia, iniciar };
})());
