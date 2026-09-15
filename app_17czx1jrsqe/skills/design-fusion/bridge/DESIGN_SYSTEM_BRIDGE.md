# Design System Bridge — Pro Max → Taste

> This document defines how the output of UI/UX Pro Max (Decision Layer) is translated into input constraints for Taste Skill (Execution Layer).

---

## Bridge Overview

```
┌─────────────────────┐          ┌─────────────────────┐
│  UI/UX Pro Max      │         │  Taste Skill         │
│  (Decision Layer)   │─────────▶│  (Execution Layer)  │
│                     │  Bridge  │                     │
│  • Industry rules   │          │  • Design language  │
│  • Design system    │          │  • Anti-slop rules  │
│  • Anti-patterns    │          │  • Motion dials     │
│  • Stack guidelines │          │  • Style variants    │
└─────────────────────┘          └─────────────────────┘
```

---

## Field-by-Field Translation

### 1. Pattern → Layout Skeleton

| Pro Max Output | Taste Interpretation | Constraint Level |
|----------------|---------------------|-----------------|
| Pattern name (e.g., "Hero-Centric + Social Proof") | Section order and structure is fixed | **HARD** — Taste cannot remove core sections |
| Conversion strategy (e.g., "Emotion-driven with trust") | Visual tone and CTA placement | **HARD** — CTA must remain above fold |
| Section list (ordered) | DOM order and semantic structure | **HARD** — order preserved |
| CTA repetition points | Where CTAs appear | **SOFT** — Taste can vary CTA styling within brand |

**Taste can:** Vary layout asymmetry, spacing rhythm, and visual hierarchy within each section.
**Taste cannot:** Remove sections, reorder core conversion flow, or hide CTAs.

### 2. Style → Taste Variant + Dials

| Pro Max Output | Taste Interpretation | Constraint Level |
|----------------|---------------------|-----------------|
| Style name (e.g., "Soft UI Evolution") | Maps to a Taste variant (see STYLE_MAPPING.md) | **HARD** — variant selected by mapping |
| Style keywords | Refines the visual direction within variant | **SOFT** — Taste interprets artistically |
| "Best for" context | Confirms industry appropriateness | **INFORMATIONAL** |
| Performance/accessibility notes | Implementation constraints | **HARD** — must respect |

### 3. Colors → Palette Lock

| Pro Max Output | Taste Interpretation | Constraint Level |
|----------------|---------------------|-----------------|
| Primary color hex | Exact CSS variable value | **HARD** — pixel-exact |
| Secondary color hex | Exact CSS variable value | **HARD** — pixel-exact |
| CTA color hex | Exact CSS variable value | **HARD** — pixel-exact |
| Background color hex | Exact CSS variable value | **HARD** — pixel-exact |
| Text color hex | Exact CSS variable value | **HARD** — pixel-exact |
| Color notes | Usage guidance (e.g., "gold accents for luxury") | **SOFT** — Taste decides accent placement |

**Taste can:** Generate tints/shades from the base colors (e.g., primary-50 to primary-900).
**Taste cannot:** Introduce colors outside the palette unless explicitly for semantic states (success/warning/error), which must be industry-appropriate.

### 4. Typography → Font Lock

| Pro Max Output | Taste Interpretation | Constraint Level |
|----------------|---------------------|-----------------|
| Font pairing (e.g., "Cormorant Garamond / Montserrat") | Google Fonts import + CSS font-family | **HARD** — exact fonts |
| Typography mood | Weight selection, letter-spacing, line-height | **SOFT** — Taste refines typographic rhythm |
| "Best for" context | Confirms appropriateness | **INFORMATIONAL** |

**Taste can:** Adjust weights, sizes, line-heights, letter-spacing for visual hierarchy.
**Taste cannot:** Swap fonts, use system fonts as primary, or introduce third typeface.

### 5. Key Effects → Motion Direction

| Pro Max Output | Taste Interpretation | Constraint Level |
|----------------|---------------------|-----------------|
| Effect descriptions (e.g., "Soft shadows + gentle hover") | Motion style direction | **HARD** — motion style locked |
| Industry motion notes | Constraints (e.g., "no harsh animations for banking") | **HARD** — must respect |

**Taste can:** Set exact MOTION_INTENSITY dial, implement GSAP skeletons, choose easing curves.
**Taste cannot:** Use motion styles explicitly forbidden by the industry rules.

### 6. Anti-Patterns → Hard Constraints

| Pro Max Output | Taste Interpretation | Constraint Level |
|----------------|---------------------|-----------------|
| Each anti-pattern entry | Explicitly forbidden implementation | **HARD** — zero tolerance |

**This is the most important bridge field.** Anti-patterns from Pro Max override any Taste aesthetic preference. Examples:

- "No AI purple/pink gradients for banking" → Taste cannot use them, even for "visual interest"
- "No dark mode for healthcare" → Taste must implement light mode
- "No emojis as icons" → Taste must use SVG icon sets (Lucide/Heroicons/Phosphor)

---

## Design System Persistence Format

When Pro Max generates a design system, it must be saved in this exact format for Taste to consume:

```markdown
# DESIGN SYSTEM — [Project Name]

## PATTERN
- Name: [pattern]
- Conversion: [strategy]
- CTA: [placement]
- Sections: [ordered list]

## STYLE
- Name: [style]
- Keywords: [keywords]
- Best For: [context]
- Notes: [performance/accessibility]

## COLORS
- Primary: #[hex] ([name])
- Secondary: #[hex] ([name])
- CTA: #[hex] ([name])
- Background: #[hex] ([name])
- Text: #[hex] ([name])
- Notes: [usage guidance]

## TYPOGRAPHY
- Heading: [font]
- Body: [font]
- Mood: [mood]
- Best For: [context]
- Google Fonts: [URL]

## KEY EFFECTS
- [effect 1]
- [effect 2]

## ANTI-PATTERNS
- [forbidden 1]
- [forbidden 2]

## PRE-DELIVERY CHECKLIST
- [ ] [check item]
```

Taste reads this file and extracts:
- `COLORS` → CSS custom properties
- `TYPOGRAPHY` → font imports and families
- `ANTI-PATTERNS` → linting rules / hard constraints
- `STYLE` → variant selection
- `KEY EFFECTS` → motion direction

---

## Page Override Mechanism

For multi-page projects, page-specific deviations from the Master design system follow this hierarchy:

```
design-system/[project]/
├── MASTER.md              ← Global source of truth (always read first)
└── pages/
    ├── dashboard.md       ← Page override (only deviations from Master)
    ├── checkout.md
    └── pricing.md
```

**Taste retrieval protocol:**
1. Always read `MASTER.md` first
2. Check if `pages/[current-page].md` exists
3. If it exists, merge: page overrides take precedence for conflicting fields
4. If it doesn't exist, use Master exclusively
5. Never let a page override violate industry anti-patterns from Master

---

## Conflict Escalation

If Taste encounters a situation where:
- The design system constraint would produce an objectively broken UI (e.g., color contrast < 4.5:1), OR
- Two design system fields contradict each other

**Action:** Stop and report the conflict to the user. Do not silently override the design system. Suggest the specific fix needed.

---

*Bridge v1.0 — ensures Decision Layer output is faithfully consumed by Execution Layer.*
