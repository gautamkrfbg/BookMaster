BookMaster --- MS SQL Server Test Cases

1. Purpose

This document contains database test cases for Microsoft SQL Server
(MS SQL Server) for the BookMaster project.

The test cases focus on data integrity, primary keys, foreign keys,
uniqueness, constraints, and the main book-exchange workflow.

Note: The repository documentation currently describes MySQL as
the current database and SQL Server as a planned migration target. The
existing Api/schema.sql already contains SQL Server-style
definitions such as IDENTITY, NVARCHAR, BIT, and DATETIME2.
These test cases are therefore intended for MS SQL Server
validation/migration testing.

2. Database Tables Covered

users

categories

books

notifications

exchange_listings

exchange_requests

history

3. Test Cases

MS-SQL-TC-01 --- Verify User Primary Key

Objective: Verify that each user receives a unique ID.

Precondition: SQL Server database is available.

Test Steps: 1. Insert two valid users. 2. Retrieve their IDs. 3.
Verify that the IDs are different.

SQL Query:

SELECT id, name, email
FROM users;

Expected Result: - Each user has a unique id. - The id is
generated automatically. - No duplicate primary-key values exist.

Expected Status: PASS

MS-SQL-TC-02 --- Verify Unique User Email

Objective: Verify that duplicate email addresses are not allowed.

Test Steps: 1. Insert a user with a valid email. 2. Try to insert
another user with the same email.

SQL Query:

INSERT INTO users (name, email)
VALUES ('Test User', 'test@example.com');

Then attempt:

INSERT INTO users (name, email)
VALUES ('Another User', 'test@example.com');

Expected Result: - The first insert succeeds. - The second insert
fails because users.email has a UNIQUE constraint. - No duplicate
email is stored.

Expected Status: PASS

MS-SQL-TC-03 --- Verify Book References an Existing User

Objective: Verify that a book cannot be created without a valid
owner.

Test Steps: 1. Use an existing users.id. 2. Insert a book using
that ID as owner_id. 3. Verify the relationship.

SQL Query:

SELECT
    b.id AS BookId,
    b.title,
    b.owner_id,
    u.id AS UserId,
    u.name AS OwnerName
FROM books b
INNER JOIN users u
    ON b.owner_id = u.id;

Expected Result: - Every book returned by the query has a valid
owner. - books.owner_id references users.id.

Expected Status: PASS

MS-SQL-TC-04 --- Verify Book References a Valid Category

Objective: Verify that every book is associated with an existing
category.

SQL Query:

SELECT
    b.id AS BookId,
    b.title,
    b.category_id,
    c.id AS CategoryId,
    c.name AS CategoryName
FROM books b
INNER JOIN categories c
    ON b.category_id = c.id;

Expected Result: - Every book has a valid category. -
books.category_id references categories.id. - A book cannot be
inserted with a non-existent category ID.

Expected Status: PASS

MS-SQL-TC-05 --- Verify Exchange Listing References a Valid Book

Objective: Verify that an exchange listing can only be created for
an existing book.

SQL Query:

SELECT
    el.id AS ListingId,
    el.book_id AS BookId,
    b.title AS BookTitle,
    el.wanted_type
FROM exchange_listings el
INNER JOIN books b
    ON el.book_id = b.id;

Expected Result: - Every exchange listing references an existing
book. - No orphan listing is present.

Expected Status: PASS

MS-SQL-TC-06 --- Verify Exchange Request Relationships

Objective: Verify that an exchange request references a valid
listing, requester, and offered book.

SQL Query:

SELECT
    er.id AS RequestId,
    er.status,
    el.id AS ListingId,
    u.id AS RequesterId,
    u.name AS RequesterName,
    b.id AS OfferedBookId,
    b.title AS OfferedBook
FROM exchange_requests er
INNER JOIN exchange_listings el
    ON er.listing_id = el.id
INNER JOIN users u
    ON er.requester_id = u.id
INNER JOIN books b
    ON er.offered_book_id = b.id;

Expected Result: - Each exchange request has a valid listing. - Each
request has a valid requester. - Each request has a valid offered
book. - No orphan exchange request exists.

Expected Status: PASS

MS-SQL-TC-07 --- Verify Exchange Request Status

Objective: Verify that the exchange request status is stored
correctly.

Test Steps: 1. Create an exchange request. 2. Set or update its
status through the application. 3. Verify the stored value.

SQL Query:

SELECT id, listing_id, requester_id, offered_book_id, status
FROM exchange_requests
WHERE id = @RequestId;

Expected Result: - The request exists. - The status value matches
the action performed, such as Pending, Accepted, or Rejected,
according to the application's defined values.

Expected Status: PASS

MS-SQL-TC-08 --- Verify Exchange History

Objective: Verify that a completed exchange is recorded in the
history table.

Test Steps: 1. Complete/accept a valid exchange. 2. Retrieve the
corresponding request. 3. Check the history record.

SQL Query:

SELECT
    h.id AS HistoryId,
    h.request_id AS RequestId,
    h.completed_at,
    er.status
FROM history h
INNER JOIN exchange_requests er
    ON h.request_id = er.id
WHERE h.request_id = @RequestId;

Expected Result: - A history record exists for the completed
exchange. - history.request_id references the correct exchange
request. - completed_at is populated when the exchange is completed.

Expected Status: PASS

MS-SQL-TC-09 --- Verify Notification User Relationship

Objective: Verify that a notification belongs to an existing user.

SQL Query:

SELECT
    n.id AS NotificationId,
    n.user_id AS UserId,
    u.name AS UserName,
    n.is_read
FROM notifications n
INNER JOIN users u
    ON n.user_id = u.id;

Expected Result: - Every notification belongs to a valid user. -
is_read contains a valid BIT value (0 or 1).

Expected Status: PASS

MS-SQL-TC-10 --- Verify Exchange Data Integrity

Objective: Verify that the database maintains consistent
relationships throughout an exchange.

Test Steps: 1. User A owns a book and lists it for exchange. 2. User
B submits an exchange request using another book. 3. User A accepts the
request. 4. Verify the request, listing, offered book, and history
records.

SQL Query:

SELECT
    er.id AS RequestId,
    er.status AS RequestStatus,
    el.id AS ListingId,
    el.book_id AS ListedBookId,
    er.offered_book_id AS OfferedBookId,
    h.id AS HistoryId,
    h.completed_at
FROM exchange_requests er
INNER JOIN exchange_listings el
    ON er.listing_id = el.id
LEFT JOIN history h
    ON h.request_id = er.id
WHERE er.id = @RequestId;

Expected Result: - The exchange request exists and has the correct
final status. - The request references a valid listing. - The listing
references a valid book. - The offered book exists. - A history record
is created for a completed exchange. - No broken foreign-key
relationship is present.

Expected Status: PASS

4. Summary

Test Case ID            Area                    Expected Result

MS-SQL-TC-01            User Primary Key        Unique user IDs

MS-SQL-TC-02            User Email              Duplicate email
rejected

MS-SQL-TC-03            Book--User Relationship Valid book owner

MS-SQL-TC-04            Book--Category          Valid category
Relationship

MS-SQL-TC-05            Exchange Listing        Valid book reference

MS-SQL-TC-06            Exchange Request        Valid listing, user and
book

MS-SQL-TC-07            Request Status          Correct status stored

MS-SQL-TC-08            Exchange History        Completed exchange
recorded

MS-SQL-TC-09            Notifications           Valid user reference

5. Notes

Replace @RequestId with an actual request ID when executing the
queries in SQL Server Management Studio (SSMS).

These queries are intended for Microsoft SQL Server.

Run destructive tests only on a test/development database.

Record the actual result and PASS/FAIL status after executing each
test.
