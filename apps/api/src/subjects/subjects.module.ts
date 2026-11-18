import { Controller, Get, Module } from "@nestjs/common";
import { SubjectsService } from "./subjects.service";

@Controller("subjects")
class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}
  @Get() list() {
    return this.subjects.all;
  }
}

@Module({
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
