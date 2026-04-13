from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from .. import config
from ..services.auth_service import AuthService, AuthError
from ..models.org import UserContext
from ..repositories.org_repo import OrgRepo

router = APIRouter(prefix="/api")
security = HTTPBearer()

# Module-level singletons (injected in tests via patch)
auth_service = AuthService(
    jwt_secret=config.JWT_SECRET,
    liff_channel_id=config.LIFF_CHANNEL_ID,
)
org_repo = OrgRepo()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserContext:
    try:
        return auth_service.verify_jwt(credentials.credentials)
    except AuthError as e:
        raise HTTPException(status_code=401, detail={"error": "unauthorized", "message": str(e)})


# ---- Request/Response models ----

class TokenRequest(BaseModel):
    id_token: str


class TokenResponse(BaseModel):
    access_token: str
    expires_in: int = 3600


# ---- Auth ----

@router.post("/auth/token", response_model=TokenResponse)
async def issue_token(body: TokenRequest):
    try:
        user_id = await auth_service.verify_line_token(body.id_token)
    except AuthError:
        raise HTTPException(status_code=401, detail={"error": "invalid_token"})

    org_id = org_repo.get_user_org_id(user_id)
    if not org_id:
        raise HTTPException(status_code=403, detail={"error": "no_org"})

    role = org_repo.get_user_role(org_id, user_id) or "member"
    token = auth_service.issue_jwt(user_id, org_id, role)
    return TokenResponse(access_token=token)
