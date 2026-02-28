<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');

$script = '/usr/local/bin/stats-list-services.sh';
if (!file_exists($script)) {
    echo json_encode(['error' => 'Script not found']);
    exit(1);
}

$cache_ttl = 5;
$cache_dir = sys_get_temp_dir() . '/stats-services-cache';
$cache_file = $cache_dir . '/list.json';
if (!is_dir($cache_dir)) {
    @mkdir($cache_dir, 0750, true);
}
if (is_dir($cache_dir) && is_readable($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
    echo file_get_contents($cache_file);
    exit;
}

$cmd = 'sudo ' . escapeshellarg($script) . ' 2>/dev/null';
$h = popen($cmd, 'r');
$lines = [];
if ($h) {
    while (($line = fgets($h)) !== false) {
        $line = trim($line);
        if ($line === '') continue;
        $lines[] = $line;
    }
    pclose($h);
}

if (count($lines) === 0) {
    echo json_encode(['error' => 'Failed to list services']);
    exit(1);
}

$out = '[' . implode(',', $lines) . ']';
$json = json_decode($out);
if ($json === null) {
    echo json_encode(['error' => 'Invalid JSON from script']);
    exit(1);
}

@file_put_contents($cache_file, $out, LOCK_EX);

echo $out;
