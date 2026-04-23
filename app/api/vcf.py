"""
vCard download endpoint.
Provides GET endpoint to download namecard as .vcf (vCard) file.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..repositories.org_repo import OrgRepo
from ..repositories.card_repo import CardRepo
from ..repositories.contact_repo import ContactRepo
from ..qrcode_utils import generate_vcard_string

router = APIRouter()

org_repo = OrgRepo()
card_repo = CardRepo()
contact_repo = ContactRepo()


@router.get("/vcf/{card_id}")
async def download_vcf(card_id: str, user_id: str):
    user_org = org_repo.get_user_org_id(user_id)
    if not user_org:
        raise HTTPException(status_code=404, detail="User org not found")

    # 優先 ContactRepo，fallback CardRepo（向後相容）
    contact = contact_repo.get(user_org, card_id)
    if contact:
        data = contact.model_dump()
        data["name"] = data.get("display_name")
        data["company"] = data.get("company_name")
    else:
        card = card_repo.get(user_org, card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        data = card.model_dump()

    vcard_str = generate_vcard_string(data)
    name = data.get("name") or data.get("display_name") or "contact"
    sanitized_name = name.replace('"', '').replace('\n', '').replace('\r', '')

    return Response(
        content=vcard_str,
        media_type="text/vcard",
        headers={"Content-Disposition": f'attachment; filename="{sanitized_name}.vcf"'}
    )
