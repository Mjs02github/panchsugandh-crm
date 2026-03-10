CREATE TABLE IF NOT EXISTS retailer_edit_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    retailer_id INT UNSIGNED NOT NULL,
    requested_by INT UNSIGNED NOT NULL,
    proposed_data JSON NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    admin_remark TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    processed_by INT UNSIGNED NULL,
    processed_at DATETIME NULL,
    
    CONSTRAINT fk_rer_retailer FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
    CONSTRAINT fk_rer_requester FOREIGN KEY (requested_by) REFERENCES users(id),
    CONSTRAINT fk_rer_processor FOREIGN KEY (processed_by) REFERENCES users(id)
);
