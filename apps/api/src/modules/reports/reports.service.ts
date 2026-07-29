import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserService } from '../../common/current-user/current-user.service';
import { PersonModelBuilderService } from '../integration/person-model-builder.service';
import { diffPersonModels, toPersonModelDiffInput, type PersonModelDiff } from '../integration/domain/person-model-diff';
import { REPORT_GENERATION_QUEUE } from './queue/report-generation.queue';
import type { ReportGenerationJobData } from './queue/report-generation.processor';
import type { CreateReportDto } from './dto/create-report.dto';
import type { UpsertFeedbackDto } from './dto/upsert-feedback.dto';

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

  async create(dto: CreateReportDto) {
    const userId = await this.currentUser.getUserId();
    // 서버가 다시 검증한다 — 필수 7종 미완료거나 날짜 간격 경고를 확인하지 않았으면 예외를 던진다.
    const personModel = await this.personModelBuilder.build(userId, {
      acknowledgeDateSpanWarning: dto.acknowledgeDateSpanWarning,
    });

    const report = await this.prisma.aIReport.create({
      data: { userId, personModelId: personModel.id, status: 'PENDING', context: dto.context },
    });

    await this.queue.add(
      'generate',
      { reportId: report.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    return report;
  }

  /** 소유권 검증 포함 — 다른 서비스 메서드들이 이 메서드로 존재/소유 여부를 확인한다. */
  private async findOwned(id: string) {
    const userId = await this.currentUser.getUserId();
    const report = await this.prisma.aIReport.findUnique({ where: { id } });
    if (!report || report.userId !== userId) {
      throw new NotFoundException('리포트를 찾을 수 없습니다.');
    }
    return report;
  }

  /**
   * 완료된 리포트라면 이전 PersonModel과의 순수 수치 비교를 즉석 계산해 얹는다.
   * 두 PersonModel은 불변 스냅샷이라 매번 계산해도 결과가 같으므로 DB에 저장하지 않는다.
   */
  async findOne(id: string) {
    const report = await this.findOwned(id);
    const comparisonSummary = await this.computeComparisonSummary(report.status, report.personModelId);
    return { ...report, comparisonSummary };
  }

  private async computeComparisonSummary(
    status: string,
    personModelId: string,
  ): Promise<PersonModelDiff | null> {
    if (status !== 'COMPLETED') return null;

    const personModel = await this.prisma.personModel.findUnique({ where: { id: personModelId } });
    const previousId = personModel?.metadata.previousPersonModelId;
    if (!personModel || !previousId) return null;

    const previous = await this.prisma.personModel.findUnique({ where: { id: previousId } });
    if (!previous) return null;

    return diffPersonModels(toPersonModelDiffInput(previous), toPersonModelDiffInput(personModel));
  }

  async findAll() {
    const userId = await this.currentUser.getUserId();
    return this.prisma.aIReport.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  /** 사용자가 해석적 섹션 하나에 남기는 피드백 — 기존 answers 배열 갱신과 동일한 관용구(교체 후 push)를 따른다. */
  async upsertFeedback(id: string, dto: UpsertFeedbackDto) {
    const report = await this.findOwned(id);
    if (report.status !== 'COMPLETED') {
      throw new BadRequestException('완료된 리포트에만 피드백을 남길 수 있습니다.');
    }

    const feedback = report.feedback.filter((f) => f.section !== dto.section);
    feedback.push({ section: dto.section, verdict: dto.verdict, note: dto.note ?? null, updatedAt: new Date() });

    return this.prisma.aIReport.update({ where: { id }, data: { feedback } });
  }

  async remove(id: string) {
    // findOwned가 소유권 검증까지 해준다 — 여기서 다시 조회해 존재/소유 여부를 확인한다.
    await this.findOwned(id);
    await this.prisma.aIReport.delete({ where: { id } });
  }
}
