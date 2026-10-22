$prompt = @'
Create one premium editorial ecommerce full-body hero photograph. The FIRST reference is the immutable product truth: reproduce exactly the same ivory natural linen two-piece set, including the wide boat neckline, oversized poncho-like asymmetrical draped top, elbow-length wide sleeves, high-low pointed side hems, visible linen weave, and matching very wide straight-leg trousers. Do not add a jacket, buttons, belt, print, pockets, or change the silhouette. The SECOND reference is the AMBA model identity: preserve her facial identity and natural Korean features. Show the same woman standing head-to-toe with both shoes visible, centered, with generous clean headroom above the hair so the face and head are never cropped. Calm luxury resort editorial pose, warm limestone architectural background, soft directional daylight, realistic garment folds and fabric texture, neutral color grading, no text, no logo, no collage.
'@

$negative = 'cropped head, cropped hair, cut off feet, close-up, different garment, blazer, jacket, buttons, belt, print, colored fabric, tight pants, extra limbs, deformed hands, duplicate person, text, watermark, logo'

& bl image edit `
  --config singapore-workspace `
  --image 'https://cj-product-center.oss-accelerate.aliyuncs.com/supplier/1688/1ffca10a-9bb2-414a-8e82-9ef75f16bcdd.jpg' `
  --image 'https://style.lexid.site/casts/amba/0382_EA_KR_F_A1/face.webp' `
  --prompt $prompt `
  --negative-prompt $negative `
  --model qwen-image-2.0-pro `
  --size '3:4' `
  --n 1 `
  --seed 5796 `
  --prompt-extend false `
  --watermark false `
  --out-dir 'tmp/pdp-generated/fashion-women-page2/01-5796' `
  --out-prefix hero `
  --output json `
  --timeout 600

exit $LASTEXITCODE
