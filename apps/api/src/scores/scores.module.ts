import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SubjectsModule } from "../subjects/subjects.module";
import { ScoresController } from "./scores.controller";
import { ScoresRepository } from "./scores.repository";
import { ScoresService } from "./scores.service";

@Module({
  imports: [PrismaModule, SubjectsModule],
  controllers: [ScoresController],
  providers: [ScoresService, ScoresRepository],
})
export class ScoresModule {}
