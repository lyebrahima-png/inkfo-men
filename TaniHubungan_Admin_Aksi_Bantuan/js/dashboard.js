(function () {
  'use strict';

  var role = document.body.getAttribute('data-role');
  if (!['Admin', 'Petani'].includes(role)) return;

  function formatCount(value) {
    return Number(value).toLocaleString('id-ID');
  }

  function setMetric(label, value, detail) {
    var card = Array.from(document.querySelectorAll('.stat-card')).find(function (item) {
      var name = item.querySelector('.stat-label');
      return name && name.textContent.trim().toLowerCase() === label.toLowerCase();
    });
    if (!card) return;
    var number = card.querySelector('b');
    var description = card.querySelector(':scope > span');
    if (number) number.textContent = value;
    if (description && detail) description.textContent = detail;
  }

  function showError(message) {
    var status = document.querySelector('.dashboard-data-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'dashboard-data-status empty-state error';
      status.setAttribute('role', 'status');
      var content = document.querySelector('.app-content');
      if (content) content.prepend(status);
    }
    if (status) status.textContent = message;
  }

  function hideError() {
    var status = document.querySelector('.dashboard-data-status');
    if (status) status.remove();
  }

  function renderFarmer(data) {
    var summary = document.querySelector('.summary-main');
    if (summary) {
      var value = summary.querySelector('b');
      var description = summary.querySelector('small');
      if (value) value.textContent = 'Rp' + Number(data.active_offer_value).toLocaleString('id-ID');
      if (description) description.textContent = data.active_offers + ' penawaran aktif dari database';
    }

    var cards = document.querySelectorAll('.user-summary .stat-card');
    if (cards[0]) {
      var activeLabel = cards[0].querySelector('.stat-label');
      var activeValue = cards[0].querySelector('b');
      var activeDetail = cards[0].querySelector('span');
      if (activeLabel) activeLabel.textContent = 'Penawaran Aktif';
      if (activeValue) activeValue.textContent = formatCount(data.active_offers);
      if (activeDetail) activeDetail.textContent = 'Penawaran tersedia dengan stok di database';
    }
    if (cards[1]) {
      var draftLabel = cards[1].querySelector('.stat-label');
      var draftValue = cards[1].querySelector('b');
      var draftDetail = cards[1].querySelector('span');
      if (draftLabel) draftLabel.textContent = 'Draf Privat';
      if (draftValue) draftValue.textContent = formatCount(data.draft_offers);
      if (draftDetail) draftDetail.textContent = 'Hanya terlihat oleh Anda sampai diterbitkan';
    }
  }

  function renderAdmin(data) {
    setMetric('Total Petani', formatCount(data.farmers), 'Akun Petani di database');
    setMetric('Total Pembeli', formatCount(data.buyers), 'Akun Pembeli di database');
    setMetric('Penawaran Aktif', formatCount(data.active_offers), 'Penawaran tersedia dengan stok di database');
    setMetric('Transaksi Bulan Ini', formatCount(data.transactions_this_month), 'Transaksi tercatat bulan ini');

    var offerNavigation = Array.from(document.querySelectorAll('.sidebar nav button')).find(function (button) {
      var label = button.querySelector('span');
      return label && label.textContent.trim() === 'Penawaran';
    });
    var badge = offerNavigation && offerNavigation.querySelector('b');
    if (badge) badge.textContent = formatCount(data.active_offers);
  }

  var loading = false;
  function refresh() {
    if (loading || document.visibilityState === 'hidden') return;
    loading = true;
    fetch('api/dashboard.php', { credentials: 'same-origin', cache: 'no-store' })
      .then(async function (response) {
        var result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Ringkasan dashboard tidak dapat dimuat.');
        return result;
      })
      .then(function (data) {
        if (role === 'Petani') renderFarmer(data);
        else renderAdmin(data);
        hideError();
      })
      .catch(function (error) {
        console.error('Ringkasan dashboard gagal dimuat.', error);
        showError(error.message || 'Ringkasan dashboard tidak dapat dimuat dari database.');
      })
      .finally(function () { loading = false; });
  }

  refresh();
  window.addEventListener('tanihubungan:offers-changed', refresh);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  window.setInterval(refresh, 30000);
})();
