# NeuroScope-3D Design Notes & Architecture

## 1. Design System & Tokens
- **Theme Palette:**
  - Base background: `#0A0E17` (Deep dark medical navy/charcoal)
  - Surface primary: `#0F1623`
  - Surface elevated: `#151D2C`
  - Subtle borders: `rgba(255, 255, 255, 0.08)`
  - Accents: Cyan `#22D3EE` / `#06B6D4`, Blue `#3B82F6`
  - Tumor semantic subregions:
    - **Enhancing Tumor (ET):** Coral/Red `#EF4444`
    - **Necrotic Core (NCR):** Amber `#F59E0B`
    - **Peritumoral Edema (ED):** Emerald `#10B981`
    - **Whole Tumor (WT):** Pink/Magenta `#EC4899`
    - **Tumor Core (TC):** Orange `#F97316`
- **Typography:**
  - Self-hosted variable font `@fontsource-variable/inter` for clean UI readability.
  - JetBrains Mono for DICOM tags, dimensions, SHA-256 hashes, and numeric metrics.
- **Components & Primitives (`src/components/ui/`):**
  - `Button`: Standardized variants (primary, secondary, ghost, danger) and sizes (sm, md, lg).
  - `Card`: Workstation panels with customizable surface elevation.
  - `Badge`: Status tags (cyan, emerald, amber, red, neutral).
  - `MetricCard`: Clinical metric readout cards with value, unit, and tooltip explanation.
  - `SegmentedControl`: Clean toggle control for modality and axis selection.
  - `StatusPill`: Real-time backend connectivity and inference readiness indicator.

---

## 2. Component Structure & Architecture

```
src/
├── App.tsx                          # Header shell + navigation + health polling (15s) + disclaimer footer
├── index.css                        # Design system CSS variables, scrollbars, and glassmorphism
├── components/
│   ├── ui/                          # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── MetricCard.tsx
│   │   ├── SegmentedControl.tsx
│   │   └── StatusPill.tsx
│   ├── landing/
│   │   ├── LandingHero.tsx          # 5-second value proposition, CTAs, features, stepper, preview
│   │   └── HolographicBrain.tsx     # Lazy-loaded Three.js brain rotating smoothly on fixed Y-axis
│   ├── auth/
│   │   ├── InlineAuthCard.tsx       # Embedded sign-in card with honest unconfigured server notices
│   │   ├── LoginPage.tsx            # Dedicated NeuroScan view with 3D canvas and workspace bypass
│   │   └── BrainVisualization.tsx   # Orbiting wireframe sphere for auth view
│   ├── upload/
│   │   └── UploadWorkspace.tsx      # BraTS and MSD upload rail with drag-drop and validation cards
│   ├── viewer/
│   │   └── MultiPlanarViewer.tsx    # 2D Orthogonal slice viewer (Axial/Coronal/Sagittal) + opacity slider
│   ├── three/
│   │   └── Patient3DViewer.tsx      # 3D spatial viewer with GizmoViewport, camera reset, subregion toggles
│   └── analysis/
│       └── VolumetricsPanel.tsx     # Physical volumes (mL), derived diameter, Recharts distribution, metrics
├── services/
│   ├── api.ts                       # Axios client connected to FastAPI backend (UNTOUCHED)
│   └── authService.ts               # Typed interface modeling unconfigured backend state
├── store/
│   └── studyStore.ts                # Zustand central store for active run, views, and 3D display options
└── types/
    └── api.ts                       # Data models matching FastAPI backend (UNTOUCHED)
```

---

## 3. Unchanged Protection Boundaries
- `backend/`: **100% untouched** (FastAPI routes, SegResNet weights, volumetrics, and validators).
- `frontend/`: **100% untouched** (original static HTML/JS preserved).
- `tests/`: Automated pytest suite preserved.
- `src/services/api.ts` & `src/types/api.ts`: Kept strictly synchronized with backend contracts.
- `vite.config.ts`: Proxy to `http://127.0.0.1:8001` preserved.

---

## 4. Backend Capabilities & Unsupported Feature Roadmap

### Provided by Backend:
- Whole Tumor, Tumor Core, Enhancing Tumor, Edema, and Necrotic Core physical volumes ($V = N \times s_x s_y s_z / 1000$ mL).
- Comparative metrics against expert masks: Dice Score, Sensitivity, Specificity, Hausdorff Distance 95 (HD95 mm).
- 2D Orthogonal slice generation with color overlays on `t1`, `t1gd`, `t2`, and `flair`.
- Multi-parametric validation for BraTS (4 files) and MSD Task01 (4D volume).
- Automated PDF report dossier and NIfTI prediction mask downloads.

### Intentionally Not Displayed in Real Scans (Backend Limitations):
1. **Measured Caliper Tumor Diameter:** The backend computes physical volumes, not max caliper caliper spans. The UI exposes **Equivalent Spherical Diameter (derived)** ($d = (6V/\pi)^{1/3}$ mm) with a clear tooltip that it is a mathematical volume equivalent.
2. **Confidence Percentage:** The backend does not output Bayesian or softmax confidence. The UI never shows fabricated confidence; it displays the real **Dice Score** when expert masks exist, or inference runtime.
3. **Anatomical Lobe/Region:** The model segments tumor subregions, not anatomical cerebral lobes. No anatomical regions are fabricated.
4. **Continuous Surface Raymarched 3D Mesh:** The backend does not serve GLTF/OBJ meshes. The 3D viewer renders patient-specific coordinate bounding grids and subregion volume bodies derived from real mL values, clearly documented with an "About this view" popover.
5. **Server User Directory & OAuth:** The backend runs in academic mode. The UI presents an honest notice on sign-in attempts and routes directly to the open academic workspace.
