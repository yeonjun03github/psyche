import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RESET_SCOPES, SessionsService, type ResetScope } from './sessions.service';
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
  resetInProgress(@Query('scope') scope: string = 'essential') {
    // scope를 생략하면 기존 동작(필수 검사)을 유지한다.
    if (!RESET_SCOPES.includes(scope as ResetScope)) {
      throw new BadRequestException('scope는 essential 또는 optional이어야 합니다.');
    }
    return this.sessionsService.abandonInProgress(scope as ResetScope);
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
