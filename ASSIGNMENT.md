# OoNt Backend Take-Home Assignment

## Overview
Build a **NestJS backend microservice** for a grocery delivery platform that manages products, categories, carts, and orders.

**Time Allotment:** 3 days  
**Submission:** Public Git repository

---

## Tech Stack

- NestJS (TypeScript)
- PostgreSQL
- Prisma ORM or TypeORM
- Docker + docker-compose
- Swagger API documentation
- DTO validation using class-validator
- Global validation pipe

The service should run locally using Docker.

---

## Core Features

### 1. Product & Category APIs

**GET /products**
- pagination
- category filtering
- search by product name
- sorting by price

**GET /products/:id**

**GET /categories**

**GET /categories/:id/products**

---

### 2. Cart APIs

Cart must be **persisted in PostgreSQL**.

**GET /cart/:userId**

**POST /cart/:userId/items**

**PUT /cart/:userId/items/:productId**

**DELETE /cart/:userId/items/:productId**

**DELETE /cart/:userId**

---

### 3. Order APIs

**POST /orders**

Requirements:
- validate stock availability
- fail if stock is insufficient
- if successful:
  - create order
  - decrement stock
  - clear cart

**GET /orders/:id**

**POST /orders/:id/cancel**

Cancel should restore stock.

---

## Business Rules

- Cart must persist in PostgreSQL
- Products support soft delete
- Price stored in smallest currency unit (cents)
- Cart clears after successful order

---

## Critical Requirement: Concurrency Handling

Your implementation **must prevent overselling** when multiple users attempt to buy the last item.

Do **not** use naive logic like:

```text
check stock
update stock
```

Instead use a **production-safe solution**, such as:

- PostgreSQL transactions
- row-level locking
- optimistic concurrency control

Explain your approach in the README.

---

## Deliverables

Repository must include:

- NestJS backend code
- ORM schema and migrations
- Seed script with sample data
- Dockerfile
- docker-compose.yml
- Swagger documentation
- README with:
  - setup instructions
  - API overview
  - design decisions
  - concurrency explanation

---

## Evaluation Criteria

Implementation will be evaluated based on:

- correctness
- code structure and architecture
- error handling
- concurrency safety
- documentation quality
