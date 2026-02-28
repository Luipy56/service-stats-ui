#!/bin/bash
# Control a systemd service: start | stop | restart
# Usage: stats-service-control.sh <action> <unit>
# Unit must match [a-zA-Z0-9_.@-]+\.service

ACTION="${1:-}"
UNIT="${2:-}"

VALID_ACTIONS="start stop restart"
if ! echo "$VALID_ACTIONS" | grep -qw "$ACTION"; then
    echo '{"ok":false,"error":"Invalid action"}'
    exit 1
fi

if ! echo "$UNIT" | grep -qE '^[a-zA-Z0-9_.@-]+\.service$'; then
    echo '{"ok":false,"error":"Invalid unit name"}'
    exit 1
fi

err=$(systemctl "$ACTION" "$UNIT" 2>&1)
ret=$?
# Escape " and \ for JSON
err="${err//\\/\\\\}"; err="${err//\"/\\\"}"; err="${err//$'\n'/ }"
if [ $ret -eq 0 ]; then
    echo "{\"ok\":true,\"action\":\"$ACTION\",\"unit\":\"$UNIT\"}"
else
    echo "{\"ok\":false,\"error\":\"$err\"}"
    exit 1
fi
