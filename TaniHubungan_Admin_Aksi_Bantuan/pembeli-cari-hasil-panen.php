<?php require __DIR__ . '/config/page-bootstrap.php'; ?>
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cari Hasil Panen – Pembeli | TaniHubungan</title>
    <link rel="icon" type="image/svg+xml" href="favicon.svg" />
    <link rel="stylesheet" href="css/style.css" />
  </head>
  <body data-role="Pembeli">
<div class="workspace user"><div class="app-shell"><nav class="user-nav"><div class="logo "><span class="logo-mark"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z"></path><path d="M4 21c3-6 7-9 12-12"></path></svg></span><span>Tani<span>Hubungan</span></span></div><div><button class="">Dashboard</button><button class="">Informasi Harga</button><button class="active">Cari Hasil Panen</button><button class="">Penawaran Saya</button><button class="">Negosiasi</button></div><div class="user-nav-actions"><button class="icon-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"></path><path d="M10 21h4"></path></svg><i></i></button><button class="avatar" aria-label="Buka profil pengguna"></button><button class="exit">Keluar</button></div></nav><main class="app-content"><div class="welcome"><div><span>PAPAN HASIL PANEN</span><h1>Temukan Panen Berkualitas</h1><p>Terhubung langsung dengan petani terverifikasi di sekitar Anda.</p></div><button class="btn secondary"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"></path><path d="M10 21h4"></path></svg> Simpan pencarian</button></div><div class="search-layout"><aside class="filter-side"><div><h3>Filter pencarian</h3><button>Reset</button></div><label>Komoditas<select><option>Semua komoditas</option></select></label><label>Lokasi panen<select><option>Semua wilayah</option></select></label><label>Jumlah tersedia<input type="range"/><small>7 hari — 3 bulan</small></label><label>Waktu panen<input type="range"/><small>7 hari — 3 bulan</small></label></aside><section class="results"><div class="result-head"><b>0 penawaran ditemukan</b><select><option>Terbaru</option></select></div><div class="offer-grid"><p class="empty-state" style="grid-column:1/-1;text-align:center;padding:24px">Belum ada penawaran di database.</p></div></section></div></main></div></div>
    <script src="js/wizard-data.js"></script>
    <script src="js/main.js?v=<?= filemtime(__DIR__ . '/js/main.js') ?>"></script>
    <script src="js/offers.js?v=<?= filemtime(__DIR__ . '/js/offers.js') ?>"></script>
  
  
</body>
</html>
