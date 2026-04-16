"""
vCard download endpoint.
Provides GET endpoint to download namecard as .vcf (vCard) file.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..repositories.org_repo import OrgRepo
from ..repositories.card_repo import CardRepo
from ..qrcode_utils import generate_vcard_string

router = APIRouter()

# Module-level singletons (injected in tests via patch)
org_repo = OrgRepo()
card_repo = CardRepo()


@router.get("/vcf/{card_id}")
async def download_vcf(card_id: str, user_id: str):
    """
    Download a namecard as vCard (.vcf) file.

    Args:
        card_id: The card ID to download
        user_id: The user requesting the download

    Returns:
        vCard text file with proper headers

    Raises:
        HTTPException 404: If card not found or user doesn't have access
    """
    # Get user's organization
    user_org = org_repo.get_user_org_id(user_id)
    if not user_org:
        raise HTTPException(status_code=404, detail="User org not found")

    # Get card from user's organization (org isolation)
    card = card_repo.get(user_org, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Generate vCard string
    vcard_str = generate_vcard_string(card.model_dump())
    name = card.name or 'contact'
    # Sanitize filename: remove double quotes, newlines, and carriage returns
    sanitized_name = name.replace('"', '').replace('\n', '').replace('\r', '')

    # Return with proper headers
    return Response(
        content=vcard_str,
        media_type="text/vcard",
        headers={"Content-Disposition": f'attachment; filename="{sanitized_name}.vcf"'}
    )
