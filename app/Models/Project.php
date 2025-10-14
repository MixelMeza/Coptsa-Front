<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;
    protected $fillable = ['nombre','summary'];
    protected $casts = [
        'summary' => 'array'
    ];

    public function tramos()
    {
        return $this->hasMany(Tramo::class);
    }
}
