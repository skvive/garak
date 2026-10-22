export type AmazonAuEditorial = {
  title: string;
  bullets: [string, string, string];
  description: string;
};

const entries: Array<[number, string, string, string, string]> = [
  [5796, "LEXI Ivory Linen Drape Two Piece Set for Women", "Asymmetric draped top with a softly structured boat neckline", "Relaxed wide leg trousers create an easy resort-ready silhouette", "Wear the coordinated pieces together or style them separately"],
  [5124, "LEXI Rose Football Graphic Half Zip Hoodie for Women", "Relaxed half zip shape designed for comfortable everyday layering", "Rose pink colour with a bold varsity-inspired football graphic", "Long sleeves and an easy fit suit casual off-duty styling"],
  [5255, "LEXI Sky Blue Keyhole Neck Blouse for Women", "Soft sky blue tone brings a fresh finish to everyday outfits", "Keyhole neckline adds a refined focal detail", "Fluid relaxed shape pairs easily with skirts or tailored trousers"],
  [5023, "LEXI White Crochet Lace Beach Cover Up for Women", "Open crochet lace texture creates a light beach-ready layer", "Relaxed silhouette slips easily over swimwear", "White finish works with colourful or neutral resort styling"],
  [4432, "LEXI Crimson Lace Corset Top for Women", "Crimson lace construction creates a confident statement look", "Corset-inspired fitted shape defines the waistline", "Designed for evening outfits with tailored trousers or skirts"],
  [5720, "LEXI Blush Gauze Wide Leg Pants for Women", "Airy gauze-look texture gives the trousers a soft summer feel", "Wide leg cut offers an easy flowing silhouette", "Blush tone pairs naturally with white, cream and tonal separates"],
  [5105, "LEXI White Embroidered Waterfall Vest for Women", "Embroidered openwork detail adds dimension to the white finish", "Waterfall front creates soft movement through the silhouette", "Light sleeveless layer for dresses, tanks and relaxed separates"],
  [5039, "LEXI Black Fluid Wide Leg Pants for Women", "Fluid wide leg line creates a long clean silhouette", "Versatile black colour moves easily from day to evening", "Relaxed shape pairs with fitted tops, shirts and knitwear"],
  [5104, "LEXI Cobalt Cream Chevron Track Set for Women", "Cobalt and cream colour blocking creates a graphic sporty look", "Coordinated top and trousers make styling effortless", "Relaxed track-inspired fit suits travel and casual days"],
  [3726, "LEXI Taupe Polka Dot Lace Midi Skirt for Women", "Polka dot pattern adds a playful vintage-inspired accent", "Lace detailing brings texture to the taupe palette", "Midi length works with knits, blouses and simple tees"],
  [3652, "LEXI Indigo Contrast Stitch Denim Jumpsuit for Women", "Indigo denim look is defined by graphic contrast stitching", "Short sleeves and flared legs create a balanced one-piece shape", "Statement jumpsuit styling with minimal accessories required"],
  [3663, "LEXI Powder Blue Relaxed Shirt Dress for Women", "Powder blue colour gives the shirt dress a fresh understated mood", "Relaxed long sleeve cut offers an easy drape", "Wear loose or define the waist with a belt"],
  [4785, "LEXI Powder Blue Half Zip Waffle Knit for Women", "Waffle knit texture adds depth to the powder blue finish", "Half zip neckline allows adjustable styling", "Relaxed shape layers comfortably over everyday basics"],
  [3668, "LEXI Emerald Sequin Slip Mini Dress for Women", "Emerald sequin surface catches the light for evening impact", "Slip-inspired mini silhouette keeps the look streamlined", "Designed as a statement piece for parties and special occasions"],
  [5756, "LEXI Ivory Contrast Piping Jacket for Women", "Contrast piping sharpens the clean ivory construction", "Polished jacket shape elevates simple separates", "Easy to style with denim, tailored trousers or a matching skirt"],
  [4624, "LEXI Black Floral Lace Bustier Vest for Women", "Floral lace texture gives the black bustier a refined finish", "Fitted sleeveless shape creates a defined layered silhouette", "Style over an opaque blouse or under a tailored jacket"],
  [5406, "LEXI Black High Rise Performance Bike Shorts for Women", "High rise waistband supports a clean streamlined fit", "Close performance-inspired silhouette allows easy movement", "Black colour coordinates with active and casual wardrobes"],
  [4467, "LEXI Charcoal Tencel Wool Wide Leg Pants for Women", "Fluid charcoal fabric creates an elegant drape", "Wide leg tailoring balances comfort with a polished line", "A versatile foundation for office and evening outfits"],
  [3736, "LEXI AMOR SAINS Oyster Graphic Tee for Women", "Oyster graphic and AMOR SAINS lettering create an editorial focal point", "Relaxed short sleeve shape suits everyday layering", "Easy statement tee for denim, skirts and casual tailoring"],
  [6112, "LEXI White Airy Wrap Beach Cover Up for Women", "Light wrap construction layers easily over swimwear", "White finish creates a clean resort-ready look", "Adjustable styling suits poolside and beach outfits"],
  [6135, "LEXI Ivory Smocked Fluid Maxi Skirt for Women", "Smocked waist offers a flexible comfortable fit", "Fluid maxi length creates soft movement", "Ivory colour works with tonal tops and natural accessories"],
  [6133, "LEXI Light Khaki Patch Pocket Tailored Shorts for Women", "Tailored short silhouette keeps the relaxed khaki tone polished", "Patch pockets add a practical visual detail", "High rise shape pairs with shirts, tanks and lightweight knits"],
  [6132, "LEXI Black Seamless Knee Length Slip Dress for Women", "Minimal slip silhouette creates a clean modern line", "Knee length cut makes the black dress easy to layer", "A versatile base for day, evening and travel styling"],
  [6131, "LEXI White High Rise Pleated Tailored Shorts for Women", "Front pleats give the white shorts a refined tailored shape", "High rise waist creates a balanced silhouette", "Pair with blouses, tanks or a relaxed blazer"],
  [6130, "LEXI Heather Grey Lace Bow Cardigan for Women", "Lace trim and bow details soften the heather grey knit", "Button-front cardigan shape supports flexible layering", "A feminine everyday piece for skirts, denim and dresses"],
  [5481, "LEXI Olive Smocked Fluid Maxi Dress for Women", "Smocked detailing defines the relaxed olive silhouette", "Fluid maxi length creates easy movement", "An understated dress for warm weather and holiday styling"],
  [5513, "LEXI Emerald Dot Airy V Neck Blouse for Women", "Emerald dot pattern brings colour and movement to the blouse", "Airy V neckline keeps the silhouette light", "Relaxed shape styles easily with denim or tailored bottoms"],
  [5650, "LEXI Off White Ruffle Tie Gauze Blouse for Women", "Ruffle tie neckline creates a soft romantic focal point", "Gauze-look texture adds an airy off-white finish", "Relaxed long sleeves suit layered and standalone styling"],
  [6061, "LEXI Dove Floral Mulberry Silk Midi Dress for Women", "Dove floral print gives the midi dress a refined soft palette", "Fluid silhouette drapes elegantly through the body", "A polished choice for events, dinners and special occasions"],
  [6090, "LEXI Oatmeal Plush Wide Leg Lounge Pants for Women", "Plush oatmeal texture creates a warm relaxed feel", "Wide leg shape supports comfortable movement", "Designed for elevated lounging, travel and casual days"],
];

export const AMAZON_AU_PAGE2_CONTENT = new Map<number, AmazonAuEditorial>(
  entries.map(([catalogId, title, a, b, c]) => [
    catalogId,
    {
      title,
      bullets: [a, b, c],
      description: `${title} is part of the LEXI curated womenswear edit. ${a}. ${b}. ${c}. Please review the product images and available options before ordering.`,
    },
  ]),
);

export function getAmazonAuPage2Content(catalogId?: number | null) {
  return catalogId == null ? undefined : AMAZON_AU_PAGE2_CONTENT.get(catalogId);
}
