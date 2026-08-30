CREATE TABLE users (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE categories (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL
);

CREATE TABLE books (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    owner_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    status NVARCHAR(50) NOT NULL,
    pdf_url NVARCHAR(500) NULL,

    CONSTRAINT FK_books_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT FK_books_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE NO ACTION
);

CREATE TABLE notifications (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    is_read BIT NOT NULL DEFAULT 0,

    CONSTRAINT FK_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE exchange_listings (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    book_id BIGINT NOT NULL,
    wanted_type NVARCHAR(100) NOT NULL,

    CONSTRAINT FK_exchange_listings_book
        FOREIGN KEY (book_id)
        REFERENCES books(id)
        ON DELETE CASCADE
);

CREATE TABLE exchange_requests (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    requester_id BIGINT NOT NULL,
    offered_book_id BIGINT NOT NULL,
    status NVARCHAR(50) NOT NULL,

    CONSTRAINT FK_exchange_requests_listing
        FOREIGN KEY (listing_id)
        REFERENCES exchange_listings(id)
        ON DELETE NO ACTION,

    CONSTRAINT FK_exchange_requests_requester
        FOREIGN KEY (requester_id)
        REFERENCES users(id)
        ON DELETE NO ACTION,

    CONSTRAINT FK_exchange_requests_offered_book
        FOREIGN KEY (offered_book_id)
        REFERENCES books(id)
        ON DELETE NO ACTION
);

CREATE TABLE history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id BIGINT NOT NULL,
    completed_at DATETIME2 NULL,

    CONSTRAINT FK_history_request
        FOREIGN KEY (request_id)
        REFERENCES exchange_requests(id)
        ON DELETE CASCADE
);
