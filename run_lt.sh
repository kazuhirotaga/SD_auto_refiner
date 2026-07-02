#!/bin/bash
while true; do
  echo "=========================================" >> /root/lt.log
  echo "Starting localtunnel at $(date)" >> /root/lt.log
  /usr/bin/lt --port 3000 >> /root/lt.log 2>&1
  echo "Localtunnel disconnected. Reconnecting in 5 seconds..." >> /root/lt.log
  sleep 5
done
