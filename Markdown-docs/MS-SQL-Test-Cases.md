# MS-SQL Test Cases – BookMaster

## 1. Objective

The purpose of these test cases is to verify the correctness, integrity, and reliability of the SQL Server database used by the BookMaster application.

## 2. Database

**Database:** BookMaster
**Database Type:** Microsoft SQL Server
**ORM:** Entity Framework Core
**Application:** BookMaster – Digital Book Ownership and Exchange Platform

---

## Test Case 1: Verify User and Book Ownership Relationship

**Test Case ID:** SQL-TC-01
**Module:** Books / User Library
**Test Type:** Database Integrity Testing

### Objective

Verify that a book is correctly associated with an existing user who owns the book.

### Precondition

A valid user must already exist in the database.

### Test Steps

1. Select an existing user from the Users table.
2. Add a new book through the BookMaster application.
3. Check the corresponding book record in SQL Server.
4. Verify that the book's owner/user ID refers to an existing user.

### SQL Query

```sql
SELECT 
    b.Id AS BookId,
    b.Title,
    b.OwnerId,
    u.Id AS UserId,
    u.Email
FROM Books b
INNER JOIN Users u
    ON b.OwnerId = u.Id;
```

### Expected Result

* The book record should exist.
* The `OwnerId` of the book should match an existing `UserId`.
* The book should appear in the owner's library.
* No orphan book record should exist.

### Expected Status

**PASS**

---

## Test Case 2: Verify Exchange Request and Ownership Transfer

**Test Case ID:** SQL-TC-02
**Module:** Book Exchange
**Test Type:** Database Transaction / Integrity Testing

### Objective

Verify that ownership is correctly transferred after an exchange request is accepted.

### Precondition

* User A owns Book A.
* User B owns Book B.
* Book A is listed for exchange.
* User B sends an exchange request using Book B.

### Test Steps

1. User B sends an exchange request for Book A.
2. User A accepts the exchange request.
3. Check the exchange request record.
4. Verify the ownership of both books in SQL Server.
5. Verify that the exchange is recorded in the exchange history.

### SQL Query

```sql
SELECT 
    b.Id AS BookId,
    b.Title,
    b.OwnerId,
    u.Email AS CurrentOwner
FROM Books b
INNER JOIN Users u
    ON b.OwnerId = u.Id
WHERE b.Id IN (@BookAId, @BookBId);
```

Replace `@BookAId` and `@BookBId` with the actual book IDs.

To verify the exchange request:

```sql
SELECT *
FROM ExchangeRequests
WHERE Id = @ExchangeRequestId;
```

To verify exchange history:

```sql
SELECT *
FROM ExchangeHistories
WHERE ExchangeRequestId = @ExchangeRequestId;
```

### Expected Result

After acceptance:

* Book A should belong to User B.
* Book B should belong to User A.
* Exchange request status should be **Accepted**.
* A corresponding exchange-history record should exist.
* The database should maintain consistent ownership information.

### Expected Status

**PASS**

---

## Test Case 3: Verify Duplicate User Email Restriction

**Test Case ID:** SQL-TC-03
**Module:** User Registration
**Test Type:** Data Validation Testing

### Objective

Verify that duplicate email addresses cannot create multiple user accounts when the database/application requires email uniqueness.

### Test Steps

1. Register a user with an email address.
2. Attempt to register another user using the same email address.
3. Check the Users table.

### SQL Query

```sql
SELECT Email, COUNT(*) AS EmailCount
FROM Users
GROUP BY Email
HAVING COUNT(*) > 1;
```

### Expected Result

The query should return **no duplicate email records**.

### Expected Status

**PASS**

---

## Test Case 4: Verify Book Deletion

**Test Case ID:** SQL-TC-04
**Module:** Book Management
**Test Type:** CRUD Testing

### Objective

Verify that a book is correctly removed from the database when an authorized administrator deletes it.

### Test Steps

1. Select an existing book.
2. Note its Book ID.
3. Delete the book through the application.
4. Search for the book in SQL Server.

### SQL Query

```sql
SELECT *
FROM Books
WHERE Id = @BookId;
```

### Expected Result

The deleted book should no longer be present in the Books table, or should be marked inactive if soft deletion is implemented.

### Expected Status

**PASS**

---

## Test Case 5: Verify Exchange Listing Belongs to Correct Book

**Test Case ID:** SQL-TC-05
**Module:** Exchange Listing
**Test Type:** Referential Integrity Testing

### Objective

Verify that every exchange listing is associated with a valid book.

### SQL Query

```sql
SELECT 
    el.Id AS ListingId,
    el.BookId,
    b.Title
FROM ExchangeListings el
INNER JOIN Books b
    ON el.BookId = b.Id;
```

### Expected Result

Every exchange listing should reference an existing book.

### Expected Status

**PASS**

---

## Test Case 6: Verify Exchange Request References Valid Listing

**Test Case ID:** SQL-TC-06
**Module:** Exchange Request
**Test Type:** Referential Integrity Testing

### Objective

Verify that every exchange request belongs to a valid exchange listing.

### SQL Query

```sql
SELECT 
    er.Id AS RequestId,
    er.ListingId,
    el.BookId
FROM ExchangeRequests er
INNER JOIN ExchangeListings el
    ON er.ListingId = el.Id;
```

### Expected Result

Every exchange request should have a valid corresponding exchange listing.

### Expected Status

**PASS**

---

## Test Case 7: Verify User Library

**Test Case ID:** SQL-TC-07
**Module:** User Library
**Test Type:** Data Retrieval Testing

### Objective

Verify that a user's library contains only books owned by that user.

### SQL Query

```sql
SELECT 
    u.Id AS UserId,
    u.Email,
    b.Id AS BookId,
    b.Title
FROM Users u
INNER JOIN Books b
    ON u.Id = b.OwnerId
WHERE u.Id = @UserId;
```

### Expected Result

Only books whose `OwnerId` matches the selected user's ID should be displayed.

### Expected Status

**PASS**

---

## Test Case 8: Verify Rejected Exchange Request

**Test Case ID:** SQL-TC-08
**Module:** Exchange Request
**Test Type:** Business Logic Testing

### Objective

Verify that rejecting an exchange request does not transfer book ownership.

### Test Steps

1. Create an exchange request.
2. Reject the request.
3. Check the request status.
4. Check ownership of the involved books.

### SQL Query

```sql
SELECT *
FROM ExchangeRequests
WHERE Id = @ExchangeRequestId;
```

```sql
SELECT Id, Title, OwnerId
FROM Books
WHERE Id IN (@BookAId, @BookBId);
```

### Expected Result

* Exchange request status should be **Rejected**.
* Ownership of both books should remain unchanged.
* No successful exchange-history record should be created.

### Expected Status

**PASS**

---

## Test Case 9: Verify Category and Book Relationship

**Test Case ID:** SQL-TC-09
**Module:** Categories / Books
**Test Type:** Referential Integrity Testing

### Objective

Verify that books are associated with valid categories.

### SQL Query

```sql
SELECT 
    b.Id AS BookId,
    b.Title,
    c.Id AS CategoryId,
    c.Name AS CategoryName
FROM Books b
INNER JOIN Categories c
    ON b.CategoryId = c.Id;
```

### Expected Result

Each book should reference a valid category.

### Expected Status

**PASS**

---

## Test Case 10: Verify Database Consistency After Exchange

**Test Case ID:** SQL-TC-10
**Module:** Exchange / Database
**Test Type:** Transaction Integrity Testing

### Objective

Verify that all related database records remain consistent after a successful exchange.

### Test Steps

1. Accept a valid exchange request.
2. Verify the request status.
3. Verify book ownership.
4. Verify exchange history.
5. Verify the exchange listing.

### SQL Queries

```sql
SELECT *
FROM ExchangeRequests
WHERE Id = @ExchangeRequestId;
```

```sql
SELECT Id, Title, OwnerId
FROM Books
WHERE Id IN (@BookAId, @BookBId);
```

```sql
SELECT *
FROM ExchangeHistories
WHERE ExchangeRequestId = @ExchangeRequestId;
```

### Expected Result

* Exchange request = **Accepted**
* Both book ownership records are updated correctly.
* Exchange history contains the completed transaction.
* No inconsistent or orphan records are created.

### Expected Status

**PASS**
