@extends('layouts.app')

@section('content')
<div style="max-width:1000px;margin:24px auto;padding:16px;font-family:system-ui,Segoe UI,Arial,sans-serif;">
  <h1 style="font-size:20px;margin-bottom:12px">Listado de Proyectos</h1>

  <!-- Fallback estático: se mostrará cuando JS/Vite no esté activo. Si JS se carga, reemplazará este contenido. -->
  <div id="projects-list-root">
    <div style="background:#fff;border:1px solid #eaeaea;border-radius:8px;padding:12px">
      <div style="font-weight:600;margin-bottom:8px">Proyectos <small style="color:#666;margin-left:8px">(datos de ejemplo)</small></div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#fafafa;text-align:left"><th style="padding:8px">ID</th><th style="padding:8px">Nombre</th><th style="padding:8px">Marcadores</th><th style="padding:8px">Rutas</th><th style="padding:8px">Distancia</th><th style="padding:8px">Estado</th><th style="padding:8px">Fecha</th></tr></thead>
        <tbody>
          <tr><td style="padding:8px;border-top:1px solid #f1f1f1">1</td><td style="padding:8px;border-top:1px solid #f1f1f1">Proyecto Demo 1</td><td style="padding:8px;border-top:1px solid #f1f1f1">5</td><td style="padding:8px;border-top:1px solid #f1f1f1">2</td><td style="padding:8px;border-top:1px solid #f1f1f1">1,234.5</td><td style="padding:8px;border-top:1px solid #f1f1f1;color:green">Activo</td><td style="padding:8px;border-top:1px solid #f1f1f1">2025-10-04 19:00</td></tr>
          <tr><td style="padding:8px;border-top:1px solid #f1f1f1">2</td><td style="padding:8px;border-top:1px solid #f1f1f1">Proyecto Demo 2</td><td style="padding:8px;border-top:1px solid #f1f1f1">2</td><td style="padding:8px;border-top:1px solid #f1f1f1">1</td><td style="padding:8px;border-top:1px solid #f1f1f1">520.0</td><td style="padding:8px;border-top:1px solid #f1f1f1;color:#888">Inactivo</td><td style="padding:8px;border-top:1px solid #f1f1f1">2025-09-10 10:30</td></tr>
          <tr><td style="padding:8px;border-top:1px solid #f1f1f1">3</td><td style="padding:8px;border-top:1px solid #f1f1f1">Proyecto Demo 3</td><td style="padding:8px;border-top:1px solid #f1f1f1">8</td><td style="padding:8px;border-top:1px solid #f1f1f1">5</td><td style="padding:8px;border-top:1px solid #f1f1f1">3,420.2</td><td style="padding:8px;border-top:1px solid #f1f1f1;color:green">Activo</td><td style="padding:8px;border-top:1px solid #f1f1f1">2025-08-01 08:15</td></tr>
        </tbody>
      </table>
    </div>
  </div>

</div>
@endsection
