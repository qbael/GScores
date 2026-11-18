import { Module } from "@nestjs/common";
import { SubjectsModule } from "./subjects/subjects.module";
import { ScoresModule } from "./scores/scores.module";
import { ReportsModule } from "./reports/reports.module";
import { RankingsModule } from "./rankings/rankings.module";
import { SeedModule } from "./seed/seed.module";

@Module({
  imports: [
    SubjectsModule,
    ScoresModule,
    ReportsModule,
    RankingsModule,
    SeedModule,
  ],
})
export class AppModule {}
