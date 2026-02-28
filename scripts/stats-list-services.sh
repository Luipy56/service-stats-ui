#!/bin/bash
# Lists all systemd services as JSON. Run with sudo for www-data.
# Output: one JSON object per line (NDJSON); PHP wraps as array.

get_enabled() {
    systemctl list-unit-files --type=service --no-legend --no-pager 2>/dev/null | awk '{print $1"\t"$2}' | sort -u
}
enabled_map=$(get_enabled)

while IFS= read -r line; do
    unit=$(echo "$line" | awk '{print $1}')
    load=$(echo "$line" | awk '{print $2}')
    active=$(echo "$line" | awk '{print $3}')
    sub=$(echo "$line" | awk '{print $4}')
    [ -z "$unit" ] && continue
    enabled="unknown"
    found=$(echo "$enabled_map" | awk -v u="$unit" '$1==u {print $2; exit}')
    [ -n "$found" ] && enabled="$found"
    unit="${unit//\\/\\\\}"
    unit="${unit//\"/\\\"}"
    load="${load//\\/\\\\}"
    load="${load//\"/\\\"}"
    active="${active//\\/\\\\}"
    active="${active//\"/\\\"}"
    sub="${sub//\\/\\\\}"
    sub="${sub//\"/\\\"}"
    enabled="${enabled//\\/\\\\}"
    enabled="${enabled//\"/\\\"}"
    echo "{\"unit\":\"$unit\",\"load\":\"$load\",\"active\":\"$active\",\"sub\":\"$sub\",\"enabled\":\"$enabled\"}"
done < <(systemctl list-units --type=service --all --plain --no-legend --no-pager 2>/dev/null)
