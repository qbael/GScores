import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "node:path";
import { SubjectsModule } from "./subjects/subjects.module";
import { ScoresModule } from "./scores/scores.module";
import { ReportsModule } from "./reports/reports.module";
import { RankingsModule } from "./rankings/rankings.module";
import { SeedModule } from "./seed/seed.module";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "../../../public"),
      exclude: ["/api", "/api/{*path}"],
    }),
    SubjectsModule,
    ScoresModule,
    ReportsModule,
    RankingsModule,
    SeedModule,
  ],
})
export class AppModule {}
