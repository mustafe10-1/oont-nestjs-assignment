import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { UpsertCartItemDto } from './dto/upsert-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get user cart' })
  getCart(@Param('userId') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post(':userId/items')
  @ApiOperation({ summary: 'Add product to cart' })
  addItem(@Param('userId') userId: string, @Body() dto: UpsertCartItemDto) {
    return this.cartService.addItem(userId, dto);
  }

  @Put(':userId/items/:productId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, productId, dto);
  }

  @Delete(':userId/items/:productId')
  @ApiOperation({ summary: 'Remove cart item' })
  removeItem(@Param('userId') userId: string, @Param('productId') productId: string) {
    return this.cartService.removeItem(userId, productId);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Clear cart' })
  clearCart(@Param('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
