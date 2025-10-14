@extends('layouts.app')

@section('content')
<div class="container p-6">
  <h1 class="text-2xl mb-4">Detalle del Proyecto</h1>
  <div id="project-detail-map-root" data-id="{{ $id ?? '' }}"></div>
</div>

@endsection


@vite(['resources/js/components/ProjectDetailMap.js'])
