# Database Schema Overview

## Core entities

- **Category**: product grouping (`name` unique).
- **Product**: sellable item with `priceCents` (smallest currency unit), `stock`, and `deletedAt` for soft-delete.
- **Cart**: one cart per `userId`.
- **CartItem**: junction row of `cartId + productId` with `quantity` (unique per pair).
- **Order**: checkout result with `status` (`PENDING`, `CANCELLED`) and `totalCents`.
- **OrderItem**: immutable item snapshot at order time (`productName`, `unitPriceCents`, `quantity`, `lineTotalCents`).

## Notes

- Cart is fully persisted in PostgreSQL (`Cart`, `CartItem`).
- `Product.deletedAt` enables soft delete while retaining historical references.
- `OrderItem` snapshot fields preserve historical correctness even if product name/price changes later.
- Main relational constraints and indexes are defined in Prisma migration SQL under `prisma/migrations/`.
