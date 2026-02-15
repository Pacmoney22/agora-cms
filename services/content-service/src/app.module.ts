import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PagesModule } from './modules/pages/page.module';
import { MediaModule } from './modules/media/media.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { VersionsModule } from './modules/versions/versions.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { RedirectsModule } from './modules/redirects/redirects.module';
import { SeoModule } from './modules/seo/seo.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PassesModule } from './modules/passes/passes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    PagesModule,
    MediaModule,
    TemplatesModule,
    VersionsModule,
    NavigationModule,
    RedirectsModule,
    SeoModule,
    SettingsModule,
    UsersModule,
    PassesModule,
  ],
})
export class AppModule {}
