@extends('layouts.app')

@section('content')
<div class="container">
    <h2 class="mb-4">Crear Proyecto y Trazos</h2>
    <div id="project-detail-map-root" data-id="new"></div>
</div>
@endsection


@vite(['resources/js/components/ProjectDetailMap.js'])
