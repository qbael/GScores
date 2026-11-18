import { Controller, Get, Module, Param, Query } from "@nestjs/common";
import { YearPipe } from "../common/year.pipe";
import { PrismaModule } from "../prisma/prisma.module";
import { SubjectsModule } from "../subjects/subjects.module";
import { RankingsRepository } from "./rankings.repository";
import { RankingsService } from "./rankings.service";

@Controller()
class RankingsController {
  constructor(private readonly rankings: RankingsService) {}
  @Get("combinations") list() {
    return this.rankings.combinations;
  }
  @Get("reports/combinations/:code")
  report(@Param("code") code: string, @Query("year", YearPipe) year: number) {
    return this.rankings.report(year, code);
  }
}

@Module({
  imports: [PrismaModule, SubjectsModule],
  controllers: [RankingsController],
  providers: [RankingsService, RankingsRepository],
  exports: [RankingsService],
})
export class RankingsModule {}
