#!/bin/bash
# Output system stats as JSON: memory (free -h), load, uptime

mem=$(free -h 2>/dev/null | awk '
/^Mem:/  { total=$2; used=$3; free=$4; shared=$5; buff=$6; avail=$7 }
/^Swap:/ { swap_total=$2; swap_used=$3; swap_free=$4 }
END {
    printf "{\"total\":\"%s\",\"used\":\"%s\",\"free\":\"%s\",\"shared\":\"%s\",\"buffcache\":\"%s\",\"available\":\"%s\",\"swap_total\":\"%s\",\"swap_used\":\"%s\",\"swap_free\":\"%s\"}",
    total, used, free, shared, buff, avail, swap_total, swap_used, swap_free
}')
uptime_str=$(uptime 2>/dev/null | sed 's/^.*up /up /' | sed 's/, *[0-9]* user.*//')
load=$(uptime 2>/dev/null | sed 's/.*load average: //')
# Escape for JSON
uptime_str="${uptime_str//\\/\\\\}"; uptime_str="${uptime_str//\"/\\\"}"
load="${load//\\/\\\\}"; load="${load//\"/\\\"}"

echo "{\"memory\":$mem,\"uptime\":\"$uptime_str\",\"load\":\"$load\"}"
