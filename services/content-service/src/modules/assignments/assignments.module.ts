import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  controllers: [AssignmentsController],
  providers: [
    AssignmentsService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
