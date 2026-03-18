# Grocery Delivery Microservice (NestJS)

NestJS backend take-home implementation for products, categories, carts, and orders using PostgreSQL and Prisma.

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

3. Start PostgreSQL:

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

This runs PostgreSQL and the NestJS application together. Database readiness is handled via health checks and dependency conditions.

## API summary

### Products and categories

- `GET /products` — available products (`stock > 0`) with:
  - pagination: `page`, `limit`
  - filters: `categoryId`, `search`
  - sorting: `sort=asc|desc` by `priceCents`
- `GET /products/:id` — single product including current `stock`
- `GET /categories`
- `GET /categories/:id/products`

### Cart

- `GET /cart/:userId`
- `POST /cart/:userId/items`
  - If the item already exists, quantity is incremented
- `PUT /cart/:userId/items/:productId`
- `DELETE /cart/:userId/items/:productId`
- `DELETE /cart/:userId`

### Orders

- `POST /orders` (body `{ "userId": "..." }`)
- `GET /orders/:id`
- `POST /orders/:id/cancel`

## Business behavior

- Cart is persisted in PostgreSQL and scoped by `userId`
- Successful order creation:
  - validates stock for all cart items
  - creates order with `PENDING` status
  - decrements stock
  - clears the cart
- Failed order creation:
  - returns HTTP `400` with detailed `outOfStockItems`
  - does **not** modify stock or cart
- Order cancellation:
  - restores stock
  - updates status to `CANCELLED`

## Concurrency strategy

Checkout and cancellation are handled using database transactions and row-level locking to ensure consistency under concurrent requests.

### Locking implementation

During `POST /orders`, all relevant product rows are locked within a single transaction:

```sql
SELECT "id", "stock", "deletedAt"
FROM "Product"
WHERE "id" IN (...)
ORDER BY "id"
FOR UPDATE;
```

### Why this is safe

- `FOR UPDATE` ensures concurrent checkouts affecting the same products are serialized
- Stock validation and decrement occur while locks are held
- If validation fails, the transaction rolls back, preventing partial updates
- Product IDs are sorted before locking to reduce deadlock risk

Order cancellation also locks the target order row before checking its status, preventing concurrent double-cancel operations from restoring stock multiple times.

## Design decisions

- Modular architecture using `ProductModule`, `CategoryModule`, `CartModule`, and `OrderModule`
- Prisma schema with explicit relations and indexes for efficient cart and order queries
- `OrderItem` snapshot fields to preserve historical data integrity
- Soft delete implementation for products using `deletedAt`

See also: [`SCHEMA.md`](./SCHEMA.md)
