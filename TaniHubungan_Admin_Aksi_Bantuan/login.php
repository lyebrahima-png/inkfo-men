<!doctype html>
<html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Masuk | TaniHubungan</title><link rel="icon" href="favicon.svg"><link rel="stylesheet" href="css/style.css"></head>
<body class="auth-page" data-auth="login">
<main class="auth-card">
<a class="auth-brand" href="index.php"><span class="logo-mark"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z"/><path d="M4 21c3-6 7-9 12-12"/></svg></span>TaniHubungan</a>
<h1>Selamat datang kembali</h1><p class="auth-subtitle">Masuk untuk melanjutkan aktivitas Anda.</p>
<div class="auth-message" id="auth-message" role="status"></div>
<form class="auth-form" id="login-form">
<label>Email<input type="email" name="email" placeholder="nama@email.com" autocomplete="email" required></label>
<label>Kata sandi<input type="password" name="password" placeholder="Masukkan kata sandi" autocomplete="current-password" required></label>
<label>Masuk sebagai<select name="role" required><option value="Petani">Petani</option><option value="Pembeli">Pembeli</option><option value="Admin">Admin</option></select></label>
<button class="btn primary" type="submit">Masuk</button>
</form>
<p class="auth-switch">Belum memiliki akun? <a href="register.php">Daftar sekarang</a></p><a class="auth-back" href="index.php">← Kembali ke halaman utama</a>
<p class="auth-note">Akun diverifikasi dengan aman melalui database TaniHubungan.</p>
</main><script src="js/auth.js"></script>
</body></html>