#!/bin/bash
# Find where generated images (.png) are saved
echo "=== Searching for generated images in /root/ ==="
find /root/ -name "*.png" -path "*/outputs/*" -o -path "*/log/*" | head -n 30
echo ""
echo "=== Searching in sd-prompt-refiner data/ ==="
find /root/sd-prompt-refiner/data/ -name "*.png" | head -n 30
