import { Module } from '@nestjs/common';
import { PersonModelBuilderService } from './person-model-builder.service';

@Module({
  providers: [PersonModelBuilderService],
  exports: [PersonModelBuilderService],
})
export class IntegrationModule {}
