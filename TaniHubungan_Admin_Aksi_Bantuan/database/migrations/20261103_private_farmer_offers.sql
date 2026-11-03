ALTER TABLE products
    MODIFY COLUMN status ENUM('draf', 'tersedia', 'habis', 'nonaktif') NOT NULL DEFAULT 'tersedia';
