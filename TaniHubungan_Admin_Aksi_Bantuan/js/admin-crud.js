(function () {
  'use strict';

  var page = (location.pathname.split('/').pop() || '').toLowerCase();
  var config = {
    'admin-kelola-akun.php': {
      resource: 'users', title: 'Akun',
      columns: [['name', 'Nama'], ['email', 'Email'], ['role', 'Peran'], ['phone', 'Telepon'], ['address', 'Wilayah / alamat'], ['status', 'Status']],
      fields: [
        ['name', 'Nama lengkap', 'text', true], ['email', 'Email', 'email', true],
        ['role_id', 'Peran', 'select', true, 'roles'], ['phone', 'Nomor telepon', 'tel'],
        ['address', 'Wilayah / alamat', 'text'], ['status', 'Status', 'select', true, ['aktif', 'nonaktif']],
        ['password', 'Kata sandi (wajib saat menambah)', 'password', false, null, true]
      ]
    },
    'admin-kategori-komoditas.php': {
      resource: 'categories', title: 'Kategori komoditas',
      columns: [['category_name', 'Nama kategori'], ['product_count', 'Jumlah produk']],
      fields: [['category_name', 'Nama kategori', 'text', true]]
    },
    'admin-penawaran.php': {
      resource: 'products', title: 'Produk / penawaran',
      columns: [['product_name', 'Produk'], ['category_name', 'Kategori'], ['farmer_name', 'Petani'], ['region', 'Wilayah'], ['price', 'Harga'], ['stock', 'Jumlah'], ['unit', 'Satuan'], ['harvest_date', 'Tanggal panen'], ['status', 'Status']],
      fields: [
        ['product_name', 'Nama produk', 'text', true], ['farmer_id', 'Petani', 'select', true, 'farmers'],
        ['category_id', 'Kategori', 'select', false, 'categories'], ['description', 'Deskripsi', 'textarea'],
        ['price', 'Harga', 'number', true, null, false, '0.01'], ['stock', 'Stok', 'number', true, null, false, '0.01'],
        ['unit', 'Satuan', 'select', true, ['kg', 'ton', 'ikat']], ['harvest_date', 'Tanggal panen', 'date'],
        ['image', 'URL foto (opsional)', 'url'], ['status', 'Status', 'select', true, ['tersedia', 'habis', 'nonaktif']]
      ]
    },
    'admin-laporan-perdagangan.php': {
      resource: 'reports', title: 'Laporan perdagangan',
      columns: [['report_name', 'Nama laporan'], ['report_type', 'Jenis'], ['start_date', 'Tanggal awal'], ['end_date', 'Tanggal akhir'], ['admin_name', 'Dibuat oleh'], ['file_name', 'Nama file']],
      fields: [
        ['report_name', 'Nama laporan', 'text', true], ['report_type', 'Jenis laporan', 'text'],
        ['start_date', 'Tanggal awal', 'date'], ['end_date', 'Tanggal akhir', 'date'],
        ['file_name', 'Nama file', 'text']
      ]
    },
    'admin-data-harga.php': {
      resource: 'prices', title: 'Data harga',
      columns: [['commodity_name', 'Komoditas'], ['market_location', 'Pasar / lokasi'], ['price', 'Harga'], ['price_unit', 'Satuan'], ['source_name', 'Sumber'], ['record_date', 'Tanggal'], ['status', 'Status']],
      fields: [
        ['commodity_name', 'Komoditas', 'text', true], ['market_location', 'Pasar / lokasi', 'text', true],
        ['price', 'Harga', 'number', true, null, false, '0.01'], ['price_unit', 'Satuan', 'text', true],
        ['source_name', 'Sumber data', 'text', true], ['record_date', 'Tanggal pencatatan', 'date', true],
        ['status', 'Status', 'select', true, ['terverifikasi', 'menunggu', 'ditolak']]
      ]
    }
  }[page];

  if (!config) return;

  var table = document.querySelector('.table-wrap table');
  var body = table && table.querySelector('tbody');
  var addButton = document.querySelector('.app-content > .welcome .btn');
  if (!table || !body || !addButton) return;

  var rows = [];
  var csrfToken = '';
  var extras = {};
  var filter = document.querySelector('.filters input');
  var pagination = document.querySelector('.pagination');
  var paginationLabel = pagination && pagination.querySelector('span');
  var paginationControls = pagination && pagination.querySelector('div');

  function showMessage(message, isError) {
    var status = document.querySelector('.admin-crud-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'admin-crud-status';
      status.setAttribute('role', 'status');
      var filters = document.querySelector('.filters');
      filters.parentNode.insertBefore(status, filters.nextSibling);
    }
    status.textContent = message;
    status.classList.toggle('error', !!isError);
  }

  async function request(method, id, data) {
    var url = 'api/admin-data.php?resource=' + encodeURIComponent(config.resource);
    if (id) url += '&id=' + encodeURIComponent(id);
    var options = { method: method, credentials: 'same-origin', headers: {} };
    if (method !== 'GET') {
      options.headers['Content-Type'] = 'application/json';
      options.headers['X-CSRF-Token'] = csrfToken;
      options.body = JSON.stringify(data || {});
    }
    var response = await fetch(url, options);
    var result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Permintaan gagal.');
    return result;
  }

  function render() {
    var query = (filter ? filter.value : '').trim().toLocaleLowerCase('id');
    body.replaceChildren();
    table.querySelector('thead').replaceChildren();
    var headRow = document.createElement('tr');
    config.columns.concat([['__actions', 'Aksi']]).forEach(function (column) {
      var cell = document.createElement('th');
      cell.textContent = column[1];
      headRow.appendChild(cell);
    });
    table.querySelector('thead').appendChild(headRow);

    var visibleRows = rows.filter(function (row) {
      return !query || config.columns.some(function (column) {
        return String(row[column[0]] == null ? '' : row[column[0]]).toLocaleLowerCase('id').includes(query);
      });
    });
    if (paginationLabel) {
      paginationLabel.textContent = visibleRows.length
        ? 'Menampilkan ' + visibleRows.length + ' dari ' + rows.length + ' data'
        : 'Menampilkan 0 dari ' + rows.length + ' data';
    }
    if (paginationControls) paginationControls.hidden = true;
    if (!visibleRows.length) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = config.columns.length + 1;
      emptyCell.textContent = query ? 'Tidak ada data yang cocok.' : 'Belum ada data. Pilih “Tambah data” untuk memulai.';
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
      return;
    }

    visibleRows.forEach(function (row) {
      var tr = document.createElement('tr');
      config.columns.forEach(function (column) {
        var cell = document.createElement('td');
        var value = row[column[0]];
        if (column[0] === 'price' && value != null) {
          cell.textContent = 'Rp' + Number(value).toLocaleString('id-ID');
        } else if (column[0] === 'status') {
          var badge = document.createElement('span');
          badge.className = 'badge ' + (value === 'aktif' || value === 'tersedia' || value === 'terverifikasi' ? 'green' : 'gray');
          badge.textContent = value || '—';
          cell.appendChild(badge);
        } else {
          cell.textContent = value == null || value === '' ? '—' : String(value);
        }
        tr.appendChild(cell);
      });
      var actions = document.createElement('td');
      var edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'report-edit'; edit.textContent = 'Edit';
      edit.addEventListener('click', function () { openForm(row); });
      var remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'report-edit admin-crud-delete'; remove.textContent = 'Hapus';
      remove.addEventListener('click', async function () {
        if (!window.confirm('Hapus data ini secara permanen?')) return;
        try {
          var result = await request('DELETE', row.id);
          showMessage(result.message, false);
          await load();
        } catch (error) {
          showMessage(error.message, true);
        }
      });
      actions.append(edit, remove);
      tr.appendChild(actions);
      body.appendChild(tr);
    });
  }

  function openForm(row) {
    var backdrop = document.createElement('div');
    backdrop.className = 'th-modal-backdrop';
    var dialog = document.createElement('section');
    dialog.className = 'th-modal admin-crud-modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    var form = document.createElement('form');
    var closeButton = document.createElement('button');
    closeButton.type = 'button'; closeButton.className = 'th-modal-close';
    closeButton.setAttribute('aria-label', 'Tutup'); closeButton.textContent = '×';
    var kicker = document.createElement('span');
    kicker.className = 'th-modal-kicker'; kicker.textContent = 'KELOLA DATA';
    var heading = document.createElement('h2');
    heading.textContent = (row ? 'Edit ' : 'Tambah ') + config.title;
    var description = document.createElement('p');
    description.textContent = 'Perubahan akan disimpan ke database.';
    var fields = [];

    config.fields.forEach(function (spec) {
      var key = spec[0], wrapper = document.createElement('label');
      wrapper.textContent = spec[1];
      var control;
      if (spec[2] === 'textarea') {
        control = document.createElement('textarea');
        control.rows = 3;
      } else if (spec[2] === 'select') {
        control = document.createElement('select');
        var options = typeof spec[4] === 'string' ? (extras[spec[4]] || []) : (spec[4] || []);
        if (!spec[3] || key === 'category_id') {
          var empty = document.createElement('option');
          empty.value = '';
          empty.textContent = key === 'category_id' ? 'Tanpa kategori' : 'Pilih peran';
          control.appendChild(empty);
        }
        options.forEach(function (option) {
          var item = document.createElement('option');
          if (typeof option === 'object') {
            item.value = String(key === 'role_id' ? option.id : option.id);
            item.textContent = option.role_name || option.category_name || option.name || '';
          } else {
            item.value = option;
            item.textContent = option;
          }
          control.appendChild(item);
        });
      } else {
        control = document.createElement('input');
        control.type = spec[2];
        if (spec[6]) control.step = spec[6];
        if (key === 'password') control.autocomplete = 'new-password';
        if (key === 'email') control.autocomplete = 'email';
      }
      control.name = key;
      control.dataset.field = key;
      control.required = !!spec[3] && !(key === 'password' && row);
      if (spec[5] && row) control.disabled = true;
      if (row && row[key] != null) {
        var value = row[key];
        if (key === 'role_id' && row.role_id) value = row.role_id;
        control.value = key === 'password' ? '' : String(value);
      } else if (key === 'record_date') {
        control.value = new Date().toISOString().slice(0, 10);
      } else if (key === 'status') {
        control.value = spec[4][0];
      }
      fields.push(control);
      wrapper.appendChild(control);
      form.appendChild(wrapper);
    });

    var actions = document.createElement('div');
    actions.className = 'th-modal-actions';
    var cancel = document.createElement('button');
    cancel.type = 'button'; cancel.className = 'btn secondary'; cancel.textContent = 'Batal';
    var save = document.createElement('button');
    save.type = 'submit'; save.className = 'btn primary'; save.textContent = 'Simpan';
    actions.append(cancel, save);
    form.appendChild(actions);
    dialog.append(closeButton, kicker, heading, description, form);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    function close() {
      backdrop.classList.remove('visible');
      setTimeout(function () { backdrop.remove(); }, 180);
    }
    closeButton.addEventListener('click', close);
    cancel.addEventListener('click', close);
    backdrop.addEventListener('click', function (event) { if (event.target === backdrop) close(); });
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var data = {};
      fields.forEach(function (field) {
        if (!field.disabled) data[field.dataset.field] = field.value.trim();
      });
      save.disabled = true;
      try {
        var result = await request(row ? 'PUT' : 'POST', row && row.id, data);
        close();
        showMessage(result.message, false);
        await load();
      } catch (error) {
        save.disabled = false;
        showMessage(error.message, true);
      }
    });
    requestAnimationFrame(function () {
      backdrop.classList.add('visible');
      var first = fields.find(function (field) { return !field.disabled; });
      if (first) first.focus();
    });
  }

  async function load() {
    try {
      var result = await request('GET');
      rows = result.rows;
      csrfToken = result.csrfToken;
      extras = { roles: result.roles || [], farmers: result.farmers || [], categories: result.categories || [] };
      render();
    } catch (error) {
      showMessage(error.message, true);
    }
  }

  addButton.type = 'button';
  addButton.addEventListener('click', function () { openForm(null); });
  if (filter) filter.addEventListener('input', render);
  document.querySelectorAll('.filters > button').forEach(function (button) { button.remove(); });
  var panelTitle = document.querySelector('.panel-title');
  if (panelTitle) {
    var syncBadge = panelTitle.querySelector('.badge');
    if (syncBadge) syncBadge.textContent = 'Data dari database';
  }
  load();
})();
