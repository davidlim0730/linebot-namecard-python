import difflib
import json
import logging
import os
from datetime import date
from typing import List, Optional

from ..repositories.card_repo import CardRepo
from ..repositories.contact_repo import ContactRepo
from ..repositories.deal_repo import DealRepo
from ..repositories.product_repo import ProductRepo
from ..gemini_utils import generate_gemini_text_complete
from ..models.nlu import NLUResult

logger = logging.getLogger(__name__)


def fuzzy_match_entity(name: str, entity_list: List[str]) -> Optional[str]:
    """
    Fuzzy match a name against a list of known entity names.
    Priority: exact → contains → difflib similarity (threshold 0.4)
    Returns the best match or None.
    """
    if not name or not entity_list:
        return None

    name_lower = name.lower()

    # 1. Exact match
    for candidate in entity_list:
        if candidate.lower() == name_lower:
            return candidate

    # 2. Contains match — prefer candidate closest in length to query
    contains_matches = [
        c for c in entity_list
        if name_lower in c.lower() or c.lower() in name_lower
    ]
    if contains_matches:
        return min(contains_matches, key=lambda c: abs(len(c) - len(name)))

    # 3. Difflib similarity
    matches = difflib.get_close_matches(name, entity_list, n=1, cutoff=0.4)
    return matches[0] if matches else None


def build_grounding_context(org_id: str) -> str:
    """
    Build grounding context string for Gemini NLU prompt.
    Reads contacts (display_name), deals (entity_name), and active products.
    Deduplicates entity names. Format is stable to benefit from Prompt Caching.
    """
    contact_repo = ContactRepo()
    deal_repo = DealRepo()
    product_repo = ProductRepo()

    # Collect unique display names from contacts
    contacts = contact_repo.list_all(org_id)
    contact_names = {
        contact.display_name
        for contact in contacts.values()
        if contact.display_name
    }

    # Also collect entity_names from active deals (may not be in contacts)
    deals = deal_repo.list_all(org_id)
    deal_entities = {
        deal.entity_name
        for deal in deals.values()
        if deal.entity_name
    }

    all_entities = sorted(contact_names | deal_entities)

    # Active products
    products = product_repo.list_active(org_id)

    lines = []

    lines.append("## 現有客戶名單")
    if all_entities:
        for i, name in enumerate(all_entities, start=1):
            lines.append(f"- C-{i:04d} | {name}")
    else:
        lines.append("（目前無客戶資料）")

    lines.append("")
    lines.append("## 可用產品線")
    if products:
        for product in sorted(products, key=lambda p: p.id):
            desc = f" | {product.description}" if product.description else ""
            lines.append(f"- {product.id} | {product.name}{desc}")
    else:
        lines.append("（目前無產品資料）")

    return "\n".join(lines)


def _validate_and_normalize_dates(data: dict) -> dict:
    """
    Validate and normalize dates in NLU result to YYYY-MM-DD format.
    Logs warnings for malformed dates but allows parsing to proceed.
    """
    import re

    date_fields = ["next_action_date", "due_date"]
    date_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}$')

    # Check pipelines
    for pipeline in data.get("pipelines", []):
        if "next_action_date" in pipeline and pipeline["next_action_date"]:
            date_str = str(pipeline["next_action_date"]).strip()
            if not date_pattern.match(date_str):
                logger.warning(f"Invalid next_action_date format '{date_str}', expected YYYY-MM-DD")
                pipeline["next_action_date"] = None

    # Check actions
    for action in data.get("actions", []):
        if "due_date" in action and action["due_date"]:
            date_str = str(action["due_date"]).strip()
            if not date_pattern.match(date_str):
                logger.warning(f"Invalid due_date format '{date_str}', expected YYYY-MM-DD")
                action["due_date"] = None

    return data


def parse_text(raw_text: str, org_id: str) -> NLUResult:
    """
    Parse a natural language CRM report via Gemini NLU.
    Injects grounding context (known companies + products) into the prompt.
    Returns NLUResult; returns empty NLUResult on Gemini failure.
    """
    system_prompt_path = os.path.join(
        os.path.dirname(__file__), "..", "nlu", "system_prompt.md"
    )
    try:
        with open(system_prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()
    except FileNotFoundError:
        logger.error("system_prompt.md not found at %s", system_prompt_path)
        return NLUResult()

    grounding_context = build_grounding_context(org_id)
    today = date.today().isoformat()

    prompt_parts = [
        system_prompt,
        f"\n\n**系統提供的今天日期**：{today}\n",
        f"\n**Grounding Context**：\n{grounding_context}\n",
        f"\n**BD 輸入**：\n{raw_text}",
    ]

    try:
        response = generate_gemini_text_complete(prompt_parts)
        data = json.loads(response.text)
        data = _validate_and_normalize_dates(data)
        return NLUResult(**data)
    except json.JSONDecodeError as e:
        logger.warning("Gemini returned non-JSON response: %s", e)
        return NLUResult()
    except Exception as e:
        logger.error("NLU parse failed: %s", str(e))
        logger.error("Exception type: %s", type(e).__name__)
        if 'data' in locals():
            logger.error("Failed data: %s", json.dumps(data, indent=2, ensure_ascii=False, default=str))
        return NLUResult()


def auto_link_or_create_contact(entity_name: str, org_id: str) -> str:
    """
    Fuzzy-match entity_name to existing contacts (display_name + legal_name + aliases).
    If found, return contact_id.
    If not found, create a new company-type Contact via NLU and return new contact_id.
    """
    if not entity_name or not entity_name.strip():
        # Create a placeholder contact
        contact_repo = ContactRepo()
        contact = contact_repo.create_from_nlu(org_id, "（未知）")
        return contact.id

    contact_repo = ContactRepo()
    contact_id = contact_repo.find_by_name_fuzzy(org_id, entity_name)
    if contact_id:
        return contact_id

    # Not found → create a new company-type Contact
    contact = contact_repo.create_from_nlu(org_id, entity_name.strip())
    return contact.id


def auto_link_namecard(entity_name: str, org_id: str) -> Optional[str]:
    """
    Fuzzy-match entity_name to existing namecards (company field).
    Returns the card_id of the best match, or None if no match found.
    "First card wins" tie-breaking follows Firebase key lexicographic order.

    DEPRECATED: Use auto_link_or_create_contact instead.
    """
    if not entity_name or not entity_name.strip():
        return None
    card_repo = CardRepo()
    cards = card_repo.list_all(org_id)

    if not cards:
        return None

    # Build mapping: company_name → card_id (take first match per company)
    company_to_card: dict[str, str] = {}
    for card_id, card in cards.items():
        if card.company and card.company not in company_to_card:
            company_to_card[card.company] = card_id

    matched_company = fuzzy_match_entity(entity_name, list(company_to_card.keys()))
    if matched_company is None:
        return None

    return company_to_card[matched_company]
