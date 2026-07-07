// Global States
let isLoopRunning = false;
let shouldStopLoop = false;
let promptDict = { positive_categories: [], negative_categories: [] };
let activeCheckpoints = [];
let activeVaes = ["Automatic", "animevae.pt", "vae-ft-mse-840000-ema-pruned.safetensors", "qwen_image_vae.safetensors"]; // デフォルトのフォールバック値
let activeTextEncoders = ["qwen_3_06b_base.safetensors"]; // テキストエンコーダー用デフォルト
let activeLoras = [];
let activeEmbeddings = [];
let activeUpscalers = ["Latent", "Latent (antialiased)", "4x-UltraSharp"]; // デフォルトのアップスケーラー

// Hires. fix DOM Elements
const hrEnabledCheckbox = document.getElementById("hr-enabled");
const hrDependentFields = document.getElementById("hr-dependent-fields");
const selectHrUpscaler = document.getElementById("select-hr-upscaler");
const inputHrScale = document.getElementById("input-hr-scale");
const valHrScale = document.getElementById("val-hr-scale");
const inputHrDenoise = document.getElementById("input-hr-denoise");
const valHrDenoise = document.getElementById("val-hr-denoise");
const inputHrSteps = document.getElementById("input-hr-steps");
const valHrSteps = document.getElementById("val-hr-steps");
const aiHiresToggle = document.getElementById("ai-hires-toggle");

// Generation Params DOM Elements
const inputCfgScale = document.getElementById("input-cfg-scale");
const valCfgScale = document.getElementById("val-cfg-scale");
const inputSteps = document.getElementById("input-steps");
const valSteps = document.getElementById("val-steps");
const aiParamsToggle = document.getElementById("ai-params-toggle");
const activeCfgScaleText = document.getElementById("active-cfg-scale");
const activeStepsText = document.getElementById("active-steps");

// Selected quality dictionary tags
const selectedQualityTags = new Set();

// Reference Image States
let referenceImageBase64 = null;

// Local Storage Keys
const STORAGE_KEY_API_PROVIDER = "promptcraft_ai_provider";
const STORAGE_KEY_API_KEY = "promptcraft_ai_key";
const STORAGE_KEY_SD_URL = "promptcraft_sd_url";
const STORAGE_KEY_GOAL = "promptcraft_goal";
const STORAGE_KEY_INITIAL_PROMPT = "promptcraft_initial_prompt";
const STORAGE_KEY_CFG_SCALE = "promptcraft_cfg_scale";
const STORAGE_KEY_STEPS = "promptcraft_steps";
const STORAGE_KEY_AI_PARAMS = "promptcraft_ai_params";
const STORAGE_KEY_GENERATION_ENGINE = "promptcraft_generation_engine";
const STORAGE_KEY_COMFY_URL = "promptcraft_comfy_url";
const STORAGE_KEY_COMFY_WORKFLOW = "promptcraft_comfy_workflow";
const STORAGE_KEY_EXCLUDED_TAGS = "promptcraft_excluded_tags";

// DOM Elements
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const goalInput = document.getElementById("goal-input");
const initialPromptInput = document.getElementById("initial-prompt");
const excludedTagsInput = document.getElementById("excluded-tags");
const loopCountInput = document.getElementById("loop-count");
const imageSizeSelect = document.getElementById("image-size");

const sdStatusDot = document.getElementById("sd-status-dot");
const sdStatusText = document.getElementById("sd-status-text");

const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

const progressContainer = document.getElementById("progress-container");
const progressStepTitle = document.getElementById("progress-step-title");
const progressBarFill = document.getElementById("progress-bar-fill");
const progressStatusDetail = document.getElementById("progress-status-detail");

const dictContainer = document.getElementById("dict-container");
const timelineGrid = document.getElementById("timeline-grid");
const emptyState = document.getElementById("empty-state");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const galleryGrid = document.getElementById("gallery-grid");
const galleryEmptyState = document.getElementById("gallery-empty-state");

const aiProviderSelect = document.getElementById("ai-provider-select");
const aiApiKeyInput = document.getElementById("ai-api-key");
const sdUrlInput = document.getElementById("sd-url-input");
const testConnectionBtn = document.getElementById("test-connection-btn");

// ComfyUI DOM Elements
const selectGenerationEngine = document.getElementById("select-generation-engine");
const panelSdWebuiSettings = document.getElementById("panel-sd-webui-settings");
const panelComfyuiSettings = document.getElementById("panel-comfyui-settings");
const comfyUrlInput = document.getElementById("comfy-url-input");
const comfyWorkflowInput = document.getElementById("comfy-workflow-input");
const testComfyConnectionBtn = document.getElementById("test-comfy-connection-btn");

const aiResourceToggle = document.getElementById("ai-resource-toggle");
const activeCheckpointText = document.getElementById("active-checkpoint");
const activeVaeText = document.getElementById("active-vae");
const checkpointsList = document.getElementById("checkpoints-list");
const vaesList = document.getElementById("vaes-list");
const textEncodersList = document.getElementById("text-encoders-list");
const lorasList = document.getElementById("loras-list");

// LoRA Selector DOM
const selectLora = document.getElementById("select-lora");
const inputLoraWeight = document.getElementById("input-lora-weight");
const valLoraWeight = document.getElementById("val-lora-weight");
const addLoraBtn = document.getElementById("add-lora-btn");

// Lightbox Modal DOM
const imageModal = document.getElementById("image-modal");
const modalClose = document.getElementById("modal-close");
const modalImg = document.getElementById("modal-img");
const modalPromptText = document.getElementById("modal-prompt-text");
const modalNegPromptText = document.getElementById("modal-neg-prompt-text");
const modalCopyBtn = document.getElementById("modal-copy-btn");
const modalApplyBtn = document.getElementById("modal-apply-btn");
const modalStarBtn = document.getElementById("modal-star-btn");
const modalStarIcon = document.getElementById("modal-star-icon");
const modalMetaScore = document.getElementById("modal-meta-score");
const modalMetaLoop = document.getElementById("modal-meta-loop");
const modalMetaCheckpoint = document.getElementById("modal-meta-checkpoint");
const modalMetaVae = document.getElementById("modal-meta-vae");

// X (Twitter) Share Modal DOM
const xShareModal = document.getElementById("x-share-modal");
const xShareModalClose = document.getElementById("x-share-modal-close");
const xSharePreviewImg = document.getElementById("x-share-preview-img");
const xShareTextarea = document.getElementById("x-share-textarea");
const xShareCopyImgBtn = document.getElementById("x-share-copy-img-btn");
const xShareGoBtn = document.getElementById("x-share-go-btn");
const modalXShareBtn = document.getElementById("modal-x-share-btn");
let activeModalEntryId = null;
const modalMetaCfg = document.getElementById("modal-meta-cfg");
const modalMetaSteps = document.getElementById("modal-meta-steps");
const modalMetaNodes = document.getElementById("modal-meta-nodes");

// Gallery View Switcher DOM
const btnExportCsv = document.getElementById("btn-export-csv");
const btnViewGrid = document.getElementById("btn-view-grid");
const btnViewList = document.getElementById("btn-view-list");
const metadataTableContainer = document.getElementById("metadata-table-container");
const metadataTableBody = document.getElementById("metadata-table-body");
const cleanupHistoryBtn = document.getElementById("cleanup-history-btn");

// Workflow Presets DOM & Variables
const comfyWorkflowPresetSelect = document.getElementById("comfy-workflow-preset-select");
const comfyWorkflowAutoSwitch = document.getElementById("comfy-workflow-auto-switch");
let workflowPresets = [];

// Session Recovery DOM
const sessionRecoveryBanner = document.getElementById("session-recovery-banner");
const recoveryLoopInfo = document.getElementById("recovery-loop-info");
const resumeSessionBtn = document.getElementById("resume-session-btn");
const dismissSessionBtn = document.getElementById("dismiss-session-btn");

// Reference Image DOM Elements
const refImageToggle = document.getElementById("ref-image-toggle");
const refImageContainer = document.getElementById("ref-image-container");
const refImageDropzone = document.getElementById("ref-image-dropzone");
const refImageFile = document.getElementById("ref-image-file");
const refImagePreviewContainer = document.getElementById("ref-image-preview-container");
const refImagePreview = document.getElementById("ref-image-preview");
const removeRefImgBtn = document.getElementById("remove-ref-img-btn");

// Initialization
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await loadSavedSettings();
  
  // Fetch workflow presets
  await fetchWorkflowPresets();
  
  // Fetch initial prompt dictionary
  await fetchPromptDictionary();
  
  // Connection and Resource Check
  await fetchGenerationResources();

  // Restore history from server
  await restoreHistoryFromServer();

  // Check for interrupted session
  await checkForInterruptedSession();
});

// Load Settings from LocalStorage & Server
async function loadSavedSettings() {
  if (localStorage.getItem(STORAGE_KEY_API_PROVIDER)) {
    aiProviderSelect.value = localStorage.getItem(STORAGE_KEY_API_PROVIDER);
  }
  if (localStorage.getItem(STORAGE_KEY_GOAL)) {
    goalInput.value = localStorage.getItem(STORAGE_KEY_GOAL);
  }
  if (localStorage.getItem(STORAGE_KEY_INITIAL_PROMPT)) {
    initialPromptInput.value = localStorage.getItem(STORAGE_KEY_INITIAL_PROMPT);
  }
  if (localStorage.getItem(STORAGE_KEY_CFG_SCALE)) {
    const savedCfg = localStorage.getItem(STORAGE_KEY_CFG_SCALE);
    inputCfgScale.value = savedCfg;
    valCfgScale.textContent = savedCfg;
  }
  if (localStorage.getItem(STORAGE_KEY_STEPS)) {
    const savedSteps = localStorage.getItem(STORAGE_KEY_STEPS);
    inputSteps.value = savedSteps;
    valSteps.textContent = savedSteps;
  }
  if (localStorage.getItem(STORAGE_KEY_AI_PARAMS)) {
    aiParamsToggle.checked = localStorage.getItem(STORAGE_KEY_AI_PARAMS) === "true";
  }

  // Load API Keys and SD URL from server
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const settings = await res.json();
      
      window.savedApiKeys = {
        openai: settings.openai_api_key,
        gemini: settings.gemini_api_key,
        claude: settings.claude_api_key,
        grok: settings.xai_api_key
      };

      if (settings.sd_webui_url) {
        sdUrlInput.value = settings.sd_webui_url;
      } else if (localStorage.getItem(STORAGE_KEY_SD_URL)) {
        sdUrlInput.value = localStorage.getItem(STORAGE_KEY_SD_URL);
      }

      if (comfyUrlInput) {
        if (settings.comfy_api_url) {
          comfyUrlInput.value = settings.comfy_api_url;
        } else if (localStorage.getItem(STORAGE_KEY_COMFY_URL)) {
          comfyUrlInput.value = localStorage.getItem(STORAGE_KEY_COMFY_URL);
        }
      }

      if (selectGenerationEngine) {
        if (settings.generation_engine) {
          selectGenerationEngine.value = settings.generation_engine;
        } else if (localStorage.getItem(STORAGE_KEY_GENERATION_ENGINE)) {
          selectGenerationEngine.value = localStorage.getItem(STORAGE_KEY_GENERATION_ENGINE);
        }
      }

      const provider = aiProviderSelect.value;
      aiApiKeyInput.value = window.savedApiKeys[provider] || "";
    }
  } catch (err) {
    console.error("Failed to load settings from server:", err);
  }

  if (localStorage.getItem(STORAGE_KEY_COMFY_WORKFLOW) && comfyWorkflowInput) {
    comfyWorkflowInput.value = localStorage.getItem(STORAGE_KEY_COMFY_WORKFLOW);
  }
  if (localStorage.getItem(STORAGE_KEY_EXCLUDED_TAGS) && excludedTagsInput) {
    excludedTagsInput.value = localStorage.getItem(STORAGE_KEY_EXCLUDED_TAGS);
  }

  // Toggle active engine panels based on engine select
  if (selectGenerationEngine) {
    toggleEngineSettingsPanel(selectGenerationEngine.value);
  }
}

// Fetch workflow presets from server
async function fetchWorkflowPresets() {
  try {
    const res = await fetch("/api/workflow/presets");
    if (res.ok) {
      workflowPresets = await res.json();
      
      // Populate select options
      if (comfyWorkflowPresetSelect) {
        comfyWorkflowPresetSelect.innerHTML = '<option value="">-- プリセットから適用 --</option>';
        workflowPresets.forEach(preset => {
          const option = document.createElement("option");
          option.value = preset.id;
          option.textContent = preset.name;
          option.title = preset.description;
          comfyWorkflowPresetSelect.appendChild(option);
        });
      }
    }
  } catch (err) {
    console.error("Failed to fetch workflow presets:", err);
  }
}

// Automatically switch workflow preset matching the model name
function autoSwitchWorkflowPreset(modelName) {
  if (!comfyWorkflowAutoSwitch || !comfyWorkflowAutoSwitch.checked) return;
  if (!modelName || workflowPresets.length === 0) return;

  const lowerModel = modelName.toLowerCase();
  
  // 1. Search for matching preset
  let matchedPreset = null;
  for (const preset of workflowPresets) {
    if (preset.matchPattern && lowerModel.includes(preset.matchPattern.toLowerCase())) {
      matchedPreset = preset;
      break;
    }
  }
  
  // 2. Default to illustrious_standard or first preset
  if (!matchedPreset) {
    matchedPreset = workflowPresets.find(p => p.id === "illustrious_standard") || workflowPresets[0];
  }
  
  if (matchedPreset && comfyWorkflowInput && comfyWorkflowPresetSelect) {
    const newJson = JSON.stringify(matchedPreset.workflow, null, 2);
    if (comfyWorkflowInput.value.trim() !== newJson.trim()) {
      comfyWorkflowInput.value = newJson;
      localStorage.setItem(STORAGE_KEY_COMFY_WORKFLOW, newJson);
      comfyWorkflowPresetSelect.value = matchedPreset.id;
      
      console.log(`[Auto-Preset] Automatically switched workflow to "${matchedPreset.name}" matching model "${modelName}"`);
      
      // Temporary success indicator glow
      comfyWorkflowInput.style.borderColor = "var(--color-primary)";
      setTimeout(() => { comfyWorkflowInput.style.borderColor = "var(--border-color)"; }, 1500);
    }
  }
}

// Event Listeners setup
function setupEventListeners() {
  // Tab Navigation
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.add("hidden"));
      
      btn.classList.add("active");
      const target = btn.dataset.target;
      document.getElementById(target).classList.remove("hidden");

      if (target === "analysis-tab") {
        updateAnalysisReport();
      } else if (target === "gallery-tab") {
        renderMetadataTable();
      }
    });
  });

  // Settings inputs save on change
  if (aiProviderSelect) {
    aiProviderSelect.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEY_API_PROVIDER, aiProviderSelect.value);
      if (window.savedApiKeys && aiApiKeyInput) {
        aiApiKeyInput.value = window.savedApiKeys[aiProviderSelect.value] || "";
      }
    });
  }

  if (aiApiKeyInput && aiProviderSelect) {
    aiApiKeyInput.addEventListener("change", async () => {
      const provider = aiProviderSelect.value;
      const keyVal = aiApiKeyInput.value.trim();
      const isMasked = (val) => val && (val.includes("...") || val.includes("***"));
      
      if (keyVal && !isMasked(keyVal)) {
        const payload = {};
        if (provider === "openai") payload.openai_api_key = keyVal;
        else if (provider === "gemini") payload.gemini_api_key = keyVal;
        else if (provider === "claude") payload.claude_api_key = keyVal;
        else if (provider === "grok") payload.xai_api_key = keyVal;

        try {
          await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          
          if (window.savedApiKeys) {
            window.savedApiKeys[provider] = keyVal.slice(0, 4) + "..." + keyVal.slice(-4);
            aiApiKeyInput.value = window.savedApiKeys[provider];
          }
        } catch (err) {
          console.error("Failed to save API key to server:", err);
        }
      }
    });
  }

  if (sdUrlInput) {
    sdUrlInput.addEventListener("change", async () => {
      localStorage.setItem(STORAGE_KEY_SD_URL, sdUrlInput.value.trim());
      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sd_webui_url: sdUrlInput.value.trim() })
        });
      } catch (err) {
        console.error("Failed to save SD URL to server:", err);
      }
    });
  }

  if (selectGenerationEngine) {
    selectGenerationEngine.addEventListener("change", async () => {
      const engine = selectGenerationEngine.value;
      localStorage.setItem(STORAGE_KEY_GENERATION_ENGINE, engine);
      toggleEngineSettingsPanel(engine);
      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generation_engine: engine })
        });
        // Reload resources based on selected engine
        fetchGenerationResources();
      } catch (err) {
        console.error("Failed to save engine selection to server:", err);
      }
    });
  }

  if (comfyUrlInput) {
    comfyUrlInput.addEventListener("change", async () => {
      const url = comfyUrlInput.value.trim();
      localStorage.setItem(STORAGE_KEY_COMFY_URL, url);
      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comfy_api_url: url })
        });
      } catch (err) {
        console.error("Failed to save ComfyUI URL to server:", err);
      }
    });
  }

  if (comfyWorkflowInput) {
    comfyWorkflowInput.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEY_COMFY_WORKFLOW, comfyWorkflowInput.value.trim());
    });
  }

  if (comfyWorkflowPresetSelect && comfyWorkflowInput) {
    comfyWorkflowPresetSelect.addEventListener("change", () => {
      const presetId = comfyWorkflowPresetSelect.value;
      if (!presetId) return;
      const preset = workflowPresets.find(p => p.id === presetId);
      if (preset && preset.workflow) {
        comfyWorkflowInput.value = JSON.stringify(preset.workflow, null, 2);
        localStorage.setItem(STORAGE_KEY_COMFY_WORKFLOW, comfyWorkflowInput.value.trim());
        comfyWorkflowInput.style.borderColor = "var(--color-success)";
        setTimeout(() => { comfyWorkflowInput.style.borderColor = "var(--border-color)"; }, 1000);
      }
    });
  }

  const selectCheckpoint = document.getElementById("select-checkpoint");
  if (selectCheckpoint) {
    selectCheckpoint.addEventListener("change", () => {
      const selectedModel = selectCheckpoint.value;
      if (selectedModel && selectedModel !== "") {
        autoSwitchWorkflowPreset(selectedModel);
      }
    });
  }

  if (testComfyConnectionBtn) {
    testComfyConnectionBtn.addEventListener("click", async () => {
      const url = comfyUrlInput.value.trim();
      testComfyConnectionBtn.disabled = true;
      testComfyConnectionBtn.innerHTML = '<span class="material-icons-round loader-spinner" style="font-size:16px;"></span> 接続確認中...';
      
      try {
        const res = await fetch("/api/comfy/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });
        
        const result = await res.json();
        if (res.ok && result.ok) {
          alert(`ComfyUI 接続成功！\n検出モデル数: ${result.modelsCount}`);
          fetchGenerationResources();
        } else {
          alert(`ComfyUI 接続失敗: ${result.error || "応答なし"}`);
        }
      } catch (err) {
        alert(`ComfyUI 接続エラー: ${err.message}`);
      } finally {
        testComfyConnectionBtn.disabled = false;
        testComfyConnectionBtn.innerHTML = '<span class="material-icons-round">sync</span> ComfyUI 接続確認';
      }
    });
  }
  goalInput.addEventListener("input", () => {
    localStorage.setItem(STORAGE_KEY_GOAL, goalInput.value);
  });
  initialPromptInput.addEventListener("input", () => {
    localStorage.setItem(STORAGE_KEY_INITIAL_PROMPT, initialPromptInput.value);
  });
  if (excludedTagsInput) {
    excludedTagsInput.addEventListener("input", () => {
      localStorage.setItem(STORAGE_KEY_EXCLUDED_TAGS, excludedTagsInput.value);
    });
  }

  // Action Buttons
  if (startBtn) startBtn.addEventListener("click", () => startImprovementLoop());
  if (stopBtn) {
    stopBtn.addEventListener("click", async () => {
      updateProgressStatus("停止リクエストを送信しました。現在のステップの完了を待っています...", "warning");
      stopBtn.disabled = true;
      try {
        await fetch("/api/session/stop", { method: "POST" });
      } catch (err) {
        console.error("Failed to stop session:", err);
      }
    });
  }

  if (testConnectionBtn) {
    testConnectionBtn.addEventListener("click", async () => {
      testConnectionBtn.disabled = true;
      testConnectionBtn.innerHTML = '<span class="material-icons-round loader-spinner"></span> 接続確認中...';
      await fetchGenerationResources();
      testConnectionBtn.disabled = false;
      testConnectionBtn.innerHTML = '<span class="material-icons-round">sync</span> 接続確認';
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", async () => {
      if (confirm("これまでの生成履歴を全て削除しますか？")) {
        try {
          await fetch("/api/history", { method: "DELETE" });
        } catch (err) {
          console.error("Failed to delete server history:", err);
        }
        if (timelineGrid) {
          timelineGrid.innerHTML = "";
          if (emptyState) {
            timelineGrid.appendChild(emptyState);
            emptyState.classList.remove("hidden");
          }
        }
        
        if (galleryGrid && galleryEmptyState) {
          galleryGrid.innerHTML = "";
          galleryGrid.appendChild(galleryEmptyState);
          galleryEmptyState.classList.remove("hidden");
        }
      }
    });
  }

  if (cleanupHistoryBtn) {
    cleanupHistoryBtn.addEventListener("click", async () => {
      const thresholdInput = prompt("お気に入り（星マーク）以外の画像のうち、何点未満のものを削除しますか？\n(例: 80点未満を消す場合は 80 と入力)", "80");
      if (thresholdInput === null) return; // キャンセル

      const threshold = parseInt(thresholdInput.trim());
      if (isNaN(threshold) || threshold < 1 || threshold > 100) {
        alert("1から100の間の有効な点数を入力してください。");
        return;
      }

      if (confirm(`【警告】お気に入り登録されておらず、かつ「${threshold}点未満」の画像（AI評価エラー画像を含む）をすべて削除します。よろしいですか？`)) {
        try {
          cleanupHistoryBtn.disabled = true;
          cleanupHistoryBtn.innerHTML = '<span class="material-icons-round loader-spinner" style="font-size:14px;"></span> 整理中...';

          const res = await fetch(`/api/history/cleanup?threshold=${threshold}`, { method: "DELETE" });
          if (res.ok) {
            const data = await res.json();
            alert(`整理が完了しました！\n削除された数: ${data.deletedCount}枚\n残った画像数: ${data.remainingCount}枚`);
            window.location.reload();
          } else {
            const err = await res.json();
            alert(`整理エラー: ${err.error || "Failed to cleanup"}`);
          }
        } catch (err) {
          console.error("Cleanup history error:", err);
          alert(`エラーが発生しました: ${err.message}`);
        } finally {
          cleanupHistoryBtn.disabled = false;
          cleanupHistoryBtn.innerHTML = '<span class="material-icons-round" style="font-size: 16px;">cleaning_services</span> 整理';
        }
      }
    });
  }

  // Hires. fix Event Listeners
  if (hrEnabledCheckbox) {
    hrEnabledCheckbox.addEventListener("change", () => {
      if (hrEnabledCheckbox.checked) {
        hrDependentFields.classList.remove("hidden");
      } else {
        hrDependentFields.classList.add("hidden");
      }
    });
  }
  if (inputHrScale && valHrScale) {
    inputHrScale.addEventListener("input", () => {
      valHrScale.textContent = inputHrScale.value;
    });
  }
  if (inputHrDenoise && valHrDenoise) {
    inputHrDenoise.addEventListener("input", () => {
      valHrDenoise.textContent = inputHrDenoise.value;
    });
  }
  if (inputHrSteps && valHrSteps) {
    inputHrSteps.addEventListener("input", () => {
      valHrSteps.textContent = inputHrSteps.value;
    });
  }

  if (inputCfgScale && valCfgScale) {
    inputCfgScale.addEventListener("input", () => {
      valCfgScale.textContent = inputCfgScale.value;
      localStorage.setItem(STORAGE_KEY_CFG_SCALE, inputCfgScale.value);
    });
  }
  if (inputSteps && valSteps) {
    inputSteps.addEventListener("input", () => {
      valSteps.textContent = inputSteps.value;
      localStorage.setItem(STORAGE_KEY_STEPS, inputSteps.value);
    });
  }
  if (aiParamsToggle) {
    aiParamsToggle.addEventListener("change", () => {
      localStorage.setItem(STORAGE_KEY_AI_PARAMS, aiParamsToggle.checked);
    });
  }

  // Modal Lightbox Close
  modalClose.addEventListener("click", () => imageModal.classList.add("hidden"));
  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
      imageModal.classList.add("hidden");
    }
  });

  // X Share Trigger in Lightbox Modal
  if (modalXShareBtn) {
    modalXShareBtn.addEventListener("click", () => {
      if (activeModalEntryId) {
        imageModal.classList.add("hidden");
        openXShareModal(activeModalEntryId);
      }
    });
  }

  // X Share Modal Actions
  if (xShareModalClose) {
    xShareModalClose.addEventListener("click", () => xShareModal.classList.add("hidden"));
  }
  if (xShareModal) {
    xShareModal.addEventListener("click", (e) => {
      if (e.target === xShareModal) xShareModal.classList.add("hidden");
    });
  }

  // Image Copy Click
  if (xShareCopyImgBtn) {
    xShareCopyImgBtn.addEventListener("click", async () => {
      if (!activeModalEntryId) return;
      xShareCopyImgBtn.disabled = true;
      xShareCopyImgBtn.innerHTML = '<span class="material-icons-round loader-spinner" style="font-size:16px;"></span> コピー中...';
      
      const success = await copyImageToClipboard(`/api/history/image/${activeModalEntryId}`);
      
      if (success) {
        xShareCopyImgBtn.innerHTML = '<span class="material-icons-round">done</span> コピー完了！';
        xShareCopyImgBtn.style.borderColor = "var(--color-success)";
        xShareCopyImgBtn.style.color = "var(--color-success)";
      } else {
        xShareCopyImgBtn.innerHTML = '<span class="material-icons-round">close</span> コピー失敗';
        xShareCopyImgBtn.style.borderColor = "var(--color-error)";
        xShareCopyImgBtn.style.color = "var(--color-error)";
        alert("画像のコピーに失敗しました。画像を右クリックして保存するか、手動でコピーしてください。");
      }
      
      setTimeout(() => {
         xShareCopyImgBtn.disabled = false;
         xShareCopyImgBtn.innerHTML = '<span class="material-icons-round">content_copy</span> 画像をコピー';
         xShareCopyImgBtn.style.borderColor = "";
         xShareCopyImgBtn.style.color = "";
      }, 2000);
    });
  }

  // Go to X Tweet Intent
  if (xShareGoBtn) {
    xShareGoBtn.addEventListener("click", () => {
      const text = xShareTextarea.value.trim();
      const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank");
    });
  }

  // Session Recovery Buttons
  if (resumeSessionBtn) {
    resumeSessionBtn.addEventListener("click", resumeInterruptedSession);
  }
  if (dismissSessionBtn) {
    dismissSessionBtn.addEventListener("click", async () => {
      sessionRecoveryBanner.classList.add("hidden");
      try {
        await fetch("/api/session", { method: "DELETE" });
      } catch (err) {
        console.error("Failed to dismiss session:", err);
      }
    });
  }

  // Reference Image Handlers
  if (refImageToggle) {
    refImageToggle.addEventListener("change", () => {
      if (refImageToggle.checked) {
        refImageContainer.classList.remove("hidden");
      } else {
        refImageContainer.classList.add("hidden");
      }
    });
  }

  if (refImageDropzone && refImageFile) {
    refImageDropzone.addEventListener("click", () => refImageFile.click());
    
    refImageDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      refImageDropzone.style.borderColor = "var(--color-primary)";
      refImageDropzone.style.backgroundColor = "rgba(139, 92, 246, 0.05)";
    });

    refImageDropzone.addEventListener("dragleave", () => {
      refImageDropzone.style.borderColor = "";
      refImageDropzone.style.backgroundColor = "";
    });

    refImageDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      refImageDropzone.style.borderColor = "";
      refImageDropzone.style.backgroundColor = "";
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleReferenceImageFile(e.dataTransfer.files[0]);
      }
    });

    refImageFile.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleReferenceImageFile(e.target.files[0]);
      }
    });
  }

  if (removeRefImgBtn) {
    removeRefImgBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      resetReferenceImage();
    });
  }

  // LoRA Selector Event Listeners
  if (inputLoraWeight && valLoraWeight) {
    inputLoraWeight.addEventListener("input", () => {
      valLoraWeight.textContent = inputLoraWeight.value;
    });
  }

  if (addLoraBtn && selectLora) {
    addLoraBtn.addEventListener("click", () => {
      const selectedLora = selectLora.value;
      const weight = inputLoraWeight ? inputLoraWeight.value : "1.0";
      
      if (selectedLora) {
        const loraTag = `<lora:${selectedLora}:${weight}>`;
        let currentVal = initialPromptInput.value.trim();
        
        if (currentVal) {
          if (currentVal.endsWith(",")) {
            initialPromptInput.value = `${currentVal} ${loraTag}`;
          } else {
            initialPromptInput.value = `${currentVal}, ${loraTag}`;
          }
        } else {
          initialPromptInput.value = loraTag;
        }
        
        // Save prompt
        localStorage.setItem(STORAGE_KEY_INITIAL_PROMPT, initialPromptInput.value);
        
        // Visual feedback
        addLoraBtn.style.backgroundColor = "var(--color-success)";
        setTimeout(() => { addLoraBtn.style.backgroundColor = ""; }, 800);
      }
    });
  }

  // Gallery View Switcher Event Listeners
  if (btnViewGrid && btnViewList && galleryGrid && metadataTableContainer) {
    btnViewGrid.addEventListener("click", () => {
      btnViewGrid.classList.add("active");
      btnViewList.classList.remove("active");
      galleryGrid.classList.remove("hidden");
      metadataTableContainer.classList.add("hidden");
    });

    btnViewList.addEventListener("click", () => {
      btnViewList.classList.add("active");
      btnViewGrid.classList.remove("active");
      galleryGrid.classList.add("hidden");
      metadataTableContainer.classList.remove("hidden");
      renderMetadataTable();
    });
  }

  // CSV Export Listener
  if (btnExportCsv) {
    btnExportCsv.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/history");
        if (!res.ok) throw new Error("履歴の取得に失敗しました。");
        const history = await res.json();
        if (!Array.isArray(history) || history.length === 0) {
          alert("エクスポートするデータがありません。");
          return;
        }

        const escapeCSV = (val) => {
          if (val === null || val === undefined) return "";
          return '"' + String(val).replace(/"/g, '""') + '"';
        };

        const headers = ["世代", "評価スコア", "Checkpoint", "VAE", "CFG Scale", "Steps", "Clip Skip", "ポジティブプロンプト", "ネガティブプロンプト", "画像URL", "生成日時"];
        const rows = history.map(e => [
          e.loopIndex,
          e.score !== null ? e.score : "",
          e.checkpoint || "",
          e.vae || "",
          e.cfgScale !== undefined ? e.cfgScale : "",
          e.steps !== undefined ? e.steps : "",
          e.clipSkip !== undefined ? e.clipSkip : "",
          e.prompt || "",
          e.negativePrompt || "",
          e.imageUrl || "",
          e.timestamp || ""
        ]);

        const csvContent = [headers, ...rows].map(row => row.map(escapeCSV).join(",")).join("\n");
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
        
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `promptcraft_history_${new Date().toISOString().slice(0,10)}.csv`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Visual feedback
        btnExportCsv.style.backgroundColor = "rgba(16, 185, 129, 0.2)";
        setTimeout(() => { btnExportCsv.style.backgroundColor = ""; }, 800);

      } catch (err) {
        console.error("CSV export failed:", err);
        alert(`CSVエクスポート中にエラーが発生しました: ${err.message}`);
      }
    });
  }
}

// Reference Image Helper Functions
function handleReferenceImageFile(file) {
  if (!file.type.startsWith("image/")) {
    alert("画像ファイルを選択してください。");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    // base64 prefix (e.g. data:image/png;base64,) を除去して生データのみにする
    const fullBase64 = e.target.result;
    referenceImageBase64 = fullBase64.split(",")[1];
    
    refImagePreview.src = fullBase64;
    refImagePreviewContainer.classList.remove("hidden");
    refImageDropzone.classList.add("hidden");
  };
  reader.readAsDataURL(file);
}

function resetReferenceImage() {
  referenceImageBase64 = null;
  refImageFile.value = "";
  refImagePreview.src = "";
  refImagePreviewContainer.classList.add("hidden");
  refImageDropzone.classList.remove("hidden");
}

// --- HISTORY PERSISTENCE ---

// Restore history from server on page load
async function restoreHistoryFromServer() {
  try {
    const res = await fetch("/api/history");
    if (!res.ok) return;
    
    const history = await res.json();
    if (!Array.isArray(history) || history.length === 0) return;

    // Clear empty state
    emptyState.classList.add("hidden");

    // Render each history entry (oldest first, newest on top)
    history.forEach(entry => {
      addHistoryCardToUI({
        id: entry.id,
        loopIndex: entry.loopIndex,
        imageUrl: `/api/history/image/${entry.id}`,
        prompt: entry.prompt,
        negativePrompt: entry.negativePrompt,
        checkpoint: entry.checkpoint,
        vae: entry.vae,
        textEncoder: entry.textEncoder,
        clipSkip: entry.clipSkip,
        cfgScale: entry.cfgScale,
        steps: entry.steps,
        score: entry.score,
        positives: entry.positives || [],
        improvements: entry.improvements || [],
        timestamp: entry.timestamp
      });
    });
  } catch (err) {
    console.error("Failed to restore history from server:", err);
  }
}

// Save a history entry to server
async function saveHistoryToServer(data) {
  try {
    const res = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to save history to server:", err);
  }
  return null;
}

// --- SESSION PERSISTENCE ---

// Save current loop state to server
async function saveSessionState(sessionData) {
  try {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sessionData)
    });
  } catch (err) {
    console.error("Failed to save session state:", err);
  }
}

// Clear session state
async function clearSessionState() {
  try {
    await fetch("/api/session", { method: "DELETE" });
  } catch (err) {
    console.error("Failed to clear session state:", err);
  }
}

// Check for active session on page load and auto-resume polling
async function checkForInterruptedSession() {
  try {
    const res = await fetch("/api/session");
    if (!res.ok) return;
    
    const session = await res.json();
    if (session.running || session.active) {
      console.log("Active session detected on server. Auto-resuming polling...");
      
      // Restore settings from active session to UI
      if (session.goal) goalInput.value = session.goal;
      if (session.provider) aiProviderSelect.value = session.provider;
      if (session.imageSize) imageSizeSelect.value = session.imageSize;
      if (session.useAISdSelection !== undefined) aiResourceToggle.checked = session.useAISdSelection;
      if (session.useAIParamsSelection !== undefined) aiParamsToggle.checked = session.useAIParamsSelection;
      if (session.currentCfgScale !== undefined) {
        inputCfgScale.value = session.currentCfgScale;
        valCfgScale.textContent = session.currentCfgScale;
      }
      if (session.currentSteps !== undefined) {
        inputSteps.value = session.currentSteps;
        valSteps.textContent = session.currentSteps;
      }
      if (session.currentSamplerName !== undefined && document.getElementById("select-sampler")) {
        document.getElementById("select-sampler").value = session.currentSamplerName || "";
      }
      if (session.currentScheduler !== undefined && document.getElementById("select-scheduler")) {
        document.getElementById("select-scheduler").value = session.currentScheduler || "";
      }
      if (session.excludedTags !== undefined && excludedTagsInput) {
        excludedTagsInput.value = session.excludedTags || "";
      }
      if (session.useReferenceImage !== undefined && refImageToggle) {
        refImageToggle.checked = session.useReferenceImage;
        refImageToggle.dispatchEvent(new Event("change"));
        if (session.referenceImageBase64) {
          referenceImageBase64 = session.referenceImageBase64;
          refImagePreview.src = `data:image/png;base64,${referenceImageBase64}`;
          refImagePreviewContainer.classList.remove("hidden");
          refImageDropzone.classList.add("hidden");
        }
      }

      // Hide banner just in case
      if (sessionRecoveryBanner) {
        sessionRecoveryBanner.classList.add("hidden");
      }

      // Auto start polling
      startPollingSession();
    }
  } catch (err) {
    console.error("Failed to check session state on startup:", err);
  }
}

// Obsolete resume function (auto-recovery is preferred now)
async function resumeInterruptedSession() {
  // Deprecated
}

// Check Selected Engine Connection & Fetch Resources
async function fetchGenerationResources() {
  const engine = selectGenerationEngine ? selectGenerationEngine.value : "sd-webui";
  if (engine === "sd-webui") {
    await checkSdConnection();
  } else if (engine === "comfyui") {
    await checkComfyConnection();
  }
}

// Check Stable Diffusion WebUI Connection & Fetch Resources
async function checkSdConnection() {
  const sdUrl = sdUrlInput ? sdUrlInput.value.trim() : "http://127.0.0.1:7860";
  updateSdStatus(false, "接続確認中...");

  try {
    const res = await fetch("/api/sd/checkpoints", {
      headers: { "x-sd-url": sdUrl }
    });

    if (res.ok) {
      const models = await res.json();
      activeCheckpoints = models.map(m => m.title);
      updateSdStatus(true, "接続成功");
      
      // Fetch other resources
      await fetchSdResources(sdUrl);
    } else {
      updateSdStatus(false, "未接続 (APIエラー)");
      clearResourceLists();
    }
  } catch (err) {
    updateSdStatus(false, "未接続 (接続エラー)");
    clearResourceLists();
  }
}

// Check ComfyUI Connection & Fetch Resources
async function checkComfyConnection() {
  const comfyUrl = comfyUrlInput ? comfyUrlInput.value.trim() : "http://127.0.0.1:8188";
  updateSdStatus(false, "ComfyUI 接続確認中...");

  try {
    const res = await fetch("/api/comfy/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: comfyUrl })
    });

    if (res.ok) {
      const result = await res.json();
      if (result.ok) {
        activeCheckpoints = result.models || [];
        updateSdStatus(true, "ComfyUI 接続成功");
        await fetchComfyResources(comfyUrl);
      } else {
        updateSdStatus(false, "ComfyUI 未接続 (APIエラー)");
        clearResourceLists();
      }
    } else {
      updateSdStatus(false, "ComfyUI 未接続 (HTTPエラー)");
      clearResourceLists();
    }
  } catch (err) {
    updateSdStatus(false, "ComfyUI 未接続 (接続エラー)");
    clearResourceLists();
  }
}

function updateSdStatus(isOnline, text) {
  if (sdStatusDot && sdStatusText) {
    if (isOnline) {
      sdStatusDot.className = "status-indicator online";
      sdStatusText.textContent = text;
      sdStatusText.style.color = "var(--color-success)";
    } else {
      sdStatusDot.className = "status-indicator offline";
      sdStatusText.textContent = text;
      sdStatusText.style.color = "var(--color-error)";
    }
  }
}

// Fetch Resources from SD WebUI
async function fetchSdResources(sdUrl) {
  try {
    // 1. Fetch Checkpoints & Build Checkpoint list UI
    renderResourceList(checkpointsList, activeCheckpoints, "checkpoint");

    // Try to discover which checkpoint is active
    const optionsRes = await fetch("/api/sd/options", { headers: { "x-sd-url": sdUrl } });
    if (optionsRes.ok) {
      const options = await optionsRes.json();
      if (activeCheckpointText) activeCheckpointText.textContent = options.sd_model_checkpoint || "未設定";
      
      // Forge Neo の追加モジュール（VAE, Text Encoder）をパース
      let appliedVae = options.sd_vae || "自動選択";
      let appliedTe = "未適用";
      if (Array.isArray(options.forge_additional_modules) && options.forge_additional_modules.length > 0) {
        options.forge_additional_modules.forEach(mod => {
          if (mod.toLowerCase().includes("vae")) {
            appliedVae = mod;
          } else {
            appliedTe = mod;
          }
        });
      }
      if (activeVaeText) activeVaeText.textContent = appliedVae;

      const activeTeText = document.getElementById("active-text-encoder");
      if (activeTeText) {
        activeTeText.textContent = appliedTe;
      }
      
      const activeClipSkipText = document.getElementById("active-clip-skip");
      if (activeClipSkipText) {
        activeClipSkipText.textContent = options.CLIP_stop_at_last_layers !== undefined ? options.CLIP_stop_at_last_layers : "未設定";
      }
      
      if (activeCfgScaleText) {
        activeCfgScaleText.textContent = inputCfgScale ? inputCfgScale.value : "7.5";
      }
      if (activeStepsText) {
        activeStepsText.textContent = inputSteps ? inputSteps.value : "25";
      }
    }

    // 2. Fetch VAEs
    const vaeRes = await fetch("/api/sd/vaes", { headers: { "x-sd-url": sdUrl } });
    if (vaeRes.ok) {
      const vaes = await vaeRes.json();
      if (vaes && vaes.length > 0) {
        activeVaes = vaes.map(v => v.model_name || v);
      }
    }
    
    if (activeVaes.length === 0) {
      activeVaes = ["Automatic", "animevae.pt", "vae-ft-mse-840000-ema-pruned.safetensors", "qwen_image_vae.safetensors"];
    }
    renderResourceList(vaesList, activeVaes, "vae");

    // 2.5. Fetch Text Encoders
    const teRes = await fetch("/api/sd/text-encoders", { headers: { "x-sd-url": sdUrl } });
    if (teRes.ok) {
      const tes = await teRes.json();
      if (tes && tes.length > 0) {
        activeTextEncoders = tes.map(t => t.name || t);
      }
    }
    if (activeTextEncoders.length === 0) {
      activeTextEncoders = ["qwen_3_06b_base.safetensors"];
    }
    renderResourceList(textEncodersList, activeTextEncoders, "text-encoder");

    // 3. Fetch LoRAs
    const loraRes = await fetch("/api/sd/loras", { headers: { "x-sd-url": sdUrl } });
    if (loraRes.ok) {
      const loras = await loraRes.json();
      activeLoras = loras.map(l => l.name);
      renderResourceList(lorasList, activeLoras, "lora");
    }

    // 3.5. Fetch Upscalers
    try {
      const upscalerRes = await fetch("/api/sd/upscalers", { headers: { "x-sd-url": sdUrl } });
      if (upscalerRes.ok) {
        const upscalers = await upscalerRes.json();
        if (upscalers && upscalers.length > 0) {
          activeUpscalers = upscalers.map(u => u.name || u);
        }
      }
    } catch (err) {
      console.error("Failed to fetch upscalers:", err);
    }

    // Update Manual Select elements options
    updateManualSelectOptions(document.getElementById("select-checkpoint"), activeCheckpoints, "(現在の適用モデルを使用)");
    updateManualSelectOptions(document.getElementById("select-vae"), activeVaes, "(自動選択 / プリセット優先)");
    updateManualSelectOptions(document.getElementById("select-text-encoder"), activeTextEncoders, "(自動選択 / プリセット優先)");
    updateManualSelectOptions(document.getElementById("select-hr-upscaler"), activeUpscalers, "Latent");
    updateManualSelectOptions(selectLora, activeLoras, "(LoRAを選択)");

  } catch (err) {
    console.error("Error fetching SD resources:", err);
  }
}

// Fetch Resources from ComfyUI
async function fetchComfyResources(comfyUrl) {
  try {
    renderResourceList(checkpointsList, activeCheckpoints, "checkpoint");
    if (activeCheckpointText) activeCheckpointText.textContent = activeCheckpoints[0] || "未設定";

    const res = await fetch("/api/comfy/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: comfyUrl })
    });

    if (res.ok) {
      const resources = await res.json();
      
      activeVaes = Array.isArray(resources.vaes) ? resources.vaes : [];
      if (activeVaes.length === 0) activeVaes = ["Automatic"];
      renderResourceList(vaesList, activeVaes, "vae");
      if (activeVaeText) activeVaeText.textContent = activeVaes[0] || "未選択";

      activeTextEncoders = Array.isArray(resources.textEncoders) ? resources.textEncoders : [];
      if (activeTextEncoders.length === 0) activeTextEncoders = ["Automatic"];
      renderResourceList(textEncodersList, activeTextEncoders, "text-encoder");
      const activeTeText = document.getElementById("active-text-encoder");
      if (activeTeText) activeTeText.textContent = activeTextEncoders[0] || "未選択";

      activeLoras = Array.isArray(resources.loras) ? resources.loras : [];
      renderResourceList(lorasList, activeLoras, "lora");

      activeUpscalers = Array.isArray(resources.upscalers) ? resources.upscalers : [];
      if (activeUpscalers.length === 0) activeUpscalers = ["Latent", "Latent (antialiased)", "4x-UltraSharp"];
      
      const activeClipSkipText = document.getElementById("active-clip-skip");
      if (activeClipSkipText) activeClipSkipText.textContent = "N/A (ComfyUI)";
      if (activeCfgScaleText) activeCfgScaleText.textContent = inputCfgScale ? inputCfgScale.value : "7.5";
      if (activeStepsText) activeStepsText.textContent = inputSteps ? inputSteps.value : "25";
    }

    // Update Select elements
    updateManualSelectOptions(document.getElementById("select-checkpoint"), activeCheckpoints, "(現在の適用モデルを使用)");
    updateManualSelectOptions(document.getElementById("select-vae"), activeVaes, "(自動選択 / プリセット優先)");
    updateManualSelectOptions(document.getElementById("select-text-encoder"), activeTextEncoders, "(自動選択 / プリセット優先)");
    updateManualSelectOptions(document.getElementById("select-hr-upscaler"), activeUpscalers, "Latent");
    updateManualSelectOptions(selectLora, activeLoras, "(LoRAを選択)");

  } catch (err) {
    console.error("Error fetching ComfyUI resources:", err);
  }
}

function updateManualSelectOptions(selectEl, list, defaultText) {
  if (!selectEl) return;
  const currentValue = selectEl.value;
  selectEl.innerHTML = `<option value="">${defaultText}</option>`;
  list.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    if (item === currentValue) {
      opt.selected = true;
    }
    selectEl.appendChild(opt);
  });
}

function renderResourceList(container, list, type) {
  if (!container) return;
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = `<p class="loading-placeholder">利用可能な${type}はありません。</p>`;
    return;
  }

  list.forEach(item => {
    const div = document.createElement("div");
    div.className = "list-item clickable";
    div.style.cursor = "pointer";
    div.innerHTML = `
      <span>${item}</span>
      <span class="meta">${type}</span>
    `;

    // アイテムクリック時に左側の手動指定セレクトボックスを自動選択
    div.addEventListener("click", () => {
      let selectId = "";
      if (type === "checkpoint") selectId = "select-checkpoint";
      else if (type === "vae") selectId = "select-vae";
      else if (type === "text-encoder") selectId = "select-text-encoder";
      else if (type === "lora") selectId = "select-lora";

      const selectEl = document.getElementById(selectId);
      if (selectEl) {
        selectEl.value = item;
        // 選択された視覚効果
        selectEl.style.borderColor = "var(--color-primary)";
        selectEl.style.boxShadow = "0 0 8px rgba(99, 102, 241, 0.4)";
        setTimeout(() => {
          selectEl.style.borderColor = "";
          selectEl.style.boxShadow = "";
        }, 800);
      }
    });

    container.appendChild(div);
  });
}

function clearResourceLists() {
  if (checkpointsList) checkpointsList.innerHTML = `<p class="loading-placeholder">接続後に表示されます</p>`;
  if (vaesList) vaesList.innerHTML = `<p class="loading-placeholder">接続後に表示されます</p>`;
  if (textEncodersList) textEncodersList.innerHTML = `<p class="loading-placeholder">接続後に表示されます</p>`;
  if (lorasList) lorasList.innerHTML = `<p class="loading-placeholder">接続後に表示されます</p>`;
  if (activeCheckpointText) activeCheckpointText.textContent = "未接続";
  if (activeVaeText) activeVaeText.textContent = "未接続";
  const activeTeText = document.getElementById("active-text-encoder");
  if (activeTeText) activeTeText.textContent = "未接続";
  const activeClipSkipText = document.getElementById("active-clip-skip");
  if (activeClipSkipText) activeClipSkipText.textContent = "未接続";
  if (activeCfgScaleText) activeCfgScaleText.textContent = "未接続";
  if (activeStepsText) activeStepsText.textContent = "未接続";
}

// Fetch Prompt Dictionary from Backend
async function fetchPromptDictionary() {
  try {
    const res = await fetch("/api/prompt-dictionary");
    if (res.ok) {
      promptDict = await res.json();
      renderPromptDictionary();
    }
  } catch (err) {
    console.error("Failed to load prompt dictionary:", err);
    dictContainer.innerHTML = "<p class='loading-placeholder'>辞書のロードに失敗しました</p>";
  }
}

// Render Dictionary Chips
function renderPromptDictionary() {
  dictContainer.innerHTML = "";

  if (promptDict.positive_categories.length === 0) {
    dictContainer.innerHTML = "<p class='loading-placeholder'>辞書データが空です</p>";
    return;
  }

  promptDict.positive_categories.forEach(cat => {
    const section = document.createElement("div");
    section.className = "dict-category-row";
    
    const title = document.createElement("h4");
    title.textContent = cat.name;
    section.appendChild(title);

    const chipsWrapper = document.createElement("div");
    chipsWrapper.className = "chips-container";

    cat.tags.forEach(t => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = t.tag;
      chip.title = t.description;
      
      chip.addEventListener("click", () => {
        if (selectedQualityTags.has(t.tag)) {
          selectedQualityTags.delete(t.tag);
          chip.classList.remove("active");
        } else {
          selectedQualityTags.add(t.tag);
          chip.classList.add("active");
        }
      });

      chipsWrapper.appendChild(chip);
    });

    section.appendChild(chipsWrapper);
    dictContainer.appendChild(section);
  });
}

// --- IMPROVEMENT LOOP PROCESS ---

let pollingInterval = null;

// Start Improvement Loop Session on Server
async function startImprovementLoop(resumeSession = null) {
  // イベントオブジェクトが渡された場合はセッション情報として扱わない
  if (resumeSession instanceof Event || (resumeSession && !resumeSession.active)) {
    resumeSession = null;
  }

  const goal = goalInput.value.trim();
  const provider = aiProviderSelect.value;
  const imageSize = imageSizeSelect.value;
  const [width, height] = imageSize.split("x").map(Number);
  const useAISdSelection = aiResourceToggle.checked;
  const useAIParamsSelection = aiParamsToggle ? aiParamsToggle.checked : true;
  const useAIHiresSelection = aiHiresToggle ? aiHiresToggle.checked : true;
  
  const manualCheckpoint = document.getElementById("select-checkpoint").value;
  const manualVae = document.getElementById("select-vae").value;
  const manualTextEncoder = document.getElementById("select-text-encoder").value;
  const manualSampler = document.getElementById("select-sampler") ? document.getElementById("select-sampler").value : "";
  const manualScheduler = document.getElementById("select-scheduler") ? document.getElementById("select-scheduler").value : "";

  const hrEnabled = hrEnabledCheckbox ? hrEnabledCheckbox.checked : false;
  const hrUpscaler = selectHrUpscaler ? selectHrUpscaler.value : "Latent";
  const hrScale = inputHrScale ? parseFloat(inputHrScale.value) : 1.5;
  const hrDenoise = inputHrDenoise ? parseFloat(inputHrDenoise.value) : 0.55;
  const hrSteps = inputHrSteps ? parseInt(inputHrSteps.value) : 15;

  const maxLoops = parseInt(loopCountInput.value) || 3;

  if (!goal) {
    alert("目標イメージを入力してください。");
    return;
  }

  // クオリティタグ
  const selectedTagsArr = Array.from(selectedQualityTags);

  // 初回パラメータの仮決定（プリセット自動検出）
  let currentCheckpoint = manualCheckpoint || null;
  let currentVae = manualVae || null;
  let currentTextEncoder = manualTextEncoder || null;
  let currentClipSkip = null;

  const activeModelName = (currentCheckpoint || activeCheckpointText.textContent).toLowerCase();
  if (activeModelName.includes("illustrious") || activeModelName.includes("xl")) {
    currentClipSkip = 1;
    if (!manualVae) currentVae = "Automatic";
    if (!manualTextEncoder) currentTextEncoder = "";
  } else if (activeModelName.includes("anima")) {
    currentClipSkip = 2;
    if (!manualVae) currentVae = "qwen_image_vae.safetensors";
    if (!manualTextEncoder) currentTextEncoder = "qwen_3_06b_base.safetensors";
  }

  // Automatically switch preset workflow matching the target model before starting
  if (comfyWorkflowAutoSwitch && comfyWorkflowAutoSwitch.checked) {
    const targetModel = currentCheckpoint || activeCheckpointText.textContent;
    if (targetModel && targetModel !== "未設定" && targetModel !== "未接続") {
      autoSwitchWorkflowPreset(targetModel);
    }
  }

  const payload = {
    goal,
    maxLoops,
    imageSize,
    useAISdSelection,
    useAIParamsSelection,
    useAIHiresSelection,
    useReferenceImage: refImageToggle ? refImageToggle.checked : false,
    referenceImageBase64: (refImageToggle && refImageToggle.checked) ? referenceImageBase64 : null,
    selectedQualityTags: selectedTagsArr,
    provider,
    currentPrompt: initialPromptInput.value.trim() || goal,
    currentCheckpoint,
    currentVae,
    currentTextEncoder,
    currentSamplerName: manualSampler || null,
    currentScheduler: manualScheduler || null,
    currentClipSkip,
    currentCfgScale: inputCfgScale ? parseFloat(inputCfgScale.value) : 7.5,
    currentSteps: inputSteps ? parseInt(inputSteps.value) : 25,
    hrEnabled,
    hrUpscaler,
    hrScale,
    hrDenoise,
    hrSteps,
    generationEngine: selectGenerationEngine ? selectGenerationEngine.value : "sd-webui",
    comfyUrl: comfyUrlInput ? comfyUrlInput.value.trim() : "http://127.0.0.1:8188",
    comfyWorkflow: comfyWorkflowInput ? comfyWorkflowInput.value.trim() : "",
    excludedTags: excludedTagsInput ? excludedTagsInput.value.trim() : ""
  };

  // Set running state visually
  isLoopRunning = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  progressContainer.classList.remove("hidden");
  emptyState.classList.add("hidden");
  updateProgressStatus("セッションをサーバーで開始しています...", "primary");

  try {
    const res = await fetch("/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      startPollingSession();
    } else {
      const err = await res.json();
      throw new Error(err.error || "Failed to start session on server");
    }
  } catch (err) {
    console.error(err);
    isLoopRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    progressContainer.classList.add("hidden");
    alert(`セッション開始エラー: ${err.message}`);
  }
}

// Start polling for session state
function startPollingSession() {
  if (pollingInterval) clearInterval(pollingInterval);
  
  // Set UI state
  isLoopRunning = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  progressContainer.classList.remove("hidden");

  // Immediate poll
  pollSessionState();

  pollingInterval = setInterval(pollSessionState, 2000);
}

// Stop polling and reset UI
function stopPolling(status = "Idle", isError = false) {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isLoopRunning = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  progressContainer.classList.add("hidden");
  updateSdStatus(true, isError ? "エラー終了" : "接続成功（アイドル）");
}

// Poll session state from server
async function pollSessionState() {
  try {
    const res = await fetch("/api/session");
    if (!res.ok) return;

    const session = await res.json();

    // UIをセッション情報に合わせて動的に更新する
    if (session.running) {
      progressStepTitle.textContent = `${session.statusText} (${session.currentLoop}/${session.maxLoops})`;
      progressBarFill.style.width = `${session.percent}%`;
      updateProgressStatus(`[進捗 ${session.percent}%] ${session.statusText}`, "secondary");

      // 進捗中に表示されているパラメータを更新
      if (session.currentCheckpoint) activeCheckpointText.textContent = session.currentCheckpoint;
      if (session.currentVae) activeVaeText.textContent = session.currentVae;
      
      const activeTeText = document.getElementById("active-text-encoder");
      if (activeTeText && session.currentTextEncoder) {
        activeTeText.textContent = session.currentTextEncoder;
      }
      const activeClipSkipText = document.getElementById("active-clip-skip");
      if (activeClipSkipText && session.currentClipSkip) {
        activeClipSkipText.textContent = session.currentClipSkip;
      }
      if (activeCfgScaleText && session.currentCfgScale) {
        activeCfgScaleText.textContent = session.currentCfgScale;
      }
      if (activeStepsText && session.currentSteps) {
        activeStepsText.textContent = session.currentSteps;
      }

      // Hires UI 更新
      if (hrEnabledCheckbox) {
        hrEnabledCheckbox.checked = session.hrEnabled;
        hrEnabledCheckbox.dispatchEvent(new Event("change"));
      }
      if (selectHrUpscaler && session.hrUpscaler) selectHrUpscaler.value = session.hrUpscaler;
      if (inputHrScale && session.hrScale) {
        inputHrScale.value = session.hrScale;
        valHrScale.textContent = session.hrScale;
      }
      if (inputHrDenoise && session.hrDenoise) {
        inputHrDenoise.value = session.hrDenoise;
        valHrDenoise.textContent = session.hrDenoise;
      }
      if (inputHrSteps && session.hrSteps) {
        inputHrSteps.value = session.hrSteps;
        valHrSteps.textContent = session.hrSteps;
      }
    } else {
      // サーバー上で動いていない場合
      if (session.statusText === "Completed") {
        updateProgressStatus("改善ループが正常に完了しました。", "success");
        stopPolling();
      } else if (session.statusText === "Stopped by user" || session.statusText === "Stopped") {
        updateProgressStatus("ユーザーによって停止されました。", "warning");
        stopPolling();
      } else if (session.error || session.statusText === "Failed") {
        updateProgressStatus(`エラーにより停止しました: ${session.error || "Unknown error"}`, "error");
        stopPolling("Failed", true);
      } else {
        // それ以外（まだ一度も走っていない場合など）
        stopPolling();
      }
    }

    // 履歴を常に復元して、最新の画像カードを追加
    await restoreHistoryFromServer();

  } catch (err) {
    console.error("Error polling session:", err);
  }
}

// Update progress messages in Sidebar/Progress area
function updateProgressStatus(message, type) {
  progressStatusDetail.textContent = message;
  if (type === "error") {
    progressStatusDetail.style.color = "var(--color-error)";
  } else if (type === "warning") {
    progressStatusDetail.style.color = "var(--color-warning)";
  } else {
    progressStatusDetail.style.color = "var(--color-text-muted)";
  }
}

// Update the progress bar fill
function updateProgressBar(loop, maxLoops, stepPercentage) {
  const basePercentage = ((loop) / maxLoops) * 100;
  const currentPercentage = basePercentage + (stepPercentage / maxLoops);
  progressBarFill.style.width = `${Math.min(currentPercentage, 100)}%`;
}

// Create and Add History Card to UI
function addHistoryCardToUI(data) {
  const { id, loopIndex, imageUrl, imageBase64, prompt, negativePrompt, checkpoint, vae, textEncoder, clipSkip, cfgScale, steps, score, positives, improvements, timestamp, hiresFix, suggestedNodes, userStarred } = data;

  if (id && document.querySelector(`[data-history-id="${id}"]`)) {
    return; // Already rendered
  }

  const card = document.createElement("div");
  card.className = "history-card glass-panel";
  if (id) card.dataset.historyId = id;

  // Score styling color
  let scoreColorClass = "score-num";
  
  // Image src: prefer URL, fallback to base64
  const imgSrc = imageUrl || (imageBase64 ? `data:image/png;base64,${imageBase64}` : "");

  // Timestamp display
  const timeStr = timestamp ? new Date(timestamp).toLocaleString("ja-JP") : "";

  // Positives list
  const positivesLi = (positives || []).map(p => `<li>${escapeHtml(p)}</li>`).join("");
  // Improvements list
  const improvementsLi = (improvements || []).map(i => `<li>${escapeHtml(i)}</li>`).join("");

  // Hires. fix badge
  let hrBadge = "";
  if (hiresFix && hiresFix.enable) {
    hrBadge = `<span class="meta-pill" style="border-color: var(--color-secondary); color: var(--color-secondary);"><span class="material-icons-round" style="font-size:12px;vertical-align:middle;margin-right:2px;">high_quality</span>Hires: ${escapeHtml(hiresFix.upscaler || "Latent")} (x${hiresFix.upscale_by || 1.5} / Denoise: ${hiresFix.denoising_strength || 0.55})</span>`;
  }

  // AI node bypass badges
  let nodesBadges = "";
  if (suggestedNodes) {
    if (suggestedNodes.face_detailer) {
      nodesBadges += `<span class="meta-pill" style="border-color: #f43f5e; color: #f43f5e; background: rgba(244, 63, 94, 0.05);"><span class="material-icons-round" style="font-size:12px;vertical-align:middle;margin-right:2px;">face</span>Face Detailer</span>`;
    }
    if (suggestedNodes.controlnet) {
      nodesBadges += `<span class="meta-pill" style="border-color: #3b82f6; color: #3b82f6; background: rgba(59, 130, 246, 0.05);"><span class="material-icons-round" style="font-size:12px;vertical-align:middle;margin-right:2px;">link</span>ControlNet</span>`;
    }
    if (suggestedNodes.upscaler) {
      nodesBadges += `<span class="meta-pill" style="border-color: #10b981; color: #10b981; background: rgba(16, 185, 129, 0.05);"><span class="material-icons-round" style="font-size:12px;vertical-align:middle;margin-right:2px;">grid_view</span>Upscaler</span>`;
    }
  }

  card.innerHTML = `
    <div class="card-image-wrapper">
      <div class="card-badge" style="display: flex; justify-content: space-between; align-items: center; width: calc(100% - 16px);">
        <span>世代 #${loopIndex}${timeStr ? ` <span style="font-size:0.7em;opacity:0.7;margin-left:6px;">${timeStr}</span>` : ""}</span>
        <span class="card-star-icon material-icons-round" style="cursor: pointer; font-size: 18px; color: ${userStarred ? 'var(--color-primary)' : 'rgba(255,255,255,0.4)'}; transition: color 0.2s;" title="お気に入り">${userStarred ? 'star' : 'star_border'}</span>
      </div>
      <img src="${imgSrc}" alt="Generated Image Loop ${loopIndex}" loading="lazy">
    </div>
    <div class="card-details">
      <div class="card-header-row">
        <div class="card-meta-info">
          <span class="meta-pill">Checkpoint: ${escapeHtml(checkpoint || "N/A")}</span>
          ${vae ? `<span class="meta-pill">VAE: ${escapeHtml(vae)}</span>` : ""}
          ${textEncoder ? `<span class="meta-pill">TE: ${escapeHtml(textEncoder)}</span>` : ""}
          ${clipSkip ? `<span class="meta-pill">Clip Skip: ${clipSkip}</span>` : ""}
          ${cfgScale ? `<span class="meta-pill">CFG: ${cfgScale}</span>` : ""}
          ${steps ? `<span class="meta-pill">Steps: ${steps}</span>` : ""}
          ${hrBadge}
          ${nodesBadges}
        </div>
        <div class="score-badge">
          <span class="${scoreColorClass}">${score !== null && score !== undefined ? score : "N/A"}</span>
          <span class="score-label">MATCH SCORE</span>
        </div>
      </div>

      <div class="prompt-box">
        <div class="prompt-title">ポジティブプロンプト</div>
        <div class="prompt-text">${escapeHtml(prompt)}</div>
        <button class="copy-btn-abs" title="プロンプトをコピー">
          <span class="material-icons-round">content_copy</span>
        </button>

        <div class="negative-prompt-box">
          <div class="prompt-title">ネガティブプロンプト</div>
          <div class="prompt-text">${escapeHtml(negativePrompt)}</div>
        </div>
      </div>

      <div class="feedback-box">
        <div class="feedback-col positives">
          <h5><span class="material-icons-round" style="font-size:14px;vertical-align:text-bottom;">check_circle</span> 良かった点</h5>
          <ul>${positivesLi}</ul>
        </div>
        <div class="feedback-col improvements">
          <h5><span class="material-icons-round" style="font-size:14px;vertical-align:text-bottom;">trending_up</span> 改善ポイント</h5>
          <ul>${improvementsLi}</ul>
        </div>
      </div>
    </div>
  `;

  // Attach Star Toggle Logic
  const starIcon = card.querySelector(".card-star-icon");
  if (starIcon) {
    starIcon.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent modal opening
      const currentStarred = starIcon.textContent === "star";
      const newStarred = !currentStarred;
      
      // Update UI immediately
      starIcon.textContent = newStarred ? "star" : "star_border";
      starIcon.style.color = newStarred ? "var(--color-primary)" : "rgba(255,255,255,0.4)";
      
      // Sync to server
      toggleHistoryStarOnServer(id, newStarred);
    });
  }

  // Attach Image Click to Lightbox
  const imgElement = card.querySelector(".card-image-wrapper img");
  imgElement.addEventListener("click", () => {
    openDetailModalById(id);
  });

  // Attach Copy button logic
  const copyBtn = card.querySelector(".copy-btn-abs");
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(prompt).then(() => {
      copyBtn.innerHTML = '<span class="material-icons-round" style="color:var(--color-success)">done</span>';
      setTimeout(() => {
        copyBtn.innerHTML = '<span class="material-icons-round">content_copy</span>';
      }, 2000);
    });
  });

  // Hide empty state
  emptyState.classList.add("hidden");

  // Prepend to show latest on top
  timelineGrid.insertBefore(card, timelineGrid.firstChild);

  // ギャラリーへの自動追加
  addGalleryItemToUI({
    id,
    loopIndex,
    imageUrl: imgSrc,
    prompt,
    score
  });
}

// Utility to escape HTML strings
function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Add Image to Gallery Grid
function addGalleryItemToUI(data) {
  const { id, loopIndex, imageUrl, prompt, score } = data;
  if (!imageUrl) return;

  const item = document.createElement("div");
  item.className = "gallery-item";
  if (id) item.dataset.galleryId = id;

  item.innerHTML = `
    <div class="gallery-item-badges">
      <span class="gallery-badge-loop">世代 #${loopIndex}</span>
      ${score !== null && score !== undefined ? `<span class="gallery-badge-score">${score}点</span>` : ""}
    </div>
    <img src="${imageUrl}" alt="Gallery image #${loopIndex}" loading="lazy">
    <div class="gallery-item-overlay">
      <div class="gallery-item-overlay-title">${escapeHtml(prompt)}</div>
    </div>
  `;

  // Click handler to open lightbox
  item.addEventListener("click", () => {
    openDetailModalById(id);
  });

  // Hide empty state
  if (galleryEmptyState) {
    galleryEmptyState.classList.add("hidden");
  }

  // Prepend to show latest on top
  if (galleryGrid) {
    galleryGrid.insertBefore(item, galleryGrid.firstChild);
  }
}

// --- ANALYSIS REPORT LOGIC ---

async function updateAnalysisReport() {
  const statsTotalHigh = document.getElementById("stats-total-high");
  const statsMaxScore = document.getElementById("stats-max-score");
  const statsAvgScore = document.getElementById("stats-avg-score");
  const analysisGrid = document.getElementById("analysis-grid");
  const analysisEmptyState = document.getElementById("analysis-empty-state");

  if (!analysisGrid) return;

  try {
    const res = await fetch("/api/history");
    if (!res.ok) return;

    const history = await res.json();
    if (!Array.isArray(history)) return;

    // Filter score >= 90
    const highScores = history.filter(entry => entry.score !== null && entry.score !== undefined && entry.score >= 90);

    if (highScores.length === 0) {
      if (statsTotalHigh) statsTotalHigh.textContent = "0";
      if (statsMaxScore) statsMaxScore.textContent = "N/A";
      if (statsAvgScore) statsAvgScore.textContent = "N/A";
      
      analysisGrid.innerHTML = "";
      if (analysisEmptyState) {
        analysisGrid.appendChild(analysisEmptyState);
        analysisEmptyState.classList.remove("hidden");
      }
      return;
    }

    // Hide empty state
    if (analysisEmptyState) {
      analysisEmptyState.classList.add("hidden");
    }

    // Calculate overall stats
    const scores = highScores.map(e => e.score);
    const totalHighCount = highScores.length;
    const maxScore = Math.max(...scores);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalHighCount);

    if (statsTotalHigh) statsTotalHigh.textContent = totalHighCount;
    if (statsMaxScore) statsMaxScore.textContent = `${maxScore}点`;
    if (statsAvgScore) statsAvgScore.textContent = `${avgScore}点`;

    // Group by Checkpoint
    const groups = {};
    highScores.forEach(entry => {
      const model = entry.checkpoint || "Unknown Model";
      if (!groups[model]) {
        groups[model] = [];
      }
      groups[model].push(entry);
    });

    // Render group cards
    analysisGrid.innerHTML = "";
    Object.entries(groups).forEach(([modelName, entries]) => {
      // Calculate average parameters
      const count = entries.length;
      const sumCfg = entries.reduce((sum, e) => sum + (e.cfgScale || 7.5), 0);
      const sumSteps = entries.reduce((sum, e) => sum + (e.steps || 25), 0);
      const sumClip = entries.reduce((sum, e) => sum + (e.clipSkip || 2), 0);

      const avgCfg = Number((sumCfg / count).toFixed(1));
      const avgSteps = Math.round(sumSteps / count);
      const avgClip = Math.round(sumClip / count);

      // Extract high frequency tokens (Excluding raw <lora:...> tags from positive prompts)
      const rawPositives = entries.map(e => e.prompt || "");
      const positivesWithoutLoras = rawPositives.map(p => p.replace(/<lora:[^>]+>/gi, ""));
      const negatives = entries.map(e => e.negativePrompt || "");

      const topPositives = extractFrequentTokens(positivesWithoutLoras, 10);
      const topNegatives = extractFrequentTokens(negatives, 5);

      // Extract high frequency LoRAs
      const topLoras = extractFrequentLoras(rawPositives, 5);

      const card = document.createElement("div");
      card.className = "model-analysis-card glass-panel";

      // Tag chips HTML
      const positiveChipsHTML = topPositives.map(t => `<span class="analysis-tag-chip">${escapeHtml(t)}</span>`).join("");
      const negativeChipsHTML = topNegatives.map(t => `<span class="analysis-tag-chip negative">${escapeHtml(t)}</span>`).join("");
      const loraChipsHTML = topLoras.map(l => `
        <span class="analysis-tag-chip" style="background-color: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: #34d399;">
          ${escapeHtml(l.name)} (${l.weight})
        </span>
      `).join("");

      card.innerHTML = `
        <h3 title="${escapeHtml(modelName)}">${escapeHtml(modelName.split(/[\\/]/).pop())}</h3>
        
        <div class="analysis-params">
          <div class="analysis-param-box">
            <div class="analysis-param-label">CFG Scale</div>
            <div class="analysis-param-val">${avgCfg}</div>
          </div>
          <div class="analysis-param-box">
            <div class="analysis-param-label">Steps</div>
            <div class="analysis-param-val">${avgSteps}</div>
          </div>
          <div class="analysis-param-box">
            <div class="analysis-param-label">Clip Skip</div>
            <div class="analysis-param-val">${avgClip}</div>
          </div>
        </div>

        <div class="analysis-prompts">
          <div class="analysis-prompt-title">推奨ポジティブタグ (頻出順)</div>
          <div class="analysis-tags-list">
            ${positiveChipsHTML || '<span style="font-size:11px;opacity:0.5;">データなし</span>'}
          </div>
        </div>

        <div class="analysis-prompts" style="margin-top: 8px;">
          <div class="analysis-prompt-title">推奨 LoRA (推奨適用強度)</div>
          <div class="analysis-tags-list">
            ${loraChipsHTML || '<span style="font-size:11px;opacity:0.5;">適用なし</span>'}
          </div>
        </div>

        <div class="analysis-prompts" style="margin-top: 8px;">
          <div class="analysis-prompt-title">推奨ネガティブタグ (頻出順)</div>
          <div class="analysis-tags-list">
            ${negativeChipsHTML || '<span style="font-size:11px;opacity:0.5;">データなし</span>'}
          </div>
        </div>

        <div class="analysis-card-footer">
          <button class="btn btn-primary btn-sm apply-analysis-btn" style="width: 100%;">
            <span class="material-icons-round" style="font-size:16px;">tune</span> 推奨設定を適用
          </button>
        </div>
      `;

      // Event listener for apply button
      const applyBtn = card.querySelector(".apply-analysis-btn");
      if (applyBtn) {
        applyBtn.addEventListener("click", () => {
          applyModelAnalysisSettings(modelName, avgCfg, avgSteps, topPositives, topNegatives, topLoras);
        });
      }

      analysisGrid.appendChild(card);
    });

  } catch (err) {
    console.error("Failed to update analysis report:", err);
  }
}

// Token frequency analyzer helper
function extractFrequentTokens(promptsArray, limit = 10) {
  const counts = {};
  promptsArray.forEach(p => {
    if (!p) return;
    const tokens = p.split(",").map(t => t.trim()).filter(t => t.length > 0);
    tokens.forEach(token => {
      // 簡易的な小文字化で重複排除
      const cleanToken = token.toLowerCase();
      counts[cleanToken] = (counts[cleanToken] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
    .slice(0, limit)
    .map(entry => entry[0]); // Return the tokens
}

// LoRA tags frequency & weight analyzer helper
function extractFrequentLoras(promptsArray, limit = 5) {
  const counts = {};
  const weights = {};

  promptsArray.forEach(p => {
    if (!p) return;
    const matches = p.matchAll(/<lora:([^:]+):([^>]+)>/gi);
    for (const match of matches) {
      const name = match[1].trim();
      const weight = parseFloat(match[2]);
      if (!isNaN(weight)) {
        counts[name] = (counts[name] || 0) + 1;
        if (!weights[name]) weights[name] = [];
        weights[name].push(weight);
      }
    }
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
    .slice(0, limit)
    .map(([name, count]) => {
      const avgWeight = weights[name].reduce((sum, w) => sum + w, 0) / count;
      return {
        name: name,
        weight: Number(avgWeight.toFixed(2))
      };
    });
}

// Apply recommended model parameters and LoRA to UI controls
function applyModelAnalysisSettings(checkpoint, cfg, steps, positives, negatives, loras) {
  // 1. Checkpoint Selection
  const selectCheckpoint = document.getElementById("select-checkpoint");
  if (selectCheckpoint) {
    // 候補の中に部分一致、または完全一致するものがあれば選択
    let matched = false;
    for (let opt of selectCheckpoint.options) {
      if (opt.value === checkpoint || opt.value.endsWith(checkpoint) || checkpoint.endsWith(opt.value)) {
        selectCheckpoint.value = opt.value;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // リストにない場合は動的に追加
      const opt = document.createElement("option");
      opt.value = checkpoint;
      opt.textContent = checkpoint;
      selectCheckpoint.appendChild(opt);
      selectCheckpoint.value = checkpoint;
    }
  }

  // 2. CFG Scale
  if (inputCfgScale && valCfgScale) {
    inputCfgScale.value = cfg;
    valCfgScale.textContent = cfg;
    localStorage.setItem(STORAGE_KEY_CFG_SCALE, cfg);
  }

  // 3. Steps
  if (inputSteps && valSteps) {
    inputSteps.value = steps;
    valSteps.textContent = steps;
    localStorage.setItem(STORAGE_KEY_STEPS, steps);
  }

  // 4. Prompts (Apply frequent positives + LoRAs to input)
  if (positives && positives.length > 0) {
    let combinedPrompt = positives.join(", ");
    if (loras && loras.length > 0) {
      const loraString = loras.map(l => `<lora:${l.name}:${l.weight}>`).join(", ");
      combinedPrompt = combinedPrompt ? `${combinedPrompt}, ${loraString}` : loraString;
    }
    initialPromptInput.value = combinedPrompt;
    localStorage.setItem(STORAGE_KEY_INITIAL_PROMPT, combinedPrompt);
  }

  // Switch back to Workspace Tab
  const workspaceTabBtn = document.querySelector('[data-target="workspace-tab"]');
  if (workspaceTabBtn) {
    workspaceTabBtn.click();
  }

  // Visual feedback (Highlight sidebar)
  const sidebar = document.querySelector(".sidebar-scroll");
  if (sidebar) {
    sidebar.style.transition = "box-shadow 0.3s ease";
    sidebar.style.boxShadow = "0 0 20px rgba(139, 92, 246, 0.8)";
    setTimeout(() => {
      sidebar.style.boxShadow = "";
    }, 1000);
  }
}

// --- METADATA EXPLORER LOGIC ---

async function openDetailModalById(id) {
  if (!id) return;
  activeModalEntryId = id;
  try {
    const res = await fetch("/api/history");
    if (!res.ok) return;
    const history = await res.json();
    const entry = history.find(e => e.id === id);
    if (!entry) return;

    // Bind Image
    modalImg.src = `/api/history/image/${entry.id}`;

    // Bind Metadata Labels
    if (modalMetaScore) modalMetaScore.textContent = entry.score !== null && entry.score !== undefined ? `${entry.score}点` : "未評価";
    if (modalMetaLoop) modalMetaLoop.textContent = `#${entry.loopIndex}`;
    if (modalMetaCheckpoint) modalMetaCheckpoint.textContent = entry.checkpoint || "未指定 (現在の適用モデル)";
    if (modalMetaVae) modalMetaVae.textContent = entry.vae || "自動選択 / プリセット優先";
    if (modalMetaCfg) modalMetaCfg.textContent = entry.cfgScale !== undefined ? entry.cfgScale : "7.5";
    if (modalMetaSteps) modalMetaSteps.textContent = entry.steps !== undefined ? entry.steps : "25";

    // Bind AI Nodes Control status
    if (modalMetaNodes) {
      modalMetaNodes.innerHTML = "";
      const nodes = entry.suggestedNodes;
      if (nodes && (nodes.face_detailer || nodes.hand_detailer || nodes.hires_fix || nodes.controlnet || nodes.upscaler)) {
        if (nodes.face_detailer) {
          modalMetaNodes.innerHTML += `<span class="meta-pill" style="border-color: #f43f5e; color: #f43f5e; background: rgba(244, 63, 94, 0.05); font-size:11px; padding: 2px 6px; border: 1px solid; border-radius: 4px; display: inline-flex; align-items: center; gap: 2px; margin-right: 4px;"><span class="material-icons-round" style="font-size:12px;">face</span>Face: ON</span>`;
        }
        if (nodes.hand_detailer) {
          modalMetaNodes.innerHTML += `<span class="meta-pill" style="border-color: #fbbf24; color: #fbbf24; background: rgba(251, 191, 36, 0.05); font-size:11px; padding: 2px 6px; border: 1px solid; border-radius: 4px; display: inline-flex; align-items: center; gap: 2px; margin-right: 4px;"><span class="material-icons-round" style="font-size:12px;">front_hand</span>Hand: ON</span>`;
        }
        if (nodes.hires_fix) {
          modalMetaNodes.innerHTML += `<span class="meta-pill" style="border-color: #8b5cf6; color: #8b5cf6; background: rgba(139, 92, 246, 0.05); font-size:11px; padding: 2px 6px; border: 1px solid; border-radius: 4px; display: inline-flex; align-items: center; gap: 2px; margin-right: 4px;"><span class="material-icons-round" style="font-size:12px;">high_quality</span>Hires: ON</span>`;
        }
        if (nodes.controlnet) {
          modalMetaNodes.innerHTML += `<span class="meta-pill" style="border-color: #3b82f6; color: #3b82f6; background: rgba(59, 130, 246, 0.05); font-size:11px; padding: 2px 6px; border: 1px solid; border-radius: 4px; display: inline-flex; align-items: center; gap: 2px; margin-right: 4px;"><span class="material-icons-round" style="font-size:12px;">link</span>ControlNet: ON</span>`;
        }
        if (nodes.upscaler) {
          modalMetaNodes.innerHTML += `<span class="meta-pill" style="border-color: #10b981; color: #10b981; background: rgba(16, 185, 129, 0.05); font-size:11px; padding: 2px 6px; border: 1px solid; border-radius: 4px; display: inline-flex; align-items: center; gap: 2px; margin-right: 4px;"><span class="material-icons-round" style="font-size:12px;">grid_view</span>Upscaler: ON</span>`;
        }
      } else {
        modalMetaNodes.innerHTML = `<span style="font-size: 11px; color: var(--color-text-muted);">追加ノードなし / Bypass</span>`;
      }
    }

    // Bind Prompts
    if (modalPromptText) modalPromptText.textContent = entry.prompt || "";
    if (modalNegPromptText) modalNegPromptText.textContent = entry.negativePrompt || "（なし）";

    // Setup Copy Button
    if (modalCopyBtn) {
      modalCopyBtn.onclick = () => {
        navigator.clipboard.writeText(entry.prompt || "").then(() => {
          modalCopyBtn.innerHTML = '<span class="material-icons-round">done</span> コピーしました！';
          setTimeout(() => {
            modalCopyBtn.innerHTML = '<span class="material-icons-round">content_copy</span> コピー';
          }, 2000);
        });
      };
    }

    // Setup Apply Button
    if (modalApplyBtn) {
      modalApplyBtn.onclick = () => {
        applyModelAnalysisSettings(
          entry.checkpoint,
          entry.cfgScale || 7.5,
          entry.steps || 25,
          entry.prompt ? entry.prompt.split(",").map(t => t.trim()) : [],
          entry.negativePrompt ? entry.negativePrompt.split(",").map(t => t.trim()) : [],
          []
        );
        imageModal.classList.add("hidden");
      };
    }

    // Setup Star Status in Modal
    if (modalStarIcon) {
      const isStarred = !!entry.userStarred;
      modalStarIcon.textContent = isStarred ? "star" : "star_border";
      modalStarIcon.style.color = isStarred ? "var(--color-primary)" : "var(--color-text-muted)";
    }

    // Setup Star Button click handler
    if (modalStarBtn) {
      modalStarBtn.onclick = () => {
        const isStarred = modalStarIcon.textContent === "star";
        const newStarred = !isStarred;
        
        // Update Modal UI
        modalStarIcon.textContent = newStarred ? "star" : "star_border";
        modalStarIcon.style.color = newStarred ? "var(--color-primary)" : "var(--color-text-muted)";
        
        // Update Timeline Card UI if present
        const timelineCard = document.querySelector(`[data-history-id="${id}"]`);
        if (timelineCard) {
          const cardStarIcon = timelineCard.querySelector(".card-star-icon");
          if (cardStarIcon) {
            cardStarIcon.textContent = newStarred ? "star" : "star_border";
            cardStarIcon.style.color = newStarred ? "var(--color-primary)" : "rgba(255,255,255,0.4)";
          }
        }
        
        // Sync to server
        toggleHistoryStarOnServer(id, newStarred);
      };
    }

    // Show Modal
    imageModal.classList.remove("hidden");

  } catch (err) {
    console.error("Failed to open detail modal:", err);
  }
}

async function renderMetadataTable() {
  if (!metadataTableBody) return;
  
  try {
    const res = await fetch("/api/history");
    if (!res.ok) return;
    const history = await res.json();
    if (!Array.isArray(history)) return;
    
    metadataTableBody.innerHTML = "";
    
    if (history.length === 0) {
      metadataTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px; color: var(--color-text-muted);">
            データがありません
          </td>
        </tr>
      `;
      return;
    }
    
    const sorted = [...history].reverse();
    
    sorted.forEach(entry => {
      const tr = document.createElement("tr");
      
      const checkpointClean = entry.checkpoint ? entry.checkpoint.split(/[\\/]/).pop() : "現在の適用モデル";
      const promptSnippet = entry.prompt ? entry.prompt : "";
      
      tr.innerHTML = `
        <td style="padding: 12px 16px; font-weight: 500;">#${entry.loopIndex}</td>
        <td style="padding: 12px 16px; font-weight: 600; color: var(--color-primary);">${entry.score !== null && entry.score !== undefined ? entry.score + '点' : '-'}</td>
        <td class="model-cell" style="padding: 12px 16px;" title="${escapeHtml(entry.checkpoint || '')}">${escapeHtml(checkpointClean)}</td>
        <td style="padding: 12px 16px;">${entry.cfgScale !== undefined ? entry.cfgScale : '7.5'}</td>
        <td style="padding: 12px 16px;">${entry.steps !== undefined ? entry.steps : '25'}</td>
        <td class="prompt-cell" style="padding: 12px 16px;" title="${escapeHtml(promptSnippet)}">${escapeHtml(promptSnippet)}</td>
        <td style="padding: 12px 16px; text-align: center;">
          <button class="btn btn-secondary btn-xs view-btn" style="padding: 2px 8px; font-size: 11px;">
            <span class="material-icons-round" style="font-size:14px; vertical-align: middle;">visibility</span> 表示
          </button>
        </td>
      `;
      
      tr.addEventListener("click", () => {
        openDetailModalById(entry.id);
      });
      
      metadataTableBody.appendChild(tr);
    });
    
  } catch (err) {
    console.error("Failed to render metadata table:", err);
  }
}

// Toggle display of engine-specific settings panels
function toggleEngineSettingsPanel(engine) {
  const panelSd = document.getElementById("panel-sd-webui-settings");
  const panelComfy = document.getElementById("panel-comfyui-settings");
  
  if (engine === "sd-webui") {
    if (panelSd) panelSd.classList.remove("hidden");
    if (panelComfy) panelComfy.classList.add("hidden");
  } else if (engine === "comfyui") {
    if (panelSd) panelSd.classList.add("hidden");
    if (panelComfy) panelComfy.classList.remove("hidden");
  }
}

// Toggle History Star Status on Server
async function toggleHistoryStarOnServer(id, starred) {
  if (!id) return;
  try {
    const res = await fetch("/api/history/star", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userStarred: starred })
    });
    if (!res.ok) {
      console.error("Failed to update star status on server");
    }
  } catch (err) {
    console.error("Error toggling star on server:", err);
  }
}

// --- X (Twitter) SHARE ASSISTANT LOGIC ---
async function openXShareModal(id) {
  if (!id) return;
  try {
    // Show modal and set preview
    xSharePreviewImg.src = `/api/history/image/${id}`;
    xShareTextarea.value = "AIによる紹介テキストを生成中...";
    xShareModal.classList.remove("hidden");
    
    // Fetch AI draft
    const res = await fetch("/api/ai/tweet-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    
    if (res.ok) {
      const data = await res.json();
      xShareTextarea.value = data.draftText || "";
    } else {
      const err = await res.json();
      xShareTextarea.value = `紹介文の自動生成に失敗しました: ${err.error || "APIエラー"}\n\n自分でテキストを入力して投稿できます！`;
    }
  } catch (err) {
    console.error("X share modal open error:", err);
    xShareTextarea.value = `紹介文の自動生成に失敗しました: ${err.message}\n\n自分でテキストを入力して投稿できます！`;
  }
}

// Helper to copy image blob to clipboard (works on Chrome/Firefox/Safari)
async function copyImageToClipboard(srcUrl) {
  try {
    const response = await fetch(srcUrl);
    const blob = await response.blob();
    
    let pngBlob = blob;
    if (blob.type !== "image/png") {
      // Convert non-PNG images to PNG using canvas (required by Clipboard API)
      pngBlob = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Canvas conversion to PNG failed."));
          }, "image/png");
        };
        img.onerror = () => reject(new Error("Image load failed for clipboard copy."));
        img.src = srcUrl;
      });
    }

    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": pngBlob
      })
    ]);
    return true;
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    return false;
  }
}
