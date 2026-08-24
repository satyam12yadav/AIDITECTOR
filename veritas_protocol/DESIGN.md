---
name: Veritas Protocol
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 16px
  container-max: 1280px
---

## Brand & Style

The design system is engineered for high-stakes information environments, targeting institutional users, journalists, and analysts. The brand personality is authoritative, analytical, and vigilant. It prioritizes the "Verification" theme, where every UI element feels like a confirmed data point or a secured perimeter.

The aesthetic follows a **Corporate / Modern** approach with a heavy emphasis on **Precision Minimalism**. The visual language is stripped of decorative flourishes to ensure the focus remains on evidence and analysis. The emotional response is one of absolute trust, objectivity, and calm efficiency.

## Colors

The palette is anchored by "Deep Navy" (#0F172A) to evoke institutional permanence and "Clean White" for maximum legibility. 

A rigorous semantic credibility scale is used for data visualization:
- **Emerald (Highly Credible):** Used for verified sources and confirmed facts.
- **Slate (Neutral):** Used for developing information or data-heavy backgrounds.
- **Crimson (Highly Suspicious):** Reserved for debunked claims or high-risk content.
- **Amber (Warning):** For missing context or unverified claims.

Background surfaces utilize subtle shifts in gray to define information hierarchies without relying on heavy lines.

## Typography

The typography system is built on **Inter** for its neutral, systematic character. It ensures that the interface stays out of the way of the content. 

- **Headlines:** Use tight letter-spacing and heavy weights to create a sense of importance and "Finality."
- **Body Text:** Optimized for long-form report reading with generous line heights.
- **Labels:** We introduce **JetBrains Mono** for technical metadata, source timestamps, and credibility scores to reinforce the "Data Analysis" and "Forensic" feel of the product.

## Layout & Spacing

This design system uses a **Fixed Grid** on desktop and a **Fluid Grid** on mobile. The layout is inspired by technical whitepapers and forensic reports.

- **Grid:** A 12-column grid system with significant 24px gutters to allow data visualizations to breathe.
- **Margins:** Large 64px outer margins on desktop create a "Letterhead" feel, focusing the user's eye on the central analysis column.
- **Rhythm:** A 4px baseline grid ensures perfect vertical alignment of text and data tables.
- **Information Density:** High density in sidebar "Evidence" panels, balanced by high whitespace in the primary "Analysis" viewport.

## Elevation & Depth

To maintain a serious, high-trust tone, the system uses **Tonal Layers** and **Low-contrast Outlines** rather than aggressive shadows.

- **Surfaces:** Depth is communicated through color shifts (e.g., a Slate-50 background with White cards).
- **Outlines:** All containers use a 1px solid border (#E2E8F0) to define clear boundaries.
- **Shadows:** When necessary for modals or dropdowns, use a single, ultra-diffused "Ambient" shadow: `0 4px 20px rgba(15, 23, 42, 0.08)`. This creates a subtle lift without feeling "floaty" or playful.
- **State Changes:** Interactive elements use subtle inner glows or slight border-color shifts rather than dramatic elevation changes.

## Shapes

The design system utilizes **Soft** (1) roundedness. 

- **Standard Radius:** 0.25rem (4px). This creates a sharp, professional edge that feels precise but modern.
- **Data Containers:** Large cards and dashboard modules should use 0.5rem (8px) for `rounded-lg`.
- **Exceptions:** No pill-shaped buttons. All interactive elements must maintain a structured, rectangular profile to reflect the "Verification Block" theme.

## Components

- **Buttons:** Solid Deep Navy for primary actions. Secondary buttons use a transparent background with a 1px Slate-200 border. No gradients or shadows.
- **Verification Chips:** Small, high-contrast labels using the Credibility Scale colors. Text is all-caps JetBrains Mono for a forensic look.
- **Input Fields:** Minimalist design with a 1px border. Focus state is indicated by a 2px Deep Navy border—no glow.
- **Data Tables:** Zebra-striped with very faint grays. Header rows are all-caps, bold, and use the label-code style.
- **Credibility Gauge:** A linear horizontal progress bar using semantic colors to indicate the probability of truth, avoiding "speedometer" style gauges which are too casual.
- **Source Cards:** Cards that group evidence should have a left-border accent using the semantic color of the source's credibility.