#!/bin/bash
rm -f /root/cf.log
/opt/instance-tools/bin/cloudflared tunnel --url http://localhost:10100 >> /root/cf.log 2>&1
