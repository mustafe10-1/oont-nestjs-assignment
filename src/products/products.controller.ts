import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products with pagination, search and filtering' })
  getProducts(@Query() query: GetProductsQueryDto) {
    return this.productsService.getProducts(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product details by id' })
  getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }
}
