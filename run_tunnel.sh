#!/bin/bash
while true; do
  echo "=========================================" >> /root/lhr.log
  echo "Starting localhost.run tunnel at $(date)" >> /root/lhr.log
  ssh -o StrictHostKeyChecking=no \
      -o ExitOnForwardFailure=yes \
      -o ServerAliveInterval=30 \
      -o ServerAliveCountMax=3 \
      -R 80:localhost:3000 nokey@localhost.run >> /root/lhr.log 2>&1
  echo "Tunnel disconnected at $(date). Reconnecting in 5 seconds..." >> /root/lhr.log
  sleep 5
done
