<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tramo extends Model
{
    use HasFactory;
    protected $fillable = ['project_id','nombre','descripcion','color','distancia','hilos','buffer','puntos'];
    protected $casts = [
        'puntos' => 'array'
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
