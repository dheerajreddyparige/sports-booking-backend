-- FlowsState table schema
CREATE TABLE IF NOT EXISTS flows_state (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flow_token VARCHAR(255) NOT NULL UNIQUE,
  screen VARCHAR(100),
  phone_number VARCHAR(20) NOT NULL,
  sport VARCHAR(50),
  date VARCHAR(20),
  duration INT,
  time_slot VARCHAR(20),
  processed_messages JSON,
  available_slots JSON,
  current_page INT DEFAULT 0,
  total_pages INT DEFAULT 1,
  selected_slot_id VARCHAR(50),
  selected_period VARCHAR(20),
  customer_name VARCHAR(100),
  customer_email VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(20),
  transaction_id VARCHAR(100),
  booking_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX (phone_number),
  INDEX (flow_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;