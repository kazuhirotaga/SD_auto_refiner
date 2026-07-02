#!/bin/bash
# Step 1: List available models
echo "=== Available Models ==="
curl -s http://127.0.0.1:7860/sdapi/v1/sd-models | python3 -c "
import sys, json
models = json.load(sys.stdin)
for m in models:
    print(m['title'])
"

echo ""
echo "=== Available VAEs ==="
curl -s http://127.0.0.1:7860/sdapi/v1/sd-vae | python3 -c "
import sys, json
vaes = json.load(sys.stdin)
for v in vaes:
    print(v.get('model_name', v))
" 2>/dev/null || echo "(no VAE endpoint)"
