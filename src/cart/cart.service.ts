import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpsertCartItemDto } from './dto/upsert-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureActiveProduct(productId: string) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async getOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: { include: { category: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      return { userId, items: [], totalCents: 0 };
    }

    const totalCents = cart.items.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);

    return { ...cart, totalCents };
  }

  async addItem(userId: string, dto: UpsertCartItemDto) {
    const product = await this.ensureActiveProduct(dto.productId);
    const cart = await this.getOrCreateCart(userId);

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    const targetQuantity = (existing?.quantity ?? 0) + dto.quantity;
    if (product.stock < targetQuantity) {
      throw new BadRequestException('Requested quantity exceeds current stock');
    }

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
      update: {
        quantity: {
          increment: dto.quantity,
        },
      },
      create: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
      },
    });

    return this.getCart(userId);
  }

  async updateItem(userId: string, productId: string, dto: UpdateCartItemDto) {
    const product = await this.ensureActiveProduct(productId);

    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (!existing) {
      throw new NotFoundException('Cart item not found');
    }

    if (dto.quantity > product.stock) {
      throw new BadRequestException('Requested quantity exceeds current stock');
    }

    await this.prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId } },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.prisma.cartItem.delete({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      return { userId, items: [], totalCents: 0 };
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { userId, items: [], totalCents: 0 };
  }
}
