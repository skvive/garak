# AMBA Models Documentation

## Overview

AMBA (AI Ambassador) is LEXI's AI model database used for SAMPLE3 PDP pages. The registry contains **88 models** from diverse backgrounds.

## Data Location

- **Registry JSON**: `amba/registry.json` (122KB)
- **Public Images**: `public/amba/LexI-STYLE-*/` (model photos by collection)
- **Source Repo**: https://github.com/shinkangteam/ambassador-ai-site

## Statistics (as of 2026-09-04)

| Metric | Value |
|--------|-------|
| Total Models | 88 |
| Female (여성) | 72 (81.8%) |
| Male (남성) | 16 (18.2%) |
| Nationalities | 26 unique |
| Styles | 7 types |

### Style Distribution

| Style Code | Label | Count |
|------------|-------|-------|
| STU | Studio | 27 |
| STR | Street | 15 |
| FML | Formal | 12 |
| SPO | Active | 10 |
| BTY | Beauty | 8 |
| HIG | Editorial | 8 |
| OUT | Outdoor | 8 |

## Data Structure

### AMBAModel Schema

```typescript
interface AMBAModel {
  id: string;              // ex: "amba-0386"
  lookbookId: string;      // ex: "0386"
  packageId: string;       // ex: "LEXI-STYLE-2026-01"
  filename: string;        // file name
  path: string;            // local path
  publicPath: string;      // web path (/amba/...)
  ethnicity: string;       // ethnic code (MX, WE, SE, etc.)
  ethnicityLabel: string;  // full label
  nationality: string;     // ISO code (US, CA, VN)
  nationalityLabel: string; // Korean name (미국, 캐나다, 베트남)
  sex: "M" | "F";
  gender: "남성" | "여성";
  age_band: string;        // e.g., A1, M0
  style: "STU" | "HIG" | ...;
  faceSeed: string;        // URL for facial reference
  name: string;            // Combined Korean·English name
  nameKo: string;          // Korean name only
  nameEn: string;          // English name only
  interests: string[];     // e.g., ["테일러드 수트", "카페 산책"]
  modelCast: ModelCastInfo;
}
```

## API Access

### GET `/api/hq/amba/models`

Returns all AMBA models with statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "registry": {
      "sourceRepo": "...",
      "agency": "AMBA",
      "generatedAt": "2026-09-04T22:40:39.839Z",
      "count": 88
    },
    "models": [...],
    "stats": {
      "totalCount": 88,
      "byGender": {"여성": 72, "남성": 16},
      "nationalities": 26,
      "byStyle": {...}
    }
  }
}
```

## TypeScript Utilities

Located at: `src/lib/pdp/amba-models.ts`

### Key Functions

- `loadAmbaRegistry()` - Load registry JSON synchronously
- `listAmbaModels()` - Get all models (cached)
- `findAmbaModelById(id)` - Find by ID
- `filterBySex(models, "F"/"M")` - Filter by sex
- `filterByGender(models, "남성"/"여성")` - Filter by gender
- `filterByNationality(models, countryCode)` - Filter by country code
- `filterByNationalityLabel(models, "미국")` - Filter by country name
- `filterByStyle(models, "STU")` - Filter by style code
- `searchModels(models, query)` - Search by name/nationality
- `getAllGenders(models)` - List unique genders
- `getAllNationalities(models)` - List unique country codes
- `getAllNationalityLabels(models)` - List unique country names
- `getAllStyles(models)` - List unique styles
- `getModelStats(models)` - Aggregate statistics

### Example Usage

```typescript
import { listAmbaModels, filterBySex, getAllNationalities } from "@/lib/pdp/amba-models";

// Get all female models
const femaleModels = filterBySex(listAmbaModels(), "F");

// Get unique nationalities
const nations = getAllNationalities(listAmbaModels());
// Returns: ["BR", "CA", "FR", "GB", "KR", ...]

// Find specific model
const model = findAmbaModelById("amba-0386");
console.log(model.name); // "예린 · Ivy Brooks"
```

## Image Path Mapping

| Source Registry | Public URL |
|-----------------|------------|
| `amba/models/kcci-submission/LEXI-STYLE-2026-01/images/...` | `/amba/LEXI-STYLE-2026-01/...` |

The registry stores both absolute local paths and web-relative paths (`publicPath`). Use `publicPath` for Next.js `<Image>` components.

## Related Pages

- **Model Gallery**: `src/app/[lng]/amba/page.tsx`
- **Sample3 PDP Integration**: Uses `modelCast` for cast info
- **Marketing Assets**: Can be used with fal.ai FLUX schnell for image generation

## Testing

Run the test script:
```bash
node scripts/test-amba-registry.mjs
```

Expected output:
- ✅ 88 models loaded
- ✅ 72 female, 16 male
- ✅ 26 nationalities
- ✅ All styles represented

## Future Enhancements

1. Sync images from registry to Vercel edge storage
2. Add facial feature tags for AI generation prompts
3. Support multiple poses per model (S1 Hero, S2 Detail, S3 Desire)
4. Add model availability status (active/inactive)
5. Track model usage across PDP exports