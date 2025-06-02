
-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS sports_booking;
USE sports_booking;


-- File: booking.sql
-- Booking table schema
CREATE TABLE IF NOT EXISTS booking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sport ENUM('badminton', 'cricket', 'pickleball') NOT NULL,
  court_id INT NOT NULL,
  date DATE NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  duration INT NOT NULL,
  customer_id INT,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(100),
  customer_phone VARCHAR(20) NOT NULL,
  special_requirements TEXT,
  status ENUM('confirmed', 'pending', 'cancelled', 'payment_pending', 'refunded') DEFAULT 'pending',
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_method ENUM('razorpay', 'paytm', 'whatsapp_pay', 'cash') DEFAULT 'razorpay',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  transaction_id VARCHAR(100),
  payment_receipt VARCHAR(255),
  payment_initiated_at TIMESTAMP NULL,
  payment_completed_at TIMESTAMP NULL,
  session_token VARCHAR(255),
  flow_token VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX (sport, date, court_id),
  INDEX (customer_id),
  INDEX (flow_token),
  INDEX (session_token),
  
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- File: court.sql
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


-- File: customer.sql
-- Customer table schema
CREATE TABLE IF NOT EXISTS customer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  whatsapp_id VARCHAR(50) NOT NULL,
  favorite_sports JSON,
  notification_email BOOLEAN DEFAULT FALSE,
  notification_whatsapp BOOLEAN DEFAULT TRUE,
  notification_sms BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP NULL,
  login_count INT DEFAULT 0,
  last_login TIMESTAMP NULL,
  account_status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  whatsapp_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX (phone),
  INDEX (whatsapp_id),
  INDEX (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer payment history table
CREATE TABLE IF NOT EXISTS customer_payment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE CASCADE,
  INDEX (customer_id),
  INDEX (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- File: flows_state.sql
-- FlowsState table schema
CREATE TABLE IF NOT EXISTS flows_state (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flow_token VARCHAR(255) NOT NULL UNIQUE,
  screen VARCHAR(100),
  phone_number VARCHAR(20) NOT NULL,
  sport JSON,
  date JSON,
  duration JSON,
  time_slot JSON,
  name VARCHAR(100),
  email VARCHAR(100),
  total_amount VARCHAR(20),
  original_amount VARCHAR(20),
  discount_info VARCHAR(255),
  is_date_enabled BOOLEAN DEFAULT FALSE,
  is_duration_enabled BOOLEAN DEFAULT FALSE,
  is_time_slots_enabled BOOLEAN DEFAULT FALSE,
  is_footer_enabled BOOLEAN DEFAULT FALSE,
  min_date VARCHAR(20),
  max_date VARCHAR(20),
  processed_messages JSON,
  available_slots JSON,
  selected_slot_id VARCHAR(50),
  payment_id VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'pending',
  booking_id INT,
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX (phone_number),
  INDEX (flow_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- File: payment.sql
-- Payment table schema
CREATE TABLE IF NOT EXISTS `payment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` VARCHAR(255) NOT NULL,
  `transaction_id` VARCHAR(255),
  `booking_id` VARCHAR(255),
  `customer_id` VARCHAR(255),
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `payment_method` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `payment_details` JSON,
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_transaction_id` (`transaction_id`),
  INDEX `idx_booking_id` (`booking_id`),
  INDEX `idx_customer_id` (`customer_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- File: sport_config.sql
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

