/* TaniHubungan – navigasi antarperan/halaman dan wizard penawaran */
(function () {
  'use strict';

  var slug = function (s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };
  var fileOf = function (role, page) {
    return role === 'Publik' ? 'index.php' : slug(role) + '-' + slug(page) + '.php';
  };
  // Peran "Petugas" sudah digabung ke "Admin"; nama menu lama diarahkan ke menu baru
  var PAGE_ALIAS = {
    'Pantau Penawaran': 'Penawaran', 'Antrean Penawaran': 'Penawaran',
    'Verifikasi Petani': 'Verifikasi Mitra',
    'Sumber Harga': 'Data Harga', 'Sumber Data Harga': 'Data Harga', 'Perbarui Data Harga': 'Data Harga',
    'Laporan Penipuan': 'Laporan Masalah', 'Laporan Data Tidak Sesuai': 'Laporan Masalah'
  };
  var go = function (role, page) {
    if (role === 'Petugas') role = 'Admin';
    page = page || 'Dashboard';
    if (role === 'Admin' && PAGE_ALIAS[page]) page = PAGE_ALIAS[page];
    window.location.href = fileOf(role, page);
  };
  var text = function (el) { return el.textContent.replace(/\s+/g, ' ').trim(); };
  var role = document.body.getAttribute('data-role');
  function downloadTable(filename, title) {
    var rows = Array.from(document.querySelectorAll('main table tr')).map(function(tr){
      return Array.from(tr.querySelectorAll('th,td')).map(function(td){
        return '"' + text(td).replace(/"/g,'""') + '"';
      }).join(',');
    });
    if (!rows.length) rows = [['"Informasi"','"Keterangan"'],['"' + title + '"','"Belum ada data tabel pada halaman ini"']].map(function(r){return r.join(',');});
    var csv = '\ufeff' + rows.join('\r\n');
    var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    notify(title + ' berhasil diunduh.');
  }


  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn || btn.disabled) return;

    // Tombol pendaftaran berdasarkan jenis pengguna pada halaman utama.
    if (btn.hasAttribute('data-register-role')) {
      window.location.href = 'register.php?role=' + encodeURIComponent(btn.getAttribute('data-register-role'));
      return;
    }

    // Tombol Tambah Data di bagian judul halaman.
    if (/tambah data/i.test(text(btn)) && btn.closest('.welcome')) {
      if (document.querySelector('script[src="js/admin-crud.js"]')) return;
      var heading = btn.closest('.app-content')?.querySelector('.welcome h1');
      openDialog('Tambah data' + (heading ? ' — ' + text(heading) : ''),
        'Masukkan informasi baru. Data contoh akan disimpan secara lokal pada browser.',
        ['Nama / Komoditas','Jumlah atau nilai','Keterangan']);
      return;
    }

    // Pagination: tombol halaman dan panah dapat dipilih serta memperbarui indikator aktif.
    if (btn.closest('.pagination')) {
      var pager = btn.closest('.pagination');
      var pagerButtons = Array.from(pager.querySelectorAll('button'));
      var pageButtons = pagerButtons.filter(function(b){ return /^\\d+$/.test(text(b)); });
      if (pageButtons.length) {
        var current = pageButtons.findIndex(function(b){ return b.classList.contains('current') || b.classList.contains('active'); });
        if (current < 0) current = 0;
        var label = text(btn);
        var next = label === '‹' ? Math.max(0,current-1) :
                   label === '›' ? Math.min(pageButtons.length-1,current+1) :
                   pageButtons.indexOf(btn);
        if (next >= 0) {
          pageButtons.forEach(function(b,i){ b.classList.toggle('current',i===next); b.classList.toggle('active',i===next); });
          var summary = pager.querySelector('span');
          if (summary) summary.textContent = 'Halaman ' + text(pageButtons[next]) + ' dipilih';
          notify('Halaman ' + text(pageButtons[next]) + ' ditampilkan.');
        }
      }
      return;
    }

    var actionLabel = text(btn).toLowerCase();
    if (actionLabel.includes('unduh ringkasan')) { downloadTable('ringkasan-tanihubungan.csv','Ringkasan'); return; }
    if (actionLabel.includes('ekspor laporan')) { downloadTable('laporan-tanihubungan.csv','Ekspor laporan'); return; }
    if (actionLabel.includes('unduh riwayat')) { downloadTable('riwayat-verifikasi.csv','Riwayat verifikasi'); return; }
    if (actionLabel.includes('atur prioritas')) {
      openDialog('Atur prioritas penawaran','Pilih tingkat prioritas untuk antrean penawaran.', ['Nama penawaran','Prioritas (Tinggi / Sedang / Rendah)','Catatan']);
      return;
    }
    if (actionLabel.includes('tambah sumber')) {
      openDialog('Tambah sumber harga','Masukkan sumber data harga baru.', ['Nama sumber','URL / alamat sumber','Wilayah','Keterangan']);
      return;
    }
    if (actionLabel.includes('hubungi dukungan') || actionLabel.includes('bantuan')) {
      openDialog('Pusat Bantuan TaniHubungan','Jelaskan kendala atau pertanyaan kamu. Tim dukungan dapat dihubungi melalui email dukungan TaniHubungan.', ['Nama','Email','Pesan bantuan']);
      return;
    }

    // Akses akun dari halaman publik
    if (btn.closest('.nav-actions')) {
      var navLabel = text(btn).toLowerCase();
      if (navLabel.indexOf('masuk') >= 0) { window.location.href = 'login.php'; return; }
      if (navLabel.indexOf('daftar') >= 0) { window.location.href = 'register.php'; return; }
    }

    // Pratinjau peran (bilah atas, bila digunakan pada versi lama)
    if (btn.closest('.role-switcher')) { go(text(btn)); return; }

    // Keluar
    if (btn.matches('.exit')) {
      fetch('api/auth.php?action=logout',{method:'POST',credentials:'same-origin'})
        .then(function(response){if(!response.ok)throw new Error('Sesi tidak dapat ditutup di server.');})
        .catch(function(error){console.error('Logout gagal:',error);window.alert('Sesi server tidak dapat ditutup. Hubungi administrator jika masalah berlanjut.');})
        .finally(function(){localStorage.removeItem('tanihubungan-session');go('Publik');});
      return;
    }
    if (btn.matches('.back-public')) { go('Publik'); return; }

    // Halaman publik (landing)
    if (role === 'Publik') {
      if (btn.closest('.nav-actions') || btn.closest('.closing')) { go('Petani'); return; }
      if (btn.closest('.hero-actions')) {
        go(btn.classList.contains('secondary') ? 'Pembeli' : 'Petani');
      }
      return;
    }

    // Menu samping (Admin & Petugas)
    if (btn.closest('.sidebar nav')) { go(role, text(btn.querySelector('span'))); return; }

    // Pintasan di halaman Admin (gabungan Admin + Petugas)
    if (role === 'Admin') {
      var file = window.location.pathname.split('/').pop();
      var panel = btn.closest('.panel');
      var ptitle = panel && panel.querySelector('.panel-title h3');
      ptitle = ptitle ? text(ptitle) : '';
      if (btn.closest('.fraud-row')) { go(role, 'Laporan Masalah'); return; }
      if (btn.classList.contains('link-btn')) {
        if (ptitle === 'Antrean terbaru') { go(role, 'Penawaran'); return; }
        if (ptitle === 'Akun menunggu verifikasi') { go(role, 'Verifikasi Mitra'); return; }
      }
      if (btn.closest('.merge-head') && /Mulai verifikasi/.test(text(btn))) { go(role, 'Verifikasi Mitra'); return; }
      if (btn.classList.contains('table-action') && /^Periksa/.test(text(btn)) &&
          (file === 'admin-dashboard.php' || file === 'admin-penawaran.php')) { go(role, 'Verifikasi Mitra'); return; }
      return;
    }

    // Menu atas (Petani & Pembeli)
    var userNavLinks = document.querySelector('.user-nav > div:nth-child(2)');
    if (userNavLinks && userNavLinks.contains(btn)) { go(role, text(btn)); return; }

    // Kategori di dashboard Pembeli membuka hasil panen yang sesuai.
    if (role === 'Pembeli' && btn.closest('.category-row')) {
      var categoryButton = btn.closest('.category-row button');
      var categoryLabel = categoryButton && categoryButton.querySelector('b');
      var categoryName = categoryButton ? text(categoryButton).replace(categoryLabel ? text(categoryLabel) : '', '').replace(/[›]/g, '').trim() : '';
      if (categoryName) {
        window.location.href = fileOf(role, 'Cari Hasil Panen') + '?kategori=' + encodeURIComponent(categoryName);
      }
      return;
    }

    // Wizard penawaran
    if (btn.closest('.form-actions')) { wizardAction(btn); return; }

    // Pintasan di dashboard Petani / Pembeli
    if (document.querySelector('.user-nav')) {
      if (btn.closest('.welcome') && btn.classList.contains('primary') && role === 'Petani') { go(role, 'Buat Penawaran'); return; }
      if (btn.closest('.buyer-hero') && btn.closest('label')) { go(role, 'Cari Hasil Panen'); return; }
      if (btn.classList.contains('link-btn') && btn.closest('.heading-row.compact')) {
        go(role, role === 'Pembeli' ? 'Cari Hasil Panen' : 'Informasi Harga');
      }
    }
  });

  /* ----- Wizard "Buat Penawaran" ----- */
  var step = 1;
  var wizardPhotoUrl = '';
  var wizardPhotoFile = null;
  var wizardCsrfToken = '';
  var wizardProduct = { product_name: '', category_id: '', quantity: '', unit: 'kg', harvest_date: '', price: '' };
  var buyerAddressToken = '';
  var farmerCommodityLoading = false;
  function buyerAddressStepMarkup() {
    return '<div class="form-page"><div class="form-intro"><span>PENAWARAN PEMBELIAN</span><h1>Ajukan Penawaran Pembelian</h1><p>Ajukan jumlah dan harga yang wajar kepada petani.</p></div>' +
      '<div class="stepper"><div class="done"><span>✓</span><b>Komoditas</b></div><div class="done"><span>✓</span><b>Jumlah &amp; satuan</b></div><div class="done"><span>✓</span><b>Waktu &amp; harga</b></div><div class="active"><span>4</span><b>Alamat pembeli</b></div></div>' +
      '<section class="form-card"><div class="form-card-head"><span>Langkah 4 dari 4</span><h2>Alamat pembeli</h2><p>Masukkan alamat pembeli untuk melengkapi penawaran. Alamat disimpan ke profil akun Anda.</p></div>' +
      '<div class="fields buyer-address-fields"><label for="buyer-address">Alamat lengkap pembeli<textarea id="buyer-address" name="address" rows="4" maxlength="1000" required placeholder="Jalan, nomor rumah, desa/kelurahan, kecamatan, kabupaten/kota, provinsi, dan kode pos"></textarea></label><button class="btn secondary buyer-address-refresh" type="button">Muat ulang alamat</button><p class="hint buyer-address-status" role="status" aria-live="polite">Memuat alamat dari database...</p></div>' +
      '<div class="form-actions"><button class="btn secondary">Kembali</button><span>Alamat tersimpan di profil Pembeli</span><button class="btn primary buyer-address-save" disabled>Simpan alamat</button></div></section></div>';
  }
  function initBuyerAddressStep() {
    var addressField = document.getElementById('buyer-address');
    var saveButton = document.querySelector('.buyer-address-save');
    var refreshButton = document.querySelector('.buyer-address-refresh');
    var status = document.querySelector('.buyer-address-status');
    if (!addressField || !saveButton || !status) return;

    function loadAddress() {
      if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = 'Memuat...';
      }
      if (!addressField.value.trim()) saveButton.disabled = true;
      status.classList.remove('buyer-address-error');
      status.textContent = 'Memuat alamat dari database...';
      fetch('api/buyer-address.php', { credentials: 'same-origin', cache: 'no-store' })
      .then(async function (response) {
        var result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Alamat pembeli tidak dapat dimuat.');
        return result;
      })
      .then(function (result) {
        buyerAddressToken = result.csrfToken;
        addressField.value = result.address || '';
        saveButton.disabled = false;
        status.textContent = result.address
          ? 'Alamat profil berhasil dimuat. Anda dapat memperbaruinya di sini.'
          : 'Belum ada alamat tersimpan. Isi alamat pembeli untuk melanjutkan.';
      })
      .catch(function (error) {
        status.textContent = error.message || 'Alamat pembeli tidak dapat dimuat.';
        status.classList.add('buyer-address-error');
      })
      .finally(function () {
        if (refreshButton) {
          refreshButton.disabled = false;
          refreshButton.textContent = 'Muat ulang alamat';
        }
      });
    }

    if (refreshButton) refreshButton.addEventListener('click', loadAddress);
    loadAddress();
  }
  function saveBuyerAddress(button) {
    var addressField = document.getElementById('buyer-address');
    var status = document.querySelector('.buyer-address-status');
    if (!addressField || !status || !addressField.reportValidity()) return;

    button.disabled = true;
    button.textContent = 'Menyimpan...';
    fetch('api/buyer-address.php', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': buyerAddressToken },
      body: JSON.stringify({ address: addressField.value.trim() })
    })
      .then(async function (response) {
        var result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Alamat pembeli gagal disimpan.');
        return result;
      })
      .then(function (result) {
        addressField.value = result.address || addressField.value.trim();
        status.textContent = result.message;
        status.classList.remove('buyer-address-error');
      })
      .catch(function (error) {
        status.textContent = error.message || 'Alamat pembeli gagal disimpan.';
        status.classList.add('buyer-address-error');
      })
      .finally(function () {
        button.disabled = false;
        button.textContent = 'Simpan alamat';
      });
  }
  function loadFarmerCommodities() {
    var grid = document.querySelector('.commodity-grid');
    if (role !== 'Petani' || step !== 1 || !grid || farmerCommodityLoading) return;

    farmerCommodityLoading = true;
    var primaryButton = document.querySelector('.form-actions .primary');
    if (primaryButton) primaryButton.disabled = true;
    var status = document.querySelector('.farmer-commodity-status');
    if (!status) {
      status = document.createElement('p');
      status.className = 'farmer-commodity-status';
      status.setAttribute('role', 'status');
      grid.insertAdjacentElement('afterend', status);
    }
    status.textContent = grid.dataset.commoditySignature
      ? 'Memeriksa pembaruan komoditas Admin...'
      : 'Memuat komoditas dari data Admin...';
    if (!grid.dataset.commoditySignature) grid.replaceChildren();

    fetch('api/offers.php', { credentials: 'same-origin', cache: 'no-store' })
      .then(async function (response) {
        var result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Daftar komoditas tidak dapat dimuat.');
        return result;
      })
      .then(function (result) {
        if (!grid.isConnected) return;
        var commodities = Array.isArray(result.commodities) ? result.commodities : [];
        var signature = JSON.stringify(commodities);
        if (signature !== grid.dataset.commoditySignature || grid.children.length !== commodities.length) {
          grid.replaceChildren();
          commodities.forEach(function (commodity) {
            var template = document.createElement('button');
            template.type = 'button';
            template.className = 'commodity-option';
            template.dataset.categoryId = String(commodity.id);
            var icon = document.createElement('span');
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = '🌱';
            var name = document.createElement('b');
            name.textContent = commodity.name;
            template.append(icon, name);
            if (String(commodity.id) === String(wizardProduct.category_id)) {
              template.classList.add('selected');
              wizardProduct.product_name = String(commodity.name);
            }
            grid.appendChild(template);
          });
          grid.dataset.commoditySignature = signature;
        }
        status.textContent = commodities.length
          ? 'Pilihan mengikuti kategori komoditas yang dikelola Admin.'
          : 'Belum ada komoditas. Minta Admin menambahkan komoditas terlebih dahulu.';
        if (primaryButton) {
          primaryButton.disabled = !grid.querySelector('.commodity-option.selected');
        }
        if (!grid.querySelector('.commodity-option.selected')) {
          wizardProduct.category_id = '';
          wizardProduct.product_name = '';
        }
      })
      .catch(function (error) {
        console.error('Pilihan komoditas gagal dimuat.', error);
        if (status.isConnected) status.textContent = error.message || 'Daftar komoditas tidak dapat dimuat.';
      })
      .finally(function () {
        farmerCommodityLoading = false;
      });
  }
  function captureWizardStep() {
    if (role !== 'Petani') return;
    if (step === 1) {
      var selectedButton = document.querySelector('.commodity-grid button.selected');
      var selected = selectedButton && selectedButton.querySelector('b');
      if (selected) {
        wizardProduct.product_name = selected.textContent.trim();
        wizardProduct.category_id = selectedButton.dataset.categoryId || '';
      }
    } else if (step === 2) {
      var quantity = document.querySelector('.form-page .fields input');
      var unit = document.querySelector('.form-page .fields select');
      if (quantity) wizardProduct.quantity = quantity.value.trim();
      if (unit) {
        var units = { 'Kilogram (kg)': 'kg', 'Ton': 'ton', 'Ikat': 'ikat' };
        wizardProduct.unit = units[unit.value] || unit.value;
      }
    } else if (step === 3) {
      var fields = document.querySelectorAll('.form-page .fields input');
      if (fields[0]) wizardProduct.harvest_date = fields[0].value;
      if (fields[1]) wizardProduct.price = fields[1].value.trim();
    }
  }
  function farmerReviewMarkup() {
    return '<div class="form-page"><div class="form-intro"><span>LANGKAH MUDAH</span><h1>Buat Penawaran Hasil Panen</h1><p>Tinjau dan simpan penawaran hasil panen Anda.</p></div>' +
      '<div class="stepper"><div class="done"><span>✓</span><b>Komoditas</b></div><div class="done"><span>✓</span><b>Jumlah &amp; satuan</b></div><div class="done"><span>✓</span><b>Waktu &amp; harga</b></div><div class="active"><span>4</span><b>Foto &amp; tinjau</b></div></div>' +
      '<section class="form-card"><div class="form-card-head"><span>Langkah 4 dari 4</span><h2>Tinjau draf privat</h2><p>Penawaran disimpan privat dan tidak terlihat oleh Admin atau Pembeli sampai Anda memilih Terbitkan.</p></div>' +
      '<div class="upload"><div><strong>Unggah foto hasil panen</strong><span>PNG atau JPG, maksimal 5 MB</span><button class="btn secondary">Pilih foto</button></div>' +
      '<aside class="farmer-offer-preview"><img alt="Pratinjau foto hasil panen" hidden><b></b><span></span><strong></strong><small></small></aside></div>' +
      '<p class="farmer-offer-status" role="status" aria-live="polite"></p><div class="form-actions"><button class="btn secondary">Kembali</button><span>Draf hanya terlihat oleh Anda</span><button class="btn primary farmer-offer-save" disabled>Simpan draf privat</button></div></section></div>';
  }
  function initFarmerReview() {
    var review = document.querySelector('.farmer-offer-preview');
    var status = document.querySelector('.farmer-offer-status');
    var saveButton = document.querySelector('.farmer-offer-save');
    if (!review || !status || !saveButton) return;

    review.querySelector('b').textContent = wizardProduct.product_name;
    review.querySelector('span').textContent = wizardProduct.quantity + ' ' + wizardProduct.unit;
    review.querySelector('strong').textContent = 'Rp' + Number(wizardProduct.price).toLocaleString('id-ID');
    review.querySelector('small').textContent = 'Panen ' + new Date(wizardProduct.harvest_date + 'T00:00:00').toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    if (wizardPhotoUrl) {
      var preview = review.querySelector('img');
      preview.src = wizardPhotoUrl;
      preview.hidden = false;
    }

    fetch('api/offers.php', { credentials: 'same-origin' })
      .then(async function (response) {
        var result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Token penyimpanan penawaran tidak dapat dimuat.');
        return result;
      })
      .then(function (result) {
        wizardCsrfToken = result.csrfToken;
        saveButton.disabled = false;
      })
      .catch(function (error) {
        status.textContent = error.message || 'Penawaran belum dapat disimpan.';
        status.classList.add('error');
      });
  }
  function saveFarmerOffer(button) {
    var status = document.querySelector('.farmer-offer-status');
    if (!status || !wizardCsrfToken) return;
    button.disabled = true;
    button.textContent = 'Menyimpan...';
    status.textContent = 'Menyimpan penawaran ke database...';
    var data = new FormData();
    Object.keys(wizardProduct).forEach(function (key) { data.append(key, wizardProduct[key]); });
    if (wizardPhotoFile) data.append('photo', wizardPhotoFile);
    fetch('api/offers.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': wizardCsrfToken },
      body: data
    })
      .then(async function (response) {
        var result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Penawaran gagal disimpan.');
        return result;
      })
      .then(function () {
        window.location.href = 'petani-penawaran-saya.php?saved=1';
      })
      .catch(function (error) {
        status.textContent = error.message || 'Penawaran gagal disimpan.';
        status.classList.add('error');
        button.disabled = false;
        button.textContent = 'Simpan draf privat';
      });
  }
  function initWizardPhotoUpload() {
    var upload = document.querySelector('.form-page .upload');
    if (!upload || upload.dataset.photoPickerReady) return;
    var pickerButton = upload.querySelector('button');
    var preview = upload.querySelector('aside img');
    if (!pickerButton || !preview) return;

    upload.dataset.photoPickerReady = 'true';
    pickerButton.type = 'button';
    pickerButton.classList.add('photo-picker-trigger');
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,.png,.jpg,.jpeg';
    input.hidden = true;
    input.setAttribute('aria-label', 'Pilih foto hasil panen, PNG atau JPG, maksimal 5 MB');
    pickerButton.insertAdjacentElement('afterend', input);

    var feedback = document.createElement('small');
    feedback.className = 'photo-picker-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    input.insertAdjacentElement('afterend', feedback);
    pickerButton.setAttribute('aria-label', 'Pilih foto hasil panen');
    if (wizardPhotoUrl) {
      preview.src = wizardPhotoUrl;
      pickerButton.textContent = 'Ganti foto';
      feedback.textContent = 'Foto berhasil dipilih.';
    }

    pickerButton.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;

      var validType = ['image/png', 'image/jpeg'].indexOf(file.type) >= 0;
      var validExtension = /\.(png|jpe?g)$/i.test(file.name);
      if (!validType || !validExtension) {
        feedback.textContent = 'Pilih file gambar PNG atau JPG.';
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        feedback.textContent = 'Ukuran foto maksimal 5 MB.';
        input.value = '';
        return;
      }

      if (wizardPhotoUrl) URL.revokeObjectURL(wizardPhotoUrl);
      wizardPhotoFile = file;
      wizardPhotoUrl = URL.createObjectURL(file);
      preview.src = wizardPhotoUrl;
      preview.hidden = false;
      preview.alt = 'Pratinjau foto ' + file.name;
      pickerButton.textContent = 'Ganti foto';
      feedback.textContent = 'Foto dipilih: ' + file.name;
    });
  }
  function renderStep() {
    var holder = document.querySelector('.form-page');
    if (!holder || !window.WIZARD || !window.WIZARD[role]) return;
    holder.outerHTML = role === 'Pembeli' && step === 4
      ? buyerAddressStepMarkup()
      : role === 'Petani' && step === 4
        ? farmerReviewMarkup()
      : window.WIZARD[role][step - 1];
    if (role === 'Petani' && step === 1) loadFarmerCommodities();
    if (role === 'Petani' && step === 2) {
      var quantity = document.querySelector('.form-page .fields input');
      if (quantity) quantity.value = wizardProduct.quantity;
    } else if (role === 'Petani' && step === 3) {
      var fields = document.querySelectorAll('.form-page .fields input');
      if (fields[0]) fields[0].value = wizardProduct.harvest_date;
      if (fields[1]) fields[1].value = wizardProduct.price;
    } else if (role === 'Petani' && step === 1 && wizardProduct.product_name) {
      document.querySelectorAll('.commodity-grid button').forEach(function (button) {
        button.classList.toggle('selected', button.querySelector('b').textContent.trim() === wizardProduct.product_name);
      });
    }
    initWizardPhotoUpload();
    if (role === 'Pembeli' && step === 4) initBuyerAddressStep();
    if (role === 'Petani' && step === 4) initFarmerReview();
  }
  function wizardAction(btn) {
    if (!document.querySelector('.form-page')) return;
    var isPrimary = btn.classList.contains('primary');
    if (isPrimary && role === 'Petani' && step === 4) {
      saveFarmerOffer(btn);
      return;
    }
    if (role === 'Petani') {
      captureWizardStep();
      if (isPrimary && step === 1 && !wizardProduct.product_name) {
        window.alert('Pilih salah satu komoditas yang dikelola Admin terlebih dahulu.');
        return;
      }
      if (isPrimary && step === 2 && (!wizardProduct.quantity || Number(wizardProduct.quantity) <= 0)) {
        window.alert('Masukkan jumlah hasil panen yang lebih besar dari 0.');
        return;
      }
      if (isPrimary && step === 3 && (!wizardProduct.harvest_date || Number(wizardProduct.price) <= 0)) {
        window.alert('Isi tanggal panen dan harga yang valid.');
        return;
      }
    }
    if (isPrimary && role === 'Pembeli' && step === 4) {
      saveBuyerAddress(btn);
      return;
    }
    if (isPrimary) { step = step < 4 ? step + 1 : 1; }
    else { step = Math.max(1, step - 1); }
    renderStep();
  }
  if (role === 'Petani' && window.location.pathname.endsWith('petani-buat-penawaran.php')) {
    loadFarmerCommodities();
    window.addEventListener('focus', loadFarmerCommodities);
    window.setInterval(loadFarmerCommodities, 30000);
  }
})();


/* ===== TaniHubungan: interaksi tambahan tanpa mengubah susunan elemen asli ===== */
(function () {
  'use strict';
  var role = document.body.getAttribute('data-role') || 'Publik';
  var routeMap = {
    'dashboard':'Dashboard','informasi harga':'Informasi Harga','buat penawaran':'Buat Penawaran',
    'penawaran saya':'Penawaran Saya','calon pembeli':'Calon Pembeli','cari hasil panen':'Cari Hasil Panen',
    'negosiasi':'Negosiasi','kesepakatan':'Kesepakatan','penawaran':'Penawaran',
    'verifikasi mitra':'Verifikasi Mitra','data harga':'Data Harga','laporan masalah':'Laporan Masalah',
    'riwayat verifikasi':'Riwayat Verifikasi','kelola akun':'Kelola Akun',
    'kategori komoditas':'Kategori Komoditas','aktivitas pembeli':'Aktivitas Pembeli',
    'laporan perdagangan':'Laporan Perdagangan','status penjualan':'Status Penjualan'
  };
  function clean(s){return (s||'').replace(/\s+/g,' ').replace(/[⌄›‹→←]/g,'').trim().toLowerCase();}
  function notify(message){
    var old=document.querySelector('.th-toast'); if(old) old.remove();
    var el=document.createElement('div'); el.className='th-toast'; el.setAttribute('role','status');
    el.textContent=message; document.body.appendChild(el);
    requestAnimationFrame(function(){el.classList.add('show');});
    setTimeout(function(){el.classList.remove('show');setTimeout(function(){el.remove();},250);},2600);
  }
  function initials(name){
    return name.split(/\s+/).filter(Boolean).slice(0,2).map(function(part){return part.charAt(0).toUpperCase();}).join('');
  }
  function initBuyerSearch(){
    if(role!=='Pembeli')return;
    document.querySelectorAll('.user-nav-actions .icon-btn').forEach(function(button){button.remove();});
    var layout=document.querySelector('.search-layout');
    if(!layout)return;
    var labels=layout.querySelectorAll('.filter-side label');
    Array.from(labels).forEach(function(label){
      var labelText=clean(label.textContent);
      if(labelText.indexOf('jumlah tersedia')>=0||labelText.indexOf('waktu panen')>=0)label.remove();
    });
    var filters=layout.querySelector('.filter-side');
    var selects=filters.querySelectorAll('select');
    var commodity=selects[0], locationFilter=selects[1];
    function setOptions(select,options){
      select.replaceChildren();
      options.forEach(function(value,index){
        var option=document.createElement('option');option.value=index?value:'';
        option.textContent=value;select.appendChild(option);
      });
    }
    setOptions(commodity,['Semua komoditas','Beras & Padi','Sayuran','Buah','Rempah','Biji-bijian']);
    setOptions(locationFilter,['Semua wilayah','Aceh Barat','Aceh Barat Daya','Aceh Besar','Aceh Jaya','Aceh Selatan','Aceh Singkil','Aceh Tamiang','Aceh Tengah','Aceh Tenggara','Aceh Timur','Aceh Utara','Bener Meriah','Bireuen','Gayo Lues','Nagan Raya','Pidie','Pidie Jaya','Simeulue','Kota Banda Aceh','Kota Langsa','Kota Lhokseumawe','Kota Sabang','Kota Subulussalam']);
    var searchLabel=document.createElement('label');
    searchLabel.textContent='Cari hasil panen';
    var search=document.createElement('input');search.type='search';search.placeholder='Cari buah atau lokasi...';search.maxLength=60;
    searchLabel.appendChild(search);filters.insertBefore(searchLabel,filters.querySelector('label'));
    function cards(){return Array.from(layout.querySelectorAll('.offer-card'));}
    var resultHead=layout.querySelector('.result-head');
    var count=resultHead.querySelector('b');
    var latest=resultHead.querySelector('select');
    setOptions(latest,['Terbaru','1 hari lalu','1 minggu lalu','1 bulan lalu']);
    var requestedCategory=new URLSearchParams(window.location.search).get('kategori');
    if(requestedCategory&&Array.from(commodity.options).some(function(option){return clean(option.value)===clean(requestedCategory);})){
      commodity.value=requestedCategory;
    }
    var saveSearch=document.querySelector('.welcome > .btn.secondary');
    var savedSearchKey='tanihubungan-saved-search';
    var savedSearch=null;
    if(saveSearch){
      saveSearch.classList.add('saved-search-btn');
      try{
        savedSearch=JSON.parse(localStorage.getItem(savedSearchKey)||'null');
      }catch(error){
        console.error('Pencarian tersimpan tidak dapat dibaca.',error);
      }
    }
    function searchState(){
      return {query:search.value.trim(),commodity:commodity.value,region:locationFilter.value,period:latest.value};
    }
    function isCurrentSearchSaved(){
      return !!savedSearch&&JSON.stringify(savedSearch)===JSON.stringify(searchState());
    }
    function updateSaveSearchButton(){
      if(!saveSearch)return;
      var isSaved=isCurrentSearchSaved();
      saveSearch.classList.toggle('is-saved',isSaved);
      saveSearch.setAttribute('aria-pressed',String(isSaved));
      saveSearch.innerHTML=isSaved
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg> Pencarian tersimpan'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"></path><path d="M10 21h4"></path></svg> Simpan pencarian';
    }
    if(saveSearch)saveSearch.addEventListener('click',function(){
      var nextSearch=searchState();
      try{
        if(isCurrentSearchSaved()){
          localStorage.removeItem(savedSearchKey);
          savedSearch=null;
          notify('Pencarian dihapus dari daftar tersimpan.');
        }else{
          localStorage.setItem(savedSearchKey,JSON.stringify(nextSearch));
          savedSearch=nextSearch;
          notify('Pencarian berhasil disimpan.');
        }
      }catch(error){
        console.error('Pencarian tidak dapat disimpan.',error);
        notify('Pencarian tidak dapat disimpan. Periksa penyimpanan browser Anda.');
      }
      updateSaveSearchButton();
    });
    var searchTimer;
    function applyFilters(showNotice){
      var query=clean(search.value),category=clean(commodity.value),region=clean(locationFilter.value),period=clean(latest.value);
      var maxAge=period==='1 hari lalu'?1:period==='1 minggu lalu'?7:period==='1 bulan lalu'?30:Infinity;
      var currentCards=cards();
      currentCards.sort(function(a,b){return Number(a.dataset.ageDays||0)-Number(b.dataset.ageDays||0);}).forEach(function(card){
        var product=card.querySelector('.offer-body');
        var age=Number(card.dataset.ageDays||0);
        var productName=clean(product.querySelector('h3').textContent);
        var productCategory=clean(product.querySelector('div > span').textContent);
        var matchesCategory=!category||
          (category==='beras & padi'?productName.indexOf('beras')>=0:
          category==='rempah'?productCategory==='rempah'||productName.indexOf('rempah')>=0:
          productCategory===category);
        var visible=clean(product.textContent).indexOf(query)>=0&&
          matchesCategory&&
          (!region||clean(product.querySelector('p').textContent).indexOf(region)>=0)&&age<=maxAge;
        card.hidden=!visible;
      });
      var visibleCount=currentCards.filter(function(card){return !card.hidden;}).length;
      count.textContent=visibleCount+' hasil ditemukan';
      updateSaveSearchButton();
      if(showNotice)notify('✨ '+visibleCount+' hasil panen cocok dengan pencarian Anda.');
    }
    commodity.addEventListener('change',function(){applyFilters(true);});
    locationFilter.addEventListener('change',function(){applyFilters(true);});
    latest.addEventListener('change',function(){applyFilters(true);});
    search.addEventListener('input',function(){
      clearTimeout(searchTimer);
      searchTimer=setTimeout(function(){applyFilters(!!search.value.trim());},350);
    });
    var reset=filters.querySelector('div button');
    if(reset)reset.addEventListener('click',function(){
      search.value='';commodity.selectedIndex=0;locationFilter.selectedIndex=0;latest.selectedIndex=0;applyFilters(false);
    });
    window.addEventListener('tanihubungan:offers-loaded',function(){applyFilters(false);});
    applyFilters(false);
  }
  function initAdminProfile(){
    if(role!=='Admin')return;
    var profile=document.querySelector('.app-header .profile');
    if(!profile)return;
    var session=null;
    try{session=JSON.parse(localStorage.getItem('tanihubungan-session')||'null');}
    catch(error){console.error('Sesi pengguna tidak dapat dibaca.',error);}
    var name=session&&session.name?String(session.name).trim():'';
    if(!name)name=profile.querySelector('div b')?.textContent.trim()||'Admin';
    var email=session&&session.email?String(session.email):'';
    var userRole=session&&session.role?String(session.role):'Admin';
    var avatar=profile.querySelector('span'),nameNode=profile.querySelector('div b'),roleNode=profile.querySelector('div small');
    if(avatar)avatar.textContent=initials(name);
    if(nameNode)nameNode.textContent=name;
    if(roleNode)roleNode.textContent=userRole;
    profile.addEventListener('click',function(event){
      event.stopPropagation();openProfileDialog(name,email,userRole);
    });
  }
  function initBuyerProfile(){
    if(role!=='Pembeli')return;
    var avatar=document.querySelector('.user-nav-actions .avatar');
    if(!avatar)return;
    var session=null;
    try{session=JSON.parse(localStorage.getItem('tanihubungan-session')||'null');}
    catch(error){console.error('Sesi pengguna tidak dapat dibaca.',error);}
    var name=session&&session.name?String(session.name).trim():'Pengguna';
    var email=session&&session.email?String(session.email):'';
    var userRole=session&&session.role?String(session.role):role;
    if(session&&session.name)avatar.textContent=initials(name);
    avatar.setAttribute('aria-haspopup','dialog');
    avatar.setAttribute('aria-label','Buka profil pengguna');
    avatar.addEventListener('click',function(event){
      event.stopPropagation();openProfileDialog(name,email,userRole);
    });
  }
  function openProfileDialog(name,email,userRole){
    var existing=document.querySelector('.th-modal-backdrop');if(existing)existing.remove();
    var backdrop=document.createElement('div');backdrop.className='th-modal-backdrop';
    var dialog=document.createElement('section');dialog.className='th-modal th-profile-modal';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    var closeButton=document.createElement('button');closeButton.type='button';closeButton.className='th-modal-close';closeButton.setAttribute('aria-label','Tutup');closeButton.textContent='×';
    var kicker=document.createElement('span');kicker.className='th-modal-kicker';kicker.textContent='AKUN PENGGUNA';
    var heading=document.createElement('h2');heading.textContent='Profil pengguna';
    var description=document.createElement('p');description.textContent='Informasi akun yang sedang masuk.';
    var details=document.createElement('div');details.className='profile-details';
    [[ 'Nama pengguna',name ],[ 'Email',email||'Belum tersedia' ],[ 'Peran',userRole ]].forEach(function(item){
      var detail=document.createElement('div');var label=document.createElement('small');label.textContent=item[0];
      var value=document.createElement('b');value.textContent=item[1];detail.append(label,value);details.appendChild(detail);
    });
    var actions=document.createElement('div');actions.className='th-modal-actions';
    var done=document.createElement('button');done.type='button';done.className='btn primary th-cancel';done.textContent='Tutup';actions.appendChild(done);
    dialog.append(closeButton,kicker,heading,description,details,actions);backdrop.appendChild(dialog);document.body.appendChild(backdrop);
    function close(){backdrop.classList.remove('visible');setTimeout(function(){backdrop.remove();},180);}
    backdrop.addEventListener('click',function(event){if(event.target===backdrop)close();});
    closeButton.addEventListener('click',close);done.addEventListener('click',close);
    requestAnimationFrame(function(){backdrop.classList.add('visible');done.focus();});
  }
  function initReportManagement(){
    if(role!=='Admin'||location.pathname.split('/').pop()!=='admin-laporan-perdagangan.php')return;
    if(document.querySelector('script[src="js/admin-crud.js"]'))return;
    var table=document.querySelector('.table-wrap table'),body=table&&table.querySelector('tbody');
    var panelTitle=document.querySelector('.panel-title');
    if(!table||!body||!panelTitle)return;
    panelTitle.classList.add('report-panel-title');
    var storageKey='tanihubungan-laporan-perdagangan';
    function updateRow(row,values){
      values.slice(0,6).forEach(function(value,index){
        var cell=row.cells[index];if(!cell)return;
        if(index===0){cell.textContent='';var bold=document.createElement('b');bold.textContent=value;cell.appendChild(bold);}
        else if(index===5){
          cell.textContent='';var badge=document.createElement('span');badge.className='badge '+(clean(value)==='disetujui'?'green':clean(value)==='perlu revisi'?'yellow':'gray');badge.textContent=value;cell.appendChild(badge);
        }else cell.textContent=value;
      });
      row.dataset.reportValues=JSON.stringify(values.slice(0,6));
    }
    function ensureActions(row){
      var cell=row.cells[6];if(!cell)return;
      if(!cell.querySelector('.report-edit')){
        var edit=document.createElement('button');edit.type='button';edit.className='report-edit';edit.textContent='Edit';cell.appendChild(edit);
      }
    }
    function currentValues(row){
      if(row.dataset.reportValues)return JSON.parse(row.dataset.reportValues);
      return Array.from(row.cells).slice(0,6).map(function(cell){return cell.textContent.replace(/\s+/g,' ').trim();});
    }
    function persist(){
      try{
        var records=Array.from(body.rows).map(function(row){return{id:row.dataset.reportId,values:currentValues(row)};});
        localStorage.setItem(storageKey,JSON.stringify(records));
      }catch(error){console.error('Laporan gagal disimpan ke penyimpanan lokal.',error);notify('Laporan gagal disimpan. Periksa penyimpanan browser Anda.');return false;}
      return true;
    }
    function openReportForm(row){
      var editing=!!row,values=editing?currentValues(row):['','','','','','Menunggu'];
      var existing=document.querySelector('.th-modal-backdrop');if(existing)existing.remove();
      var backdrop=document.createElement('div');backdrop.className='th-modal-backdrop';
      var dialog=document.createElement('section');dialog.className='th-modal';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
      var form=document.createElement('form');
      var fields=['Komoditas','Nama petani','Wilayah','Jumlah','Tanggal panen','Status'];
      fields.forEach(function(label,index){
        var wrapper=document.createElement('label');wrapper.textContent=label;
        var input=document.createElement('input');input.name='report'+index;input.value=values[index]||'';input.required=index<2;
        input.placeholder='Masukkan '+label.toLowerCase();wrapper.appendChild(input);form.appendChild(wrapper);
      });
      var actions=document.createElement('div');actions.className='th-modal-actions';
      var cancel=document.createElement('button');cancel.type='button';cancel.className='btn secondary';cancel.textContent='Batal';
      var save=document.createElement('button');save.type='submit';save.className='btn primary';save.textContent=editing?'Simpan perubahan':'Tambah laporan';
      actions.append(cancel,save);form.appendChild(actions);
      var closeButton=document.createElement('button');closeButton.type='button';closeButton.className='th-modal-close';closeButton.setAttribute('aria-label','Tutup');closeButton.textContent='×';
      var kicker=document.createElement('span');kicker.className='th-modal-kicker';kicker.textContent='ADMIN / LAPORAN PERDAGANGAN';
      var heading=document.createElement('h2');heading.textContent=editing?'Edit laporan':'Tambah laporan';
      var description=document.createElement('p');description.textContent='Lengkapi informasi laporan perdagangan berikut.';
      dialog.append(closeButton,kicker,heading,description,form);backdrop.appendChild(dialog);document.body.appendChild(backdrop);
      function close(){backdrop.classList.remove('visible');setTimeout(function(){backdrop.remove();},180);}
      backdrop.addEventListener('click',function(event){if(event.target===backdrop)close();});
      closeButton.addEventListener('click',close);cancel.addEventListener('click',close);
      form.addEventListener('submit',function(event){
        event.preventDefault();
        var newValues=Array.from(form.querySelectorAll('input')).map(function(input){return input.value.trim();});
        if(!newValues[0]||!newValues[1])return;
        if(!row){
          row=document.createElement('tr');row.dataset.reportId='report-'+Date.now();
          for(var i=0;i<7;i++)row.appendChild(document.createElement('td'));
          body.appendChild(row);
        }
        updateRow(row,newValues);ensureActions(row);
        if(persist()){close();notify(editing?'Laporan berhasil diperbarui.':'Laporan baru berhasil ditambahkan.');}
      });
      requestAnimationFrame(function(){backdrop.classList.add('visible');form.querySelector('input').focus();});
    }
    Array.from(body.rows).forEach(function(row,index){row.dataset.reportId='report-sample-'+index;ensureActions(row);});
    try{
      var saved=JSON.parse(localStorage.getItem(storageKey)||'[]');
      if(!Array.isArray(saved))throw new Error('Format data laporan tidak valid.');
      saved.forEach(function(record){
        if(!record||typeof record.id!=='string'||!Array.isArray(record.values)||record.values.length<6)return;
        var row=Array.from(body.rows).find(function(candidate){return candidate.dataset.reportId===record.id;});
        if(!row){row=document.createElement('tr');row.dataset.reportId=record.id;for(var i=0;i<7;i++)row.appendChild(document.createElement('td'));body.appendChild(row);}
        updateRow(row,record.values);ensureActions(row);
      });
    }catch(error){console.error('Data laporan tersimpan tidak dapat dibaca.',error);notify('Data laporan tersimpan tidak dapat dibaca.');}
    var addButton=document.createElement('button');addButton.type='button';addButton.className='btn primary report-add';addButton.textContent='Tambah laporan';
    panelTitle.appendChild(addButton);
    document.addEventListener('click',function(event){
      var button=event.target.closest('.report-add,.report-edit');if(!button)return;
      event.preventDefault();event.stopImmediatePropagation();
      openReportForm(button.classList.contains('report-edit')?button.closest('tr'):null);
    },true);
  }
  initBuyerSearch();
  initAdminProfile();
  initBuyerProfile();
  initReportManagement();
  function go(roleName,page){
    var r=roleName==='Petugas'?'Admin':roleName;
    var p=routeMap[clean(page)] || page;
    if(r==='Publik'){location.href='index.php';return;}
    var file=r.toLowerCase()+'-'+p.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.php';
    if(r==='Admin' && clean(p)==='dashboard') file='admin-dashboard.php';
    if(r==='Petani' && clean(p)==='dashboard') file='petani-dashboard.php';
    if(r==='Pembeli' && clean(p)==='dashboard') file='pembeli-dashboard.php';
    location.href=file;
  }
  function openDialog(title, description, fields){
    var existing=document.querySelector('.th-modal-backdrop'); if(existing) existing.remove();
    var backdrop=document.createElement('div'); backdrop.className='th-modal-backdrop';
    var dialog=document.createElement('section'); dialog.className='th-modal'; dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true');
    var fieldHtml=(fields||['Nama','Keterangan']).map(function(label,i){
      return '<label>'+label+'<input name="field'+i+'" placeholder="Masukkan '+label.toLowerCase()+'" '+(i===0?'required':'')+'></label>';
    }).join('');
    dialog.innerHTML='<button class="th-modal-close" type="button" aria-label="Tutup">×</button><span class="th-modal-kicker">TANIHUBUNGAN</span><h2></h2><p></p><form>'+fieldHtml+'<div class="th-modal-actions"><button type="button" class="btn secondary th-cancel">Batal</button><button type="submit" class="btn primary">Simpan</button></div></form>';
    dialog.querySelector('h2').textContent=title; dialog.querySelector('p').textContent=description||'Lengkapi informasi berikut untuk melanjutkan.';
    backdrop.appendChild(dialog); document.body.appendChild(backdrop);
    function close(){backdrop.classList.remove('visible');setTimeout(function(){backdrop.remove();},180);}
    backdrop.addEventListener('click',function(e){if(e.target===backdrop)close();});
    dialog.querySelector('.th-modal-close').addEventListener('click',close);
    dialog.querySelector('.th-cancel').addEventListener('click',close);
    dialog.querySelector('form').addEventListener('submit',function(e){
      e.preventDefault(); var values=Array.from(dialog.querySelectorAll('input')).map(function(x){return x.value.trim();});
      if(!values[0]){dialog.querySelector('input').focus();return;}
      try{var key='tanihubungan-'+location.pathname.split('/').pop()+'-drafts';var arr=JSON.parse(localStorage.getItem(key)||'[]');arr.push({values:values,createdAt:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(arr));}catch(err){}
      close();notify('Data berhasil disimpan pada perangkat ini.');
    });
    requestAnimationFrame(function(){backdrop.classList.add('visible');dialog.querySelector('input')&&dialog.querySelector('input').focus();});
  }
  // Tautan yang sebelumnya hanya berupa teks atau belum memiliki tujuan.
  document.querySelectorAll('a').forEach(function(a){
    if(!a.getAttribute('href')){
      a.setAttribute('href','#');
      a.addEventListener('click',function(e){
        e.preventDefault();
        var t=clean(a.textContent);
        if(t.indexOf('pelajari selengkapnya')>=0){
          var card=a.closest('.feature-card'); var idx=card?Array.prototype.indexOf.call(card.parentElement.children,card):0;
          var targets=['#harga','#fitur','#keamanan']; var target=document.querySelector(targets[idx]||'#fitur');
          if(target) target.scrollIntoView({behavior:'smooth',block:'start'}); else notify('Informasi fitur tersedia pada bagian fitur utama.');
        } else if(t==='bantuan'||t==='tentang kami'||t==='kebijakan privasi'){
          openDialog(a.textContent.trim(),'Informasi ini dapat dihubungkan ke halaman resmi ketika kontennya tersedia.',['Nama','Pesan']);
        } else notify('Tautan '+a.textContent.trim()+' siap dihubungkan.');
      });
    }
  });

  document.addEventListener('click',function(e){
    var btn=e.target.closest('button'); if(!btn||btn.disabled)return;
    var label=clean(btn.textContent); var pageTitle=(document.querySelector('main h1')||document.querySelector('main h2')||{}).textContent||'';
    // Navigasi dan tombol peran sudah ditangani oleh navigasi asli.
    if(btn.matches('.saved-search-btn,.user-nav-actions .avatar,.photo-picker-trigger')||btn.closest('.category-row')||
       document.querySelector('script[src="js/admin-crud.js"]')&&btn===document.querySelector('.app-content > .welcome .btn')||
       btn.closest('.role-switcher')||btn.closest('.user-nav > div:nth-child(2)')||btn.closest('.sidebar nav')||
       btn.matches('.exit,.back-public')||btn.closest('.hero-actions')||btn.closest('.nav-actions')||btn.closest('.closing')||
       btn.closest('.form-actions')||btn.closest('.welcome')&&btn.classList.contains('primary')) return;
    // Tombol tambah / tombol plus membuka form yang sesuai halaman.
    if(!btn.closest('.th-modal')&&(/^(tambah| tambah)/.test(label)||label.indexOf('tambah data')>=0||label.indexOf('tambah sumber')>=0||label.indexOf('buat penawaran')>=0||
       btn.querySelector('svg path[d*="M12 5v14"]') && (btn.closest('.toolbar')||btn.closest('.heading-row')))){
      var title=label.indexOf('sumber')>=0?'Tambah Sumber Harga':label.indexOf('penawaran')>=0?'Buat Penawaran': 'Tambah Data';
      openDialog(title,'Masukkan data baru. Data contoh disimpan secara lokal di browser.', ['Nama / Komoditas','Jumlah atau nilai','Keterangan']); return;
    }
    // Tombol filter bergaya dropdown.
    if(/[⌄]/.test(btn.textContent)||btn.classList.contains('filter-btn')){
      var opts=label.indexOf('status')>=0?['Semua status','Aktif','Menunggu','Selesai','Ditolak']:
        label.indexOf('wilayah')>=0?['Semua wilayah','Aceh','Sumatera Utara','Jawa Barat','Jawa Tengah','Jawa Timur']:
        label.indexOf('komoditas')>=0?['Semua komoditas','Beras','Cabai Merah','Jagung','Bawang Merah','Tomat']:
        ['7 hari terakhir','30 hari terakhir','3 bulan terakhir','1 tahun terakhir'];
      var menu=document.createElement('div');menu.className='th-dropdown';
      opts.forEach(function(o){var item=document.createElement('button');item.type='button';item.textContent=o;item.addEventListener('click',function(){btn.textContent=o+'⌄';menu.remove();filterRows(o);});menu.appendChild(item);});
      var old=btn.parentElement.querySelector('.th-dropdown');if(old)old.remove();btn.parentElement.appendChild(menu);return;
    }
    if(btn.matches('.publish-offer,.buyer-address-refresh')) return;
    // Tombol pencarian tersimpan / pengingat.
    if(label.indexOf('simpan pencarian')>=0||label.indexOf('atur pengingat')>=0){
      notify(label.indexOf('pengingat')>=0?'Pengingat harga berhasil diaktifkan pada demo ini.':'Pencarian berhasil disimpan pada perangkat ini.');return;
    }
    if(label==='reset'){document.querySelectorAll('input').forEach(function(x){if(x.type!=='checkbox'&&x.type!=='range')x.value='';});filterRows('');notify('Filter telah direset.');return;}
    // Favorit.
    if(label==='♡'||label==='♥'){btn.classList.toggle('is-favorite');btn.textContent=btn.classList.contains('is-favorite')?'♥':'♡';notify(btn.classList.contains('is-favorite')?'Ditambahkan ke favorit.':'Dihapus dari favorit.');return;}
    // Ekspor laporan sederhana dari tabel yang tersedia.
    if(label.indexOf('ekspor')>=0||label.indexOf('unduh')>=0){
      var table=document.querySelector('main table'); if(!table){notify('Belum ada tabel untuk diekspor.');return;}
      var csv=Array.from(table.rows).map(function(row){return Array.from(row.cells).map(function(c){return '"'+c.innerText.replace(/"/g,'""').trim()+'"';}).join(',');}).join('\n');
      var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='tanihubungan-'+(location.pathname.split('/').pop()||'data').replace('.php','.csv');a.click();URL.revokeObjectURL(url);notify('File CSV berhasil disiapkan.');return;
    }
    // Aksi pada baris data membuka detail, bukan tombol mati.
    if(btn.classList.contains('table-action')||/^(lihat|periksa|selidiki|ubah|laporkan|minta revisi|setujui penawaran)$/.test(label)){
      var row=btn.closest('tr')||btn.closest('article')||btn.closest('.fraud-row');
      var detail=row?row.innerText.replace(/\s+/g,' ').trim():'Informasi detail belum tersedia.';
      openDialog('Detail '+(pageTitle||'Data'),detail,['Catatan / tindak lanjut']);return;
    }
    // Tombol navigasi pintas "Lihat semua".
    if(label.indexOf('lihat semua')>=0){
      if(role==='Petani')go(role,btn.closest('.panel')?'Penawaran Saya':'Informasi Harga');
      else if(role==='Pembeli')go(role,'Cari Hasil Panen');
      else if(role==='Admin')go(role,'Penawaran');
      else document.querySelector('#harga')?.scrollIntoView({behavior:'smooth'});
      return;
    }
    // Tab komoditas.
    if(btn.closest('.commodity-grid')){
      btn.parentElement.querySelectorAll('button').forEach(function(b){b.classList.remove('selected');});
      btn.classList.add('selected');
      if(role==='Petani'){
        var commodityName=btn.querySelector('b');
        wizardProduct.category_id=btn.dataset.categoryId||'';
        wizardProduct.product_name=commodityName?commodityName.textContent.trim():'';
        var continueButton=document.querySelector('.form-actions .primary');
        if(continueButton)continueButton.disabled=!wizardProduct.category_id;
      }
      return;
    }
    // Aksi lain diberi respons yang jelas.
    if(label) notify('Aksi "'+btn.textContent.trim()+'" dipilih.');
  });

  function filterRows(query){
    var q=clean(query);
    document.querySelectorAll('main table tbody tr, main .price-card, main .feature-card, main .result-card').forEach(function(el){
      el.style.display=!q||clean(el.textContent).indexOf(q)>=0?'':'none';
    });
  }
  document.querySelectorAll('input[placeholder]').forEach(function(input){
    input.addEventListener('input',function(){var q=input.value;var target=input.closest('.app-content')||input.closest('main')||document; 
      target.querySelectorAll('tbody tr, .price-card, .result-card, .buyer-card').forEach(function(el){el.style.display=!q||clean(el.textContent).indexOf(clean(q))>=0?'':'none';});
    });
  });

  // Animasi masuk yang ringan, tanpa mengubah urutan maupun isi elemen.
  var reveal=document.querySelectorAll('main h1, main .panel, main .stat-card, main .summary-main, main .price-card, main .feature-card, main .form-card, main .table-wrap, main .result-card');
  reveal.forEach(function(el){el.classList.add('th-reveal');});
  if('IntersectionObserver' in window){
    var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('th-visible');observer.unobserve(entry.target);}});},{threshold:.08});
    reveal.forEach(function(el){observer.observe(el);});
  }else reveal.forEach(function(el){el.classList.add('th-visible');});
})();


/* Animasi berulang khusus halaman dashboard */
(function () {
  var file = (location.pathname.split('/').pop() || '').toLowerCase();
  if (!/^(admin|petani|pembeli)-dashboard\.php$/.test(file)) return;
  document.body.classList.add('dashboard-motion');
})();
