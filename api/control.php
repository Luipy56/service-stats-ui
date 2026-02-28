<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit(1);
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$action = isset($input['action']) ? trim($input['action']) : '';
$unit = isset($input['unit']) ? trim($input['unit']) : '';

$valid_actions = ['start', 'stop', 'restart'];
if (!in_array($action, $valid_actions, true)) {
    echo json_encode(['ok' => false, 'error' => 'Invalid action']);
    exit(1);
}
if (!preg_match('/^[a-zA-Z0-9_.@-]+\.service$/', $unit)) {
    echo json_encode(['ok' => false, 'error' => 'Invalid unit name']);
    exit(1);
}

$script = '/usr/local/bin/stats-service-control.sh';
if (!file_exists($script)) {
    echo json_encode(['ok' => false, 'error' => 'Script not found']);
    exit(1);
}

$cmd = 'sudo ' . escapeshellarg($script) . ' ' . escapeshellarg($action) . ' ' . escapeshellarg($unit);
$out = [];
exec($cmd . ' 2>/dev/null', $out, $code);
$raw = implode("\n", $out);

if ($raw !== '') {
    $decoded = json_decode($raw, true);
    if (!empty($decoded['ok'])) {
        $cache_file = sys_get_temp_dir() . '/stats-services-cache/list.json';
        @unlink($cache_file);
    }
    echo $raw;
} else {
    echo json_encode(['ok' => false, 'error' => 'No output']);
}
