import { BadRequestException, Injectable } from "@nestjs/common";
import { SubjectsService } from "../subjects/subjects.service";
import { RankingsRepository } from "./rankings.repository";
import { statistics } from "../reports/statistics";

export interface Combination {
  key: string;
  subjects: string[];
  english: boolean;
}

@Injectable()
export class RankingsService {
  readonly combinations: Combination[] = [
    { key: "A00", subjects: ["toan", "vat_li", "hoa_hoc"], english: false },
    { key: "A01", subjects: ["toan", "vat_li", "ngoai_ngu"], english: true },
    { key: "B00", subjects: ["toan", "hoa_hoc", "sinh_hoc"], english: false },
    { key: "C00", subjects: ["ngu_van", "lich_su", "dia_li"], english: false },
    { key: "D01", subjects: ["toan", "ngu_van", "ngoai_ngu"], english: true },
    { key: "D07", subjects: ["toan", "hoa_hoc", "ngoai_ngu"], english: true },
  ];
  constructor(
    private readonly repository: RankingsRepository,
    private readonly subjects: SubjectsService,
  ) {}

  async report(year: number, key: string) {
    const combination = this.combinations.find((item) => item.key === key);
    if (!combination) throw new BadRequestException("Unknown combination.");
    const required = combination.subjects.map((code) =>
      this.subjects.get(code),
    );
    const { frequencies, top } = await this.repository.report(
      year,
      required,
      combination.english,
    );
    const summary = statistics(frequencies, 30, 1);
    return {
      year,
      ...combination,
      valid: summary.valid,
      mean: summary.mean,
      max: summary.max,
      bins: summary.bins,
      top: top.map((row, index) => ({ ...row, position: index + 1 })),
    };
  }
}
