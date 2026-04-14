import difflib
from typing import List, Optional


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
