import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

import { MediaService } from './media.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('media')
@ApiBearerAuth()
@Controller('api/v1/media')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @Roles('editor', 'admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiOperation({
    summary: 'Upload a media file',
    description: 'Images are auto-converted to WebP with responsive variants (thumbnail, medium, large).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'File to upload (max 10MB)' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded with variants generated' })
  @ApiResponse({ status: 400, description: 'No file provided or file too large' })
  async upload(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.mediaService.upload(file as any, req.user?.sub || 'system');
  }

  @Get()
  @ApiOperation({ summary: 'List media files with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'mimeType', required: false, type: String, description: 'Filter by MIME type prefix (e.g., "image")' })
  @ApiResponse({ status: 200, description: 'Paginated list of media files' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('mimeType') mimeType?: string,
  ) {
    return this.mediaService.findAll({ page, limit, mimeType });
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Get a presigned URL for a media file' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Presigned URL' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async getPresignedUrl(@Param('id', ParseUUIDPipe) id: string) {
    const url = await this.mediaService.getPresignedUrl(id);
    return { url };
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media file and all its variants' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.mediaService.delete(id);
  }
}
