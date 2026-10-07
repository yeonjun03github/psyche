import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { computeScoreRanges } from '../integration/domain/test-score-view';
import { TestDefinitionsService } from './test-definitions.service';

@ApiTags('tests')
@Controller('tests')
export class TestDefinitionsController {
  constructor(private readonly testDefinitionsService: TestDefinitionsService) {}

  @Get()
  findAll() {
    return this.testDefinitionsService.findAll();
  }

  /** 정의 전체에 더해, 응시 결과 화면이 원점수를 범위와 함께 보여줄 수 있도록 점수 범위를 유도해 내려준다. */
  @Get(':code')
  async findOne(@Param('code') code: string) {
    const definition = await this.testDefinitionsService.findByCode(code.toUpperCase());
    return { ...definition, scoreRanges: computeScoreRanges(definition) };
  }
}
