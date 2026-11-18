import { Injectable } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { Subject } from "../subjects/subjects.service";
import { Frequency } from "../reports/statistics";

@Injectable()
export class RankingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async report(year: number, subjects: Subject[], english: boolean) {
    const columns = subjects.map((subject) => Prisma.raw(subject.column));
    const total = Prisma.join(columns, " + ");
    const eligibility = Prisma.join(
      columns.map((column) => Prisma.sql`${column} IS NOT NULL`),
      " AND ",
    );
    const eligible = Prisma.sql`SELECT registration_number, ${Prisma.join(columns)}, (${total}) AS total
      FROM exam_results WHERE exam_year = ${year} AND ${eligibility}
      ${english ? Prisma.sql`AND foreign_language_code = 'N1'` : Prisma.empty}`;
    const [frequencies, top] = await this.prisma.$transaction([
      this.prisma.$queryRaw<Frequency[]>`WITH eligible AS (${eligible})
        SELECT total::float8 AS score, COUNT(*)::int AS count FROM eligible GROUP BY total`,
      this.prisma.$queryRaw<
        { sbd: string; scores: number[]; total: number }[]
      >`WITH eligible AS (${eligible})
        SELECT registration_number AS sbd, ARRAY[${Prisma.join(columns.map((column) => Prisma.sql`${column}::float8`))}] AS scores,
          total::float8 AS total FROM eligible ORDER BY total DESC, registration_number ASC LIMIT 10`,
    ]);
    return { frequencies, top };
  }
}
