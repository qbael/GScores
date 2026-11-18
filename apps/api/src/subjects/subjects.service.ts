import { BadRequestException, Injectable } from "@nestjs/common";

export class Subject {
  constructor(
    readonly key: string,
    readonly name: string,
    readonly short: string,
    readonly field:
      | "mathematics"
      | "literature"
      | "foreignLanguage"
      | "physics"
      | "chemistry"
      | "biology"
      | "history"
      | "geography"
      | "civicEducation",
    readonly column: string,
  ) {}

  toJSON() {
    return { key: this.key, name: this.name, short: this.short };
  }
}

@Injectable()
export class SubjectsService {
  readonly all = [
    new Subject("toan", "Mathematics", "Math", "mathematics", "mathematics"),
    new Subject(
      "ngu_van",
      "Literature",
      "Literature",
      "literature",
      "literature",
    ),
    new Subject(
      "ngoai_ngu",
      "Foreign Language",
      "Foreign lang.",
      "foreignLanguage",
      "foreign_language",
    ),
    new Subject("vat_li", "Physics", "Physics", "physics", "physics"),
    new Subject("hoa_hoc", "Chemistry", "Chemistry", "chemistry", "chemistry"),
    new Subject("sinh_hoc", "Biology", "Biology", "biology", "biology"),
    new Subject("lich_su", "History", "History", "history", "history"),
    new Subject("dia_li", "Geography", "Geography", "geography", "geography"),
    new Subject(
      "gdcd",
      "Civic Education",
      "Civics",
      "civicEducation",
      "civic_education",
    ),
  ];

  get(key: string): Subject {
    const subject = this.all.find((s) => s.key === key || s.field === key);
    if (!subject) throw new BadRequestException("Unknown subject.");
    return subject;
  }
}
