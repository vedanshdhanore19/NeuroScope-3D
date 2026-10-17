# NeuroScope-3D — Frontend Architecture & Design Notes

## 1. Design System & Tokens

The modernized frontend adopts a **Light Clinical Research Workstation** design system with high-contrast, deeply shaded dark viewports for radiological image clarity.

### Typography
- **Primary / UI Sans**: `Plus Jakarta Sans Variable` (`@fontsource-variable/plus-jakarta-sans`) for crisp clinical typography, clean tabular metadata, and high readability.
- **Monospace / Numerical Data**: `JetBrains Mono` (`@fontsource/jetbrains-mono`) for patient coordinates, slice indices, voxel counts, volumetric readings (mL), and SHA-256 provenance hashes.

### Color Tokens
- **Navy Core**: `#0b192c` (primary heading & brand accents), `#07101e` (dark surface), `#1e293b` (slate border accents).
- **Clinical Cyan**: `#0284c7` (primary interactive focus), `#38bdf8` (cyan light / axial plane indicator).
- **Clinical Mint**: `#00d690` (accent & status online indicator), `#059669` (coronal plane indicator).
- **Imaging Viewport**: `#0a0f1d` (deep dark WebGL canvas & slice viewport background), `#111827` (slate dark panel frame).
- **Background**: `#f4f7fb` with subtle medical radial gradient accents (`rgba(2, 132, 199, 0.07)` and `rgba(0, 214, 144, 0.05)`).

### BraTS Multi-Contrast & Tumor Sub-Region Tokens
Labels strictly adhere to the BraTS protocol with standardized union semantics:
- **WT (Whole tumor)**: `#00d690` (Mint Green) — union of labels 1, 2, and 4 (Necrotic Core + Peritumoral Edema + Enhancing Active Tumor).
- **TC (Tumor core)**: `#f59e0b` (Amber) — union of labels 1 and 4 (Gross tumor mass excluding peritumoral edema).
- **ET (Enhancing)**: `#ef4444` (Coral Red) — label 4 alone (Angiogenic hyper-intense rim disrupting blood-brain barrier).

### Elevation & Radii
- **Radii**: Smooth curved cards (`rounded-2xl` / `20px`, pills `rounded-full`, badges `rounded-xl`).
- **Shadows**: Soft clinical card shadows (`0 10px 25px -5px rgba(15, 30, 60, 0.06)`), mint glow for primary calls-to-action (`0 8px 24px -4px rgba(0, 214, 144, 0.35)`).

---

## 2. Component Map

```
frontend-react/src/
├── App.tsx                      # Top-level orchestrator, tab router, auto-navigation, health interval, study resume logic
├── index.css                    # Tailwind directives, clinical variables, custom scrollbars
├── types/api.ts                 # Real backend API TypeScript models, volumes, metrics, volume-info, mesh response
├── services/api.ts              # Axios HTTP client with relative '/api' Vite proxy to 127.0.0.1:8001
├── store/studyStore.ts          # Zustand store with persistent storage and safe error wrapping
├── components/
│   ├── Navbar.tsx               # Sticky header with interactive latency pill, MPR status indicator, mobile drawer
│   ├── Footer.tsx               # Institutional footer with academic disclaimer & protocol specifications
│   ├── landing/
│   │   ├── HeroSection.tsx      # Landing hero with sample preview, institutional sign-in card, and 3D brain
│   │   └── HolographicBrain.tsx # Lazy-loaded R3F procedural brain hemisphere wireframe rotating on fixed Y axis
│   ├── auth/
│   │   └── InlineAuthCard.tsx   # Institutional credential form with honest feedback & demo passkey helpers
│   ├── upload/
│   │   └── StudyUpload.tsx      # BraTS 4-sequence and MSD Task01 4D upload tabs with client-side gzip compression
│   ├── viewer/
│   │   ├── OrthogonalViewer.tsx # 3-panel MPR viewer (Axial, Coronal, Sagittal) with crosshairs, windowing, slice scrubbers
│   │   └── MeshViewer3D.tsx     # Real Marching Cubes 3D surface viewer with nested translucency & Three.js cleanup
│   ├── results/
│   │   └── ResultsDashboard.tsx # Physical volumetrics (mL, mm diameter), plausibility guard (>800 mL / 5%), Dice metrics table
│   ├── reports/
│   │   └── ReportExport.tsx     # PDF report download, compressed NIfTI export, software guidance (3D Slicer / ITK-SNAP)
│   └── ui/
│       ├── Badge.tsx            # Standardized clinical status badge
│       └── Toast.tsx            # Accessible notification toast system
```

---

## 3. Backend API Additions (Additive Only)

To power high-fidelity radiological exploration without modifying existing inference or database pipelines, additive endpoints were implemented in `backend/app/visualization.py` and routed via `backend/main.py`:

1. **`GET /api/v1/jobs/{id}/volume-info`**:
   - Reads the NIfTI headers (`shape`, `zooms`, `affine`) from the validated study directory.
   - Computes default slice indices (center of volume) and slice limits for Axial ($z$), Coronal ($y$), and Sagittal ($x$) viewports.
   - Lists available multi-contrast sequences (`t1`, `t1gd`, `t2`, `flair`).

2. **`GET /api/v1/jobs/{id}/slice?modality=...&plane=...&index=...&regions=...&brightness=...&contrast=...`**:
   - Slices the 3D anatomical volume dynamically on-demand along the requested plane.
   - Applies interactive windowing (brightness multiplier & contrast curve).
   - If `regions` contains active tumor masks (`WT`, `TC`, `ET`), blends colored overlays into an RGBA slice using proper BraTS union semantics (`WT` Mint `#00D690`, `TC` Amber `#F59E0B`, `ET` Coral `#EF4444`).
   - Streams PNG bytes directly with fast in-memory encoding.

3. **`GET /api/v1/jobs/{id}/mesh?region=WT|TC|ET`**:
   - Loads the predicted NIfTI segmentation mask from the study job folder.
   - Extracts the 3D isosurface mesh using scikit-image's `marching_cubes` at threshold 0.5.
   - Transforms voxel vertices into physical patient coordinates ($x, y, z$ in millimeters) via the affine transformation matrix and centers vertices around the lesion centroid.
   - Returns indexed geometry: `vertices` (flat Float32 array), `faces` (flat Int32 array), `normals` (vertex normals for smooth lighting), and counts (`num_vertices`, `num_faces`).

---

## 4. What Was Ported vs. Deliberately NOT Ported

### Ported from Reference / Brief:
- **Clean clinical palette**: Light mode with dark viewports (`#0a0f1d`), soft elevation, and crisp typography.
- **Interactive MPR Viewer**: Synchronized 3-plane views with crosshairs, slice sliders, brightness/contrast adjustments, and sequence switcher.
- **Client-Side Gzip**: In-browser compression of `.nii` files to `.nii.gz` via `CompressionStream('gzip')` to prevent backend rejection.
- **3D Marching Cubes Surface**: Real BufferGeometry rendered via Three.js with nested translucency (`depthWrite: false`) for internal tumor core visibility.
- **Resumable Studies**: State persisted via Zustand with silent 404 cleanup.
- **Volumetric Plausibility Guard**: Amber alert if $V_{WT} > 800$ mL or sub-region volumes are within 5% of each other.
- **Holographic Landing Brain**: Continuous rotation on fixed vertical axis with no pitch wobble, no user dragging, lazy-loaded canvas, and `dpr` capped at `[1, 1.75]`.

### Deliberately NOT Ported (Preserving Truth & Robustness):
- **Mock Inference with Random Noise**: The reference app simulated segmentation using synthetic random seeds; NeuroScope-3D uses the real MONAI SegResNet BraTS model weights (`860ccb3f...` sha256) running real inference.
- **Synthetic Sample-Data Generator**: Avoided generating mock patient datasets on the client; all patient studies are authenticated against backend jobs.
- **Hardcoded Port 8000**: All frontend API requests use relative `/api` paths routed cleanly via Vite proxy to the verified backend on port 8001.
- **"WT = Edema" Nomenclature**: BraTS defines WT as Whole Tumor (label 1 + 2 + 4), NOT isolated edema. The UI strictly labels WT as `"WT (Whole tumor)"` to prevent clinical confusion.
- **Fabricated Metrics**: The ground-truth metrics table is only displayed if an expert reference mask is provided during upload; no metrics are invented.

---

## 5. Verified Limitations & Architectural Notes

1. **Authentication Mode**:
   - The sign-in card provides an institutional access gate (`InlineAuthCard.tsx`) with predefined researcher accounts (`researcher@neuroscope.org` / `admin@neuroscope.org`). It does not issue backend JWT tokens because the verified backend does not enforce authentication on inference endpoints.
2. **Derived Physical Diameter**:
   - The backend computes voxel counts and physical volume in mL ($V$). The spherical equivalent diameter is derived on the client using the standard geometric relationship:
     $$D = \left(\frac{6V}{\pi}\right)^{1/3} \times 10\text{ mm}$$
   - This provides an intuitive physical reference alongside exact voxel metrics.
3. **Inference Latency on CPU**:
   - The MONAI SegResNet sliding-window inference takes ~15–35 seconds on a multi-core CPU. The UI provides an interactive timer (`Segmenting (Xs)...`) and auto-navigates to the MRI Viewer upon completion.
4. **Browser Compatibility**:
   - Client-side gzip compression relies on the web-standard `CompressionStream` API. If opened in legacy environments without `CompressionStream`, the UI flags this capability gracefully and advises uploading pre-compressed `.nii.gz` files.
