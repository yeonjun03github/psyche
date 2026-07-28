import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { SaveAnswerDto } from './dto/save-answer.dto';

@ApiTags('sessions')
@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('tests/:code/sessions')
  startOrResume(@Param('code') code: string) {
    return this.sessionsService.startOrResume(code);
  }

  @Post('tests/:code/restart')
  restart(@Param('code') code: string) {
    return this.sessionsService.restart(code);
  }

  @Get('sessions')
  findAll() {
    return this.sessionsService.findAll();
  }

  // ':id' 라우트보다 먼저 선언해야 'reset'/'reset-all'이 :id로 매칭되지 않는다.
  @Post('sessions/reset')
  resetInProgress() {
    return this.sessionsService.abandonAllInProgress();
  }

  @Post('sessions/reset-all')
  resetAll() {
    return this.sessionsService.resetAll();
  }

  @Get('sessions/:id')
  findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Patch('sessions/:id/answers')
  saveAnswer(@Param('id') id: string, @Body() dto: SaveAnswerDto) {
    return this.sessionsService.saveAnswer(id, dto);
  }

  @Post('sessions/:id/submit')
  submit(@Param('id') id: string) {
    return this.sessionsService.submit(id);
  }
}
