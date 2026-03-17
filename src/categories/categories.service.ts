import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  getCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async getCategoryProducts(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.product.findMany({
      where: { categoryId: id, deletedAt: null, stock: { gt: 0 } },
      orderBy: { name: 'asc' },
    });
  }
}
