// Novedades de cada versión (lo más nuevo arriba). Se muestran en la ventana de "Novedades"
// la primera vez que alguien entra en el día o cuando hay una versión nueva.
export const CHANGELOG = [
  {
    v: '2.0.2', date: '2026-10-28', title: 'Todas las mejoras en una misma versi?n',
    intro: 'Oficio y legado conservan las mejoras de producci?n, capacidad y rendimiento.',
    groups: [
      ['M?quinas y pedidos', [
        'Racks de seis A1 solas, A1 Combo, P1S Combo y K1C con precios equilibrados.',
        'FDM, resina, l?ser y CNC liberan sus reservas cuando ya no hacen falta en el pedido.',
        'Cada pedido muestra sus reservas por tecnolog?a y el tablero muestra las m?quinas disponibles para asignar.',
      ]],
      ['Rendimiento', [
        'Menos redibujados y liberaci?n de recursos 3D; la escena se pausa cuando no est? visible.',
      ]],
    ],
  },
  {
    v: '2.0.1', date: '2026-10-26', title: 'Cada pieza dice con qué se hace',
    intro: 'Pedido de la comunidad: ahora se entiende de un vistazo qué máquina necesita cada trabajo.',
    groups: [
      ['🏷️ Tecnología en cada pieza', [
        'Al lado de cada pieza de un pedido aparece una etiqueta de color: 🧵 FDM, 💧 Resina, 🔦 Láser o ⚙️ CNC.',
        'También en los contratos de inversión. Pasá el mouse por encima para ver el nombre completo.',
      ]],
    ],
  },
  {
    v: '2.0', date: '2026-10-26', title: 'Oficio y legado',
    intro: 'Tu carrera de maker ahora deja huella: metas que se cuentan a través de todas tus mudanzas y ventajas nuevas para los que ya juntaron mucho Oficio.',
    groups: [
      ['🏛️ Metas de legado (en la ventana de Oficio)', [
        '10 logros de toda tu carrera: tres etapas, dos naves, planta propia, campeón de Expos, inversor, un millón de piezas y más.',
        'Cada meta da Oficio una sola vez. Las Expos, piezas, proyectos y contratos que ya tenías también cuentan.',
      ]],
      ['⭐ Ventajas nuevas en el Banco de Oficio', [
        '🔧 Ingeniería de mods: 4 ranuras de mods en todas tus máquinas.',
        '💼 Inversor experimentado: los contratos de inversión pagan más.',
        '🏭 Franquicia industrial: arrancás cada etapa en el Taller industrial.',
        '📜 Plan de sucesión: más capital al mudarte.',
      ]],
      ['🏆 Desafíos de Oficio más claros', [
        'Cada desafío muestra su dificultad (★ a ★★★) y cuánto tiempo lleva más o menos.',
      ]],
    ],
  },
  {
    v: '1.9', date: '2026-10-26', title: 'Tu empresa, a tu manera',
    intro: 'Para los que ya llegaron lejos: decisiones de empresa y una forma de que la plata vuelva a importar. Está en Ciudad → 💼 Empresa (y en el botón 💼 Inversiones de Pedidos).',
    groups: [
      ['🏢 Especialización de empresa (desde el Taller industrial)', [
        '🏭 Producción en serie: +25 % de velocidad y los pedidos grandes pagan +20 %, pero la venta suelta paga −10 %.',
        '🎨 Taller boutique: los pedidos pagan +30 % y los clientes te toman confianza más rápido, pero las máquinas van −10 %.',
        '🎯 Precisión técnica: resina, CNC y lo que pide ★3 o más paga +35 %, el Premium paga más y hay −20 % de fallas, pero las FDM van −15 %.',
        'La primera vez es gratis; cambiar después cuesta plata y hay que esperar 30 minutos.',
      ]],
      ['💼 Contratos de inversión (desde Reputación 10)', [
        'Ponés plata al principio y, si cumplís a tiempo, te vuelve multiplicada, más fichas y reputación. Si fallás, la perdés.',
        'Seguro (×1,6, plazo largo), arriesgado (×2,5, plazo corto) o licitación grande (×3,5, varias tecnologías).',
        'La inversión crece con tus ingresos y tu caja: la plata vuelve a ser una decisión.',
      ]],
    ],
  },
  {
    v: '1.8', date: '2026-10-26', title: 'Mudanza Evolutiva',
    intro: 'Mudarte ya no es empezar de cero: vendés una etapa de tu empresa para financiar la próxima, más ambiciosa.',
    groups: [
      ['🏭 Tu empresa tiene valor', [
        'Al mudarte se valúa tu empresa: máquinas (según lo que pagaste y su desgaste), mods, instalaciones y caja.',
        'Con eso arrancás con capital: el 25 % de lo que vendés más el 5 % de tu caja, con un tope (lo que vale el taller dos lugares más arriba de donde arrancás). No cuenta como «ganado».',
      ]],
      ['🧠 Conocimientos', [
        'Las áreas que ya usaste (resina, láser, CNC) quedan aprendidas: volver a equiparlas cuesta la mitad.',
      ]],
      ['📜 Historia de tu empresa', [
        'Cada mudanza queda registrada como una etapa: el taller al que llegaste, lo que ganaste, los pedidos, las máquinas y el capital que te llevaste.',
      ]],
      ['💾 Tu partida, a salvo', [
        'En Ajustes: «Descargar copia» guarda tu partida en un archivo y «Cargar archivo» la recupera.',
        'Antes de cada mudanza se guarda una copia automática y podés volver a antes de la última mudanza.',
      ]],
    ],
  },
  {
    v: '1.7', date: '2026-10-26', title: 'Más justo para todos',
    intro: 'Primeros ajustes del plan de progresión: que jugar valga más que dejar el juego abierto, y que mudarse premie todo lo que lograste.',
    groups: [
      ['⏸️ Juego de fondo', [
        'Si el juego queda en otra pestaña o ventana, el taller se frena. Al volver se calcula como cuando lo cerrás: al 50 % (o lo que te den la Cámara remota y Duermo tranquilo) y con el mismo tope de horas.',
        'Si cambiás de pestaña menos de un minuto, sigue todo normal.',
      ]],
      ['🏅 Oficio por lo que lograste', [
        'La Mudanza ahora da Oficio por la plata ganada y también por el taller que alcanzaste (Local +2, Industrial +4, Nave +6, Planta +8) y por los pedidos entregados (+1 cada 40, hasta 10).',
        'La ventana de Oficio muestra de dónde sale cada punto.',
      ]],
      ['📦 La Bodega viaja con vos', [
        'Las máquinas guardadas en la Bodega ya no se pierden al mudarte.',
      ]],
    ],
  },
  {
    v: '1.6', date: '2026-10-25', title: 'Nuevo equilibrio: más camino, mejoras más accesibles',
    intro: 'El juego se estaba pasando muy rápido. Ahora llegar a la Planta lleva más tiempo, y mejorar tu taller rinde más en el camino.',
    groups: [
      ['🏭 Talleres', [
        'Garage: AR$ 20 M · Reputación 6. Local: AR$ 450 M · Rep. 9. Taller industrial: AR$ 7.000 M · Rep. 13.',
        'Nave de producción: AR$ 50.000 M · Rep. 17. Planta 3DBAT: AR$ 400.000 M · Rep. 22.',
        'Si ya estabas en un taller más grande, no perdés nada: seguís donde estás.',
      ]],
      ['⚡ Mejoras más baratas', [
        'Velocidad (Orca Slicer, hotend, exposición, potencia, fresas) y marca (Instagram, Marca personal) cuestan menos y suben menos de precio en cada nivel.',
      ]],
    ],
  },
  {
    v: '1.5', date: '2026-10-25', title: 'Ideas de la comunidad',
    intro: 'Varias de estas mejoras salieron del buzón de Sugerencias. ¡Gracias!',
    groups: [
      ['💡 Ideas de ustedes', [
        'Generador eléctrico (idea de Chechulina): en Mejoras. Cuando se corta la luz, el taller sigue al 50 %, 80 % o 100 % según el nivel.',
        'Turbo de pedido (idea de SHUNE3D): si un pedido viene justo, por 5 fichas suma de golpe el 25 % de las piezas. Una vez por pedido.',
        'Bodega (idea de Elcompy): guardá máquinas para cambiarlas cuando quieras. No producen ni se gastan. Botón 📦 arriba del taller.',
        'Menos memoria (idea de benja): el taller 3D libera lo que ya no usa al cambiar de piso, y cerrar o recargar la página ya no traba el navegador.',
      ]],
      ['📋 Pedidos', [
        '🧠 «Elegir los mejores»: analiza tiempo con tus máquinas libres, material y plata por minuto, y acepta los pedidos que llegan a tiempo y más convienen.',
        'Botón «Todas» para asignarle a un pedido todas las máquinas que sirven.',
        'Mantené apretado + o − para sumar o sacar máquinas rapidísimo.',
        'Si no podés sumar más máquinas, te dice por qué (otra tecnología, calidad que pide, o están ocupadas).',
      ]],
      ['🎨 Pisos más prolijos', [
        'Tu cartel personalizado (o el nombre de tu taller) ahora aparece en la pared de cada piso y en la recepción de la Planta, en vez de «3DBAT» fijo.',
        'El nombre del piso, el cuadro de honor y las pantallas ya no se pisan ni se cortan.',
        'Luces más ordenadas y el gato sin base blanca.',
        'El gato ahora duerme al lado de los filamentos (ya no queda debajo de la recepción).',
        'La página arranca más liviana: las miniaturas 3D se guardan y no se vuelven a dibujar cada vez.',
        '⚡ Modo liviano (Ajustes → Animaciones): sin la plata que sale de cada máquina, sin barritas ni brillos, y el 3D más liviano.',
        'Recargar con F5 o cerrar la página ya no debería trabar el navegador.',
        'Las horas jugadas cuentan todo el tiempo con el juego abierto (también de fondo).',
      ]],
    ],
  },
  {
    v: '1.4', date: '2026-10-25', title: 'Más control sobre tus pedidos',
    intro: 'Arreglos y mejoras que pidieron ustedes.',
    groups: [
      ['📋 Pedidos', [
        'Botón «Liberar máquinas»: saca todas las máquinas de los pedidos para que las asignes vos al que quieras.',
        'Interruptor «Aceptar pedidos solo» (con el Gestor de pedidos): apagalo y elegís vos qué aceptar, así no se te pasa ningún pedido especial.',
        'Si falta material para un pedido, se compra solo con envío urgente (+25 %): los pedidos ya no se traban.',
        'La lista de pedidos tiene su propio scroll.',
      ]],
      ['🏭 Planta 3DBAT más grande', [
        'Ahora tiene pisos de 30 máquinas cada uno: hasta 120 (40 más que la Nave).',
      ]],
      ['🧉 Y además', [
        'Los desafíos cuentan los mates cebados, las piezas retiradas a mano y las fallas resueltas.',
        'Botón ? a la derecha del mate que explica qué hace.',
        'Pestañas de la Tienda en dos filas y sin espacio vacío abajo.',
      ]],
    ],
  },
  {
    v: '1.3', date: '2026-10-25', title: 'Granjas en serio, BATI LIVE y mercado de lotes',
    intro: 'Más motivos para jugar en equipo, juntarse los viernes y ayudar a los que recién empiezan.',
    groups: [
      ['🏭 Granjas con roles', [
        'Cada integrante elige su rol: Responsable FDM, Especialista en resina, láser o CNC, Logística o Reclutador.',
        'Cada rol tiene su misión semanal, que da puntos y experiencia a la granja.',
        'Pedido de colaboración semanal (Festival Maker 3DBAT): una meta por tecnología que se completa entre todos.',
      ]],
      ['⚔️ Guerra amistosa de granjas', [
        'Todos los sábados tu granja se cruza con otra de nivel parecido durante 24 horas.',
        'Nadie ataca ni roba: gana la que más produce y con más integrantes distintos aportando.',
        'Premio: banner Campeones, título para todos y puntos para la granja.',
      ]],
      ['🔴 BATI LIVE · viernes de 21 a 22 h', [
        'Una hora de feria nocturna: pedidos ×1,5, ventas ×1,25 y más pedidos urgentes.',
        'Meta comunitaria de piezas: si se cumple, todos los que aportaron se llevan título y la figura de BATI.',
        'BATI anuncia el evento, lo relata en vivo y avisa cuando se cumple la meta.',
      ]],
      ['📦 Mercado de lotes', [
        'Nueva pestaña Lotes en la Tienda: vendé material o fichas que te sobran y comprá lotes de otros makers.',
        'Donaciones para jugadores nuevos.',
        'Si nadie compra tu lote en 3 días, vuelve solo.',
      ]],
      ['🔧 Arreglos', [
        'Los accesorios de BATI y la historia ya no se pierden al hacer la Mudanza.',
      ]],
    ],
  },
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
