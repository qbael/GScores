import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class YearPipe implements PipeTransform {
  transform(value: unknown): number {
    if (value === undefined || value === "2024") return 2024;
    throw new BadRequestException("Only exam year 2024 is supported.");
  }
}
