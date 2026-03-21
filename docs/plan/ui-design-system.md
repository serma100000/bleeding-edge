# CHRONOS Design System Plan

> Verifiable Epigenetic Biological Age Prediction System
> Enterprise React Application -- Design System Specification

---

## 1. Technology Stack

### 1.1 Core Framework

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| **Runtime** | React | 19.x | Concurrent features, Server Components, `use()` hook for async data, Actions API for mutations |
| **Meta-framework** | Next.js | 15.x (App Router) | RSC-first architecture, streaming SSR, edge middleware for auth gates, API routes for BFF pattern |
| **Bundler** | Turbopack (via Next.js) | -- | 100x faster HMR than Webpack in incremental mode; native to Next.js 15 |
| **Language** | TypeScript | 5.x (strict mode) | Non-negotiable for enterprise; all public APIs must have typed interfaces per project architecture rules |

**Why Next.js over Vite SPA:** CHRONOS handles sensitive health data. SSR provides faster first-paint for dashboard-heavy views, edge middleware enforces auth before any client JS loads, and API routes keep proof-verification endpoints co-located without a separate backend gateway. If a pure SPA is later required (e.g., embedded in an EHR iframe), a Vite build target can be added as a secondary output.

### 1.2 Component Library

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Primitives** | Radix UI | Unstyled, accessible (WCAG 2.1 AA), composable primitives. Foundation of shadcn/ui. |
| **Component System** | shadcn/ui (CLI v4, March 2026) | Copy-paste ownership model -- components live in the repo, not node_modules. Design System Presets allow encoding the CHRONOS theme as a portable config string. AI Agent Skills integration means future coding agents understand the component API natively. 104k+ GitHub stars, 560k+ weekly npm downloads. |
| **Supplementary** | Radix Themes (selective) | For complex compound components (e.g., Popover, Dialog, Command Palette) where shadcn's base needs extended behavior. |

**Rejected alternatives:**
- MUI: Too opinionated for a custom scientific aesthetic; Material Design language conflicts with CHRONOS brand.
- Ant Design: Enterprise-grade but heavy bundle, CJK-first documentation, less flexible theming for dark-mode-primary apps.
- Chakra UI: Good DX but runtime CSS-in-JS is incompatible with RSC streaming.

### 1.3 Styling

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Utility Framework** | Tailwind CSS v4.2 | Oxide engine (Rust) delivers 5x faster full builds, 100x faster incremental. CSS-first config via `@theme` directives. `color-mix()` and `@property` enable the CHRONOS gradient system natively. Cascade layers prevent specificity conflicts with shadcn. |
| **Escape Hatch** | CSS Modules (co-located) | For truly complex animations or SVG-heavy chart wrappers where utility classes become unreadable. |
| **Theme Engine** | Tailwind + CSS custom properties | Design tokens defined as CSS variables in a single `chronos-tokens.css` file, consumed by both Tailwind and raw CSS. |

**Rejected:** Styled Components / Emotion (runtime CSS-in-JS incompatible with RSC), vanilla-extract (build-time is fine but adds tooling complexity without clear benefit over Tailwind v4).

### 1.4 Charts and Data Visualization

| Use Case | Library | Rationale |
|----------|---------|-----------|
| **Standard charts** (line, bar, area, scatter) | Recharts | 24.8k GitHub stars, declarative JSX API, SVG-based with built-in animation and responsive sizing. Excellent for biological age trend lines, methylation heatmaps, and comparison charts. |
| **Advanced / custom viz** | Nivo | D3-powered with SSR support, theming system, and motion built in. Used for radar charts (biomarker profiles), Sankey diagrams (data flow), and choropleth maps (population studies). |
| **Low-level custom** | Visx (Airbnb) | Tree-shakable D3 primitives in React. For the one-off visualizations unique to CHRONOS: CpG site plots, epigenetic clock dials, Horvath clock visualizations. |
| **Real-time streaming** | uPlot (lightweight canvas) | For live pipeline monitoring -- sub-millisecond rendering of time-series data during active processing runs. |

**Why not a single library:** Epigenetic data visualization spans standard dashboards (Recharts), scientific diagrams (Visx), and real-time monitoring (uPlot). No single library covers all three well.

### 1.5 Graph Visualization

| Library | Use Case |
|---------|----------|
| **React Flow (@xyflow/react)** | Primary choice for the pipeline builder/editor. Node-based UI with zooming, panning, minimap, and custom node types. Used by Stripe and Typeform. Ideal for representing CHRONOS data processing pipelines (FASTQ input -> alignment -> methylation calling -> age prediction -> proof generation). |
| **D3-force (via Visx)** | For network graphs showing CpG site relationships, gene regulatory networks, and biomarker correlation clusters. |
| **Cytoscape.js** | Fallback for very large biological network graphs (1000+ nodes) where D3-force performance degrades. |

### 1.6 Data Tables

| Library | Use Case |
|---------|----------|
| **TanStack Table v8** | Headless table logic (5-14KB). Full control over markup and styling. Handles sorting, filtering, pagination, column pinning, row virtualization. Used for sample manifests, batch results, audit logs, and proof registries. |
| **TanStack Virtual** | Row virtualization addon for tables with 10k+ rows (e.g., CpG-level methylation data). |

**Rejected:** AG Grid (enterprise license cost, overkill for CHRONOS table complexity), MUI DataGrid (couples to MUI theming).

### 1.7 Animation

| Library | Use Case |
|---------|----------|
| **Motion (formerly Framer Motion)** | Primary animation library. 30M+ monthly npm downloads. Declarative API for layout animations, page transitions, gesture-driven interactions, and the proof verification sequence. |
| **React Transition Group** | Lightweight enter/exit transitions for route changes and modal mount/unmount. |
| **GSAP** | Reserved for the "hero" landing page animation and any WebGL/canvas-based visualizations (e.g., DNA helix intro). Not used in the dashboard proper. |

### 1.8 State Management

| Layer | Library | Scope |
|-------|---------|-------|
| **Server State** | TanStack Query v5 | All API data: pipeline runs, sample results, proof statuses, user profiles. Handles caching, background refetch, optimistic updates, and stale-while-revalidate. |
| **Global Client State** | Zustand | UI preferences (sidebar collapsed, dark/light override, active filters), auth session, WebSocket connection status. ~1KB bundle. |
| **Atomic/Derived State** | Jotai | Fine-grained reactivity for the pipeline builder (node positions, edge connections, selection state) where Zustand's top-down model creates unnecessary re-renders. |
| **Local Component State** | React useState/useReducer | Form field focus, dropdown open/closed, tooltip visibility. |

### 1.9 Form Handling

| Library | Use Case |
|---------|----------|
| **React Hook Form** | All forms: login, sample submission, pipeline configuration, batch parameters, admin settings. Uncontrolled by default (minimal re-renders). |
| **Zod** | Schema validation co-located with forms. Shared between client validation and API route input validation (system boundary validation per architecture rules). |

### 1.10 Icons

| Library | Use Case |
|---------|----------|
| **Lucide React** | Primary icon set. Default for shadcn/ui, tree-shakable, consistent stroke weight. Covers 95% of UI needs. |
| **Custom SVG icons** | CHRONOS-specific icons: DNA helix, methylation marker, biological clock, proof seal, CpG site. Stored in `src/components/icons/`. |

### 1.11 Additional Utilities

| Library | Purpose |
|---------|---------|
| **date-fns** | Date formatting for timestamps, pipeline durations, sample ages |
| **nuqs** | Type-safe URL search params (filter state in tables, shareable dashboard views) |
| **next-themes** | Dark/light mode toggle with system preference detection |
| **cmdk** | Command palette (Cmd+K) for power-user navigation |
| **sonner** | Toast notifications (shadcn-compatible) |
| **vaul** | Drawer component for mobile-responsive detail panels |

---

## 2. Design Tokens

### 2.1 Color Palette

CHRONOS uses a **dark-mode-primary** design. The palette communicates scientific precision and medical trustworthiness. All colors are defined as OKLCH values for perceptual uniformity, with hex fallbacks.

#### Core Brand Colors

```
--chronos-primary-50:   oklch(0.97 0.01 250)   /* #f0f4ff */
--chronos-primary-100:  oklch(0.93 0.03 250)   /* #dbe4ff */
--chronos-primary-200:  oklch(0.85 0.06 250)   /* #b4c6ff */
--chronos-primary-300:  oklch(0.73 0.10 250)   /* #849eff */
--chronos-primary-400:  oklch(0.62 0.14 250)   /* #5c7cfa */
--chronos-primary-500:  oklch(0.53 0.18 250)   /* #4263eb */  <- default
--chronos-primary-600:  oklch(0.45 0.18 250)   /* #3b5bdb */
--chronos-primary-700:  oklch(0.38 0.16 250)   /* #364fc7 */
--chronos-primary-800:  oklch(0.30 0.12 250)   /* #2b3f99 */
--chronos-primary-900:  oklch(0.22 0.08 250)   /* #1e2d6b */
--chronos-primary-950:  oklch(0.15 0.06 250)   /* #141e45 */
```

#### Accent (Biotech Cyan/Teal)

```
--chronos-accent-50:    oklch(0.97 0.02 185)   /* #ecfeff */
--chronos-accent-100:   oklch(0.92 0.04 185)   /* #cffafe */
--chronos-accent-200:   oklch(0.85 0.08 185)   /* #a5f3fc */
--chronos-accent-300:   oklch(0.75 0.12 185)   /* #67e8f9 */
--chronos-accent-400:   oklch(0.65 0.14 185)   /* #22d3ee */
--chronos-accent-500:   oklch(0.55 0.14 185)   /* #06b6d4 */  <- default
--chronos-accent-600:   oklch(0.47 0.12 185)   /* #0891b2 */
--chronos-accent-700:   oklch(0.40 0.10 185)   /* #0e7490 */
--chronos-accent-800:   oklch(0.33 0.08 185)   /* #155e75 */
--chronos-accent-900:   oklch(0.25 0.06 185)   /* #164e63 */
```

#### Semantic Colors

```
/* Younger biological age / positive delta / healthy markers */
--chronos-success-400:  oklch(0.70 0.17 155)   /* #4ade80 */
--chronos-success-500:  oklch(0.60 0.17 155)   /* #22c55e */
--chronos-success-600:  oklch(0.50 0.15 155)   /* #16a34a */

/* On-track / neutral delta / within expected range */
--chronos-warning-400:  oklch(0.80 0.15 85)    /* #facc15 */
--chronos-warning-500:  oklch(0.72 0.15 85)    /* #eab308 */
--chronos-warning-600:  oklch(0.62 0.13 85)    /* #ca8a04 */

/* Accelerated aging / negative delta / anomalous markers */
--chronos-danger-400:   oklch(0.65 0.20 25)    /* #f87171 */
--chronos-danger-500:   oklch(0.55 0.20 25)    /* #ef4444 */
--chronos-danger-600:   oklch(0.47 0.18 25)    /* #dc2626 */

/* Proof verified / cryptographic trust / blockchain confirmation */
--chronos-proof-400:    oklch(0.72 0.15 310)   /* #c084fc */
--chronos-proof-500:    oklch(0.60 0.18 310)   /* #a855f7 */
--chronos-proof-600:    oklch(0.50 0.18 310)   /* #9333ea */
--chronos-proof-gold:   oklch(0.78 0.12 85)    /* #fbbf24 */
```

#### Surface Colors (Dark Mode)

```
--chronos-bg-app:       oklch(0.13 0.01 250)   /* #0f1117 */
--chronos-bg-surface:   oklch(0.16 0.01 250)   /* #161822 */
--chronos-bg-card:      oklch(0.19 0.01 250)   /* #1c1e2e */
--chronos-bg-elevated:  oklch(0.22 0.01 250)   /* #232538 */
--chronos-bg-overlay:   oklch(0.10 0.01 250 / 0.80)  /* modal backdrop */

--chronos-border-subtle:    oklch(0.25 0.01 250)   /* #2a2d3e */
--chronos-border-default:   oklch(0.30 0.01 250)   /* #353849 */
--chronos-border-strong:    oklch(0.40 0.02 250)   /* #4a4e65 */
```

#### Text Colors (Dark Mode)

```
--chronos-text-primary:     oklch(0.93 0.01 250)   /* #e8eaf0 */
--chronos-text-secondary:   oklch(0.70 0.01 250)   /* #9ca3af */
--chronos-text-tertiary:    oklch(0.50 0.01 250)   /* #6b7280 */
--chronos-text-disabled:    oklch(0.35 0.01 250)   /* #4b5060 */
--chronos-text-inverse:     oklch(0.13 0.01 250)   /* #0f1117 */
```

#### Light Mode Overrides

Light mode inverts surfaces and adjusts text. Primary/accent/semantic colors shift toward their 600-700 range for sufficient contrast on white backgrounds. Light mode is secondary but must meet WCAG AA (4.5:1 text, 3:1 UI elements).

### 2.2 Typography Scale

Base: 16px (1rem). Font stack prioritizes clarity and scientific credibility.

```
--font-sans:   "Inter Variable", "Inter", system-ui, -apple-system, sans-serif
--font-mono:   "JetBrains Mono Variable", "JetBrains Mono", "Fira Code", monospace
--font-display: "Plus Jakarta Sans Variable", "Plus Jakarta Sans", var(--font-sans)
```

| Token | Size | Line Height | Weight | Use |
|-------|------|-------------|--------|-----|
| `text-xs` | 0.75rem (12px) | 1rem | 400 | Labels, badges, footnotes |
| `text-sm` | 0.875rem (14px) | 1.25rem | 400 | Table cells, secondary text, captions |
| `text-base` | 1rem (16px) | 1.5rem | 400 | Body text, form inputs |
| `text-lg` | 1.125rem (18px) | 1.75rem | 500 | Card titles, section labels |
| `text-xl` | 1.25rem (20px) | 1.75rem | 600 | Page section headings |
| `text-2xl` | 1.5rem (24px) | 2rem | 600 | Page titles |
| `text-3xl` | 1.875rem (30px) | 2.25rem | 700 | Dashboard hero metrics |
| `text-4xl` | 2.25rem (36px) | 2.5rem | 700 | Marketing/landing headers |
| `text-mono-sm` | 0.8125rem (13px) | 1.25rem | 400 | Code snippets, hash values, proof IDs |
| `text-mono-base` | 0.875rem (14px) | 1.5rem | 400 | Pipeline logs, raw data views |

**Numeric/data display:** All numeric data (ages, deltas, percentages, confidence intervals) uses tabular-nums (`font-variant-numeric: tabular-nums`) for column alignment.

### 2.3 Spacing Scale

Follows a 4px base grid. All spacing values are multiples of 4.

```
--space-0:    0px
--space-0.5:  2px
--space-1:    4px
--space-1.5:  6px
--space-2:    8px
--space-3:    12px
--space-4:    16px
--space-5:    20px
--space-6:    24px
--space-8:    32px
--space-10:   40px
--space-12:   48px
--space-16:   64px
--space-20:   80px
--space-24:   96px
```

**Component-specific spacing:**
- Card padding: `--space-5` (20px)
- Section gap: `--space-6` (24px)
- Page margin: `--space-8` (32px)
- Sidebar width (expanded): 260px
- Sidebar width (collapsed): 64px

### 2.4 Border Radius

```
--radius-none:  0px
--radius-sm:    4px      /* badges, small tags */
--radius-md:    6px      /* buttons, inputs */
--radius-lg:    8px      /* cards, dropdowns */
--radius-xl:    12px     /* modals, large panels */
--radius-2xl:   16px     /* marketing elements */
--radius-full:  9999px   /* pills, avatars */
```

**Design principle:** Smaller radii for data-dense UI (tables, forms) convey precision. Larger radii for hero elements and marketing pages convey approachability.

### 2.5 Shadow Levels

Shadows use colored tints (not pure black) aligned with the dark surface palette.

```
--shadow-xs:    0 1px 2px oklch(0.05 0.01 250 / 0.25)
--shadow-sm:    0 1px 3px oklch(0.05 0.01 250 / 0.30), 0 1px 2px oklch(0.05 0.01 250 / 0.20)
--shadow-md:    0 4px 6px oklch(0.05 0.01 250 / 0.30), 0 2px 4px oklch(0.05 0.01 250 / 0.20)
--shadow-lg:    0 10px 15px oklch(0.05 0.01 250 / 0.30), 0 4px 6px oklch(0.05 0.01 250 / 0.20)
--shadow-xl:    0 20px 25px oklch(0.05 0.01 250 / 0.35), 0 8px 10px oklch(0.05 0.01 250 / 0.20)

/* Glow effects for interactive states and proof verification */
--shadow-glow-primary:  0 0 20px oklch(0.53 0.18 250 / 0.30)
--shadow-glow-accent:   0 0 20px oklch(0.55 0.14 185 / 0.30)
--shadow-glow-proof:    0 0 20px oklch(0.60 0.18 310 / 0.30)
--shadow-glow-gold:     0 0 20px oklch(0.78 0.12 85 / 0.30)
```

### 2.6 Breakpoints

```
--bp-sm:    640px    /* Mobile landscape */
--bp-md:    768px    /* Tablet portrait */
--bp-lg:    1024px   /* Tablet landscape / small desktop */
--bp-xl:    1280px   /* Desktop */
--bp-2xl:   1536px   /* Large desktop / widescreen dashboards */
```

**Dashboard minimum:** CHRONOS dashboards target `--bp-lg` (1024px) as the minimum comfortable width. Below that, the sidebar collapses and tables switch to card layouts.

---

## 3. Layout System

### 3.1 Application Shell

```
+------------------------------------------------------------------+
|  [Header Bar]  breadcrumbs / search / notifications / user       |
+--------+---------------------------------------------------------+
|        |                                                         |
| [Side  |              [Content Area]                             |
|  Nav]  |                                                         |
|        |  +---------------------------------------------------+  |
|  Logo  |  | Page Header (title + actions)                     |  |
|  ----  |  +---------------------------------------------------+  |
|  Nav   |  |                                                   |  |
|  Items |  |  Content Grid                                     |  |
|  ----  |  |  (responsive columns based on page type)          |  |
|  ----  |  |                                                   |  |
|  ----  |  |                                                   |  |
|        |  +---------------------------------------------------+  |
|  Help  |                                                         |
|  User  |  [Status Bar] pipeline status / connection / version    |
+--------+---------------------------------------------------------+
```

### 3.2 Sidebar Navigation

**Structure:**
- **Logo area:** CHRONOS wordmark + DNA helix icon (48px height)
- **Primary nav:** Icon + label, grouped into sections
  - Overview (Dashboard, Activity Feed)
  - Pipeline (New Run, Active Runs, Templates)
  - Results (Samples, Reports, Comparisons)
  - Proofs (Verification Registry, Audit Trail)
  - Data (Sample Library, Biomarker Database)
- **Secondary nav (bottom):** Settings, Help/Docs, User Profile
- **Collapse behavior:** At `< 1024px` or user toggle, sidebar collapses to icon-only (64px). Hover expands with a flyout overlay. On mobile (`< 768px`), sidebar becomes a sheet drawer from the left edge.

**Keyboard navigation:** All nav items are reachable via Tab. Sections are collapsible with Enter/Space. Global shortcut `Cmd+B` toggles sidebar.

### 3.3 Header Bar

- **Left:** Breadcrumb trail reflecting URL hierarchy (e.g., Dashboard > Pipeline > Run #4821)
- **Center:** Global search (cmdk-powered command palette trigger, `Cmd+K`)
- **Right:** Notification bell (with unread badge), theme toggle (dark/light/system), user avatar dropdown
- **Height:** 56px fixed
- **Border:** Bottom border `--chronos-border-subtle`, no shadow (flat hierarchy with sidebar)

### 3.4 Content Area Grid

Uses CSS Grid with Tailwind utilities. Grid adapts per page type:

| Page Type | Grid | Example |
|-----------|------|---------|
| Dashboard | 12-column, mixed spans | Metric cards (span-3), charts (span-6), activity (span-3) |
| Detail View | 8 + 4 sidebar | Sample result with detail panel |
| Table View | Full width | Sample manifest, audit log |
| Pipeline Builder | Full width, no padding | React Flow canvas fills entire content area |
| Form/Settings | Centered, max-w-2xl | Configuration forms, user settings |
| Report/Print | Centered, max-w-4xl | PDF-ready biological age report |

### 3.5 Overlay and Modal Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Dialog (center)** | Confirmation, sample details, proof inspection | Radix Dialog via shadcn. Max-width 640px. Backdrop blur. |
| **Sheet (right)** | Quick preview, filters panel, run details | Vaul drawer. Width 480px on desktop, full-width on mobile. |
| **Sheet (bottom)** | Mobile actions, batch operations | Vaul drawer. Snap points at 25%, 50%, 90%. |
| **Command Palette** | Global search, quick actions, navigation | cmdk. Full-width overlay, max-width 640px. |
| **Popover** | Inline details, cell expansion, tooltips | Radix Popover. Anchored to trigger element. |
| **Full-screen** | Pipeline builder, report viewer, proof explorer | Portal to body. Includes own header with close button. |

**Z-index scale:**
```
--z-sidebar:     40
--z-header:      50
--z-dropdown:    60
--z-overlay:     70
--z-modal:       80
--z-toast:       90
--z-tooltip:     100
```

### 3.6 Toast and Notification System

**Library:** Sonner (shadcn-compatible)

**Placement:** Bottom-right stack (desktop), bottom-center (mobile)

| Type | Icon | Color | Duration | Example |
|------|------|-------|----------|---------|
| Success | CheckCircle | `--chronos-success-500` | 4s auto-dismiss | "Sample batch uploaded successfully" |
| Error | XCircle | `--chronos-danger-500` | Persistent (manual dismiss) | "Pipeline failed at methylation calling stage" |
| Warning | AlertTriangle | `--chronos-warning-500` | 8s | "3 samples below quality threshold" |
| Info | Info | `--chronos-accent-500` | 4s | "Pipeline run #4821 started" |
| Proof | ShieldCheck | `--chronos-proof-500` | 6s | "Proof verified on-chain: block #18294721" |
| Progress | Loader | `--chronos-primary-500` | Until complete | "Processing 48/128 samples..." (with progress bar) |

**Behavior:** Maximum 3 visible toasts. FIFO stack. Hover pauses auto-dismiss timer. Swipe-to-dismiss on touch. Each toast has an optional action button (e.g., "View Run", "Retry").

---

## 4. Animation Guidelines

### 4.1 Principles

1. **Purposeful:** Every animation must communicate state change, provide feedback, or guide attention. No decorative motion.
2. **Fast:** Most UI transitions complete in 150-300ms. Users should never wait for an animation.
3. **Reducible:** All animations respect `prefers-reduced-motion`. When reduced motion is active, transitions use opacity fades at 150ms instead of spatial movement.
4. **Consistent:** Shared easing curves across the entire application.

### 4.2 Easing Curves

```
--ease-default:     cubic-bezier(0.25, 0.1, 0.25, 1.0)   /* general transitions */
--ease-in:          cubic-bezier(0.55, 0.0, 1.0, 0.45)    /* elements exiting */
--ease-out:         cubic-bezier(0.0, 0.0, 0.2, 1.0)      /* elements entering */
--ease-in-out:      cubic-bezier(0.45, 0.0, 0.55, 1.0)    /* elements moving */
--ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1.0)   /* bouncy feedback */
--ease-scientific:  cubic-bezier(0.16, 1.0, 0.3, 1.0)     /* data reveals, chart entries */
```

### 4.3 Duration Scale

```
--duration-instant:   0ms       /* disabled state, color swap */
--duration-fast:      100ms     /* hover highlights, focus rings */
--duration-normal:    200ms     /* button press, toggle, dropdown */
--duration-moderate:  300ms     /* modal enter, sidebar toggle */
--duration-slow:      500ms     /* page transition, chart data load */
--duration-slower:    800ms     /* pipeline stage transition */
--duration-dramatic:  1200ms    /* proof verification sequence */
```

### 4.4 Pipeline Stage Transitions

The pipeline visualization (React Flow) shows data moving through stages. Each stage has a visual state:

| Stage State | Visual Treatment | Transition |
|-------------|-----------------|------------|
| **Queued** | Muted border, dashed outline | -- |
| **Running** | Pulsing glow (`--chronos-accent-500`), animated edge particles | Fade in glow over 300ms, particles start |
| **Complete** | Solid border (`--chronos-success-500`), checkmark icon | Glow collapses to solid border, 500ms. Checkmark scales from 0 to 1 with spring ease. |
| **Failed** | Red border (`--chronos-danger-500`), X icon, shake | 200ms shake animation (translateX -4px, 4px, -2px, 0). Red glow pulse. |
| **Skipped** | Grey, reduced opacity (0.5) | Fade to 50% opacity, 300ms |

**Edge animation:** When a stage completes, a particle (small circle, `--chronos-accent-400`) travels along the connecting edge to the next node over 600ms using Motion's path animation. This visually communicates data flow.

### 4.5 Chart Data Loading Animations

| Chart Type | Enter Animation |
|------------|----------------|
| **Line chart** | Path draws from left to right over 800ms using SVG stroke-dashoffset. Ease: `--ease-scientific`. |
| **Bar chart** | Bars grow from baseline (scaleY 0 to 1) with 50ms stagger per bar. Ease: `--ease-out`. |
| **Area chart** | Combine line draw + area fill fade-in (opacity 0 to 0.3) at 400ms delay. |
| **Radar chart** | Points expand from center outward over 600ms. Connecting lines follow with 200ms delay. |
| **Scatter plot** | Points fade in with stagger (10ms per point) in a wave from left to right. |
| **Heatmap** | Cells fade in row-by-row with 30ms stagger per row. Color intensity animates from neutral to final value. |
| **Skeleton** | While data loads, chart area shows animated gradient shimmer (left-to-right sweep, 1.5s loop). |

### 4.6 Proof Verification Animation

This is the signature animation of CHRONOS -- it must feel consequential and trustworthy.

**Sequence (total: ~2.5 seconds):**

1. **Initiate** (0-200ms): Lock icon appears at center of proof card. Scale from 0.8 to 1.0, opacity 0 to 1. Border begins glowing `--chronos-proof-500`.

2. **Processing** (200-1200ms): Lock icon morphs to a shield outline (SVG path morph via Motion). Concentric rings pulse outward from center (3 rings, staggered 200ms apart, expanding and fading). Background shifts subtly toward proof-purple tint.

3. **Verification** (1200-1800ms): Shield fills from bottom to top with `--chronos-proof-gold` gradient. A subtle "scan line" sweeps upward inside the shield. Ring pulses accelerate.

4. **Confirmed** (1800-2500ms): Shield morphs to ShieldCheck (checkmark appears inside via path draw, 300ms). All rings collapse inward and merge into a solid gold border glow (`--shadow-glow-gold`). Status text fades in: "Verified" in `--chronos-proof-gold`. Optional: subtle confetti-style particles (6-8 small dots) burst outward and fade.

**Reduced motion variant:** Shield icon cross-fades to ShieldCheck over 300ms. Border color changes to gold. No morphing, no rings, no particles.

### 4.7 Page Transitions

Using Motion's `AnimatePresence` with shared layout animations:

| Transition | Animation | Duration |
|------------|-----------|----------|
| **Route change** | Outgoing page fades and slides up 8px; incoming fades in and slides up from 8px below | 250ms, ease-in-out |
| **Tab switch** | Content cross-fades with 0px movement (tabs stay spatially anchored) | 200ms |
| **Drill-down** (e.g., list to detail) | Card expands via shared layout animation (Motion `layoutId`). Card grows to fill content area. | 350ms, spring |
| **Back navigation** | Reverse of drill-down: content shrinks back to origin card position | 300ms |

### 4.8 Micro-interactions

| Interaction | Animation |
|-------------|-----------|
| **Button hover** | Background lightens by 10% (color-mix). Scale to 1.02. Duration: 100ms. |
| **Button press** | Scale to 0.98. Duration: 80ms. Spring return. |
| **Focus ring** | 2px ring in `--chronos-primary-400`, offset 2px. Fades in over 100ms (not instant, to avoid flicker on click-focus). |
| **Toggle switch** | Thumb slides with spring ease (Motion). Track color transitions over 200ms. |
| **Checkbox** | Checkmark draws via SVG path animation (100ms). Background fills simultaneously. |
| **Input focus** | Border transitions from `--chronos-border-default` to `--chronos-primary-500` over 150ms. Subtle shadow appears. |
| **Table row hover** | Background shifts to `--chronos-bg-elevated` over 100ms. |
| **Sidebar collapse** | Width animates from 260px to 64px over 250ms. Labels fade out at 150ms (before width finishes). Icons remain stationary. |
| **Notification badge** | Appears with scale spring (0 to 1, overshoot to 1.2, settle at 1.0). Pulses once. |
| **Proof seal stamp** | On verified items, a small shield icon has a subtle idle pulse (opacity 0.8 to 1.0, 3s loop, ease-in-out). Hover stops pulse and shows tooltip. |
| **Biological age delta** | When a new result loads, the delta number counts up/down from 0 to final value over 600ms using Motion's `useSpring`. Green flash for negative delta (younger), red flash for positive (older). |
| **Copy to clipboard** | Icon morphs from Copy to Check (100ms), holds for 1.5s, morphs back. Toast confirms. |
| **Loading spinner** | Custom CHRONOS spinner: a stylized double-helix rotation (CSS animation, 1.2s loop). Fallback: standard circular spinner for reduced motion. |

---

## 5. Component Inventory (Planning Reference)

The following components will be needed. This is a checklist for implementation, not a specification.

### Foundation
- [ ] ThemeProvider (dark/light/system)
- [ ] TokensCSS (chronos-tokens.css)
- [ ] LayoutShell (sidebar + header + content)
- [ ] Typography components (Heading, Text, Code, Label)

### Navigation
- [ ] Sidebar (collapsible, with sections)
- [ ] Breadcrumbs
- [ ] CommandPalette (Cmd+K)
- [ ] Tabs (underline and pill variants)

### Data Display
- [ ] DataTable (TanStack Table wrapper)
- [ ] MetricCard (value + delta + sparkline)
- [ ] Badge (status, proof, age-category)
- [ ] Timeline (pipeline and activity)
- [ ] ProofSeal (verified/unverified/pending)

### Charts
- [ ] LineChart (biological age trends)
- [ ] BarChart (biomarker comparisons)
- [ ] RadarChart (biomarker profile)
- [ ] HeatMap (CpG methylation grid)
- [ ] ScatterPlot (chronological vs biological age)
- [ ] AgeClockDial (custom: circular gauge for bio age)

### Pipeline
- [ ] PipelineCanvas (React Flow wrapper)
- [ ] StageNode (custom React Flow node)
- [ ] StageEdge (custom animated edge)
- [ ] PipelineControls (zoom, fit, minimap)

### Forms
- [ ] Input, Textarea, Select, Checkbox, Radio, Switch, Slider
- [ ] FileUpload (drag-and-drop for FASTQ/BAM files)
- [ ] DatePicker
- [ ] SampleForm, PipelineConfigForm, BatchForm

### Feedback
- [ ] Toast (via Sonner)
- [ ] Dialog (confirmation, detail views)
- [ ] Sheet (filter panels, quick previews)
- [ ] Tooltip
- [ ] Progress (bar and circular)
- [ ] Skeleton (shimmer loading states)
- [ ] ProofVerificationAnimation

### Icons (Custom)
- [ ] DNAHelix
- [ ] MethylationMarker
- [ ] BiologicalClock
- [ ] ProofSeal
- [ ] CpGSite
- [ ] EpigeneticAge

---

## 6. Accessibility Requirements

- WCAG 2.1 AA compliance minimum; target AAA for text contrast
- All interactive elements keyboard-navigable (Radix primitives handle this)
- `aria-live` regions for pipeline status updates and proof verification results
- Screen reader announcements for toast notifications
- Focus trapping in modals and dialogs
- Skip-to-content link
- `prefers-reduced-motion` respected for all animations (see Section 4)
- `prefers-color-scheme` for automatic dark/light detection
- Color is never the sole indicator of state (always paired with icon or text)
- Minimum touch target: 44x44px on mobile

---

## 7. Performance Budgets

| Metric | Target |
|--------|--------|
| **Largest Contentful Paint** | < 1.5s |
| **First Input Delay** | < 50ms |
| **Cumulative Layout Shift** | < 0.05 |
| **Total JS bundle (initial)** | < 150KB gzipped |
| **Total CSS** | < 30KB gzipped |
| **Chart render (100 data points)** | < 100ms |
| **Table render (1000 rows, virtualized)** | < 50ms |
| **Time to Interactive** | < 2.5s |

**Code splitting strategy:** Each major route (Dashboard, Pipeline, Results, Proofs, Data, Settings) is a separate dynamic import. Chart libraries are lazy-loaded per chart type. React Flow loads only on pipeline pages.

---

## 8. Research Sources

The technology choices in this document are informed by the following 2026 ecosystem research:

- [15 Best React UI Libraries for 2026 - Builder.io](https://www.builder.io/blog/react-component-libraries-2026)
- [Best React UI Component Libraries - Croct Blog](https://blog.croct.com/post/best-react-ui-component-libraries)
- [Top React Chart Libraries 2026 - Syncfusion](https://www.syncfusion.com/blogs/post/top-5-react-chart-libraries)
- [8 Top React Chart Libraries 2026 - Querio](https://querio.ai/articles/top-react-chart-libraries-data-visualization)
- [Tailwind CSS v4.0 Release](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind CSS v4 Complete Guide 2026](https://devtoolbox.dedyn.io/blog/tailwind-css-v4-complete-guide)
- [shadcn/ui March 2026 CLI v4 Changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)
- [shadcn/ui March 2026 Update - Medium](https://medium.com/@nakranirakesh/shadcn-ui-march-2026-update-cli-v4-ai-agent-skills-and-design-system-presets-d30cf200b0e9)
- [5 Best React Data Grid Libraries 2026 - Syncfusion](https://www.syncfusion.com/blogs/post/top-react-data-grid-libraries)
- [TanStack Table](https://tanstack.com/table/latest)
- [Top 7 React Animation Libraries 2026 - Syncfusion](https://www.syncfusion.com/blogs/post/top-react-animation-libraries)
- [Motion (formerly Framer Motion)](https://motion.dev/)
- [React Flow - xyflow](https://reactflow.dev)
- [State of React State Management 2026 - PkgPulse](https://www.pkgpulse.com/blog/state-of-react-state-management-2026)
- [React State Management 2026 - DEV Community](https://dev.to/jsgurujobs/state-management-in-2026-zustand-vs-jotai-vs-redux-toolkit-vs-signals-2gge)
- [React Admin Dashboard Templates 2026 - AdminLTE](https://adminlte.io/blog/react-admin-dashboard-templates/)
- [14 Best React UI Component Libraries 2026 - Untitled UI](https://www.untitledui.com/blog/react-component-libraries)
