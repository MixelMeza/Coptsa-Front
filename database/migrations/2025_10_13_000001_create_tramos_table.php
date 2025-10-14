<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('tramos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->string('nombre')->nullable();
            $table->text('descripcion')->nullable();
            $table->string('color', 20)->nullable();
            $table->double('distancia')->nullable();
            $table->integer('hilos')->nullable();
            $table->integer('buffer')->nullable();
            $table->json('puntos')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('tramos');
    }
};
