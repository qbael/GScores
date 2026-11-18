import { Injectable } from "@nestjs/common";
import { SubjectsService } from "../subjects/subjects.service";
import { ReportsRepository } from "./reports.repository";
import { statistics } from "./statistics";

@Injectable()
export class ReportsService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly subjects: SubjectsService,
  ) {}

  async levels(year: number) {
    const { total, frequencies } = await this.repository.frequencies(
      year,
      this.subjects.all,
    );
    return {
      year,
      source: "diem_thi_thpt_2024.csv",
      ready: total > 0,
      total,
      subjects: this.subjects.all.map((subject) => {
        const summary = statistics(
          frequencies.filter((row) => row.key === subject.key),
        );
        return {
          ...subject.toJSON(),
          ...summary,
          missing: total - summary.valid,
        };
      }),
    };
  }

  async histogram(year: number, key: string) {
    const subject = this.subjects.get(key);
    const { total, frequencies } = await this.repository.frequencies(year, [
      subject,
    ]);
    const summary = statistics(frequencies);
    return {
      year,
      ...subject.toJSON(),
      ...summary,
      missing: total - summary.valid,
    };
  }
}
