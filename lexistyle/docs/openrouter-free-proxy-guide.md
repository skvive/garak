# OpenRouter 무료 모델 우회 & 로컬 중개 프록시 가이드

## 1. 아키텍처 개요

```
[ Cursor IDE ]
   │ (가상/저렴 모델 선택: e.g. "openai/gpt-4o-mini" 또는 "openrouter/free")
   ▼
[ Local Proxy (scripts/openrouter-proxy.mjs) ] : 포트 8000
   │ - 다중 OpenRouter API 키 라운드로빈 (일일 50회 × N계정)
   │ - 429 Rate Limit 감지 시 다음 키 / 대체 무료 모델 자동 Failover
   │ - SSE 실시간 스트리밍 중계
   ▼
[ OpenRouter API ]
   ▼
[ 최적 무료 AI 모델 (openrouter/free / DeepSeek R1 / Llama 3.3 / Qwen 2.5 Coder 등) ]
```

---

## 2. 프록시 서버 실행 방법

### 기본 실행
```bash
# 단일 키로 실행
$env:OPENROUTER_API_KEYS="sk-or-v1-첫번째키"
node scripts/openrouter-proxy.mjs

# 멀티 키(계정 여러 개)로 한도 극대화 실행 (쉼표로 구분)
$env:OPENROUTER_API_KEYS="sk-or-v1-계정1키,sk-or-v1-계정2키,sk-or-v1-계정3키"
node scripts/openrouter-proxy.mjs
```

---

## 3. Cursor IDE 설정 (1회 세팅)

1. **Cursor 설정 열기**: `Ctrl + Shift + J` 또는 우측 상단 톱니바퀴 (Settings) -> **Models** 탭으로 이동
2. **OpenAI API Key 설정**:
   - `OpenAI API Key` 섹션을 **ON** (활성화)
   - 키 입력창에는 아무 값이나 입력 (예: `dummy-key`)
3. **Base URL 오버라이드**:
   - `Override OpenAI Base URL` 활성화
   - 주소 입력: `http://127.0.0.1:8000/v1`
4. **모델 추가 (+ Add model)**:
   - `openrouter/free` (기본 추천)
   - 또는 `openai/gpt-4o-mini`
5. **사용하기**:
   - 채팅창(`Ctrl + L`) 또는 Composer(`Ctrl + I`)에서 방금 추가한 모델을 선택하고 질의하면 $0 무료로 자동 라우팅됩니다.

---

## 4. 핵심 장점 & 팁

1. **완전 무료 무제한 체감**:
   - OpenRouter 계정 3~4개 키를 등록해두면 429 에러 발생 시 프록시가 자동으로 다음 키로 교체하여 끊김 없이 코딩 가능.
2. **$10 충전 계정이 있는 경우**:
   - $10가 예치된 계정 키를 넣으면 단일 키로도 일일 1,000회 무료 모델 호출 가능 (예치금은 소진되지 않음).
3. **무료 모델 목록**:
   - `openrouter/free` (최적 무료 모델 자동 선택)
   - `deepseek/deepseek-r1:free` (추론형 고성능)
   - `qwen/qwen-2.5-coder-32b-instruct:free` (코딩 특화)
   - `meta-llama/llama-3.3-70b-instruct:free`
