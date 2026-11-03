<?php require __DIR__ . '/config/page-bootstrap.php'; ?>
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Penawaran Saya – Petani | TaniHubungan</title>
    <link rel="icon" type="image/svg+xml" href="favicon.svg" />
    <link rel="stylesheet" href="css/style.css" />
  </head>
  <body data-role="Petani">
<div class="workspace user"><div class="app-shell"><nav class="user-nav"><div class="logo "><span class="logo-mark"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z"></path><path d="M4 21c3-6 7-9 12-12"></path></svg></span><span>Tani<span>Hubungan</span></span></div><div><button class="">Dashboard</button><button class="">Informasi Harga</button><button class="">Buat Penawaran</button><button class="active">Penawaran Saya</button><button class="">Calon Pembeli</button></div><div class="user-nav-actions"><button class="icon-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"></path><path d="M10 21h4"></path></svg><i></i></button><button class="avatar" aria-label="Buka profil pengguna"></button><button class="exit">Keluar</button></div></nav><main class="app-content"><div class="welcome"><div><span>PETANI / PENGELOLAAN DATA</span><h1>Penawaran Saya</h1><p>Kelola penawaran hasil panen yang tersimpan di database.</p></div><button class="btn primary">Buat Penawaran</button></div><section class="panel"><div class="panel-title"><div><h3>Daftar penawaran saya</h3><p>Data milik akun Petani yang sedang masuk</p></div><span class="badge green">Data dari database</span></div><div class="filters"><label><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><input placeholder="Cari penawaran..."/></label></div><div class="table-wrap"><table><thead><tr><th>Komoditas</th><th>Jumlah</th><th>Satuan</th><th>Harga</th><th>Tanggal panen</th><th>Wilayah</th><th>Status</th></tr></thead><tbody><tr><td colspan="7">Belum ada penawaran.</td></tr></tbody></table><div class="pagination"><span>Menampilkan 0 penawaran</span><div hidden></div></div></div></section></main></div></div>
    <script src="js/wizard-data.js"></script>
    <script src="js/main.js?v=<?= filemtime(__DIR__ . '/js/main.js') ?>"></script>
    <script src="js/offers.js?v=<?= filemtime(__DIR__ . '/js/offers.js') ?>"></script>
  
  
</body>
</html>
