// NeuroScope 3D Frontend Client Application
const API_BASE = window.location.origin;

let currentRunId = null;
let currentStudyData = null;
let currentDimensions = [240, 240, 155];

// DOM Elements
const modelStatusBadge = document.getElementById("modelStatusBadge");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const provBundle = document.getElementById("provBundle");
const provArch = document.getElementById("provArch");
const provHash = document.getElementById("provHash");
const provDevice = document.getElementById("provDevice");
const refreshStatusBtn = document.getElementById("refreshStatusBtn");

const tabBrats = document.getElementById("tabBrats");
const tabMsd = document.getElementById("tabMsd");
const formBrats = document.getElementById("formBrats");
const formMsd = document.getElementById("formMsd");
const validationResult = document.getElementById("validationResult");

const inferenceSection = document.getElementById("inferenceSection");
const runInferenceBtn = document.getElementById("runInferenceBtn");
const inferBtnText = document.getElementById("inferBtnText");
const inferenceProgress = document.getElementById("inferenceProgress");
const inferenceError = document.getElementById("inferenceError");

const viewerSection = document.getElementById("viewerSection");
const selectAxis = document.getElementById("selectAxis");
const selectModality = document.getElementById("selectModality");
const checkOverlay = document.getElementById("checkOverlay");
const sliderAlpha = document.getElementById("sliderAlpha");
const sliceSlider = document.getElementById("sliceSlider");
const sliceImg = document.getElementById("sliceImg");
const sliceIdxLabel = document.getElementById("sliceIdxLabel");
const sliceMaxLabel = document.getElementById("sliceMaxLabel");

const resultsSection = document.getElementById("resultsSection");
const volumetricsTable = document.getElementById("volumetricsTable").querySelector("tbody");
const metricsTable = document.getElementById("metricsTable").querySelector("tbody");
const metricsContainer = document.getElementById("metricsContainer");
const downloadNiftiBtn = document.getElementById("downloadNiftiBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

// 1. Fetch & Display Model Status
async function checkModelStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const model = data.model;

    if (model.ready_for_inference) {
      statusDot.className = "status-dot dot-online";
      statusText.textContent = `Model Ready (${model.device.toUpperCase()})`;
    } else {
      statusDot.className = "status-dot dot-offline";
      statusText.textContent = "Model Checkpoint Missing";
    }

    provBundle.textContent = `${model.bundle_name} v${model.bundle_version}`;
    provArch.textContent = `${model.architecture} (4 in -> 3 out)`;
    provHash.textContent = model.checkpoint_sha256 ? model.checkpoint_sha256 : "Not Available";
    provDevice.textContent = model.device.toUpperCase();
  } catch (err) {
    statusDot.className = "status-dot dot-offline";
    statusText.textContent = "Backend Offline";
    provBundle.textContent = "Cannot connect to backend API";
  }
}

refreshStatusBtn.addEventListener("click", checkModelStatus);

// 2. Tab Switching (BraTS vs MSD 4D)
tabBrats.addEventListener("click", () => {
  tabBrats.classList.add("active");
  tabMsd.classList.remove("active");
  formBrats.classList.remove("hidden");
  formMsd.classList.add("hidden");
});

tabMsd.addEventListener("click", () => {
  tabMsd.classList.add("active");
  tabBrats.classList.remove("active");
  formMsd.classList.remove("hidden");
  formBrats.classList.add("hidden");
});

// 3. BraTS 4-file Form Submission
formBrats.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("validateBratsBtn");
  btn.disabled = true;
  btn.textContent = "Validating...";
  validationResult.classList.add("hidden");

  const formData = new FormData();
  formData.append("t1", document.getElementById("fileT1").files[0]);
  formData.append("t1gd", document.getElementById("fileT1gd").files[0]);
  formData.append("t2", document.getElementById("fileT2").files[0]);
  formData.append("flair", document.getElementById("fileFlair").files[0]);
  const expert = document.getElementById("fileExpertBrats").files[0];
  if (expert) formData.append("expert_mask", expert);
  formData.append("dataset_profile", "brats");

  try {
    const res = await fetch(`${API_BASE}/api/v1/validate`, {
      method: "POST",
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.detail?.message || result.detail || "Validation failed");
    }
    handleValidationSuccess(result);
  } catch (err) {
    handleValidationError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Validate Study Set";
  }
});

// 4. MSD 4D Form Submission
formMsd.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("validateMsdBtn");
  btn.disabled = true;
  btn.textContent = "Unpacking & Validating...";
  validationResult.classList.add("hidden");

  const formData = new FormData();
  formData.append("msd_volume", document.getElementById("fileMsd4d").files[0]);
  const expert = document.getElementById("fileExpertMsd").files[0];
  if (expert) formData.append("expert_mask", expert);

  try {
    const res = await fetch(`${API_BASE}/api/v1/validate_msd`, {
      method: "POST",
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.detail?.message || result.detail || "MSD validation failed");
    }
    handleValidationSuccess(result);
  } catch (err) {
    handleValidationError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Unpack & Validate MSD Volume";
  }
});

function handleValidationSuccess(result) {
  currentRunId = result.run_id;
  currentDimensions = result.dimensions || [240, 240, 155];

  validationResult.innerHTML = `
    <strong>Validation Successful:</strong> Run ID: <span class="mono">${result.run_id}</span><br>
    Profile: <strong>${result.dataset_profile.toUpperCase()}</strong> |
    Dimensions: <strong>${currentDimensions.join(" × ")}</strong> |
    Voxel Spacing: <strong>${result.voxel_spacing ? result.voxel_spacing.join(" × ") + " mm" : "1.0 mm"}</strong> |
    Skull-Stripped: <strong>${result.is_skull_stripped ? "Yes (Detected)" : "No (Warning)"}</strong><br>
    SHA-256 Provenance: <span class="mono">${result.hash.slice(0, 24)}...</span>
  `;
  validationResult.className = "result-box";
  validationResult.classList.remove("hidden");

  // Show inference section
  inferenceSection.classList.remove("hidden");
  runInferenceBtn.disabled = false;
  inferBtnText.textContent = "Run Tumor Segmentation";
  inferenceError.classList.add("hidden");
}

function handleValidationError(msg) {
  validationResult.innerHTML = `<strong>Validation Error:</strong> ${msg}`;
  validationResult.className = "result-box alert-danger";
  validationResult.classList.remove("hidden");
  inferenceSection.classList.add("hidden");
}

// 5. Execute Model Inference
runInferenceBtn.addEventListener("click", async () => {
  if (!currentRunId) return;

  runInferenceBtn.disabled = true;
  inferBtnText.textContent = "Processing Inference...";
  inferenceProgress.classList.remove("hidden");
  inferenceError.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/api/v1/segment/${currentRunId}`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail?.message || data.detail || "Inference failed");
    }

    // Inference complete!
    inferenceProgress.classList.add("hidden");
    inferBtnText.textContent = "Inference Completed";

    // Setup Results & Viewer
    setupViewer();
    displayResults(data);
  } catch (err) {
    inferenceProgress.classList.add("hidden");
    runInferenceBtn.disabled = false;
    inferBtnText.textContent = "Retry Segmentation";
    inferenceError.textContent = `Inference Failed: ${err.message}`;
    inferenceError.classList.remove("hidden");
  }
});

// 6. Slice Viewer Configuration
function setupViewer() {
  viewerSection.classList.remove("hidden");
  updateSliderLimits();
  updateSlice();
}

function updateSliderLimits() {
  const axis = parseInt(selectAxis.value, 10);
  const maxIdx = currentDimensions[axis] - 1;
  sliceSlider.max = maxIdx;
  sliceSlider.value = Math.floor(maxIdx / 2);
  sliceMaxLabel.textContent = maxIdx;
  sliceIdxLabel.textContent = sliceSlider.value;
}

selectAxis.addEventListener("change", () => {
  updateSliderLimits();
  updateSlice();
});

selectModality.addEventListener("change", updateSlice);
checkOverlay.addEventListener("change", updateSlice);
sliderAlpha.addEventListener("input", updateSlice);
sliceSlider.addEventListener("input", () => {
  sliceIdxLabel.textContent = sliceSlider.value;
  updateSlice();
});

function updateSlice() {
  if (!currentRunId) return;
  const axis = selectAxis.value;
  const modality = selectModality.value;
  const sliceIdx = sliceSlider.value;
  const overlay = checkOverlay.checked;
  const alpha = sliderAlpha.value;

  const url = `${API_BASE}/api/v1/study/${currentRunId}/slice/${modality}/${axis}/${sliceIdx}?overlay=${overlay}&alpha=${alpha}`;
  sliceImg.src = url;
}

// 7. Display Results & Download Links
function displayResults(data) {
  resultsSection.classList.remove("hidden");

  // Volumetrics Table
  volumetricsTable.innerHTML = "";
  const regionNames = {
    WT: "Whole Tumor (ED + NCR + ET)",
    TC: "Tumor Core (NCR + ET)",
    ET: "Enhancing Tumor",
  };

  if (data.volumes) {
    for (const [reg, vals] of Object.entries(data.volumes)) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${reg}</strong></td>
        <td>${regionNames[reg] || reg}</td>
        <td>${vals.voxel_count.toLocaleString()}</td>
        <td><strong>${vals.volume_ml.toFixed(2)} mL</strong></td>
      `;
      volumetricsTable.appendChild(tr);
    }
  }

  // Metrics Table
  if (data.metrics) {
    metricsContainer.classList.remove("hidden");
    metricsTable.innerHTML = "";
    for (const [reg, vals] of Object.entries(data.metrics)) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${reg}</strong></td>
        <td>${vals.dice_score.toFixed(4)}</td>
        <td>${vals.sensitivity.toFixed(4)}</td>
        <td>${vals.hd95_mm !== null ? vals.hd95_mm.toFixed(2) + " mm" : "N/A"}</td>
      `;
      metricsTable.appendChild(tr);
    }
  } else {
    metricsContainer.classList.add("hidden");
  }

  // Download links
  downloadNiftiBtn.href = `${API_BASE}/api/v1/jobs/${currentRunId}/prediction`;
  downloadPdfBtn.href = `${API_BASE}/api/v1/jobs/${currentRunId}/report`;
}

// Initial status check
checkModelStatus();
