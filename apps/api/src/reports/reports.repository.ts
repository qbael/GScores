import { Injectable } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Subject } from "../subjects/subjects.service";
import { Frequency } from "./statistics";

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async frequencies(year: number, subjects: Subject[]) {
    const queries = subjects.map((subject) => {
      const column = Prisma.raw(subject.column);
      return Prisma.sql`SELECT ${subject.key}::text AS key, ${column}::float8 AS score, COUNT(*)::int AS count
        FROM exam_results WHERE exam_year = ${year} AND ${column} IS NOT NULL GROUP BY ${column}`;
    });
    const [total, frequencies] = await this.prisma.$transaction([
      this.prisma.examResult.count({ where: { examYear: year } }),
      this.prisma.$queryRaw<(Frequency & { key: string })[]>(
        Prisma.join(queries, " UNION ALL "),
      ),
    ]);
    return { total, frequencies };
  }
}
