CREATE TABLE "exam_results" (
  "exam_year" SMALLINT NOT NULL,
  "registration_number" VARCHAR(8) NOT NULL,
  "mathematics" DECIMAL(4,2),
  "literature" DECIMAL(4,2),
  "foreign_language" DECIMAL(4,2),
  "physics" DECIMAL(4,2),
  "chemistry" DECIMAL(4,2),
  "biology" DECIMAL(4,2),
  "history" DECIMAL(4,2),
  "geography" DECIMAL(4,2),
  "civic_education" DECIMAL(4,2),
  "foreign_language_code" VARCHAR(2),
  CONSTRAINT "exam_results_pkey" PRIMARY KEY ("exam_year", "registration_number"),
  CONSTRAINT "registration_number_format" CHECK (registration_number ~ '^[0-9]{8}$'),
  CONSTRAINT "mathematics_range" CHECK ("mathematics" BETWEEN 0 AND 10),
  CONSTRAINT "literature_range" CHECK ("literature" BETWEEN 0 AND 10),
  CONSTRAINT "foreign_language_range" CHECK ("foreign_language" BETWEEN 0 AND 10),
  CONSTRAINT "physics_range" CHECK ("physics" BETWEEN 0 AND 10),
  CONSTRAINT "chemistry_range" CHECK ("chemistry" BETWEEN 0 AND 10),
  CONSTRAINT "biology_range" CHECK ("biology" BETWEEN 0 AND 10),
  CONSTRAINT "history_range" CHECK ("history" BETWEEN 0 AND 10),
  CONSTRAINT "geography_range" CHECK ("geography" BETWEEN 0 AND 10),
  CONSTRAINT "civic_education_range" CHECK ("civic_education" BETWEEN 0 AND 10),
  CONSTRAINT "language_consistency" CHECK (
    (foreign_language IS NULL AND foreign_language_code IS NULL) OR
    (foreign_language IS NOT NULL AND foreign_language_code IS NOT NULL AND foreign_language_code ~ '^N[1-7]$')
  )
);
