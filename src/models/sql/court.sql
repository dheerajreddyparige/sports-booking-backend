-- Court table schema
CREATE TABLE IF NOT EXISTS court (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sport ENUM('badminton', 'cricket', 'pickleball') NOT NULL,
  court_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY (sport, court_id),
  INDEX (sport)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;