# Fuente de verdad y publicación: Maker Tycoon

Registro verificado el 28 de octubre de 2026.

## Dónde está cada cosa

- Producción: https://3dbat.com.ar/batbox/juego/ — Hostinger.
- Repositorio: https://github.com/3dbatimpresiones/maker-tycoon, rama `main`.
- Código local utilizado para publicar el dominio: `C:/Users/3DBAT/Documents/Claude/3DBAT/maker-tycoon`.
- Build del sitio completo: `C:/Users/3DBAT/Documents/Claude/3DBAT/web-3dbat/scripts/build-full.mjs`; compila desde la carpeta hermana `maker-tycoon`, no desde un clon de trabajo de Codex.
- GitHub Pages del juego y BATBOX son despliegues independientes. Sus workflows no publican Hostinger.

## Qué se unificó

La copia local tenía 2.0.1 (Oficio, legado y etiquetas de tecnología) y GitHub tenía 1.10.1 con correcciones que faltaban en el dominio. Se unificaron en **2.0.2**, PR #6, merge `0ff6ca5`.

Incluye los racks 6× A1 solas, 6× A1 Combo, 6× P1S Combo y 6× K1C; liberación de reservas sobrantes en las cuatro tecnologías; reservas y capacidad libre por tecnología; mejoras de CPU y liberación de recursos 3D. Conserva las novedades de 2.0.1. Pasaron 63 pruebas del motor, comprobaciones de render/recursos/racks y build.

No volver a publicar una copia 2.0.1 antigua ni reemplazar novedades locales con un checkout remoto anterior.

## Antes de modificar y publicar

1. Revisar `git status`, rama, commit y versión en la copia local y en el clon de trabajo. Hacer fetch y comparar historiales. Conservar cambios sin publicar; no resetear ni sobreescribirlos.
2. Integrar sobre el código más reciente. Guardar el cambio en GitHub y sincronizar la copia local que usa el build del dominio. Usar fast-forward cuando corresponda; si hay divergencias, resolver conservando ambas líneas de trabajo.
3. Ejecutar pruebas y build en la versión integrada.
4. Diferenciar explícitamente: código subido a GitHub, código sincronizado localmente, y build publicado en Hostinger. No afirmar publicación en el dominio basándose solo en GitHub Pages.

## ZIP compatible con Hostinger

**No usar PowerShell `Compress-Archive`.** El paquete anterior contenía entradas como `assets\index.js`; Hostinger las extrajo como archivos sueltos con barras invertidas en el nombre. El HTML nuevo buscaba `assets/index.js`, recibió 404 y el juego quedó en blanco.

Crear el ZIP desde el contenido de `dist/`, con rutas POSIX y sin carpeta contenedora. Ejemplo Python ejecutado desde el repositorio:

```python
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path('dist')
with ZipFile('maker-tycoon-hostinger.zip', 'w', ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(root).as_posix())

with ZipFile('maker-tycoon-hostinger.zip') as archive:
    names = archive.namelist()
    assert 'index.html' in names and 'version.json' in names
    assert any(name.startswith('assets/') for name in names)
    assert all('\\' not in name and not name.startswith('/')
               and '..' not in Path(name).parts for name in names)
```

## Destino y comprobación

Para actualizar solo el juego, publicar exclusivamente en `public_html/batbox/juego/`. La estructura final es:

```text
juego/
  assets/
  index.html
  version.json
  favicon.svg
  og.png
```

Extraer en esa misma carpeta, sin otra carpeta contenedora. Verificar antes la estructura interna del ZIP; no confiar únicamente en lo que muestra el cuadro de extracción.

Después, verificar en **el dominio real**: versión visible, carga de partida, JavaScript/CSS del HTML, módulos dinámicos y escena 3D. Abrir consola y comprobar errores. Hostinger puede conservar respuestas 404 en caché: comparar una solicitud sin caché y purgar caché si corresponde. Las imágenes pueden ser optimizadas por el CDN y diferir en hash sin estar dañadas.

## Recuperación y limpieza realizadas

Se repararon directamente las rutas de los módulos nuevos y el CSS en Hostinger. Se abrió 2.0.2, cargó la partida baticueva y la escena 3D; se observaron los racks y contadores. Después se movieron **83 sobrantes a la papelera**, sin borrado definitivo. Quedó la estructura de cinco entradas anterior y se verificaron **91/91 recursos accesibles** después de limpiar.

El ZIP corregido se dejó en `E:/DESCARGAS WINDOWS/maker-tycoon-2.0.2-hostinger.zip` y reemplazó `maker-tycoon-2.0.2.zip` en esa carpeta. No reutilizar copias del paquete original con separadores Windows.
