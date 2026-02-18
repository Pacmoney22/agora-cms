import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  controllers: [EventsController],
  providers: [
    EventsService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [EventsService],
})
export class EventsModule {}
