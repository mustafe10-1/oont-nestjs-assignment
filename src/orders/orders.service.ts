import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

type LockedProductRow = {
  id: string;
  stock: number;
  deletedAt: Date | null;
};

type StockFailureItem = {
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableStock: number;
  reason: 'PRODUCT_UNAVAILABLE' | 'INSUFFICIENT_STOCK';
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId: dto.userId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException({
          message: 'Cart is empty',
          outOfStockItems: [],
        });
      }

      const sortedProductIds = [...new Set(cart.items.map((item) => item.productId))].sort();
      const lockedProducts = await tx.$queryRaw<LockedProductRow[]>(Prisma.sql`
        SELECT "id", "stock", "deletedAt"
        FROM "Product"
        WHERE "id" IN (${Prisma.join(sortedProductIds)})
        ORDER BY "id"
        FOR UPDATE
      `);

      const lockedMap = new Map(lockedProducts.map((product) => [product.id, product]));
      const failures: StockFailureItem[] = [];

      for (const item of cart.items) {
        const locked = lockedMap.get(item.productId);

        if (!locked || locked.deletedAt) {
          failures.push({
            productId: item.productId,
            productName: item.product.name,
            requestedQuantity: item.quantity,
            availableStock: 0,
            reason: 'PRODUCT_UNAVAILABLE',
          });
          continue;
        }

        if (locked.stock < item.quantity) {
          failures.push({
            productId: item.productId,
            productName: item.product.name,
            requestedQuantity: item.quantity,
            availableStock: locked.stock,
            reason: 'INSUFFICIENT_STOCK',
          });
        }
      }

      if (failures.length > 0) {
        throw new BadRequestException({
          message: 'Unable to create order due to stock validation failures',
          outOfStockItems: failures,
        });
      }

      let totalCents = 0;
      const itemsToCreate = cart.items.map((item) => {
        const lineTotalCents = item.quantity * item.product.priceCents;
        totalCents += lineTotalCents;
        return {
          productId: item.productId,
          productName: item.product.name,
          unitPriceCents: item.product.priceCents,
          quantity: item.quantity,
          lineTotalCents,
        };
      });

      const order = await tx.order.create({
        data: {
          userId: dto.userId,
          status: OrderStatus.PENDING,
          totalCents,
          items: { create: itemsToCreate },
        },
        include: { items: true },
      });

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return order;
    });
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async cancelOrder(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const lockedOrderRows = await tx.$queryRaw<Array<{ id: string; status: OrderStatus }>>(Prisma.sql`
        SELECT "id", "status"
        FROM "Order"
        WHERE "id" = ${id}
        FOR UPDATE
      `);

      const lockedOrder = lockedOrderRows[0];
      if (!lockedOrder) {
        throw new NotFoundException('Order not found');
      }

      if (lockedOrder.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('Order already cancelled');
      }

      const orderItems = await tx.orderItem.findMany({
        where: { orderId: id },
      });

      const sortedProductIds = [...new Set(orderItems.map((item) => item.productId))].sort();
      if (sortedProductIds.length > 0) {
        await tx.$queryRaw(Prisma.sql`
          SELECT "id"
          FROM "Product"
          WHERE "id" IN (${Prisma.join(sortedProductIds)})
          ORDER BY "id"
          FOR UPDATE
        `);
      }

      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: { items: true },
      });
    });
  }
}
