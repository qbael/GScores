import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import { YearPipe } from "../common/year.pipe";
import { SubjectsService } from "../subjects/subjects.service";
import { ScoresService } from "./scores.service";

@Controller("scores")
export class ScoresController {
  constructor(
    private readonly scores: ScoresService,
    private readonly subjects: SubjectsService,
  ) {}

  @Get(":registrationNumber")
  async get(
    @Param("registrationNumber") registrationNumber: string,
    @Query("year", YearPipe) year: number,
  ) {
    if (!/^[0-9]{8}$/.test(registrationNumber))
      throw new BadRequestException(
        "Enter exactly 8 digits, including leading zeros.",
      );
    const result = await this.scores.get(year, registrationNumber);
    return {
      year,
      sbd: result.registrationNumber,
      language: result.foreignLanguageCode,
      scores: this.subjects.all.map((subject) =>
        result[subject.field] === null ? null : Number(result[subject.field]),
      ),
    };
  }
}
