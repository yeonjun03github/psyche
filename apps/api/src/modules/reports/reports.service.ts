import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserService } from '../../common/current-user/current-user.service';
import { PersonModelBuilderService } from '../integration/person-model-builder.service';
import { REPORT_GENERATION_QUEUE } from './queue/report-generation.queue';
import type { ReportGenerationJobData } from './queue/report-generation.processor';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currentUser: CurrentUserService,
    private readonly personModelBuilder: PersonModelBuilderService,
    @InjectQueue(REPORT_GENERATION_QUEUE) private readonly queue: Queue<ReportGenerationJobData>,
  ) {}

  /** 어떤 검사의 어떤 응시 결과로 리포트가 만들어질지 미리 보여준다(생성 전 확인용). */
  async preview() {
    const userId = await this.currentUser.getUserId();
    return this.personModelBuilder.preview(userId);
  }

  async create(acknowledgeDateSpanWarning = false) {
    const userId = await this.currentUser.getUserId();
    // 서버가 다시 검증한다 — 필수 7종 미완료거나 날짜 간격 경고를 확인하지 않았으면 예외를 던진다.
    const personModel = await this.personModelBuilder.build(userId, { acknowledgeDateSpanWarning });

    const report = await this.prisma.aIReport.create({
      data: { userId, personModelId: personModel.id, status: 'PENDING' },
    });

    await this.queue.add(
      'generate',
      { reportId: report.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return report;
  }

  async findOne(id: string) {
    const userId = await this.currentUser.getUserId();
    const report = await this.prisma.aIReport.findUnique({ where: { id } });
    if (!report || report.userId !== userId) {
      throw new NotFoundException('리포트를 찾을 수 없습니다.');
    }
    return report;
  }

  async findAll() {
    const userId = await this.currentUser.getUserId();
    return this.prisma.aIReport.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async remove(id: string) {
    // findOne이 소유권 검증까지 해준다 — 여기서 다시 조회해 존재/소유 여부를 확인한다.
    await this.findOne(id);
    await this.prisma.aIReport.delete({ where: { id } });
  }
}
