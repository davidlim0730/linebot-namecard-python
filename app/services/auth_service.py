import inspect
import httpx
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from ..models.org import UserContext


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
        json_result = resp.json()
        data = await json_result if inspect.isawaitable(json_result) else json_result
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
        return pyjwt.encode(payload, self.jwt_secret, algorithm="HS256")

    def verify_jwt(self, token: str) -> UserContext:
        try:
            payload = pyjwt.decode(token, self.jwt_secret, algorithms=["HS256"])
        except pyjwt.PyJWTError as e:
            raise AuthError(f"Invalid JWT: {e}")
        return UserContext(
            user_id=payload["sub"],
            org_id=payload["org_id"],
            role=payload["role"],
        )
