/* FLY Closing — centralized translations and money formatting. */
(function (root) {
  'use strict';
  var STRINGS = {
    en: {
      appName: 'FLY Closing',
      tagline: 'Count the cash. Leave €150.',
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
      belowMinimumHint: 'A closing needs at least €150.00 in the drawer. Check the count or add cash.',
      missing: 'Missing',
      perfectClosing: 'Perfect closing',
      perfectHint: 'Nothing to remove.',
      noExact: 'It is not possible to leave exactly €150.00 with the current cash composition.',
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
      tagline: 'Cuenta la caja. Deja 150 €.',
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
      belowMinimumHint: 'Un cierre necesita al menos 150,00 € en caja. Revisa el recuento o añade efectivo.',
      missing: 'Falta',
      perfectClosing: 'Cierre perfecto',
      perfectHint: 'No hay nada que retirar.',
      noExact: 'No es posible dejar exactamente 150,00 € con la composición actual de la caja.',
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
  function t(key) { return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key; }

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
                t: t, money: money, denom: denom, formatDate: formatDate };
})(window);
