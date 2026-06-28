import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobLogsStore } from './job-logs.store';
import { LogsController } from './logs.controller';
import { JobsService } from './jobs.service';
import { BearerAuthGuard } from './bearer-auth.guard';

@Module({
  controllers: [JobsController, LogsController],
  providers: [JobsService, JobLogsStore, BearerAuthGuard],
})
export class JobsModule {}
