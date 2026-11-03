(function () {
  'use strict';

  var role = document.body.getAttribute('data-role');
  var page = location.pathname.split('/').pop();
  var farmerDashboard = role === 'Petani' && page === 'petani-dashboard.php';
  var farmerStatusPage = role === 'Petani' && page === 'petani-status-penjualan.php';
  var tableBody = role === 'Petani' && (page === 'petani-penawaran-saya.php' || farmerDashboard || farmerStatusPage)
    ? document.querySelector('.table-wrap tbody')
    : null;
  var offerGrid = role === 'Pembeli' ? document.querySelector('.offer-grid') : null;
  var count = document.querySelector('.result-head b');
  var csrfToken = '';
  if (!tableBody && !offerGrid) return;

  function formatDate(value) {
    if (!value) return '—';
    var date = new Date(String(value).slice(0, 10) + 'T00:00:00');
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function addCell(row, value) {
    var cell = document.createElement('td');
    cell.textContent = value == null || value === '' ? '—' : String(value);
    row.appendChild(cell);
  }

  function renderFarmerOffers(rows) {
    tableBody.replaceChildren();
    if (!rows.length) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = 7;
      emptyCell.textContent = 'Belum ada penawaran. Pilih “Buat Penawaran” untuk memulai.';
      emptyRow.appendChild(emptyCell);
      tableBody.appendChild(emptyRow);
      return;
    }

    rows.forEach(function (offer) {
      var row = document.createElement('tr');
      addCell(row, offer.product_name);
      if (farmerDashboard || farmerStatusPage) {
        addCell(row, offer.farmer_name);
        addCell(row, offer.region || 'Alamat belum diisi');
        addCell(row, Number(offer.stock).toLocaleString('id-ID') + ' ' + offer.unit);
        addCell(row, formatDate(offer.harvest_date));
        var dashboardStatusCell = document.createElement('td');
        var dashboardBadge = document.createElement('span');
        dashboardBadge.className = 'badge ' + (offer.status === 'tersedia' ? 'green' : 'gray');
        dashboardBadge.textContent = offer.status === 'tersedia'
          ? 'Aktif'
          : offer.status === 'draf' ? 'Draf privat' : offer.status;
        dashboardStatusCell.appendChild(dashboardBadge);
        addPublishButton(dashboardStatusCell, offer);
        row.appendChild(dashboardStatusCell);
        var actionCell = document.createElement('td');
        var viewLink = document.createElement('a');
        viewLink.className = 'link-btn';
        viewLink.href = 'petani-penawaran-saya.php';
        viewLink.textContent = 'Lihat';
        actionCell.appendChild(viewLink);
        row.appendChild(actionCell);
        tableBody.appendChild(row);
        return;
      }
      addCell(row, Number(offer.stock).toLocaleString('id-ID'));
      addCell(row, offer.unit);
      addCell(row, 'Rp' + Number(offer.price).toLocaleString('id-ID'));
      addCell(row, formatDate(offer.harvest_date));
      addCell(row, offer.region || 'Alamat belum diisi');
      var statusCell = document.createElement('td');
      var badge = document.createElement('span');
      badge.className = 'badge ' + (offer.status === 'tersedia' ? 'green' : 'gray');
      badge.textContent = offer.status === 'tersedia'
        ? 'Aktif'
        : offer.status === 'draf' ? 'Draf privat' : offer.status;
      statusCell.appendChild(badge);
      addPublishButton(statusCell, offer);
      row.appendChild(statusCell);
      tableBody.appendChild(row);
    });

    var pagination = document.querySelector('.pagination');
    var label = pagination && pagination.querySelector('span');
    if (label) label.textContent = 'Menampilkan ' + rows.length + ' dari ' + rows.length + ' penawaran';
    if (pagination) {
      var controls = pagination.querySelector('div');
      if (controls) controls.hidden = true;
    }
  }

  function addPublishButton(cell, offer) {
    if (offer.status !== 'draf') return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'publish-offer';
    button.dataset.offerId = String(offer.id);
    button.textContent = 'Terbitkan';
    cell.appendChild(button);
  }

  function createOfferCard(offer) {
    var article = document.createElement('article');
    article.className = 'offer-card';
    var created = offer.created_at ? new Date(String(offer.created_at).replace(' ', 'T')) : new Date();
    article.dataset.ageDays = String(Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000)));

    var image = document.createElement('div');
    image.className = 'offer-image';
    var photo = document.createElement('img');
    photo.className = 'offer-photo';
    photo.alt = 'Foto ' + offer.product_name;
    photo.hidden = true;
    var placeholder = document.createElement('span');
    placeholder.className = 'offer-photo-placeholder';
    placeholder.textContent = 'Foto belum tersedia';
    if (offer.image) {
      try {
        var imageUrl = new URL(String(offer.image), document.baseURI);
        if (imageUrl.protocol === 'http:' || imageUrl.protocol === 'https:') {
          photo.src = imageUrl.href;
          photo.hidden = false;
          placeholder.hidden = true;
          photo.addEventListener('error', function () {
            photo.hidden = true;
            placeholder.hidden = false;
          }, { once: true });
        }
      } catch (error) {
        console.error('Alamat foto penawaran tidak valid.', error);
      }
    }
    image.appendChild(photo);
    image.appendChild(placeholder);
    var badge = document.createElement('span');
    badge.className = 'badge green';
    badge.textContent = 'Aktif';
    image.appendChild(badge);

    var body = document.createElement('div');
    body.className = 'offer-body';
    var category = document.createElement('div');
    var categoryName = document.createElement('span');
    categoryName.textContent = offer.category_name || 'Komoditas';
    var heading = document.createElement('h3');
    heading.textContent = offer.product_name;
    category.append(categoryName, heading);
    var region = document.createElement('p');
    region.textContent = offer.region || 'Wilayah belum diisi';
    var details = document.createElement('div');
    details.className = 'offer-details';
    details.textContent = 'Jumlah ' + Number(offer.stock).toLocaleString('id-ID') + ' ' + offer.unit +
      ' · Rp' + Number(offer.price).toLocaleString('id-ID');
    var harvest = document.createElement('p');
    harvest.textContent = 'Panen ' + formatDate(offer.harvest_date);
    var farmer = document.createElement('div');
    farmer.className = 'offer-farmer';
    farmer.textContent = offer.farmer_name || 'Petani';
    body.append(category, region, details, harvest, farmer);
    article.append(image, body);
    return article;
  }

  function renderBuyerOffers(rows) {
    offerGrid.replaceChildren();
    if (count) count.textContent = rows.length + ' penawaran ditemukan';
    if (!rows.length) {
      var empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.style.gridColumn = '1 / -1';
      empty.textContent = 'Belum ada penawaran tersedia di database.';
      offerGrid.appendChild(empty);
      return;
    }
    rows.forEach(function (offer) { offerGrid.appendChild(createOfferCard(offer)); });
    window.dispatchEvent(new CustomEvent('tanihubungan:offers-loaded'));
  }

  var loading = false;
  function loadOffers() {
    if (loading || document.visibilityState === 'hidden') return;
    loading = true;
    fetch('api/offers.php', { credentials: 'same-origin', cache: 'no-store' })
      .then(async function (response) {
        var result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Data penawaran tidak dapat dimuat.');
        return result;
      })
      .then(function (result) {
        csrfToken = result.csrfToken || '';
        if (tableBody) renderFarmerOffers(result.rows);
        if (offerGrid) renderBuyerOffers(result.rows);
      })
      .catch(function (error) {
        console.error('Data penawaran gagal dimuat.', error);
        var message = error.message || 'Data penawaran tidak dapat dimuat.';
        if (tableBody) {
          var row = document.createElement('tr');
          var cell = document.createElement('td');
          cell.colSpan = 7;
          cell.textContent = message;
          row.appendChild(cell);
          tableBody.replaceChildren(row);
        }
        if (offerGrid) {
          var notice = document.createElement('p');
          notice.className = 'empty-state error';
          notice.style.gridColumn = '1 / -1';
          notice.textContent = message;
          offerGrid.replaceChildren(notice);
        }
      })
      .finally(function () { loading = false; });
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('.publish-offer');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (!csrfToken || button.disabled) return;

    button.disabled = true;
    button.textContent = 'Menerbitkan...';
    fetch('api/offers.php', {
      method: 'PUT',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ id: Number(button.dataset.offerId), action: 'publish' })
    })
      .then(async function (response) {
        var result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Penawaran gagal diterbitkan.');
        return result;
      })
      .then(function (result) {
        window.alert(result.message);
        window.dispatchEvent(new CustomEvent('tanihubungan:offers-changed'));
        loadOffers();
      })
      .catch(function (error) {
        console.error('Penawaran gagal diterbitkan.', error);
        window.alert(error.message || 'Penawaran gagal diterbitkan.');
        button.disabled = false;
        button.textContent = 'Terbitkan';
      });
  });

  loadOffers();
  window.addEventListener('focus', loadOffers);
  document.addEventListener('visibilitychange', loadOffers);
  window.setInterval(loadOffers, 30000);
})();
