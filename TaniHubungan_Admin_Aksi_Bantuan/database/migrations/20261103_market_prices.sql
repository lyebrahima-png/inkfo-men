CREATE TABLE IF NOT EXISTS `market_prices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `commodity_name` varchar(150) NOT NULL,
  `market_location` varchar(150) NOT NULL,
  `price` decimal(15,2) NOT NULL,
  `price_unit` varchar(30) NOT NULL DEFAULT 'kg',
  `source_name` varchar(150) NOT NULL,
  `record_date` date NOT NULL,
  `status` enum('terverifikasi','menunggu','ditolak') NOT NULL DEFAULT 'menunggu',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_market_prices_record_date` (`record_date`),
  KEY `idx_market_prices_commodity` (`commodity_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
