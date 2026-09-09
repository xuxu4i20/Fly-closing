/* FLY Closing — persistence (localStorage) and CSV export. Depends on FlyLogic. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./logic.js'));
  else root.FlyStorage = factory(root.FlyLogic);
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';
  var KEY = 'fly_closings_v1';

  function getStore() {
    if (typeof localStorage !== 'undefined') return localStorage;
    // Minimal in-memory fallback (tests / private mode failures)
    var mem = {};
    return { getItem: function (k) { return k in mem ? mem[k] : null; },
             setItem: function (k, v) { mem[k] = String(v); },
             removeItem: function (k) { delete mem[k]; } };
  }
  var store = getStore();
  function _setStore(s) { store = s; }

  function loadClosings() {
    try {
      var raw = store.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function persist(list) {
    store.setItem(KEY, JSON.stringify(list));
  }

  function makeId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /**
   * Builds a closing record from a computed result + chosen removal combo.
   * Throws if the independent verification fails.
   */
  function buildRecord(meta, computed, removedCombo, existing) {
    var isExact = computed.status === 'exact' || computed.status === 'perfect';
    var check = L.validateClosing(computed.counts, removedCombo, isExact);
    if (!check.ok) throw new Error('validation_failed:' + check.errors.join(','));
    var now = existing && existing.createdAt ? new Date(existing.createdAt) : new Date();
    var d = existing && existing.date ? existing.date : now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    var t = existing && existing.time ? existing.time : pad(now.getHours()) + ':' + pad(now.getMinutes());
    return {
      id: existing ? existing.id : makeId(),
      createdAt: existing && existing.createdAt ? existing.createdAt : now.toISOString(),
      updatedAt: new Date().toISOString(),
      date: d,
      time: t,
      shift: meta.shift,
      responsible: meta.responsible,
      counts: computed.counts,
      initialCash: check.initial,
      removedCash: check.removed,
      removed: L.normalizeCounts(removedCombo),
      remaining: L.calculateRemainingCash(computed.counts, removedCombo),
      finalCash: check.finalCash,
      exact: isExact,
      alternative: computed.alternative || null
    };
  }

  function saveClosing(record) {
    var list = loadClosings();
    var i = list.findIndex(function (r) { return r.id === record.id; });
    if (i >= 0) list[i] = record; else list.unshift(record);
    persist(list);
    return record;
  }

  function getClosing(id) {
    return loadClosings().find(function (r) { return r.id === id; }) || null;
  }

  function deleteClosing(id) {
    var list = loadClosings().filter(function (r) { return r.id !== id; });
    persist(list);
  }

  function centsToCsv(c) {
    var s = String(Math.abs(c));
    while (s.length < 3) s = '0' + s;
    return (c < 0 ? '-' : '') + s.slice(0, -2) + '.' + s.slice(-2);
  }

  function csvEscape(v) {
    v = String(v == null ? '' : v);
    return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function comboLabel(combo) {
    return L.DENOMINATIONS.filter(function (d) { return combo[d] > 0; })
      .map(function (d) { return combo[d] + 'x' + centsToCsv(d); }).join(' + ');
  }

  function exportCsv(list) {
    var header = ['Date', 'Time', 'Shift', 'Responsible', 'Initial Cash', 'Removed', 'Final Cash']
      .concat(L.DENOMINATIONS.map(function (d) { return '€' + centsToCsv(d) + ' count'; }))
      .concat(['Removed Composition']);
    var rows = list.map(function (r) {
      return [r.date, r.time, r.shift, r.responsible,
              centsToCsv(r.initialCash), centsToCsv(r.removedCash), centsToCsv(r.finalCash)]
        .concat(L.DENOMINATIONS.map(function (d) { return r.counts[d] || 0; }))
        .concat([comboLabel(r.removed)]);
    });
    var lines = [header].concat(rows).map(function (row) { return row.map(csvEscape).join(','); });
    return '\uFEFF' + lines.join('\r\n') + '\r\n'; // BOM so Excel reads UTF-8 (€)
  }

  return { KEY: KEY, loadClosings: loadClosings, saveClosing: saveClosing, getClosing: getClosing,
           deleteClosing: deleteClosing, buildRecord: buildRecord, exportCsv: exportCsv,
           centsToCsv: centsToCsv, comboLabel: comboLabel, _setStore: _setStore };
});
