from app.models.card import Card, CardUpdate


def test_card_minimal():
    card = Card(
        id="card_001",
        added_by="U123",
        created_at="2026-04-13T00:00:00"
    )
    assert card.id == "card_001"
    assert card.tags == []
    assert card.name is None


def test_card_with_all_fields():
    card = Card(
        id="card_001",
        name="王小明",
        title="業務經理",
        company="ABC 科技",
        phone="02-1234-5678",
        mobile="0912-345-678",
        email="wang@abc.com",
        line_id="wangxm",
        address="台北市信義區",
        memo="重要客戶",
        tags=["VIP", "客戶"],
        added_by="U123",
        created_at="2026-04-13T00:00:00"
    )
    assert card.tags == ["VIP", "客戶"]


def test_card_update_partial():
    update = CardUpdate(name="新姓名")
    assert update.name == "新姓名"
    assert update.title is None


def test_org_member_role():
    from app.models.org import Member
    member = Member(user_id="U123", role="admin", joined_at="2026-04-13T00:00:00")
    assert member.role == "admin"


def test_user_context():
    from app.models.org import UserContext
    ctx = UserContext(user_id="U123", org_id="org_abc", role="member")
    assert ctx.is_admin is False


def test_user_context_admin():
    from app.models.org import UserContext
    ctx = UserContext(user_id="U123", org_id="org_abc", role="admin")
    assert ctx.is_admin is True
