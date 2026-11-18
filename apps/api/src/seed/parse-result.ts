import type { Prisma } from "../generated/prisma/client";
import { SubjectsService } from "../subjects/subjects.service";

export const csvHeaders = [
  "sbd",
  "toan",
  "ngu_van",
  "ngoai_ngu",
  "vat_li",
  "hoa_hoc",
  "sinh_hoc",
  "lich_su",
  "dia_li",
  "gdcd",
  "ma_ngoai_ngu",
];

export function parseResult(
  row: Record<string, string>,
  line: number,
  subjects: SubjectsService,
): Prisma.ExamResultCreateManyInput {
  if (!/^[0-9]{8}$/.test(row.sbd))
    throw new Error(`Invalid registration number at CSV line ${line}.`);
  const result: Prisma.ExamResultCreateManyInput = {
    examYear: 2024,
    registrationNumber: row.sbd,
  };
  for (const subject of subjects.all) {
    const value = row[subject.key];
    if (
      value !== "" &&
      !/^(?:[0-9](?:\.[0-9]{1,2})?|10(?:\.0{1,2})?)$/.test(value)
    ) {
      throw new Error(`Invalid ${subject.key} score at CSV line ${line}.`);
    }
    result[subject.field] = value === "" ? null : value;
  }
  const language = row.ma_ngoai_ngu;
  if (
    (language !== "" && !/^N[1-7]$/.test(language)) ||
    (language === "") !== (row.ngoai_ngu === "")
  ) {
    throw new Error(`Invalid foreign-language code at CSV line ${line}.`);
  }
  result.foreignLanguageCode = language || null;
  return result;
}
