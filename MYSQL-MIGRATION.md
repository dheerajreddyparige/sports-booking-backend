# MongoDB to MySQL Migration Guide

This guide provides instructions for migrating the sports booking backend from MongoDB to MySQL.

## Prerequisites

1. MySQL server (version 8.0 or higher recommended)
2. MySQL client (for testing connections)
3. Node.js (version 14 or higher)

## Migration Steps

### 1. Set Up MySQL Database

1. Create a new MySQL database for the application:

```sql
CREATE DATABASE sports_booking;
```

2. Create a MySQL user with appropriate permissions:

```sql
CREATE USER 'sports_user'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON sports_booking.* TO 'sports_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Update Environment Variables

Add the following MySQL connection details to your `.env` file:

```
# MySQL Configuration
MYSQL_HOST=your-mysql-host
MYSQL_USER=your-mysql-user
MYSQL_PASSWORD=your-mysql-password
MYSQL_DATABASE=your-mysql-database
MYSQL_PORT=3306
```

### 3. Initialize MySQL Database

Run the initialization script to create the required tables:

```bash
node src/scripts/init-mysql-db.js
```

This script will create the following tables:
- `customer` - Stores customer information
- `customer_payment` - Stores customer payment history
- `court` - Stores court information
- `sport_config` - Stores sport configuration
- `sport_availability_exception` - Stores exceptions to sport availability
- `booking` - Stores booking information
- `flows_state` - Stores WhatsApp flow state
- `payment` - Stores payment information

### 4. Migrate Existing Data (Optional)

If you have existing data in MongoDB that you want to migrate to MySQL, run the migration script:

```bash
node src/scripts/migrate-mongo-to-mysql.js
```

This script will:
1. Connect to both MongoDB and MySQL databases
2. Read data from MongoDB collections
3. Insert data into corresponding MySQL tables
4. Handle relationships and data transformations

### 5. Switch to MySQL

To switch the application from MongoDB to MySQL, run the switch script:

```bash
node src/scripts/switch-to-mysql.js
```

This script will:
1. Backup original MongoDB files
2. Replace MongoDB files with MySQL versions
3. Update package.json to remove MongoDB dependencies and add MySQL dependencies

### 6. Update Dependencies

After running the switch script, update your dependencies:

```bash
npm install
```

### 7. Test the Application

Start the application to test the MySQL integration:

```bash
npm start
```

## Database Schema

### Customer Table
```sql
CREATE TABLE IF NOT EXISTS `customer` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100),
  `email` VARCHAR(100),
  `phone` VARCHAR(20) NOT NULL,
  `whatsapp_id` VARCHAR(50),
  `preferences` JSON,
  `last_active` TIMESTAMP,
  `login_count` INT DEFAULT 0,
  `last_login` TIMESTAMP,
  `account_status` VARCHAR(20) DEFAULT 'active',
  `verification` JSON,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_id` (`customer_id`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_whatsapp_id` (`whatsapp_id`)
);
```

### Court Table
```sql
CREATE TABLE IF NOT EXISTS `court` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sport` VARCHAR(50) NOT NULL,
  `court_id` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100),
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sport_court_id` (`sport`, `court_id`),
  INDEX `idx_sport` (`sport`)
);
```

### Sport Config Table
```sql
CREATE TABLE IF NOT EXISTS `sport_config` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sport` VARCHAR(50) NOT NULL,
  `base_rate` DECIMAL(10, 2) NOT NULL,
  `weekday_morning_rate` DECIMAL(10, 2),
  `weekday_evening_rate` DECIMAL(10, 2),
  `weekend_morning_rate` DECIMAL(10, 2),
  `weekend_evening_rate` DECIMAL(10, 2),
  `morning_start_time` TIME,
  `morning_end_time` TIME,
  `evening_start_time` TIME,
  `evening_end_time` TIME,
  `duration_discounts` JSON,
  `open_time` TIME NOT NULL,
  `close_time` TIME NOT NULL,
  `min_duration` INT NOT NULL DEFAULT 1,
  `max_duration` INT NOT NULL DEFAULT 3,
  `duration_increment` INT NOT NULL DEFAULT 1,
  `max_advance_booking_days` INT NOT NULL DEFAULT 7,
  `cancellation_policy` JSON,
  `court_count` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sport` (`sport`),
  INDEX `idx_sport` (`sport`)
);
```

### Booking Table
```sql
CREATE TABLE IF NOT EXISTS `booking` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sport` VARCHAR(50) NOT NULL,
  `court_id` VARCHAR(20) NOT NULL,
  `date` DATE NOT NULL,
  `time` TIME NOT NULL,
  `duration` INT NOT NULL,
  `customer_name` VARCHAR(100),
  `customer_email` VARCHAR(100),
  `customer_phone` VARCHAR(20) NOT NULL,
  `customer_id` VARCHAR(50),
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `amount` DECIMAL(10, 2) NOT NULL,
  `payment_method` VARCHAR(20),
  `payment_status` VARCHAR(20),
  `transaction_id` VARCHAR(100),
  `order_id` VARCHAR(100),
  `session_token` VARCHAR(100),
  `flow_token` VARCHAR(100),
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sport_date` (`sport`, `date`),
  INDEX `idx_court_id` (`court_id`),
  INDEX `idx_customer_id` (`customer_id`),
  INDEX `idx_customer_phone` (`customer_phone`),
  INDEX `idx_flow_token` (`flow_token`),
  INDEX `idx_session_token` (`session_token`),
  FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE SET NULL
);
```

### Flows State Table
```sql
CREATE TABLE IF NOT EXISTS `flows_state` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `flow_token` VARCHAR(100) NOT NULL,
  `screen` VARCHAR(50),
  `phone_number` VARCHAR(20) NOT NULL,
  `sport` VARCHAR(50),
  `date` DATE,
  `duration` INT,
  `time_slot` TIME,
  `processed_messages` JSON,
  `available_slots` JSON,
  `current_page` INT,
  `total_pages` INT,
  `selected_slot_id` VARCHAR(50),
  `selected_period` VARCHAR(50),
  `customer_name` VARCHAR(100),
  `customer_email` VARCHAR(100),
  `payment_status` VARCHAR(20),
  `payment_method` VARCHAR(20),
  `transaction_id` VARCHAR(100),
  `order_id` VARCHAR(100),
  `booking_id` VARCHAR(50),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_flow_token` (`flow_token`),
  INDEX `idx_phone_number` (`phone_number`)
);
```

### Payment Table
```sql
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
);
```

## Troubleshooting

### Connection Issues

If you encounter connection issues with MySQL:

1. Verify MySQL server is running
2. Check connection details in `.env` file
3. Ensure the MySQL user has appropriate permissions
4. Check for network/firewall restrictions

### Data Migration Issues

If data migration fails:

1. Check MongoDB connection
2. Verify MySQL connection
3. Check for data format issues
4. Run the migration script with more detailed logging

### Application Errors

If the application fails to start or encounters errors:

1. Check server logs for specific error messages
2. Verify all required tables exist in MySQL
3. Check for missing dependencies
4. Ensure environment variables are correctly set

## Support

For additional support, please contact the development team.