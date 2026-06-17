# Copilot Task: Import Six-Card Concept Cards

Import `curriculum-artifacts/concept-cards/all-six-card-concept-cards.json`.

For each card, upsert a `CurriculumArtifact`:
- artifactType: "concept_card"
- status: card.status
- subject: card.subject
- yearGroup: card.yearGroup
- examBoard: card.examBoard
- topic: card.topic
- contentJson: card.contentJson plus missionSlug, sequence, role, tags

Update lesson card reader to order by `contentJson.sequence`.

Update gate:
- `MIN_CONCEPT_CARDS_BEFORE_CHALLENGE = 6`
- `CARDS_PER_BATCH = 3`

Add tests:
- each topic has 6 cards
- challenge cannot start after 3 cards
- challenge can start after 6 cards and explicit click
- cards sort by sequence

Run:
```bash
npx tsc --noEmit
pnpm test:unit
pnpm build
```
