# Maths Learning Assistant — Documentation

Structured reference for the tutor product. Split by audience:

- [product.md](product.md) — **Product**: what the app does, the rules and limits.
- [help.md](help.md) — **User-facing help**: plain-language answers for students and parents.
- [developer.md](developer.md) — **Developer**: data model, state, business rules, where logic lives.

## ⚠️ Status legend

Because behaviour and documentation must not drift apart, every rule below is tagged:

- ✅ **Enforced** — implemented in code today; the app actually prevents bypass.
- 📝 **Tutor behaviour** — the AI tutor is prompted to do this, but it is guidance, not a hard technical guarantee.
- 🚧 **Planned** — specified product rule that is **not yet enforced in code**. Documented so the intent is clear, but do not rely on it being unbypassable yet.

Keeping these tags accurate is part of the documentation rules: if you implement a 🚧 rule, move it to ✅ here and in the relevant doc.
