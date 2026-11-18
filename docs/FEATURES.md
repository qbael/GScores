# G-Scores: Features

References: [Assignment](../README.md), [2024 dataset](../data/diem_thi_thpt_2024.csv), [UI mockup](../mockup-ui.png), [architecture](ARCHITECTURE.md).

UI design: [interactive prototype, screen inventory, and states](design/README.md). This is a design artifact, not an implemented application.

## 1. Requirements

| Feature | Priority | Acceptance criteria |
|---|---|---|
| CSV import | Required | Commit the conversion code. On startup, a seed service checks `exam_results`: import the provided CSV atomically if empty; otherwise skip. Validate source data and finish before accepting requests. No separate Prisma model or table stores import metadata. |
| Score lookup | Required | Accept an eight-digit registration number, preserve leading zeros, and return all available subject scores. Distinguish invalid input, not found, loading, and server errors. Display missing scores as “Not taken / unavailable,” never zero. |
| Four-level subject report | Required | Show counts and a chart for all nine subjects using the four score levels defined below. |
| Overview dashboard | Required | Open on the dashboard with dataset totals, subject statistics, score-level counts, a selected subject histogram, and a selected combination's top-10 preview. |
| Combination reports and top 10 | Required | Support the six combinations defined below. Show eligible count, mean and highest total, total-score histogram, and at most 10 candidates with registration number, individual scores, total, and position. |
| Subject distributions | Required | Provide a 0–10 histogram for each subject using the supplied chart-and-summary layout. Show valid count, mean, median, population standard deviation, and counts of scores equal to 0 and 10 beside it. |
| Technology stack | Required | React with Hooks, NestJS, Tailwind CSS, TypeScript, PostgreSQL, and Prisma. |
| Subject management and validation | Required | Use OOP to manage subjects. Validate forms and business rules in both the browser and server. |
| Monolithic application | Required | One NestJS application owns the business modules and serves the compiled React frontend and REST API. |
| Local execution | Required | Run PostgreSQL with Docker Compose and React/NestJS on the host with `npm run dev`. Node.js 24, npm, Docker Engine, and Docker Compose are required. Full Docker execution remains available. |
| Documentation | Required | Feature and architecture documents, an editable draw.io architecture diagram with icons and component names, and an exported image. |
| Responsive layouts | Optional | Polish desktop, tablet, and mobile layouts. Basic keyboard access, readable charts, and overflow handling are required. |
| Public deployment | Optional | Publish a live application; local Docker execution is sufficient initially. |
| Additional combinations | Optional | Add A02, B08, C01, D09, D14, or D15 only after confirming their definitions and required data. |
| Report export | Optional | Export filtered counts and rankings as CSV, or charts as PNG. |
| Adjustable histogram intervals | Optional | Add 0.25- and 1-point intervals alongside the default 0.5. |
| Percentiles and cumulative distribution | Optional | Add P25/P50/P75/P90 and a cumulative curve. |
| Language-specific reports | Optional | Verify language-code mappings before adding views beyond the required English-based combinations. |

Initial web APIs are read-only; Settings, candidate editing/deletion, role management, and custom combination builders are outside the initial scope.

## 2. Dashboard and navigation

Use the mockup's sidebar and score-lookup form, with the supplied chart-and-summary layout for distributions.

| Route | Content |
|---|---|
| `/` | Dashboard; the initial page. |
| `/scores` | Score lookup. |
| `/reports` | All nine subject reports. |
| `/rankings` | Combination statistics and top 10; default to A00. |

| Dashboard area | Content |
|---|---|
| Header | G-Scores, year 2024, and selected subject/combination. Offer only available years. |
| Summary cards | Total candidates, available subject count, and selected subject's valid count and mean. |
| Subject overview | Valid count, missing count, mean, minimum, and maximum for each subject. |
| Four-level report | Stacked or grouped columns by subject, with explicit score-interval labels. |
| Subject distribution | Selected subject histogram and adjacent summary. |
| Combination overview | Selected combination's eligible count, mean total, highest total, distribution, and top-10 preview. |
| Data state | Source filename and dataset availability derived from score rows. |

Charts require titles, axis labels, tooltips with counts and percentages, and readable tables or accessible text. Do not rely on color alone. Show distinct loading, empty, and error states; failed requests need a retry action.

## 3. Statistical rules

### 3.1 Subjects and missing values

| CSV column | Display name | Valid scores | Missing scores |
|---|---|---:|---:|
| `toan` | Mathematics | 1,045,613 | 15,992 |
| `ngu_van` | Literature | 1,050,101 | 11,504 |
| `ngoai_ngu` | Foreign Language | 912,705 | 148,900 |
| `vat_li` | Physics | 345,615 | 715,990 |
| `hoa_hoc` | Chemistry | 346,518 | 715,087 |
| `sinh_hoc` | Biology | 342,378 | 719,227 |
| `lich_su` | History | 706,214 | 355,391 |
| `dia_li` | Geography | 704,682 | 356,923 |
| `gdcd` | Civic Education | 583,609 | 477,996 |

Dataset baseline: **1,061,605 candidates** with unique eight-digit registration numbers; **268,087** begin with zero. Nonempty scores are numeric and within `[0, 10]`. Mathematics has a maximum of 9.8 and no scores of 10.

- Store empty score cells as `NULL`. A numeric zero is a valid score.
- Each subject's statistical denominator is its own valid-score count, not the total candidate count.
- “Foreign Language” includes multiple language codes. Label it accordingly when aggregating all codes; never label the pooled dataset “English.”
- Keep full precision for calculations and ranking; round displayed means, medians, standard deviations, and percentages to two decimal places.
- Use the population standard deviation: `sqrt(sum((score - mean)^2) / N)`. If `N = 0`, count fields are zero and derived statistics are `null`, displayed as “No data.” If `N = 1`, standard deviation is zero.
- Median is the middle score, or the average of the two middle scores when the valid count is even.

### 3.2 Four score levels

| Level label | Rule |
|---|---|
| Below 4 | `0 <= score < 4` |
| 4 to below 6 | `4 <= score < 6` |
| 6 to below 8 | `6 <= score < 8` |
| 8 to 10 | `8 <= score <= 10` |

The four counts must sum to the subject's valid-score count. Do not interpret these bands as an official graduation pass/fail decision.

### 3.3 Per-subject histogram

- Use **20 bars**, each spanning **0.5 points**: `[0, 0.5)`, `[0.5, 1.0)`, …, `[9.5, 10]`.
- The last interval includes 10; other intervals exclude their upper bound. Score 0 belongs to the first interval.
- X-axis: score interval in ascending order. Y-axis: number of candidates, starting at zero.
- Return all 20 intervals, including those with zero candidates. Their sum must equal the subject's valid-score count.
- Show the year and subject in the title. Show interval, count, and share of valid scores in the tooltip; show bar counts when space permits.
- Use consistent units and interval boundaries across subjects. Derive the summary table from the same filtered population as the bars.

### 3.4 Exam combinations and rankings

| Combination | Required subjects | Additional condition | Eligible candidates in this CSV |
|---|---|---|---:|
| A00 | Mathematics + Physics + Chemistry | All three scores present | 343,800 |
| A01 | Mathematics + Physics + English | `ma_ngoai_ngu = 'N1'` | 328,850 |
| B00 | Mathematics + Chemistry + Biology | All three scores present | 342,291 |
| C00 | Literature + History + Geography | All three scores present | 704,008 |
| D01 | Mathematics + Literature + English | `ma_ngoai_ngu = 'N1'` | 902,723 |
| D07 | Mathematics + Chemistry + English | `ma_ngoai_ngu = 'N1'` | 327,525 |

Definitions: [2024 combination table](https://ttdvk.tdmu.edu.vn/danh-muc/tin-tuc-tdmu/cong-bo-muc-diem-nhan-ho-so-xet-tuyen-theo-ket-qua-thi-tot-nghiep-thpt-nam-2024); English code `N1`: [2024 exam registration guide, section 14](https://thptkontum.edu.vn/tot-nghiep-thpt/Huong-dan-ghi-phieu-Dang-ky-du-thi-tot-nghiep-THPT-2024-1144).

- Total = the unweighted sum of the three subject scores, in `[0, 30]`.
- Require all three scores; zero remains eligible. Exclude incomplete combinations, and never replace missing scores with zero.
- Do not add priority points, admission weighting, or language-certificate substitutions absent from the CSV.
- Sort by total descending, then registration number ascending. Return at most 10 rows; show positions 1–10 and explain that registration number breaks equal totals for display. This is a dataset leaderboard, not an official admission ranking.
- For every combination, show eligible count, mean total, highest total, top 10, and a total-score histogram: 30 one-point intervals `[0, 1)`, …, `[29, 30]`.
- Candidates can qualify for several combinations. Do not add combination counts together to calculate distinct candidates.
