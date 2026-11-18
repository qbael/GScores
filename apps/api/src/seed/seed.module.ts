import {
  Injectable,
  Logger,
  Module,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaModule } from "../prisma/prisma.module";
import { SubjectsModule } from "../subjects/subjects.module";
import { SeedRepository } from "./seed.repository";

@Injectable()
class SeedService implements OnApplicationBootstrap {
  constructor(private readonly repository: SeedRepository) {}
  async onApplicationBootstrap(): Promise<void> {
    const started = Date.now();
    const filename = existsSync("/data/diem_thi_thpt_2024.csv")
      ? "/data/diem_thi_thpt_2024.csv"
      : resolve(__dirname, "../../../../data/diem_thi_thpt_2024.csv");
    try {
      const count = await this.repository.importIfEmpty(filename);
      Logger.log(
        count === null
          ? "Existing exam results found; CSV import skipped."
          : `Imported ${count} results in ${((Date.now() - started) / 1000).toFixed(1)}s.`,
        "Seed",
      );
    } catch {
      throw new Error(
        "CSV import failed; transaction rolled back. Check CSV format and database configuration.",
      );
    }
  }
}

@Module({
  imports: [PrismaModule, SubjectsModule],
  providers: [SeedService, SeedRepository],
})
export class SeedModule {}
