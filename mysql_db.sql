CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE books (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    owner_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    pdf_url VARCHAR(500) NULL,

    FOREIGN KEY (owner_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT
);

CREATE TABLE notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE exchange_listings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    book_id BIGINT NOT NULL,
    wanted_type VARCHAR(100) NOT NULL,

    FOREIGN KEY (book_id)
        REFERENCES books(id)
        ON DELETE CASCADE
);

CREATE TABLE exchange_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    requester_id BIGINT NOT NULL,
    offered_book_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,

    FOREIGN KEY (listing_id)
        REFERENCES exchange_listings(id)
        ON DELETE CASCADE,

    FOREIGN KEY (requester_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (offered_book_id)
        REFERENCES books(id)
        ON DELETE CASCADE
);

CREATE TABLE history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT NOT NULL,
    completed_at DATETIME,

    FOREIGN KEY (request_id)
        REFERENCES exchange_requests(id)
        ON DELETE CASCADE
);
