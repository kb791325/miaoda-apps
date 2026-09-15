# Fused Delivery Checklist

> Merged quality gate combining UI/UX Pro Max pre-delivery checks + Taste Skill anti-slop pre-flight. Run before delivering ANY UI/UX output.

**Status legend:** ✅ Pass | ❌ Fail | ⚠️ Warn (document and proceed)

---

## SECTION 1: Design System Compliance (Pro Max)

### 1.1 Industry Appropriateness
- [ ] Design follows the generated industry-specific design system
- [ ] No industry anti-patterns present (cross-check with MASTER.md)
- [ ] Color palette matches the design system exactly (hex values)
- [ ] Typography matches the design system (font families, not fallbacks)
- [ ] UI style matches the selected style family

### 1.2 Pattern & Conversion
- [ ] Landing page pattern sections are present in correct order
- [ ] Primary CTA is above the fold
- [ ] CTA is repeated at conversion-critical points
- [ ] No core conversion sections removed

### 1.3 Color & Contrast
- [ ] Light mode text contrast ≥ 4.5:1 (WCAG AA)
- [ ] Large text contrast ≥ 3:1
- [ ] UI components contrast ≥ 3:1
- [ ] No color-only meaning (icons/text accompany color cues)
- [ ] Focus states have visible contrast (≥ 3:1 against surroundings)

### 1.4 Typography
- [ ] Fonts loaded from Google Fonts (or specified source)
- [ ] No system font fallback as primary (unless design system specifies)
- [ ] Heading hierarchy is logical (h1 > h2 > h3 in size/weight)
- [ ] Line height appropriate for text density (1.5-1.7 for body)
- [ ] No text clipping at any viewport width
- [ ] Long tokens/URLs wrap safely

---

## SECTION 2: Accessibility (Pro Max + Taste)

### 2.1 Keyboard Navigation
- [ ] All interactive elements are keyboard reachable
- [ ] Focus order follows visual/logical order
- [ ] Focus states are clearly visible (not just default outline removed)
- [ ] No keyboard traps
- [ ] Skip-to-content link present (for multi-section pages)

### 2.2 Screen Reader
- [ ] All images have meaningful alt text (or alt="" for decorative)
- [ ] Form fields have associated labels
- [ ] ARIA roles used correctly (no over-engineering)
- [ ] Live regions announced for dynamic content
- [ ] Icons used as buttons have accessible labels

### 2.3 Motion & Reduction
- [ ] `prefers-reduced-motion` respected (disable non-essential animations)
- [ ] No flashing content (>3 flashes/second)
- [ ] Motion has meaningful purpose, not decoration-only
- [ ] Animation timing appropriate for platform/component

### 2.4 Resilience
- [ ] Text reflows without clipping at 200% zoom
- [ ] Content readable at 375px width
- [ ] Chips/tags wrap or use +n disclosure (no horizontal overflow)
- [ ] Badge meaning not color-only
- [ ] Rapid interactions don't break final state (focus, content, semantics)

---

## SECTION 3: Responsive Design (Pro Max)

- [ ] Tested at 375px (mobile)
- [ ] Tested at 768px (tablet)
- [ ] Tested at 1024px (small desktop)
- [ ] Tested at 1440px (standard desktop)
- [ ] No horizontal scroll at any breakpoint
- [ ] Touch targets ≥ 44×44px on mobile
- [ ] Navigation adapts (hamburger on mobile, full on desktop)
- [ ] Images are responsive (srcset or max-width: 100%)

---

## SECTION 4: Anti-Slop (Taste Skill) — CRITICAL

### 4.1 No Generic AI Patterns
- [ ] No "AI purple/pink gradients" unless explicitly in design system
- [ ] No generic hero with "headline + subhead + two buttons + gradient blob"
- [ ] No feature grid with identical icon-card-icon-card pattern
- [ ] No stock-photo people pointing at screens
- [ ] No "trusted by" logo bar with greyed-out placeholder logos

### 4.2 Typography Anti-Slop
- [ ] **No em-dashes (—) in UI text** (use commas, colons, or sentence breaks)
- [ ] No ALL CAPS body text (only for labels/eyebrows with letter-spacing)
- [ ] No centered text for paragraphs longer than 2 lines
- [ ] No justified text (uneven word spacing looks bad)
- [ ] No line-height < 1.4 for body text

### 4.3 Layout Anti-Slop
- [ ] No max-width: 1200px container with everything centered (vary width by section)
- [ ] No uniform padding (section padding should vary by content density)
- [ ] No border-radius: 12px on everything (vary by component type)
- [ ] No box-shadow on every card (use shadows purposefully)
- [ ] No identical section heights (vary by content)

### 4.4 Color Anti-Slop
- [ ] No grey text on grey background (insufficient contrast)
- [ ] No pure black (#000) for text (use off-black like #1a1a1a)
- [ ] No pure white (#FFF) backgrounds when design system specifies warm/cool white
- [ ] No color overload (max 3 brand colors + neutrals)
- [ ] Hover states are distinct (not just opacity change)

### 4.5 Interaction Anti-Slop
- [ ] `cursor: pointer` on all clickable elements
- [ ] No hover effects that cause layout shift (use transform)
- [ ] Transitions ≤ 300ms for micro-interactions
- [ ] No infinite animations on static content
- [ ] Button states: default, hover, active, focus, disabled — all distinct

---

## SECTION 5: Code Quality (Taste + Pro Max)

### 5.1 Completeness
- [ ] **No placeholder comments** (no `// TODO`, `// placeholder`, `// add later`)
- [ ] **No half-finished sections** (all sections in pattern are implemented)
- [ ] No `lorem ipsum` (real or realistic placeholder content)
- [ ] All links have href (not `#` unless explicitly prototype)
- [ ] All images have src (not broken/empty)

### 5.2 Semantics
- [ ] Correct HTML5 semantic elements (header, nav, main, section, article, footer)
- [ ] One h1 per page
- [ ] Lists use ul/ol (not divs with bullet characters)
- [ ] Buttons are `<button>` (not divs with onClick)
- [ ] Forms use proper structure (fieldset, legend, label, input)

### 5.3 Performance
- [ ] No layout thrashing (avoid synchronous layout reads/writes)
- [ ] Images optimized (WebP/AVIF where possible)
- [ ] Fonts loaded with font-display: swap
- [ ] No unnecessary JavaScript for CSS-achievable effects
- [ ] CSS not overly nested (max 3 levels)

---

## SECTION 6: Stack-Specific (Pro Max)

*Check only the items relevant to the selected stack.*

### React / Next.js
- [ ] Keys on list items are stable (not array index)
- [ ] No unnecessary re-renders (memo where appropriate)
- [ ] Server components where possible (Next.js App Router)
- [ ] No `any` types (TypeScript)

### HTML + Tailwind
- [ ] No custom CSS when Tailwind utility exists
- [ ] Responsive prefixes used (sm:, md:, lg:)
- [ ] No inline styles (except dynamic values)
- [ ] Group/hover states correct

### SwiftUI / iOS
- [ ] Safe area insets respected
- [ ] Dynamic Type supported
- [ ] No force unwrapping
- [ ] HIG compliance

---

## SCORING

| Section | Weight | Critical Items |
|---------|--------|---------------|
| 1. Design System Compliance | 25% | Industry anti-patterns, color/typo match |
| 2. Accessibility | 20% | Contrast, keyboard, reduced-motion |
| 3. Responsive Design | 15% | No horizontal scroll, touch targets |
| 4. Anti-Slop | 25% | No em-dashes, no generic AI patterns, no placeholders |
| 5. Code Quality | 10% | No placeholders, semantics, completeness |
| 6. Stack-Specific | 5% | Stack best practices |

**Delivery threshold:** All CRITICAL items must pass. Overall score ≥ 90%.

**If below threshold:** Fix issues before delivery. Do not ship with known critical failures.

---

*Fused Checklist v1.0 — combining structural correctness with visual originality.*
