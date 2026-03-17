# Grocery Delivery Microservice (NestJS)

NestJS backend take-home implementation for products, categories, carts, and orders using PostgreSQL + Prisma.

## Tech stack

- NestJS + TypeScript
- PostgreSQL
- Prisma ORM
- Docker + docker-compose
- Swagger UI
- `class-validator` + `class-transformer`

## Setup

### Local development

1. Copy env file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Start Postgres:

```bash
docker compose up -d db
```

4. Run migrations and seed:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

5. Start API:

```bash
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`

### Docker compose (app + DB)

```bash
docker compose up --build
```

This runs PostgreSQL and the Nest app together. DB readiness is handled via healthcheck + dependency condition.

## API summary

### Products and categories

- `GET /products` - available products (`stock > 0`) with `page`, `limit`, `categoryId`, `search`, `sort=asc|desc` by `priceCents`
- `GET /products/:id` - single product including current `stock`
- `GET /categories`
- `GET /categories/:id/products`

### Cart

- `GET /cart/:userId`
- `POST /cart/:userId/items`
  - If the item already exists, quantity is incremented.
- `PUT /cart/:userId/items/:productId`
- `DELETE /cart/:userId/items/:productId`
- `DELETE /cart/:userId`

### Orders

- `POST /orders` (body `{ "userId": "..." }`)
- `GET /orders/:id`
- `POST /orders/:id/cancel`

## Business behavior

- Cart is persisted in PostgreSQL and scoped by `userId`.
- Successful order creation:
  - validates stock for all cart items,
  - creates order with `PENDING` status,
  - decrements stock,
  - clears cart.
- Failed order creation returns HTTP `400` with detailed `outOfStockItems` and does **not** change stock/cart.
- Cancel order restores stock and marks order as `CANCELLED`.

## Concurrency strategy

Checkout and cancellation use database transactions and row-level locking.

### Locking implementation

In `POST /orders`, all product rows for cart items are locked using raw SQL in the same transaction:

```sql
SELECT "id", "stock", "deletedAt"
FROM "Product"
WHERE "id" IN (...)
ORDER BY "id"
FOR UPDATE;
```

Why this is safe:

- `FOR UPDATE` serializes concurrent checkouts touching the same products.
- Stock validation and stock decrement happen while locks are held.
- If validation fails, transaction throws, so no stock/cart mutation is committed.

Product IDs are sorted before locking to reduce deadlock risk.
Order cancellation also locks the target order row (`FOR UPDATE`) before status checks, preventing concurrent double-cancel requests from restoring stock twice.

## Design decisions

- Feature modularization with `ProductModule`, `CategoryModule`, `CartModule`, and `OrderModule`.
- Prisma schema with explicit relations and indexes for cart/order queries.
- `OrderItem` snapshot fields for historical integrity.
- Product soft-delete via `deletedAt`.

See also: [`SCHEMA.md`](./SCHEMA.md).
