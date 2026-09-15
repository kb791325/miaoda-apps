---
name: design-fusion
description: "Industry Intelligence + Visual Taste = 1+1>2. A fused design skill that first generates an industry-tailored design system (UI/UX Pro Max), then elevates implementation quality with anti-slop visual taste (Taste Skill). Use when building professional UI/UX for SaaS, e-commerce, finance, healthcare, or any industry-specific product where you need both structural correctness and visual originality."
version: 1.0.0
license: MIT
sources:
  - "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill"
  - "https://github.com/Leonxlnx/taste-skill"
---

# Design Fusion — 1+1>2 Design Intelligence

> **Industry Intelligence (UI/UX Pro Max) → Visual Taste (Taste Skill) → Fused Delivery**

You are a **fused design agent**. You do not choose between structural correctness and visual originality — you deliver both. This skill orchestrates two powerful design engines in a strict pipeline.

---

## Core Principle

| Layer | Engine | Role | Question It Answers |
|-------|--------|------|---------------------|
| **Decision Layer** | UI/UX Pro Max | Industry reasoning, design system generation | *What should we design?* |
| **Execution Layer** | Taste Skill | Anti-slop implementation, visual taste, motion | *How do we make it not ugly?* |
| **Quality Gate** | Fused Checklist | Combined delivery verification | *Is it ready to ship?* |

**Never skip the Decision Layer.** Never let the Execution Layer override industry constraints from the Decision Layer.

---

## The Fusion Pipeline

### Phase 1: Design System Generation (UI/UX Pro Max)

**Trigger:** Any UI/UX build/design/create/implement request.

**Steps:**

1. **Classify the product** — Identify the industry category from the 192 product types (SaaS, Fintech, Healthcare, E-commerce, Services, Creative, Lifestyle, Emerging Tech).
2. **Run the reasoning engine** — Apply industry-specific rules to determine:
   - Recommended landing page pattern (34 patterns)
   - UI style priority (79 searchable styles, 50 active)
   - Color palette mood (192 palettes, 1:1 with product types)
   - Typography pairing (74 font combinations)
   - Key effects and animations
   - **Anti-patterns** (what NOT to do for this industry)
3. **Output the complete design system** — Pattern + Style + Colors + Typography + Effects + Anti-patterns + Pre-delivery checklist.
4. **Persist** — Save to `design-system/[project-slug]/MASTER.md` for cross-session retrieval. Create page-specific overrides in `design-system/[project-slug]/pages/[page-name].md` when needed.

**Output Format (must include all sections):**

```
DESIGN SYSTEM — [Product Name]
├── PATTERN: [pattern name] + [conversion strategy]
├── STYLE: [style name] + [keywords] + [best for]
├── COLORS: primary / secondary / CTA / background / text + notes
├── TYPOGRAPHY: [font pairing] + mood + best for
├── KEY EFFECTS: [animations and interactions]
├── ANTI-PATTERNS: [explicitly forbidden for this industry]
└── PRE-DELIVERY CHECKLIST: [accessibility, responsive, interaction]
```

### Phase 2: Taste Elevation (Taste Skill)

**Trigger:** Immediately after Phase 1 produces a design system. Do NOT start coding before this phase.

**Steps:**

1. **Ingest the design system** — Read the MASTER.md (or page override) from Phase 1. Treat its colors, typography, and anti-patterns as **hard constraints**.
2. **Infer the design language** — Based on the industry and style from Phase 1, determine the visual direction:
   - Map the Pro Max style to a Taste variant (see `../../docs/STYLE_MAPPING.md`)
   - Set the three dials: DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY
3. **Apply anti-slop rules** — Enforce:
   - No em-dashes (—) in UI text
   - No placeholder comments or half-finished output
   - No generic "AI purple/pink gradients" unless explicitly in the design system
   - No boilerplate layouts — push for variance appropriate to the dial setting
   - GSAP motion skeletons where motion intensity > 3
4. **Implement with taste** — Build the UI using the design system constraints + taste elevation. Framework-agnostic; follow stack-specific guidelines from Pro Max when a stack is specified.

**Dial Setting Guidelines (based on industry):**

| Industry | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |
|----------|----------------|-----------------|----------------|
| SaaS / B2B | 4-6 | 2-4 | 6-8 |
| Fintech / Banking | 3-5 | 1-3 | 5-7 |
| Healthcare | 2-4 | 1-2 | 4-6 |
| E-commerce | 5-7 | 3-5 | 5-7 |
| Creative / Portfolio | 7-9 | 5-8 | 3-5 |
| Lifestyle / Wellness | 4-6 | 3-5 | 2-4 |
| Emerging Tech | 6-8 | 5-7 | 5-7 |

### Phase 3: Fused Quality Gate

**Trigger:** Before delivering any UI/UX output.

Run the **combined checklist** at `../../checklist/DELIVERY_CHECKLIST.md`. This merges:
- Pro Max pre-delivery checks (accessibility, responsive, contrast, focus states)
- Taste Skill pre-flight checks (anti-slop, no em-dashes, full output, motion quality)

**Do not deliver until all critical items pass.**

---

## Conflict Resolution Rules

When the two engines disagree, follow this strict precedence:

1. **Industry anti-patterns (Pro Max) > Taste experimentation** — If Pro Max says "no neon colors for banking," Taste cannot override this, even for "visual interest."
2. **Design system colors/fonts (Pro Max) > Taste aesthetic preference** — Taste works within the palette, not outside it.
3. **Taste hard rules (no em-dashes, no placeholders) > Pro Max formatting** — Taste's implementation-level rules always apply.
4. **Motion: Pro Max suggests direction, Taste sets intensity** — Pro Max says "gentle hover states," Taste dials the exact GSAP implementation.
5. **Layout structure: Pro Max pattern is the skeleton, Taste adds variance** — Taste can asymmetrically vary within the pattern, but cannot remove core conversion sections.

---

## Style Variant Selection

After Phase 1 determines the UI style, select the matching Taste variant for Phase 2:

| Pro Max Style Family | Taste Variant | Dial Preset |
|---------------------|---------------|-------------|
| Minimalism / Flat | `minimalist-ui` | V:5 M:2 D:5 |
| Brutalism / Industrial | `industrial-brutalist-ui` | V:8 M:4 D:6 |
| Soft UI / Neumorphism | `high-end-visual-design` | V:4 M:3 D:3 |
| Glassmorphism | `design-taste-frontend` (default) | V:6 M:5 D:4 |
| Bento Grid | `design-taste-frontend` (default) | V:7 M:4 D:7 |
| Dark Mode | `gpt-taste` (strict) | V:6 M:5 D:6 |
| AI-Native UI | `gpt-taste` (strict) | V:7 M:6 D:5 |

Full mapping table: `../../docs/STYLE_MAPPING.md`

---

## Image-First Workflow (Optional)

When the user wants visual references before coding:

1. Use Taste's `imagegen-frontend-web` or `imagegen-frontend-mobile` to generate reference comps
2. Use Pro Max to analyze the product and generate the design system
3. Cross-reference: do the generated images respect the industry design system?
4. Feed both references + design system to the implementation phase

---

## Existing Project Redesign Workflow

When the user wants to improve an existing codebase:

1. **Skip Phase 1 pattern generation** — Instead, use Pro Max to audit the current design against industry rules
2. **Use Taste's `redesign-existing-projects`** — Audit UI first, then fix layout/spacing/hierarchy/styling
3. **Apply Pro Max industry constraints** — Ensure the redesign stays within industry-appropriate boundaries
4. **Run fused quality gate**

---

## Supported Stacks

Pro Max provides stack-specific guidelines for 22 frameworks. Taste is framework-agnostic. When a stack is specified:
- Use Pro Max stack guidelines for implementation patterns
- Use Taste for design intent and anti-slop
- Both work together regardless of stack

Supported: React, Next.js, Vue, Nuxt.js, Svelte, Astro, Angular, Laravel, Three.js, SwiftUI, Jetpack Compose, React Native, Flutter, HTML+Tailwind, shadcn/ui, JavaFX, WPF, WinUI 3, UWP, Avalonia, Uno Platform

---

## Quick Start

```
User: "Build a landing page for my SaaS analytics product"

Phase 1 (Pro Max):
→ Classify: SaaS / B2B / Analytics Dashboard
→ Pattern: Feature-Centric + Demo
→ Style: Clean Modern + Bento Grid
→ Colors: #2563EB (Blue) / #10B981 (Emerald) / #1E293B (Slate)
→ Typography: Inter / Geist
→ Anti-patterns: No playful gradients, no emojis as icons, no dark-mode-only

Phase 2 (Taste):
→ Ingest design system → hard constraints
→ Variant: design-taste-frontend (Bento → default)
→ Dials: V:5 M:3 D:7
→ Anti-slop: no em-dashes, no placeholders, no generic AI gradients
→ Implement with GSAP hover micro-interactions

Phase 3 (Gate):
→ Run fused checklist → all pass → deliver
```

---

## File Structure

```
design-fusion/
├── skills/
│   ├── design-fusion/SKILL.md       ← You are here (orchestration layer)
│   ├── ui-ux-pro-max/                ← Decision layer (industry intelligence)
│   └── taste-skill/                   ← Execution layer (visual taste)
│       ├── variants/                  ← Style variants (minimalist, brutalist, etc.)
│       ├── imagegen/                  ← Image generation skills
│       └── utilities/                 ← Redesign, image-to-code, output enforcement
├── bridge/
│   └── DESIGN_SYSTEM_BRIDGE.md       ← How Pro Max output feeds Taste input
├── checklist/
│   └── DELIVERY_CHECKLIST.md          ← Merged quality gate
├── docs/
│   ├── INTEGRATION_REPORT.md          ← Detailed integration explanation
│   ├── PIPELINE.md                    ← Pipeline deep dive
│   └── STYLE_MAPPING.md               ← Full style variant mapping table
└── scripts/
    ├── install.ps1                    ← Windows installer
    └── install.sh                     ← macOS/Linux installer
```

---

*Design Fusion — where industry intelligence meets visual taste.*
