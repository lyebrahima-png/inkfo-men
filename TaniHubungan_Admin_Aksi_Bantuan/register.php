<!doctype html>
<html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Daftar | TaniHubungan</title><link rel="icon" href="favicon.svg"><link rel="stylesheet" href="css/style.css"></head>
<body class="auth-page" data-auth="register">
<main class="auth-card">
<a class="auth-brand" href="index.php"><span class="logo-mark"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z"/><path d="M4 21c3-6 7-9 12-12"/></svg></span>TaniHubungan</a>
<h1>Buat akun baru</h1><p class="auth-subtitle">Bergabung dan mulai terhubung dengan mitra pertanian.</p>
<div class="auth-message" id="auth-message" role="status"></div>
<form class="auth-form" id="register-form">
<label>Nama lengkap<input type="text" name="name" placeholder="Nama lengkap Anda" autocomplete="name" required></label>
<label>Email<input type="email" name="email" placeholder="nama@email.com" autocomplete="email" required></label>
<label>Kata sandi<input type="password" name="password" placeholder="Minimal 6 karakter" minlength="6" autocomplete="new-password" required></label>
<label>Daftar sebagai<select name="role" required><option value="Petani">Petani</option><option value="Pembeli">Pembeli</option></select></label>
<button class="btn primary" type="submit">Daftar sekarang</button>
</form>
<p class="auth-switch">Sudah memiliki akun? <a href="login.php">Masuk</a></p><a class="auth-back" href="index.php">← Kembali ke halaman utama</a>
<p class="auth-note">Data akun disimpan dengan aman di database TaniHubungan.</p>
</main><script src="js/auth.js"></script>
</body></html>