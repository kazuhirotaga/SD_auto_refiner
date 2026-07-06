const dns = require("dns");
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs");

// Load Environment Variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10100;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(path.join(__dirname, "public"), {
  setHeaders: (res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  }
}));

// Load Prompt Dictionary
const promptDictPath = path.join(__dirname, "prompt_dictionary.json");
let promptDictionary = { positive_categories: [], negative_categories: [] };
if (fs.existsSync(promptDictPath)) {
  try {
    promptDictionary = JSON.parse(fs.readFileSync(promptDictPath, "utf8"));
  } catch (err) {
    console.error("Error parsing prompt_dictionary.json:", err);
  }
}

const DYNAMIC_THEME_HINTS = [
  "夕暮れ時の淡い黄金色の光 (soft warm sunset lighting / golden hour mood)",
  "サイバーパンクなネオンの輝きと雨の反射 (cyberpunk neon glows, wet street reflections, cyberpunk mood)",
  "映画のワンシーンのような極めて劇的な逆光と陰影 (cinematic rim lighting, dramatic high-contrast shadows)",
  "淡く優しい夢のようなパステルカラー調 (pastel color palette, dreamy soft focus, fantasy tone)",
  "緑豊かな神秘的な森と差し込む木漏れ日 (lush mystical forest background, sunbeams filtering through leaves)",
  "ヴィンテージ感のあるどこか懐かしいレトロな色調 (vintage retro color grading, nostalgic warm filter)",
  "未来的な近未来都市のスカイライン (futuristic sci-fi cityscape background, holographic displays)",
  "夜のきらびやかな都会の夜景と玉ボケ (sparkling night cityscape bokeh background, soft city lights)",
  "ダイナミックなアクションを感じさせる生き生きとしたひねりのきいたポーズ (dynamic action pose, twisted torso, sense of motion)",
  "自信に満ちた腕を組んだ立ち姿 (confident standing pose, crossed arms, looking at viewer)",
  "静寂を感じさせる、少し俯き加減で髪が流れているポーズ (contemplative downward gaze, wind-blown flowing hair, peaceful pose)",
  "アンティークで豪華な宮殿の内装 (ornate baroque palace interior background, gold accents, crystal chandelier)",
  "広大な雲海と抜けるような青空 (vast sea of clouds background, bright blue sky, high altitude feel)",
  "水彩画のような繊細で美しいにじみ表現 (delicate watercolor splashes, artistic paint bleeding texture)"
];

// Data directory paths
const DATA_DIR = path.join(__dirname, "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const SESSION_FILE = path.join(DATA_DIR, "session.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// Auto-create data directories on startup
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, "[]", "utf8");
}

// Helper to read settings
function readSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return {};
    }
    const data = fs.readFileSync(SETTINGS_FILE, "utf8");
    return JSON.parse(data || "{}");
  } catch (err) {
    return {};
  }
}

// Helper to write settings
function writeSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}

// Mask API Key
function maskKey(key) {
  if (!key) return "";
  if (key.length <= 8) return "********";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

// Helper to get SD WebUI URL
const getSdUrl = (req) => {
  const settings = readSettings();
  const headerUrl = req ? req.headers["x-sd-url"] : null;
  return headerUrl || settings.sd_webui_url || process.env.SD_WEBUI_URL || "http://127.0.0.1:7860";
};

// --- STABLE DIFFUSION API PROXIES ---

// Get Current Options (CORS対策プロキシ用)
app.get("/api/sd/options", async (req, res) => {
  const sdUrl = getSdUrl(req);
  try {
    const response = await axios.get(`${sdUrl}/sdapi/v1/options`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching SD options:", error.message);
    res.status(503).json({ error: "Stable Diffusion WebUI options unreachable.", details: error.message });
  }
});

// Get Available Checkpoints
app.get("/api/sd/checkpoints", async (req, res) => {
  const sdUrl = getSdUrl(req);
  try {
    const response = await axios.get(`${sdUrl}/sdapi/v1/sd-models`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching SD checkpoints:", error.message);
    res.status(503).json({ error: "Stable Diffusion WebUI is not running or unreachable.", details: error.message });
  }
});

// Get Available VAEs
app.get("/api/sd/vaes", async (req, res) => {
  const sdUrl = getSdUrl(req);
  try {
    const response = await axios.get(`${sdUrl}/sdapi/v1/sd-vae`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching SD VAEs, returning fallback empty list:", error.message);
    // VAE取得エンドポイントが無い・404の場合は例外にせず空配列を返す
    res.json([]);
  }
});

// Get Available Text Encoders
app.get("/api/sd/text-encoders", async (req, res) => {
  const sdUrl = getSdUrl(req);
  try {
    const response = await axios.get(`${sdUrl}/sdapi/v1/text-encoders`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    // ない場合は安全に空配列を返す
    res.json([]);
  }
});

// Get Available LoRAs
app.get("/api/sd/loras", async (req, res) => {
  const sdUrl = getSdUrl(req);
  try {
    const response = await axios.get(`${sdUrl}/sdapi/v1/loras`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching SD LoRAs:", error.message);
    // Some older versions might not support /loras, fallback to empty array
    res.json([]);
  }
});

// Get Available Upscalers
app.get("/api/sd/upscalers", async (req, res) => {
  const sdUrl = getSdUrl(req);
  try {
    const response = await axios.get(`${sdUrl}/sdapi/v1/upscalers`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching SD upscalers:", error.message);
    res.json([]);
  }
});

// Get Available Embeddings
app.get("/api/sd/embeddings", async (req, res) => {
  const sdUrl = getSdUrl(req);
  try {
    const response = await axios.get(`${sdUrl}/sdapi/v1/embeddings`, { timeout: 5000 });
    // Normalize response
    const embeddings = response.data.loaded ? Object.keys(response.data.loaded) : [];
    res.json(embeddings);
  } catch (error) {
    console.error("Error fetching SD Embeddings:", error.message);
    res.json([]);
  }
});

// Generate Image (Options change + txt2img)
app.post("/api/sd/generate", async (req, res) => {
  const sdUrl = getSdUrl(req);
  const {
    prompt,
    negative_prompt,
    checkpoint,
    vae,
    text_encoder,
    forge_preset,
    clip_skip,
    width = 512,
    height = 512,
    steps = 20,
    cfg_scale = 7,
    sampler_name = "Euler a",
    seed = -1,
    enable_hr = false,
    hr_upscaler = "Latent",
    hr_second_pass_steps = 15,
    denoising_strength = 0.55,
    hr_scale = 1.5
  } = req.body;

  // Set response headers to enable streaming and keep connection alive
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Transfer-Encoding", "chunked");

  // Send a dummy space character every 10 seconds to prevent proxy (LocalTunnel) timeouts
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(" ");
    } catch (err) {
      console.warn("Failed to send keep-alive space, client might have disconnected:", err.message);
    }
  }, 10000);

  try {
    const currentOptionsRes = await axios.get(`${sdUrl}/sdapi/v1/options`);
    const currentOptions = currentOptionsRes.data;

    // Phase 1: Apply forge_preset if specified
    if (forge_preset && currentOptions.forge_preset !== forge_preset) {
      console.log("Phase 1: Applying forge_preset:", forge_preset);
      await axios.post(`${sdUrl}/sdapi/v1/options`, { forge_preset });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Phase 2: Apply sd_model_checkpoint if changed
    if (checkpoint && currentOptions.sd_model_checkpoint !== checkpoint) {
      console.log("Phase 2: Applying sd_model_checkpoint:", checkpoint);
      await axios.post(`${sdUrl}/sdapi/v1/options`, { sd_model_checkpoint: checkpoint });
      
      // Wait for model load with timeout
      console.log("Waiting for checkpoint load to complete...");
      let loaded = false;
      const maxRetries = 150;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const checkRes = await axios.get(`${sdUrl}/sdapi/v1/options`);
          if (checkRes.data.sd_model_checkpoint === checkpoint) {
            console.log(`Checkpoint loaded successfully on attempt ${attempt}`);
            loaded = true;
            break;
          }
        } catch (e) {
          console.error("Error checking options during model load:", e.message);
        }
      }
      if (!loaded) {
        console.warn("Timed out waiting for checkpoint load to complete. Proceeding anyway.");
      }
    }

    // Phase 3: Apply VAE / Text Encoder & CLIP Skip
    const optionsToUpdate = {};
    const additionalModules = [];

    let finalVae = vae;
    let finalTE = text_encoder;

    if (checkpoint && checkpoint.toLowerCase().includes("anima_basev10")) {
      console.log("Auto-correcting VAE and Text Encoder for Anima model to prevent VAE state dict Assertion Error.");
      finalVae = "qwen_image_vae.safetensors";
      finalTE = "qwen_3_06b_base.safetensors";
    }

    if (finalVae && finalVae !== "Automatic") {
      additionalModules.push(finalVae);
    }
    if (finalTE) {
      additionalModules.push(finalTE);
    }

    if (additionalModules.length > 0) {
      optionsToUpdate.forge_additional_modules = additionalModules;
    } else if (vae === "Automatic" || !vae) {
      optionsToUpdate.forge_additional_modules = [];
    }

    if (clip_skip && currentOptions.CLIP_stop_at_last_layers !== clip_skip) {
      optionsToUpdate.CLIP_stop_at_last_layers = clip_skip;
    }

    if (Object.keys(optionsToUpdate).length > 0) {
      console.log("Phase 3: Switching SD Options:", optionsToUpdate);
      await axios.post(`${sdUrl}/sdapi/v1/options`, optionsToUpdate);
    }

    // 2. Request Image Generation
    console.log("Generating Image with Prompt:", prompt);
    const generatePayload = {
      prompt,
      negative_prompt,
      steps,
      cfg_scale,
      width,
      height,
      sampler_name,
      seed,
      enable_hr,
      hr_upscaler,
      hr_second_pass_steps,
      denoising_strength,
      hr_scale,
      override_settings_restore_afterwards: false
    };

    const genResponse = await axios.post(`${sdUrl}/sdapi/v1/txt2img`, generatePayload, { timeout: 600000 });
    
    // Stop keep alive interval
    clearInterval(keepAliveInterval);

    if (genResponse.data && genResponse.data.images && genResponse.data.images.length > 0) {
      const resultData = {
        image: genResponse.data.images[0],
        info: JSON.parse(genResponse.data.info)
      };
      res.write(JSON.stringify(resultData));
      res.end();
    } else {
      if (!res.headersSent) res.status(500);
      res.write(JSON.stringify({ error: "No image returned from SD WebUI." }));
      res.end();
    }

  } catch (error) {
    clearInterval(keepAliveInterval);
    const errorDetails = error.response && error.response.data ? error.response.data : error.message;
    console.error("Error during generation process:", errorDetails);
    if (!res.headersSent) res.status(500);
    res.write(JSON.stringify({
      error: "Failed to apply options or generate image.",
      details: typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : errorDetails
    }));
    res.end();
  }
});

// --- AI PROVIDER REFINE API ---

app.get("/api/prompt-dictionary", (req, res) => {
  res.json(promptDictionary);
});

app.post("/api/ai/refine", async (req, res) => {
  const {
    provider,
    apiKey,
    goal,
    currentPrompt,
    currentNegativePrompt,
    currentCheckpoint, // 追加: 現在アクティブなモデル名
    currentCfgScale,   // 追加: 現在のCFG Scale
    currentSteps,      // 追加: 現在のSteps
    imageBase64,
    referenceImageBase64, // 追加: 参考画像
    selectedQualityTags = [],
    availableLoras = [],
    availableUpscalers = [],
    excludedTags
  } = req.body;

  // Retrieve API Key (from request or environment variable)
  const resolvedApiKey = apiKey || getEnvApiKey(provider);

  if (!resolvedApiKey) {
    return res.status(400).json({ error: `API Key for ${provider} is missing. Please set it in settings or .env file.` });
  }

  if (!imageBase64) {
    return res.status(400).json({ error: "Image data is required for Vision evaluation." });
  }

  // Build Prompts
  const systemPrompt = `You are an expert Stable Diffusion prompt engineer and image critic.
Your goal is to evaluate the generated image against the user's TARGET GOAL and refine the prompt (both positive and negative) and settings to make the next generation closer to the goal.

You MUST respond in valid JSON format ONLY. Do not include markdown code block syntax (like \`\`\`json) in your raw response text. The JSON must follow this exact structure:
{
  "score": <number between 1 and 100 representing how close the image is to the goal>,
  "feedback": {
    "positives": ["what went well based on the goal"],
    "improvements": ["what needs to be improved to reach the goal"]
  },
  "next_prompt": "refined positive prompt",
  "next_negative_prompt": "refined negative prompt",
  "suggested_clip_skip": <number 1 or 2, default is 2 for SD 1.5, 1 for SDXL/Illustrious>,
  "suggested_cfg_scale": <number, typically between 4.0 and 12.0. Lower values (4.0-6.0) for more creative freedom or when the image feels over-saturated/burnt/deep fried. Higher values (8.0-12.0) if the image ignores the prompt instruction or needs stricter adherence to the goal>,
  "suggested_steps": <number, typically between 20 and 40. Increase steps if the image lacks details, texture, or feels incomplete/noisy. Decrease steps if generating simple styles or to save time>,
  "suggested_hires_fix": {
    "enable": <boolean>,
    "upscaler": <string, exact name from available upscalers, or "Latent">,
    "denoising_strength": <number, 0.3 to 0.85 depending on how much change is needed>,
    "upscale_by": <number, default 1.5>,
    "steps": <number, 10 to 25>
  },
  "suggested_nodes": {
    "face_detailer": <boolean, set true if character face/expression looks deformed, distorted, blurry or low quality and needs face reconstruction/refining>,
    "controlnet": <boolean, set true if character pose, outlines, or composition is unstable/incorrect relative to goal>,
    "upscaler": <boolean, set true if overall image texture is blurry, noisy, or lacks micro-details>
  }
}

Guidance for prompt engineering & SD settings:
1. Ensure the core subject remains intact.
2. If prompt weight modifiers are needed, use (keyword:weight) syntax, e.g. (neon glow:1.2).
3. Quality tags reference: Use the quality dictionary concept (e.g. masterpiece, best quality, ultra detailed) to boost quality, adjusted for style (anime, photorealistic, cinematic).
4. If available Loras are provided below, you can include them in the next_prompt using "<lora:LORANAME:weight>" syntax. Only use LORAs from the provided list.
5. Identify the style and architecture of the active model:
   - For SD 1.5 anime models (like anima_base): set suggested_clip_skip to 2.
   - For SDXL / Illustrious models (like Illustrious Anime Blend): set suggested_clip_skip to 1.
6. Evaluate if the image is blurry, lacks detail, or explicitly needs higher resolution. If so, set suggested_hires_fix.enable to true and suggest a suitable upscaler and denoising strength:
   - Use the list of available upscalers for selecting a correct upscaler name.
   - Adjust denoising_strength (typically 0.3 to 0.85) based on how much change is acceptable (lower values preserve more structure, higher values add more new details but might change the scene).
   - If hires fix is not needed or the image is already sharp and clear, set suggested_hires_fix.enable to false.
7. Evaluate if the image is over-saturated, has high contrast artifacts (burnt colors), or lacks creative flow. If so, decrease suggested_cfg_scale. If the image completely ignores certain core keywords in the TARGET GOAL, increase suggested_cfg_scale to enforce prompt adherence.
8. Evaluate if the image details are muddy, noisy, or unfinished. If so, increase suggested_steps. If the image is simple or looks solid, you may keep suggested_steps around 25-30.
9. Evaluate if the image would benefit from workflow nodes:
   - set suggested_nodes.face_detailer to true if human faces/eyes look deformed, low-res or ugly.
   - set suggested_nodes.controlnet to true if pose, structure or contours need correction.
   - set suggested_nodes.upscaler to true if image resolution is low or background/detail lines are blurry.`;

  const userPrompt = `### TARGET GOAL
"${goal}"

### CURRENT ACTIVE MODEL (Checkpoint)
"${currentCheckpoint || "Unknown"}"

### CURRENT GENERATION PARAMETERS
- CFG Scale: ${currentCfgScale || 7.5}
- Steps: ${currentSteps || 25}

### CURRENT PROMPT
"${currentPrompt}"

### CURRENT NEGATIVE PROMPT
"${currentNegativePrompt}"

### SELECTED QUALITY TAGS (User Preference)
${selectedQualityTags.length > 0 ? selectedQualityTags.join(", ") : "None"}

### STABLE DIFFUSION RESOURCES
- Available LoRAs: ${JSON.stringify(availableLoras)}
- Available Upscalers: ${JSON.stringify(availableUpscalers)}

Evaluate the attached image. Identify what is missing or incorrect in comparison with the TARGET GOAL.
Propose the next prompt, negative prompt, and settings (CLIP skip, CFG scale, Steps, Hires. fix). Select a suitable upscaler from the Available Upscalers list if Hires. fix is recommended.`;

  try {
    let aiResponseText = "";

    // Modify prompt if reference image is provided
    let resolvedUserPrompt = userPrompt;
    if (referenceImageBase64) {
      resolvedUserPrompt += `\n\n### REFERENCE IMAGE IS PROVIDED\nAn image has been attached by the user as a style and composition reference.\nCompare the GENERATED IMAGE against this REFERENCE IMAGE. Analyze if the style, mood, color palette, lighting, or overall composition aligns with it.\nYour suggestions for the next iteration should attempt to match the style of the REFERENCE IMAGE while satisfying the TARGET GOAL.`;
    }

    if (provider === "openai") {
      aiResponseText = await callOpenAI(resolvedApiKey, systemPrompt, resolvedUserPrompt, imageBase64, referenceImageBase64);
    } else if (provider === "gemini") {
      aiResponseText = await callGemini(resolvedApiKey, systemPrompt, resolvedUserPrompt, imageBase64, referenceImageBase64);
    } else if (provider === "claude") {
      aiResponseText = await callClaude(resolvedApiKey, systemPrompt, resolvedUserPrompt, imageBase64, referenceImageBase64);
    } else if (provider === "grok") {
      aiResponseText = await callGrok(resolvedApiKey, systemPrompt, resolvedUserPrompt, imageBase64, referenceImageBase64);
    } else {
      return res.status(400).json({ error: "Invalid AI Provider specified." });
    }

    // Clean JSON markdown blocks if any
    let cleanedText = aiResponseText.trim();
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error("AI returned invalid JSON:", cleanedText);
      return res.status(500).json({
        error: "AI did not return a valid JSON format.",
        rawResponse: aiResponseText
      });
    }

    // Force Sanitize Excluded Tags on API response
    if (excludedTags && excludedTags.trim() !== "" && parsedResult) {
      const tagsList = excludedTags.split(",").map(t => t.trim()).filter(t => t.length > 0);
      tagsList.forEach(tag => {
        const escapedTag = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedTag}\\b|${escapedTag}`, 'gi');
        
        if (parsedResult.next_prompt) {
          parsedResult.next_prompt = parsedResult.next_prompt
            .replace(regex, "")
            .replace(/,\s*,/g, ",")
            .replace(/^,|,$/g, "")
            .trim();
        }
        if (parsedResult.next_negative_prompt) {
          parsedResult.next_negative_prompt = parsedResult.next_negative_prompt
            .replace(regex, "")
            .replace(/,\s*,/g, ",")
            .replace(/^,|,$/g, "")
            .trim();
        }
      });
    }

    res.json(parsedResult);

  } catch (error) {
    console.error(`Error communicating with ${provider}:`, error.message);
    res.status(500).json({ error: `AI provider error (${provider})`, details: error.message });
  }
});

// Helper: Get API key from environment variables or settings.json
function getEnvApiKey(provider) {
  const settings = readSettings();
  switch (provider) {
    case "openai": return settings.openai_api_key || process.env.OPENAI_API_KEY;
    case "gemini": return settings.gemini_api_key || process.env.GEMINI_API_KEY;
    case "claude": return settings.claude_api_key || process.env.CLAUDE_API_KEY;
    case "grok": return settings.xai_api_key || process.env.XAI_API_KEY;
    default: return null;
  }
}

// Call OpenAI Vision API
async function callOpenAI(apiKey, systemPrompt, userPrompt, imageBase64, referenceImageBase64) {
  const { OpenAI } = require("openai");
  const openai = new OpenAI({ apiKey });

  const contentList = [
    { type: "text", text: userPrompt }
  ];

  // If reference image is provided, append it first
  if (referenceImageBase64) {
    contentList.push({ type: "text", text: "### REFERENCE IMAGE (Style/Composition Target)" });
    contentList.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${referenceImageBase64}` }
    });
  }

  contentList.push({ type: "text", text: "### GENERATED IMAGE (Evaluate this)" });
  contentList.push({
    type: "image_url",
    image_url: { url: `data:image/png;base64,${imageBase64}` }
  });

  const response = await openai.chat.completions.create({
    model: "gpt-5.5", 
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: contentList
      }
    ]
  });

  return response.choices[0].message.content;
}

// Call Google Gemini API
async function callGemini(apiKey, systemPrompt, userPrompt, imageBase64, referenceImageBase64) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({
    model: "gemini-3.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const parts = [
    systemPrompt + "\n\n" + userPrompt
  ];

  if (referenceImageBase64) {
    parts.push("### REFERENCE IMAGE");
    parts.push({
      inlineData: {
        data: referenceImageBase64,
        mimeType: "image/png"
      }
    });
  }

  parts.push("### GENERATED IMAGE");
  parts.push({
    inlineData: {
      data: imageBase64,
      mimeType: "image/png"
    }
  });

  const result = await model.generateContent(parts);

  return result.response.text();
}

// Call Anthropic Claude API
async function callClaude(apiKey, systemPrompt, userPrompt, imageBase64, referenceImageBase64) {
  const Anthropic = require("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey });

  const contentList = [];

  if (referenceImageBase64) {
    contentList.push({ type: "text", text: "### REFERENCE IMAGE (Style/Composition target)" });
    contentList.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: referenceImageBase64
      }
    });
  }

  contentList.push({ type: "text", text: "### GENERATED IMAGE (Evaluate this image)" });
  contentList.push({
    type: "image",
    source: {
      type: "base64",
      media_type: "image/png",
      data: imageBase64
    }
  });

  contentList.push({ type: "text", text: userPrompt });

  const response = await anthropic.messages.create({
    model: "claude-3-7-sonnet-latest", // 最新の Claude 3.7 Sonnet モデル
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: contentList
      }
    ]
  });

  // Claude outputs text block
  return response.content[0].text;
}

// Call xAI Grok Vision API
async function callGrok(apiKey, systemPrompt, userPrompt, imageBase64, referenceImageBase64) {
  const { OpenAI } = require("openai");
  // Grok is OpenAI SDK compatible
  const grok = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.xai.ai/v1"
  });

  const contentList = [
    { type: "text", text: userPrompt }
  ];

  if (referenceImageBase64) {
    contentList.push({ type: "text", text: "### REFERENCE IMAGE (Style/Composition target)" });
    contentList.push({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${referenceImageBase64}` }
    });
  }

  contentList.push({ type: "text", text: "### GENERATED IMAGE (Evaluate this)" });
  contentList.push({
    type: "image_url",
    image_url: { url: `data:image/png;base64,${imageBase64}` }
  });

  const response = await grok.chat.completions.create({
    model: "grok-4.3", // 指定の Grok 4.3 モデル
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: contentList
      }
    ]
  });

  return response.choices[0].message.content;
}

// --- SETTINGS APIs ---

// GET /api/settings - 設定を取得（キーはマスク）
app.get("/api/settings", (req, res) => {
  try {
    const settings = readSettings();
    const currentSettings = {
      openai_api_key: settings.openai_api_key || process.env.OPENAI_API_KEY || "",
      gemini_api_key: settings.gemini_api_key || process.env.GEMINI_API_KEY || "",
      claude_api_key: settings.claude_api_key || process.env.CLAUDE_API_KEY || "",
      xai_api_key: settings.xai_api_key || process.env.XAI_API_KEY || "",
      sd_webui_url: settings.sd_webui_url || process.env.SD_WEBUI_URL || "http://127.0.0.1:7860",
      comfy_api_url: settings.comfy_api_url || process.env.COMFY_API_URL || "http://127.0.0.1:8188",
      generation_engine: settings.generation_engine || "sd-webui"
    };

    res.json({
      openai_api_key: maskKey(currentSettings.openai_api_key),
      gemini_api_key: maskKey(currentSettings.gemini_api_key),
      claude_api_key: maskKey(currentSettings.claude_api_key),
      xai_api_key: maskKey(currentSettings.xai_api_key),
      sd_webui_url: currentSettings.sd_webui_url,
      comfy_api_url: currentSettings.comfy_api_url,
      generation_engine: currentSettings.generation_engine
    });
  } catch (err) {
    console.error("Error reading settings:", err.message);
    res.status(500).json({ error: "Failed to read settings.", details: err.message });
  }
});

// POST /api/settings - 設定を保存
app.post("/api/settings", (req, res) => {
  try {
    const { openai_api_key, gemini_api_key, claude_api_key, xai_api_key, sd_webui_url, comfy_api_url, generation_engine } = req.body;
    const current = readSettings();

    const isMasked = (val) => val && (val.includes("...") || val.includes("***"));

    if (openai_api_key !== undefined && !isMasked(openai_api_key)) {
      current.openai_api_key = openai_api_key;
    }
    if (gemini_api_key !== undefined && !isMasked(gemini_api_key)) {
      current.gemini_api_key = gemini_api_key;
    }
    if (claude_api_key !== undefined && !isMasked(claude_api_key)) {
      current.claude_api_key = claude_api_key;
    }
    if (xai_api_key !== undefined && !isMasked(xai_api_key)) {
      current.xai_api_key = xai_api_key;
    }
    if (sd_webui_url !== undefined) {
      current.sd_webui_url = sd_webui_url;
    }
    if (comfy_api_url !== undefined) {
      current.comfy_api_url = comfy_api_url;
    }
    if (generation_engine !== undefined) {
      current.generation_engine = generation_engine;
    }

    writeSettings(current);
    res.json({ message: "Settings saved successfully." });
  } catch (err) {
    console.error("Error saving settings:", err.message);
    res.status(500).json({ error: "Failed to save settings.", details: err.message });
  }
});

// POST /api/comfy/test - ComfyUI接続テスト & Checkpoint一覧取得
app.post("/api/comfy/test", async (req, res) => {
  const { url } = req.body;
  const targetUrl = url || "http://127.0.0.1:8188";

  try {
    const response = await axios.get(`${targetUrl}/object_info`, { timeout: 5000 });
    const info = response.data;

    let models = [];
    if (info.CheckpointLoaderSimple) {
      models = info.CheckpointLoaderSimple.input.required.ckpt_name[0] || [];
    } else if (info.ImageOnlyCheckpointLoader) {
      models = info.ImageOnlyCheckpointLoader.input.required.ckpt_name[0] || [];
    }

    res.json({
      ok: true,
      models: models,
      modelsCount: models.length
    });
  } catch (err) {
    console.error("ComfyUI connection test failed:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/comfy/resources - ComfyUIの各種リソース（VAEs, LoRAs, Upscalersなど）取得
app.post("/api/comfy/resources", async (req, res) => {
  const { url } = req.body;
  const targetUrl = url || "http://127.0.0.1:8188";

  try {
    const response = await axios.get(`${targetUrl}/object_info`, { timeout: 8000 });
    const info = response.data;

    const ensureArray = (val) => Array.isArray(val) ? val : [];

    const vaes = info.VAELoader ? ensureArray(info.VAELoader.input.required.vae_name[0]) : [];
    const loras = info.LoraLoader ? ensureArray(info.LoraLoader.input.required.lora_name[0]) : [];
    const upscalers = info.UpscaleModelLoader ? ensureArray(info.UpscaleModelLoader.input.required.model_name[0]) : [];
    const textEncoders = info.CLIPLoader ? ensureArray(info.CLIPLoader.input.required.clip_name[0]) : [];

    res.json({
      vaes,
      loras,
      upscalers,
      textEncoders
    });
  } catch (err) {
    console.error("Failed to fetch ComfyUI resources:", err.message);
    res.status(500).json({ error: "Failed to fetch ComfyUI resources.", details: err.message });
  }
});

// --- HISTORY & SESSION APIs ---

// Helper: Read history from file
function readHistory() {
  try {
    const data = fs.readFileSync(HISTORY_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper: Write history to file
function writeHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf8");
}

// Helper: Read session from file
function readSession() {
  try {
    if (!fs.existsSync(SESSION_FILE)) {
      return { active: false };
    }
    const data = fs.readFileSync(SESSION_FILE, "utf8");
    if (!data || data.trim() === "") {
      return { active: false };
    }
    return JSON.parse(data);
  } catch (err) {
    return { active: false };
  }
}

// Helper: Write session to file
function writeSession(session) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), "utf8");
}

// GET /api/history - 履歴メタデータ一覧を返す（画像base64データは含めない）
app.get("/api/history", (req, res) => {
  try {
    const history = readHistory();
    res.json(history);
  } catch (err) {
    console.error("Error reading history:", err.message);
    res.status(500).json({ error: "Failed to read history.", details: err.message });
  }
});

// POST /api/history - 新しい履歴エントリを追加
app.post("/api/history", (req, res) => {
  try {
    const entry = saveHistoryInternal(req.body);
    res.json(entry);
  } catch (err) {
    console.error("Error saving history entry:", err.message);
    res.status(500).json({ error: "Failed to save history entry.", details: err.message });
  }
});

// DELETE /api/history - 履歴を全削除
app.delete("/api/history", (req, res) => {
  try {
    // Reset history.json to empty array
    writeHistory([]);

    // Delete all files in images directory
    if (fs.existsSync(IMAGES_DIR)) {
      const files = fs.readdirSync(IMAGES_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(IMAGES_DIR, file));
      }
    }

    res.json({ message: "History cleared successfully." });
  } catch (err) {
    console.error("Error clearing history:", err.message);
    res.status(500).json({ error: "Failed to clear history.", details: err.message });
  }
});

// DELETE /api/history/cleanup - 低評価かつお気に入り以外の画像を一括クリーンアップ
app.delete("/api/history/cleanup", (req, res) => {
  const scoreThreshold = req.query.threshold !== undefined ? parseInt(req.query.threshold) : 80;

  try {
    const history = readHistory();
    
    // 削除対象エントリと残すエントリに分離
    const toKeep = [];
    const toDelete = [];

    history.forEach(entry => {
      // 判定基準: 
      // 1. お気に入り (userStarred === true) は「必ず残す」
      // 2. お気に入りではなく、かつ「スコアが threshold 未満」または「評価に失敗して score が null」の場合は「削除対象」
      const isStarred = !!entry.userStarred;
      const scoreVal = entry.score;
      const isLowScore = scoreVal === null || scoreVal === undefined || scoreVal < scoreThreshold;

      if (!isStarred && isLowScore) {
        toDelete.push(entry);
      } else {
        toKeep.push(entry);
      }
    });

    // 削除対象の物理ファイルをディスクから削除
    toDelete.forEach(entry => {
      const imagePath = path.join(IMAGES_DIR, `${entry.id}.png`);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (fileErr) {
          console.warn(`Failed to delete image file ${imagePath}:`, fileErr.message);
        }
      }
    });

    // 新しい履歴リストを保存
    writeHistory(toKeep);

    // バックアップを非同期実行
    triggerPcloudBackup();

    res.json({
      message: "Cleanup completed successfully.",
      deletedCount: toDelete.length,
      remainingCount: toKeep.length,
      threshold: scoreThreshold
    });

  } catch (err) {
    console.error("Error cleaning up history:", err.message);
    res.status(500).json({ error: "Failed to cleanup history.", details: err.message });
  }
});

// POST /api/history/star - 履歴エントリのお気に入り状態を更新
app.post("/api/history/star", (req, res) => {
  const { id, userStarred } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing entry ID." });
  }

  try {
    const history = readHistory();
    const entry = history.find(e => e.id === id);
    if (!entry) {
      return res.status(404).json({ error: "History entry not found." });
    }

    entry.userStarred = !!userStarred;
    writeHistory(history);

    res.json({ message: "History entry star status updated.", id, userStarred: entry.userStarred });
  } catch (err) {
    console.error("Error updating star status:", err.message);
    res.status(500).json({ error: "Failed to update star status.", details: err.message });
  }
});

// GET /api/history/image/:id - 画像ファイルを返す
app.get("/api/history/image/:id", (req, res) => {
  const imagePath = path.join(IMAGES_DIR, `${req.params.id}.png`);
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: "Image not found." });
  }
  res.setHeader("Content-Type", "image/png");
  const imageStream = fs.createReadStream(imagePath);
  imageStream.pipe(res);
});

// --- BACKROUND JOB & SESSION CONTROL ---

// Memory storage for active job state
let activeJob = {
  running: false,
  shouldStop: false,
  currentLoop: 0,
  maxLoops: 0,
  statusText: "Idle",
  percent: 0,
  error: null,
  goal: "",
  provider: "",
  imageSize: "512x512",
  useAISdSelection: false,
  useAIParamsSelection: true,
  useAIHiresSelection: true,
  useReferenceImage: false,
  referenceImageBase64: null,
  selectedQualityTags: [],
  currentPrompt: "",
  currentNegativePrompt: "",
  currentCheckpoint: "",
  currentVae: "",
  currentTextEncoder: "",
  currentClipSkip: null,
  currentCfgScale: 7.5,
  currentSteps: 25,
  hrEnabled: false,
  hrUpscaler: "Latent",
  hrScale: 1.5,
  hrDenoise: 0.55,
  hrSteps: 15,
  suggestedNodes: {
    face_detailer: false,
    controlnet: false,
    upscaler: false
  }
};

// Auto-restore last session on server startup (if it was active)
try {
  const diskSession = readSession();
  if (diskSession && diskSession.active) {
    // ディスク上でアクティブだった場合、ジョブ状態を復元（ただしプロセス自体は停止状態から再起動されたため idle/stopped とする）
    activeJob = {
      ...activeJob,
      ...diskSession,
      running: false, // サーバー再起動後は自動では走り出さない
      statusText: "Interrupted (Server restarted)"
    };
  }
} catch (err) {
  console.warn("Failed to load initial session from disk:", err.message);
}

const DEFAULT_COMFY_WORKFLOW = {
  "3": {
    "inputs": {
      "seed": 8566258,
      "steps": 20,
      "cfg": 8,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1,
      "model": ["4", 0],
      "positive": ["6", 0],
      "negative": ["7", 0],
      "latent_image": ["5", 0]
    },
    "class_type": "KSampler"
  },
  "4": {
    "inputs": {
      "ckpt_name": "v1-5-pruned-emaonly.safetensors"
    },
    "class_type": "CheckpointLoaderSimple"
  },
  "5": {
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage"
  },
  "6": {
    "inputs": {
      "text": "masterpiece, best quality, a beautiful girl",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode"
  },
  "7": {
    "inputs": {
      "text": "bad hands, blurry",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode"
  },
  "8": {
    "inputs": {
      "samples": ["3", 0],
      "vae": ["4", 2]
    },
    "class_type": "VAEDecode"
  },
  "9": {
    "inputs": {
      "filename_prefix": "PromptCraft",
      "images": ["8", 0]
    },
    "class_type": "SaveImage"
  }
};

// Helper: Modify ComfyUI Workflow JSON dynamically based on loop parameter refinements
function modifyComfyWorkflow(workflow, params, availableCheckpoints = []) {
  const { prompt, negative_prompt, steps, cfg_scale, width, height, seed, checkpoint, suggested_nodes, sampler_name, scheduler } = params;
  const modified = JSON.parse(JSON.stringify(workflow));

  // --- Auto-reroute CLIPLoader / VAELoader connections to CheckpointLoader ---
  let checkpointLoaderId = null;
  let clipLoaderId = null;
  let vaeLoaderId = null;

  for (const [id, node] of Object.entries(modified)) {
    if (node.class_type === "CheckpointLoaderSimple") {
      checkpointLoaderId = id;
    } else if (node.class_type === "CLIPLoader") {
      clipLoaderId = id;
    } else if (node.class_type === "VAELoader") {
      vaeLoaderId = id;
    }
  }

  let currentWorkflowModel = null;
  for (const [id, node] of Object.entries(modified)) {
    if ((node.class_type === "CheckpointLoaderSimple" || node.class_type === "CheckpointLoader") && node.inputs) {
      currentWorkflowModel = node.inputs.ckpt_name;
      break;
    }
  }

  const isAnimaModel = (checkpoint && checkpoint.toLowerCase().includes("anima")) ||
                       (currentWorkflowModel && currentWorkflowModel.toLowerCase().includes("anima"));

  if (checkpointLoaderId && !isAnimaModel) {
    for (const [id, node] of Object.entries(modified)) {
      if (node.inputs) {
        for (const [inputKey, inputValue] of Object.entries(node.inputs)) {
          if (Array.isArray(inputValue) && inputValue.length >= 2) {
            // Re-route CLIP connections from CLIPLoader -> CheckpointLoader (pin 1)
            if (clipLoaderId && inputValue[0] === clipLoaderId) {
              node.inputs[inputKey] = [checkpointLoaderId, 1];
              console.log(`[Reroute] Node ${id} input ${inputKey} redirected from CLIPLoader(${clipLoaderId}) to CheckpointLoader(${checkpointLoaderId}, 1)`);
            }
            // Re-route VAE connections from VAELoader -> CheckpointLoader (pin 2)
            if (vaeLoaderId && inputValue[0] === vaeLoaderId) {
              node.inputs[inputKey] = [checkpointLoaderId, 2];
              console.log(`[Reroute] Node ${id} input ${inputKey} redirected from VAELoader(${vaeLoaderId}) to CheckpointLoader(${checkpointLoaderId}, 2)`);
            }
          }
        }
      }
    }
  }
  // --------------------------------------------------------------------------

  // --- Auto-Connect (Wired restoration for missing inputs in custom workflows) ---
  let ksamplerNodeId = null;
  let vaeDecodeNodeId = null;
  let saveImageNodeId = null;

  for (const [id, node] of Object.entries(modified)) {
    const cls = node.class_type;
    if (cls === "KSampler") ksamplerNodeId = id;
    else if (cls === "VAEDecode") vaeDecodeNodeId = id;
    else if (cls === "SaveImage") saveImageNodeId = id;
  }

  // 1. KSampler -> MODEL
  if (ksamplerNodeId && modified[ksamplerNodeId]) {
    const ksampler = modified[ksamplerNodeId];
    if (!ksampler.inputs.model || !Array.isArray(ksampler.inputs.model)) {
      if (checkpointLoaderId) {
        ksampler.inputs.model = [checkpointLoaderId, 0];
        console.log(`[Auto-Connect] Wired KSampler(${ksamplerNodeId}) MODEL to CheckpointLoader(${checkpointLoaderId}, 0)`);
      }
    }
  }

  // 2. CLIPTextEncode -> CLIP
  const resolvedClipSource = clipLoaderId ? [clipLoaderId, 0] : (checkpointLoaderId ? [checkpointLoaderId, 1] : null);
  if (resolvedClipSource) {
    for (const [id, node] of Object.entries(modified)) {
      if (node.class_type === "CLIPTextEncode") {
        if (!node.inputs.clip || !Array.isArray(node.inputs.clip)) {
          node.inputs.clip = resolvedClipSource;
          console.log(`[Auto-Connect] Wired CLIPTextEncode(${id}) CLIP to node ${resolvedClipSource[0]} (pin ${resolvedClipSource[1]})`);
        }
      }
    }
  }

  // 3. VAEDecode -> VAE
  const resolvedVaeSource = vaeLoaderId ? [vaeLoaderId, 0] : (checkpointLoaderId ? [checkpointLoaderId, 2] : null);
  if (vaeDecodeNodeId && modified[vaeDecodeNodeId] && resolvedVaeSource) {
    const vaeDecode = modified[vaeDecodeNodeId];
    if (!vaeDecode.inputs.vae || !Array.isArray(vaeDecode.inputs.vae)) {
      vaeDecode.inputs.vae = resolvedVaeSource;
      console.log(`[Auto-Connect] Wired VAEDecode(${vaeDecodeNodeId}) VAE to node ${resolvedVaeSource[0]} (pin ${resolvedVaeSource[1]})`);
    }
  }
  // --------------------------------------------------------------------------

  let ksamplerId = null;
  let positiveNodeId = null;
  let negativeNodeId = null;
  let latentNodeId = null;
  let modelNodeId = null;

  for (const [id, node] of Object.entries(modified)) {
    console.log(`[Debug] Node ${id} class_type:`, node.class_type);
    // CLIPLoader Correction (Fix missing CLIP model & type for Anima/Illustrious)
    if (node.class_type === "CLIPLoader") {
      node.inputs.clip_name = "qwen_3_06b_base.safetensors";
      node.inputs.type = "qwen_image";
    }

    // FaceDetailer Parameter Auto-Correction (Ensure compatibility with Impact Pack V8.x)
    if (node.class_type === "FaceDetailer" || node.class_type === "FaceDetailerPipe") {
      if (node.inputs.wildcard === undefined) node.inputs.wildcard = "";
      if (node.inputs.sam_threshold === undefined) node.inputs.sam_threshold = 0.93;
      if (node.inputs.sam_bbox_expansion === undefined) node.inputs.sam_bbox_expansion = 0;
      if (node.inputs.cycle === undefined) node.inputs.cycle = 1;
      if (node.inputs.sam_mask_hint_use_negative === undefined) node.inputs.sam_mask_hint_use_negative = "False";
      if (node.inputs.sam_detection_hint === undefined) node.inputs.sam_detection_hint = "center-1";
      if (node.inputs.drop_size === undefined) node.inputs.drop_size = 10;
      if (node.inputs.sam_dilation === undefined) node.inputs.sam_dilation = 0;
      if (node.inputs.sam_mask_hint_threshold === undefined) node.inputs.sam_mask_hint_threshold = 0.7;
    }

    if (node.class_type === "KSampler") {
      ksamplerId = id;
      if (node.inputs.positive && Array.isArray(node.inputs.positive)) {
        positiveNodeId = node.inputs.positive[0];
      }
      if (node.inputs.negative && Array.isArray(node.inputs.negative)) {
        negativeNodeId = node.inputs.negative[0];
      }
      if (node.inputs.latent_image && Array.isArray(node.inputs.latent_image)) {
        latentNodeId = node.inputs.latent_image[0];
      }
      if (node.inputs.model && Array.isArray(node.inputs.model)) {
        modelNodeId = node.inputs.model[0];
      }
      // Do not break loop to allow processing other nodes (like CLIPLoader & FaceDetailer)
    }
  }

  if (ksamplerId) {
    const ksampler = modified[ksamplerId];
    ksampler.inputs.steps = steps || 20;
    ksampler.inputs.cfg = cfg_scale || 7.0;
    ksampler.inputs.seed = seed && seed !== -1 ? seed : Math.floor(Math.random() * 1000000000);
    if (sampler_name) {
      ksampler.inputs.sampler_name = sampler_name;
    }
    if (scheduler) {
      ksampler.inputs.scheduler = scheduler;
    }
  }

  let cleanPrompt = prompt;
  let detectedLoraName = null;
  let detectedLoraWeight = 1.0;
  
  const loraMatch = prompt.match(/<lora:([^:]+):([^>]+)>/i);
  if (loraMatch) {
    detectedLoraName = loraMatch[1].trim();
    detectedLoraWeight = parseFloat(loraMatch[2]) || 1.0;
    cleanPrompt = prompt.replace(/<lora:[^>]+>/gi, "").replace(/,\s*,/g, ",").trim();
  }

  if (positiveNodeId && modified[positiveNodeId]) {
    modified[positiveNodeId].inputs.text = cleanPrompt;
  } else {
    for (const node of Object.values(modified)) {
      if (node.class_type === "CLIPTextEncode" && (!node.inputs.text || !node.inputs.text.includes("worst"))) {
        node.inputs.text = cleanPrompt;
        break;
      }
    }
  }

  if (negativeNodeId && modified[negativeNodeId]) {
    modified[negativeNodeId].inputs.text = negative_prompt;
  } else {
    for (const node of Object.values(modified)) {
      if (node.class_type === "CLIPTextEncode" && node.inputs.text && node.inputs.text.includes("worst")) {
        node.inputs.text = negative_prompt;
        break;
      }
    }
  }

  if (latentNodeId && modified[latentNodeId]) {
    modified[latentNodeId].inputs.width = width || 512;
    modified[latentNodeId].inputs.height = height || 512;
  } else {
    for (const node of Object.values(modified)) {
      if (node.class_type === "EmptyLatentImage") {
        node.inputs.width = width || 512;
        node.inputs.height = height || 512;
        break;
      }
    }
  }

  // Helper: Resolve Checkpoint Name case-insensitively
  const resolveCheckpointName = (name, list) => {
    if (!name || !Array.isArray(list) || list.length === 0) return name;
    if (list.includes(name)) return name;
    const lowerName = name.toLowerCase();
    for (const available of list) {
      if (available.toLowerCase() === lowerName) {
        console.log(`[Model-Fix] Resolved ${name} -> ${available} (Case mismatch fixed)`);
        return available;
      }
    }
    // 部分一致解決
    const cleanName = lowerName.replace(/\.safetensors$/, "").replace(/\.ckpt$/, "");
    for (const available of list) {
      const lowerAvailable = available.toLowerCase();
      if (lowerAvailable.includes(cleanName) || cleanName.includes(lowerAvailable.replace(/\.safetensors$/, "").replace(/\.ckpt$/, ""))) {
        console.log(`[Model-Fix] Resolved ${name} -> ${available} (Partial match resolved)`);
        return available;
      }
    }
    return name;
  };

  if (checkpoint) {
    let loaderId = null;
    for (const [id, node] of Object.entries(modified)) {
      if (node.class_type === "CheckpointLoaderSimple" || node.class_type === "CheckpointLoader") {
        loaderId = id;
        break;
      }
    }
    if (loaderId && modified[loaderId]) {
      modified[loaderId].inputs.ckpt_name = resolveCheckpointName(checkpoint, availableCheckpoints);
    }
  } else {
    // ワークフロー内のデフォルトモデル名の大文字小文字も解決する
    for (const [id, node] of Object.entries(modified)) {
      if ((node.class_type === "CheckpointLoaderSimple" || node.class_type === "CheckpointLoader") && node.inputs && node.inputs.ckpt_name) {
        node.inputs.ckpt_name = resolveCheckpointName(node.inputs.ckpt_name, availableCheckpoints);
      }
    }
  }

  if (detectedLoraName) {
    let loraLoaderId = null;
    for (const [id, node] of Object.entries(modified)) {
      if (node.class_type === "LoraLoader") {
        loraLoaderId = id;
        break;
      }
    }
    if (loraLoaderId && modified[loraLoaderId]) {
      modified[loraLoaderId].inputs.lora_name = detectedLoraName;
      modified[loraLoaderId].inputs.strength_model = detectedLoraWeight;
      modified[loraLoaderId].inputs.strength_clip = detectedLoraWeight;
    }
  }

  // suggested_nodes のバイパス制御 (Bypass/Enable controls)
  if (suggested_nodes) {
    for (const [id, node] of Object.entries(modified)) {
      const cls = (node.class_type || "").toLowerCase();
      const title = (node._meta && node._meta.title || "").toLowerCase();

      // 1. Face Detailer / Hand Detailer Classification
      if (cls.includes("facedetailer") || cls.includes("adetailer") || title.includes("detailer")) {
        // Hand Detailer 判定: タイトルか、検出モデルの入力名に 'hand' が含まれる場合
        const isHand = title.includes("hand") || 
                      (node.inputs && node.inputs.bbox_detector && 
                       modified[node.inputs.bbox_detector[0]] && 
                       (modified[node.inputs.bbox_detector[0]].inputs.model_name || "").toLowerCase().includes("hand"));
        
        if (isHand) {
          if (suggested_nodes.hand_detailer !== undefined) {
            node.mode = suggested_nodes.hand_detailer ? 0 : 4;
            console.log(`[Bypass] HandDetailer(${id}) mode set to ${node.mode}`);
          }
        } else {
          if (suggested_nodes.face_detailer !== undefined) {
            node.mode = suggested_nodes.face_detailer ? 0 : 4;
            console.log(`[Bypass] FaceDetailer(${id}) mode set to ${node.mode}`);
          }
        }
      }
      // 2. ControlNet
      else if (cls.includes("controlnet") || title.includes("controlnet")) {
        if (suggested_nodes.controlnet !== undefined) {
          node.mode = suggested_nodes.controlnet ? 0 : 4;
        }
      }
      // 3. Upscaler (Simple pixel-based scaling nodes)
      else if (cls.includes("upscaler") || cls.includes("ultimatesdupscale") || title.includes("hires")) {
        if (suggested_nodes.upscaler !== undefined) {
          node.mode = suggested_nodes.upscaler ? 0 : 4;
        }
      }
    }

    // 4. Hires. fix (Two-pass Latent sampling) Auto-Rewiring connection bypass
    const hiresEnabled = suggested_nodes.hires_fix !== undefined ? suggested_nodes.hires_fix : true;
    if (!hiresEnabled) {
      // Hiresが無効の場合：2次サンプリング側のノードをスキップし、1次最終生成画像を最終出力にバイパス配線する
      let primaryImageSourceId = null;
      if (modified["14"] && 
          (modified["14"].class_type === "FaceDetailer" || modified["14"].class_type === "FaceDetailerPipe") &&
          modified["14"].mode !== 4) {
        primaryImageSourceId = "14";
      } else if (modified["8"] && 
                 (modified["8"].class_type === "FaceDetailer" || modified["8"].class_type === "FaceDetailerPipe") &&
                 modified["8"].mode !== 4) {
        primaryImageSourceId = "8";
      } else if (modified["6"] && modified["6"].class_type === "VAEDecode") {
        primaryImageSourceId = "6";
      }

      if (primaryImageSourceId) {
        for (const [id, node] of Object.entries(modified)) {
          // A. 最終超解像モデル (ImageUpscaleWithModel) の入力元を1次ソースに切り替える
          if (node.class_type === "ImageUpscaleWithModel" && node.inputs && node.inputs.image) {
            node.inputs.image = [primaryImageSourceId, 0];
            console.log(`[Bypass-Hires] Rewired ImageUpscaleWithModel(${id}) input 'image' to Node ${primaryImageSourceId}`);
          }
          // B. 画像を保存 (SaveImage) の入力元を1次ソースに切り替える (超解像ノードがバイパスまたは存在しない場合)
          if (node.class_type === "SaveImage" && node.inputs && node.inputs.images) {
            const hasUpscaler = Object.values(modified).some(n => n.class_type === "ImageUpscaleWithModel" && n.mode !== 4);
            if (!hasUpscaler) {
              node.inputs.images = [primaryImageSourceId, 0];
              console.log(`[Bypass-Hires] Rewired SaveImage(${id}) input 'images' to Node ${primaryImageSourceId}`);
            }
          }
        }
      }
    }
  }

  return modified;
}

// Generate Image using ComfyUI API
async function generateComfyImage(comfyUrl, workflow, params) {
  let availableCheckpoints = [];
  try {
    const infoRes = await axios.get(`${comfyUrl}/object_info`, { timeout: 8000 });
    if (infoRes.data && infoRes.data.CheckpointLoaderSimple) {
      availableCheckpoints = infoRes.data.CheckpointLoaderSimple.input.required.ckpt_name[0] || [];
    } else if (infoRes.data && infoRes.data.CheckpointLoader) {
      availableCheckpoints = infoRes.data.CheckpointLoader.input.required.ckpt_name[0] || [];
    }
  } catch (err) {
    console.warn("[Warning] Failed to fetch checkpoints from ComfyUI for case-insensitive check:", err.message);
  }

  const parsedWorkflow = workflow ? JSON.parse(workflow) : DEFAULT_COMFY_WORKFLOW;
  const modifiedWorkflow = modifyComfyWorkflow(parsedWorkflow, params, availableCheckpoints);
  
  // Debug output
  try {
    const fs = require('fs');
    fs.writeFileSync('/tmp/last_sent_workflow.json', JSON.stringify(modifiedWorkflow, null, 2), 'utf8');
    console.log(`[Debug] Workflow dump saved to /tmp/last_sent_workflow.json`);
    console.log(`[Debug] Node 12 clip_name:`, modifiedWorkflow["12"] ? modifiedWorkflow["12"].inputs.clip_name : "Not found");
    console.log(`[Debug] Node 8 wildcard:`, modifiedWorkflow["8"] ? modifiedWorkflow["8"].inputs.wildcard : "Not found");
  } catch (e) {
    console.error("[Debug] Failed to dump workflow:", e);
  }

  const res = await axios.post(`${comfyUrl}/prompt`, { prompt: modifiedWorkflow }, { timeout: 15000 });
  const promptId = res.data.prompt_id;
  if (!promptId) {
    throw new Error("Failed to queue prompt to ComfyUI. No prompt_id received.");
  }

  console.log(`ComfyUI job queued. prompt_id: ${promptId}. Waiting for completion...`);
  
  let completed = false;
  let historyData = null;
  const maxPolls = 180; // 5秒間隔で最大15分間監視
  for (let poll = 1; poll <= maxPolls; poll++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
      const historyRes = await axios.get(`${comfyUrl}/history/${promptId}`);
      if (historyRes.data && historyRes.data[promptId]) {
        historyData = historyRes.data[promptId];
        completed = true;
        break;
      }
    } catch (e) {
      // Ignore polling errors
    }
  }

  if (!completed || !historyData) {
    throw new Error("Timeout waiting for ComfyUI generation job to complete.");
  }

  let filename = null;
  let subfolder = null;
  let type = "output";

  if (historyData.outputs) {
    for (const nodeOutput of Object.values(historyData.outputs)) {
      if (nodeOutput.images && nodeOutput.images.length > 0) {
        filename = nodeOutput.images[0].filename;
        subfolder = nodeOutput.images[0].subfolder;
        type = nodeOutput.images[0].type || "output";
        break;
      }
    }
  }

  if (!filename) {
    throw new Error("No image output found in ComfyUI history log.");
  }

  let viewUrl = `${comfyUrl}/view?filename=${encodeURIComponent(filename)}&type=${type}`;
  if (subfolder) {
    viewUrl += `&subfolder=${encodeURIComponent(subfolder)}`;
  }

  console.log(`Fetching generated image from ComfyUI: ${viewUrl}`);
  const imgRes = await axios.get(viewUrl, { responseType: "arraybuffer", timeout: 30000 });
  const base64Image = Buffer.from(imgRes.data, "binary").toString("base64");
  
  return {
    image: base64Image,
    info: {
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      seed: params.seed || -1,
      steps: params.steps,
      cfg_scale: params.cfg_scale
    }
  };
}

// Generate Image (Internal Helper)
async function generateImageInternal(payload) {
  const sdUrl = getSdUrl();
  const {
    prompt,
    negative_prompt,
    checkpoint,
    vae,
    text_encoder,
    clip_skip,
    width = 512,
    height = 512,
    steps = 20,
    cfg_scale = 7,
    sampler_name = "Euler a",
    seed = -1,
    enable_hr = false,
    hr_upscaler = "Latent",
    hr_second_pass_steps = 15,
    denoising_strength = 0.55,
    hr_scale = 1.5,
    forge_preset
  } = payload;

  const currentOptionsRes = await axios.get(`${sdUrl}/sdapi/v1/options`, { timeout: 10000 });
  const currentOptions = currentOptionsRes.data;

  // Phase 1: Apply forge_preset if specified
  if (forge_preset && currentOptions.forge_preset !== forge_preset) {
    console.log("Phase 1: Applying forge_preset:", forge_preset);
    await axios.post(`${sdUrl}/sdapi/v1/options`, { forge_preset });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Phase 2: Apply sd_model_checkpoint if changed
  if (checkpoint && currentOptions.sd_model_checkpoint !== checkpoint) {
    console.log("Phase 2: Applying sd_model_checkpoint:", checkpoint);
    await axios.post(`${sdUrl}/sdapi/v1/options`, { sd_model_checkpoint: checkpoint });
    
    // Wait for model load
    let loaded = false;
    const maxRetries = 150;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const checkRes = await axios.get(`${sdUrl}/sdapi/v1/options`);
        if (checkRes.data.sd_model_checkpoint === checkpoint) {
          console.log(`Checkpoint loaded successfully on attempt ${attempt}`);
          loaded = true;
          break;
        }
      } catch (e) {
        console.error("Error checking options during model load:", e.message);
      }
    }
    if (!loaded) {
      console.warn("Timed out waiting for checkpoint load. Proceeding anyway.");
    }
  }

  // Phase 3: Apply VAE / TE & CLIP Skip
  const optionsToUpdate = {};
  const additionalModules = [];
  let finalVae = vae;
  let finalTE = text_encoder;

  if (checkpoint && checkpoint.toLowerCase().includes("anima_basev10")) {
    finalVae = "qwen_image_vae.safetensors";
    finalTE = "qwen_3_06b_base.safetensors";
  }

  if (finalVae && finalVae !== "Automatic") {
    additionalModules.push(finalVae);
  }
  if (finalTE) {
    additionalModules.push(finalTE);
  }

  if (additionalModules.length > 0) {
    optionsToUpdate.forge_additional_modules = additionalModules;
  } else if (vae === "Automatic" || !vae) {
    optionsToUpdate.forge_additional_modules = [];
  }

  if (clip_skip !== undefined && clip_skip !== null && currentOptions.CLIP_stop_at_last_layers !== clip_skip) {
    optionsToUpdate.CLIP_stop_at_last_layers = clip_skip;
  }

  if (Object.keys(optionsToUpdate).length > 0) {
    await axios.post(`${sdUrl}/sdapi/v1/options`, optionsToUpdate);
  }

  // 2. Request Image Generation
  const generatePayload = {
    prompt,
    negative_prompt,
    steps,
    cfg_scale,
    width,
    height,
    sampler_name,
    seed,
    enable_hr,
    hr_upscaler,
    hr_second_pass_steps,
    denoising_strength,
    hr_scale,
    override_settings_restore_afterwards: false
  };

  const genResponse = await axios.post(`${sdUrl}/sdapi/v1/txt2img`, generatePayload, { timeout: 600000 });
  if (genResponse.data && genResponse.data.images && genResponse.data.images.length > 0) {
    return {
      image: genResponse.data.images[0],
      info: JSON.parse(genResponse.data.info)
    };
  }
  throw new Error("No image returned from SD WebUI.");
}

// AI Refine (Internal Helper)
async function refinePromptInternal(payload) {
  const {
    provider,
    apiKey,
    goal,
    currentPrompt,
    currentNegativePrompt,
    currentCheckpoint,
    currentCfgScale,
    currentSteps,
    imageBase64,
    referenceImageBase64,
    selectedQualityTags = [],
    availableLoras = [],
    availableUpscalers = [],
    useAISdSelection,
    useAIParamsSelection,
    starredHistory = [],
    recentPrompts = [],
    dynamicHint,
    excludedTags
  } = payload;

  const resolvedApiKey = apiKey || getEnvApiKey(provider);
  if (!resolvedApiKey) {
    throw new Error(`API Key for ${provider} is missing. Please set it in settings or .env file.`);
  }
  if (!imageBase64) {
    throw new Error("Image data is required for Vision evaluation.");
  }

  // Build Prompts
  const systemPrompt = `You are an expert Stable Diffusion prompt engineer and image critic.
Your goal is to evaluate the generated image against the user's TARGET GOAL and refine the prompt (both positive and negative) and settings to make the next generation closer to the goal.

You MUST respond in valid JSON format ONLY. Do not include markdown code block syntax (like \`\`\`json) in your raw response text. The JSON must follow this exact structure:
{
  "score": <number between 1 and 100 representing how close the image is to the goal>,
  "feedback": {
    "positives": ["what went well based on the goal"],
    "improvements": ["what needs to be improved to reach the goal"]
  },
  "next_prompt": "refined positive prompt",
  "next_negative_prompt": "refined negative prompt",
  "suggested_clip_skip": <number 1 or 2, default is 2 for SD 1.5, 1 for SDXL/Illustrious>,
  "suggested_cfg_scale": <number, typically between 4.0 and 12.0. Lower values (4.0-6.0) for more creative freedom or when the image feels over-saturated/burnt/deep fried. Higher values (8.0-12.0) if the image ignores the prompt instruction or needs stricter adherence to the goal>,
  "suggested_steps": <number, typically between 20 and 40. Increase steps if the image lacks details, texture, or feels incomplete/noisy. Decrease steps if generating simple styles or to save time>,
  "suggested_hires_fix": {
    "enable": <boolean>,
    "upscaler": <string, exact name from available upscalers, or "Latent">,
    "denoising_strength": <number, 0.3 to 0.85 depending on how much change is needed>,
    "upscale_by": <number, default 1.5>,
    "steps": <number, 10 to 25>
  },
  "suggested_workflow_modifications": {
    "face_detailer": <boolean (true to enable face repair, false to bypass/disable)>,
    "hand_detailer": <boolean (true to enable hand repair, false to bypass/disable)>,
    "hires_fix": <boolean (true to enable latent hires. fix/2nd pass sampling, false to bypass/disable)>
  }
}

Guidance for prompt engineering & SD settings:
1. Ensure the core subject remains intact.
2. If prompt weight modifiers are needed, use (keyword:weight) syntax, e.g. (neon glow:1.2).
3. Quality tags reference: Use the quality dictionary concept (e.g. masterpiece, best quality, ultra detailed) to boost quality, adjusted for style (anime, photorealistic, cinematic).
4. If available Loras are provided below, you can include them in the next_prompt using "<lora:LORANAME:weight>" syntax. Only use LORAs from the provided list.
5. Identify the style and architecture of the active model:
   - For SD 1.5 anime models (like anima_base): set suggested_clip_skip to 2.
   - For SDXL / Illustrious models (like Illustrious Anime Blend): set suggested_clip_skip to 1.
6. Evaluate if the image is blurry, lacks detail, or explicitly needs higher resolution. If so, set suggested_hires_fix.enable to true and suggest a suitable upscaler and denoising strength:
   - Use the list of available upscalers for selecting a correct upscaler name.
   - Adjust denoising_strength (typically 0.3 to 0.85) based on how much change is acceptable (lower values preserve more structure, higher values add more new details but might change the scene).
   - If hires fix is not needed or the image is already sharp and clear, set suggested_hires_fix.enable to false.
7. Evaluate if the image is over-saturated, has high contrast artifacts (burnt colors), or lacks creative flow. If so, decrease suggested_cfg_scale. If the image completely ignores certain core keywords in the TARGET GOAL, increase suggested_cfg_scale to enforce prompt adherence.
8. Evaluate if the image details are muddy, noisy, or unfinished. If so, increase suggested_steps. If the image is simple or looks solid, you may keep suggested_steps around 25-30.
9. Evaluate if the image has issues that require workflow modifications:
   - If the face is deformed, low-detail, or needs face-specific inpainting: set suggested_workflow_modifications.face_detailer to true. Otherwise, set it to false to speed up generations.
   - If the hands/fingers are deformed or missing details: set suggested_workflow_modifications.hand_detailer to true. Otherwise, set it to false.
   - If the overall image is blurry, lacking texture/details, or requires high-resolution reconstruction (Latent Hires. fix): set suggested_workflow_modifications.hires_fix to true. Otherwise, set it to false.`;

  const userPrompt = `### TARGET GOAL
"${goal}"

### CURRENT ACTIVE MODEL (Checkpoint)
"${currentCheckpoint || "Unknown"}"

### CURRENT GENERATION PARAMETERS
- CFG Scale: ${currentCfgScale || 7.5}
- Steps: ${currentSteps || 25}

### CURRENT PROMPT
"${currentPrompt}"

### CURRENT NEGATIVE PROMPT
"${currentNegativePrompt}"

### SELECTED QUALITY TAGS (User Preference)
${selectedQualityTags.length > 0 ? selectedQualityTags.join(", ") : "None"}

### STABLE DIFFUSION RESOURCES
- Available LoRAs: ${JSON.stringify(availableLoras)}
- Available Upscalers: ${JSON.stringify(availableUpscalers)}

Evaluate the attached image. Identify what is missing or incorrect in comparison with the TARGET GOAL.
Propose the next prompt, negative prompt, and settings (CLIP skip, CFG scale, Steps, Hires. fix). Select a suitable upscaler from the Available Upscalers list if Hires. fix is recommended.`;

  let resolvedUserPrompt = userPrompt;

  // ユーザー嗜好の反映 (User Favorite Preferences)
  if (Array.isArray(starredHistory) && starredHistory.length > 0) {
    resolvedUserPrompt += `\n\n### USER FAVORITE PREFERENCES (ユーザーの好み)
以下は、ユーザーがお気に入り（高評価）に登録した過去の画像プロンプトの例です。
ユーザーはこれらのスタイル、カラー、構図を非常に好んでいます。
今回の改善において、これらの好みの特徴（似たトーン、スタイル、ポーズの表現など）を適度に取り入れ、ユーザー好みの仕上がりに引き寄せてください。
${starredHistory.slice(-5).map((e, idx) => `${idx + 1}. Prompt: "${e.prompt}" (Score: ${e.score})`).join("\n")}`;
  }

  // 直近の重複回避 (Avoid Recent Overlaps)
  if (Array.isArray(recentPrompts) && recentPrompts.length > 0) {
    resolvedUserPrompt += `\n\n### RECENT GENERATED PROMPTS (直近のプロンプト履歴)
以下は、直近のループで生成されたプロンプトです。
1. "${recentPrompts[recentPrompts.length - 1]}"
${recentPrompts.length > 1 ? `2. "${recentPrompts[recentPrompts.length - 2]}"` : ""}
${recentPrompts.length > 2 ? `3. "${recentPrompts[recentPrompts.length - 3]}"` : ""}

これら直近のプロンプトと「ほぼ同一」または「極めて類似した」シチュエーション、色合い、構図、ポーズをそのまま連続して提案することは避けてください。
プロンプトが単調なループにならないよう、新しいバリエーション、異なるポーズやアクセントを意図的に導入してください。`;
  }

  // 動的テーマヒントの注入 (Dynamic Inspiration)
  if (dynamicHint) {
    resolvedUserPrompt += `\n\n### DYNAMIC VARIETY INSPIRATION (今回のインスピレーション要素)
今回のプロンプトには、隠し味として以下の要素（ポーズやカラー、背景、ライティング）をテーマに取り入れて、新しいバリエーションの画像を提案してください：
- テーマ要素: "${dynamicHint}"
この要素を自然にプロンプトに組み込んで表現を変化させてください。`;
  }

  if (referenceImageBase64) {
    resolvedUserPrompt += `\n\n### REFERENCE IMAGE IS PROVIDED\nAn image has been attached by the user as a style and composition reference.\nCompare the GENERATED IMAGE against this REFERENCE IMAGE. Analyze if the style, mood, color palette, lighting, or overall composition aligns with it.\nYour suggestions for the next iteration should attempt to match the style of the REFERENCE IMAGE while satisfying the TARGET GOAL.`;
  }

  // 除外タグの注入 (Excluded / Blocked Tags constraint)
  if (excludedTags && excludedTags.trim() !== "") {
    const tagsList = excludedTags.split(",").map(t => t.trim()).filter(t => t.length > 0);
    if (tagsList.length > 0) {
      resolvedUserPrompt += `\n\n### CRITICAL CONSTRAINT: EXCLUDED TAGS (絶対に除外すべきタグ)
You MUST NOT include any of the following terms or phrases in the "next_prompt" or "next_negative_prompt" output:
${tagsList.map(t => `- "${t}"`).join("\n")}

If any of these keywords are present in the current prompt or negative prompt, you MUST remove them from the next output. This is a strict constraint. Do not ignore it under any circumstances.`;
    }
  }

  let aiResponseText = "";
  if (provider === "openai") {
    aiResponseText = await callOpenAI(resolvedApiKey, systemPrompt, resolvedUserPrompt, imageBase64, referenceImageBase64);
  } else if (provider === "gemini") {
    aiResponseText = await callGemini(resolvedApiKey, systemPrompt, resolvedUserPrompt, imageBase64, referenceImageBase64);
  } else if (provider === "claude") {
    aiResponseText = await callClaude(resolvedApiKey, systemPrompt, resolvedUserPrompt, imageBase64, referenceImageBase64);
  } else if (provider === "grok") {
    aiResponseText = await callGrok(resolvedApiKey, systemPrompt, resolvedUserPrompt, imageBase64, referenceImageBase64);
  } else {
    throw new Error("Invalid AI Provider specified.");
  }

  let cleanedText = aiResponseText.trim();
  if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "");
  }

  let parsedResult = JSON.parse(cleanedText);

  // 強制サニタイズ処理 (Force Sanitize Excluded Tags on internal loop response)
  if (excludedTags && excludedTags.trim() !== "" && parsedResult) {
    const tagsList = excludedTags.split(",").map(t => t.trim()).filter(t => t.length > 0);
    tagsList.forEach(tag => {
      const escapedTag = tag.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTag}\\b|${escapedTag}`, 'gi');
      
      if (parsedResult.next_prompt) {
        parsedResult.next_prompt = parsedResult.next_prompt
          .replace(regex, "")
          .replace(/,\s*,/g, ",")
          .replace(/^,|,$/g, "")
          .trim();
      }
      if (parsedResult.next_negative_prompt) {
        parsedResult.next_negative_prompt = parsedResult.next_negative_prompt
          .replace(regex, "")
          .replace(/,\s*,/g, ",")
          .replace(/^,|,$/g, "")
          .trim();
      }
    });
  }

  return parsedResult;
}

// Save History Entry (Internal Helper)
function saveHistoryInternal(data) {
  const {
    loopIndex,
    imageBase64,
    prompt,
    negativePrompt,
    checkpoint,
    vae,
    textEncoder,
    clipSkip,
    cfgScale,
    steps,
    hiresFix,
    score,
    positives,
    improvements,
    suggestedNodes
  } = data;

  const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  if (imageBase64) {
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const imagePath = path.join(IMAGES_DIR, `${id}.png`);
    fs.writeFileSync(imagePath, imageBuffer);
  }

  const entry = {
    id,
    loopIndex,
    prompt,
    negativePrompt,
    checkpoint,
    vae,
    textEncoder,
    clipSkip,
    cfgScale,
    steps,
    hiresFix,
    score,
    positives,
    improvements,
    timestamp,
    imagePath: `data/images/${id}.png`,
    suggestedNodes: suggestedNodes || null
  };

  const history = readHistory();
  history.push(entry);
  writeHistory(history);

  // Trigger pCloud backup asynchronously
  triggerPcloudBackup();

  return entry;
}

// Helper to trigger pcloud backup using rclone
function triggerPcloudBackup() {
  const { exec } = require("child_process");
  exec("rclone copy /root/sd-prompt-refiner/data pcloud:/sd-prompt-refiner-data", (err, stdout, stderr) => {
    if (err) {
      console.error("pCloud auto-backup failed:", err.message);
      return;
    }
    console.log("pCloud auto-backup completed successfully.");
  });
}

// Background optimization runner
async function runBackgroundOptimizationLoop() {
  activeJob.running = true;
  activeJob.shouldStop = false;
  activeJob.error = null;
  writeSession({ ...activeJob, active: true });

  const sdUrl = getSdUrl();

  try {
    const defaultNegative = promptDictionary.negative_categories
      ? promptDictionary.negative_categories.flatMap(cat => cat.tags.map(t => t.tag)).join(", ")
      : "worst quality, low quality, lowres, blurry";

    let currentPrompt = activeJob.currentPrompt || activeJob.goal;
    let currentNegativePrompt = activeJob.currentNegativePrompt || defaultNegative;
    let currentCheckpoint = activeJob.currentCheckpoint;
    let currentVae = activeJob.currentVae;
    let currentTextEncoder = activeJob.currentTextEncoder;
    let currentClipSkip = activeJob.currentClipSkip;
    let currentCfgScale = activeJob.currentCfgScale;
    let currentSteps = activeJob.currentSteps;
    let currentSamplerName = activeJob.currentSamplerName;
    let currentScheduler = activeJob.currentScheduler;
    
    let hrEnabled = activeJob.hrEnabled;
    let hrUpscaler = activeJob.hrUpscaler;
    let hrScale = activeJob.hrScale;
    let hrDenoise = activeJob.hrDenoise;
    let hrSteps = activeJob.hrSteps;

    const [width, height] = activeJob.imageSize.split("x").map(Number);

    let availableLoras = [];
    let availableUpscalers = [];
    const engine = activeJob.generationEngine || "sd-webui";
    const comfyUrl = activeJob.comfyUrl || "http://127.0.0.1:8188";

    if (engine === "comfyui") {
      try {
        const infoRes = await axios.get(`${comfyUrl}/object_info`, { timeout: 5000 });
        const info = infoRes.data;
        availableLoras = info.LoraLoader ? (info.LoraLoader.input.required.lora_name[0] || []) : [];
        availableUpscalers = info.UpscaleModelLoader ? (info.UpscaleModelLoader.input.required.model_name[0] || []) : [];
      } catch (e) {
        console.warn("Could not fetch ComfyUI resources for AI context:", e.message);
      }
    } else {
      try {
        const loraRes = await axios.get(`${sdUrl}/sdapi/v1/loras`, { timeout: 5000 });
        availableLoras = loraRes.data.map(l => l.name);
      } catch (e) {
        console.warn("Could not fetch LoRAs for AI context:", e.message);
      }
      try {
        const upscalerRes = await axios.get(`${sdUrl}/sdapi/v1/upscalers`, { timeout: 5000 });
        availableUpscalers = upscalerRes.data.map(u => u.name || u);
      } catch (e) {
        console.warn("Could not fetch Upscalers for AI context:", e.message);
      }
    }

    const startLoop = activeJob.currentLoop + 1;
    const maxLoops = activeJob.maxLoops;

    for (let loop = startLoop; loop <= maxLoops; loop++) {
      if (activeJob.shouldStop) {
        activeJob.statusText = "Stopped by user";
        break;
      }

      activeJob.currentLoop = loop;
      activeJob.statusText = `Generating Image (Loop ${loop}/${maxLoops})`;
      activeJob.percent = Math.round(((loop - 1) / maxLoops) * 100 + (30 / maxLoops));
      writeSession({ ...activeJob, active: true });

      let promptWithQuality = currentPrompt;
      if (Array.isArray(activeJob.selectedQualityTags) && activeJob.selectedQualityTags.length > 0) {
        const missingTags = activeJob.selectedQualityTags.filter(tag => !currentPrompt.toLowerCase().includes(tag.toLowerCase()));
        if (missingTags.length > 0) {
          promptWithQuality = missingTags.join(", ") + ", " + currentPrompt;
        }
      }

      // Step 1: Generate Image
      let lastImageBase64 = null;
      let activeCheckpointName = currentCheckpoint;
      try {
        if (engine === "comfyui") {
          const genResult = await generateComfyImage(comfyUrl, activeJob.comfyWorkflow, {
            prompt: promptWithQuality,
            negative_prompt: currentNegativePrompt,
            checkpoint: currentCheckpoint,
            width,
            height,
            steps: currentSteps,
            cfg_scale: currentCfgScale,
            sampler_name: currentSamplerName,
            scheduler: currentScheduler,
            seed: -1,
            suggested_nodes: activeJob.suggestedNodes
          });
          lastImageBase64 = genResult.image;
          activeCheckpointName = currentCheckpoint || "ComfyUI Active Model";
        } else {
          const genResult = await generateImageInternal({
            prompt: promptWithQuality,
            negative_prompt: currentNegativePrompt,
            checkpoint: currentCheckpoint,
            vae: currentVae,
            text_encoder: currentTextEncoder,
            clip_skip: currentClipSkip,
            width,
            height,
            steps: currentSteps,
            cfg_scale: currentCfgScale,
            enable_hr: hrEnabled,
            hr_upscaler: hrUpscaler,
            hr_scale: hrScale,
            denoising_strength: hrDenoise,
            hr_second_pass_steps: hrSteps
          });
          lastImageBase64 = genResult.image;
          if (genResult.info && genResult.info.sd_model_name) {
            activeCheckpointName = genResult.info.sd_model_name;
          }
        }
      } catch (err) {
        console.error("Background Generation Error:", err.message);
        activeJob.error = `Generation failed: ${err.message}`;
        activeJob.statusText = "Error in generation";
        break;
      }

      if (activeJob.shouldStop) {
        activeJob.statusText = "Stopped by user";
        break;
      }

      // Step 2: AI Refine
      activeJob.statusText = `Evaluating with AI (Loop ${loop}/${maxLoops})`;
      activeJob.percent = Math.round(((loop - 1) / maxLoops) * 100 + (80 / maxLoops));
      writeSession({ ...activeJob, active: true });

      // 履歴からお気に入りプロンプトと直近のプロンプトをロード
      let starredHistory = [];
      let recentPrompts = [];
      try {
        const fullHistory = readHistory();
        starredHistory = fullHistory
          .filter(e => e.userStarred === true)
          .map(e => ({ prompt: e.prompt, score: e.score }));
        recentPrompts = fullHistory.slice(-3).map(e => e.prompt);
      } catch (historyErr) {
        console.warn("Could not load history for AI refine feedback:", historyErr.message);
      }

      // ランダムな動的テーマヒント（インスピレーション）を1つ選択
      const dynamicHint = DYNAMIC_THEME_HINTS[Math.floor(Math.random() * DYNAMIC_THEME_HINTS.length)];
      console.log(`Active loop dynamic variety hint: "${dynamicHint}"`);

      let evaluationResult = null;
      try {
        evaluationResult = await refinePromptInternal({
          provider: activeJob.provider,
          apiKey: getEnvApiKey(activeJob.provider),
          goal: activeJob.goal,
          currentPrompt,
          currentNegativePrompt,
          currentCheckpoint: activeCheckpointName,
          currentCfgScale,
          currentSteps,
          imageBase64: lastImageBase64,
          referenceImageBase64: activeJob.useReferenceImage ? activeJob.referenceImageBase64 : null,
          selectedQualityTags: activeJob.selectedQualityTags,
          availableLoras,
          availableUpscalers,
          useAISdSelection: activeJob.useAISdSelection,
          useAIParamsSelection: activeJob.useAIParamsSelection,
          starredHistory,
          recentPrompts,
          dynamicHint,
          excludedTags: activeJob.excludedTags
        });
      } catch (err) {
        console.error("Background AI Refine Error:", err.message);
        saveHistoryInternal({
          loopIndex: loop,
          imageBase64: lastImageBase64,
          prompt: promptWithQuality,
          negativePrompt: currentNegativePrompt,
          checkpoint: activeCheckpointName,
          vae: currentVae,
          textEncoder: currentTextEncoder,
          clipSkip: currentClipSkip,
          cfgScale: currentCfgScale,
          steps: currentSteps,
          score: null,
          positives: ["AI評価に失敗しました。このステップでのプロンプト改善はスキップされます。"],
          improvements: [err.message],
          hiresFix: {
            enable: hrEnabled,
            upscaler: hrUpscaler,
            denoising_strength: hrDenoise,
            upscale_by: hrScale,
            steps: hrSteps
          }
        });
        continue;
      }

      // Step 3: Save History
      const historyData = {
        loopIndex: loop,
        imageBase64: lastImageBase64,
        prompt: promptWithQuality,
        negativePrompt: currentNegativePrompt,
        checkpoint: activeCheckpointName,
        vae: currentVae,
        textEncoder: currentTextEncoder,
        clipSkip: currentClipSkip || evaluationResult.suggested_clip_skip,
        cfgScale: currentCfgScale,
        steps: currentSteps,
        score: evaluationResult.score,
        positives: evaluationResult.feedback.positives,
        improvements: evaluationResult.feedback.improvements,
        hiresFix: {
          enable: hrEnabled,
          upscaler: hrUpscaler,
          denoising_strength: hrDenoise,
          upscale_by: hrScale,
          steps: hrSteps
        },
        suggestedNodes: activeJob.suggestedNodes ? { ...activeJob.suggestedNodes } : null
      };
      saveHistoryInternal(historyData);

      // Prepare next loop
      currentPrompt = evaluationResult.next_prompt;
      currentNegativePrompt = evaluationResult.next_negative_prompt;
      
      if (activeJob.useAISdSelection) {
        currentClipSkip = evaluationResult.suggested_clip_skip || currentClipSkip;
      }

      if (activeJob.useAIParamsSelection) {
        currentCfgScale = evaluationResult.suggested_cfg_scale !== undefined ? evaluationResult.suggested_cfg_scale : currentCfgScale;
        currentSteps = evaluationResult.suggested_steps !== undefined ? evaluationResult.suggested_steps : currentSteps;
      }

      if (activeJob.useAIHiresSelection && evaluationResult.suggested_hires_fix) {
        const suggestHr = evaluationResult.suggested_hires_fix;
        hrEnabled = suggestHr.enable !== undefined ? suggestHr.enable : hrEnabled;
        hrUpscaler = suggestHr.upscaler || hrUpscaler;
        hrDenoise = suggestHr.denoising_strength !== undefined ? suggestHr.denoising_strength : hrDenoise;
        hrScale = suggestHr.upscale_by !== undefined ? suggestHr.upscale_by : hrScale;
        hrSteps = suggestHr.steps !== undefined ? suggestHr.steps : hrSteps;
      }

      activeJob.currentPrompt = currentPrompt;
      activeJob.currentNegativePrompt = currentNegativePrompt;
      activeJob.currentCheckpoint = currentCheckpoint;
      activeJob.currentClipSkip = currentClipSkip;
      activeJob.currentCfgScale = currentCfgScale;
      activeJob.currentSteps = currentSteps;
      activeJob.hrEnabled = hrEnabled;
      activeJob.hrUpscaler = hrUpscaler;
      activeJob.hrScale = hrScale;
      activeJob.hrDenoise = hrDenoise;
      activeJob.hrSteps = hrSteps;
      
      // Parse suggested workflow intent and update suggestedNodes / hrEnabled
      if (evaluationResult.suggested_workflow_modifications) {
        const mods = evaluationResult.suggested_workflow_modifications;
        if (!activeJob.suggestedNodes) activeJob.suggestedNodes = {};
        
        if (mods.face_detailer !== undefined) {
          activeJob.suggestedNodes.face_detailer = !!mods.face_detailer;
        }
        if (mods.hand_detailer !== undefined) {
          activeJob.suggestedNodes.hand_detailer = !!mods.hand_detailer;
        }
        if (mods.hires_fix !== undefined) {
          activeJob.hrEnabled = !!mods.hires_fix;
          activeJob.suggestedNodes.hires_fix = !!mods.hires_fix;
          hrEnabled = !!mods.hires_fix;
        }
      } else if (evaluationResult.suggested_nodes) {
        // Fallback for older format
        activeJob.suggestedNodes = {
          face_detailer: !!evaluationResult.suggested_nodes.face_detailer,
          controlnet: !!evaluationResult.suggested_nodes.controlnet,
          upscaler: !!evaluationResult.suggested_nodes.upscaler
        };
      }

      activeJob.percent = Math.round((loop / maxLoops) * 100);
      writeSession({ ...activeJob, active: true });
    }

    if (!activeJob.error && !activeJob.shouldStop) {
      activeJob.statusText = "Completed";
      activeJob.percent = 100;
    }
  } catch (globalErr) {
    console.error("Global error in background loop:", globalErr.message);
    activeJob.error = globalErr.message;
    activeJob.statusText = "Failed";
  } finally {
    activeJob.running = false;
    writeSession({ ...activeJob, active: false });
    triggerPcloudBackup();
  }
}

// POST /api/ai/tweet-draft - 画像紹介用のX (Twitter) 下書き文をAI生成
app.post("/api/ai/tweet-draft", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing history ID." });
  }

  try {
    const history = readHistory();
    const entry = history.find(e => e.id === id);
    if (!entry) {
      return res.status(404).json({ error: "History entry not found." });
    }

    const session = readSession();
    const provider = session.provider || "gemini";
    const apiKey = getEnvApiKey(provider);

    if (!apiKey) {
      return res.status(400).json({ error: `API Key for ${provider} is missing.` });
    }

    const systemPrompt = `You are an enthusiastic AI artist promoter.
Your task is to write a catchy, exciting tweet in Japanese to promote this AI-generated artwork.
Use the following metadata to create the tweet:
- Target Concept: "${entry.goal || "(Not specified)"}"
- AI Evaluation Score: ${entry.score !== null && entry.score !== undefined ? entry.score : "N/A"} points
- Main Prompt words: "${entry.prompt || ""}"

Guidelines:
1. Keep the tweet under 130 characters.
2. Write in natural, friendly, and engaging Japanese.
3. Show excitement and praise the artwork based on the Concept.
4. Include 2-3 relevant hashtags like #StableDiffusion #AIart #ComfyUI #PromptCraft.
5. Do NOT output any quotes, markdown block formatting, or conversational prefaces. Output ONLY the plain tweet text.`;

    const userPrompt = `Generate a tweet for this artwork.`;
    
    let draftText = "";
    if (provider === "openai") {
      draftText = await callOpenAI(apiKey, systemPrompt, userPrompt);
    } else if (provider === "gemini") {
      draftText = await callGemini(apiKey, systemPrompt, userPrompt);
    } else if (provider === "claude") {
      draftText = await callClaude(apiKey, systemPrompt, userPrompt);
    } else if (provider === "grok") {
      draftText = await callGrok(apiKey, systemPrompt, userPrompt);
    } else {
      throw new Error("Invalid AI provider");
    }

    // Clean markdown code blocks if any
    let cleanedDraft = draftText.trim();
    if (cleanedDraft.startsWith("```")) {
      cleanedDraft = cleanedDraft.replace(/^```[a-z]*\s*/i, "").replace(/```$/, "").trim();
    }
    
    // Strip leading/trailing quote characters
    if (cleanedDraft.startsWith('"') && cleanedDraft.endsWith('"')) {
      cleanedDraft = cleanedDraft.slice(1, -1).trim();
    }

    res.json({ draftText: cleanedDraft });

  } catch (err) {
    console.error("Error generating tweet draft:", err.message);
    res.status(500).json({ error: "Failed to generate tweet draft.", details: err.message });
  }
});

// GET /api/session - セッション状態を返す
app.get("/api/session", (req, res) => {
  try {
    const session = readSession();
    if (activeJob.running) {
      res.json(activeJob);
    } else {
      res.json({
        ...activeJob,
        ...session,
        running: false
      });
    }
  } catch (err) {
    console.error("Error reading session:", err.message);
    res.status(500).json({ error: "Failed to read session.", details: err.message });
  }
});

// POST /api/session/start - セッションを開始
app.post("/api/session/start", (req, res) => {
  if (activeJob.running) {
    return res.status(400).json({ error: "An optimization loop is already running." });
  }

  const {
    goal,
    maxLoops,
    imageSize,
    useAISdSelection,
    useAIParamsSelection,
    useAIHiresSelection,
    useReferenceImage,
    referenceImageBase64,
    selectedQualityTags,
    provider,
    currentPrompt,
    currentCheckpoint,
    currentVae,
    currentTextEncoder,
    currentSamplerName,
    currentScheduler,
    currentCfgScale,
    currentSteps,
    hrEnabled,
    hrUpscaler,
    hrScale,
    hrDenoise,
    hrSteps,
    generationEngine,
    comfyUrl,
    comfyWorkflow,
    excludedTags
  } = req.body;

  activeJob = {
    running: true,
    shouldStop: false,
    currentLoop: 0,
    maxLoops: maxLoops || 3,
    statusText: "Initializing...",
    percent: 0,
    error: null,
    goal,
    provider,
    imageSize: imageSize || "512x512",
    useAISdSelection: useAISdSelection || false,
    useAIParamsSelection: useAIParamsSelection !== undefined ? useAIParamsSelection : true,
    useAIHiresSelection: useAIHiresSelection !== undefined ? useAIHiresSelection : true,
    useReferenceImage: useReferenceImage || false,
    referenceImageBase64: referenceImageBase64 || null,
    selectedQualityTags: selectedQualityTags || [],
    currentPrompt: currentPrompt || goal,
    currentNegativePrompt: "",
    currentCheckpoint: currentCheckpoint || null,
    currentVae: currentVae || null,
    currentTextEncoder: currentTextEncoder || null,
    currentSamplerName: currentSamplerName || null,
    currentScheduler: currentScheduler || null,
    currentClipSkip: null,
    currentCfgScale: currentCfgScale !== undefined ? parseFloat(currentCfgScale) : 7.5,
    currentSteps: currentSteps !== undefined ? parseInt(currentSteps) : 25,
    hrEnabled: hrEnabled || false,
    hrUpscaler: hrUpscaler || "Latent",
    hrScale: hrScale !== undefined ? parseFloat(hrScale) : 1.5,
    hrDenoise: hrDenoise !== undefined ? parseFloat(hrDenoise) : 0.55,
    hrSteps: hrSteps !== undefined ? parseInt(hrSteps) : 15,
    generationEngine: generationEngine || "sd-webui",
    comfyUrl: comfyUrl || "http://127.0.0.1:8188",
    comfyWorkflow: comfyWorkflow || "",
    excludedTags: excludedTags || "",
    suggestedNodes: req.body.suggestedNodes ? {
      face_detailer: !!req.body.suggestedNodes.face_detailer,
      hand_detailer: !!req.body.suggestedNodes.hand_detailer,
      hires_fix: !!req.body.suggestedNodes.hires_fix,
      controlnet: !!req.body.suggestedNodes.controlnet,
      upscaler: !!req.body.suggestedNodes.upscaler
    } : {
      face_detailer: false,
      hand_detailer: false,
      hires_fix: false,
      controlnet: false,
      upscaler: false
    }
  };

  runBackgroundOptimizationLoop().catch(err => {
    console.error("Failed to start background loop:", err);
  });

  res.json({ message: "Optimization loop started in background.", session: activeJob });
});

// POST /api/session/stop - セッションを停止
app.post("/api/session/stop", (req, res) => {
  if (!activeJob.running) {
    return res.status(400).json({ error: "No active loop is running." });
  }
  activeJob.shouldStop = true;
  activeJob.statusText = "Stopping...";
  res.json({ message: "Stop signal sent to background loop." });
});

// DELETE /api/session - セッション状態をリセット
app.delete("/api/session", (req, res) => {
  try {
    activeJob.running = false;
    writeSession({ active: false });
    res.json({ active: false });
  } catch (err) {
    console.error("Error resetting session:", err.message);
    res.status(500).json({ error: "Failed to reset session.", details: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`PromptCraft Loop server running on http://localhost:${PORT}`);
  console.log(`Default SD WebUI Target: ${process.env.SD_WEBUI_URL || "http://127.0.0.1:7860"}`);
});
