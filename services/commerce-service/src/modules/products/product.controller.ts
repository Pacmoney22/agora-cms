import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import {
  CreateProductDto,
  UpdateProductDto,
  ListProductsQueryDto,
  CreateVariantDto,
  GenerateVariantsDto,
  ConfigureProductDto,
} from './dto/create-product.dto';
import { ProductService } from './product.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('api/v1/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // -------------------------------------------------------------------------
  // Product CRUD
  // -------------------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'List products with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  async list(@Query() query: ListProductsQueryDto) {
    return this.productService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  // -------------------------------------------------------------------------
  // Variants
  // -------------------------------------------------------------------------

  @Get(':id/variants')
  @ApiOperation({ summary: 'List variants for a product' })
  @ApiResponse({ status: 200, description: 'List of variants' })
  async listVariants(@Param('id') id: string) {
    return this.productService.listVariants(id);
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Add a variant to a product' })
  @ApiResponse({ status: 201, description: 'Variant created' })
  async addVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    return this.productService.addVariant(id, dto);
  }

  @Put(':id/variants/:vid')
  @ApiOperation({ summary: 'Update a product variant' })
  @ApiResponse({ status: 200, description: 'Variant updated' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async updateVariant(
    @Param('id') id: string,
    @Param('vid') vid: string,
    @Body() dto: Partial<CreateVariantDto>,
  ) {
    return this.productService.updateVariant(id, vid, dto);
  }

  @Post(':id/variants/generate')
  @ApiOperation({ summary: 'Auto-generate variant combinations from variant attributes' })
  @ApiResponse({ status: 201, description: 'Variants generated' })
  async generateVariants(@Param('id') id: string, @Body() dto: GenerateVariantsDto) {
    return this.productService.generateVariants(id, dto);
  }

  // -------------------------------------------------------------------------
  // Configurable product resolution
  // -------------------------------------------------------------------------

  @Post(':id/configure')
  @ApiOperation({ summary: 'Resolve a configurable product with selected options' })
  @ApiResponse({ status: 200, description: 'Configuration resolved' })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @HttpCode(HttpStatus.OK)
  async configureProduct(@Param('id') id: string, @Body() dto: ConfigureProductDto) {
    return this.productService.configureProduct(id, dto);
  }
}
