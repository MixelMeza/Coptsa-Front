<?php

use App\Http\Controllers\ProjectController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/projects');
});

Route::get('/projects', function () {
    return view('projects.index');
});

Route::get('/projects/create', [ProjectController::class, 'create'])->name('projects.create');

Route::get('/projects/{id}', function ($id) {
    return view('projects.show', ['id' => $id]);
});

// Lightweight API endpoints (for local/dev usage) to avoid 404 when /api routes aren't loaded
use App\Http\Controllers\Api\ProjectsController;

Route::post('/api/projects', [ProjectsController::class, 'store']);
Route::post('/api/projects/{id}/tramos', [ProjectsController::class, 'saveTramos']);
Route::get('/api/projects/{id}', [ProjectsController::class, 'show']);
