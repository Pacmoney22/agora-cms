import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AuthModule } from './modules/auth/auth.module';
import { MediaModule } from './modules/media/media.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { PagesModule } from './modules/pages/page.module';
import { PassesModule } from './modules/passes/passes.module';
import { RedirectsModule } from './modules/redirects/redirects.module';
import { SeoModule } from './modules/seo/seo.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { UsersModule } from './modules/users/users.module';
import { VersionsModule } from './modules/versions/versions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    AssignmentsModule,
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
