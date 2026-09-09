/* Run: node tests.js */
var assert = require('assert');
var L = require('./logic.js');
var S = require('./storage.js');
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('✓', name); }
function C(o) { return L.normalizeCounts(o); }
function assertConsistent(counts, removed) {
  var v = L.validateClosing(counts, removed, false);
  assert.strictEqual(v.initial - v.removed, v.finalCash, 'initial - removed = final');
  L.DENOMINATIONS.forEach(function (d) { assert.ok((removed[d]||0) <= (counts[d]||0), 'never remove more than available'); });
}

test('A: €249 → remove €99 → leave €150 (brief example)', function () {
  var counts = C({5000:1,2000:3,1000:8,500:2,200:8,100:20,50:5,20:20,10:62,5:6});
  var r = L.computeClosing(counts);
  assert.strictEqual(r.total, 24900);
  assert.strictEqual(r.status, 'exact');
  assert.strictEqual(r.toRemove, 9900);
  assert.deepStrictEqual(r.recommended, C({5000:1,2000:2,500:1,200:2}));
  assert.strictEqual(r.finalCash, 15000);
  assertConsistent(counts, r.recommended);
});

test('B: €150 → remove €0 → perfect closing', function () {
  var counts = C({5000:3});
  var r = L.computeClosing(counts);
  assert.strictEqual(r.status, 'perfect');
  assert.strictEqual(r.toRemove, 0);
  assert.strictEqual(L.countUnits(r.recommended), 0);
  assert.strictEqual(r.finalCash, 15000);
  var v = L.validateClosing(counts, r.recommended, true);
  assert.ok(v.ok);
});

test('C: €100 → below minimum', function () {
  var r = L.computeClosing(C({10000:1}));
  assert.strictEqual(r.status, 'below');
  assert.strictEqual(r.missing, 5000);
  assert.ok(!L.validateClosing(C({10000:1}), C({}), false).ok);
});

test('D: €250 → remove €100 → leave €150', function () {
  var counts = C({10000:1,5000:3});
  var r = L.computeClosing(counts);
  assert.strictEqual(r.status, 'exact');
  assert.strictEqual(r.toRemove, 10000);
  assert.deepStrictEqual(r.recommended, C({10000:1}));
  assertConsistent(counts, r.recommended);
});

test('E: €100 note is considered by the algorithm', function () {
  var counts = C({10000:2,5000:1});
  var r = L.computeClosing(counts);
  assert.strictEqual(r.status, 'exact');
  assert.strictEqual(r.recommended[10000], 1);
  assert.strictEqual(r.recommended[5000], 0);
});

test('F: never removes more than available', function () {
  var counts = C({2000:1,1000:5,500:1,200:10,100:30,50:40,20:50,10:100,5:100});
  var r = L.computeClosing(counts);
  assert.ok(r.status === 'exact' || r.status === 'inexact');
  var combo = r.status === 'exact' ? r.recommended : r.options[0].combo;
  assertConsistent(counts, combo);
  if (r.alternative) assertConsistent(counts, r.alternative);
});

test('G: €0.05 coins with no rounding errors', function () {
  var counts = C({5000:3,5:3});
  var r = L.computeClosing(counts);
  assert.strictEqual(r.total, 15015);
  assert.strictEqual(r.status, 'exact');
  assert.deepStrictEqual(r.recommended, C({5:3}));
  assert.strictEqual(L.calculateTotalCash(r.remaining), 15000);
  // 0.1 + 0.2 style trap in cents: 10 + 20 === 30
  assert.strictEqual(L.calculateTotalCash(C({10:1,20:1})), 30);
});

test('H: no exact solution is detected, nearest options shown', function () {
  // €150 in €50s + one €20 note: need to remove €20 exactly... that is exact. Make it inexact:
  // €160 with 3×€50 + 1×€10: remove €10 exact. Inexact: 2×€100 (total 200, need 50, only 100s)
  var counts = C({10000:2});
  var r = L.computeClosing(counts);
  assert.strictEqual(r.status, 'inexact');
  assert.strictEqual(r.toRemove, 5000);
  assert.ok(r.options.length >= 1);
  r.options.forEach(function (o) {
    assert.notStrictEqual(o.leave, 15000, 'never claim €150 when not exact');
    assert.strictEqual(o.leave + o.remove, 20000);
    assertConsistent(counts, o.combo);
  });
  assert.strictEqual(r.options[0].leave, 10000); // remove one €100, leave €100
});

test('H2: inexact with options above and below target', function () {
  var counts = C({5000:3,20:1,10:1}); // total 150.30, remove 0.30 → only 0.20 or 0.10 or 0.30! exact
  var r = L.computeClosing(counts);
  assert.strictEqual(r.status, 'exact');
  counts = C({5000:3,20:2,5:1}); // 150.45, need 0.45: 20+20+5 = 45 exact
  assert.strictEqual(L.computeClosing(counts).status, 'exact');
  counts = C({5000:3,20:2}); // 150.40 need 0.40 exact
  counts = C({5000:3,20:1,2000:1}); // 170.20, need 20.20 = 20+0.20 exact
  counts = C({5000:3,50:1,20:1}); // 150.70 need 0.70 = 50+20 exact
  counts = C({5000:3,50:2}); // 151.00 need 1.00 = 50+50 exact
  counts = C({5000:3,200:1,50:1}); // 152.50 need 2.50 = 2+0.5 exact
  counts = C({5000:3,200:1,20:1}); // 152.20 need 2.20 exact
  counts = C({5000:2,2000:3,10:1}); // 160.10 need 10.10: no! options: 20 (leave 140.10) or 0.10 (leave 160)
  r = L.computeClosing(counts);
  assert.strictEqual(r.status, 'inexact');
  var leaves = r.options.map(function (o) { return o.leave; }).sort();
  assert.deepStrictEqual(leaves, [14010, 16000]);
  assert.strictEqual(r.options[0].leave, 14010, 'closest to €150 first (9.90 < 10.00)');
});

test('H3: inexact never offers an empty removal', function () {
  var r = L.computeClosing(C({10000:2}));
  r.options.forEach(function (o) { assert.ok(L.countUnits(o.combo) > 0); });
  assert.strictEqual(r.options.length, 1);
});

test('I: two exact solutions → best chosen by rules (€80 example)', function () {
  var counts = C({5000:1,2000:4,1000:1}); // total 140... add to be ≥150
  counts = C({10000:1,5000:2,2000:4,1000:1}); // total 290 → remove 140
  // Simpler: brief example directly on findBestRemovalCombination
  var r = L.findBestRemovalCombination(C({5000:1,2000:4,1000:1}), 8000);
  assert.ok(r.exact);
  assert.deepStrictEqual(r.recommended, C({5000:1,2000:1,1000:1}));
  assert.deepStrictEqual(r.alternative, C({2000:4}));
});

test('I2: same unit count → prefer larger denominations', function () {
  // remove €40: {20,20} vs {20,10,10} vs {10×4}: fewest units = 20+20
  var r = L.findBestRemovalCombination(C({2000:2,1000:4}), 4000);
  assert.deepStrictEqual(r.recommended, C({2000:2}));
  // remove €60 with 50,10,20,20,20: {50,10} (2 units) beats {20,20,20} (3)
  r = L.findBestRemovalCombination(C({5000:1,2000:3,1000:1}), 6000);
  assert.deepStrictEqual(r.recommended, C({5000:1,1000:1}));
});

test('I3: rankCombinations ordering', function () {
  var a = C({2000:4}), b = C({5000:1,2000:1,1000:1}), c = C({5000:1,1000:3});
  var ranked = L.rankCombinations([a, c, b]);
  assert.deepStrictEqual(ranked[0], b);
  assert.deepStrictEqual(ranked[1], c);
  assert.deepStrictEqual(ranked[2], a);
});

test('J: save → reload → history available (persistence via store)', function () {
  var mem = {};
  S._setStore({ getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = v; }, removeItem: function (k) { delete mem[k]; } });
  var comp = L.computeClosing(C({5000:3,2000:1}));
  var rec = S.buildRecord({ shift: 'night', responsible: 'Xu' }, comp, comp.recommended);
  S.saveClosing(rec);
  // simulate refresh: re-parse from raw store
  var list = JSON.parse(mem[S.KEY]);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(S.loadClosings()[0].id, rec.id);
  assert.strictEqual(S.loadClosings()[0].finalCash, 15000);
});

test('K: edit closing → calculations redone', function () {
  var old = S.loadClosings()[0];
  var comp = L.computeClosing(C({5000:3,2000:2,500:1}));
  var rec = S.buildRecord({ shift: 'morning', responsible: 'Xu' }, comp, comp.recommended, old);
  S.saveClosing(rec);
  var list = S.loadClosings();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, old.id);
  assert.strictEqual(list[0].initialCash, 19500);
  assert.strictEqual(list[0].removedCash, 4500);
  assert.strictEqual(list[0].finalCash, 15000);
  assert.strictEqual(list[0].shift, 'morning');
});

test('L: delete removes record (UI enforces confirmation)', function () {
  var id = S.loadClosings()[0].id;
  S.deleteClosing(id);
  assert.strictEqual(S.loadClosings().length, 0);
});

test('M: CSV export has header + rows and Excel-friendly format', function () {
  var comp = L.computeClosing(C({5000:1,2000:3,1000:8,500:2,200:8,100:20,50:5,20:20,10:62,5:6}));
  var rec = S.buildRecord({ shift: 'night', responsible: 'Matheus, Jr' }, comp, comp.recommended);
  var csv = S.exportCsv([rec]);
  var lines = csv.replace(/^\uFEFF/, '').trim().split('\r\n');
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0].split(',').length, 19);
  assert.ok(lines[1].indexOf('"Matheus, Jr"') > 0);
  assert.ok(lines[1].indexOf('249.00,99.00,150.00') > 0);
  assert.ok(lines[1].indexOf('1x50.00 + 2x20.00 + 1x5.00 + 2x2.00') > 0);
});

test('N: initial − removed = final holds across randomized counts', function () {
  var seed = 42;
  function rnd(n) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; }
  for (var i = 0; i < 300; i++) {
    var counts = {};
    L.DENOMINATIONS.forEach(function (d) { counts[d] = rnd(6); });
    var r = L.computeClosing(counts);
    if (r.status === 'below') continue;
    var combos = r.status === 'inexact' ? r.options.map(function (o) { return o.combo; }) : [r.recommended].concat(r.alternative ? [r.alternative] : []);
    combos.forEach(function (combo) {
      assertConsistent(r.counts, combo);
      if (r.status !== 'inexact') assert.strictEqual(L.calculateTotalCash(combo), r.toRemove);
    });
    if (r.status === 'exact' || r.status === 'perfect') assert.ok(L.validateClosing(r.counts, r.recommended, true).ok);
  }
});

test('V: validation rejects invalid counts and tampering', function () {
  assert.strictEqual(L.validateCounts({ 5000: -1 }).length, 1);
  assert.strictEqual(L.validateCounts({ 5000: 1.5 }).length, 1);
  assert.strictEqual(L.validateCounts({ 5000: 'a' }).length, 1);
  var v = L.validateClosing(C({5000:3,2000:1}), C({2000:2}), true);
  assert.ok(!v.ok && v.errors.indexOf('removed_exceeds_available') >= 0);
  assert.throws(function () { S.buildRecord({shift:'night',responsible:'x'}, L.computeClosing(C({5000:3,2000:1})), C({2000:2})); });
});

test('P: performance — large cash computed instantly', function () {
  var counts = C({10000:5,5000:6,2000:10,1000:12,500:20,200:40,100:60,50:60,20:80,10:80,5:80});
  var t = Date.now();
  var r = L.computeClosing(counts);
  var ms = Date.now() - t;
  assert.strictEqual(r.status, 'exact');
  assert.ok(ms < 300, 'took ' + ms + 'ms');
  console.log('   (large case: ' + ms + 'ms, total €' + r.total / 100 + ')');
});

console.log('\nAll ' + passed + ' tests passed.');
