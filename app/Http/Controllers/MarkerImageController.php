<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MarkerImageController extends Controller
{
    // Store uploaded marker image and return public URL
    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:jpeg,png,jpg,gif,webp|max:8192'
        ]);
        $file = $request->file('file');
        $path = $file->store('marker_images', 'public');
        if (!$path) {
            return response()->json(['error' => 'upload_failed'], 500);
        }
        $url = Storage::url($path);
        return response()->json(['url' => $url, 'path' => $path]);
    }

    // Delete image by path (expects full relative path under disk, e.g. marker_images/xxx.jpg)
    public function destroy(Request $request, $path)
    {
        // sanitize path (no traversal)
        $path = basename($path); // only filename
        $full = 'marker_images/' . $path;
        if (Storage::disk('public')->exists($full)) {
            Storage::disk('public')->delete($full);
            return response()->json(['deleted' => true]);
        }
        return response()->json(['deleted' => false], 404);
    }
}
