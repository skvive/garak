"""
LEXI 임베딩 사이드카 (M8) — kekemind server.py 이식·재타깃.

한국어 static 임베딩(기본 kekeappa/kor-static-embedding-512, 512d)으로
/api/embed, /api/analyze(자동 카테고리·태그)를 제공한다. 데이터는 저장하지 않는다.

lexistyle는 EMBED_SERVICE_URL 로 이 서비스를 호출하고, 미설정 시 앱 내
결정적 폴백 임베딩(src/lib/marketing/embed.ts)으로 동작한다.

⚠️ 모델 라이선스: kor-static-embedding-512 의 HuggingFace 카드/증류 베이스
   라이선스를 배포 전 반드시 확인할 것(리포 Apache 2.0과 별개). KEKE_MODEL 로 교체 가능.

실행:
  pip install -r requirements.txt
  uvicorn server:app --host 0.0.0.0 --port 8100
"""
import os
import re
from collections import Counter

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

MODEL_ID = os.getenv("KEKE_MODEL", "kekeappa/kor-static-embedding-512")
API_TOKEN = os.getenv("EMBED_API_TOKEN")  # 설정 시 Authorization: Bearer 검사(선택)

app = FastAPI(title="LEXI Embedding Sidecar")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

MODEL = SentenceTransformer(MODEL_ID)
DIM = MODEL.get_sentence_embedding_dimension()

# LEXI 커머스/마케팅 택소노미 (src/lib/marketing/categories.ts 와 동기화 유지)
CATEGORIES = {
    "뷰티/스킨케어": ["스킨케어 세럼 보습 수분", "화장품 토너 크림 에센스", "피부 진정 앰플 속건조 촉촉"],
    "패션/의류": ["가디건 니트 코디 데일리룩", "원피스 셔츠 바지 아우터", "액세서리 가방 신발 스타일"],
    "리빙/홈": ["주방 수납 정리 용기", "인테리어 소품 조명 러그", "생활용품 홈데코 욕실"],
    "디지털/가전": ["무선 이어폰 충전 케이블", "스마트 가전 액세서리 거치대", "노트북 마우스 키보드"],
    "푸드/건강": ["건강식품 영양제 비타민", "간편식 다이어트 단백질", "차 음료 보충제 유산균"],
    "키즈/베이비": ["유아 아기 기저귀 물티슈", "장난감 교구 놀이 완구", "아동 의류 유아용품 안전"],
    "펫/반려": ["강아지 고양이 사료 간식", "반려동물 장난감 하네스", "펫 위생 배변 미용"],
    "캠페인/프로모션": ["할인 특가 세일 이벤트 쿠폰", "신상품 런칭 출시 소식", "리뷰 체험단 이벤트 참여"],
    "CS/문의": ["배송 조회 언제 도착 문의", "반품 교환 환불 취소", "관세 결제 카드 영수증 문의"],
}


def _centroids():
    names, mats = [], []
    for name, seeds in CATEGORIES.items():
        vecs = MODEL.encode(seeds, normalize_embeddings=True)
        c = vecs.mean(axis=0)
        c = c / (np.linalg.norm(c) or 1)
        names.append(name)
        mats.append(c)
    return names, np.vstack(mats)


CAT_NAMES, CAT_EMB = _centroids()

_HANGUL = re.compile(r"[가-힣]{2,12}")
_STOP = {"그리고", "하지만", "그래서", "이것", "저것", "합니다", "있는", "위한", "통해", "때문", "정말", "너무", "가장"}


def extract_keywords(text: str, top_n: int = 5):
    toks = [t for t in _HANGUL.findall(text) if t not in _STOP]
    return [w for w, _ in Counter(toks).most_common(top_n)]


class EmbedReq(BaseModel):
    texts: list[str]


class AnalyzeReq(BaseModel):
    text: str
    top_n_categories: int = 3


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_ID, "dim": DIM, "categories": CAT_NAMES}


@app.post("/api/embed")
def embed(req: EmbedReq):
    vecs = MODEL.encode(req.texts, normalize_embeddings=True, batch_size=64)
    return {"embeddings": [v.tolist() for v in vecs], "dim": DIM}


@app.post("/api/analyze")
def analyze(req: AnalyzeReq):
    emb = MODEL.encode([req.text], normalize_embeddings=True)[0]
    scores = CAT_EMB @ emb
    order = np.argsort(-scores)[: req.top_n_categories]
    cats = [{"name": CAT_NAMES[i], "score": round(float(scores[i]), 4)} for i in order]
    return {
        "embedding": emb.tolist(),
        "categories": cats,
        "tags": extract_keywords(req.text),
    }
