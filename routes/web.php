<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/projects');
});

Route::get('/projects', function () {
    return view('projects.index');
});

Route::get('/projects/{id}', function ($id) {
    return view('projects.show', ['id' => $id]);
});
