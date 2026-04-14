import difflib
import json
import logging
import os
from datetime import date
from typing import List, Optional

from ..repositories.card_repo import CardRepo
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
    Reads namecards (company field), deals (entity_name), and active products.
    Deduplicates company names. Format is stable to benefit from Prompt Caching.
    """
    card_repo = CardRepo()
    deal_repo = DealRepo()
    product_repo = ProductRepo()

    # Collect unique company names from namecards
    cards = card_repo.list_all(org_id)
    companies = {
        card.company
        for card in cards.values()
        if card.company
    }

    # Also collect entity_names from active deals (may not be in namecards)
    deals = deal_repo.list_all(org_id)
    deal_entities = {
        deal.entity_name
        for deal in deals.values()
        if deal.entity_name
    }

    all_entities = sorted(companies | deal_entities)

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
        return NLUResult(**data)
    except json.JSONDecodeError as e:
        logger.warning("Gemini returned non-JSON response: %s", e)
        return NLUResult()
    except Exception as e:
        logger.error("NLU parse failed (schema or API error): %s", e)
        return NLUResult()
