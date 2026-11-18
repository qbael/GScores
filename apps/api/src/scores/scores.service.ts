import { Injectable, NotFoundException } from "@nestjs/common";
import { ScoresRepository } from "./scores.repository";

@Injectable()
export class ScoresService {
  constructor(private readonly repository: ScoresRepository) {}
  async get(year: number, registrationNumber: string) {
    const result = await this.repository.find(year, registrationNumber);
    if (!result) throw new NotFoundException("Registration number not found.");
    return result;
  }
}
