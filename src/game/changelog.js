// Novedades de cada versión (lo más nuevo arriba). Se muestran en la ventana de "Novedades"
// la primera vez que alguien entra en el día o cuando hay una versión nueva.
export const CHANGELOG = [
  {
    v: '1.2', date: '2026-10-25', title: 'Liga Maker y Duelos',
    intro: 'El ranking deja de ser solo una lista: ahora cada semana competís contra jugadores de tu nivel.',
    groups: [
      ['🏅 Liga Maker 3DBAT', [
        'Divisiones: Bronce, Plata, Oro, Platino, Diamante, Leyenda Maker y Top 100 3DBAT.',
        'Cada lunes entrás en un grupo de hasta 20 makers de tu división. Los 3 primeros suben y los 3 últimos bajan.',
        'Sumás con pedidos, contratos, producción, fallas resueltas, retos, aportes a la granja y duelos.',
        'Premios solo estéticos: un título por cada división nueva, marcos Platino y Diamante, y la corona para BATI.',
      ]],
      ['⚔️ Duelos Maker', [
        'Duelos de 10 minutos contra alguien de nivel parecido: carrera de producción, supervivencia (fallas ×3) o duelo técnico de una sola tecnología.',
        'Son asincrónicos: cada uno juega cuando quiere (24 h). Gana el que mejor rinde sobre la capacidad de su taller.',
        'BATI narra el duelo y ganar suma +30 puntos de Liga. Con 10 victorias, título de Duelista.',
      ]],
    ],
  },
  {
    v: '1.1', date: '2026-10-25', title: 'BATI toma el mando',
    intro: 'BATI deja de ser solo el tutorial: ahora es tu encargado de planta. Y el chat se vuelve mucho más útil.',
    groups: [
      ['🦇 BATI, tu encargado de planta', [
        'Te avisa lo importante: máquinas gastadas, pedidos que convienen más, oportunidades del mapa y rivales que te pasan.',
        'Elegí cuánto te ayuda: principiante, normal o experto (tocá a BATI → Ayuda).',
        'Narra la Expo Maker en vivo: mitad de tiempo, últimos 2 minutos y resultado.',
      ]],
      ['📖 La historia de BATI', [
        '6 capítulos con diálogos, objetivos y una decisión al final: el cliente difícil, la feria del barrio, el pedido imposible y más.',
        'Cada capítulo le da un accesorio a BATI: gorrita, lentes, mate, casco CNC, antiparras, capa… (y la máscara si ganás una Expo).',
      ]],
      ['💬 Chat más útil', [
        'Reacciones rápidas: 🖨️ 🔥 🧉 ⚡ 🏆 😱.',
        'Avisos automáticos cuando alguien logra algo grande (se pueden apagar).',
        'Comandos: /reto, /ranking, /granja, /bati, /visitar apodo y /ayuda.',
        'Preguntale a @BATI: «¿qué hago ahora?», «tip FDM», «rival», «expo»…',
        'Modo solo granja y botón para denunciar mensajes.',
      ]],
    ],
  },
  {
    v: '1.0', date: '2026-10-25', title: '¡Maker Tycoon 1.0!',
    intro: 'La primera versión completa del juego. Esto es todo lo que se sumó en las últimas actualizaciones:',
    groups: [
      ['🏭 Nave de producción y Planta', [
        'Desde el nivel 6 el taller se organiza en 4 pisos: FDM, Resina, Láser y CNC (20 máquinas cada uno, hasta 80).',
        'Barra de pisos debajo del taller, con un puntito rojo si en otro piso hay algo para atender.',
        'Cada piso tiene su ambiente. En la Planta 3DBAT: recepción, robots y contratos especiales que pagan ×5,5.',
        'Botones ◀ Mover / Mover ▶ para reorganizar las máquinas dentro de su piso.',
      ]],
      ['📋 Pedidos con decisiones', [
        'Presupuestos: económico, estándar, rápido o premium. Cambian la paga, el plazo, la reputación y el riesgo.',
        'Clientes con memoria: confianza, reseñas y un presupuesto preferido. Los fieles vuelven más seguido y pagan mejor.',
        'Proyectos grandes de varias etapas (cafetería, feria gamer, stand…), con bonus al terminar.',
        'Pedidos combinados entre pisos en la Nave.',
      ]],
      ['🔧 Máquinas', [
        'Mods por máquina: 3 ranuras con hotend, gabinete, pantalla 16K, air assist, husillo y más.',
        'Desgaste: las máquinas se gastan con el uso y se reparan en Mejoras.',
        'Tienda de Usados entre jugadores y Plan canje (también con fichas y entre makers).',
      ]],
      ['🏙️ Ciudad', [
        'Mapa de demanda: cada 30 minutos cambian las zonas que compran más.',
        'Talleres rivales con fama propia: superalos para ganar fichas.',
        'Expo Maker: el gran evento. Elegí productos y stand, y competí por premios.',
      ]],
      ['💬 Comunidad', [
        'Chat en vivo con menciones y avisos (el botón redondo de abajo).',
        'El ranking muestra quién está jugando ahora, desde cuándo y cuántas horas jugó.',
      ]],
      ['✨ Además', [
        'Estadísticas del taller (botón 📊): mejor máquina, producción, fallas y clientes.',
        'Gráficos más realistas, sobrino y gato animados, y fotos reales de las máquinas.',
        'Encabezado más compacto y lista de máquinas que se puede ocultar con el ojito.',
      ]],
    ],
  },
];
export const latest = () => CHANGELOG[0];
