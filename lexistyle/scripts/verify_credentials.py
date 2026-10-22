"""
Alibaba Cloud AccessKey 검증 스크립트.

STS GetCallerIdentity 를 호출해서:
  - 키가 유효한지
  - 어떤 계정(AccountId) / 어떤 주체(RAM user / root)인지
를 확인한다. 특정 서비스 권한이 없어도 호출 가능하므로 "이 키로 뭐가 되는지"
를 판단하는 첫 단계로 적합하다.

실행: python scripts/verify_credentials.py
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv()

AK = os.getenv("ALIBABA_CLOUD_ACCESS_KEY_ID")
SK = os.getenv("ALIBABA_CLOUD_ACCESS_KEY_SECRET")

if not AK or not SK:
    print("[!] .env 에 ALIBABA_CLOUD_ACCESS_KEY_ID / _SECRET 가 없습니다.")
    sys.exit(1)

print(f"[*] AccessKey ID: {AK[:8]}...{AK[-4:]} (prefix={AK[:4]})")

try:
    from alibabacloud_sts20150401.client import Client as StsClient
    from alibabacloud_sts20150401 import models as sts_models
    from alibabacloud_tea_openapi import models as open_api_models
except ImportError as e:
    print(f"[!] SDK import 실패: {e}")
    print("    pip install alibabacloud_sts20150401 alibabacloud_tea_openapi")
    sys.exit(1)


def build_client(endpoint: str) -> StsClient:
    config = open_api_models.Config(access_key_id=AK, access_key_secret=SK)
    config.endpoint = endpoint
    return StsClient(config)


# STS 는 리전별 엔드포인트가 있음. 대표적인 것 몇 개 시도.
endpoints = [
    "sts.ap-southeast-1.aliyuncs.com",  # 싱가포르 (해외)
    "sts.cn-hangzhou.aliyuncs.com",     # 항저우 (중국)
    "sts.aliyuncs.com",                 # 글로벌 기본
]

last_err = None
for ep in endpoints:
    try:
        print(f"\n[*] 시도: {ep}")
        client = build_client(ep)
        resp = client.get_caller_identity()
        body = resp.body
        print("[✓] 인증 성공! 키가 유효합니다.")
        print(f"    AccountId : {body.account_id}")
        print(f"    Arn       : {body.arn}")
        print(f"    UserId    : {body.user_id}")
        print(f"    IdentityType : {body.identity_type}")
        sys.exit(0)
    except Exception as e:  # noqa: BLE001
        msg = str(e)
        last_err = msg
        # 인증 자체가 틀리면(InvalidAccessKeyId 등) 바로 알 수 있음
        print(f"[x] 실패: {msg[:300]}")
        # 권한/키 관련 확정적 오류면 더 시도 안 함
        if any(k in msg for k in ("InvalidAccessKeyId", "SignatureDoesNotMatch",
                                  "Forbidden.AccessKeyDisabled")):
            break

print("\n[!] 모든 엔드포인트에서 인증에 실패했습니다.")
print(f"    마지막 오류: {last_err}")
sys.exit(2)
