# GCSE Mastery — Design System & Tokens (Sunset Space Theme)

**Version:** 1.0.0  
**Target Audience:** Year 8 & Year 9 GCSE Learners (Friendly, Gamified, Trustworthy)  
**Style Inspiration:** Duolingo combined with high-end modern SaaS aesthetics.

This document serves as the formal design token repository and component blueprint. Share the JSON block below with any AI assistant (like OpenCode, Claude, or v0) to achieve 100% visual and structural parity with the **GCSE Mastery** application.

---

## 🎨 Design System Tokens (JSON Specification)

```json
{
  "themeName": "GCSE Mastery — Space Sunset Theme",
  "version": "1.0.0",
  "tokens": {
    "colors": {
      "bg": "#120F35",                         /* Deep cosmic violet night */
      "surface": "rgba(255, 255, 255, 0.05)",  /* Glassmorphic translucent panel */
      "surfaceSolid": "#15143C",               /* Solid container fallback */
      "fg": "#FFFFFF",                         /* High-contrast crisp white typography */
      "muted": "rgba(255, 255, 255, 0.60)",    /* Soft secondary metadata text */
      "border": "rgba(255, 255, 255, 0.08)",   /* Delicately glowing card borders */
      
      "primary": "#F97316",                    /* Sunset Coral primary action button */
      "primaryHover": "#ea580c",              /* Deep sunset coral on hover */
      "success": "#10B981",                    /* Emerald green correct ticks & completed badges */
      "successBg": "rgba(16, 185, 129, 0.12)",
      "warning": "#F59E0B",                    /* Golden amber streaks & achievements */
      "warningBg": "rgba(245, 158, 11, 0.12)",
      "danger": "#EF4444",                     /* Crimson red error logs & exit buttons */
      "dangerBg": "rgba(239, 68, 68, 0.12)",
      "accent": "#7C3AED",                     /* Royal violet GCSE domain category highlight */
      "accentBg": "rgba(124, 58, 237, 0.15)"
    },
    "gradients": {
      "sara": "linear-gradient(135deg, #F97316, #7C3AED)",
      "saraReverse": "linear-gradient(135deg, #7C3AED, #F97316)"
    },
    "fonts": {
      "display": "'Plus Jakarta Sans', system-ui, sans-serif",
      "body": "'Plus Jakarta Sans', system-ui, sans-serif",
      "mono": "'JetBrains Mono', monospace"
    },
    "metrics": {
      "radiusLg": "16px",
      "radiusMd": "12px",
      "radiusSm": "8px",
      "radiusFull": "9999px",
      "blur": "blur(12px)"
    },
    "shadows": {
      "sm": "0 4px 12px rgba(0, 0, 0, 0.1)",
      "md": "0 8px 24px rgba(0, 0, 0, 0.15)",
      "lg": "0 16px 36px rgba(0, 0, 0, 0.2)"
    }
  }
}
```

---

## 🧩 Component Blueprint Guides

The following 13 reusable UI components have been fully styled and integrated within the GCSE Mastery HTML prototype. Maintain these precise class names and attributes to ensure layout alignment across code versions:

### 1. `ProgressCard`
* **Purpose:** High-impact hero card guiding students on their current lesson objectives.
* **Markup Anatomy:**
  ```html
  <div class="ProgressCard glassmorphism" style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(249, 115, 22, 0.05) 100%);">
    <!-- Subtitle category tag, title, body, and CTA button -->
  </div>
  ```

### 2. `SubjectCard`
* **Purpose:** Grid panel representing individual study subjects. Includes horizontal layout, subject icon, progress rings, and locked/unlocked states.
* **Markup Anatomy:**
  ```html
  <div class="SubjectCard glassmorphism" style="border-left: 4px solid var(--primary);">
    <!-- Subject header, SVG mastery ring, and level details -->
  </div>
  ```

### 3. `TopicNode`
* **Purpose:** Duolingo-style tree node representing a lesson segment in the revision path. Supports unlocked, active, locked, and completed states.
* **Markup Anatomy:**
  ```html
  <div class="TopicNode unlocked active" onclick="startPracticeQuiz('Fractions')">
    <span class="node-percentage">60%</span>
    <button class="node-button">🍰</button>
    <div class="node-label">Fractions Mastery</div>
  </div>
  ```

### 4. `QuestionCard`
* **Purpose:** Presenting the active question, difficulty tier, and syllabus grouping.
* **Markup Anatomy:**
  ```html
  <div class="QuestionCard glassmorphism">
    <div class="q-band">MUST (AQA GCSE FOUNDATION)</div>
    <div class="q-text">Calculate: 0.35 + 0.49</div>
  </div>
  ```

### 5. `HintPanel`
* **Purpose:** Expandable, violet-tinted hints guide. Slide-down animation on activation.
* **Markup Anatomy:**
  ```html
  <div class="HintPanel" id="quiz-hint-panel" style="display: none;">
    <!-- SARA help header and advice string -->
  </div>
  ```

### 6. `FeedbackPanel`
* **Purpose:** Real-time grading comments following answer check. Green for correct, red for misconceptions.
* **Markup Anatomy:**
  ```html
  <div class="FeedbackPanel" id="quiz-feedback-panel" style="display: none;">
    <!-- Success/Danger alert, correct values, and misconception walkthroughs -->
  </div>
  ```

### 7. `MasteryRing`
* **Purpose:** Lightweight circular SVG indicator displaying progress completion.
* **Markup Anatomy:**
  ```html
  <div class="MasteryRing">
    <svg>
      <circle class="ring-track" cx="35" cy="35" r="30"></circle>
      <circle class="ring-progress" style="stroke-dashoffset: 52.75;" cx="35" cy="35" r="30"></circle>
    </svg>
    <div class="ring-text">72%</div>
  </div>
  ```

### 8. `StreakBadge`
* **Purpose:** Highly visual burning flame indicator reporting student streak.
* **Markup Anatomy:**
  ```html
  <div class="StreakBadge">🔥 5 Days</div>
  ```

### 9. `XPBadge`
* **Purpose:** Energetic lightning indicator reporting student XP.
* **Markup Anatomy:**
  ```html
  <div class="XPBadge">⚡ 350 XP</div>
  ```

### 10. `GuardianSummaryCard`
* **Purpose:** Dashboard summary for parents displaying AI-generated performance reports.
* **Markup Anatomy:**
  ```html
  <div class="GuardianSummaryCard">
    <!-- Parent AI Insights title and SARA recommendations -->
  </div>
  ```

### 11. `WeakTopicList`
* **Purpose:** Focus list containing links to practice weak skills.
* **Markup Anatomy:**
  ```html
  <div class="WeakTopicList">
    <div class="WeakTopicList-item">
      <!-- Icon, Weakness description, and 'Practice Now' button -->
    </div>
  </div>
  ```

### 12. `TokenEfficiencyCard`
* **Purpose:** Credibility metric displaying local client grading rate (e.g. 91.5%).
* **Markup Anatomy:**
  ```html
  <div class="TokenEfficiencyCard">
    <!-- local grading bypass metrics, comparison bar, and icon -->
  </div>
  ```

### 13. `ClassHeatmap`
* **Purpose:** Interactive grid mapping students to lesson segments, colored by mastery thresholds.
* **Markup Anatomy:**
  ```html
  <div class="ClassHeatmap-grid">
    <!-- Student names, Topic nodes, and colorful grid cells representing scores -->
  </div>
  ```
