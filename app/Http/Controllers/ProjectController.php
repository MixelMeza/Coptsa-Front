<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ProjectController extends Controller
{
    public function create()
    {
        // Retorna la vista con el mapa interactivo para crear proyecto
        return view('projects.create');
    }
}
