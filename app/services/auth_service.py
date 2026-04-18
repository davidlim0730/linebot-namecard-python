import httpx
import jwt
import secrets
from datetime import datetime, timezone, timedelta
from app.config import JWT_SECRET
from ..models.org import UserContext

ALGORITHM = "HS256"
ACCESS_TTL_HOURS = 2
REFRESH_TTL_DAYS = 30


def create_access_token(user_id: str, org_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "org_id": org_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TTL_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS),
        "jti": secrets.token_urlsafe(16),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def verify_token(token: str, token_type: str = "access") -> dict:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    if payload.get("type") != token_type:
        raise jwt.InvalidTokenError("Wrong token type")
    return payload


class AuthError(Exception):
    pass


class AuthService:

    def __init__(self, jwt_secret: str, liff_channel_id: str):
        self.jwt_secret = jwt_secret
        self.liff_channel_id = liff_channel_id

    async def verify_line_token(self, id_token: str) -> str:
        """Verify LINE id_token with LINE API. Returns user_id (sub)."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.line.me/oauth2/v2.1/verify",
                data={"id_token": id_token, "client_id": self.liff_channel_id},
            )
        data = resp.json()
        if resp.status_code != 200 or "sub" not in data:
            raise AuthError(f"LINE token verification failed: {data.get('error', 'unknown')}")
        return data["sub"]

    def issue_jwt(self, user_id: str, org_id: str, role: str) -> str:
        payload = {
            "sub": user_id,
            "org_id": org_id,
            "role": role,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc),
        }
        return jwt.encode(payload, self.jwt_secret, algorithm="HS256")

    def verify_jwt(self, token: str) -> UserContext:
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
        except jwt.PyJWTError as e:
            raise AuthError(f"Invalid JWT: {e}")
        return UserContext(
            user_id=payload["sub"],
            org_id=payload["org_id"],
            role=payload["role"],
        )
