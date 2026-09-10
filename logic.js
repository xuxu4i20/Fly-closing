/* FLY Closing — pure financial logic. No DOM, no floats. All money in integer cents. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlyLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TARGET_CENTS = 15000; // default (club)
  var REGISTERS = { dispensary: 15000, bar: 10000 };
  // Older records used the key 'club' for the €150 register.
  function registerKey(k) { return k === 'club' ? 'dispensary' : (REGISTERS[k] ? k : 'dispensary'); }
  function targetFor(target) { return (typeof target === 'number' && target > 0) ? target : TARGET_CENTS; }
  // Largest first. Order matters for tie-breaking (prefer larger denominations).
  var DENOMINATIONS = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5];
  var NOTES = [10000, 5000, 2000, 1000, 500];
  var COINS = [200, 100, 50, 20, 10, 5];
  var UNIT = 5;           // every denomination is a multiple of 5 cents
  var MAX_QTY = 9999;     // per-denomination sanity cap
  var MAX_TOTAL = 2000000; // €20,000 — keeps DP tables small
  var ABOVE_WINDOW = 20000; // €200 — how far above the target we look for a near solution

  function isValidCount(n) {
    return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_QTY;
  }

  function validateCounts(counts) {
    var errors = [];
    DENOMINATIONS.forEach(function (d) {
      var n = counts[d] === undefined ? 0 : counts[d];
      if (!isValidCount(n)) errors.push({ denomination: d, value: n });
    });
    return errors;
  }

  function normalizeCounts(counts) {
    var out = {};
    DENOMINATIONS.forEach(function (d) {
      var n = counts && counts[d];
      out[d] = isValidCount(n) ? n : 0;
    });
    return out;
  }

  function calculateTotalCash(counts) {
    var total = 0;
    DENOMINATIONS.forEach(function (d) { total += d * (counts[d] || 0); });
    return total;
  }

  function calculateAmountToRemove(totalCents, target) {
    return totalCents - targetFor(target); // may be negative => below minimum
  }

  function countUnits(combo) {
    var n = 0;
    DENOMINATIONS.forEach(function (d) { n += combo[d] || 0; });
    return n;
  }

  function comboValue(combo) {
    return calculateTotalCash(combo);
  }

  function isEmptyCombo(combo) {
    return countUnits(combo) === 0;
  }

  function sameCombo(a, b) {
    return DENOMINATIONS.every(function (d) { return (a[d] || 0) === (b[d] || 0); });
  }

  /**
   * Bounded subset-sum DP over amounts (in 5-cent units).
   * denoms: array of cents (largest first). counts: available qty per denom.
   * Returns { reachable(a), solve(a) } where solve returns best combo for amount a or null.
   * Ranking: fewest units, then lexicographically more units of larger denominations.
   */
  function buildSolver(denoms, counts, maxAmount) {
    var W = Math.floor(maxAmount / UNIT);
    var n = denoms.length;
    var INF = 0x7fffffff;
    // dp for suffix i: best unit count to make amount a using denoms[i..]
    var next = new Int32Array(W + 1).fill(INF);
    next[0] = 0;
    var choice = new Array(n); // choice[i][a] = how many of denoms[i] used
    for (var i = n - 1; i >= 0; i--) {
      var d = denoms[i] / UNIT;
      var q = counts[denoms[i]] || 0;
      var cur = new Int32Array(W + 1).fill(INF);
      var ch = new Uint16Array(W + 1);
      for (var a = 0; a <= W; a++) {
        var best = next[a], bestK = 0;
        var maxK = Math.min(q, Math.floor(a / d));
        for (var k = 1; k <= maxK; k++) {
          var rest = next[a - k * d];
          if (rest === INF) continue;
          var c = rest + k;
          if (c < best || (c === best && k > bestK)) { best = c; bestK = k; }
        }
        cur[a] = best;
        ch[a] = bestK;
      }
      choice[i] = ch;
      next = cur;
    }
    var top = next;
    return {
      reachable: function (amount) {
        if (amount < 0 || amount > maxAmount || amount % UNIT !== 0) return false;
        return top[amount / UNIT] !== INF;
      },
      solve: function (amount) {
        if (!this.reachable(amount)) return null;
        var combo = {};
        var a = amount / UNIT;
        for (var i = 0; i < n; i++) {
          var k = choice[i][a];
          combo[denoms[i]] = k;
          a -= k * (denoms[i] / UNIT);
        }
        DENOMINATIONS.forEach(function (d) { if (combo[d] === undefined) combo[d] = 0; });
        return combo;
      }
    };
  }

  /** Ranks combos: fewer units, then more of larger denominations. Returns sorted copy. */
  function rankCombinations(combos) {
    return combos.slice().sort(function (a, b) {
      var ua = countUnits(a), ub = countUnits(b);
      if (ua !== ub) return ua - ub;
      for (var i = 0; i < DENOMINATIONS.length; i++) {
        var d = DENOMINATIONS[i];
        if ((a[d] || 0) !== (b[d] || 0)) return (b[d] || 0) - (a[d] || 0);
      }
      return 0;
    });
  }

  /**
   * Finds the best removal combination.
   * Returns { exact: bool, recommended, alternative, nearest: [{leave, remove, combo}] }
   */
  function findBestRemovalCombination(counts, amountToRemove) {
    counts = normalizeCounts(counts);
    var total = calculateTotalCash(counts);
    if (amountToRemove < 0 || amountToRemove > total) {
      return { exact: false, recommended: null, alternative: null, nearest: [] };
    }
    if (amountToRemove === 0) {
      return { exact: true, recommended: normalizeCounts({}), alternative: null, nearest: [] };
    }
    // DP only needs to cover the amount to remove (not the whole cash total).
    var limit = Math.min(amountToRemove, MAX_TOTAL);
    var solver = buildSolver(DENOMINATIONS, counts, limit);

    if (solver.reachable(amountToRemove)) {
      var recommended = solver.solve(amountToRemove);
      var candidates = [];
      DENOMINATIONS.forEach(function (d) {
        if (!recommended[d]) return;
        var reduced = normalizeCounts(counts);
        reduced[d] = 0;
        var s2 = buildSolver(DENOMINATIONS, reduced, amountToRemove);
        var alt = s2.solve(amountToRemove);
        if (alt && !sameCombo(alt, recommended)) candidates.push(alt);
      });
      var alternative = null;
      if (candidates.length) {
        var ranked = rankCombinations(candidates);
        var a0 = ranked[0];
        // Only show if genuinely useful: not absurdly worse than recommended.
        if (countUnits(a0) <= countUnits(recommended) * 4 + 2) alternative = a0;
      }
      return { exact: true, recommended: recommended, alternative: alternative, nearest: [] };
    }

    // No exact combination: find nearest reachable amounts below and above.
    // Extend the search window a little above the target for the "above" option.
    limit = Math.min(total, amountToRemove + ABOVE_WINDOW, MAX_TOTAL);
    solver = buildSolver(DENOMINATIONS, counts, limit);
    var nearest = [];
    var below = null, above = null;
    // a >= UNIT: removing nothing is never a useful option.
    for (var a = amountToRemove - UNIT; a >= UNIT; a -= UNIT) {
      if (solver.reachable(a)) { below = a; break; }
    }
    for (var b = amountToRemove + UNIT; b <= limit; b += UNIT) {
      if (solver.reachable(b)) { above = b; break; }
    }
    // Prefer the one leaving closest to target; below-removal leaves more cash (>150).
    var opts = [];
    if (below !== null) opts.push(below);
    if (above !== null) opts.push(above);
    opts.sort(function (x, y) {
      var dx = Math.abs(x - amountToRemove), dy = Math.abs(y - amountToRemove);
      if (dx !== dy) return dx - dy;
      return y - x; // tie: prefer leaving more (removing less)
    });
    opts.forEach(function (amt) {
      var combo = solver.solve(amt);
      if (combo) nearest.push({ remove: amt, leave: total - amt, combo: combo });
    });
    return { exact: false, recommended: null, alternative: null, nearest: nearest };
  }

  function calculateRemainingCash(counts, removed) {
    var out = {};
    DENOMINATIONS.forEach(function (d) {
      out[d] = (counts[d] || 0) - (removed[d] || 0);
    });
    return out;
  }

  /**
   * Full closing computation from a physical count.
   * status: 'below' | 'perfect' | 'exact' | 'inexact'
   */
  function computeClosing(counts, target) {
    target = targetFor(target);
    counts = normalizeCounts(counts);
    var total = calculateTotalCash(counts);
    var toRemove = calculateAmountToRemove(total, target);
    if (toRemove < 0) {
      return { status: 'below', target: target, counts: counts, total: total, missing: -toRemove, toRemove: 0 };
    }
    var result = findBestRemovalCombination(counts, toRemove);
    if (toRemove === 0) {
      return {
        status: 'perfect', target: target, counts: counts, total: total, toRemove: 0,
        recommended: result.recommended, alternative: null,
        remaining: counts, finalCash: total
      };
    }
    if (result.exact) {
      return {
        status: 'exact', target: target, counts: counts, total: total, toRemove: toRemove,
        recommended: result.recommended, alternative: result.alternative,
        remaining: calculateRemainingCash(counts, result.recommended), finalCash: target
      };
    }
    return {
      status: 'inexact', target: target, counts: counts, total: total, toRemove: toRemove,
      options: result.nearest.map(function (o) {
        return { remove: o.remove, leave: o.leave, combo: o.combo,
                 remaining: calculateRemainingCash(counts, o.combo) };
      })
    };
  }

  /**
   * Independent final verification. Returns { ok, errors[] }.
   * Checks: no negative counts, removed <= available, initial - removed = final,
   * and final = 150.00 when the closing is exact/perfect.
   */
  function validateClosing(counts, removed, expectExact, target) {
    target = targetFor(target);
    var errors = [];
    counts = normalizeCounts(counts);
    removed = normalizeCounts(removed);
    if (validateCounts(counts).length) errors.push('invalid_counts');
    DENOMINATIONS.forEach(function (d) {
      if (removed[d] > counts[d]) errors.push('removed_exceeds_available');
    });
    var initial = calculateTotalCash(counts);
    var removedValue = calculateTotalCash(removed);
    var remaining = calculateRemainingCash(counts, removed);
    var finalCash = calculateTotalCash(remaining);
    if (initial - removedValue !== finalCash) errors.push('arithmetic_mismatch');
    if (removedValue > initial) errors.push('removed_exceeds_total');
    if (initial < target) errors.push('below_minimum');
    if (expectExact && finalCash !== target) errors.push('final_not_target');
    return { ok: errors.length === 0, initial: initial, removed: removedValue, finalCash: finalCash, errors: errors };
  }

  return {
    TARGET_CENTS: TARGET_CENTS,
    REGISTERS: REGISTERS,
    targetFor: targetFor,
    registerKey: registerKey,
    DENOMINATIONS: DENOMINATIONS,
    NOTES: NOTES,
    COINS: COINS,
    validateCounts: validateCounts,
    normalizeCounts: normalizeCounts,
    calculateTotalCash: calculateTotalCash,
    calculateAmountToRemove: calculateAmountToRemove,
    findBestRemovalCombination: findBestRemovalCombination,
    rankCombinations: rankCombinations,
    calculateRemainingCash: calculateRemainingCash,
    computeClosing: computeClosing,
    validateClosing: validateClosing,
    countUnits: countUnits,
    comboValue: comboValue,
    isEmptyCombo: isEmptyCombo
  };
});
