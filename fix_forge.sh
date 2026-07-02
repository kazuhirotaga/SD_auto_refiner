#!/bin/bash
# Reset forge_additional_modules to correct values for Anima model
# and verify the current state

echo "=== Current Forge Neo Options ==="
curl -s http://127.0.0.1:7860/sdapi/v1/options | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('sd_model_checkpoint:', d.get('sd_model_checkpoint'))
print('forge_additional_modules:', d.get('forge_additional_modules'))
print('CLIP_stop_at_last_layers:', d.get('CLIP_stop_at_last_layers'))
"

echo ""
echo "=== Resetting forge_additional_modules ==="
curl -s -X POST http://127.0.0.1:7860/sdapi/v1/options \
  -H "Content-Type: application/json" \
  -d '{"forge_additional_modules": []}'

echo ""
echo "=== Reset complete. Verifying ==="
curl -s http://127.0.0.1:7860/sdapi/v1/options | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('sd_model_checkpoint:', d.get('sd_model_checkpoint'))
print('forge_additional_modules:', d.get('forge_additional_modules'))
print('CLIP_stop_at_last_layers:', d.get('CLIP_stop_at_last_layers'))
"
echo ""
echo "=== Done ==="
