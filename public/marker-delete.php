<?php
// Lightweight delete handler (bypass Laravel). Expects POST 'filename' (basename only).
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}
$name = isset($_POST['filename']) ? basename($_POST['filename']) : null;
if (!$name) {
    http_response_code(400);
    echo json_encode(['error' => 'missing_filename']);
    exit;
}
$path = __DIR__ . '/storage/marker_images/' . $name;
if (file_exists($path)) {
    $ok = unlink($path);
    if ($ok) echo json_encode(['deleted' => true]); else { http_response_code(500); echo json_encode(['deleted' => false]); }
} else {
    http_response_code(404);
    echo json_encode(['deleted' => false]);
}
