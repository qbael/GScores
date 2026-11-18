import { Controller, Get, Param, Query } from "@nestjs/common";
import { YearPipe } from "../common/year.pipe";
import { SubjectsService } from "../subjects/subjects.service";
import { RankingsService } from "../rankings/rankings.service";
import { ReportsService } from "./reports.service";

@Controller()
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly subjects: SubjectsService,
    private readonly rankings: RankingsService,
  ) {}
  @Get("reports/levels")
  levels(@Query("year", YearPipe) year: number) {
    return this.reports.levels(year);
  }

  @Get("reports/subjects/:subject/histogram")
  histogram(
    @Param("subject") subject: string,
    @Query("year", YearPipe) year: number,
  ) {
    return this.reports.histogram(year, subject);
  }

  @Get("dashboard")
  async dashboard(
    @Query("year", YearPipe) year: number,
    @Query("subject") subject = "toan",
    @Query("combination") combination = "A00",
  ) {
    const selected = this.subjects.get(subject);
    const [levels, ranking] = await Promise.all([
      this.reports.levels(year),
      this.rankings.report(year, combination),
    ]);
    return {
      ...levels,
      selectedSubject: levels.subjects.find(
        (item) => item.key === selected.key,
      ),
      combination: ranking,
    };
  }
}
