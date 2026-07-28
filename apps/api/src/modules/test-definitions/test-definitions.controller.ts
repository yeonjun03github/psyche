import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TestDefinitionsService } from './test-definitions.service';

@ApiTags('tests')
@Controller('tests')
export class TestDefinitionsController {
  constructor(private readonly testDefinitionsService: TestDefinitionsService) {}

  @Get()
  findAll() {
    return this.testDefinitionsService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.testDefinitionsService.findByCode(code.toUpperCase());
  }
}
