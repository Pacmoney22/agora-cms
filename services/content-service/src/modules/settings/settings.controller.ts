import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('api/v1/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ── Public endpoints (no auth required) ────────────────────

  @Get('public')
  @ApiOperation({ summary: 'Get browser-safe public settings (no secrets)' })
  @ApiResponse({ status: 200, description: 'Public settings for storefront' })
  async getPublic() {
    return this.settingsService.getPublicSettings();
  }

  @Get('theme/css')
  @Header('Content-Type', 'text/css')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({ summary: 'Get theme as CSS custom properties' })
  @ApiResponse({ status: 200, description: 'CSS custom properties' })
  async getThemeCss() {
    return this.settingsService.getThemeCss();
  }

  // ── Admin endpoints (auth required) ────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all settings (sensitive fields masked)' })
  @ApiResponse({ status: 200, description: 'All settings' })
  async getAll() {
    return this.settingsService.getAll();
  }

  @Get(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get settings by key' })
  @ApiParam({ name: 'key', type: String })
  @ApiResponse({ status: 200, description: 'Settings value' })
  async get(@Param('key') key: string) {
    return this.settingsService.get(key);
  }

  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update settings for a key' })
  @ApiParam({ name: 'key', type: String })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async upsert(
    @Param('key') key: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.settingsService.upsert(key, body);
  }
}
