# SARA Rebrand (Deep Violet Space Sunset Theme) Design Spec

- **Date**: 2026-06-12
- **Platform**: React, Next.js (App Router), Tailwind CSS v4, Framer Motion
- **Subject**: Year 8 & 9 GCSE Maths revision assistant rebrand to SARA

---

## 1. Executive Summary

Transform the existing teaching chatbot into **SARA (Smart AI Reasoning Assistant)**, a premium, highly engaging GCSE Maths learning platform for Year 8 & 9 students. The interface will adopt SARA's signature **Deep Violet Space Sunset** aesthetic, featuring rich translucent cards, animated orbital SVGs, customized progress tracking dashboards, and polished interactive states.

---

## 2. Design System & Tokens (Cosmic Sunset)

We will modify `app/globals.css` to centralize SARA's design tokens in `:root` and remove dual light/dark variations to lock SARA permanently into its default cosmic dark palette.

```css
:root {
  /* Cosmic Dark Base Colors */
  --background: #120F35;
  --foreground: #FFFFFF;
  --card: rgba(255, 255, 255, 0.05);
  --card-foreground: #FFFFFF;
  --popover: #15143C;
  --popover-foreground: #FFFFFF;
  
  /* Brand Signatures */
  --primary: #F97316;             /* Sunset Coral */
  --primary-foreground: #FFFFFF;
  --secondary: rgba(255, 255, 255, 0.08);
  --secondary-foreground: rgba(255, 255, 255, 0.8);
  
  /* Accent Colors */
  --accent: #7C3AED;              /* Domain Violet */
  --accent-foreground: #FFFFFF;
  --muted: rgba(255, 255, 255, 0.05);
  --muted-foreground: rgba(255, 255, 255, 0.6);
  --border: rgba(255, 255, 255, 0.08);
  --input: rgba(255, 255, 255, 0.06);
  --ring: #7C3AED;

  /* Specific Rebrand Accents */
  --brand-coral: #F97316;
  --brand-amber: #F59E0B;
  --brand-pink: #EF4444;
  --brand-violet: #7C3AED;
  
  /* Gradients */
  --gradient-sunset: linear-gradient(135deg, #F97316, #EF4444);
  --gradient-sara: linear-gradient(135deg, #F97316, #7C3AED);
  --gradient-sara-reverse: linear-gradient(135deg, #7C3AED, #F97316);

  /* Sidebar Tokens */
  --sidebar: #0F0D29;
  --sidebar-foreground: rgba(255, 255, 255, 0.8);
  --sidebar-border: rgba(255, 255, 255, 0.06);
  --sidebar-accent: rgba(255, 255, 255, 0.04);
  --sidebar-accent-foreground: #FFFFFF;
}
```

---

## 3. SARA Mascot with Interactive Moods (`sara-mascot.tsx`)

A self-contained SVG mascot in `components/brand/sara-mascot.tsx` supporting:
- **`happy`**: Floating motion with normal rotating orbital rings.
- **`thinking`**: Faster orbit duration, pulsing core glowing light.
- **`celebrating`**: Extra sparkle text stars, bouncing animations.

The structure features:
- ViewBox: `0 0 160 160`
- Props: `size` (default: 130), `animated` (default: true), `mood` (default: "happy"), `className` (optional).

---

## 4. Master Redesigned Dashboard (`sara-dashboard.tsx`)

Replaces the landing screen (when `messages.length === 0`) with SARA's unified dashboard layout combining:
1. **Coach Bubble**: At the very top, encouraging instruction box in violet backdrop (`bg-violet-950/15 border-violet-500/20`).
2. **Hero Header**: Styled heading **"Learn Maths <span class="glowing-sunset">Without Feeling Stuck</span>"**, immediately paired with the floating **SaraMascot** on the right side.
3. **Card Selection Grid**: A 2-column container:
   - **Left Card**: **"What do you want to learn?"** hosting the `TopicPasteBox` and its amber gradient "Find my topics" action button.
   - **Right Card**: **"What is SARA?"** highlighting SARA's properties and the Year 8 & Year 9 level toggle pills.
4. **Your Learning Journey**: Header in capitalized grey letter spacing.
5. **Player Stats Matrix**: 4-column glass container containing Streak 🔥, Revision XP ⚡, GCSE Level 🎯, GCSE Milestones 🏆.
6. **GCSE Missions Map**: Visual Node Progress Map (`MissionMap`).
7. **What You'll Learn**: Dynamic mission cards at the bottom listing the Year group topics with complete progress bar trackers.

---

## 5. Header & Sidebar Adaptations

### A. Navigation Header (`chat-header.tsx`)
- **Logo**: A red circle containing a customized vector `S` logo, followed by thick white **SARA** typography.
- **Topic Picker**: Clean dropdown explicitly labeled `Choose a Topic ∨`.
- **User Dropdown**: Styled as a lock badge (`🔒 dhrubo@gmail.com ∨`) when logged in.
- **Mute / Audio Button**: Minimal glass badge sound toggle in the right action bar.

### B. App Sidebar (`app-sidebar.tsx`)
- **Action Buttons**: Translucent glass tiles for "New mission" and "Delete all".
- **GCSE Domains Rollup**: Vertical summary bars inside the scrolling container tracking Numbers, Ratio/Proportion, and Algebra progress.
- **Footer**: Profile item showing the initial letter (e.g., `D`) in SARA's sunset gradient badge, with up/down dropdown chevron.

---

## 6. Implementation Principles
1. **Component Modularity**: Every major section must reside in cleanly structured files following the repository's modularity conventions.
2. **No AI Slop**: Retain precise translucent boundaries (`backdrop-filter: blur(12px)`), avoiding generic colorful meshes, and restricting emojis strictly to key headers and SARA bubbles.
