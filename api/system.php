<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');

$script = '/usr/local/bin/stats-system-info.sh';
if (!file_exists($script)) {
    echo json_encode(['error' => 'Script not found']);
    exit(1);
}

$out = [];
exec('sudo ' . escapeshellarg($script) . ' 2>/dev/null', $out, $code);
$raw = implode("\n", $out);

if ($code !== 0 || $raw === '') {
    echo json_encode(['error' => 'Failed to get system info']);
    exit(1);
}

$json = json_decode($raw);
if ($json === null) {
    echo json_encode(['error' => 'Invalid JSON from script']);
    exit(1);
}

echo $raw;
