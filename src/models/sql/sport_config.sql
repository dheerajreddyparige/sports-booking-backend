-- Sport Configuration table schema
CREATE TABLE IF NOT EXISTS sport_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sport ENUM('badminton', 'cricket', 'pickleball') NOT NULL UNIQUE,
  base_rate DECIMAL(10, 2) NOT NULL DEFAULT 400.00,
  weekday_morning_rate DECIMAL(10, 2),
  weekday_evening_rate DECIMAL(10, 2),
  weekend_morning_rate DECIMAL(10, 2),
  weekend_evening_rate DECIMAL(10, 2),
  morning_start_time VARCHAR(5) DEFAULT '05:00',
  morning_end_time VARCHAR(5) DEFAULT '17:00',
  evening_start_time VARCHAR(5) DEFAULT '17:00',
  evening_end_time VARCHAR(5) DEFAULT '23:00',
  two_hour_discount INT DEFAULT 5,
  three_hour_discount INT DEFAULT 10,
  four_hour_discount INT DEFAULT 15,
  open_time VARCHAR(5) DEFAULT '05:00',
  close_time VARCHAR(5) DEFAULT '23:00',
  min_booking_duration DECIMAL(3, 1) DEFAULT 1.0,
  max_booking_duration DECIMAL(3, 1) DEFAULT 4.0,
  booking_increment DECIMAL(3, 1) DEFAULT 0.5,
  max_advance_booking_days INT DEFAULT 14,
  cancellation_policy JSON,
  court_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX (sport)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sport Availability Exceptions table (for holidays, maintenance, etc.)
CREATE TABLE IF NOT EXISTS sport_availability_exception (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sport ENUM('badminton', 'cricket', 'pickleball') NOT NULL,
  exception_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  custom_open_time VARCHAR(5),
  custom_close_time VARCHAR(5),
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY (sport, exception_date),
  INDEX (exception_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;