-- Drop and recreate database (optional, remove if you want to keep data)
DROP DATABASE IF EXISTS skilllink_db;
CREATE DATABASE skilllink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skilllink_db;

-- Users table
CREATE TABLE users (
  user_id        INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(255)  NOT NULL,
  phone          VARCHAR(20)   NOT NULL UNIQUE,
  email          VARCHAR(255),
  password       VARCHAR(255)  NOT NULL,
  role           ENUM('artisan','client','admin') NOT NULL,
  location_lat   DECIMAL(10,7),
  location_lng   DECIMAL(10,7),
  location_name  VARCHAR(255),
  profile_pic    VARCHAR(255)  DEFAULT 'default.png',
  trade          VARCHAR(100),
  bio            VARCHAR(500),
  verification_status ENUM('pending','verified','rejected') DEFAULT 'pending',
  is_available   TINYINT(1) DEFAULT 1,
  warning_count  INT DEFAULT 0,
  is_suspended   TINYINT(1) DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_trade (trade)
);

-- Credentials
CREATE TABLE credentials (
  credential_id        INT AUTO_INCREMENT PRIMARY KEY,
  artisan_id           INT NOT NULL,
  issuing_authority    ENUM('NITA','KNEC','NCA','EPRA','TVET CDACC') NOT NULL,
  index_number         VARCHAR(100) NOT NULL,
  serial_number        VARCHAR(100) NOT NULL UNIQUE,
  exam_year            INT NOT NULL,
  trade_specialization VARCHAR(100) NOT NULL,
  verified             TINYINT(1) DEFAULT 0,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (artisan_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_credentials_artisan_id (artisan_id)
);

-- Simulated registry
CREATE TABLE simulated_registry (
  registry_id          INT AUTO_INCREMENT PRIMARY KEY,
  issuing_authority    ENUM('NITA','KNEC','NCA','EPRA','TVET CDACC') NOT NULL,
  index_number         VARCHAR(100) NOT NULL,
  serial_number        VARCHAR(100) NOT NULL UNIQUE,
  exam_year            INT NOT NULL,
  trade_specialization VARCHAR(100) NOT NULL,
  holder_name          VARCHAR(255) NOT NULL
);

-- Jobs
CREATE TABLE jobs (
  job_id              INT AUTO_INCREMENT PRIMARY KEY,
  client_id           INT NOT NULL,
  assigned_artisan_id INT,
  job_title           VARCHAR(255) NOT NULL,
  job_description     TEXT NOT NULL,
  required_skill      VARCHAR(100) NOT NULL,
  job_location_lat    DECIMAL(10,7) NOT NULL,
  job_location_lng    DECIMAL(10,7) NOT NULL,
  job_location_name   VARCHAR(255),
  budget_min          DECIMAL(10,2) DEFAULT 0,
  budget_max          DECIMAL(10,2) DEFAULT 0,
  quoted_price        DECIMAL(10,2),
  payment_reference   VARCHAR(255) DEFAULT NULL,
  payment_status      ENUM('unpaid','paid') DEFAULT 'unpaid',
  is_emergency        TINYINT(1) DEFAULT 0,
  status              ENUM('open','assigned','completed','confirmed','closed','disputed') DEFAULT 'open',
  completed_at        TIMESTAMP NULL DEFAULT NULL,
  platform_fee        DECIMAL(10,2) DEFAULT 0.00,
  flagged             TINYINT(1) DEFAULT 0,
  dispute_resolved_favor ENUM('client','artisan') NULL DEFAULT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_jobs_status (status),
  INDEX idx_jobs_required_skill (required_skill),
  INDEX idx_jobs_client_id (client_id),
  INDEX idx_jobs_assigned_artisan_id (assigned_artisan_id),
  FOREIGN KEY (client_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_artisan_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Admin settings
CREATE TABLE admin_settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255)
);

INSERT INTO admin_settings (setting_key, setting_value) VALUES
('commission_percent','5');

-- Audit log
CREATE TABLE audit_log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id INT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Notifications
CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  message         VARCHAR(500) NOT NULL,
  type            VARCHAR(50),
  related_job_id  INT,
  is_read         TINYINT(1) DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Ratings
CREATE TABLE ratings (
  rating_id      INT AUTO_INCREMENT PRIMARY KEY,
  job_id         INT NOT NULL,
  rater_id       INT NOT NULL,
  rated_user_id  INT NOT NULL,
  rating         INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment        VARCHAR(500),
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rating (job_id, rater_id),
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
  FOREIGN KEY (rater_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (rated_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_ratings_user (rated_user_id)
);

-- Dispute responses
CREATE TABLE dispute_responses (
  response_id  INT AUTO_INCREMENT PRIMARY KEY,
  job_id       INT NOT NULL,
  responder_id INT NOT NULL,
  message      VARCHAR(1000) NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
  FOREIGN KEY (responder_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_disputes_job (job_id)
);

-- Insert simulated registry data (same as before)
INSERT INTO simulated_registry (issuing_authority,index_number,serial_number,exam_year,trade_specialization,holder_name) VALUES
('NITA','NITA-2022-001','NITA-CERT-10201',2022,'Plumbing','James Kamau'),
('NITA','NITA-2021-002','NITA-CERT-10202',2021,'Electrical','Peter Otieno'),
('NITA','NITA-2023-003','NITA-CERT-10203',2023,'Masonry','David Njoroge'),
('KNEC','KNEC-2020-004','KNEC-CERT-20401',2020,'Carpentry','Grace Wanjiku'),
('KNEC','KNEC-2022-005','KNEC-CERT-20402',2022,'Painting','Samuel Kiprotich');