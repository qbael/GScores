import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ScoresRepository {
  constructor(private readonly prisma: PrismaService) {}
  find(examYear: number, registrationNumber: string) {
    return this.prisma.examResult.findUnique({
      where: { examYear_registrationNumber: { examYear, registrationNumber } },
    });
  }
}
