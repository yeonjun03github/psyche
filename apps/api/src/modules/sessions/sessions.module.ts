import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { TestDefinitionsModule } from '../test-definitions/test-definitions.module';

@Module({
  imports: [TestDefinitionsModule],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
