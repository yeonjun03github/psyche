import { Module } from '@nestjs/common';
import { TestDefinitionsController } from './test-definitions.controller';
import { TestDefinitionsService } from './test-definitions.service';

@Module({
  controllers: [TestDefinitionsController],
  providers: [TestDefinitionsService],
  exports: [TestDefinitionsService],
})
export class TestDefinitionsModule {}
