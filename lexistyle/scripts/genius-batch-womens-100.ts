/**
 * 천재병렬 — 여성패션 100개 PDP 생성 (4워커 + 1감독)
 *
 * 실행: npm run tsx scripts/genius-batch-womens-100.ts
 * 환경: 로컬 JSON 스토어 (DATABASE_URL= 비움)
 *
 * 1. 100개 한국 패션 더미 데이터 카탈로그 시딩
 * 2. SAMPLE3 ConceptSpec 잠금 → runFactoryBatch (동시성 4)
 * 3. 결과 검증
 */
import {
  upsertCatalogMeta,
  searchCatalog,
  getCatalogById,
} from "../src/lib/catalog/index-store";
import {
  createTemplate,
  updateTemplate,
} from "../src/lib/factory/store";
import { runFactoryBatch } from "../src/lib/factory/engine";
import { localStore } from "../src/lib/local-store";
import { getPdpDocument } from "../src/lib/pdp/generate";
import { sample3ConceptSpec } from "../src/lib/hq/seeds/sample3-style";

/* ========= 1. 100개 여성패션 카탈로그 ========= */

type WomenProduct = {
  slug: string;
  title: string;
  titleKo: string;
  brand: string;
  categoryPath: string[];
  price: number;
  seller: string;
  formHint: string;
};

/**
 * K-패션 에디토리얼 100개 — 각각 고유한 실루엣·소재·컨셉
 */
const WOMEN_PRODUCTS: WomenProduct[] = [
  // === 드레스 (12) ===
  { slug: "wc-floral-midi", title: "Floral Print Chiffon Midi Dress", titleKo: "플로럴 쉬폰 미디 드레스", brand: "SeoulLine", categoryPath: ["women-clothing", "dresses"], price: 42.99, seller: "SeoulLine", formHint: "Floral chiffon midi dress, sheer long sleeves, flowy A-line skirt, romantic garden mood, soft pink and cream floral print" },
  { slug: "wc-wrap-jersey", title: "Wrap Front Jersey Dress", titleKo: "랩 프런트 저지 드레스", brand: "ATELIER 9", categoryPath: ["women-clothing", "dresses"], price: 36.99, seller: "ATELIER 9", formHint: "Wrap front jersey knit dress, v-neck, knee length, soft stretch fabric, body-skimming silhouette, versatile day-to-night" },
  { slug: "wc-bohemian-maxi", title: "Bohemian Print Maxi Dress", titleKo: "보헤미안 맥시 드레스", brand: "Moonsil", categoryPath: ["women-clothing", "dresses"], price: 58.00, seller: "Moonsil", formHint: "Bohemian long maxi dress, earthy abstract print, square neckline, elastic waist, tiered ruffled hem, free-spirit boho style" },
  { slug: "wc-knit-mini", title: "Ribbed Knit Mini Dress", titleKo: "리브 니트 미니 드레스", brand: "SeoulLine", categoryPath: ["women-clothing", "dresses"], price: 32.50, seller: "SeoulLine", formHint: "Ribbed knit mini dress, body-hugging fit, crew neck, short sleeves, stretchy cotton blend, everyday cool-girl silhouette" },
  { slug: "wc-shirt-midi", title: "Shirt-Style Denim Midi Dress", titleKo: "셔츠 스타일 데님 미디 드레스", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "dresses"], price: 48.00, seller: "DAILYSEOUL", formHint: "Shirt-style denim midi dress, button-down front, belted waist, light wash, collar and chest pockets, utility-chic" },
  { slug: "wc-satin-slip", title: "Satin Slip Midi Dress", titleKo: "새틴 슬립 미디 드레스", brand: "ATELIER 9", categoryPath: ["women-clothing", "dresses"], price: 45.00, seller: "ATELIER 9", formHint: "Satin slip midi dress, adjustable thin straps, cowl neckline, charmeuse drape, bias-cut, liquid sheen, evening minimalist" },
  { slug: "wc-lace-midi", title: "Lace Overlay Fit-and-Flare Dress", titleKo: "레이스 오버레이 미디 드레스", brand: "Moonsil", categoryPath: ["women-clothing", "dresses"], price: 54.00, seller: "Moonsil", formHint: "Lace overlay midi dress, fit-and-flare shape, scalloped hem, short puff sleeves, ivory base, romantic bridal shower aesthetic" },
  { slug: "wc-tweed-mini", title: "Tweed Mini Dress with Gold Buttons", titleKo: "트위드 미니 드레스", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "dresses"], price: 62.00, seller: "DAILYSEOUL", formHint: "Chanel-inspired tweed mini dress, gold button closure, crew neck, short sleeves, boucle weave, structured fit, smart-casual Parisian" },
  { slug: "wc-bodycon-knit", title: "Bodycon Ribbed Knit Dress", titleKo: "바디콘 리브 니트 드레스", brand: "SeoulLine", categoryPath: ["women-clothing", "dresses"], price: 28.00, seller: "SeoulLine", formHint: "Bodycon ribbed knit dress, turtleneck, long sleeve, midi length, heavy stretch, second-skin fit, neutral heathered hue" },
  { slug: "wc-smocked-midi", title: "Smocked Waist Midi Dress", titleKo: "스모크 웨이스트 미디 드레스", brand: "ATELIER 9", categoryPath: ["women-clothing", "dresses"], price: 39.00, seller: "ATELIER 9", formHint: "Smocked waist midi dress, puffed long sleeves, square neck, elastic shirred bodice, skirt flow, cottagecore whimsy" },
  { slug: "wc-blazer-dress", title: "Double-Breasted Blazer Dress", titleKo: "더블 브레스티드 블레이저 드레스", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "dresses"], price: 72.00, seller: "DAILYSEOUL", formHint: "Double-breasted blazer dress, notched lapel, structured shoulders, mid-thigh length, belt at waist, power-shoulder office elegance" },
  { slug: "wc-ruffle-mini", title: "Ruffle Hem Mini Dress", titleKo: "러플 헴 미니 드레스", brand: "Moonsil", categoryPath: ["women-clothing", "dresses"], price: 34.00, seller: "Moonsil", formHint: "Ruffle hem mini dress, square neck, short flutter sleeves, tiered ruffled skirt, lightweight linen blend, summer picnic date" },

  // === 상의·블라우스 (14) ===
  { slug: "wc-satin-blouse", title: "Satin Button-Up Blouse", titleKo: "새틴 버튼업 블라우스", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "tops"], price: 38.90, seller: "DAILYSEOUL", formHint: "Satin button-up blouse, pointed collar, long sleeves with french cuffs, pearlized buttons, relaxed fit, cream champagne sheen" },
  { slug: "wc-silk-camisole", title: "Silk Camisole with Lace Trim", titleKo: "실크 레이스 캐미솔", brand: "ATELIER 9", categoryPath: ["women-clothing", "tops"], price: 32.00, seller: "ATELIER 9", formHint: "Silk camisole top, delicate lace trim at neckline, adjustable thin straps, bias cut, liquid charmeuse, layering essential" },
  { slug: "wc-cotton-tee", title: "Organic Cotton Boxy T-Shirt", titleKo: "오가닉 코튼 복숭아 티셔츠", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "tops"], price: 18.90, seller: "DAILYSEOUL", formHint: "Organic cotton boxy t-shirt, crew neck, short sleeves, relaxed oversized fit, garment-dyed matte finish, everyday wardrobe staple" },
  { slug: "wc-striped-blouse", title: "Striped Poplin Blouse", titleKo: "스트라이프 팝린 블라우스", brand: "SeoulLine", categoryPath: ["women-clothing", "tops"], price: 35.00, seller: "SeoulLine", formHint: "Striped poplin blouse, vertical navy-and-white stripes, spread collar, roll-tab sleeves, shirttail hem, preppy classic" },
  { slug: "wc-puff-blouse", title: "Puff-Sleeve Blouse", titleKo: "퍼프 슬리브 블라우스", brand: "ATELIER 9", categoryPath: ["women-clothing", "tops"], price: 29.00, seller: "ATELIER 9", formHint: "Puff-sleeve blouse, elasticated cuffs, v-neck with tie closure, lightweight voile, romantic volume, feminine silhouette" },
  { slug: "wc-linen-shirt", title: "Relaxed Linen Button-Down", titleKo: "리넨 버튼다운 셔츠", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "tops"], price: 42.00, seller: "DAILYSEOUL", formHint: "Relaxed linen button-down shirt, camp collar, short dolman sleeves, natural linen texture, oversized fit, summer effortless chic" },
  { slug: "wc-corset-top", title: "Boned Corset Camisole Top", titleKo: "코르셋 캐미솔 탑", brand: "ATELIER 9", categoryPath: ["women-clothing", "tops"], price: 28.00, seller: "ATELIER 9", formHint: "Boned corset camisole top, satin front panel, lace-up back, underwired cups, sweetheart neckline, going-out statement piece" },
  { slug: "wc-turtleneck-knit", title: "Fine Gauge Turtleneck Knit", titleKo: "가는 게이지 터틀넥 니트", brand: "SeoulLine", categoryPath: ["women-clothing", "tops"], price: 34.00, seller: "SeoulLine", formHint: "Fine gauge turtleneck knit, lightweight merino blend, long sleeves, slim fit, invisible hem, layering essential for cool weather" },
  { slug: "wc-cashmere-cardigan", title: "Cashmere Blend Cardigan", titleKo: "캐시미어 블렌드 가디건", brand: "ATELIER 9", categoryPath: ["women-clothing", "tops"], price: 55.00, seller: "ATELIER 9", formHint: "Cashmere blend open-front cardigan, longline silhouette, ribbed cuffs and hem, mid-weight knit, draped lapel, cozy luxe comfort" },
  { slug: "wc-chunky-cardigan", title: "Chunky Cable Knit Cardigan", titleKo: "청키 케이블 니트 가디건", brand: "Moonsil", categoryPath: ["women-clothing", "tops"], price: 48.50, seller: "Moonsil", formHint: "Chunky cable knit cardigan, oversized fit, wooden toggle buttons, funnel neck, thick wool-acrylic blend, cottage-core warmth" },
  { slug: "wc-vest-top", title: "Tailored Sleeveless Vest", titleKo: "테일러드 베스트", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "tops"], price: 32.00, seller: "DAILYSEOUL", formHint: "Tailored sleeveless vest, v-neck, slim fit, four-button closure, center back vent, suiting fabric, office layering piece" },
  { slug: "wc-off-shoulder", title: "Off-Shoulder Knit Top", titleKo: "오프숄더 니트 탑", brand: "SeoulLine", categoryPath: ["women-clothing", "tops"], price: 26.00, seller: "SeoulLine", formHint: "Off-shoulder knit top, elasticated neckline, long balloon sleeves, ribbed body, soft cotton-acrylic, date-night shoulder-baring" },
  { slug: "wc-asymmetric-blouse", title: "Asymmetric Hem Blouse", titleKo: "비대칭 헴 블라우스", brand: "Moonsil", categoryPath: ["women-clothing", "tops"], price: 36.00, seller: "Moonsil", formHint: "Asymmetric hem blouse, one long side, single breast pocket, curved hemline, light cotton sateen, architectural modern drape" },
  { slug: "wc-ruffle-cami", title: "Ruffle Camisole with Smocked Back", titleKo: "러플 캐미솔", brand: "ATELIER 9", categoryPath: ["women-clothing", "tops"], price: 24.00, seller: "ATELIER 9", formHint: "Ruffle camisole top, gathered front ruffle panel, smocked elastic back, adjustable spaghetti straps, lightweight polyester, breezy summer layer" },

  // === 아우터 (12) ===
  { slug: "wc-oversized-blazer", title: "Oversized Linen Blend Blazer", titleKo: "오버사이즈 리넨 블렌드 블레이저", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "outerwear"], price: 68.00, seller: "DAILYSEOUL", formHint: "Oversized linen blazer, notched lapel, single-button closure, dropped shoulders, patch pockets, natural linen texture, relaxed tailoring" },
  { slug: "wc-cropped-denim", title: "Cropped Denim Jacket", titleKo: "크롭 데님 자켓", brand: "ATELIER 9", categoryPath: ["women-clothing", "outerwear"], price: 55.00, seller: "ATELIER 9", formHint: "Cropped denim jacket, vintage wash, button-front, point collar, chest flap pockets, raw hem, 90s-inspired cropped silhouette" },
  { slug: "wc-trench-coat", title: "Classic Double-Breasted Trench", titleKo: "클래식 더블 트렌치 코트", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "outerwear"], price: 128.00, seller: "DAILYSEOUL", formHint: "Classic double-breasted trench coat, storm flap, epaulettes, buckle cuff straps, cotton gabardine, mid-calf length, timeless waterproof layer" },
  { slug: "wc-wool-long", title: "Wool Blend Long Coat", titleKo: "울 블렌드 롱 코트", brand: "SeoulLine", categoryPath: ["women-clothing", "outerwear"], price: 148.00, seller: "SeoulLine", formHint: "Wool blend long coat, notch lapel, double-breasted front, side slit pockets, midi length, structured shoulder, investment winter piece" },
  { slug: "wc-puffer-short", title: "Short Puffer Jacket", titleKo: "숏 퍼퍼 자켓", brand: "Moonsil", categoryPath: ["women-clothing", "outerwear"], price: 78.00, seller: "Moonsil", formHint: "Short puffer jacket, quilted diamond pattern, stand collar, snap-button front, elasticated cuffs, lightweight nylon fill, cold-weather essential" },
  { slug: "wc-leather-jacket", title: "Faux Leather Moto Jacket", titleKo: "페이크 레더 자켓", brand: "ATELIER 9", categoryPath: ["women-clothing", "outerwear"], price: 82.00, seller: "ATELIER 9", formHint: "Faux leather moto jacket, asymmetric zip front, snap-down lapels, zippered sleeve pockets, quilted shoulder panels, edgy rocker vibe" },
  { slug: "wc-knit-blazer", title: "Knit Blazer Jacket", titleKo: "니트 블레이저", brand: "SeoulLine", categoryPath: ["women-clothing", "outerwear"], price: 58.00, seller: "SeoulLine", formHint: "Knit blazer jacket, open front, no closure, shawl collar, ribbed edges, ponte knit fabric, soft structured drape, smart casual blazer" },
  { slug: "wc-teddy-coat", title: "Teddy Bear Long Coat", titleKo: "테디 베어 롱 코트", brand: "Moonsil", categoryPath: ["women-clothing", "outerwear"], price: 95.00, seller: "Moonsil", formHint: "Teddy bear long coat, shaggy faux shearling, notch lapel, drop shoulder, unlined casual fit, warm cream beige, cozy winter statement" },
  { slug: "wc-mac-trench", title: "Minimalist Mac Trench Coat", titleKo: "미니멀 맥 트렌치", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "outerwear"], price: 118.00, seller: "DAILYSEOUL", formHint: "Minimalist mac trench coat, clean single-breasted line, concealed button placket, minimalist collar, cotton-nylon mix, refined urban layer" },
  { slug: "wc-sherpa-vest", title: "Sherpa Lined Utility Vest", titleKo: "셰르파 베스트", brand: "SeoulLine", categoryPath: ["women-clothing", "outerwear"], price: 42.00, seller: "SeoulLine", formHint: "Sherpa lined utility vest, quilted nylon shell, zip front, multiple cargo pockets, high collar, insulated outdoor layering piece" },
  { slug: "wc-blazer-vest", title: "Double-Faced Tailored Vest", titleKo: "더블 페이스 테일러드 베스트", brand: "ATELIER 9", categoryPath: ["women-clothing", "outerwear"], price: 48.00, seller: "ATELIER 9", formHint: "Double-faced tailored vest, contrasting lapel, single button, hip length, functional front welt pockets, suiting fabric, power layer" },
  { slug: "wc-cape-wrap", title: "Wool Blend Wrap Cape", titleKo: "울 블렌드 랩 케이프", brand: "Moonsil", categoryPath: ["women-clothing", "outerwear"], price: 68.00, seller: "Moonsil", formHint: "Wool blend wrap cape, open front, arm slits, generous draped silhouette, fringed edge, plaid check pattern, dramatic cold-weather elegance" },

  // === 하의 (12) ===
  { slug: "wc-wide-pants", title: "High-Waist Wide Leg Trousers", titleKo: "하이웨이스트 와이드 팬츠", brand: "SeoulLine", categoryPath: ["women-clothing", "bottoms"], price: 35.50, seller: "SeoulLine", formHint: "High-waist wide leg trousers, front pleats, side zip, crease front, fluid twill fabric, floor-skimming length, elongated streamlined silhouette" },
  { slug: "wc-leather-pants", title: "Faux Leather Straight Pants", titleKo: "페이크 레더 스트레이트 팬츠", brand: "ATELIER 9", categoryPath: ["women-clothing", "bottoms"], price: 62.00, seller: "ATELIER 9", formHint: "Faux leather straight leg pants, elastic waist with drawstring, mid-rise, pull-on style, matte pebbled finish, edgy but comfortable vegan leather" },
  { slug: "wc-linen-pants", title: "Relaxed Fit Linen Pants", titleKo: "리넨 팬츠", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "bottoms"], price: 39.90, seller: "DAILYSEOUL", formHint: "Relaxed fit linen pants, elastic waist, side pockets, tapered ankle, natural flax linen, breathable summer essential, effortless vacation vibe" },
  { slug: "wc-midi-skirt", title: "Pleated Satin Midi Skirt", titleKo: "플리츠 새틴 미디 스커트", brand: "SeoulLine", categoryPath: ["women-clothing", "bottoms"], price: 29.99, seller: "SeoulLine", formHint: "Pleated satin midi skirt, knife-edge accordion pleats, elastic waistband, bias-cut drape, liquid sheen, graceful motion, polished minimal" },
  { slug: "wc-denim-wide", title: "Wide Leg Denim Jeans", titleKo: "와이드 레그 데님", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "bottoms"], price: 48.00, seller: "DAILYSEOUL", formHint: "Wide leg denim jeans, high-rise, five-pocket styling, relaxed through hip and thigh, medium indigo wash, 90s-inspired denim revival" },
  { slug: "wc-mini-skirt", title: "Pleated Mini Skirt", titleKo: "플리츠 미니 스커트", brand: "SeoulLine", categoryPath: ["women-clothing", "bottoms"], price: 22.00, seller: "SeoulLine", formHint: "Pleated mini skirt, uniform-style knife pleats, zip fly with button closure, high waist, structured polyester-wool blend, schoolgirl chic" },
  { slug: "wc-cargo-pants", title: "Cargo Parachute Pants", titleKo: "카고 팬츠", brand: "Moonsil", categoryPath: ["women-clothing", "bottoms"], price: 38.00, seller: "Moonsil", formHint: "Cargo parachute pants, elastic waist with drawstring, multiple cargo pockets, tapered leg with zip cuffs, nylon ripstop, utilitarian streetwear" },
  { slug: "wc-slim-jeans", title: "Slim Bootcut Jeans", titleKo: "슬림 부츠컷 진", brand: "ATELIER 9", categoryPath: ["women-clothing", "bottoms"], price: 42.00, seller: "ATELIER 9", formHint: "Slim bootcut jeans, mid-rise, stretch denim, flared hem, classic five-pocket, dark rinse wash, universally flattering leg-lengthening cut" },
  { slug: "wc-culottes", title: "Pleated Culotte Pants", titleKo: "플리츠 큐롯 팬츠", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "bottoms"], price: 32.00, seller: "DAILYSEOUL", formHint: "Pleated culotte pants, wide cropped leg, front zip fly, side seam pockets, light suiting fabric, polished wide-leg short, office summer smart" },
  { slug: "wc-wrap-skirt", title: "Wrap Mini Skirt", titleKo: "랩 미니 스커트", brand: "SeoulLine", categoryPath: ["women-clothing", "bottoms"], price: 26.00, seller: "SeoulLine", formHint: "Wrap mini skirt, adjustable side tie closure, faux wrap detail, stretch cotton poplin, mini length, versatile day-to-night piece" },
  { slug: "wc-ponte-pants", title: "Ponte Knit Straight Pants", titleKo: "폰테 니트 스트레이트 팬츠", brand: "ATELIER 9", categoryPath: ["women-clothing", "bottoms"], price: 34.00, seller: "ATELIER 9", formHint: "Ponte knit straight pants, pull-on elastic waist, faux front fly, scuba-weight double knit, wrinkle resistant, comfortable polished commute" },
  { slug: "wc-denim-skirt", title: "A-Line Denim Mini Skirt", titleKo: "A라인 데님 미니 스커트", brand: "Moonsil", categoryPath: ["women-clothing", "bottoms"], price: 28.00, seller: "Moonsil", formHint: "A-line denim mini skirt, five-pocket styling, button and zip fly, light stonewash, frayed hem, casual vintage-inspired everyday skirt" },

  // === 니트·스웨터 (12) ===
  { slug: "wc-chunky-knit", title: "Chunky Knit Pullover Sweater", titleKo: "청키 니트 풀오버", brand: "ATELIER 9", categoryPath: ["women-clothing", "knitwear"], price: 52.00, seller: "ATELIER 9", formHint: "Chunky knit pullover sweater, crew neck, long sleeves, heavy cable knit stitch, relaxed fit, thick cotton-acrylic blend, cozy cold-weather sweater" },
  { slug: "wc-mohair-cardigan", title: "Soft Mohair Blend Cardigan", titleKo: "모헤어 블렌드 가디건", brand: "ATELIER 9", categoryPath: ["women-clothing", "knitwear"], price: 45.00, seller: "ATELIER 9", formHint: "Soft mohair blend cardigan, open front, long sleeves, fluffy halo texture, lightweight and airy, delicate shimmer, feminine layering piece" },
  { slug: "wc-ribbed-turtleneck", title: "Ribbed Turtleneck Sweater", titleKo: "리브드 터틀넥 스웨터", brand: "SeoulLine", categoryPath: ["women-clothing", "knitwear"], price: 38.00, seller: "SeoulLine", formHint: "Ribbed turtleneck sweater, slim fit, long sleeves, fine vertical rib stitch, stretch cotton blend, second-skin base layer, sleek minimal warmth" },
  { slug: "wc-cable-crew", title: "Cable Knit Crew Neck Sweater", titleKo: "케이블 니트 크루넥", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "knitwear"], price: 48.00, seller: "DAILYSEOUL", formHint: "Cable knit crew neck sweater, chunky Aran cable pattern, ribbed cuffs and hem, relaxed drop shoulder, cream oatmeal hue, heritage preppy" },
  { slug: "wc-fisherman", title: "Fisherman Rib Knit Sweater", titleKo: "피셔맨 리브 니트", brand: "Moonsil", categoryPath: ["women-clothing", "knitwear"], price: 44.00, seller: "Moonsil", formHint: "Fisherman rib knit sweater, boat neck, 3/4 dolman sleeves, deep side slits, heavyweight cotton knit, oversized slouchy fit, artisanal texture" },
  { slug: "wc-argyle-vest", title: "Argyle Knit Vest", titleKo: "아가일 니트 베스트", brand: "SeoulLine", categoryPath: ["women-clothing", "knitwear"], price: 30.00, seller: "SeoulLine", formHint: "Argyle knit vest, diamond pattern, v-neck, sleeveless, ribbed trim, button-front closure, preppy layering piece over blouse or tee" },
  { slug: "wc-cowl-neck", title: "Cowl Neck Oversized Knit", titleKo: "카울넥 오버사이즈 니트", brand: "ATELIER 9", categoryPath: ["women-clothing", "knitwear"], price: 46.00, seller: "ATELIER 9", formHint: "Cowl neck oversized knit, generous draped neckline, dropped shoulder, ribbed hem and cuffs, chunky gauge, cozy relaxed winter essential" },
  { slug: "wc-striped-knit", title: "Striped Breton Knit Top", titleKo: "스트라이프 브르타뉴 니트", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "knitwear"], price: 35.00, seller: "DAILYSEOUL", formHint: "Striped Breton knit top, boat neck, long sleeves, navy and cream horizontal stripes, mid-weight jersey, French marine classic, nautical casual" },
  { slug: "wc-merino-v-neck", title: "Merino V-Neck Sweater", titleKo: "메리노 V넥 스웨터", brand: "SeoulLine", categoryPath: ["women-clothing", "knitwear"], price: 42.00, seller: "SeoulLine", formHint: "Merino v-neck sweater, fine gauge, long sleeves, slim but not tight fit, pure merino wool, soft next-to-skin warmth, refined simple investment" },
  { slug: "wc-bulky-cardigan", title: "Bulky Zip Front Cardigan", titleKo: "벌키 지퍼 가디건", brand: "Moonsil", categoryPath: ["women-clothing", "knitwear"], price: 56.00, seller: "Moonsil", formHint: "Bulky zip front cardigan, full-length zipper, stand collar, side patch pockets, thick chunky knit, relaxed slouchy silhouette, casual street-style" },
  { slug: "wc-poncho-knit", title: "Knit Poncho with Fringe", titleKo: "니트 폰초", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "knitwear"], price: 40.00, seller: "DAILYSEOUL", formHint: "Knit poncho with fringe, open sides, oversized draped rectangle, arm openings, chunky weave, long decorative fringe, boho wrap layer" },
  { slug: "wc-fairisle", title: "Fair Isle Patterned Sweater", titleKo: "페어 아일 패턴 스웨터", brand: "Moonsil", categoryPath: ["women-clothing", "knitwear"], price: 50.00, seller: "Moonsil", formHint: "Fair Isle patterned sweater, crew neck, long sleeves, traditional multi-color yoke pattern, relaxed fit, wool-acrylic blend, festive winter tradition" },

  // === 셋업·점프수트 (10) ===
  { slug: "wc-coord-skirt", title: "Knit Two-Piece Coord Set", titleKo: "니트 투피스 셋업", brand: "SeoulLine", categoryPath: ["women-clothing", "sets"], price: 72.00, seller: "SeoulLine", formHint: "Knit two-piece coord set, cropped sweater + mini skirt, ribbed texture, matching set, elastic skirt waist, coordinated effortless outfit" },
  { slug: "wc-jumpsuit", title: "Sleeveless Wide-Leg Jumpsuit", titleKo: "민소매 와이드 점프수트", brand: "SeoulLine", categoryPath: ["women-clothing", "sets"], price: 48.50, seller: "SeoulLine", formHint: "Sleeveless wide-leg jumpsuit, v-neck, self-tie belt, side pockets, crepe fabric, floor-length wide legs, one-piece dressing at its easiest" },
  { slug: "wc-shorts-set", title: "Linen Blend Shorts Set", titleKo: "리넨 블렌드 쇼츠 셋업", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "sets"], price: 42.00, seller: "DAILYSEOUL", formHint: "Linen blend shorts set, relaxed button-down shirt + elastic waist shorts, matching set, breathable fabric, resort-ready vacation outfit" },
  { slug: "wc-pant-suit", title: "Double-Breasted Pant Suit", titleKo: "더블 브레스티드 팬츠 수트", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "sets"], price: 128.00, seller: "DAILYSEOUL", formHint: "Double-breasted pant suit, blazer + straight trousers, matching suiting fabric, notch lapel, full lining, boardroom command ensemble" },
  { slug: "wc-corset-set", title: "Corset + Mini Skirt Set", titleKo: "코르셋 + 미니 스커트 세트", brand: "ATELIER 9", categoryPath: ["women-clothing", "sets"], price: 52.00, seller: "ATELIER 9", formHint: "Corset + mini skirt set, boned corset top with grommet lacing, matching faux leather mini skirt, going-out co-ord set, club night" },
  { slug: "wc-crochet-set", title: "Crochet Two-Piece Set", titleKo: "크로셰 투피스 세트", brand: "Moonsil", categoryPath: ["women-clothing", "sets"], price: 38.00, seller: "Moonsil", formHint: "Crochet two-piece set, open-stitch crochet crop top + matching mini skirt, handcrafted look, boho beach vibe, lightweight summery set" },
  { slug: "wc-tracksuit", title: "Velour Zip-Up Tracksuit", titleKo: "벨로어 트랙수트", brand: "SeoulLine", categoryPath: ["women-clothing", "sets"], price: 65.00, seller: "SeoulLine", formHint: "Velour zip-up tracksuit, full-zip hoodie + elastic waist sweatpants, soft velour fabric, ribbed cuffs, matching loungewear set, 2000s revival" },
  { slug: "wc-romper", title: "Floral Print Romper", titleKo: "플로럴 롬퍼", brand: "Moonsil", categoryPath: ["women-clothing", "sets"], price: 32.00, seller: "Moonsil", formHint: "Floral print romper, short sleeves, elastic leg openings, v-neck with keyhole, tie belt at waist, all-in-one summer jumpsuit play suit" },
  { slug: "wc-blazer-skirt-set", title: "Tweed Blazer + Skirt Set", titleKo: "트위드 블레이저 + 스커트 세트", brand: "ATELIER 9", categoryPath: ["women-clothing", "sets"], price: 98.00, seller: "ATELIER 9", formHint: "Tweed blazer + mini skirt set, gold button details, boucle weave, fringe trim, matching two-piece, Chanel-inspired smart elegance" },
  { slug: "wc-vest-pants-set", title: "Tailored Vest + Pleated Pants Set", titleKo: "베스트 + 플리츠 팬츠 셋업", brand: "SeoulLine", categoryPath: ["women-clothing", "sets"], price: 82.00, seller: "SeoulLine", formHint: "Tailored vest + pleated pants set, sleeveless v-vest + wide pleated trousers, matching fabric, coordinated office power-dressing duo" },

  // === 스웨트셔츠·후디 (8) ===
  { slug: "wc-cropped-hoodie", title: "Cropped Fleece Hoodie", titleKo: "크롭 플리스 후디", brand: "SeoulLine", categoryPath: ["women-clothing", "sweatshirts"], price: 34.50, seller: "SeoulLine", formHint: "Cropped fleece hoodie, drawstring hood, kangaroo pocket, ribbed hem, soft fleece inside, relaxed crop length, athleisure street-style staple" },
  { slug: "wc-oversized-sweatshirt", title: "Oversized Logo Sweatshirt", titleKo: "오버사이즈 로고 스웨트셔츠", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "sweatshirts"], price: 38.00, seller: "DAILYSEOUL", formHint: "Oversized logo sweatshirt, crew neck, dropped shoulder, ribbed cuffs, front small logo print, brushed fleece interior, slouchy cool-girl comfort" },
  { slug: "wc-zip-hoodie", title: "Full-Zip Fleece Hoodie", titleKo: "풀집 플리스 후디", brand: "Moonsil", categoryPath: ["women-clothing", "sweatshirts"], price: 42.00, seller: "Moonsil", formHint: "Full-zip fleece hoodie, zip front, front pouch pockets, adjustable drawstring hood, mid-weight fleece, everyday layering hoodie" },
  { slug: "wc-graphic-print", title: "Graphic Print Sweatshirt", titleKo: "그래픽 프린트 스웨트셔츠", brand: "ATELIER 9", categoryPath: ["women-clothing", "sweatshirts"], price: 36.00, seller: "ATELIER 9", formHint: "Graphic print sweatshirt, crew neck, oversized fit, abstract back print, soft cotton terry, cropped length, street art inspired statement" },
  { slug: "wc-terry-zip", title: "French Terry Zip Hoodie", titleKo: "프렌치 테리 집업 후디", brand: "SeoulLine", categoryPath: ["women-clothing", "sweatshirts"], price: 44.00, seller: "SeoulLine", formHint: "French terry zip hoodie, two-way zip, side seam pockets, self-fabric hood, ribbed cuffs and hem, heavyweight loopback terry, wardrobe hoodie" },
  { slug: "wc-colorblock-fleece", title: "Colorblock Half-Zip Fleece", titleKo: "컬러블록 하프집 플리스", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "sweatshirts"], price: 48.00, seller: "DAILYSEOUL", formHint: "Colorblock half-zip fleece, high neck, 1/4 zip pullover, contrasting color panels, relaxed athletic fit, outdoor heritage layer" },
  { slug: "wc-sweatshirt-dress", title: "Oversized Sweatshirt Dress", titleKo: "오버사이즈 스웨트셔츠 원피스", brand: "Moonsil", categoryPath: ["women-clothing", "sweatshirts"], price: 40.00, seller: "Moonsil", formHint: "Oversized sweatshirt dress, crew neck, long sleeves, thigh-length, side slits, soft fleece, slouchy one-piece casual comfort dress" },
  { slug: "wc-hooded-vest", title: "Quilted Hooded Gilet Vest", titleKo: "퀼팅 후디 베스트", brand: "SeoulLine", categoryPath: ["women-clothing", "sweatshirts"], price: 36.00, seller: "SeoulLine", formHint: "Quilted hooded gilet vest, sleeveless, zip front, diamond quilt pattern, hood, front zip pockets, lightweight insulated outdoor vest" },

  // === 액티브·레깅스 (6) ===
  { slug: "wc-leggings", title: "High-Waist Compressive Leggings", titleKo: "하이웨이스트 컴프레시브 레깅스", brand: "ATELIER 9", categoryPath: ["women-clothing", "activewear"], price: 28.00, seller: "ATELIER 9", formHint: "High-waist compressive leggings, squat-proof opaque fabric, wide waistband, four-way stretch, moisture-wicking knit, gym-to-street activewear" },
  { slug: "wc-sports-bra", title: "Seamless Racerback Sports Bra", titleKo: "심리스 레이서백 스포츠 브라", brand: "ATELIER 9", categoryPath: ["women-clothing", "activewear"], price: 22.00, seller: "ATELIER 9", formHint: "Seamless racerback sports bra, medium support, removable pads, ribbed band, sweat-wicking yarn, minimalist gym top" },
  { slug: "wc-joggers", title: "Tapered Fleece Joggers", titleKo: "테이퍼드 플리스 조거", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "activewear"], price: 32.00, seller: "DAILYSEOUL", formHint: "Tapered fleece joggers, elastic waist with drawstring, ribbed cuffs, side pockets, soft brushed fleece, relaxed fit, lounge-and-go pant" },
  { slug: "wc-bike-shorts", title: "Cotton Bike Shorts 2-Pack", titleKo: "코튼 바이크 쇼츠 2팩", brand: "SeoulLine", categoryPath: ["women-clothing", "activewear"], price: 24.00, seller: "SeoulLine", formHint: "Cotton bike shorts 2-pack, mid-thigh length, elastic waist, stretch cotton jersey, double pack in black and grey, essential layering short" },
  { slug: "wc-training-top", title: "Mesh Panel Training Top", titleKo: "메쉬 패널 트레이닝 탑", brand: "Moonsil", categoryPath: ["women-clothing", "activewear"], price: 26.00, seller: "Moonsil", formHint: "Mesh panel training top, racerback, cut-out mesh back detail, loose fit, sweat-wicking fabric, gym workout tank, breathable performance" },
  { slug: "wc-yoga-pants", title: "Wide Leg Yoga Pants", titleKo: "와이드 레그 요가 팬츠", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "activewear"], price: 34.00, seller: "DAILYSEOUL", formHint: "Wide leg yoga pants, high-rise waist, floor-grazing wide legs, soft bamboo-cotton blend, gentle drape, studio-to-street flow pant" },

  // === 악세서리 (4) ===
  { slug: "wc-headband", title: "Knitted Chunky Headband", titleKo: "니트 청키 헤드밴드", brand: "Moonsil", categoryPath: ["women-clothing", "accessories"], price: 12.00, seller: "Moonsil", formHint: "Knitted chunky headband, cable knit pattern, wide band, twisted front detail, stretch fit, winter ear warmer accessory" },
  { slug: "wc-belt", title: "Wide Leather Waist Belt", titleKo: "와이드 레더 웨이스트 벨트", brand: "SeoulLine", categoryPath: ["women-clothing", "accessories"], price: 18.00, seller: "SeoulLine", formHint: "Wide leather waist belt, 4cm width, smooth cowhide, single-prong buckle, adjustable holes, black finish, outfit-defining cinch belt" },
  { slug: "wc-scarf", title: "Cashmere Blend Fringed Scarf", titleKo: "캐시미어 블렌드 프린지 스카프", brand: "ATELIER 9", categoryPath: ["women-clothing", "accessories"], price: 28.00, seller: "ATELIER 9", formHint: "Cashmere blend fringed scarf, long rectangular, hand-feel softness, heathered neutral, decorative fringe ends, winter neck wrap" },
  { slug: "wc-gloves", title: "Leather Touchscreen Gloves", titleKo: "레더 터치스크린 장갑", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "accessories"], price: 16.00, seller: "DAILYSEOUL", formHint: "Leather touchscreen gloves, genuine leather palm, knit back, touch-capable fingertips, slim fit, cold-weather smartphone essential" },

  // === 기타 (8) — 채움 ===
  { slug: "wc-bomber", title: "Satin Bomber Jacket", titleKo: "새틴 폭격기 자켓", brand: "Moonsil", categoryPath: ["women-clothing", "outerwear"], price: 58.00, seller: "Moonsil", formHint: "Satin bomber jacket, ribbed collar and cuffs, zip front, front welt pockets, lightweight satin shell, retro varsity silhouette" },
  { slug: "wc-tulle-skirt", title: "Tulle Layered Midi Skirt", titleKo: "튤 레이어드 미디 스커트", brand: "ATELIER 9", categoryPath: ["women-clothing", "bottoms"], price: 38.00, seller: "ATELIER 9", formHint: "Tulle layered midi skirt, multi-layer tulle, elastic waist, floor-length, sheer and voluminous, ethereal ballerina aesthetic" },
  { slug: "wc-corduroy-pants", title: "Wide Corduroy Pants", titleKo: "와이드 코듀로이 팬츠", brand: "SeoulLine", categoryPath: ["women-clothing", "bottoms"], price: 40.00, seller: "SeoulLine", formHint: "Wide corduroy pants, high-waist, vertical wale corduroy, front pleats, side pockets, wide leg, vintage 70s-inspired trouser" },
  { slug: "wc-polo-knit", title: "Polo Collar Knit Top", titleKo: "폴로 칼라 니트 탑", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "tops"], price: 30.00, seller: "DAILYSEOUL", formHint: "Polo collar knit top, short sleeves, two-button placket, ribbed hem, fine gauge cotton knit, preppy summer essential top" },
  { slug: "wc-bandeau", title: "Ribbed Bandeau Crop Top", titleKo: "리브드 반디우 크롭 탑", brand: "Moonsil", categoryPath: ["women-clothing", "tops"], price: 18.00, seller: "Moonsil", formHint: "Ribbed bandeau crop top, strapless, stretch knit, wide banded hem, tube-top silhouette, layering or standalone summer crop" },
  { slug: "wc-bucket-hat", title: "Denim Bucket Hat", titleKo: "데님 버킷 햇", brand: "DAILYSEOUL", categoryPath: ["women-clothing", "accessories"], price: 14.00, seller: "DAILYSEOUL", formHint: "Denim bucket hat, soft cotton denim, stitched brim, unstructured crown, light wash, acessory street-style sun hat" },
  { slug: "wc-tote-bag", title: "Canvas Logo Tote Bag", titleKo: "캔버스 로고 토트백", brand: "SeoulLine", categoryPath: ["women-clothing", "accessories"], price: 16.00, seller: "SeoulLine", formHint: "Canvas logo tote bag, heavy cotton canvas, LEXI logo print, top handles, open top, spacious main compartment, everyday carry-all bag" },
  { slug: "wc-necklace", title: "Minimal Gold Chain Necklace", titleKo: "미니멀 골드 체인 목걸이", brand: "ATELIER 9", categoryPath: ["women-clothing", "accessories"], price: 22.00, seller: "ATELIER 9", formHint: "Minimal gold chain necklace, thin cable chain, 14k gold plated, spring ring clasp, adjustable 16-18 inch, delicate everyday pendant necklace" },
];

/* ========= 2. 카탈로그 시딩 ========= */
const ph = (seed: string) => `https://picsum.photos/seed/${seed}/800/800`;

async function seedCatalog(products: WomenProduct[]) {
  console.log(`[시드] ${products.length}개 카탈로그 upsert 시작`);
  let created = 0;
  let updated = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const extId = `dummy-wc-${1000 + i}`;
    const result = await upsertCatalogMeta({
      supplierCode: "demo-seoul",
      externalId: extId,
      title: p.title,
      categoryPath: p.categoryPath,
      price: p.price,
      currency: "USD",
      stock: 50 + Math.floor(Math.random() * 200),
      primaryThumbUrl: ph(`wc-demo-${i}`),
      sellerName: p.brand,
      sourceUrl: null,
    });
    if (result === "created") created++;
    else if (result === "updated") updated++;
    if ((i + 1) % 20 === 0) {
      console.log(`  진행: ${i + 1}/${products.length} (생성=${created}, 갱신=${updated})`);
    }
  }
  console.log(`  완료: 생성=${created}, 갱신=${updated}`);
  return created + updated;
}

/* ========= 3. 카탈로그 ID 수집 ========= */
async function collectCatalogIds(products: WomenProduct[]): Promise<number[]> {
  const result = await searchCatalog({ limit: 999, supplier: "demo-seoul", scope: "all" });
  // searchCatalog returns { items, nextCursor, total }
  const all = Array.isArray(result) ? result : (result as any).items ?? [];
  console.log(`[수집] searchCatalog items: ${all.length}`);
  const titles = new Set(products.map((p) => p.title));
  const ids = all
    .filter((r: any) => titles.has(r.title) && r.supplierCode === "demo-seoul")
    .map((r: any) => r.id);
  console.log(`[수집] 매칭된 catalog ID: ${ids.length}/${products.length}`);
  return ids;
}

/* ========= 4. SAMPLE3 컨셉 잠금 ========= */
async function lockSample3Concept(products: WomenProduct[]) {
  const concept = sample3ConceptSpec({
    rulesetId: "WOMENS-100-BATCH",
    title: "LEXI 여성패션 컬렉션",
    formHint: "K-fashion womenswear editorial collection, diverse silhouettes from dresses to outerwear, cream paper editorial mood, LEXI brand",
    voiceTag: "SAMPLE3 · WOMENS-100 · 성수 에디토리얼 · brand-forward",
    imagePlan: [
      {
        role: "hero",
        size: "portrait",
        prompt: "Hero fashion editorial for LEXI womenswear collection. Soft morning window light, cream paper mood, K-fashion editorial, brand atmosphere LEXI, no text, 3:4.",
      },
      {
        role: "macro",
        size: "portrait",
        prompt: "Detail of garment texture, stitch, or fabric weave, soft lifestyle light for LEXI lookbook, no logos, no text, 3:4.",
      },
      {
        role: "trust",
        size: "portrait",
        prompt: "Lifestyle wear editorial, warm cafe plaza or soft sunset, daily romance, cream-ink palette, LEXI campaign confidence, no on-screen text, 3:4.",
      },
    ],
  });

  const template = createTemplate({
    name: "여성패션 100개 배치 — SAMPLE3 에디토리얼",
    createdFromPrompt: "성수 에디토리얼, SAMPLE3 풀블리드, 자동 이미지 생성, 100건 천재병렬",
    tokens: concept.tokens,
    blockPlan: concept.blockPlan,
    copyRuleset: concept.copyRuleset,
    imageRecipe: concept.imageRecipe,
    channelTargets: ["lexi"],
    conceptSpec: concept,
  });

  // 잠금 (컨셉 확정)
  updateTemplate(template.id, { locked: true });
  console.log(`[컨셉] 골든 템플릿 확정: id=${template.id}, name=${template.name}`);
  return template.id;
}

/* ========= 5. 감독 검증 ========= */
function printStats(label: string, ok: number, failed: number, skipped: number, total: number) {
  const rate = total > 0 ? ((ok / total) * 100).toFixed(1) : "0.0";
  console.log(`\n=== ${label} ===`);
  console.log(`  전체: ${total} | 성공: ${ok} | 실패: ${failed} | 스킵: ${skipped}`);
  console.log(`  성공률: ${rate}%`);
}

async function verifyGeneratedDocs(catalogIds: number[]) {
  let ok = 0;
  let failed = 0;
  let noDoc = 0;
  const errors: string[] = [];

  for (let i = 0; i < catalogIds.length; i++) {
    const id = catalogIds[i];
    const row = await getCatalogById(id);
    if (!row) { failed++; errors.push(`#${id}: catalog not found`); continue; }
    if (!row.documentId) { noDoc++; continue; }
    const doc = await getPdpDocument(row.documentId);
    if (!doc) { failed++; errors.push(`#${id}: document not found (docId=${row.documentId})`); continue; }
    ok++;
  }

  printStats("검증 결과", ok, failed, noDoc > 0 ? 0 : failed, catalogIds.length);
  if (noDoc > 0) console.log(`  (문서 미생성: ${noDoc}건 — 스킵 또는 처리 대기)`);
  if (errors.length > 0 && errors.length <= 3) {
    console.log("  첫 3개 오류:");
    errors.slice(0, 3).forEach((e) => console.log(`    ${e}`));
  }
  return { ok, failed, noDoc };
}

/* ========= MAIN ========= */
async function main() {
  const startTime = Date.now();
  console.log("╔══════════════════════════════════════╗");
  console.log("║  천재병렬 — 여성패션 100개 PDP 생성   ║");
  console.log("║  4 워커 + 1 감독                      ║");
  console.log("╚══════════════════════════════════════╝\n");

  // Phase 1: 카탈로그 시딩
  console.log("[Phase 1] 카탈로그 데이터 생성");
  await seedCatalog(WOMEN_PRODUCTS);

  // Phase 2: 카탈로그 ID 수집
  console.log("\n[Phase 2] 카탈로그 ID 수집");
  const catalogIds = await collectCatalogIds(WOMEN_PRODUCTS);
  if (catalogIds.length === 0) {
    console.error("카탈로그 ID를 찾을 수 없습니다. 시딩 실패");
    process.exit(1);
  }

  // Phase 3: ConceptSpec 잠금
  console.log("\n[Phase 3] SAMPLE3 컨셉 확정 및 잠금");
  const templateId = await lockSample3Concept(WOMEN_PRODUCTS);

  // Phase 4: runFactoryBatch — 4 워커 천재병렬
  console.log(`\n[Phase 4] 공장 실행 — ${catalogIds.length}건, 동시성 4`);
  console.log("  워커 구성:");
  console.log("  ┌────────────────────────────────────────┐");
  console.log("  │ 감독 (main) → runFactoryBatch 오케스트    │");
  console.log("  │ 워커 1     → processOne(catalogId)      │");
  console.log("  │ 워커 2     → processOne(catalogId)      │");
  console.log("  │ 워커 3     → processOne(catalogId)      │");
  console.log("  │ 워커 4     → processOne(catalogId)      │");
  console.log("  └────────────────────────────────────────┘\n");

  const batch = await runFactoryBatch({
    templateId,
    catalogIds,
    concurrency: 4,
    maxAttempts: 2,
    skipExisting: true,
    locale: "ko",
  });

  console.log(`\n[공장 완료] 배치 ID: ${batch.id}`);
  console.log(`  소요 시간: ${((Date.now() - startTime) / 1000).toFixed(1)}초`);
  printStats("공장 결과", batch.ok, batch.failed, batch.skipped, batch.total);

  // 실패 상세
  if (batch.failed > 0) {
    console.log("\n실패 상세 (최대 5개):");
    const fails = batch.items.filter((i) => i.status === "failed").slice(0, 5);
    for (const f of fails) {
      console.log(`  catalogId=${f.catalogId} error=${f.error ?? "unknown"}`);
    }
  }

  // Phase 5: 감독 검증
  console.log("\n[Phase 5] 감독 검증 — 생성된 문서 일괄 확인");
  const verification = await verifyGeneratedDocs(catalogIds);
  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // 최종 보고
  console.log(`\n${"─".repeat(46)}`);
  console.log("  최종 보고");
  console.log(`${"─".repeat(46)}`);
  console.log(`  대상:        ${WOMEN_PRODUCTS.length}개 여성패션 SKU`);
  console.log(`  워커:        4 (parallel pool)`);
  console.log(`  컨셉:        SAMPLE3 (editorial-fullbleed)`);
  console.log(`  엔진:        template (GEMINI_API_KEY 없음 → 템플릿)`);
  console.log(`  이미지:      mock (IMAGE_PROVIDER 없음)`);
  console.log(`  생성 성공:    ${batch.ok}건`);
  console.log(`  생성 실패:    ${batch.failed}건`);
  console.log(`  스킵:         ${batch.skipped}건`);
  console.log(`  문서 확인:    ${verification.ok}건`);
  console.log(`  소요:        ${totalElapsed}초`);
  console.log(`${"─".repeat(46)}`);

  // 저장 상태
  const s = localStore();
  const docCount = s.pdpDocs?.length ?? 0;
  const catCount = s.catalog?.length ?? 0;
  console.log(`\n로컬 스토어: catalog=${catCount}건, pdpDocs=${docCount}건`);
  console.log(`저장 위치: ${process.env.LOCAL_DATA_DIR || "~/.lexi-local/data/"}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});