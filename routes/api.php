<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\MarkerImageController;

// Marker image endpoints (support both /api/marker-images and legacy /api/uploads)
Route::post('/marker-images', [MarkerImageController::class, 'store']);
Route::post('/uploads', [MarkerImageController::class, 'store']);
Route::delete('/marker-images/{filename}', [MarkerImageController::class, 'destroy']);
// Health check for marker-images routes (useful for quick diagnostics)
Route::get('/marker-images/health', function() {
    return response()->json(['ok' => true]);
});

// Simple API for development: create project and save tramos
Route::post('/projects', function (Request $request) {
    $data = $request->all();
    $storage = storage_path('app/projects.json');
    $all = [];
    if (file_exists($storage)) {
        $content = file_get_contents($storage);
        $all = json_decode($content, true) ?? [];
    }
    $id = uniqid();
    $entry = array_merge(['id' => $id, 'created_at' => date('c')], $data);
    $all[$id] = $entry;
    file_put_contents($storage, json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    return response()->json(['id' => $id], 201);
});

Route::post('/projects/{id}/tramos', function (Request $request, $id) {
    $storage = storage_path('app/projects.json');
    if (!file_exists($storage)) return response()->json(['error' => 'Project storage not found'], 404);
    $content = json_decode(file_get_contents($storage), true) ?? [];
    if (!isset($content[$id])) return response()->json(['error' => 'Project not found'], 404);
    $tramos = $request->input('tramos', []);
    $summary = $request->input('summary', []);
    $content[$id]['tramos'] = $tramos;
    $content[$id]['summary'] = $summary;
    file_put_contents($storage, json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    return response()->json(['ok' => true]);
});
