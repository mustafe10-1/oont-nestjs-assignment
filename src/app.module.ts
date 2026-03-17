import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { ProductModule } from './products/products.module';
import { CategoryModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './orders/orders.module';

@Module({
  imports: [PrismaModule, ProductModule, CategoryModule, CartModule, OrderModule],
})
export class AppModule {}
