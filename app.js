/* FLY Closing — UI controller. All math lives in logic.js. */
(function () {
  'use strict';
  var L = window.FlyLogic, S = window.FlyStorage, I = window.I18N;
  var t = I.t, money = I.money;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var state = {
    screen: 'home',
    editingId: null,
    existing: null,
    shift: 'night',
    responsible: '',
    counts: L.normalizeCounts({}),
    computed: null,
    choice: 0,           // 0 = recommended / option 1, 1 = alternative / option 2
    detailId: null
  };

  var root = $('#app');
  var CHEV = '<svg viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2 2 10l7 8"/></svg>';
  var CHEV_R = '<svg class="chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l6 6-6 6"/></svg>';

  /* ---------- navigation ---------- */
  function go(screen, opts) {
    opts = opts || {};
    state.screen = screen;
    if (screen === 'new' && !opts.keep) {
      state.editingId = opts.editingId || null;
      state.existing = opts.existing || null;
      if (state.existing) {
        state.shift = state.existing.shift;
        state.responsible = state.existing.responsible;
        state.counts = L.normalizeCounts(state.existing.counts);
      } else {
        state.shift = suggestShift();
        state.responsible = lastResponsible();
        state.counts = L.normalizeCounts({});
      }
    }
    if (screen === 'detail') state.detailId = opts.id;
    render();
    window.scrollTo(0, 0);
  }
  function suggestShift() { var h = new Date().getHours(); return (h >= 5 && h < 17) ? 'morning' : 'night'; }
  function lastResponsible() { try { return localStorage.getItem('fly_last_resp') || ''; } catch (e) { return ''; } }

  /* ---------- render ---------- */
  function render() {
    root.innerHTML = '';
    var s = el('section', 'screen active');
    ({ home: renderHome, new: renderNew, result: renderResult, history: renderHistory, detail: renderDetail })[state.screen](s);
    root.appendChild(s);
  }

  function topbar(s, title, backTo, action) {
    var bar = el('div', 'topbar');
    var back = el('button', 'back', CHEV + '<span>' + t('back') + '</span>');
    back.addEventListener('click', backTo);
    bar.appendChild(back);
    bar.appendChild(el('div', 'title', esc(title)));
    if (action) bar.appendChild(action); else bar.appendChild(el('div', 'spacer'));
    s.appendChild(bar);
  }

  function renderHome(s) {
    var bar = el('div', 'topbar');
    var sw = el('div', 'lang-switch');
    ['es', 'en'].forEach(function (l) {
      var b = el('button', null, l.toUpperCase());
      b.setAttribute('aria-pressed', I.lang === l);
      b.addEventListener('click', function () { I.setLang(l); render(); });
      sw.appendChild(b);
    });
    bar.appendChild(el('div', 'spacer'));
    bar.appendChild(sw);
    s.appendChild(bar);
    var hero = el('div', 'home-hero', '<h1>' + t('appName') + '</h1><p>' + t('tagline') + '</p>');
    s.appendChild(hero);
    var acts = el('div', 'home-actions');
    var b1 = el('button', 'btn btn-primary', t('newClosing'));
    b1.addEventListener('click', function () { go('new'); });
    var b2 = el('button', 'btn btn-secondary', t('history'));
    b2.addEventListener('click', function () { go('history'); });
    acts.appendChild(b1); acts.appendChild(b2);
    s.appendChild(acts);
    if (isIOS() && !isStandalone()) s.appendChild(el('p', 'muted', t('installHint')));
  }

  /* ---------- new / edit closing ---------- */
  function renderNew(s) {
    topbar(s, state.editingId ? t('edit') : t('newClosing'), function () {
      if (state.editingId) go('detail', { id: state.editingId }); else go('home');
    });

    var g = el('div', 'group');
    var seg = el('div', 'segmented');
    ['morning', 'night'].forEach(function (sh) {
      var b = el('button', null, t(sh));
      b.setAttribute('aria-pressed', state.shift === sh);
      b.addEventListener('click', function () { state.shift = sh; seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); });
      seg.appendChild(b);
    });
    g.appendChild(el('div', 'group-label', t('shift'))).style.margin = '14px 16px 8px';
    g.appendChild(seg);
    var f = el('div', 'field');
    f.innerHTML = '<label for="resp">' + t('responsible') + '</label>';
    var inp = el('input'); inp.id = 'resp'; inp.type = 'text'; inp.autocomplete = 'off'; inp.autocapitalize = 'words';
    inp.placeholder = t('responsiblePlaceholder'); inp.value = state.responsible; inp.maxLength = 40;
    inp.addEventListener('input', function () { state.responsible = inp.value; inp.classList.remove('invalid'); hint.classList.remove('show'); });
    var hint = el('div', 'hint', t('required'));
    f.appendChild(inp); f.appendChild(hint);
    g.appendChild(f);
    s.appendChild(g);

    s.appendChild(el('div', 'group-label', t('notes')));
    s.appendChild(denomGroup(L.NOTES));
    s.appendChild(el('div', 'group-label', t('coins')));
    s.appendChild(denomGroup(L.COINS));

    var bar = el('div', 'sticky-total');
    bar.innerHTML = '<div class="line"><span class="k">' + t('totalInCash') + '</span><span class="v" id="live-total"></span></div>';
    var calc = el('button', 'btn btn-primary', t('calculate'));
    calc.addEventListener('click', function () {
      if (!state.responsible.trim()) { inp.classList.add('invalid'); hint.classList.add('show'); inp.focus(); return; }
      try { localStorage.setItem('fly_last_resp', state.responsible.trim()); } catch (e) {}
      state.computed = L.computeClosing(state.counts);
      state.choice = 0;
      go('result');
    });
    bar.appendChild(calc);
    s.appendChild(bar);
    updateLiveTotal();
  }

  function denomGroup(denoms) {
    var g = el('div', 'group');
    denoms.forEach(function (d) {
      var row = el('div', 'denom');
      row.appendChild(el('div', 'label', I.denom(d)));
      var st = el('div', 'stepper');
      var minus = el('button', null, '−'); minus.setAttribute('aria-label', '−');
      var plus = el('button', null, '+'); plus.setAttribute('aria-label', '+');
      var inp = el('input'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.pattern = '[0-9]*'; inp.autocomplete = 'off';
      inp.setAttribute('aria-label', I.denom(d));
      var set = function (n) {
        n = Math.max(0, Math.min(9999, n | 0));
        state.counts[d] = n; inp.value = n; inp.classList.toggle('zero', n === 0); updateLiveTotal();
      };
      set(state.counts[d]);
      minus.addEventListener('click', function () { set(state.counts[d] - 1); });
      plus.addEventListener('click', function () { set(state.counts[d] + 1); });
      inp.addEventListener('focus', function () { inp.select(); setTimeout(function () { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 250); });
      inp.addEventListener('input', function () {
        var clean = inp.value.replace(/[^0-9]/g, '');
        if (clean !== inp.value) inp.value = clean;
        state.counts[d] = clean === '' ? 0 : Math.min(9999, parseInt(clean, 10));
        inp.classList.toggle('zero', state.counts[d] === 0); updateLiveTotal();
      });
      inp.addEventListener('blur', function () { set(state.counts[d]); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') inp.blur(); });
      st.appendChild(minus); st.appendChild(inp); st.appendChild(plus);
      row.appendChild(st);
      g.appendChild(row);
    });
    return g;
  }

  function updateLiveTotal() {
    var v = $('#live-total'); if (!v) return;
    var total = L.calculateTotalCash(state.counts);
    v.textContent = money(total);
    v.classList.toggle('warn', total < L.TARGET_CENTS);
  }

  /* ---------- result ---------- */
  function comboList(combo) {
    var ul = el('ul');
    var any = false;
    L.DENOMINATIONS.forEach(function (d) {
      if (!combo[d]) return; any = true;
      var li = el('li');
      li.innerHTML = '<span class="n">' + combo[d] + '×</span><span class="d">' + I.denom(d) + '</span><span class="t">' + money(combo[d] * d) + '</span>';
      ul.appendChild(li);
    });
    if (!any) ul.appendChild(el('li', null, '<span class="d">' + t('nothing') + '</span>'));
    return ul;
  }

  function comboCard(name, combo, opts) {
    var c = el('div', 'combo' + (opts.selected ? ' selected' : ''));
    var head = el('div', 'head');
    head.innerHTML = '<div class="name">' + (opts.star ? '<span class="badge info">★ ' + esc(name) + '</span>' : esc(name)) + '</div>' +
      '<div class="amt' + (opts.leaveAmt != null ? ' leave-amt' : '') + '">' + (opts.leaveAmt != null ? t('leave') + ' ' + money(opts.leaveAmt) : money(L.comboValue(combo))) + '</div>';
    c.appendChild(head);
    c.appendChild(comboList(combo));
    var foot = el('div', 'foot');
    var u = L.countUnits(combo);
    foot.innerHTML = '<span>' + (opts.leaveAmt != null ? t('remove') + ' ' + money(L.comboValue(combo)) + ' · ' : '') + u + ' ' + t(u === 1 ? 'unit' : 'units') + '</span>';
    if (opts.selectable) {
      var b = el('button', 'pick', opts.selected ? '✓ ' + t('selected') : t('useThis'));
      b.addEventListener('click', opts.onPick);
      foot.appendChild(b);
    }
    c.appendChild(foot);
    return c;
  }

  function renderResult(s) {
    var r = state.computed;
    topbar(s, state.editingId ? t('edit') : t('newClosing'), function () { go('new', { keep: true }); });

    if (r.status === 'below') {
      var n = el('div', 'notice err');
      n.innerHTML = '<h2>' + t('belowMinimum') + '</h2><p>' + t('belowMinimumHint') + '</p>';
      s.appendChild(n);
      var g = el('div', 'group');
      g.innerHTML = '<div class="row"><span class="k">' + t('total') + '</span><span class="v">' + money(r.total) + '</span></div>' +
        '<div class="row"><span class="k">' + t('missing') + '</span><span class="v" style="color:var(--red)">' + money(r.missing) + '</span></div>';
      s.appendChild(g);
      var a = el('div', 'actions');
      var b = el('button', 'btn btn-secondary', t('back'));
      b.addEventListener('click', function () { go('new', { keep: true }); });
      a.appendChild(b); s.appendChild(a);
      return;
    }

    var selectedCombo, exact = r.status !== 'inexact';

    if (r.status === 'perfect') {
      var pn = el('div', 'notice ok');
      pn.innerHTML = '<h2>' + t('perfectClosing') + ' ✓</h2><p>' + t('perfectHint') + '</p>';
      s.appendChild(pn);
      s.appendChild(summaryGrid(r.total, 0, r.total));
      selectedCombo = r.recommended;
    } else if (r.status === 'exact') {
      var hero = el('div', 'hero-number');
      hero.innerHTML = '<div class="k">' + t('remove') + '</div><div class="v remove">' + money(r.toRemove) + '</div>';
      s.appendChild(hero);
      s.appendChild(summaryGrid(r.total, r.toRemove, L.TARGET_CENTS));
      var hasAlt = !!r.alternative;
      selectedCombo = state.choice === 1 && hasAlt ? r.alternative : r.recommended;
      s.appendChild(comboCard(t('recommended'), r.recommended, { star: true, selectable: hasAlt, selected: state.choice === 0, onPick: function () { state.choice = 0; render(); } }));
      if (hasAlt) s.appendChild(comboCard(t('alternative'), r.alternative, { selectable: true, selected: state.choice === 1, onPick: function () { state.choice = 1; render(); } }));
    } else {
      var wn = el('div', 'notice warn');
      wn.innerHTML = '<h2>' + t('noExact') + '</h2><p>' + t('noExactHint') + '</p>';
      s.appendChild(wn);
      var opt = r.options[state.choice] || r.options[0];
      s.appendChild(summaryGrid(r.total, opt.remove, opt.leave));
      selectedCombo = opt.combo;
      r.options.forEach(function (o, i) {
        s.appendChild(comboCard(t('option') + ' ' + (i + 1), o.combo, { leaveAmt: o.leave, selectable: r.options.length > 1, selected: state.choice === i, onPick: function () { state.choice = i; render(); } }));
      });
    }

    var acts = el('div', 'actions');
    var save = el('button', 'btn btn-primary', state.editingId ? t('update') : t('save'));
    save.addEventListener('click', function () {
      var rec;
      try { rec = S.buildRecord({ shift: state.shift, responsible: state.responsible.trim() }, r, selectedCombo, state.existing); }
      catch (e) { toast(String(e.message)); return; }
      S.saveClosing(rec);
      toast(state.editingId ? t('updated') : t('saved'));
      state.editingId = null; state.existing = null;
      go('detail', { id: rec.id });
    });
    acts.appendChild(save);
    var cancel = el('button', 'btn btn-secondary', t('cancel'));
    cancel.addEventListener('click', function () { go('home'); });
    acts.appendChild(cancel);
    s.appendChild(acts);
    void exact;
  }

  function summaryGrid(total, remove, leave) {
    var g = el('div', 'summary');
    var leaveOk = leave === L.TARGET_CENTS;
    g.innerHTML =
      '<div class="cell"><div class="k">' + t('totalInCash') + '</div><div class="v">' + money(total) + '</div></div>' +
      '<div class="cell remove"><div class="k">' + t('remove') + '</div><div class="v">' + money(remove) + '</div></div>' +
      '<div class="cell leave"><div class="k">' + t('leaveInCash') + '</div><div class="v"' + (leaveOk ? '' : ' style="color:var(--amber)"') + '>' + money(leave) + (leaveOk ? ' ✓' : '') + '</div></div>';
    return g;
  }

  /* ---------- history ---------- */
  function renderHistory(s) {
    var list = S.loadClosings();
    var exp = null;
    if (list.length) {
      exp = el('button', 'action', t('exportCsv'));
      exp.addEventListener('click', function () { downloadCsv(list); });
    }
    topbar(s, t('history'), function () { go('home'); }, exp);
    if (!list.length) {
      s.appendChild(el('div', 'empty', '<h2>' + t('noHistory') + '</h2><p>' + t('noHistoryHint') + '</p>'));
      return;
    }
    var g = el('div', 'group');
    list.forEach(function (r) {
      var b = el('button', 'hist-item');
      b.innerHTML = '<div class="main"><div class="d">' + I.formatDate(r.date) + '</div>' +
        '<div class="m">' + t(r.shift) + ' · ' + esc(r.responsible) + '</div>' +
        '<div class="flow">' + money(r.initialCash) + '<span class="arrow">→</span>' + money(r.finalCash) + (r.exact ? '' : ' <span class="badge warn">' + t('inexactBadge') + '</span>') + '</div></div>' +
        '<div class="side"><div class="r">' + money(r.removedCash) + '</div><div class="rk">' + t('remove') + '</div></div>' + CHEV_R;
      b.addEventListener('click', function () { go('detail', { id: r.id }); });
      g.appendChild(b);
    });
    s.appendChild(g);
  }

  function downloadCsv(list) {
    var csv = S.exportCsv(list);
    var name = 'fly-closing-' + new Date().toISOString().slice(0, 10) + '.csv';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var file = null;
    try { file = new File([blob], name, { type: 'text/csv' }); } catch (e) {}
    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).catch(function () {});
      return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  }

  /* ---------- detail ---------- */
  function renderDetail(s) {
    var r = S.getClosing(state.detailId);
    if (!r) { go('history'); return; }
    var edit = el('button', 'action', t('edit'));
    edit.addEventListener('click', function () { go('new', { editingId: r.id, existing: r }); });
    topbar(s, I.formatDate(r.date), function () { go('history'); }, edit);

    s.appendChild(el('div', 'group-label', t('closingInformation')));
    var info = el('div', 'group');
    info.innerHTML = row(t('date'), I.formatDate(r.date)) + row(t('time'), r.time) + row(t('shift'), t(r.shift)) + row(t('responsible'), esc(r.responsible));
    s.appendChild(info);

    s.appendChild(summaryGrid(r.initialCash, r.removedCash, r.finalCash));

    s.appendChild(el('div', 'group-label', t('initialCash')));
    s.appendChild(countsGroup(r.counts, r.initialCash));
    s.appendChild(el('div', 'group-label', t('removed')));
    s.appendChild(countsGroup(r.removed, r.removedCash));
    s.appendChild(el('div', 'group-label', t('remainingCash')));
    s.appendChild(countsGroup(r.remaining, r.finalCash));

    s.appendChild(el('div', 'group-label', t('verification')));
    var v = L.validateClosing(r.counts, r.removed, r.exact);
    var ver = el('div', 'group');
    ver.innerHTML = '<div class="verify"><div class="eq">' + money(v.initial) + '<span class="op">−</span>' + money(v.removed) + '<span class="op">=</span>' + money(v.finalCash) +
      ' <span class="' + (v.ok ? 'ok' : 'bad') + '">' + (v.ok ? '✓' : '✕') + '</span></div></div>';
    s.appendChild(ver);

    var acts = el('div', 'actions');
    var del = el('button', 'btn btn-danger', t('delete'));
    del.addEventListener('click', function () {
      confirmModal(t('deleteConfirm'), t('deleteHint'), function () { S.deleteClosing(r.id); go('history'); });
    });
    acts.appendChild(del);
    s.appendChild(acts);
  }

  function row(k, v, cls) { return '<div class="row' + (cls ? ' ' + cls : '') + '"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
  function countsGroup(counts, total) {
    var g = el('div', 'group');
    var html = '';
    L.DENOMINATIONS.forEach(function (d) {
      if (!counts[d]) return;
      html += row(counts[d] + ' × ' + I.denom(d), money(counts[d] * d));
    });
    if (!html) html = row(t('nothing'), '');
    html += row(t('total'), money(total), 'total');
    g.innerHTML = html;
    return g;
  }

  /* ---------- modal / toast ---------- */
  function confirmModal(title, hint, onConfirm) {
    var m = el('div', 'modal open');
    m.innerHTML = '<div class="box" role="dialog" aria-modal="true"><h3>' + esc(title) + '</h3><p>' + esc(hint) + '</p><div class="btns"><button class="c">' + t('cancel') + '</button><button class="d">' + t('delete') + '</button></div></div>';
    m.querySelector('.c').addEventListener('click', function () { m.remove(); });
    m.querySelector('.d').addEventListener('click', function () { m.remove(); onConfirm(); });
    m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
    m.querySelector('.c').focus();
  }
  var toastEl = el('div', 'toast'); document.body.appendChild(toastEl); var toastTimer;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1800); }

  function isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent); }
  function isStandalone() { return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches; }

  /* ---------- boot ---------- */
  I.init();
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
  }
})();
