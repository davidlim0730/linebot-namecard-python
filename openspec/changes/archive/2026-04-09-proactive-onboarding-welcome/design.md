## Context

Currently, onboarding is **reactive**: new users must send a message/image/postback before `check_onboarding` intercepts them and shows the choice prompt. This creates friction because users don't know what to do until they take action.

With LINE Follow event support, we can detect when a user joins the OA and **proactively** send the welcome message immediately. This is a simpler, friendlier first interaction.

---

## Goals / Non-Goals

**Goals:**
- Send onboarding message automatically when a new user follows the OA (zero friction)
- Keep the existing `check_onboarding` interception as a fallback (in case user dismisses welcome and sends a message)
- Reuse existing Quick Reply and onboarding logic (no duplication)

**Non-Goals:**
- Track whether user saw the welcome (no state table)
- Personalize the message by user data
- Segment users (e.g., different flows for team invites vs self-signup)

---

## Decisions

### Decision 1: Use LINE Follow Event Handler

**What**: Add `handle_follow_event` handler in `app/main.py` webhook dispatcher.

**Why**: 
- LINE Bot SDK 3.5.0 already supports Follow event in the webhook payload
- Simplest way to detect "user just joined OA" without server-side state
- Stateless — no database tracking needed

**Alternatives considered**:
- Use Rich Menu greeting banner: Insufficient (users might not see banner if they open chat first)
- Create a scheduled welcome job: Over-engineered; Line's Follow event is the right signal

---

### Decision 2: Reuse `get_onboarding_message()` from Flex Messages

**What**: Extract the existing onboarding Quick Reply (used in `check_onboarding`) into a dedicated `get_onboarding_welcome_message()` function in `app/flex_messages.py`. Use the same function in both places.

**Why**:
- Single source of truth — if onboarding copy changes, update once
- DRY principle
- Both paths (Follow event + interception fallback) show consistent UX

**Alternatives considered**:
- Create separate message templates: Creates confusion if they drift over time
- Inline message in handler: Bloats handler code, harder to maintain

---

### Decision 3: Push Message (not Reply)

**What**: Use `push_message` (not `reply_message`) to send welcome when Follow event fires.

**Why**:
- Follow event has no `reply_token` (it's not a user-initiated message)
- Pushing is the standard pattern for bot-initiated messages in LINE Bot SDK
- Creates a separate "notification" feel vs interrupting a conversation

---

### Decision 4: Keep `check_onboarding` Interception as Fallback

**What**: Leave existing `check_onboarding` logic in text/image/postback handlers unchanged. If user dismisses the welcome and sends a message without choosing, show the same prompt again.

**Why**:
- Users might dismiss the welcome notification by accident
- Some users might not notice the message (notification settings)
- Fallback ensures the onboarding is "sticky" — user cannot proceed without choosing
- Zero additional complexity (code already exists)

**Alternatives considered**:
- Remove `check_onboarding` after Follow: Risk of users slipping through if they miss the welcome
- Require explicit "confirm receipt" postback: Over-engineered; simple re-prompt is fine

---

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Spam perception**: Users might view unexpected welcome message as spam | Keep message short, friendly tone, and relevant CTA. Monitor user feedback. |
| **Silent dismissal**: User dismisses notification without seeing content | Fallback interception handles this — next message triggers `check_onboarding` again. |
| **Double messages on app re-open**: If notification + app-foreground both trigger welcome | LINE SDK only fires Follow once per follow action; should not happen. Test edge case. |
| **Non-English locales**: Message copy hardcoded in English | Currently all messages are hardcoded Chinese. Follow pattern (e.g., `get_onboarding_welcome_message()` returns Chinese). |

---

## Migration Plan

### Deployment
1. **Code change**: Add `handle_follow_event` handler + refactor `get_onboarding_welcome_message()` (no breaking changes)
2. **Deploy**: Standard `gcloud run deploy` (same as any feature deploy)
3. **No schema/env var changes needed**

### Rollback
- If issues arise, simply remove the Follow event handler from webhook dispatcher in `app/main.py`
- Reverts to reactive onboarding (old behavior)
- No database rollback needed

---

## Open Questions

1. **Should we log Follow events?** (Currently not tracked; might be useful for onboarding funnel analysis later)
2. **Is the welcome message rich enough?** (Currently just Quick Reply; consider adding a Flex Message with onboarding tips if users want more context)
