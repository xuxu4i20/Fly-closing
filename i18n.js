/* FLY Closing — centralized translations and money formatting. */
(function (root) {
  'use strict';
  var STRINGS = {
    en: {
      appName: 'FLY Closing',
      tagline: 'Count the cash. Leave the float.',
      register: 'Sector',
      dispensary: 'Dispensary',
      club: 'Dispensary',
      bar: 'Bar',
      byCount: 'Count',
      byAmount: '€ Amount',
      amountPlaceholder: '0.00',
      notMultiple: 'Not a multiple of',
      coinsAmountHint: 'Type the subtotal of each coin. It is converted to a count automatically.',

      newClosing: 'New closing',
      history: 'History',
      shift: 'Shift',
      morning: 'Morning',
      night: 'Night',
      responsible: 'Responsible',
      responsiblePlaceholder: 'Name or initials',
      notes: 'Notes',
      coins: 'Coins',
      totalInCash: 'Total in cash',
      calculate: 'Calculate',
      back: 'Back',
      cancel: 'Cancel',
      save: 'Save closing',
      saved: 'Closing saved',
      update: 'Update closing',
      updated: 'Closing updated',
      remove: 'Remove',
      leaveInCash: 'Leave in cash',
      recommended: 'Recommended',
      alternative: 'Alternative',
      belowMinimum: 'Cash below minimum',
      belowMinimumHint: 'A closing needs at least {t} in the drawer. Check the count or add cash.',
      missing: 'Missing',
      perfectClosing: 'Perfect closing',
      perfectHint: 'Nothing to remove.',
      noExact: 'It is not possible to leave exactly {t} with the current cash composition.',
      noExactHint: 'Choose the closest option. The amount left is shown for each one.',
      option: 'Option',
      leave: 'Leave',
      useThis: 'Use this option',
      selected: 'Selected',
      closingInformation: 'Closing information',
      date: 'Date',
      time: 'Time',
      initialCash: 'Initial cash',
      removed: 'Removed',
      remainingCash: 'Remaining cash',
      verification: 'Verification',
      edit: 'Edit',
      delete: 'Delete',
      deleteConfirm: 'Delete this closing?',
      deleteHint: 'This cannot be undone.',
      exportCsv: 'Export CSV',
      noHistory: 'No closings yet',
      noHistoryHint: 'Your saved closings will appear here.',
      exactBadge: 'Exact',
      inexactBadge: 'Not exact',
      nothing: 'Nothing',
      required: 'Enter who is responsible',
      units: 'units',
      unit: 'unit',
      installHint: 'Tip: add to Home Screen from the Share menu.',
      shortMorning: 'Morning',
      shortNight: 'Night',
      total: 'Total'
    },
    es: {
      appName: 'FLY Closing',
      tagline: 'Cuenta la caja. Deja el fondo.',
      register: 'Sector',
      dispensary: 'Dispensario',
      club: 'Dispensario',
      bar: 'Bar',
      byCount: 'Cantidad',
      byAmount: 'Importe €',
      amountPlaceholder: '0,00',
      notMultiple: 'No es múltiplo de',
      coinsAmountHint: 'Escribe el subtotal de cada moneda. Se convierte en cantidad automáticamente.',

      newClosing: 'Nuevo cierre',
      history: 'Historial',
      shift: 'Turno',
      morning: 'Mañana',
      night: 'Noche',
      responsible: 'Responsable',
      responsiblePlaceholder: 'Nombre o iniciales',
      notes: 'Billetes',
      coins: 'Monedas',
      totalInCash: 'Total en caja',
      calculate: 'Calcular',
      back: 'Atrás',
      cancel: 'Cancelar',
      save: 'Guardar cierre',
      saved: 'Cierre guardado',
      update: 'Actualizar cierre',
      updated: 'Cierre actualizado',
      remove: 'Retirar',
      leaveInCash: 'Dejar en caja',
      recommended: 'Recomendado',
      alternative: 'Alternativa',
      belowMinimum: 'Caja por debajo del mínimo',
      belowMinimumHint: 'Un cierre necesita al menos {t} en caja. Revisa el recuento o añade efectivo.',
      missing: 'Falta',
      perfectClosing: 'Cierre perfecto',
      perfectHint: 'No hay nada que retirar.',
      noExact: 'No es posible dejar exactamente {t} con la composición actual de la caja.',
      noExactHint: 'Elige la opción más cercana. Se muestra cuánto queda en caja en cada una.',
      option: 'Opción',
      leave: 'Dejar',
      useThis: 'Usar esta opción',
      selected: 'Seleccionada',
      closingInformation: 'Información del cierre',
      date: 'Fecha',
      time: 'Hora',
      initialCash: 'Caja inicial',
      removed: 'Retirado',
      remainingCash: 'Caja restante',
      verification: 'Verificación',
      edit: 'Editar',
      delete: 'Eliminar',
      deleteConfirm: '¿Eliminar este cierre?',
      deleteHint: 'Esta acción no se puede deshacer.',
      exportCsv: 'Exportar CSV',
      noHistory: 'Aún no hay cierres',
      noHistoryHint: 'Los cierres guardados aparecerán aquí.',
      exactBadge: 'Exacto',
      inexactBadge: 'No exacto',
      nothing: 'Nada',
      required: 'Indica quién es el responsable',
      units: 'unidades',
      unit: 'unidad',
      installHint: 'Consejo: añade a la pantalla de inicio desde el menú Compartir.',
      shortMorning: 'Mañana',
      shortNight: 'Noche',
      total: 'Total'
    }
  };
  var MONTHS = {
    en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    es: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  };
  var lang = 'en';
  function detect() {
    try {
      var saved = localStorage.getItem('fly_lang');
      if (saved && STRINGS[saved]) return saved;
    } catch (e) {}
    var nav = (navigator.language || 'en').slice(0, 2);
    return STRINGS[nav] ? nav : 'en';
  }
  function setLang(l) {
    if (!STRINGS[l]) return;
    lang = l;
    try { localStorage.setItem('fly_lang', l); } catch (e) {}
    document.documentElement.lang = l;
  }
  function t(key, vars) {
    var str = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { str = str.split('{' + k + '}').join(vars[k]); });
    return str;
  }
  /** Parse a user-typed amount ("12,40" / "12.40" / "12") → integer cents, or null if invalid. */
  function parseAmount(str) {
    str = String(str || '').trim().replace(/\s|€/g, '');
    if (str === '') return 0;
    if (!/^\d+([.,]\d{0,2})?$/.test(str)) return null;
    var parts = str.split(/[.,]/);
    var dec = (parts[1] || '') + '00';
    return parseInt(parts[0], 10) * 100 + parseInt(dec.slice(0, 2), 10);
  }
  /** Integer cents → editable plain amount ("12,40" in es, "12.40" in en). */
  function plainAmount(cents) {
    var s = String(cents); while (s.length < 3) s = '0' + s;
    return s.slice(0, -2) + (lang === 'es' ? ',' : '.') + s.slice(-2);
  }

  /** Integer cents → localized string. en: €249.00 · es: 249,00 € */
  function money(cents) {
    var neg = cents < 0; cents = Math.abs(cents);
    var s = String(cents); while (s.length < 3) s = '0' + s;
    var int = s.slice(0, -2), dec = s.slice(-2);
    var sep = lang === 'es' ? '.' : ',';
    int = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    var out = lang === 'es' ? int + ',' + dec + ' €' : '€' + int + '.' + dec;
    return (neg ? '−' : '') + out;
  }
  /** Short denomination label: €0.50 / 0,50 € ; €50 / 50 € */
  function denom(cents) {
    if (cents >= 100 && cents % 100 === 0) {
      var n = cents / 100;
      return lang === 'es' ? n + ' €' : '€' + n;
    }
    return money(cents);
  }
  function formatDate(iso) { // 'YYYY-MM-DD' → '09 Sep 2026'
    var p = iso.split('-');
    return p[2] + ' ' + MONTHS[lang][parseInt(p[1], 10) - 1] + ' ' + p[0];
  }
  root.I18N = { init: function () { setLang(detect()); }, setLang: setLang, get lang() { return lang; },
                t: t, parseAmount: parseAmount, plainAmount: plainAmount, money: money, denom: denom, formatDate: formatDate };
})(window);
