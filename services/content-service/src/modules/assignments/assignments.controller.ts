import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

import { AssignmentsService } from './assignments.service';
import {
  CreateEventStaffAssignmentDto,
  CreateExhibitorAssignmentDto,
  CreateKioskAssignmentDto,
} from './dto/create-assignment.dto';

@ApiTags('Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('api/v1/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // ── Event Staff ────────────────────────────────────────────────────

  @Get('event-staff/user/:userId')
  @ApiOperation({ summary: 'Get event staff assignments for a user' })
  async getEventStaffByUser(@Param('userId') userId: string) {
    return this.assignmentsService.getEventStaffByUser(userId);
  }

  @Post('event-staff')
  @ApiOperation({ summary: 'Assign user as event staff' })
  async createEventStaff(
    @Body() dto: CreateEventStaffAssignmentDto,
    @Request() req: any,
  ) {
    return this.assignmentsService.createEventStaff(dto, req.user.sub);
  }

  @Delete('event-staff/:assignmentId')
  @ApiOperation({ summary: 'Remove event staff assignment' })
  async deleteEventStaff(@Param('assignmentId') assignmentId: string) {
    return this.assignmentsService.deleteEventStaff(assignmentId);
  }

  // ── Exhibitor ──────────────────────────────────────────────────────

  @Get('exhibitors/user/:userId')
  @ApiOperation({ summary: 'Get exhibitor assignments for a user' })
  async getExhibitorsByUser(@Param('userId') userId: string) {
    return this.assignmentsService.getExhibitorsByUser(userId);
  }

  @Post('exhibitors')
  @ApiOperation({ summary: 'Assign user as exhibitor' })
  async createExhibitor(
    @Body() dto: CreateExhibitorAssignmentDto,
    @Request() req: any,
  ) {
    return this.assignmentsService.createExhibitor(dto, req.user.sub);
  }

  @Delete('exhibitors/:assignmentId')
  @ApiOperation({ summary: 'Remove exhibitor assignment' })
  async deleteExhibitor(@Param('assignmentId') assignmentId: string) {
    return this.assignmentsService.deleteExhibitor(assignmentId);
  }

  // ── Kiosk ──────────────────────────────────────────────────────────

  @Get('kiosks/user/:userId')
  @ApiOperation({ summary: 'Get kiosk assignments for a user' })
  async getKiosksByUser(@Param('userId') userId: string) {
    return this.assignmentsService.getKiosksByUser(userId);
  }

  @Post('kiosks')
  @ApiOperation({ summary: 'Assign user as kiosk' })
  async createKiosk(
    @Body() dto: CreateKioskAssignmentDto,
    @Request() req: any,
  ) {
    return this.assignmentsService.createKiosk(dto, req.user.sub);
  }

  @Delete('kiosks/:assignmentId')
  @ApiOperation({ summary: 'Remove kiosk assignment' })
  async deleteKiosk(@Param('assignmentId') assignmentId: string) {
    return this.assignmentsService.deleteKiosk(assignmentId);
  }
}
