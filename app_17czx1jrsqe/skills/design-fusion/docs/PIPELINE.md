# Fusion Pipeline — Deep Dive

> Detailed explanation of how the three-phase fusion pipeline works, with examples, edge cases, and implementation notes.

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER REQUEST                               │
│         "Build a landing page for my fintech banking app"        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: DESIGN SYSTEM GENERATION (UI/UX Pro Max)              │
│                                                                   │
│  1. Classify product → Fintech / Banking                         │
│  2. Run 192 industry reasoning rules                             │
│  3. BM25 search: styles, colors, typography, patterns           │
│  4. Filter anti-patterns for banking                             │
│  5. Output complete design system → MASTER.md                    │
│                                                                   │
│  OUTPUT: Pattern + Style + Colors + Typography + Effects        │
│          + Anti-patterns + Pre-delivery checklist                │
└───────────────────────────────┬─────────────────────────────────┘
                                │  Design system as hard constraints
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: TASTE ELEVATION (Taste Skill)                          │
│                                                                   │
│  1. Ingest MASTER.md → extract colors, fonts, anti-patterns     │
│  2. Map Pro Max style → Taste variant (STYLE_MAPPING.md)        │
│  3. Set dials: VARIANCE=4, MOTION=2, DENSITY=6 (banking)       │
│  4. Apply anti-slop rules (no em-dashes, no placeholders)       │
│  5. Implement with GSAP micro-interactions                       │
│  6. Respect ALL design system constraints from Phase 1           │
│                                                                   │
│  OUTPUT: High-quality, non-generic UI implementation             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: FUSED QUALITY GATE                                     │
│                                                                   │
│  Run DELIVERY_CHECKLIST.md:                                       │
│  ├── Section 1: Design System Compliance (25%)                   │
│  ├── Section 2: Accessibility (20%)                              │
│  ├── Section 3: Responsive Design (15%)                          │
│  ├── Section 4: Anti-Slop (25%)  ← Taste's critical rules      │
│  ├── Section 5: Code Quality (10%)                               │
│  └── Section 6: Stack-Specific (5%)                              │
│                                                                   │
│  All critical items pass? → YES → DELIVER                        │
│                                → NO → Fix and re-check            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 Deep Dive: Design System Generation

### Input Processing

The user request is parsed to extract:
- **Product type** (from 192 categories): e.g., "fintech banking app" → `Fintech/Crypto` + `Banking`
- **Platform**: web, mobile, desktop (inferred or specified)
- **Stack**: React, Vue, SwiftUI, etc. (if specified)
- **Special requirements**: dark mode, multilingual, accessibility level, etc.

### Multi-Domain Search (5 parallel searches)

The reasoning engine runs 5 BM25 searches simultaneously:

| Search Domain | Dataset Size | Output |
|---------------|-------------|--------|
| Product type matching | 192 categories | Industry category + rules |
| Style recommendations | 79 searchable (50 active) | Ranked style list |
| Color palette selection | 192 palettes | 5-color palette + notes |
| Landing page patterns | 34 patterns | Pattern + section order |
| Typography pairing | 74 combinations | Font pair + mood |

### Reasoning Engine Logic

```
1. Match product → UI category rules
   └─ Apply industry-specific constraints (e.g., banking = trust, no playful)

2. Apply style priorities (BM25 ranking)
   └─ Score each style against product keywords
   └─ Filter out styles with industry anti-patterns
   └─ Return top-ranked style

3. Filter anti-patterns for industry
   └─ e.g., banking: "no neon colors", "no dark mode only", "no playful animations"

4. Process decision rules (JSON conditions)
   └─ if product == banking && style == glassmorphism → warn "may reduce trust"
   └─ if product == healthcare → require "high contrast, large text"
```

### Output Structure

The design system is saved to `design-system/[project-slug]/MASTER.md` with these mandatory sections:
- PATTERN (name, conversion strategy, CTA placement, section list)
- STYLE (name, keywords, best for, performance notes)
- COLORS (primary, secondary, CTA, background, text, notes)
- TYPOGRAPHY (heading, body, mood, best for, Google Fonts URL)
- KEY EFFECTS (animations, interactions)
- ANTI-PATTERNS (explicitly forbidden items)
- PRE-DELIVERY CHECKLIST (industry-specific checks)

---

## Phase 2 Deep Dive: Taste Elevation

### Design System Ingestion

Taste reads the MASTER.md and extracts:

| Field | Extracted As | Used For |
|-------|-------------|----------|
| COLORS → Primary | CSS variable `--color-primary` | All primary UI elements |
| COLORS → Secondary | CSS variable `--color-secondary` | Secondary elements |
| COLORS → CTA | CSS variable `--color-cta` | Call-to-action buttons |
| COLORS → Background | CSS variable `--color-bg` | Page/section backgrounds |
| COLORS → Text | CSS variable `--color-text` | Body text |
| TYPOGRAPHY → Heading | `font-family` + Google Fonts import | h1-h6 |
| TYPOGRAPHY → Body | `font-family` + Google Fonts import | p, li, etc. |
| ANTI-PATTERNS | Linting rules / hard constraints | Must not violate |
| STYLE → Name | Variant selection key | Which Taste variant to use |
| KEY EFFECTS | Motion direction | GSAP implementation guidance |

### Variant Selection

Using `docs/STYLE_MAPPING.md`, the Pro Max style name maps to:
1. A specific Taste variant (minimalist-ui, industrial-brutalist-ui, high-end-visual-design, gpt-taste, or default design-taste-frontend)
2. Base dial settings (VARIANCE, MOTION, DENSITY)
3. Industry adjustment (finance = -2 variance, -2 motion, etc.)

### Dial Implementation

| Dial | Range | What It Controls | Implementation |
|------|-------|-----------------|----------------|
| DESIGN_VARIANCE | 1-10 | Layout experimentation | 1=centered/clean, 10=asymmetric/experimental grid |
| MOTION_INTENSITY | 1-10 | Animation depth | 1=hover only, 10=scroll-triggered, magnetic, parallax |
| VISUAL_DENSITY | 1-10 | Information per viewport | 1=spacious (big whitespace), 10=dense (dashboard-like) |

### Anti-Slop Enforcement

These are **hard rules** that cannot be overridden:

1. **No em-dashes (—)** — Use commas, colons, or sentence breaks instead. Em-dashes are a hallmark of AI-generated text.
2. **No placeholder comments** — No `// TODO`, `// placeholder`, `// add later`. Everything must be implemented.
3. **No generic AI patterns** — No "gradient blob hero", no identical feature cards, no stock-photo people.
4. **No half-finished output** — All sections in the pattern must be implemented.
5. **No color-only meaning** — Badges, status indicators must have icons or text in addition to color.

### Motion Implementation (GSAP)

When MOTION_INTENSITY > 3, Taste implements GSAP animations:

| Motion Level | GSAP Features | Example |
|-------------|---------------|---------|
| 1-3 | CSS transitions only | hover color change, `transition: 200ms ease` |
| 4-5 | GSAP hover micro-interactions | `gsap.to(element, {scale: 1.02, duration: 0.2})` |
| 6-7 | Scroll-triggered reveals | `ScrollTrigger.create({trigger, start: "top 80%"})` |
| 8-10 | Magnetic buttons, parallax, staggered animations | `MagneticButton` component, `stagger: 0.05` |

---

## Phase 3 Deep Dive: Fused Quality Gate

### Checklist Execution

The gate runs 6 sections with 60+ individual checks. The process:

1. **Automated checks** (where possible): contrast ratios, semantic HTML, presence of em-dashes
2. **Manual review** (AI-assisted): layout quality, anti-slop assessment, industry appropriateness
3. **Scoring**: Each section weighted, critical items must pass

### Critical Items (Must Pass)

These items block delivery if failed:

| Section | Critical Item |
|---------|--------------|
| 1. Design System | No industry anti-patterns present |
| 1. Design System | Colors match design system exactly |
| 2. Accessibility | Text contrast ≥ 4.5:1 |
| 2. Accessibility | `prefers-reduced-motion` respected |
| 3. Responsive | No horizontal scroll at any breakpoint |
| 4. Anti-Slop | **No em-dashes in UI text** |
| 4. Anti-Slop | No generic AI purple/pink gradients |
| 5. Code Quality | No placeholder comments |
| 5. Code Quality | No half-finished sections |

### Failure Remediation

If a critical item fails:
1. **Identify the specific failure** (e.g., "contrast ratio 3.2:1 on secondary text")
2. **Fix the root cause** (e.g., darken text color or lighten background within design system)
3. **Re-run the affected section** of the checklist
4. **Document the fix** in the delivery notes

---

## Edge Cases

### Edge Case 1: User specifies a style that conflicts with industry rules

**Example:** User wants "cyberpunk style for a banking app"
**Resolution:**
- Phase 1: Flag the conflict — cyberpunk has neon colors, which is an anti-pattern for banking
- Action: Present the conflict to the user with options:
  - Option A: Keep cyberpunk but adjust to "trustworthy cyberpunk" (darker, less neon)
  - Option B: Use a banking-appropriate style with cyberpunk accents
  - Option C: Proceed with full cyberpunk (user accepts the risk)
- Never silently override the user's explicit style request, but always flag the conflict

### Edge Case 2: Design system produces colors with insufficient contrast

**Example:** Pro Max generates light grey text on white background (contrast 2.8:1)
**Resolution:**
- Phase 2: Taste detects the contrast issue during implementation
- Action: Adjust within the design system — darken the text color to a darker shade of the same hue
- Never introduce a new color outside the palette
- Document the adjustment in the page override file

### Edge Case 3: Multi-page project with conflicting design needs

**Example:** SaaS product with marketing landing page + dashboard + settings
**Resolution:**
- Phase 1: Generate Master design system for the overall product
- For each page: generate a page-specific override file (`pages/dashboard.md`, `pages/settings.md`)
- Page overrides only contain deviations from Master (e.g., dashboard has higher density)
- Taste reads Master + page override for each page

### Edge Case 4: Existing project redesign

**Example:** User wants to improve an existing codebase
**Resolution:**
- Skip Phase 1 pattern generation (the pattern already exists)
- Use Pro Max to audit the current design against industry rules
- Use Taste's `redesign-existing-projects` variant to audit and fix
- Apply Pro Max industry constraints to ensure the redesign stays appropriate
- Run fused quality gate

### Edge Case 5: Image-first workflow

**Example:** User wants to see visual references before coding
**Resolution:**
- Use Taste's `imagegen-frontend-web` to generate reference comps
- Use Pro Max to generate the design system in parallel
- Cross-reference: do the generated images respect the industry design system?
- If images conflict with design system, regenerate images with design system constraints
- Feed both references + design system to implementation phase

---

## Performance Considerations

### Token Usage

The fusion pipeline uses more tokens than either skill alone because:
- Phase 1 generates a complete design system (~500-800 tokens)
- Phase 2 ingests the design system and implements (~2000-5000 tokens for a full page)
- Phase 3 runs the checklist (~500 tokens)

**Total: ~3000-6500 tokens per page** (vs ~2000-4000 for a single skill)

**Mitigation:** For simple components (not full pages), skip Phase 1's full design system generation and use a lightweight version.

### Latency

The pipeline is sequential by design (Phase 2 depends on Phase 1 output). However:
- Phase 1's 5 searches run in parallel
- Phase 3's checklist sections can be assessed in parallel
- Image generation in the image-first workflow runs in parallel with Phase 1

---

*Pipeline v1.0 — three phases, one fused output.*
