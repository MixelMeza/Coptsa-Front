<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Tramo;
use Illuminate\Http\Request;

class ProjectsController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'tramos' => 'array',
            'summary' => 'array'
        ]);
        $project = Project::create(['nombre' => $data['nombre'], 'summary' => $data['summary'] ?? null]);
        // optionally create tramos if provided
        if (!empty($data['tramos']) && is_array($data['tramos'])) {
            foreach ($data['tramos'] as $t) {
                $t['project_id'] = $project->id;
                Tramo::create($t);
            }
        }
        return response()->json(['id' => $project->id], 201);
    }

    public function saveTramos(Request $request, $id)
    {
        $project = Project::find($id);
        if (!$project) return response()->json(['error' => 'Project not found'], 404);
        $data = $request->validate([
            'tramos' => 'array',
            'summary' => 'array'
        ]);
        // remove existing tramos and recreate (simple approach)
        $project->tramos()->delete();
        if (!empty($data['tramos'])) {
            foreach ($data['tramos'] as $t) {
                $t['project_id'] = $project->id;
                Tramo::create($t);
            }
        }
        $project->summary = $data['summary'] ?? null;
        $project->save();
        return response()->json(['ok' => true]);
    }

    public function show($id)
    {
        $project = Project::with('tramos')->find($id);
        if (!$project) return response()->json(['error' => 'Project not found'], 404);
        return response()->json($project);
    }
}
