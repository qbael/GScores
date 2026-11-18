import { Injectable } from "@nestjs/common";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { parse } from "csv-parse";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SubjectsService } from "../subjects/subjects.service";
import { csvHeaders, parseResult } from "./parse-result";

@Injectable()
export class SeedRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subjects: SubjectsService,
  ) {}

  importIfEmpty(filename: string): Promise<number | null> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20242024)`;
        if ((await tx.examResult.count()) > 0) return null;
        let count = 0;
        let batch: Prisma.ExamResultCreateManyInput[] = [];
        await pipeline(
          createReadStream(filename),
          parse({
            bom: true,
            skip_empty_lines: true,
            columns: (headers: string[]) => {
              if (headers.join(",") !== csvHeaders.join(","))
                throw new Error("Unexpected CSV headers.");
              return headers;
            },
          }),
          async (rows) => {
            for await (const row of rows) {
              batch.push(
                parseResult(
                  row as Record<string, string>,
                  count + 2,
                  this.subjects,
                ),
              );
              count++;
              if (batch.length === 1000) {
                await tx.examResult.createMany({ data: batch });
                batch = [];
              }
            }
            if (batch.length) await tx.examResult.createMany({ data: batch });
          },
        );
        if (count === 0 || (await tx.examResult.count()) !== count)
          throw new Error("CSV import row count mismatch or empty file.");
        return count;
      },
      { maxWait: 600_000, timeout: 600_000 },
    );
  }
}
