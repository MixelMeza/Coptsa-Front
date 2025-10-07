@extends('layouts.app')

@section('content')
<div class="container p-6">
  <h1 class="text-2xl mb-4">Proyecto</h1>
  <div id="project-detail-root" data-id="{{ $id ?? '' }}"></div>
</div>

@endsection
