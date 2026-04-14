import difflib
from typing import List, Optional


def fuzzy_match_entity(name: str, entity_list: List[str]) -> Optional[str]:
    """
    Fuzzy match a name against a list of known entity names.
    Priority: exact → contains → difflib similarity (threshold 0.4)
    Returns the best match or None.
    """
    if not entity_list:
        return None

    name_lower = name.lower()

    # 1. Exact match
    for candidate in entity_list:
        if candidate.lower() == name_lower:
            return candidate

    # 2. Contains match
    for candidate in entity_list:
        if name_lower in candidate.lower() or candidate.lower() in name_lower:
            return candidate

    # 3. Difflib similarity
    matches = difflib.get_close_matches(name, entity_list, n=1, cutoff=0.4)
    return matches[0] if matches else None
