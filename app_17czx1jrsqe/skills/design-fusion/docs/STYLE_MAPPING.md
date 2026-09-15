# Style Mapping — Pro Max Styles → Taste Variants

> Complete mapping table between UI/UX Pro Max's 79 searchable styles and Taste Skill's specialized variants. Used by the fusion pipeline to select the correct Taste variant after Pro Max determines the UI style.

---

## How to Use

1. Pro Max Phase 1 outputs a UI style name
2. Look up the style in this table
3. Select the corresponding Taste variant for Phase 2
4. Apply the recommended dial presets (adjust for industry if needed)
5. If no exact match, use the closest family match and default variant

---

## Mapping Table

### General Visual Families (43 styles)

| Pro Max Style | Taste Variant | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY | Notes |
|---------------|--------------|-----------------|------------------|----------------|-------|
| Minimalism | `minimalist-ui` | 5 | 2 | 5 | Notion/Linear editorial vibe |
| Flat Design | `minimalist-ui` | 4 | 1 | 5 | Restrained, crisp structure |
| Material Design 3 | `design-taste-frontend` | 4 | 4 | 6 | Platform material, follow M3 |
| Glassmorphism | `design-taste-frontend` | 6 | 5 | 4 | Frosted glass, depth layers |
| Claymorphism | `high-end-visual-design` | 5 | 3 | 4 | Soft, 3D clay-like elements |
| Neumorphism / Soft UI | `high-end-visual-design` | 4 | 3 | 3 | Soft shadows, premium feel |
| Brutalism | `industrial-brutalist-ui` | 8 | 4 | 6 | Raw, sharp, experimental |
| Neo-Brutalism | `industrial-brutalist-ui` | 7 | 3 | 6 | Bold borders, hard shadows |
| Bento Grid | `design-taste-frontend` | 7 | 4 | 7 | Modular card grid, Apple-style |
| Dark Mode | `gpt-taste` | 6 | 5 | 6 | Strict dark implementation |
| Light Mode (default) | `design-taste-frontend` | 5 | 3 | 5 | Standard light interface |
| AI-Native UI | `gpt-taste` | 7 | 6 | 5 | Chat-centric, streaming, generative |
| Skeuomorphism | `high-end-visual-design` | 3 | 2 | 4 | Real-world metaphors, textures |
| Swiss / International Typographic | `industrial-brutalist-ui` | 6 | 1 | 5 | Grid-based, Helvetica, asymmetric |
| Memphis Design | `design-taste-frontend` | 8 | 4 | 5 | Playful geometric, bold colors |
| Art Deco | `high-end-visual-design` | 5 | 2 | 4 | Elegant geometric, gold accents |
| Bauhaus | `industrial-brutalist-ui` | 6 | 2 | 5 | Primary colors, geometric forms |
| Retro / 80s | `design-taste-frontend` | 7 | 5 | 4 | Neon, grids, synthwave |
| Retro / 90s | `industrial-brutalist-ui` | 6 | 3 | 5 | Bold, chunky, playful |
| Y2K Aesthetic | `design-taste-frontend` | 7 | 4 | 4 | Glossy, metallic, playful |
| Cyberpunk | `gpt-taste` | 8 | 6 | 7 | Neon on dark, tech, glitch |
| Vaporwave | `design-taste-frontend` | 7 | 4 | 4 | Pastel, retro-futurism, Greek statues |
| Cottagecore | `high-end-visual-design` | 4 | 2 | 3 | Warm, organic, pastoral |
| Nordic / Scandinavian | `minimalist-ui` | 4 | 1 | 4 | Clean, light, functional |
| Japanese / Wabi-Sabi | `high-end-visual-design` | 4 | 2 | 3 | Imperfect, natural, restrained |
| Korean / Ddong | `design-taste-frontend` | 6 | 3 | 5 | Cute, rounded, pastel |
| Luxury / Premium | `high-end-visual-design` | 4 | 3 | 3 | Elegant, spacious, high-contrast typography |
| Editorial / Magazine | `minimalist-ui` | 7 | 1 | 4 | Typography-driven, asymmetric layouts |
| Portfolio / Creative | `design-taste-frontend` | 8 | 5 | 3 | Experimental, showcase-focused |
| Dashboard / Analytics | `gpt-taste` | 4 | 2 | 8 | Data-dense, charts, widgets |
| Landing / Marketing | `design-taste-frontend` | 6 | 4 | 4 | Conversion-focused, storytelling |
| E-commerce / Product | `design-taste-frontend` | 5 | 3 | 6 | Product grids, filters, cart |
| SaaS / App Interface | `gpt-taste` | 5 | 3 | 7 | Navigation, panels, modals |
| Mobile App | `design-taste-frontend` | 5 | 4 | 6 | Touch-first, bottom nav, gestures |
| Tablet / Kiosk | `design-taste-frontend` | 4 | 3 | 5 | Large touch targets, simplified nav |
| TV / 10-Foot | `design-taste-frontend` | 3 | 3 | 4 | Large text, remote navigation, focus |
| Wearable / Watch | `minimalist-ui` | 3 | 2 | 7 | Glanceable, compact, complications |
| AR / Spatial | `gpt-taste` | 7 | 6 | 4 | Volumetric, depth, passthrough |
| Print / PDF | `minimalist-ui` | 4 | 0 | 5 | CMYK-aware, fixed dimensions |
| Email / Newsletter | `minimalist-ui` | 3 | 0 | 5 | Table-based, inline CSS, accessible |
| Presentation / Slides | `design-taste-frontend` | 6 | 3 | 4 | Big type, minimal text per slide |

### Mobile-Specific Styles (2 styles)

| Pro Max Style | Taste Variant | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |
|---------------|--------------|-----------------|------------------|----------------|
| Material 3 Expressive | `design-taste-frontend` | 6 | 5 | 6 |
| iOS / Human Interface | `high-end-visual-design` | 4 | 4 | 5 |

### Official Platform/Design Systems (3 styles)

| Pro Max Style | Taste Variant | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |
|---------------|--------------|-----------------|------------------|----------------|
| Fluent 2 | `design-taste-frontend` | 4 | 3 | 6 |
| Shopify Polaris | `design-taste-frontend` | 4 | 2 | 6 |
| Adobe Spectrum | `design-taste-frontend` | 4 | 3 | 6 |

### Platform Material (1 style)

| Pro Max Style | Taste Variant | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |
|---------------|--------------|-----------------|------------------|----------------|
| Liquid Glass (Apple) | `high-end-visual-design` | 5 | 5 | 4 |

### Core Analytics Style (1 style)

| Pro Max Style | Taste Variant | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |
|---------------|--------------|-----------------|------------------|----------------|
| Analytics / Data Viz | `gpt-taste` | 4 | 2 | 8 |

---

## Supplemental Styles (29 styles)

These are returned for exact or explicit variant intent. Use the closest general family mapping.

| Pro Max Style | Closest Family | Taste Variant |
|---------------|---------------|--------------|
| Spectrum 2 | Adobe Spectrum | `design-taste-frontend` |
| *[Other supplemental styles]* | *Map to closest general family above* | *Corresponding variant* |

---

## Deprecated Styles (9 styles)

Legacy names redirect to canonical styles. Use the canonical style mapping.

| Deprecated Name | Canonical Style | Taste Variant |
|----------------|----------------|--------------|
| *[Deprecated names]* | *Redirect target* | *Canonical mapping* |

---

## Variant Selection Decision Tree

```
Pro Max outputs style name
        │
        ▼
Is it in the mapping table?
        │
   ┌────┴────┐
   │ Yes     │ No
   ▼         ▼
Use mapped  Is it a platform/design
variant     system (Fluent/Polaris/etc)?
              │
         ┌────┴────┐
         │ Yes     │ No
         ▼         ▼
      default    Map to closest
      variant    visual family
                   │
                   ▼
              Use that family's
              variant + dials
```

---

## Dial Adjustment by Industry

After selecting variant and base dials from the table, adjust for industry:

| Industry | VARIANCE Adjustment | MOTION Adjustment | DENSITY Adjustment |
|----------|---------------------|-------------------|-------------------|
| Finance / Banking | -2 | -2 | +1 |
| Healthcare | -2 | -2 | 0 |
| SaaS / B2B | 0 | -1 | +2 |
| E-commerce | +1 | 0 | +1 |
| Creative / Portfolio | +2 | +2 | -2 |
| Lifestyle / Wellness | 0 | 0 | -2 |
| Emerging Tech | +1 | +2 | 0 |

*Clamp all dials to 1-10 range after adjustment.*

---

*Style Mapping v1.0 — 79 Pro Max styles × 10 Taste variants = intelligent style selection.*
