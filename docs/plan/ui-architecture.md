# CHRONOS Frontend Architecture

**Date:** 2026-03-21
**Status:** Planning
**Scope:** Enterprise React frontend for the CHRONOS verifiable epigenetic age prediction system

---

## 1. Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 19 + TypeScript 5.5 | Concurrent features, RSC-compatible, strict types |
| Build | Vite 6 | Fast HMR, native ESM, optimized chunking |
| Routing | TanStack Router | Type-safe routes, file-based convention, search param validation |
| State (server) | TanStack Query v5 | Cache invalidation, optimistic updates, WebSocket integration |
| State (client) | Zustand | Minimal boilerplate, sliced stores, devtools support |
| Styling | Tailwind CSS 4 + cva | Utility-first with typed variant classes |
| Component primitives | Radix UI | Unstyled, accessible, composable headless primitives |
| Charts | Recharts | Declarative SVG charts, composable, responsive |
| Graph visualization | react-force-graph-2d | WebGL force-directed graph for knowledge explorer |
| Tables | TanStack Table v8 | Headless, sortable, filterable, virtualizable |
| Forms | React Hook Form + Zod | Validation co-located with schema, minimal re-renders |
| Real-time | Native WebSocket + TanStack Query | SSE fallback, reconnection, query cache sync |
| PDF export | @react-pdf/renderer | Server-side or client-side PDF generation |
| CSV export | papaparse | Streaming CSV generation |
| Accessibility | axe-core (dev), eslint-plugin-jsx-a11y | Automated WCAG 2.1 AA auditing |
| Testing | Vitest + Testing Library + Playwright | Unit, integration, e2e |
| Icons | Lucide React | Tree-shakeable, consistent stroke style |

---

## 2. Page and Component Hierarchy

```
App
+-- ThemeProvider (dark/light, system preference detection)
+-- AuthProvider (role context: patient | clinician | researcher | admin)
+-- QueryClientProvider
+-- WebSocketProvider (pipeline events)
+-- KeyboardShortcutProvider
+-- RootLayout
    +-- AppShell
    |   +-- Sidebar (collapsible)
    |   |   +-- Logo
    |   |   +-- NavGroup: "Analysis"
    |   |   |   +-- NavItem: Dashboard
    |   |   |   +-- NavItem: New Analysis
    |   |   |   +-- NavItem: Analysis History
    |   |   +-- NavGroup: "Explore"
    |   |   |   +-- NavItem: Clock Comparison
    |   |   |   +-- NavItem: Knowledge Explorer
    |   |   |   +-- NavItem: Trajectory Viewer
    |   |   +-- NavGroup: "Verify"
    |   |   |   +-- NavItem: Proof Verification
    |   |   +-- NavGroup: "Plan"
    |   |   |   +-- NavItem: Intervention Planner
    |   |   +-- NavGroup: "System" (admin only)
    |   |       +-- NavItem: Settings
    |   |       +-- NavItem: Audit Log
    |   +-- TopBar
    |   |   +-- Breadcrumb
    |   |   +-- CommandPalette trigger (Cmd+K)
    |   |   +-- ThemeToggle
    |   |   +-- NotificationBell
    |   |   +-- UserMenu (role badge, logout)
    |   +-- MainContent (outlet)
    |   +-- CommandPalette (modal, fuzzy search across pages + recent runs)
    +-- ToastContainer (sonner)
    +-- ConfirmDialogProvider

--- Pages ---

1. DashboardPage
   +-- MetricCards (row)
   |   +-- MetricCard: "Analyses Today" (count + sparkline)
   |   +-- MetricCard: "Avg Biological Age" (number + trend arrow)
   |   +-- MetricCard: "Avg Age Acceleration" (number + color indicator)
   |   +-- MetricCard: "Proofs Generated" (count)
   +-- RecentAnalysesTable
   |   +-- StatusBadge (per row, color-coded pipeline stage)
   |   +-- QuickActions (view, export, verify)
   +-- SystemHealthPanel
   |   +-- ClockHealthIndicator (per clock: latency, error rate)
   |   +-- PipelineThroughputChart (last 24h bar chart)
   +-- AgeDistributionChart (histogram of biological ages across cohort)

2. AnalysisPage
   +-- UploadPanel
   |   +-- FileDropzone (CSV drag-and-drop, validates header row)
   |   +-- MetadataForm
   |   |   +-- AgeInput (chronological age, number)
   |   |   +-- SexSelect (M/F)
   |   |   +-- TissueSourceSelect (whole_blood, saliva, buccal, ...)
   |   |   +-- CollectionDatePicker
   |   |   +-- BatchIdInput (optional)
   |   +-- ArrayTypeDetector (auto-detected from probe count, user-overridable)
   |   +-- SubmitButton (disabled until valid)
   +-- PipelineProgress (visible after submit)
   |   +-- StageTimeline (horizontal 8-stage stepper)
   |   |   +-- StageNode (per stage: icon, label, elapsed time, status)
   |   |   +-- StageConnector (animated progress line between nodes)
   |   +-- LiveMetricsPanel
   |   |   +-- ElapsedTimer
   |   |   +-- CurrentStageDetail (e.g., "Running 4 clocks in parallel")
   |   |   +-- ProbeCountBadge
   |   +-- EventLog (scrollable, real-time domain events as they arrive)
   +-- ResultPanel (visible on complete)
   |   +-- AgeResultHero
   |   |   +-- BiologicalAgeDisplay (large number, colored by acceleration)
   |   |   +-- ChronologicalAgeDisplay
   |   |   +-- AgeAccelerationBadge (+/- years, color-coded)
   |   |   +-- ConfidenceIntervalBar (horizontal range bar)
   |   +-- ConsensusBreakdown (mini clock comparison, expandable)
   |   +-- TopCpGContributors (horizontal bar chart, top 10 SHAP values)
   |   +-- QuickActions
   |       +-- VerifyProofButton
   |       +-- ExportPDFButton
   |       +-- ExportCSVButton
   |       +-- ViewTrajectoryButton (if subject has history)
   |       +-- ViewRecommendationsButton

3. ClockComparisonPage
   +-- RunSelector (dropdown or search, selects a PipelineRun)
   +-- ClockGrid (2x2 grid of clock cards)
   |   +-- ClockCard (per clock: altumage, grimage, deepstrataage, epinflamm)
   |       +-- ClockNameHeader
   |       +-- BiologicalAgeValue
   |       +-- AgeAccelerationValue
   |       +-- ConfidenceValue (percentage)
   |       +-- InferenceTimeValue (ms)
   |       +-- AgreementIndicator (checkmark if within consensus epsilon)
   |       +-- TopCpGList (top 5 contributing CpGs for this clock)
   +-- AgreementMatrix (heatmap: pairwise clock agreement)
   +-- CpGOverlapVenn (Venn/Euler diagram: shared top CpGs across clocks)
   +-- WeightsDisplay
   |   +-- WeightBar (per clock, shows normalized consensus weight)
   |   +-- MAEIndicator (per clock)
   +-- ConsensusDetailPanel
       +-- ConsensusMethodBadge (raft | weighted_average)
       +-- ToleranceEpsilonDisplay
       +-- CommittedClocksCount
       +-- ConfidenceIntervalDisplay

4. ProofVerificationPage
   +-- ProofSelector (by runId or paste proof JSON)
   +-- ProofDetailPanel
   |   +-- PublicSignalsTable
   |   |   +-- Row: biologicalAge
   |   |   +-- Row: modelHash (truncated, copy button)
   |   |   +-- Row: timestamp (formatted)
   |   |   +-- Row: consensusMethod
   |   +-- CircuitHashDisplay (full hash, copy button)
   |   +-- ProofSizeDisplay (bytes, human-readable)
   |   +-- ProvingTimeDisplay (ms)
   +-- VerificationPanel
   |   +-- VerifyButton (calls POST /verify)
   |   +-- VerificationResultBanner (pass/fail, animated)
   |   +-- VerificationSteps (accordion)
   |       +-- Step: "Proof bytes non-empty" (check/cross)
   |       +-- Step: "Public signals complete" (check/cross)
   |       +-- Step: "Verification key matches circuit" (check/cross)
   |       +-- Step: "Commitment hash valid" (check/cross)
   +-- ProofChainTimeline (if subject has multiple proofs over time)
       +-- ProofNode (per proof: date, age, verification status)

5. KnowledgeExplorerPage
   +-- SearchBar (query input for GET /knowledge/query)
   +-- GraphVisualization (force-directed graph)
   |   +-- NodeRenderer
   |   |   +-- CpGNode (blue circle, probe ID label)
   |   |   +-- GeneNode (green hexagon, gene name label)
   |   |   +-- PathwayNode (orange rectangle, pathway name)
   |   |   +-- AgingPhaseNode (red diamond, phase label)
   |   |   +-- InterventionNode (purple star, intervention name)
   |   +-- EdgeRenderer
   |   |   +-- ReguatesEdge (solid, arrow)
   |   |   +-- InvolvedInEdge (dashed, arrow)
   |   |   +-- AssociatedWithEdge (dotted, arrow)
   |   |   +-- ReducesAccelerationEdge (thick green, arrow)
   |   +-- GraphControls
   |       +-- ZoomSlider
   |       +-- FilterByNodeType (checkbox per node kind)
   |       +-- FilterByEvidenceStrength (range slider)
   |       +-- LayoutSelector (force / hierarchical / radial)
   +-- DetailSidebar (opens on node click)
   |   +-- CpGDetail (probe ID, beta value if in current run, SHAP if available)
   |   +-- GeneDetail (gene name, associated CpGs, pathways)
   |   +-- PathwayDetail (name, genes, interventions targeting it)
   |   +-- InterventionDetail (name, category, expected effect, evidence level)
   +-- CausalChainPanel (traces CpG -> Gene -> Pathway -> Phase for selected CpG)

6. TrajectoryViewerPage
   +-- SubjectSelector (dropdown or search by subjectId)
   +-- TrajectoryChart (line chart: bio age over time)
   |   +-- BiologicalAgeLine (primary line, consensus age per timepoint)
   |   +-- ChronologicalAgeLine (dashed reference line, slope = 1)
   |   +-- ConfidenceIntervalBand (shaded area around bio age line)
   |   +-- AnomalyMarkers (red dots on anomalous timepoints)
   |   +-- InterventionAnnotations (vertical dashed lines with labels)
   +-- VelocityPanel
   |   +-- CurrentVelocityGauge (d(bio_age)/dt, gauge or number)
   |   +-- VelocityTrendChart (velocity over time, mini sparkline)
   |   +-- InterpretationText ("Aging 0.8 bio-years per calendar year")
   +-- AnomalyAlertPanel
   |   +-- AnomalyCard (per detected anomaly: date, deviation, severity)
   +-- TimepointTable (sortable table of all trajectory points)
       +-- Columns: date, bio age, chrono age, acceleration, velocity, anomaly flag

7. InterventionPlannerPage
   +-- SubjectContext (selected subject + latest analysis summary)
   +-- RecommendationList
   |   +-- RecommendationCard (per intervention)
   |       +-- InterventionName
   |       +-- CategoryBadge (exercise | diet | supplement | pharmacological | lifestyle)
   |       +-- ExpectedEffectDisplay (e.g., "-1.5 years")
   |       +-- EvidenceLevelBadge (strong | moderate | preliminary)
   |       +-- RelevantCpGTags (clickable, links to knowledge explorer)
   |       +-- SimilarProfileCount
   |       +-- ConfidenceScore (percentage bar)
   |       +-- ExpandToggle -> detail section
   |           +-- CausalChainPreview (CpG -> Gene -> Pathway for each relevant CpG)
   |           +-- LiteratureReferences (placeholder)
   +-- InterventionTimeline (Gantt-style: planned and active interventions)
   +-- ProjectionChart (what-if: projected bio age if interventions applied)
   +-- ExportPlanButton (PDF report)

8. SettingsPage (admin role only)
   +-- ClockWeightsEditor
   |   +-- WeightSlider (per clock, adjustable, re-normalizes live)
   |   +-- ResetToDefaultButton
   +-- ConsensusSettings
   |   +-- EpsilonInput (tolerance, number)
   |   +-- MinCommittedInput (minimum committed clocks, number)
   +-- PipelineSettings
   |   +-- TimeoutInput (per stage, ms)
   |   +-- RetryPolicyEditor
   +-- HNSWParametersEditor
   |   +-- MInput (max connections)
   |   +-- EfConstructionInput
   |   +-- EfSearchInput
   +-- AuditLogViewer
       +-- LogTable (timestamp, user, action, resource)
       +-- LogFilter (by action type, date range, user)
```

---

## 3. Routing Structure

```
/                              -> redirect to /dashboard
/dashboard                     -> DashboardPage
/analysis                      -> AnalysisPage (upload + pipeline + results)
/analysis/:runId               -> AnalysisPage (pre-loaded with existing run)
/analysis/:runId/clocks        -> ClockComparisonPage (scoped to run)
/analysis/:runId/proof         -> ProofVerificationPage (scoped to run)
/verify                        -> ProofVerificationPage (standalone, paste proof)
/knowledge                     -> KnowledgeExplorerPage
/knowledge?cpg=:probeId        -> KnowledgeExplorerPage (focused on CpG)
/knowledge?gene=:gene          -> KnowledgeExplorerPage (focused on gene)
/trajectory/:subjectId         -> TrajectoryViewerPage
/interventions/:subjectId      -> InterventionPlannerPage
/settings                      -> SettingsPage (admin only, redirect otherwise)
/settings/clocks               -> SettingsPage (clock weights tab)
/settings/consensus            -> SettingsPage (consensus tab)
/settings/pipeline             -> SettingsPage (pipeline tab)
/settings/hnsw                 -> SettingsPage (HNSW tab)
/settings/audit                -> SettingsPage (audit log tab)
```

Route guards enforce role-based access:
- `/settings/*` requires `admin` role
- `/interventions/*` requires `clinician` or `admin` role
- All other routes accessible to all authenticated roles

---

## 4. State Management Architecture

### 4.1 Server State (TanStack Query)

All data fetched from the backend API lives in TanStack Query's cache. Every query key is namespaced to prevent collisions.

```
Query keys:
  ['runs', 'list']                          -> GET recent runs for dashboard
  ['runs', 'list', { page, limit, filter }] -> paginated run history
  ['run', runId]                            -> GET /result/:runId
  ['proof', 'verify', proofHash]            -> POST /verify (mutation, cached result)
  ['knowledge', 'query', queryString]       -> GET /knowledge/query
  ['knowledge', 'causal-chain', probeId]    -> GET /knowledge/query?cpg=...
  ['trajectory', subjectId]                 -> GET /trajectory/:subjectId

Mutations:
  submitSample                              -> POST /submit (invalidates ['runs', 'list'])
  verifyProof                               -> POST /verify
```

### 4.2 Client State (Zustand slices)

Client-only UI state lives in Zustand. Each concern is a separate slice composed into a single store.

```typescript
// Store slices (composed via Zustand's combine pattern)

ThemeSlice {
  theme: 'light' | 'dark' | 'system'
  resolvedTheme: 'light' | 'dark'
  setTheme(theme): void
}

AuthSlice {
  user: User | null
  role: 'patient' | 'clinician' | 'researcher' | 'admin'
  isAuthenticated: boolean
  login(credentials): Promise<void>
  logout(): void
}

PipelineSlice {
  activeRunId: string | null
  stageStatuses: Map<PipelineStatus, 'pending' | 'active' | 'complete' | 'error'>
  stageTimings: Map<PipelineStatus, number>
  events: DomainEvent[]
  setActiveRun(runId): void
  updateStage(stage, status, elapsedMs): void
  appendEvent(event): void
  reset(): void
}

KnowledgeExplorerSlice {
  selectedNodeId: string | null
  nodeTypeFilters: Set<NodeKind>
  evidenceThreshold: number
  graphLayout: 'force' | 'hierarchical' | 'radial'
  setSelectedNode(id): void
  toggleNodeTypeFilter(kind): void
  setEvidenceThreshold(value): void
  setGraphLayout(layout): void
}

SettingsSlice {
  clockWeights: Record<ClockName, number>
  consensusEpsilon: number
  minCommittedClocks: number
  hnswParams: { m: number; efConstruction: number; efSearch: number }
  updateClockWeight(clock, weight): void
  updateConsensusParams(epsilon, minCommitted): void
  updateHnswParams(params): void
  resetToDefaults(): void
}
```

### 4.3 Real-Time State (WebSocket)

Pipeline progress arrives via WebSocket. The WebSocket provider:
1. Connects on `POST /submit` response (receives `runId`).
2. Receives domain events matching the `DomainEvent` union type from the backend.
3. Dispatches events to `PipelineSlice` for UI updates.
4. On `status: 'complete'` or `status: 'failed'`, invalidates the TanStack Query cache for `['run', runId]`.

```
WebSocket message flow:

  Server -> { type: 'MethylationSampleIngested', sampleId, probeCount }
         -> { type: 'CpGEmbeddingGenerated', sampleId, dimensions }
         -> { type: 'ClockInferenceCompleted', clockName, biologicalAge }  (x4, parallel)
         -> { type: 'ConsensusReached', consensusAge, committedClocks }
         -> { type: 'ProofGenerated', circuitHash, provingTimeMs }
         -> { type: 'TrajectoryPointAdded', subjectId, agingVelocity }
         -> { type: 'InterventionRecommended', count }
```

---

## 5. Data Flow Diagram

```
                                  CHRONOS Frontend Data Flow

  +---------+     POST /submit      +----------+     WebSocket events     +---------------+
  |  Upload |  ------------------>  |  Backend |  ----------------------> | WebSocket     |
  |  Form   |     { csv, meta }     |  API     |     DomainEvent stream   | Provider      |
  +---------+     returns runId     +----------+                          +-------+-------+
       |                                 ^                                        |
       v                                 |                                        v
  +-----------+                     +-----------+                         +-----------------+
  | TanStack  |  GET /result/:id   |  TanStack |  invalidate on         | Zustand          |
  | Query     |  ----------------> |  Query    |  'complete' event      | PipelineSlice    |
  | Mutation  |                    |  Cache    | <--------------------- | stageStatuses    |
  +-----------+                    +-----+-----+                        | events[]         |
       |                                 |                              +---------+--------+
       |                                 |                                        |
       v                                 v                                        v
  +-------------------------------------------------------------------+
  |                         React Component Tree                       |
  |                                                                    |
  |  DashboardPage        reads from  ['runs', 'list'] query          |
  |  AnalysisPage         reads from  PipelineSlice + ['run', id]     |
  |  ClockComparisonPage  reads from  ['run', id].clockResults        |
  |  ProofVerificationPage reads from ['run', id].proof + mutation    |
  |  KnowledgeExplorerPage reads from ['knowledge', 'query', q]      |
  |  TrajectoryViewerPage reads from  ['trajectory', subjectId]       |
  |  InterventionPlanner  reads from  ['run', id].recommendations     |
  |  SettingsPage         reads from  SettingsSlice (local)           |
  +-------------------------------------------------------------------+
       |
       v
  +-----------+
  |  Export   |  PDF: @react-pdf/renderer  (reads from query cache)
  |  Layer    |  CSV: papaparse            (reads from query cache)
  +-----------+
```

---

## 6. File and Folder Structure

```
src/
+-- app/
|   +-- routes/
|   |   +-- __root.tsx              # Root layout with providers
|   |   +-- dashboard.tsx           # /dashboard
|   |   +-- analysis.tsx            # /analysis (upload)
|   |   +-- analysis.$runId.tsx     # /analysis/:runId
|   |   +-- analysis.$runId.clocks.tsx   # /analysis/:runId/clocks
|   |   +-- analysis.$runId.proof.tsx    # /analysis/:runId/proof
|   |   +-- verify.tsx              # /verify (standalone)
|   |   +-- knowledge.tsx           # /knowledge
|   |   +-- trajectory.$subjectId.tsx    # /trajectory/:subjectId
|   |   +-- interventions.$subjectId.tsx # /interventions/:subjectId
|   |   +-- settings.tsx            # /settings (layout)
|   |   +-- settings.clocks.tsx
|   |   +-- settings.consensus.tsx
|   |   +-- settings.pipeline.tsx
|   |   +-- settings.hnsw.tsx
|   |   +-- settings.audit.tsx
|   +-- providers/
|   |   +-- theme-provider.tsx
|   |   +-- auth-provider.tsx
|   |   +-- websocket-provider.tsx
|   |   +-- keyboard-shortcut-provider.tsx
|   +-- app.tsx                     # App entry, compose providers
|   +-- router.tsx                  # TanStack Router configuration
+-- features/
|   +-- dashboard/
|   |   +-- components/
|   |   |   +-- metric-card.tsx
|   |   |   +-- recent-analyses-table.tsx
|   |   |   +-- system-health-panel.tsx
|   |   |   +-- age-distribution-chart.tsx
|   |   |   +-- pipeline-throughput-chart.tsx
|   |   +-- hooks/
|   |   |   +-- use-dashboard-metrics.ts
|   |   +-- types.ts
|   +-- analysis/
|   |   +-- components/
|   |   |   +-- upload-panel.tsx
|   |   |   +-- file-dropzone.tsx
|   |   |   +-- metadata-form.tsx
|   |   |   +-- pipeline-progress.tsx
|   |   |   +-- stage-timeline.tsx
|   |   |   +-- stage-node.tsx
|   |   |   +-- event-log.tsx
|   |   |   +-- result-panel.tsx
|   |   |   +-- age-result-hero.tsx
|   |   |   +-- top-cpg-contributors.tsx
|   |   +-- hooks/
|   |   |   +-- use-submit-sample.ts
|   |   |   +-- use-pipeline-events.ts
|   |   |   +-- use-run-result.ts
|   |   +-- schemas/
|   |   |   +-- metadata-schema.ts    # Zod schema for form validation
|   |   +-- types.ts
|   +-- clocks/
|   |   +-- components/
|   |   |   +-- clock-grid.tsx
|   |   |   +-- clock-card.tsx
|   |   |   +-- agreement-matrix.tsx
|   |   |   +-- cpg-overlap-venn.tsx
|   |   |   +-- weights-display.tsx
|   |   |   +-- consensus-detail-panel.tsx
|   |   +-- hooks/
|   |   |   +-- use-clock-comparison.ts
|   |   +-- types.ts
|   +-- proofs/
|   |   +-- components/
|   |   |   +-- proof-detail-panel.tsx
|   |   |   +-- verification-panel.tsx
|   |   |   +-- verification-steps.tsx
|   |   |   +-- proof-chain-timeline.tsx
|   |   |   +-- public-signals-table.tsx
|   |   +-- hooks/
|   |   |   +-- use-verify-proof.ts
|   |   +-- types.ts
|   +-- knowledge/
|   |   +-- components/
|   |   |   +-- graph-visualization.tsx
|   |   |   +-- graph-controls.tsx
|   |   |   +-- node-renderer.tsx
|   |   |   +-- edge-renderer.tsx
|   |   |   +-- detail-sidebar.tsx
|   |   |   +-- causal-chain-panel.tsx
|   |   +-- hooks/
|   |   |   +-- use-knowledge-query.ts
|   |   |   +-- use-graph-layout.ts
|   |   +-- types.ts
|   +-- trajectory/
|   |   +-- components/
|   |   |   +-- trajectory-chart.tsx
|   |   |   +-- velocity-panel.tsx
|   |   |   +-- anomaly-alert-panel.tsx
|   |   |   +-- timepoint-table.tsx
|   |   +-- hooks/
|   |   |   +-- use-trajectory.ts
|   |   |   +-- use-velocity.ts
|   |   +-- types.ts
|   +-- interventions/
|   |   +-- components/
|   |   |   +-- recommendation-list.tsx
|   |   |   +-- recommendation-card.tsx
|   |   |   +-- intervention-timeline.tsx
|   |   |   +-- projection-chart.tsx
|   |   +-- hooks/
|   |   |   +-- use-recommendations.ts
|   |   +-- types.ts
|   +-- settings/
|       +-- components/
|       |   +-- clock-weights-editor.tsx
|       |   +-- consensus-settings.tsx
|       |   +-- pipeline-settings.tsx
|       |   +-- hnsw-parameters-editor.tsx
|       |   +-- audit-log-viewer.tsx
|       +-- hooks/
|       |   +-- use-settings.ts
|       +-- types.ts
+-- shared/
|   +-- components/
|   |   +-- ui/                     # Design system atoms (wrapping Radix)
|   |   |   +-- button.tsx
|   |   |   +-- badge.tsx
|   |   |   +-- card.tsx
|   |   |   +-- dialog.tsx
|   |   |   +-- dropdown-menu.tsx
|   |   |   +-- input.tsx
|   |   |   +-- select.tsx
|   |   |   +-- slider.tsx
|   |   |   +-- table.tsx
|   |   |   +-- tabs.tsx
|   |   |   +-- tooltip.tsx
|   |   |   +-- accordion.tsx
|   |   |   +-- toast.tsx
|   |   |   +-- skeleton.tsx
|   |   |   +-- progress.tsx
|   |   |   +-- separator.tsx
|   |   +-- layout/
|   |   |   +-- app-shell.tsx
|   |   |   +-- sidebar.tsx
|   |   |   +-- top-bar.tsx
|   |   |   +-- breadcrumb.tsx
|   |   +-- feedback/
|   |   |   +-- loading-spinner.tsx
|   |   |   +-- empty-state.tsx
|   |   |   +-- error-boundary.tsx
|   |   |   +-- error-fallback.tsx
|   |   +-- data-display/
|   |   |   +-- status-badge.tsx
|   |   |   +-- copy-button.tsx
|   |   |   +-- hash-display.tsx
|   |   |   +-- age-display.tsx
|   |   |   +-- confidence-bar.tsx
|   |   +-- command-palette.tsx
|   +-- hooks/
|   |   +-- use-keyboard-shortcut.ts
|   |   +-- use-media-query.ts
|   |   +-- use-debounce.ts
|   |   +-- use-clipboard.ts
|   +-- lib/
|   |   +-- api-client.ts           # Typed fetch wrapper for all endpoints
|   |   +-- websocket-client.ts     # WebSocket connection manager
|   |   +-- export-pdf.ts           # PDF generation utilities
|   |   +-- export-csv.ts           # CSV generation utilities
|   |   +-- format.ts               # Number, date, hash formatters
|   |   +-- cn.ts                   # Tailwind classname merger (clsx + twMerge)
|   +-- store/
|   |   +-- index.ts                # Combined Zustand store
|   |   +-- slices/
|   |       +-- theme-slice.ts
|   |       +-- auth-slice.ts
|   |       +-- pipeline-slice.ts
|   |       +-- knowledge-explorer-slice.ts
|   |       +-- settings-slice.ts
|   +-- types/
|       +-- api.ts                  # API request/response types
|       +-- domain.ts               # Frontend mirror of backend domain types
|       +-- roles.ts                # Role definitions and permission maps
+-- styles/
|   +-- globals.css                 # Tailwind directives + CSS custom properties
|   +-- tokens.css                  # Design system tokens (see section 8)
+-- test/
    +-- setup.ts                    # Vitest setup, MSW handlers
    +-- mocks/
    |   +-- handlers.ts             # MSW request handlers
    |   +-- fixtures/
    |       +-- pipeline-run.ts     # Factory for test PipelineRun objects
    |       +-- clock-result.ts
    |       +-- age-proof.ts
    +-- e2e/
        +-- analysis-flow.spec.ts
        +-- proof-verification.spec.ts
```

---

## 7. Key TypeScript Interfaces (Frontend)

These are the frontend-side types that mirror and adapt the backend domain types for UI consumption. They use serializable formats (no `Float32Array`, `Map`, `Uint8Array`).

```typescript
// ─── API Client Types ─────────────────────────────────────────────

interface ApiClient {
  submitSample(csv: File, metadata: SampleMetadataInput): Promise<{ runId: string }>;
  getResult(runId: string): Promise<PipelineRunDTO>;
  verifyProof(proof: AgeProofDTO): Promise<{ valid: boolean; steps: VerificationStep[] }>;
  queryKnowledge(query: string): Promise<KnowledgeQueryResult>;
  getTrajectory(subjectId: string): Promise<TrajectoryDTO>;
}

// ─── Domain DTOs (JSON-serializable) ──────────────────────────────

interface SampleMetadataInput {
  chronologicalAge: number;
  sex: 'M' | 'F';
  tissueSource: string;
  collectionDate: string;       // ISO 8601
  batchId?: string;
}

type ClockName = 'altumage' | 'grimage' | 'deepstrataage' | 'epinflamm';

type PipelineStage =
  | 'ingesting'
  | 'embedding'
  | 'inferring'
  | 'consensus'
  | 'proving'
  | 'indexing'
  | 'recommending'
  | 'complete'
  | 'failed';

interface CpGContributionDTO {
  probeId: string;
  betaValue: number;
  shapValue: number;
  direction: 'accelerating' | 'decelerating';
}

interface ClockResultDTO {
  clockName: ClockName;
  biologicalAge: number;
  chronologicalAge: number;
  ageAcceleration: number;
  confidence: number;
  topContributingCpGs: CpGContributionDTO[];
  modelHash: string;
  inferenceTimeMs: number;
}

interface ConsensusAgeDTO {
  consensusBiologicalAge: number;
  clockResults: ClockResultDTO[];
  consensusMethod: 'raft' | 'weighted_average';
  tolerance: number;
  committedClocks: number;
  confidenceInterval: [number, number];
  agingVelocity?: number;
  weights: Record<ClockName, number>;
}

interface AgeProofDTO {
  proofBytesBase64: string;       // Base64-encoded proof
  publicSignals: {
    biologicalAge: number;
    modelHash: string;
    timestamp: number;
    consensusMethod: string;
  };
  verificationKeyBase64: string;  // Base64-encoded vk
  circuitHash: string;
  provingTimeMs: number;
  proofSizeBytes: number;
}

interface PipelineMetricsDTO {
  ingestionTimeMs: number;
  embeddingTimeMs: number;
  inferenceTimeMs: number;
  consensusTimeMs: number;
  provingTimeMs: number;
  indexingTimeMs: number;
  totalTimeMs: number;
}

interface PipelineRunDTO {
  runId: string;
  sampleId: string;
  status: PipelineStage;
  startedAt: string;              // ISO 8601
  completedAt?: string;           // ISO 8601
  clockResults: ClockResultDTO[];
  consensusAge?: ConsensusAgeDTO;
  proof?: AgeProofDTO;
  recommendations: InterventionRecommendationDTO[];
  error?: string;
  metrics: PipelineMetricsDTO;
}

// ─── Knowledge Types ──────────────────────────────────────────────

type NodeKind = 'CpGSite' | 'Gene' | 'Pathway' | 'AgingPhase' | 'Intervention';

type EdgeRelation =
  | 'REGULATES'
  | 'INVOLVED_IN'
  | 'ASSOCIATED_WITH'
  | 'REDUCES_ACCELERATION';

interface GraphNodeDTO {
  id: string;
  kind: NodeKind;
  label: string;
  data: Record<string, unknown>;
}

interface GraphEdgeDTO {
  source: string;
  target: string;
  relation: EdgeRelation;
  evidenceStrength: number;
}

interface KnowledgeQueryResult {
  nodes: GraphNodeDTO[];
  edges: GraphEdgeDTO[];
  causalChains: CausalChainDTO[];
}

interface CausalChainDTO {
  cpg: string;
  gene: string;
  pathway: string;
  agingPhase: 'early_life' | 'early_midlife' | 'late_midlife' | 'late_life';
  evidenceStrength: number;
}

// ─── Trajectory Types ─────────────────────────────────────────────

interface TrajectoryPointDTO {
  timestamp: string;              // ISO 8601
  consensusBiologicalAge: number;
  confidenceInterval: [number, number];
  clockResults: ClockResultDTO[];
}

interface TrajectoryDTO {
  subjectId: string;
  points: TrajectoryPointDTO[];
  velocity: number;               // bio-years per calendar-year
  anomalies: AnomalyDTO[];
}

interface AnomalyDTO {
  timestamp: string;
  deviation: number;
  severity: 'warning' | 'critical';
}

// ─── Intervention Types ───────────────────────────────────────────

type InterventionCategory =
  | 'exercise'
  | 'diet'
  | 'supplement'
  | 'pharmacological'
  | 'lifestyle';

type EvidenceLevel = 'strong' | 'moderate' | 'preliminary';

interface InterventionRecommendationDTO {
  interventionName: string;
  category: InterventionCategory;
  expectedEffectYears: number;
  evidenceLevel: EvidenceLevel;
  relevantCpGs: string[];
  similarProfileCount: number;
  confidenceScore: number;
}

// ─── Verification Types ───────────────────────────────────────────

interface VerificationStep {
  name: string;
  description: string;
  passed: boolean;
}

// ─── WebSocket Event Types ────────────────────────────────────────

type PipelineEvent =
  | { type: 'MethylationSampleIngested'; sampleId: string; probeCount: number }
  | { type: 'CpGEmbeddingGenerated'; sampleId: string; dimensions: number }
  | { type: 'ClockInferenceCompleted'; clockName: ClockName; biologicalAge: number }
  | { type: 'ConsensusReached'; consensusAge: number; committedClocks: number }
  | { type: 'ConsensusFailed'; reason: string }
  | { type: 'ProofGenerated'; circuitHash: string; provingTimeMs: number }
  | { type: 'ProofVerified'; valid: boolean }
  | { type: 'TrajectoryPointAdded'; subjectId: string; agingVelocity: number }
  | { type: 'InterventionRecommended'; count: number }
  | { type: 'AnomalyDetected'; subjectId: string; deviation: number }
  | { type: 'PipelineComplete'; runId: string }
  | { type: 'PipelineFailed'; runId: string; error: string };

// ─── Auth / Role Types ────────────────────────────────────────────

type UserRole = 'patient' | 'clinician' | 'researcher' | 'admin';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'admin')[];
}

// Role -> Permission mapping
// patient:     analysis (read own), trajectory (read own), interventions (read own)
// clinician:   analysis (read/write), trajectory (read), interventions (read/write)
// researcher:  analysis (read/write), knowledge (read), trajectory (read), clocks (read)
// admin:       all resources, all actions
```

---

## 8. Design System Tokens

```css
/* tokens.css -- imported into globals.css */

:root {
  /* ── Color Palette (light mode) ────────────────────────────── */

  /* Neutrals (zinc-based) */
  --color-bg-primary:       #ffffff;
  --color-bg-secondary:     #f4f4f5;
  --color-bg-tertiary:      #e4e4e7;
  --color-bg-inverse:       #18181b;
  --color-text-primary:     #09090b;
  --color-text-secondary:   #52525b;
  --color-text-tertiary:    #a1a1aa;
  --color-text-inverse:     #fafafa;
  --color-border-default:   #e4e4e7;
  --color-border-strong:    #a1a1aa;

  /* Brand (indigo) */
  --color-brand-50:         #eef2ff;
  --color-brand-100:        #e0e7ff;
  --color-brand-500:        #6366f1;
  --color-brand-600:        #4f46e5;
  --color-brand-700:        #4338ca;

  /* Semantic: Age Acceleration */
  --color-decelerated:      #10b981;   /* green-500, younger */
  --color-neutral-age:      #6366f1;   /* indigo-500, on-track */
  --color-accelerated:      #ef4444;   /* red-500, older */

  /* Semantic: Evidence Level */
  --color-evidence-strong:    #10b981;
  --color-evidence-moderate:  #f59e0b;
  --color-evidence-prelim:    #a1a1aa;

  /* Semantic: Pipeline Stage */
  --color-stage-pending:    #a1a1aa;
  --color-stage-active:     #3b82f6;
  --color-stage-complete:   #10b981;
  --color-stage-error:      #ef4444;

  /* Semantic: Node Kinds (knowledge graph) */
  --color-node-cpg:         #3b82f6;   /* blue */
  --color-node-gene:        #10b981;   /* green */
  --color-node-pathway:     #f59e0b;   /* amber */
  --color-node-phase:       #ef4444;   /* red */
  --color-node-intervention:#8b5cf6;   /* violet */

  /* Semantic: Intervention Category */
  --color-cat-exercise:     #10b981;
  --color-cat-diet:         #f59e0b;
  --color-cat-supplement:   #8b5cf6;
  --color-cat-pharma:       #ef4444;
  --color-cat-lifestyle:    #3b82f6;

  /* ── Spacing Scale (4px base) ──────────────────────────────── */
  --space-0:   0;
  --space-1:   0.25rem;   /* 4px  */
  --space-2:   0.5rem;    /* 8px  */
  --space-3:   0.75rem;   /* 12px */
  --space-4:   1rem;      /* 16px */
  --space-5:   1.25rem;   /* 20px */
  --space-6:   1.5rem;    /* 24px */
  --space-8:   2rem;      /* 32px */
  --space-10:  2.5rem;    /* 40px */
  --space-12:  3rem;      /* 48px */
  --space-16:  4rem;      /* 64px */

  /* ── Typography ────────────────────────────────────────────── */
  --font-sans:   'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono:   'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

  --text-xs:     0.75rem;    /* 12px, line-height 1rem    */
  --text-sm:     0.875rem;   /* 14px, line-height 1.25rem */
  --text-base:   1rem;       /* 16px, line-height 1.5rem  */
  --text-lg:     1.125rem;   /* 18px, line-height 1.75rem */
  --text-xl:     1.25rem;    /* 20px, line-height 1.75rem */
  --text-2xl:    1.5rem;     /* 24px, line-height 2rem    */
  --text-3xl:    1.875rem;   /* 30px, line-height 2.25rem */
  --text-4xl:    2.25rem;    /* 36px, line-height 2.5rem  */
  --text-5xl:    3rem;       /* 48px, line-height 1       */

  --font-weight-normal:  400;
  --font-weight-medium:  500;
  --font-weight-semibold: 600;
  --font-weight-bold:    700;

  /* ── Border Radius ─────────────────────────────────────────── */
  --radius-sm:   0.25rem;   /* 4px  */
  --radius-md:   0.375rem;  /* 6px  */
  --radius-lg:   0.5rem;    /* 8px  */
  --radius-xl:   0.75rem;   /* 12px */
  --radius-2xl:  1rem;      /* 16px */
  --radius-full: 9999px;

  /* ── Shadows ───────────────────────────────────────────────── */
  --shadow-sm:   0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:   0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg:   0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl:   0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* ── Z-Index Scale ─────────────────────────────────────────── */
  --z-dropdown:  10;
  --z-sticky:    20;
  --z-overlay:   30;
  --z-modal:     40;
  --z-toast:     50;
  --z-command:   60;

  /* ── Animation ─────────────────────────────────────────────── */
  --duration-fast:   100ms;
  --duration-normal: 200ms;
  --duration-slow:   300ms;
  --ease-default:    cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in:         cubic-bezier(0.4, 0, 1, 1);
  --ease-out:        cubic-bezier(0, 0, 0.2, 1);

  /* ── Layout ────────────────────────────────────────────────── */
  --sidebar-width-collapsed:  64px;
  --sidebar-width-expanded:   256px;
  --topbar-height:            56px;
  --content-max-width:        1440px;
}

/* ── Dark Mode Overrides ─────────────────────────────────────── */

[data-theme='dark'] {
  --color-bg-primary:       #09090b;
  --color-bg-secondary:     #18181b;
  --color-bg-tertiary:      #27272a;
  --color-bg-inverse:       #fafafa;
  --color-text-primary:     #fafafa;
  --color-text-secondary:   #a1a1aa;
  --color-text-tertiary:    #71717a;
  --color-text-inverse:     #09090b;
  --color-border-default:   #27272a;
  --color-border-strong:    #52525b;

  --shadow-sm:   0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md:   0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
  --shadow-lg:   0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3);
}
```

---

## 9. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + N` | New analysis (navigate to /analysis) |
| `Cmd/Ctrl + D` | Go to dashboard |
| `Cmd/Ctrl + Shift + T` | Toggle dark/light theme |
| `Cmd/Ctrl + Shift + E` | Export current view (PDF) |
| `Escape` | Close modal / sidebar / command palette |
| `J / K` | Navigate table rows (vim-style) |
| `Enter` | Open selected row |
| `?` | Show keyboard shortcut help overlay |

---

## 10. Accessibility Requirements (WCAG 2.1 AA)

| Requirement | Implementation |
|-------------|----------------|
| Color contrast | All text meets 4.5:1 minimum ratio; large text meets 3:1. Tokens chosen accordingly. |
| Focus management | All interactive elements have visible focus rings (`outline-2 outline-offset-2 outline-brand-500`). Focus trapped in modals and command palette. |
| Screen reader | Radix UI primitives include ARIA attributes by default. Custom components add `aria-label`, `aria-describedby`, `role` as needed. |
| Keyboard navigation | Full keyboard operability for all interactive elements. Tab order follows logical reading order. |
| Motion reduction | Respect `prefers-reduced-motion`. Disable pipeline progress animations when enabled. |
| Form labels | Every input has an associated `<label>`. Error messages linked via `aria-describedby`. |
| Status announcements | Pipeline stage changes announced via `aria-live="polite"` region. |
| Skip navigation | "Skip to main content" link visible on focus. |
| Charts | All Recharts include `<desc>` for screen readers and tabular data fallback. |
| Graph visualization | Knowledge explorer provides a tabular alternative view of nodes/edges for screen readers. |

---

## 11. Responsive Breakpoints

| Breakpoint | Min width | Layout behavior |
|------------|-----------|-----------------|
| `sm` | 640px | Single column, sidebar hidden |
| `md` | 768px | Sidebar collapsed (icons only), content full-width |
| `lg` | 1024px | Sidebar expanded, standard layout |
| `xl` | 1280px | Wider charts, 2-column panels where useful |
| `2xl` | 1536px | Max content width, centered |

Tablet (768-1024px) behavior:
- Sidebar auto-collapses to icon-only mode
- Clock comparison shifts from 2x2 grid to single column
- Knowledge graph fills full width, detail sidebar becomes a bottom sheet
- Pipeline timeline switches from horizontal stepper to vertical

---

## 12. Performance Budget

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.2s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.0s |
| Cumulative Layout Shift | < 0.1 |
| JS bundle (initial) | < 150 KB gzipped |
| JS bundle (per route, lazy) | < 50 KB gzipped |

Strategies:
- Route-based code splitting via TanStack Router lazy routes
- react-force-graph-2d loaded only on `/knowledge` route
- Recharts tree-shaken to import only used chart types
- WebSocket connection deferred until analysis submission
- Image/icon sprites for knowledge graph node shapes
- TanStack Query `staleTime: 30000` for dashboard data to reduce re-fetches

---

## 13. Error Handling Strategy

| Error type | Handling |
|------------|----------|
| Network failure | TanStack Query retry (3x exponential backoff). Toast notification on final failure. Stale data displayed with "Last updated" badge. |
| WebSocket disconnect | Auto-reconnect with backoff (1s, 2s, 4s, 8s, max 30s). Pipeline progress shows "Reconnecting..." banner. On reconnect, fetch current run status via REST to reconcile. |
| API validation error (4xx) | Display field-level errors in forms. Toast for non-form errors. |
| Server error (5xx) | Error boundary catches rendering failures. Fallback UI with "Retry" button. Toast for mutation failures. |
| Pipeline failure | `PipelineFailed` event renders error state in stage timeline. Error message displayed in result panel. Retry button re-submits. |
| Proof verification failure | Verification panel shows which steps failed with explanations. No error boundary -- failure is a valid result state. |

---

## 14. Testing Strategy

| Layer | Tool | Coverage target | What to test |
|-------|------|-----------------|-------------|
| Unit | Vitest | 80% | Zustand slices, utility functions, formatters, Zod schemas |
| Component | Vitest + Testing Library | 70% | Individual components in isolation with mocked data |
| Integration | Vitest + MSW | Key flows | Upload flow, pipeline progress WebSocket handling, proof verification |
| E2E | Playwright | Critical paths | Full analysis submission through to result display; proof verification; knowledge graph interaction |
| Visual regression | Playwright screenshots | Key pages | Dashboard, analysis results, clock comparison (light + dark) |
| Accessibility | axe-core + Playwright | All pages | Automated WCAG 2.1 AA checks on every page |
