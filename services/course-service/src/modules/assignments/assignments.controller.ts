import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CourseAdminGuard } from '../../common/guards/course-admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { AssignmentsService } from './assignments.service';
import { CreateInstructorAssignmentDto } from './dto/create-instructor-assignment.dto';

@ApiTags('Instructor Assignments')
@ApiBearerAuth()
@Controller('api/v1/assignments/instructors')
@UseGuards(JwtAuthGuard, CourseAdminGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Assign instructor to course section (Admin/Course Admin only)' })
  async createInstructorAssignment(
    @Body() dto: CreateInstructorAssignmentDto,
    @Request() req: any,
  ) {
    return this.assignmentsService.createInstructorAssignment(dto, req.user.sub);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all instructor assignments for a user' })
  async getInstructorAssignmentsByUser(@Param('userId') userId: string) {
    return this.assignmentsService.getInstructorAssignmentsByUser(userId);
  }

  @Get('section/:sectionId')
  @ApiOperation({ summary: 'Get all instructors assigned to a section' })
  async getInstructorAssignmentsBySection(@Param('sectionId') sectionId: string) {
    return this.assignmentsService.getInstructorAssignmentsBySection(sectionId);
  }

  @Delete(':assignmentId')
  @ApiOperation({ summary: 'Remove instructor assignment' })
  async deleteInstructorAssignment(@Param('assignmentId') assignmentId: string) {
    return this.assignmentsService.deleteInstructorAssignment(assignmentId);
  }
}
