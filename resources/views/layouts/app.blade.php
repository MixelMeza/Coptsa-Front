<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ config('app.name', 'Laravel') }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
  </head>
  <body class="bg-[#FDFDFC] dark:bg-[#0a0a0a] text-[#1b1b18] min-h-screen">
    <nav class="p-4 bg-white dark:bg-[#161615] shadow">
      <div class="container mx-auto">
        <a href="/projects" class="font-medium">Proyectos</a>
      </div>
    </nav>
    <main class="container mx-auto py-6">
      @yield('content')
    </main>
  </body>
</html>
