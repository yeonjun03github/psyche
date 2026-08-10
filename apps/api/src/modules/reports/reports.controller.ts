import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpsertFeedbackDto } from './dto/upsert-feedback.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ':id' 라우트보다 먼저 선언해야 'preview'가 :id로 매칭되지 않는다.
  @Get('preview')
  preview() {
    return this.reportsService.preview();
  }

  @Post()
  create(@Body() dto: CreateReportDto) {
    return this.reportsService.create(dto);
  }

  @Get()
  findAll() {
    return this.reportsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Patch(':id/feedback')
  upsertFeedback(@Param('id') id: string, @Body() dto: UpsertFeedbackDto) {
    return this.reportsService.upsertFeedback(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.reportsService.remove(id);
  }

  @Get(':id/chat')
  listChat(@Param('id') id: string) {
    return this.reportsService.listChatMessages(id);
  }

  @Post(':id/chat')
  sendChat(@Param('id') id: string, @Body() dto: SendChatMessageDto) {
    return this.reportsService.sendChatMessage(id, dto);
  }
}
