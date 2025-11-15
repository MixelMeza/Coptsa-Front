<?php
// Lightweight upload handler (bypass Laravel). Save to public/storage/marker_images
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}
if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['error' => 'no_file']);
    exit;
}
$upload = $_FILES['file'];
$dir = __DIR__ . '/storage/marker_images';
if (!is_dir($dir)) mkdir($dir, 0755, true);
$ext = pathinfo($upload['name'], PATHINFO_EXTENSION);
$name = bin2hex(random_bytes(8)) . ($ext ? '.' . $ext : '');
$dest = $dir . '/' . $name;
if (!move_uploaded_file($upload['tmp_name'], $dest)) {
    http_response_code(500);
    echo json_encode(['error' => 'upload_failed']);
    exit;
}
$url = rtrim((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'], '/') . '/storage/marker_images/' . $name;
echo json_encode(['url' => $url, 'path' => 'marker_images/' . $name]);
