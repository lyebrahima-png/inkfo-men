# Konfigurasi PHP dan MariaDB

## Menjalankan di XAMPP

1. Pastikan folder proyek berada di `C:\xampp\htdocs\TaniHubungan_Admin_Aksi_Bantuan`.
2. Dari XAMPP Control Panel, jalankan **Apache** dan **MySQL**.
3. Buka phpMyAdmin di `http://localhost/phpmyadmin`.
4. Buat database bernama `tanihubungan_db` dengan collation `utf8mb4_unicode_ci`.
5. Pilih database tersebut, lalu impor file `tanihubungan_db.sql`.
6. Buka `http://localhost/TaniHubungan_Admin_Aksi_Bantuan/`.

Semua halaman website kini menggunakan ekstensi `.php`. Koneksi PHP menggunakan PDO dan pengaturan bawaan XAMPP (`127.0.0.1`, database `tanihubungan_db`, user `root`, password kosong). Nilai tersebut dapat ditimpa melalui environment `DB_HOST`, `DB_NAME`, `DB_USER`, dan `DB_PASSWORD`, atau dengan menyalin `config/database.local.example.php` menjadi `config/database.local.php` lalu mengubah nilainya. File lokal tersebut tidak dilacak Git dan direktori `config` diblokir dari akses web.

Pendaftaran dan masuk menggunakan tabel `users` dan `roles`. Kata sandi disimpan menggunakan `password_hash`; login memverifikasinya dengan `password_verify`. Akun Admin tidak dibuat melalui formulir pendaftaran umum dan harus disiapkan oleh administrator database.

Untuk membuat akun Admin pertama, buat hash kata sandi di terminal dengan `C:\xampp\php\php.exe -r "echo password_hash('GANTI_DENGAN_KATA_SANDI_KUAT', PASSWORD_DEFAULT), PHP_EOL;"`, lalu masukkan pengguna melalui phpMyAdmin dengan `role_id` yang mengarah ke role `admin`. Simpan hash yang dihasilkan pada kolom `password`; jangan menyimpan kata sandi dalam bentuk teks biasa.

## Pengelolaan data Admin

Admin dapat menambah, mengubah, dan menghapus data melalui halaman **Kelola Akun**, **Kategori Komoditas**, **Penawaran**, **Laporan Perdagangan**, dan **Data Harga**. Setiap perubahan membutuhkan sesi Admin dan token CSRF. Penghapusan bersifat permanen; akun Admin aktif terakhir dan akun yang sedang digunakan tidak dapat dihapus. Kategori yang masih digunakan produk juga tidak dapat dihapus sampai produk tersebut diubah atau dihapus.

Tabel `market_prices` diperlukan untuk halaman Data Harga. Tabel ini sudah disertakan dalam `tanihubungan_db.sql`. Untuk database yang telah dibuat sebelumnya, jalankan migrasi `database/migrations/20261103_market_prices.sql` satu kali melalui phpMyAdmin atau konsol MariaDB.

Data contoh statis telah dihapus dari halaman, ringkasan, grafik, penawaran, dan wizard. Informasi pengguna pada halaman admin diambil dari sesi akun, sedangkan tanggal ringkasan mengikuti tanggal saat ini. Data database tidak dihapus atau diubah.

Data pada kelima halaman pengelolaan Admin dimuat dari database. Jika tabel kosong, halaman menampilkan keadaan kosong dan jumlah data yang sesuai; navigasi halaman contoh tidak ditampilkan.

Pada formulir penawaran Pembeli, langkah terakhir digunakan untuk mengisi atau memperbarui alamat pembeli. Alamat disimpan ke `users.address` untuk akun Pembeli yang sedang masuk. Kolom tersebut sudah tersedia pada skema dan database; tidak diperlukan migrasi tambahan.

Wizard penawaran Petani memuat pilihan komoditas langsung dari kategori yang dikelola Admin dan memeriksa pembaruan daftar secara berkala. Komoditas, jumlah, satuan, tanggal panen, harga, dan foto opsional disimpan ke tabel `products` sebagai **draf privat**. Draf hanya terlihat oleh Petani pemiliknya. Draf tidak ditampilkan kepada Admin atau Pembeli sampai Petani memilih **Terbitkan**; setelah diterbitkan statusnya `tersedia` dan datanya tampil pada halaman Admin/Pembeli. Data milik Petani dimuat pada dashboard, **Penawaran Saya**, dan **Status Penjualan**.

Nilai penawaran aktif dan jumlah penawaran aktif Petani dihitung dari produk berstatus `tersedia` dengan stok di atas nol; draf privat dan penawaran habis dihitung terpisah. Ringkasan Admin menghitung akun Petani, akun Pembeli, penawaran aktif, dan pesanan pada bulan berjalan langsung dari tabel database. Untuk database lama, jalankan `database/migrations/20261103_product_offer_fields.sql` satu kali agar `products.stock` mendukung pecahan dan kolom `unit` serta `harvest_date` tersedia, lalu jalankan `database/migrations/20261103_private_farmer_offers.sql` satu kali untuk mendukung draf privat. Skema baru sudah memuat kolom dan status tersebut. Foto PNG/JPG maksimal 5 MB disimpan di `uploads/harvest` dan ditampilkan pada kartu penawaran Pembeli.

## Troubleshooting

- Jika koneksi gagal, pastikan MySQL aktif, database sudah dibuat dan file SQL berhasil diimpor.
- Pastikan ekstensi `pdo_mysql` aktif pada konfigurasi PHP XAMPP.
- Pesan kesalahan detail koneksi dicatat di log PHP; respons API tidak menampilkan kredensial database.
- Jalankan halaman melalui Apache (`http://localhost/...`), bukan dengan membuka file langsung atau menggunakan server statis Node.js.
