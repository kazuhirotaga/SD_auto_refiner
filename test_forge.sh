#!/bin/bash
# Test a simple txt2img generation to verify Forge Neo is working
echo "=== Testing txt2img generation ==="
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
        if 'info' in d:
            info = json.loads(d['info']) if isinstance(d['info'], str) else d['info']
            print('Seed:', info.get('seed'))
    elif 'error' in d:
        print('ERROR:', d.get('error'))
        print('Detail:', d.get('detail'))
    else:
        print('UNEXPECTED:', json.dumps(d)[:500])
except Exception as e:
    print('PARSE_ERROR:', e)
    print('Raw (first 500):', sys.stdin.read()[:500])
"
echo ""
echo "=== Test complete ==="
