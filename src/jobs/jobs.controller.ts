import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type {} from 'multer';
import { BearerAuthGuard } from './bearer-auth.guard';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@ApiBearerAuth('bearer')
@UseGuards(BearerAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  createJob(@Body() dto: CreateJobDto) {
    return this.jobsService.createJob(dto);
  }

  @Get()
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          job_id: { type: 'string' },
          status: {
            type: 'string',
            enum: ['queued', 'running', 'success', 'failed', 'timeout', 'deleted'],
          },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          return_code: { type: 'integer', nullable: true },
        },
        required: ['job_id', 'status', 'created_at', 'updated_at', 'return_code'],
      },
    },
  })
  listJobs() {
    return this.jobsService.listJobs();
  }

  @Get(':jobId')
  getJob(@Param('jobId') jobId: string) {
    return this.jobsService.getJob(jobId);
  }

  @Post(':jobId/files')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  uploadFile(
    @Param('jobId') jobId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.jobsService.uploadFile(jobId, file);
  }

  @Get(':jobId/artifacts')
  listArtifacts(@Param('jobId') jobId: string) {
    return this.jobsService.listArtifacts(jobId);
  }

  @Get(':jobId/artifact')
  downloadArtifact(
    @Param('jobId') jobId: string,
    @Query('path') artifactPath: string,
    @Res() res: Response,
  ) {
    const file = this.jobsService.getArtifactFile(jobId, artifactPath);
    return res.download(file.absolutePath, file.filename);
  }

  @Delete(':jobId')
  deleteJob(@Param('jobId') jobId: string) {
    return this.jobsService.deleteJob(jobId);
  }
}
