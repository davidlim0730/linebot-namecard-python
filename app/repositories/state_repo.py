# In-memory state store（未來可換成 Redis）
_user_states: dict = {}


def get(user_id: str) -> dict:
    return _user_states.get(user_id, {})


def set(user_id: str, state: dict) -> None:
    _user_states[user_id] = state


def delete(user_id: str) -> None:
    _user_states.pop(user_id, None)


def exists(user_id: str) -> bool:
    return user_id in _user_states
