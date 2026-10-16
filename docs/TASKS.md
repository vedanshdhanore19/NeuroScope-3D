# NeuroScope 3D — Product Execution Task Plan

> **Purpose:** The implementation backlog for taking NeuroScope 3D from a reliable research/teaching prototype to a reproducible research-lab platform, multi-site research system, and—only if justified and authorized—a potential clinical product.
>
> **Product principle:** Build for reproducibility. Protect data by design. Verify the anatomy. Report the evidence. Gate clinical use.

| Document field | Value |
|---|---|
| Product | NeuroScope 3D |
| Document | `Task.md` |
| Version | 2.0 |
| Status | Initial backlog — work status and owners must be confirmed by the team |
| Source of truth for requirements | [`prd.md`](./prd.md) |
| Source of truth for engineering/governance rules | [`Rules.md`](./Rules.md) |
| Current permitted product stage | R0: research/teaching prototype, unless a formally approved stage gate says otherwise |
| Intended use of this file | Planning, issue creation, progress tracking, release-gate evidence |

---

## 0. How to use this file

This is a living task tracker, not a claim that any item is already implemented. Every task starts unchecked. Only mark a task complete after its acceptance criteria have been verified and evidence has been linked or recorded.

### 0.1 Task priority

- **P0 — Release blocker:** Required for the currently approved stage or a safety/data-integrity prerequisite.
- **P1 — Important:** Required to make the current stage dependable, maintainable or usable; may follow P0 when the release owner approves.
- **P2 — Planned enhancement:** Valuable capability for a later stage; must not displace current-stage release blockers.
- **GATED — Future-stage work:** Do not activate, deploy or claim this capability until the named stage's entry criteria and approvals are satisfied.

### 0.2 Status convention

Use the checkbox as the simplest status marker. When this file is copied into GitHub Issues or a project board, use statuses such as `Backlog`, `Ready`, `In progress`, `Blocked`, `In review`, and `Done` without changing the acceptance criteria.

- `[ ]` Not verified as complete.
- `[x]` Complete and supported by evidence.
- `**BLOCKED**` A dependency, access permission, external approval or unresolved design decision prevents progress.
- `**DECISION NEEDED**` Team or stakeholder decision required before implementation.

### 0.3 Definition of a complete task

A task is complete only when:
1. the implementation or document exists in the repository;
2. acceptance criteria have been verified;
3. automated tests are added where behavior can be tested automatically;
4. relevant limitations and failure behavior are documented;
5. no prohibited data, hidden-case material, secrets or unauthorized model/data artefacts have been introduced;
6. the PRD/Rules/architecture docs are updated if the decision changes product behavior;
7. a reviewer has checked the change for the current release stage.

### 0.4 Rules that apply to the entire backlog

- Work in the order of dependencies, not simply from top to bottom.
- R0 is research/teaching only. R1–R5 tasks do not authorize use of real patient data or clinical workflows on their own.
- Do not claim a later-stage capability is ready because a code path or interface exists. Readiness requires evidence and approval at the relevant gate.
- Never mark performance, accuracy, privacy, regulatory or clinical-readiness work complete without measured or reviewed evidence.
- Do not use hidden judge cases for training, tuning, persistent storage or examples. Follow the event rules and delete them as required.
- If a task conflicts with `prd.md`, `Rules.md`, the current data agreement, or an applicable approval, stop and resolve the conflict before proceeding.

---

## 1. Roadmap and release gates

The roadmap is **evidence-gated**, not calendar-gated. Dates and estimates should be assigned only after owners, access, dependencies and resources are known.

| Stage | Objective | Main outputs | Gate to pass before wider use |
|---|---|---|---|
| **R0 — Proof of concept / research demonstrator** | Correct single-case end-to-end workflow | Validated NIfTI input, model prediction, original-grid output, 3D and linked slices, volumes, report, failure handling | Mandatory technical/judge suite passes; research-only restrictions visible; runtime and reproducibility measured |
| **R1 — Single-lab research platform** | Manage permitted research projects, users, cases and reproducible runs | Authentication, project workspaces, roles, registry, configurable retention, audit trail, deployment and recovery guidance | Security/privacy/data-rights review, repeatability evidence and research-user acceptance |
| **R2 — Research operations and benchmarking** | Compare models/cohorts through controlled experiments | Versioned cohorts/splits, batch inference, experiment tracking, annotation review, reproducible analysis exports | Predefined analysis plan, leakage controls, independent result verification and transparent failures |
| **R3 — Multi-site research and interoperability** | Test generalization and controlled imaging-system integration | External site evaluation, DICOM conversion/integration profile, site-level permissions, data-flow controls | Site approvals and agreements, geometry/conformance tests, security review and independent site reports |
| **R4 — Investigational clinical workflow** *(future-gated)* | Study one defined potential clinical use in an approved investigation | Locked study configuration, protocol controls, study audit, risk controls, monitoring and reporting | Qualified regulatory determination, required ethics/study permissions, risk and validation evidence, approved protocol |
| **R5 — Potential regulated clinical product** *(future-gated)* | Consider deployment for a defined authorized intended use | Controlled software lifecycle, quality/risk files, clinical evidence, cybersecurity, release/rollback and post-release monitoring | All applicable regulatory authorizations, quality and risk controls, evidence and operational readiness completed |

**Non-negotiable rule:** Passing R0 does not mean research-lab readiness. Passing R1/R2 does not mean clinical validation. A clinical institution hosting an approved research project is not equivalent to routine patient-care use.

---

## 2. Stage 0 — Project governance and baseline decisions

**Purpose:** Establish a shared source of truth before implementation choices become expensive to reverse.

### 2.1 Project setup

- [ ] **TASK-001 | P0 | All stages — Assign accountable owners.** Name a product owner, technical lead, ML/imaging lead, frontend lead, quality/testing owner, data-governance contact and (for later stages) clinical/regulatory stakeholders. One person may hold multiple roles in a small team, but responsibility must be explicit.  
  **Done when:** A named owner and escalation route are recorded for each responsibility; unfilled roles are marked TBD.

- [ ] **TASK-002 | P0 | All stages — Confirm intended use by release.** Create a versioned intended-use statement for the current build and a separate placeholder for future stages.  
  **Done when:** The current release clearly states research/teaching only, supported data, intended users, exclusions and prohibited claims; no future clinical intended use is implied.

- [ ] **TASK-003 | P0 | All stages — Confirm source-of-truth documents.** Keep `prd.md`, `Rules.md` and `Task.md` in the repository root.  
  **Done when:** Links work, versions and update ownership are recorded, and overlapping statements are reconciled.

- [ ] **TASK-004 | P0 | All stages — Create decision log.** Record architectural, model, data, viewer, hosting, retention and licensing decisions with date, rationale, owner and consequences.  
  **Done when:** Every unresolved PRD decision has an entry or explicit owner/date for resolution.

- [ ] **TASK-005 | P0 | All stages — Establish risk register.** Track risk description, likelihood/impact method, owner, mitigation, status and evidence.  
  **Done when:** Model-label mismatch, geometry errors, data leakage, poor generalization, unauthorized clinical use, security, dependency and schedule risks have owners.

- [ ] **TASK-006 | P0 | All stages — Define change control.** Specify who can approve changes to requirements, data sources, model, preprocessing, label mapping, thresholds, metrics and intended use.  
  **Done when:** Changes with possible impact on results require a documented impact assessment and appropriate regression/revalidation decision.

- [ ] **TASK-007 | P1 | All stages — Create issue and release workflow.** Set up labels such as `P0`, `P1`, `P2`, `R0`…`R5`, `data`, `geometry`, `model`, `security`, `blocked` and `needs-evidence`.  
  **Done when:** Contributors can trace an issue to a PRD requirement, test and release stage.

### 2.2 Decisions that block core implementation

- [ ] **TASK-008 | P0 | R0 — Verify starter kit and exact model artefact.** Inspect the supplied notebook, weights, configuration, environment and scorer.  
  **Done when:** Model identifier/revision, source, licence, public-availability eligibility, input channel order, spacing, normalization, inference settings and output semantics are recorded.

- [ ] **TASK-009 | P0 | R0 — Resolve segmentation output semantics.** Determine whether the model predicts nested WT/TC/ET regions, component masks, or a component-coded label map.  
  **Done when:** The team has a tested, deterministic output contract that can satisfy the scorer without inventing NCR/ED labels; any unavoidable limitation is explicitly recorded.

- [ ] **TASK-010 | P0 | R0 — Confirm permitted data and split.** Record organizer development subset availability, training/validation/test assignment, scorer availability and any fine-tuning permissions.  
  **Done when:** No hidden case is in a training/tuning workflow; permitted case IDs and split logic are documented.

- [ ] **TASK-011 | P0 | R0 — Confirm compute budget.** Record GPU type, VRAM, CPU/RAM, runtime environment and local fallback.  
  **Done when:** A reproducible benchmark environment is named and resource limits are recorded.

- [ ] **TASK-012 | P0 | R0 — Choose the minimal viable imaging viewer.** Compare NiiVue and/or a Three.js-based custom viewer on orientation, affine handling, overlays and linked crosshair behavior.  
  **Done when:** A short decision record names the viewer approach based on a working geometry proof—not appearance alone.

- [ ] **TASK-013 | P0 | R0 — Choose deployment path for the demo.** Decide controlled local laptop, approved GPU server, or both.  
  **Done when:** The path can meet compute requirements without sending images to unapproved third-party services.

---

## 3. R0 — Correct, safe single-case research demonstrator

**Objective:** One supported case must pass from upload through prediction, geometry-correct output, viewer, volumes, and report. The tasks below are not sufficient to authorize broader research use.

### 3.1 Repository, runtime and model reproducibility

- [ ] **TASK-014 | P0 | R0 — Create reproducible developer environment.** Pin direct dependencies and lock the supported Python/Node/runtime versions.  
  **Done when:** A clean checkout can be installed using documented commands without relying on one contributor's machine state.

- [ ] **TASK-015 | P0 | R0 — Add configuration and secrets template.** Add `.env.example` or equivalent with safe placeholders only.  
  **Done when:** No real secret, token, credential or private endpoint is committed; startup errors clearly identify missing required configuration.

- [ ] **TASK-016 | P0 | R0 — Add model-loading module.** Separate model loading from request handling and record model checksum/revision.  
  **Done when:** Model artefacts are immutable at run time, their licence is documented, and unavailable/corrupt weights lead to an actionable error rather than a fake result.

- [ ] **TASK-017 | P0 | R0 — Implement explicit MRI channel mapping.** Map files to model-required sequence order independently from upload order.  
  **Done when:** Tests prove the configured order is correct for the chosen model bundle and all four channels are present exactly once.

- [ ] **TASK-018 | P0 | R0 — Add one-command inference entry point.** Provide a documented CLI or endpoint that consumes four sequences and writes a predicted label-map NIfTI.  
  **Done when:** The interface works without opening the web UI and produces a scorer-readable output on a supported fixture.

- [ ] **TASK-019 | P1 | R0 — Capture runtime environment in run manifest.** Record code commit, dependency versions, model version/configuration and relevant hardware.  
  **Done when:** A report/run manifest can identify the environment used to create the output.

### 3.2 Upload and medical-image validation

- [ ] **TASK-020 | P0 | R0 — Implement safe NIfTI upload.** Accept `.nii` and `.nii.gz`; do not trust names or MIME types.  
  **Done when:** File content is parsed using a medical-imaging library, input size limits are enforced, and paths are generated server-side.

- [ ] **TASK-021 | P0 | R0 — Validate dimensions and intensity values.** Reject unreadable, non-3D, non-finite and constant volumes.  
  **Done when:** Invalid cases receive a structured error, no inference starts, and no prior result is shown as the new case result.

- [ ] **TASK-022 | P0 | R0 — Validate shape, affine and voxel spacing.** Check all required sequences have compatible shape and spatial geometry.  
  **Done when:** Affine comparison policy/tolerance is documented and tested; matching dimensions alone are never accepted as proof of alignment.

- [ ] **TASK-023 | P0 | R0 — Inspect qform/sform and affine provenance.** Handle ambiguous or conflicting spatial metadata deliberately.  
  **Done when:** The chosen affine source/policy is recorded; materially conflicting coded forms trigger a documented warning/refusal rather than silent guessing.

- [ ] **TASK-024 | P0 | R0 — Add input-suitability checks.** Detect clear non-brain or non-skull-stripped conditions where possible.  
  **Done when:** Behavior is a documented warning/refusal, and heuristic checks are not described as a guaranteed anatomy classifier.

- [ ] **TASK-025 | P0 | R0 — Implement the full failure pack.** Include incorrect extension, corrupt gzip, missing modality, shape mismatch, 2D, all-zero/constant, NaN/Inf and over-limit file.  
  **Done when:** Every required case has a stable error code/message, no crash and no result artifact.

- [ ] **TASK-026 | P1 | R0 — Add validation summary to UI.** Show filename, assigned modality, dimensions, spacing, basic geometry status, size and warnings.  
  **Done when:** A user can see why processing is blocked before starting inference.

### 3.3 Preprocessing, inference and output map

- [ ] **TASK-027 | P0 | R0 — Implement documented model preprocessing.** Match official bundle requirements for normalization, orientation, spacing, crop/pad and inference window.  
  **Done when:** Preprocessing settings are versioned and a known fixture gives expected shapes/order.

- [ ] **TASK-028 | P0 | R0 — Track all spatial transforms.** Save enough metadata to reverse resampling, crop, pad and orientation changes.  
  **Done when:** The transformed model output can be mapped back to the reference input grid without hand-coded unverified flips.

- [ ] **TASK-029 | P0 | R0 — Implement model inference on the supplied case.** Prevent reads of stored dataset images/labels during prediction.  
  **Done when:** Model consumes only current request data and approved model artefacts; no lookup/cache path can substitute a stored label.

- [ ] **TASK-030 | P0 | R0 — Implement deterministic post-processing.** Convert model outputs into the declared output label contract.  
  **Done when:** Region nesting, overlap rules, thresholds and component-code mapping are unit-tested and documented; unsupported transformations fail visibly.

- [ ] **TASK-031 | P0 | R0 — Map prediction back to original grid.** Invert preprocessing and preserve the selected reference image affine.  
  **Done when:** Output dimensions and affine match the required input reference grid, and orientation fixtures pass.

- [ ] **TASK-032 | P0 | R0 — Validate saved output NIfTI.** Reopen the written file and check shape, affine, datatype and allowed labels.  
  **Done when:** Invalid output is not exposed as a successful result and the scorer can read the valid output.

- [ ] **TASK-033 | P0 | R0 — Ensure repeatability.** Run the same input and fixed configuration twice.  
  **Done when:** Output-mask Dice is at least 0.99 as required by the challenge, or the cause/limitation is raised as a release blocker rather than hidden.

### 3.4 Geometry, 3D view and linked slices

- [ ] **TASK-034 | P0 | R0 — Implement voxel/world coordinate utilities.** Implement affine and inverse-affine transforms with a clear voxel-index rounding policy.  
  **Done when:** Known-coordinate unit tests match the reference and bounds are handled consistently.

- [ ] **TASK-035 | P0 | R0 — Implement axial, coronal and sagittal views.** Render MRI slices and the selected mask overlay.  
  **Done when:** Slice index, orientation and overlay are correct under supported affine orientations.

- [ ] **TASK-036 | P0 | R0 — Implement linked crosshair.** Synchronize all three slice views and the 3D marker.  
  **Done when:** Clicking a known marker in one panel moves the crosshair in every view within the two-voxel acceptance tolerance.

- [ ] **TASK-037 | P0 | R0 — Implement orientation labels.** Display L/R, A/P and S/I using physical orientation, not array-axis assumptions.  
  **Done when:** Same-anatomy flip-plus-affine and true mirrored-anatomy tests behave as specified.

- [ ] **TASK-038 | P0 | R0 — Implement 3D surface/region meshes.** Generate the display from the current case mask and place it in world space.  
  **Done when:** No hard-coded tumour geometry is used for a live case and geometry agrees with slice views.

- [ ] **TASK-039 | P0 | R0 — Add 3D controls.** Add rotate, zoom, pan if supported, region toggles, opacity and camera reset.  
  **Done when:** WT/TC/ET visibility can be controlled independently and the result remains understandable with overlapping nested regions.

- [ ] **TASK-040 | P1 | R0 — Add expert-mask display.** Render expert regions separately when a valid optional mask is supplied.  
  **Done when:** The UI distinguishes prediction from reference and prevents a misaligned expert mask from being overlaid silently.

### 3.5 Volume, metrics, report and workflow states

- [ ] **TASK-041 | P0 | R0 — Implement physical volume calculation.** Use voxel count times voxel volume from the affine determinant or validated spacing.  
  **Done when:** The formula and numeric values are shown; the 20×20×20 label-2 cube at 1×1×2 mm reports WT 16.0 mL, TC 0 and ET 0.

- [ ] **TASK-042 | P0 | R0 — Implement Dice and sensitivity.** Compute per-region metrics against a valid expert mask.  
  **Done when:** Formula, empty-mask policy, reference status and per-region values are tested and visible; metrics are unavailable rather than fabricated when there is no reference.

- [ ] **TASK-043 | P0 | R0 — Run minimum held-out evaluation.** Evaluate at least 10 patient-separated labelled cases when permitted data is available.  
  **Done when:** Case split, preprocessing, model revision, per-region results, baseline comparison and known/unknown training overlap are documented.

- [ ] **TASK-044 | P1 | R0 — Add uncertainty prototype if time permits.** Compare supported TTA variants or an ensemble after core correctness.  
  **Done when:** Method and cost are recorded; outputs are labelled instability/uncertainty estimates, not guaranteed calibrated confidence.

- [ ] **TASK-045 | P0 | R0 — Build report generation.** Include run ID, timestamp, volumes, voxel values, model/configuration, input hashes, code commit, metrics where available, limitations and disclaimer.  
  **Done when:** Values in the report match the UI; unknown provenance is marked unknown/not recorded rather than invented.

- [ ] **TASK-046 | P0 | R0 — Implement explicit job states and safe retry.** Include validation, processing, post-processing, report, success and failure states.  
  **Done when:** Failure never reuses a previous case's result; partial output is not shown as success.

- [ ] **TASK-047 | P0 | R0 — Implement temporary storage and 24-hour cleanup.** Isolate artifacts per run and clean up originals, derivatives and failed jobs under challenge rules.  
  **Done when:** A test proves cleanup behavior; logs record status without logging voxel data or secrets.

- [ ] **TASK-048 | P0 | R0 — Add persistent research-only disclaimer.** Place disclaimer on every screen and in report.  
  **Done when:** User-facing text avoids diagnosis/replacement claims and uses “suspected tumour region predicted by the model” and “estimated volume.”

- [ ] **TASK-049 | P0 | R0 — Benchmark end-to-end runtime.** Measure upload/validation, preprocessing, inference, inverse mapping, mesh and report time on target-class hardware.  
  **Done when:** Evidence shows whether the case completes within two minutes on the organizer's T4-class GPU; bottlenecks and cold-start assumptions are stated.

- [ ] **TASK-050 | P0 | R0 — Prepare R0 launch and deliverables.** Add clean setup/start command, README, sample report and model card.  
  **Done when:** A fresh checkout follows the written setup, command/API creates a prediction, and the demo can be rehearsed from instructions.

### 3.6 R0 verification and release gate

- [ ] **TASK-051 | P0 | R0 Gate — Run the complete judge test suite.** Execute all required accuracy, volume, anisotropic spacing, orientation, crosshair, failure-pack, reproducibility and input-sanity tests.  
  **Done when:** Results are recorded per test, blockers are fixed or explicitly disclosed, and there is no claim that an unrun test passed.

- [ ] **TASK-052 | P0 | R0 Gate — Conduct end-to-end review.** A teammate other than the main author follows the documented workflow from clean start to report.  
  **Done when:** The reviewer can complete the flow, explain the label mapping, volume formula, model channel order, and limits without relying on hidden developer knowledge.

- [ ] **TASK-053 | P0 | R0 Gate — Freeze prototype scope.** Defer features that threaten core correctness.  
  **Done when:** P0 acceptance evidence is stored and all unsupported or future-only features are clearly labelled or disabled.

---

## 4. R1 — Single-lab research platform

**Entry condition:** R0 gate passed; a specific research group and permitted data/use case are identified. R1 is not clinical authorization.

### 4.1 Research workspace, identity and access

- [ ] **TASK-054 | P0 | R1 — Define the lab operating model.** Identify platform administrator, principal investigator/project owner, researcher, annotator/reviewer and read-only auditor responsibilities.  
  **Done when:** Responsibility matrix, onboarding/offboarding and escalation paths are approved by the lab.

- [ ] **TASK-055 | P0 | R1 — Implement authentication.** Choose institution-approved identity mechanism and secure session/token policy.  
  **Done when:** Unauthenticated access is denied to protected resources and account lifecycle is documented.

- [ ] **TASK-056 | P0 | R1 — Implement server-enforced RBAC.** Enforce role and project-scoped permissions in API and storage, not only UI.  
  **Done when:** Automated negative tests prove unauthorized users cannot read, modify, launch or export restricted cases/runs.

- [ ] **TASK-057 | P0 | R1 — Implement project workspaces.** Support research projects with scoped members, purpose, permitted dataset sources and configuration.  
  **Done when:** Projects are isolated across API, storage and searches; a project cannot discover another project's data by guessing identifiers.

- [ ] **TASK-058 | P0 | R1 — Implement export permissions.** Gate NIfTI, report, cohort table and manifest exports by role and project.  
  **Done when:** Export actions are authorized server-side and audited according to lab policy.

### 4.2 Case registry, provenance and retention

- [ ] **TASK-059 | P0 | R1 — Design research case registry.** Use pseudonymous research identifiers and avoid collecting patient identifiers without explicit governance.  
  **Done when:** Data model includes provenance, source/dataset version, permission basis, file checksums and project assignment.

- [ ] **TASK-060 | P0 | R1 — Implement dataset manifest.** Record dataset name/version, source, licence/data-use agreement, permitted purpose, inclusion/exclusion logic and import time.  
  **Done when:** Each case/run can trace back to an approved source and dataset version.

- [ ] **TASK-061 | P0 | R1 — Add configurable retention policy.** Move from fixed R0 challenge cleanup only after institutional policy is approved.  
  **Done when:** Retention is configured by deployment/project policy, visible to users, enforced by jobs and cleanup, and tested against backups/derivatives.

- [ ] **TASK-062 | P0 | R1 — Add complete deletion workflow.** Cover originals, intermediates, cached meshes, reports, exports, failed jobs and temporary downloads as applicable.  
  **Done when:** Deletion evidence is logged without retaining sensitive payloads; backup expiration is documented.

- [ ] **TASK-063 | P0 | R1 — Implement immutable run manifest.** Capture input checksums, model/checksum, code commit, dependency/environment revision, preprocessing, postprocessing, parameters and output hashes.  
  **Done when:** A run can be reconstructed or its non-reproducible elements explained from the manifest.

- [ ] **TASK-064 | P1 | R1 — Add provenance export/import.** Package the run manifest and permitted artefacts for transfer between approved research environments.  
  **Done when:** Import validates schema, checksums and permissions and never bypasses dataset licences or access controls.

### 4.3 Research operations and usability

- [ ] **TASK-065 | P1 | R1 — Add asynchronous job queue.** Isolate jobs, expose progress/stage/errors, limit concurrency and support controlled cancellation.  
  **Done when:** Jobs survive frontend refresh, use fair resource limits and never leak one run's outputs into another.

- [ ] **TASK-066 | P1 | R1 — Add run history and comparison.** Let authorized researchers compare runs across documented model/config revisions.  
  **Done when:** Differences in model, preprocessing, input checksums and outputs are visible; old outputs remain linked to their exact configuration.

- [ ] **TASK-067 | P1 | R1 — Add reviewer notes and annotation references.** Support comments without mutating original expert labels.  
  **Done when:** Notes have author, time, version and permission checks; original data and reference labels remain preserved.

- [ ] **TASK-068 | P1 | R1 — Conduct research-user workflow testing.** Test uploads, region navigation, volume interpretation, report retrieval and warning comprehension.  
  **Done when:** Protocol, participant permissions where applicable, observations, errors and resulting design actions are recorded.

### 4.4 Lab deployment and operations

- [ ] **TASK-069 | P0 | R1 — Create supported deployment package.** Provide pinned dependencies, container/deployment instructions where appropriate, configuration validation and health checks.  
  **Done when:** An approved lab administrator can install the platform using documented steps.

- [ ] **TASK-070 | P0 | R1 — Implement institution-approved encryption and secrets management.** Apply to transit, storage and backups according to threat model.  
  **Done when:** Configuration and test evidence demonstrate the approved controls; no secrets are committed.

- [ ] **TASK-071 | P0 | R1 — Implement audit events.** Record login/access/export/configuration/model/deletion events as appropriate, without image payload.  
  **Done when:** Audit access is restricted, retention is configured and tests verify important events are emitted.

- [ ] **TASK-072 | P0 | R1 — Add backup/restore and recovery runbook.** Include database/metadata, model registry, manifests and allowed outputs.  
  **Done when:** A restore exercise completes and recovery-point/recovery-time expectations are documented.

- [ ] **TASK-073 | P1 | R1 — Add operational monitoring.** Expose queue depth, stage durations, failure codes, resource use, storage usage and cleanup status without MRI content.  
  **Done when:** Alert ownership and response steps are documented and an operational dashboard does not expose restricted case data.

- [ ] **TASK-074 | P0 | R1 Gate — Complete lab-readiness review.** Review access control, data rights, retention, deletion, reproducibility, deployment, usability and recovery.  
  **Done when:** Lab owner/data steward approves the deployment scope and unresolved risks are explicitly accepted or block release.

---

## 5. R2 — Research operations and benchmarking

**Entry condition:** R1 is operating under an approved research governance model, and a predefined research question/evaluation plan exists.

### 5.1 Cohort and experiment governance

- [ ] **TASK-075 | P0 | R2 — Create versioned cohort manifests.** Record selection criteria, case IDs/pseudonyms, dataset version, exclusions and provenance.  
  **Done when:** A cohort cannot silently change after an experiment is launched; a new cohort version is created for changes.

- [ ] **TASK-076 | P0 | R2 — Implement patient-level split manifests.** Keep train/validation/test and external evaluation sets distinct.  
  **Done when:** Automated checks detect duplicate patients/leakage across splits where identifiers and permissions allow; the split manifest is immutable and versioned.

- [ ] **TASK-077 | P0 | R2 — Define analysis-plan records.** Record hypotheses, primary/secondary metrics, inclusion/exclusion criteria, missing-data handling and comparison methods before analysis.  
  **Done when:** Analysis configuration is versioned and deviations are recorded rather than silently applied.

- [ ] **TASK-078 | P1 | R2 — Implement batch inference.** Process authorized cohorts with per-case job status, bounded concurrency and resumable failures.  
  **Done when:** One failed case does not invalidate unrelated results; every case has its own provenance and error record.

- [ ] **TASK-079 | P1 | R2 — Implement experiment tracking.** Link each experiment to cohort, model, configuration, code, environment and output.  
  **Done when:** Result tables can be regenerated from immutable experiment metadata.

- [ ] **TASK-080 | P1 | R2 — Add model and configuration registry.** Store model identity, checksum, licence, input/output schema, evaluation evidence and status.  
  **Done when:** Runs refer to immutable model versions and deprecated/unapproved versions cannot be selected unintentionally.

### 5.2 Benchmarking and annotation quality

- [ ] **TASK-081 | P0 | R2 — Independently validate metric calculations.** Compare project Dice, sensitivity, volume and optional HD95 implementations against an independent tested implementation.  
  **Done when:** Edge cases and empty-mask behavior match the declared metric contract and discrepancies are resolved.

- [ ] **TASK-082 | P1 | R2 — Add per-case and aggregate result tables.** Include sample counts, failures/exclusions and aggregation policy.  
  **Done when:** Summaries do not hide failed, missing or excluded cases and the reporting script is reproducible.

- [ ] **TASK-083 | P1 | R2 — Add subgroup/site/scanner analyses where justified.** Predefine analyses and protect against overinterpretation of small subgroups.  
  **Done when:** Results report sample size and uncertainty/limitations; analyses are not presented as proof of generalization without adequate design.

- [ ] **TASK-084 | P1 | R2 — Version expert annotations.** Maintain source, annotator, revision, review state and adjudication links.  
  **Done when:** Original labels are immutable and all corrections/adjudications remain traceable.

- [ ] **TASK-085 | P1 | R2 — Add inter-rater agreement and adjudication workflow.** Define how multiple expert masks are compared and resolved for research use.  
  **Done when:** Protocol, metric methods and final reference selection are recorded for each relevant study.

- [ ] **TASK-086 | P1 | R2 — Add exportable research tables.** Export allowed summaries and per-case results without unnecessary identifiers.  
  **Done when:** Export contains cohort/run versions, metric definitions, exclusions, missingness and provenance; permissions and audit rules apply.

- [ ] **TASK-087 | P0 | R2 Gate — Verify experiment reproducibility.** Independently rerun a selected experiment from its frozen manifest.  
  **Done when:** Differences are within declared deterministic/numerical expectations or explained; leakage and analysis deviations are documented.

---

## 6. R3 — Multi-site research and interoperability

**Entry condition:** A specific research question, collaborating institutions, permitted data flow and site-level approval plan are defined. DICOM/PACS capabilities remain disabled outside a controlled test environment until approved.

### 6.1 Multi-site governance and external validation

- [ ] **TASK-088 | P0 | R3 — Create a site participation and data-flow plan.** Define each site's roles, dataset rights, processing location, permitted transfers, retention and outputs.  
  **Done when:** Each participating site approves the specific data flow and responsibilities are written down.

- [ ] **TASK-089 | P0 | R3 — Predefine external validation protocol.** Specify inclusion/exclusion, scanner/protocol coverage, endpoints, metrics, missingness, sample-size rationale and analysis before looking at final results.  
  **Done when:** Protocol and model/configuration freeze are recorded; external cases are not used for tuning.

- [ ] **TASK-090 | P0 | R3 — Generate site-level validation reports.** Report overall and per-site performance, failures, domain shift and uncertainty where available.  
  **Done when:** Limitations and site differences are explicit and no unsupported universal-performance claim is made.

- [ ] **TASK-091 | P1 | R3 — Evaluate local processing versus central analysis.** Compare architectures where approved, including data that remains in the institution and only approved outputs leaving the site.  
  **Done when:** Threat model covers images, metadata, logs, metrics, updates and exports; decision is reviewed by participating sites.

### 6.2 DICOM and institutional integration

- [ ] **TASK-092 | P0 | R3 — Define supported DICOM profile.** Identify supported modalities, SOP classes, transfer syntaxes, series selection and conversion rules.  
  **Done when:** A versioned profile and explicit unsupported cases are documented before implementation.

- [ ] **TASK-093 | P0 | R3 — Implement DICOM-to-volume conversion in a test harness.** Validate orientation, spacing, rescale, frame-of-reference, study/series consistency and ordering.  
  **Done when:** Approved test fixtures produce documented expected geometry and fail safely when metadata are inconsistent.

- [ ] **TASK-094 | P0 | R3 — Assess de-identification workflow.** Address standard/private tags, overlays and burned-in pixel annotations.  
  **Done when:** A reviewed procedure and tests exist; the product does not claim de-identification solely because common tags were removed.

- [ ] **TASK-095 | P1 | R3 — Explore DICOMweb/PACS connectivity in a sandbox.** Use approved test systems and least-privilege credentials.  
  **Done when:** Data-flow, authentication, network boundaries, audit, retries and export destination are reviewed; no production PACS is connected by default.

- [ ] **TASK-096 | P2 | R3 — Assess FHIR metadata exchange if needed.** Define only the metadata use cases the institution requires.  
  **Done when:** Scope, data mapping, permissions and conformance tests are approved before building an integration.

- [ ] **TASK-097 | P0 | R3 — Implement site-specific configuration and isolation.** Keep tenant/site policies, storage and credentials isolated.  
  **Done when:** Automated tests show one site cannot access another site's unauthorized data or outputs.

- [ ] **TASK-098 | P0 | R3 Gate — Complete site security/conformance review.** Review data agreements, DICOM profile, geometry tests, external evaluation and incident ownership.  
  **Done when:** Every participating institution has approved the exact pilot scope and unresolved issues block only the affected use.

---

## 7. R4 — Investigational clinical workflow (future-gated)

**Entry condition:** A justified clinical research question and target use have been proposed; no real-patient data or clinical workflow may be introduced until the required approvals and regulatory determination are complete. These tasks are planning tasks until the gate is passed.

### 7.1 Study definition and approvals

- [ ] **TASK-099 | GATED | R4 — Draft a precise investigational intended-use statement.** Specify intended user, target population, setting, input, output, role in workflow, exclusions and whether outputs could influence care.  
  **Done when:** Clinical, research, legal/privacy and regulatory stakeholders review the statement; ambiguity is resolved before study setup.

- [ ] **TASK-100 | GATED | R4 — Obtain jurisdiction-specific regulatory determination.** Assess the potential software's status and study pathway with qualified specialists.  
  **Done when:** Written determination identifies applicable requirements, responsible organization and required actions; no classification is guessed from the disclaimer.

- [ ] **TASK-101 | GATED | R4 — Obtain institutional ethics and data permissions.** Determine EC/IRB/IEC requirements, protocol approval, consent/waiver and data-use permissions.  
  **Done when:** Required written approvals are in place before the relevant study activity or real-patient data processing.

- [ ] **TASK-102 | GATED | R4 — Define study protocol and statistical analysis plan.** Specify endpoints, reference standard, cohort, sample-size rationale, exclusions, missingness, failure handling and stop criteria.  
  **Done when:** Protocol is approved and the model/configuration and analysis plan are locked as required.

- [ ] **TASK-103 | GATED | R4 — Assign clinical study responsibilities.** Name investigator, statistician, data steward, model/software owner, incident contact and independent reviewers.  
  **Done when:** Roles, training, escalation and decision rights are documented.

### 7.2 Risk, software controls and study conduct

- [ ] **TASK-104 | GATED | R4 — Create study-specific hazard analysis and risk controls.** Identify hazards from wrong segmentation, wrong side, delayed output, misleading volume, over-reliance and system failure.  
  **Done when:** Hazards map to requirements, controls, verification evidence, residual risks and responsible approvers.

- [ ] **TASK-105 | GATED | R4 — Freeze the study model and pipeline.** Lock weights, preprocessing, thresholds, label mapping, report logic and deployment package.  
  **Done when:** Model/config hashes are recorded and changes trigger the study's change-control process.

- [ ] **TASK-106 | GATED | R4 — Design safe silent-mode or observational workflow if appropriate.** Ensure research outputs cannot influence care beyond the approved protocol.  
  **Done when:** Access, display, output routing and user instructions enforce the approved study design; standard care/fallback remains defined.

- [ ] **TASK-107 | GATED | R4 — Validate study access and audit.** Restrict access to authorized study personnel and capture required events.  
  **Done when:** Access tests, audit review and retention procedures satisfy the study plan and institutional requirements.

- [ ] **TASK-108 | GATED | R4 — Establish incident and protocol-deviation handling.** Define severity, reporting route, containment, data preservation and pause/stop criteria.  
  **Done when:** Team rehearses a simulated software failure and records corrective actions.

- [ ] **TASK-109 | GATED | R4 — Execute protocol-specific technical and usability validation.** Test intended environments, users, image variants and known failure modes.  
  **Done when:** Results satisfy predefined criteria or the study documents failure/limitations; no post-hoc threshold changes conceal a missed endpoint.

- [ ] **TASK-110 | GATED | R4 Gate — Approve study activation.** Check every required approval, risk control, model freeze, monitoring procedure and training record.  
  **Done when:** Accountable institutional and regulatory stakeholders authorize activation in writing; otherwise R4 remains blocked.

---

## 8. R5 — Potential regulated clinical product (future-gated)

**Entry condition:** The organization has decided there is a justified clinical product opportunity and obtained expert advice on intended use, regulatory route and required evidence. This stage is not implied by research success.

### 8.1 Quality and product lifecycle

- [ ] **TASK-111 | GATED | R5 — Define controlled software lifecycle processes.** Establish requirements management, risk-based verification, configuration management, supplier/dependency controls and release review.  
  **Done when:** Processes and required records are owned, version-controlled and audited against the applicable quality plan.

- [ ] **TASK-112 | GATED | R5 — Establish formal requirements traceability.** Link intended use and risks to requirements, design, tests, defects and releases.  
  **Done when:** Every safety-relevant requirement and control has reviewable verification evidence and unresolved gaps are tracked.

- [ ] **TASK-113 | GATED | R5 — Develop risk-management file.** Use an applicable, qualified risk-management process.  
  **Done when:** Hazards, hazardous situations, harms, controls, verification, residual risks and benefit-risk decisions are documented by accountable owners.

- [ ] **TASK-114 | GATED | R5 — Assess quality-system and standards applicability.** Obtain qualified guidance on relevant current editions/adoptions of ISO 13485, ISO 14971, IEC 62304, IEC 62366-1 and other applicable requirements.  
  **Done when:** An applicability/conformance plan exists; the repository does not claim certification or compliance without evidence.

### 8.2 Clinical evidence and usability

- [ ] **TASK-115 | GATED | R5 — Build a clinical evidence plan.** Distinguish scientific validity, technical/analytical validation, clinical validation and clinical utility claims.  
  **Done when:** Each proposed product claim maps to specific evidence, population, endpoints, acceptance criteria and review owners.

- [ ] **TASK-116 | GATED | R5 — Conduct independent clinical performance evaluation as required.** Use a protocol and reference standard appropriate to the intended use.  
  **Done when:** Evidence is independently reviewed and limitations/failed cases are included in the final analysis.

- [ ] **TASK-117 | GATED | R5 — Perform human-factors/usability engineering.** Test representative intended users, foreseeable use errors, warnings, workflow and training.  
  **Done when:** Safety-relevant use errors are assessed and controls are verified; usability is not inferred from a hackathon demo.

- [ ] **TASK-118 | GATED | R5 — Establish clinical workflow fallback.** Define behavior for failed inference, out-of-distribution inputs, low-quality data, mismatched sequences and unavailable service.  
  **Done when:** Fallback is approved for the specific workflow and tested under realistic failure scenarios.

### 8.3 Cybersecurity, deployment and release

- [ ] **TASK-119 | GATED | R5 — Create threat model and security programme.** Include upload parsing, tenant isolation, identity, export, model artefacts, updates, telemetry and external integrations.  
  **Done when:** Threats, controls, residual risks, vulnerability handling and update responsibilities are documented and tested.

- [ ] **TASK-120 | GATED | R5 — Implement controlled release and rollback.** Version code, weights, preprocessing, thresholds, schema and documentation as a coherent release unit.  
  **Done when:** Deployment can identify the active version, rollback to a verified version and preserve run provenance.

- [ ] **TASK-121 | GATED | R5 — Define post-release monitoring and incident response.** Track permitted operational/performance signals, complaints, failures and model/data drift where lawful and appropriate.  
  **Done when:** Each signal has a reviewer, threshold/trigger, action, escalation path and record retention policy.

- [ ] **TASK-122 | GATED | R5 — Obtain required regulatory authorizations before clinical release.** Build submission and evidence packages based on qualified jurisdiction-specific advice.  
  **Done when:** Required authorization/licensing status is confirmed in written release records; no clinical distribution/use occurs before this gate.

- [ ] **TASK-123 | GATED | R5 Gate — Approve intended-use-specific release.** Review evidence, labeling, risk, security, support, training, backup/recovery and post-release commitments.  
  **Done when:** Authorized accountable personnel sign off on the exact product version, deployment and intended use.

---

## 9. Cross-cutting tasks for every stage

These tasks should be instantiated at the level appropriate to each stage; the controls must mature as users, data sensitivity and possible consequences increase.

### 9.1 Security and privacy

- [ ] **TASK-124 | P0 | All stages — Threat-model file and image processing.** Include decompression bombs, malformed headers, oversized arrays, path traversal, symlink abuse, memory/CPU exhaustion and malicious filenames.  
  **Done when:** Limits are enforced and adversarial fixtures test the controls.

- [ ] **TASK-125 | P0 | All stages — Keep MRI content out of external services.** Verify logs, crash reports, analytics, LLM tools and frontend assets do not transmit scan content without an approved future-stage data-flow plan.  
  **Done when:** Data-flow review and a controlled network test support the claim.

- [ ] **TASK-126 | P1 | R1+ — Add dependency and image scanning.** Include pinned dependencies, vulnerability response and SBOM as maturity requires.  
  **Done when:** Findings have owners and release-blocking thresholds; accepted exceptions are documented.

- [ ] **TASK-127 | P0 | R1+ — Test authorization at the API boundary.** Verify every case/run/model/export request checks the caller's permissions.  
  **Done when:** Negative tests cover identifier guessing, role escalation and cross-project/tenant access.

- [ ] **TASK-128 | P1 | R1+ — Define incident response and breach escalation.** Align with the institution and deployment context.  
  **Done when:** Contacts, containment, evidence preservation, notification decision ownership and practice exercise are documented.

### 9.2 Model and data scientific integrity

- [ ] **TASK-129 | P0 | All stages — Maintain model card.** Record model identity, revision, licence, training data, input contract, preprocessing, output labels, evaluation and limitations.  
  **Done when:** Model card matches the artefact in the active release and contains no unverified performance claim.

- [ ] **TASK-130 | P0 | All stages — Maintain dataset register.** Record sources, version, licence/DUA, permissions, data transformation and allowed purposes.  
  **Done when:** Every dataset used for training, tuning, evaluation or examples has a documented provenance and permission basis.

- [ ] **TASK-131 | P0 | All stages — Prevent evaluation leakage.** Separate data by patient and govern hidden/external cases.  
  **Done when:** Split integrity is checked where possible and all known/unknown overlap is disclosed.

- [ ] **TASK-132 | P1 | R2+ — Create a model-change impact process.** Trigger review for changes to model weights, threshold, preprocessing, post-processing, output mapping, dependency or supported inputs.  
  **Done when:** Each change receives a documented regression, revalidation, and (if needed) governance/regulatory impact decision.

- [ ] **TASK-133 | P1 | R2+ — Add failure analysis, not only aggregate scores.** Inspect false positives/negatives, region-wise errors, spatial boundary failures and exclusions.  
  **Done when:** Reports include failures and missing cases; only successful demos are not presented as typical performance.

### 9.3 Documentation and support

- [ ] **TASK-134 | P0 | All stages — Keep README aligned with actual behavior.** Document supported data, setup, model, licence, limits and commands.  
  **Done when:** Instructions are validated on a clean environment and do not claim unsupported capabilities.

- [ ] **TASK-135 | P1 | R1+ — Create administrator operations guide.** Include deployment, access management, retention, backups, restore, updates, monitoring and incidents.  
  **Done when:** An administrator who did not develop the software can complete a tested routine operation.

- [ ] **TASK-136 | P1 | R1+ — Create user guide and onboarding.** Explain accepted inputs, region semantics, measurements, warnings, limitations and report export.  
  **Done when:** Representative users can complete defined tasks and correctly interpret units and warnings during usability evaluation.

- [ ] **TASK-137 | P0 | All stages — Maintain release notes.** Record added/removed features, bug fixes, model/config changes, migrations, known issues and stage/claim changes.  
  **Done when:** Every tag/release has a corresponding note and linked verification evidence.

---

## 10. Research programme tasks

These tasks define a credible route from technical functionality to research evidence. They require their own protocols and approvals where applicable.

- [ ] **TASK-138 | P1 | R1/R2 — Define a research usability protocol.** Specify research question, intended participants, task scenarios and measures such as completion, errors, time and interpretation of warnings.  
  **Done when:** Required institutional review/ethics determination is obtained before recruiting or collecting research data; findings are reported with limitations.

- [ ] **TASK-139 | P0 | R2 — Establish a benchmark protocol.** Predefine cases/splits, model versions, metrics, empty-mask policy, aggregation and baseline comparison.  
  **Done when:** The same protocol can be rerun and independently checked.

- [ ] **TASK-140 | P0 | R2/R3 — Plan external validation.** Identify independent cohorts/sites and data permission pathway.  
  **Done when:** Evaluation cases are not used for training/tuning and site/scanner/protocol coverage is documented.

- [ ] **TASK-141 | P1 | R2/R3 — Document reference annotation quality.** Define annotator qualifications where applicable, labelling protocol, adjudication and inter-rater analysis.  
  **Done when:** The evaluation report describes the reference process and its limitations.

- [ ] **TASK-142 | P1 | R2/R3 — Report performance heterogeneity and failure modes.** Examine differences by site, scanner, protocol and supported-data condition as justified by sample size.  
  **Done when:** Conclusions are bounded by evidence and small subgroup results are not overstated.

- [ ] **TASK-143 | GATED | R4 — Prepare clinical study evidence plan.** Define scientific validity, technical performance, clinical performance, workflow endpoints and statistical analysis for the specific intended use.  
  **Done when:** Qualified clinical/statistical/regulatory stakeholders approve the plan before study activation.

- [ ] **TASK-144 | GATED | R5 — Prepare claim-evidence matrix.** Map each proposed product claim to evidence, labeling and authorization.  
  **Done when:** Unsupported claims are removed and product communications match the authorized intended use.

---

## 11. Product experience and accessibility tasks

- [ ] **TASK-145 | P0 | R0 — Design clear upload, processing, viewer and report screens.** Maintain the research-only disclaimer throughout.  
  **Done when:** Each screen has a coherent purpose, clear loading/error/success states and no ambiguous claim of certainty.

- [ ] **TASK-146 | P0 | R0 — Make nested-region semantics clear.** Explain that ET is included in TC and WT, and TC is included in WT; labels are not three mutually exclusive classes.  
  **Done when:** UI legend, volume panel and report use consistent definitions.

- [ ] **TASK-147 | P0 | R0 — Ensure prediction/reference/uncertainty are distinguishable.** Use labels and legends as well as colour.  
  **Done when:** Users can tell which source each overlay represents and understand that uncertainty is not proof of error or correctness.

- [ ] **TASK-148 | P1 | R1+ — Add responsive, keyboard-accessible controls.** Provide meaningful labels, visible focus and keyboard interaction for critical navigation.  
  **Done when:** Accessibility checks are documented and representative users can operate essential controls.

- [ ] **TASK-149 | P1 | R1+ — Validate research-user comprehension.** Test whether users understand voxel spacing, mL, Dice, sensitivity, model limitations and data retention.  
  **Done when:** Misinterpretations are captured and corrected before broader rollout.

- [ ] **TASK-150 | P1 | R2+ — Add report templates for research workflows.** Support configurable summaries without allowing templates to hide failures or alter metric definitions.  
  **Done when:** Template/config version is included in report provenance and outputs can be reproduced.

---

## 12. Architecture and technical debt tasks

- [ ] **TASK-151 | P0 | R0 — Separate validation, imaging, inference, segmentation, geometry, metrics, reporting, storage and API modules.**  
  **Done when:** Each responsibility can be tested independently and the CLI/API share the same inference pipeline.

- [ ] **TASK-152 | P1 | R1 — Define stable versioned API contracts.** Use schema validation and structured error codes.  
  **Done when:** Request/response schemas and error semantics are documented; breaking changes are versioned and tested.

- [ ] **TASK-153 | P1 | R1 — Add database migrations and integrity constraints if persistence is introduced.**  
  **Done when:** Migration, rollback/restore and referential-integrity behavior have automated tests; the database remains optional until a real need is confirmed.

- [ ] **TASK-154 | P1 | R1+ — Make background jobs resilient.** Handle restart, retry policy, duplicate submission, cancellation, timeout and orphan cleanup.  
  **Done when:** Failure-injection tests prove jobs cannot silently lose or misassociate outputs.

- [ ] **TASK-155 | P1 | R2+ — Build reproducible analysis/export packages.** Include approved data references, run manifests, metric scripts and environment/configuration manifests, not forbidden dataset copies.  
  **Done when:** Another authorized researcher can reproduce the analysis within documented constraints.

- [ ] **TASK-156 | P2 | R3 — Assess federated or site-local execution only if justified.** Evaluate risks from images, metadata, logs, metrics, model updates and gradients.  
  **Done when:** Threat model, governance, technical proof and site approval exist before describing the system as federated or privacy-preserving.

---

## 13. Release checklist templates

Copy the relevant checklist into a release record. A checkbox is not a substitute for a linked test report, approval or evidence artefact.

### 13.1 R0 release checklist

- [ ] Four required MRI sequences validate and map correctly.
- [ ] Invalid, malformed, incomplete and unsupported inputs fail clearly without a result.
- [ ] Model/version/licence/channel order/preprocessing are recorded.
- [ ] BraTS output semantics and component label conversion are verified.
- [ ] Output NIfTI shape and affine match the required reference grid.
- [ ] Orientation, anisotropic spacing, crosshair and mesh geometry tests pass.
- [ ] WT/TC/ET nesting and physical-volume calculations pass fixtures.
- [ ] Held-out evaluation protocol/results are recorded; unknown data overlap is disclosed.
- [ ] Reproducibility and T4-class runtime are measured.
- [ ] Report contains volumes, provenance, limitations and disclaimer.
- [ ] Challenge data restrictions and 24-hour cleanup are tested.
- [ ] Clean setup/start and prediction commands are documented.
- [ ] No unsupported clinical-use, diagnostic, regulatory or performance claim is present.

### 13.2 R1 research-lab release checklist

- [ ] Data sources, licences/agreements and research purpose are approved.
- [ ] Authentication, server-side project/role authorization and export controls pass tests.
- [ ] Project/tenant isolation is verified.
- [ ] Retention, deletion, backups and restore match approved lab policy.
- [ ] Reproducible run manifests and model registry are operational.
- [ ] Audit events and operational monitoring are configured without scan content leakage.
- [ ] Research users have completed workflow/usability evaluation.
- [ ] Deployment, support, incident, update and recovery runbooks are reviewed.
- [ ] Data steward and accountable lab owner approve the exact release scope.

### 13.3 R2 research-operations release checklist

- [ ] Versioned cohort and split manifests exist.
- [ ] Patient-level leakage checks and data lineage are reviewed.
- [ ] Evaluation plan and metric policies are frozen before analysis.
- [ ] Batch failures and exclusions are fully represented in outputs.
- [ ] Independent metric verification and rerun evidence are stored.
- [ ] Annotation revisions and adjudications are traceable.
- [ ] Aggregate results do not hide missingness, per-case failures or heterogeneity.

### 13.4 R3 multi-site research checklist

- [ ] Each site's data flow, permission basis, contacts and retention policy are approved.
- [ ] External validation protocol and frozen model/configuration exist.
- [ ] Site/scanner/protocol coverage and limitations are documented.
- [ ] DICOM conformance profile and geometry/reference-fixture tests pass if DICOM is used.
- [ ] De-identification assessment covers metadata and pixel-burned identifiers.
- [ ] Network/PACS integrations remain sandboxed until separately approved.
- [ ] Security review and site-level access isolation pass.

### 13.5 R4 investigational-study checklist — blocked until approved

- [ ] Specific intended use and target population are written.
- [ ] Qualified regulatory determination is documented.
- [ ] Required ethics, study, consent/waiver and data approvals are in place.
- [ ] Study protocol, analysis plan and success/failure criteria are approved.
- [ ] Model and pipeline are locked and hashed.
- [ ] Hazard analysis, risk controls, fallback, audit and incident procedures are verified.
- [ ] Intended investigators/users are trained and access controlled.
- [ ] Written activation approval is recorded.

### 13.6 R5 potential clinical product checklist — blocked until authorized

- [ ] Intended-use-specific regulatory route and required authorizations are confirmed.
- [ ] Quality and software lifecycle processes are operating.
- [ ] Risk file and traceability from hazards to requirements/tests/controls are complete.
- [ ] Technical and clinical evidence supports the exact claims and population.
- [ ] Human-factors/usability and cybersecurity evidence is reviewed.
- [ ] Model/data/software changes are governed and rollback is tested.
- [ ] Production support, monitoring, complaints/incidents and post-release obligations are assigned.
- [ ] Labeling, training, instructions and deployment match the authorized intended use.
- [ ] Release sign-off is given by accountable qualified personnel.

---

## 14. First tasks to execute now

The project should not start by building every future feature. Begin with the highest-risk assumptions and end-to-end correctness. Assign owners and dates in the repository after confirming team capacity.

1. [ ] Complete **TASK-008 to TASK-013**: verify the exact starter kit, output semantics, permitted data, compute, viewer and deployment path.
2. [ ] Complete **TASK-014 to TASK-019**: make the runtime and inference entry point reproducible.
3. [ ] Complete **TASK-020 to TASK-026**: implement and test robust input validation.
4. [ ] Complete **TASK-027 to TASK-033**: prove preprocessing, model inference, output mapping and reproducibility.
5. [ ] Complete **TASK-034 to TASK-040**: prove geometry and linked views.
6. [ ] Complete **TASK-041 to TASK-050**: prove volumes, metrics, report, cleanup and runtime.
7. [ ] Run **TASK-051 to TASK-053** before expanding the scope.
8. [ ] Start R1 only after a real research group, data permissions and institution-approved deployment model are identified.

**Priority warning:** The WT/TC/ET-versus-NCR/ED/ET output contract and physical orientation/affine correctness are high-risk dependencies. Resolve these before investing heavily in visual polish or future-stage integrations.

---

## 15. Blockers and decisions register

Update this table as decisions are made. Do not replace `TBD` with a guess.

| ID | Decision / blocker | Why it matters | Owner | Status | Evidence / decision link |
|---|---|---|---|---|---|
| D-001 | Exact starter-kit model bundle and revision | Determines preprocessing and output semantics | TBD | Open | TBD |
| D-002 | Whether model output includes component labels or only nested regions | Critical to scorer-compatible label map | TBD | Open | TBD |
| D-003 | Dataset subset, scorer and permitted fine-tuning data | Evaluation feasibility and leakage control | TBD | Open | TBD |
| D-004 | Available GPU, VRAM and deployment environment | Runtime, memory and model choice | TBD | Open | TBD |
| D-005 | Viewer choice and geometry proof | Orientation and crosshair correctness | TBD | Open | TBD |
| D-006 | R0 hosting and temporary storage design | Data-flow and 24-hour cleanup requirements | TBD | Open | TBD |
| D-007 | Evaluation overlap with model training data | Scientific transparency | TBD | Open | TBD |
| D-008 | Research-lab pilot institution and purpose | Required for R1 scope and governance | TBD | Not yet applicable / Open | TBD |
| D-009 | Institutional data owner, retention and access policies | R1 deployment prerequisites | TBD | Not yet applicable / Open | TBD |
| D-010 | Any proposed clinical intended use and jurisdiction | R4/R5 route cannot be determined without it | TBD | Future-gated | TBD |

---

## 16. Evidence and artefact index

Maintain links to the following as they become available. Keep sensitive datasets and hidden judge materials out of the repository.

| Artefact | Expected location (suggested) | Required by |
|---|---|---|
| Architecture decision records | `docs/decisions/` | All stages |
| Risk register | `docs/risk-register.md` | All stages; expanded R4/R5 |
| Test reports | `artifacts/test-reports/` or CI | R0 onward |
| Runtime benchmark | `docs/benchmarks/` | R0 onward |
| Dataset register | `docs/datasets/` | R0 onward |
| Model card | `MODEL_CARD.md` | R0 onward, revised per model version |
| Evaluation protocol/results | `docs/evaluation/` | R0/R2/R3 |
| Sample report | `reports/sample_report.pdf` | R0 onward where applicable |
| Deployment runbook | `docs/operations/` | R1 onward |
| Backup/restore evidence | `docs/operations/recovery.md` | R1 onward |
| Data-flow and threat model | `docs/security/` | R1 onward; reviewed at each stage |
| DICOM conformance profile | `docs/interoperability/` | R3 if DICOM scope is approved |
| Ethics/data approvals register | Controlled institutional location | R4 and any research requiring it |
| Risk/clinical evidence and authorization records | Controlled quality/regulatory system | R4/R5 |

The location examples are suggestions. Do not place confidential approvals, patient-level records or sensitive data in a public repository.

---

## 17. Task completion and release reporting

At each sprint/review, report:

1. **Completed:** task IDs and links to implementation/tests/evidence.
2. **In progress:** task IDs, owner, next verifiable output and expected dependency.
3. **Blocked:** task IDs, blocker, decision owner and what will unblock it.
4. **Quality:** test pass/fail summary, runtime, known defects and unresolved risks.
5. **Stage readiness:** which gate is being targeted and which evidence is still missing.
6. **Scope changes:** newly requested features and whether they defer any P0 requirement.

A percentage-complete estimate must not replace gate evidence. A release can be blocked even if most tasks are checked when a safety, geometry, data-rights or validation prerequisite remains open.

---

## 18. Final operating principle

**Deliver the smallest correct stage, prove it with evidence, and only then expand the product's scope.**

NeuroScope 3D should grow through validated increments: a correct R0 demonstrator, a governed R1 research platform, reproducible R2 research operations, independently assessed R3 multi-site evidence, and only then any approved R4/R5 investigation or clinical product work. Future ambition is part of the plan; future permissions and capabilities are not assumed.
