import fs from "node:fs/promises";
import path from "node:path";

const names = {
  BR: { F: ["아나 루이자 · Ana Luiza", "마리아 클라라 · Maria Clara", "가브리엘라 소우자 · Gabriela Souza", "줄리아 코스타 · Júlia Costa", "라리사 올리베이라 · Larissa Oliveira"] },
  MX: { F: ["소피아 에르난데스 · Sofía Hernández", "발렌티나 로메로 · Valentina Romero", "카밀라 나바로 · Camila Navarro", "레히나 토레스 · Regina Torres", "마리아나 카스티요 · Mariana Castillo"] },
  CN: { F: ["린웨이 · Lin Wei", "리우신 · Liu Xin", "천위팅 · Chen Yuting", "장신란 · Zhang Xinran", "저우샤오위 · Zhou Xiaoyu"], M: ["왕하오 · Wang Hao", "리웨이 · Li Wei", "천쥔 · Chen Jun"] },
  KR: { F: ["김서윤 · Kim Seoyun", "이하린 · Lee Harin", "박지우 · Park Jiwoo", "최유나 · Choi Yuna", "정수아 · Jung Sua", "강민서 · Kang Minseo", "윤채원 · Yoon Chaewon", "한예린 · Han Yerin", "송다인 · Song Dain", "임소율 · Lim Soyul", "배나연 · Bae Nayeon", "문채린 · Moon Chaerin"], M: ["윤재하 · Yoon Jaeha", "박서준 · Park Seojun", "오시온 · Oh Sion", "김도윤 · Kim Doyun"] },
  FR: { F: ["클라라 뒤부아 · Clara Dubois", "아멜리 로랑 · Amélie Laurent", "마농 르페브르 · Manon Lefèvre", "쥘리에트 모로 · Juliette Moreau", "카미유 베르나르 · Camille Bernard"], M: ["루이 마르탱 · Louis Martin", "가브리엘 뒤부아 · Gabriel Dubois"] },
  GB: { F: ["올리비아 베넷 · Olivia Bennett", "아멜리아 클라크 · Amelia Clarke", "플로렌스 테일러 · Florence Taylor", "이모젠 라이트 · Imogen Wright", "소피 해리스 · Sophie Harris"] },
  TH: { F: ["핌차녹 수완 · Pimchanok Suwan", "차니다 웡 · Chanida Wong", "나라 차이야 · Nara Chaiya", "수파사라 림 · Supassara Lim", "라린 시리폰 · Lalin Siriporn"] },
  US: { F: ["에이버리 브룩스 · Avery Brooks", "마야 존슨 · Maya Johnson", "클로이 카터 · Chloe Carter", "하퍼 윌슨 · Harper Wilson", "조이 파커 · Zoe Parker", "나오미 리드 · Naomi Reed", "릴리 모건 · Lily Morgan", "아리아 콜린스 · Aria Collins", "그레이스 터너 · Grace Turner", "엘라 베넷 · Ella Bennett", "매디슨 스콧 · Madison Scott", "시드니 헤이스 · Sydney Hayes"], M: ["이선 카터 · Ethan Carter", "노아 브룩스 · Noah Brooks", "메이슨 리드 · Mason Reed", "루카스 헤이스 · Lucas Hayes"] },
  KE: { F: ["아마라 완지쿠 · Amara Wanjiku", "자와디 아킨이 · Zawadi Akinyi", "니아 은제리 · Nia Njeri"] },
  ES: { F: ["루시아 가르시아 · Lucía García", "마르티나 루이스 · Martina Ruiz", "알바 모레노 · Alba Moreno", "카르멘 비달 · Carmen Vidal", "이네스 로하스 · Inés Rojas"] },
  NL: { F: ["펨커 더브리스 · Femke de Vries", "리서 판다이크 · Lise van Dijk", "노아 얀선 · Noa Jansen"] },
  PH: { F: ["마리아 산토스 · Maria Santos", "알테아 레예스 · Althea Reyes", "비앙카 크루즈 · Bianca Cruz", "미카 델라로사 · Mika Dela Rosa", "안젤라 바우티스타 · Angela Bautista"] },
  IT: { F: ["줄리아 로시 · Giulia Rossi", "키아라 로마노 · Chiara Romano", "비토리아 콘티 · Vittoria Conti", "엘레나 리치 · Elena Ricci"] },
  DE: { F: ["레아 슈미트 · Lea Schmidt", "안나 베커 · Anna Becker", "클라라 바그너 · Klara Wagner", "요한나 볼프 · Johanna Wolf"] },
  AU: { F: ["마틸다 윌슨 · Matilda Wilson", "루비 캠벨 · Ruby Campbell", "조지아 에번스 · Georgia Evans", "아일라 머피 · Isla Murphy", "테일라 워드 · Tayla Ward"] },
  CA: { F: ["샬럿 트렘블레이 · Charlotte Tremblay", "에밀리 로이 · Émilie Roy", "클레어 맥도널드 · Claire MacDonald", "오드리 마르탱 · Audrey Martin"] },
  SA: { F: ["누라 알하르비 · Noura Alharbi", "라나 알카타니 · Lana Alqahtani", "달리아 알오타이비 · Dalia Alotaibi", "리마 알사우드 · Reema Alsaud"] },
  NG: { F: ["아다에제 오코로 · Adaeze Okoro", "아마라 은와수 · Amara Nwosu", "톨라 아데예미 · Tola Adeyemi"], M: ["치네두 오카포르 · Chinedu Okafor", "아데바요 콜라월레 · Adebayo Kolawole"] },
  VN: { F: ["응우옌민안 · Nguyễn Minh Anh", "쩐투하 · Trần Thu Hà", "레응옥란 · Lê Ngọc Lan"] },
  JP: { F: ["사토 아오이 · Sato Aoi", "다나카 린 · Tanaka Rin", "스즈키 하나 · Suzuki Hana", "나카무라 유이 · Nakamura Yui"] },
  ID: { F: ["푸트리 아유 · Putri Ayu", "디안 사리 · Dian Sari", "라라 프라티위 · Lara Pratiwi"] },
  TR: { F: ["엘리프 일마즈 · Elif Yılmaz", "데니즈 카야 · Deniz Kaya", "셀린 아르슬란 · Selin Arslan"] },
  ZA: { F: ["날레디 몰레페 · Naledi Molefe", "타빌레 은코시 · Thabile Nkosi", "아마흘레 들라미니 · Amahle Dlamini"] },
  TW: { F: ["린위팅 · Lin Yuting", "천신이 · Chen Xinyi", "황쯔칭 · Huang Ziqing"] },
  AR: { F: ["마르티나 페르난데스 · Martina Fernández", "소피아 알바레스 · Sofía Álvarez", "발렌티나 로시 · Valentina Rossi"], M: ["티아고 로메로 · Thiago Romero", "마테오 알바레스 · Mateo Álvarez"] },
  BD: { F: ["누스라트 자한 · Nusrat Jahan", "사디아 라만 · Sadia Rahman", "파리하 아크테르 · Fariha Akter"] },
  LK: { F: ["아누키 페레라 · Anuki Perera", "디누시 실바 · Dinushi Silva"], M: ["카빈두 페레라 · Kavindu Perera", "딜란 실바 · Dilan Silva", "사한 페르난도 · Sahan Fernando"] },
  CO: { F: ["발레리아 고메스 · Valeria Gómez", "마리아나 로하스 · Mariana Rojas"] },
  PK: { F: ["마히라 칸 · Mahira Khan", "아이샤 말리크 · Ayesha Malik"] },
  IN: { F: ["아나야 샤르마 · Anaya Sharma", "이샤 메흐타 · Isha Mehta", "카비야 라오 · Kavya Rao"] },
  SG: { F: ["탄메이린 · Tan Mei Lin", "림지아신 · Lim Jia Xin"] },
};

const registryPaths = ["amba/casts-registry.json", "public/casts/amba/index.json"];
const primary = JSON.parse(await fs.readFile(registryPaths[0], "utf8"));
const counters = new Map();
const assigned = new Map();

for (const cast of primary.casts) {
  const nat = cast.source?.nat;
  const sex = cast.source?.sex;
  const pool = names[nat]?.[sex] || names[nat]?.F || names.US[sex] || names.US.F;
  const key = `${nat}:${sex}`;
  const index = counters.get(key) || 0;
  cast.name = pool[index % pool.length];
  counters.set(key, index + 1);
  assigned.set(String(cast.id), cast.name);
}
primary.generatedAt = new Date().toISOString();

for (const registryPath of registryPaths) {
  const registry = registryPath === registryPaths[0]
    ? primary
    : JSON.parse(await fs.readFile(registryPath, "utf8"));
  for (const cast of registry.casts) cast.name = assigned.get(String(cast.id)) || cast.name;
  registry.generatedAt = primary.generatedAt;
  await fs.writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
}

let metaUpdated = 0;
for (const cast of primary.casts) {
  const metaFile = path.join("public", "casts", "amba", cast.folder, "meta.json");
  try {
    const meta = JSON.parse(await fs.readFile(metaFile, "utf8"));
    meta.name = cast.name;
    await fs.writeFile(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
    metaUpdated += 1;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

console.log(JSON.stringify({ castsUpdated: primary.casts.length, metaUpdated, groups: Object.fromEntries(counters) }));
