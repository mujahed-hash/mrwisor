# Development Plan: SpendSplit Backend and Integration

This document outlines the plan for developing the backend for the SpendSplit application and integrating it with the existing frontend.

## 1. Backend Technology Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** SQLite
*   **ORM:** Sequelize
*   **Authentication:** JSON Web Tokens (JWT)
*   **Language:** TypeScript

## 2. Backend Project Structure

A new `server` directory will be created in the project root to house the backend code. The structure will be as follows:

```
server/
├── src/
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   ├── groupController.ts
│   │   ├── expenseController.ts
│   │   └── paymentController.ts
│   ├── models/
│   │   ├── index.ts
│   │   ├── user.ts
│   │   ├── group.ts
│   │   ├── expense.ts
│   │   └── payment.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── userRoutes.ts
│   │   ├── groupRoutes.ts
│   │   ├── expenseRoutes.ts
│   │   └── paymentRoutes.ts
│   ├── middleware/
│   │   └── authMiddleware.ts
│   ├── config/
│   │   └── database.ts
│   └── app.ts
├── package.json
├── tsconfig.json
└── .env
```

## 3. Database Schema

The database schema will be based on the types defined in `src/types.ts`. The following tables will be created:

*   **Users:** `id`, `name`, `email`, `password` (hashed), `avatar`, `createdAt`, `updatedAt`
*   **Groups:** `id`, `name`, `createdBy`, `createdAt`, `updatedAt`
*   **Expenses:** `id`, `description`, `amount`, `currency`, `paidBy`, `groupId`, `category`, `date`, `receipt`, `notes`, `splitType`, `createdAt`, `updatedAt`
*   **Payments:** `id`, `payerId`, `payeeId`, `amount`, `currency`, `date`, `groupId`, `notes`, `createdAt`, `updatedAt`
*   **GroupMembers:** A join table to manage the many-to-many relationship between Users and Groups.
*   **ExpenseSplits:** A table to store the splits for each expense.

## 4. API Endpoints

The following RESTful API endpoints will be created:

### Authentication

*   `POST /api/auth/register`: Register a new user.
*   `POST /api/auth/login`: Log in a user and return a JWT.

### Users

*   `GET /api/users`: Get all users.
*   `GET /api/users/:id`: Get a user by ID.

### Groups

*   `GET /api/groups`: Get all groups for the current user.
*   `POST /api/groups`: Create a new group.
*   `GET /api/groups/:id`: Get a group by ID.
*   `PUT /api/groups/:id`: Update a group.
*   `DELETE /api/groups/:id`: Delete a group.
*   `POST /api/groups/:id/members`: Add a member to a group.
*   `DELETE /api/groups/:id/members/:memberId`: Remove a member from a group.

### Expenses

*   `GET /api/expenses`: Get all expenses for the current user.
*   `POST /api/expenses`: Create a new expense.
*   `GET /api/expenses/:id`: Get an expense by ID.
*   `PUT /api/expenses/:id`: Update an expense.
*   `DELETE /api/expenses/:id`: Delete an expense.

### Payments

*   `GET /api/payments`: Get all payments for the current user.
*   `POST /api/payments`: Create a new payment.

## 5. Integration Steps

1.  **Set up the backend project:** Initialize a new Node.js project in the `server` directory, install dependencies, and set up the basic project structure.
2.  **Implement the database models:** Define the Sequelize models for `User`, `Group`, `Expense`, and `Payment`.
3.  **Implement the API endpoints:** Create the controllers and routes for each resource.
4.  **Implement authentication:** Add JWT-based authentication to secure the API endpoints.
5.  **Connect the frontend to the backend:**
    *   Update the `AppContext` to make API calls to the backend using `fetch` or a library like `axios`.
    *   Replace the mock data with data fetched from the backend.
    *   Update the `AuthContext` to handle user registration and login by calling the backend API.
6.  **Test the integration:** Thoroughly test the application to ensure that the frontend and backend are working together correctly.

## 6. Timeline

This is a high-level timeline for the backend development and integration:

*   **Week 1:** Backend setup, database modeling, and user authentication.
*   **Week 2:** Implement API endpoints for groups and expenses.
*   **Week 3:** Implement API endpoints for payments and connect the frontend to the backend.
*   **Week 4:** Testing and bug fixing.

This plan will be updated as the development progresses.
