import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SubjectsModule } from "../subjects/subjects.module";
import { RankingsModule } from "../rankings/rankings.module";
import { ReportsController } from "./reports.controller";
import { ReportsRepository } from "./reports.repository";
import { ReportsService } from "./reports.service";

@Module({
  imports: [PrismaModule, SubjectsModule, RankingsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
})
export class ReportsModule {}
