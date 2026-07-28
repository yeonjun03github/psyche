import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TestDefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.testDefinition.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        description: true,
        estimatedMinutes: true,
        license: true,
      },
    });
  }

  async findByCode(code: string) {
    const testDefinition = await this.prisma.testDefinition.findUnique({ where: { code } });
    if (!testDefinition) {
      throw new NotFoundException(`검사 "${code}"를 찾을 수 없습니다.`);
    }
    return testDefinition;
  }
}
