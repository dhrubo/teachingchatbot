---
name: webapp-testing
description: >
  Use after implementing UI changes or flows. Validates onboarding, quizzes,
  topic switching, challenge flow, answer panel, progress UI, and mobile
  responsiveness in TeachingChatbot.
---

# Web App Testing

Use this skill after UI changes to validate key user flows.

## Test Checklist

### Onboarding Flow
- Guest users see the home screen with topic suggestions
- Guest users can start a conversation without signing up
- Sign-up flow works end-to-end
- Returning users see their chat history

### Quiz / Challenge Flow
- Challenge card renders correctly (🎯 Challenge indicator, question text)
- Answer panel appears above the chat input
- Radio buttons / dropdown / text input work
- Correct answer shows ✅ feedback with sound
- Wrong answer shows ❌ feedback, then explanation and auto-advances
- "Accept the challenge" / "Explain differently" / "Read next topic" buttons work

### Topic Switching
- Clicking a topic in "Your Topics" menu switches the visible thread
- Topic entry overlay shows when starting a new topic
- Leaving a topic with incomplete challenges shows a confirm dialog
- Reopening a completed topic reattaches correctly

### Progress UI
- ProgressPill shows streak, XP, badge count
- ProgressBar updates after answering questions
- AchievementToast appears for new badges

### Mobile Responsiveness
- Layout works on mobile viewport (375px)
- Answer panel is usable on small screens
- Topic menu is accessible on mobile
- Text and buttons are not clipped or overlapping

## Running Tests

1. Run `pnpm test:unit` for unit tests
2. If Playwright tests exist: `pnpm test` (E2E)
3. Manually verify on mobile viewport in browser DevTools

## Report

For each checklist item:
- ✅ PASS — works as expected
- ❌ FAIL — describe the issue
- ⏭ SKIP — not applicable to this change
