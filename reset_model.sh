#!/bin/bash
# Switch to Illustrious model first to reset, then test generation
echo "=== Switching to Illustrious model ==="
curl -s -X POST http://127.0.0.1:7860/sdapi/v1/options \
  -H "Content-Type: application/json" \
  -d '{"sd_model_checkpoint": "Illustrious Anime Blend - Semi Realistic_1.3.safetensors [736675d24a]", "forge_additional_modules": []}'

echo ""
echo "=== Waiting 30s for model load ==="
sleep 30

echo "=== Verifying current model ==="
curl -s http://127.0.0.1:7860/sdapi/v1/options | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('sd_model_checkpoint:', d.get('sd_model_checkpoint'))
print('forge_additional_modules:', d.get('forge_additional_modules'))
"

echo ""
echo "=== Testing txt2img with Illustrious ==="
curl -s -X POST http://127.0.0.1:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "1girl, smile, simple background, masterpiece",
    "negative_prompt": "worst quality, low quality",
    "steps": 8,
    "width": 512,
    "height": 512,
    "cfg_scale": 5,
    "sampler_name": "Euler a"
  }' | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    if 'images' in d and len(d['images']) > 0:
        print('SUCCESS: Image generated! Size:', len(d['images'][0]), 'chars (base64)')
    elif 'error' in d:
        print('ERROR:', d.get('error'))
        print('Detail:', d.get('detail'))
        print('Message:', d.get('message'))
    else:
        keys = list(d.keys())
        print('UNEXPECTED response keys:', keys)
except Exception as e:
    print('PARSE_ERROR:', e)
"
echo ""
echo "=== Test complete ==="
