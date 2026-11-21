import type { BranchMeta, Skill } from '../../../shared/types.ts';

export const BRANCH_META: readonly BranchMeta[] = [
  { id: 'narrativa', label: 'Narrativa y Cultura' },
  { id: 'retorica', label: 'Retórica y Debate' },
  { id: 'estrategia', label: 'Estrategia y Tech' },
] as const;

export const FALLBACK_SKILLS: Skill[] = [
  // ── 1. RAMA NARRATIVA ────────────────────────────────────────────────────────
  {
    id: 'mitologia',
    word: 'Mitología',
    branch: 'narrativa',
    tier: 1,
    parentIds: [],
    posX: 50,
    posY: 16,
    definition:
      'Conjunto de relatos simbólicos y mitos que explican el origen, valores o creencias de una cultura o colectivo.',
    contextTip:
      'Funciona genial tanto en sentido literal (Grecia, nórdica) como metafórico para hablar de relatos casi legendarios alrededor de marcas, líderes o culturas.',
    examples: [
      'La startup construyó toda una mitología alrededor de su primer garaje para inspirar a los nuevos empleados.',
      'Sin entender la mitología andina es difícil descifrar los símbolos de esa pintura.',
    ],
    tabooWords: ['dioses', 'historia', 'leyenda'],
    scenarios: [
      'Úsala para darle una excusa creativa a tu jefe por llegar 20 minutos tarde.',
      'Úsala en un titular periodístico sobre una empresa tecnológica famosa.',
    ],
    forcedConnections: ['microondas', 'semáforo', 'algoritmo'],
  },
  {
    id: 'arquetipo',
    word: 'Arquetipo',
    branch: 'narrativa',
    tier: 2,
    parentIds: ['mitologia'],
    posX: 26,
    posY: 48,
    definition:
      'Modelo original y universal de personaje, símbolo o patrón que se repite en relatos, culturas y conductas humanas.',
    contextTip:
      'Úsalo al analizar películas, marcas o compañeros de equipo que encarnan un rol reconocible al instante.',
    examples: [
      'El mentor escéptico que cede su lugar al aprendiz es un arquetipo clásico del cine de aventuras.',
      'Con su cafetera portátil y sus notas a lápiz, encarnaba el arquetipo del periodista de investigación.',
    ],
    tabooWords: ['modelo', 'ejemplo', 'original'],
    scenarios: [
      'Describe a alguien de tu grupo de trabajo como si fuera un personaje épico.',
      'Úsala en una reseña breve de una serie o videojuego conocido.',
    ],
    forcedConnections: ['paraguas', 'ascensor', 'tostadora'],
  },
  {
    id: 'alegoria',
    word: 'Alegoría',
    branch: 'narrativa',
    tier: 2,
    parentIds: ['mitologia'],
    posX: 74,
    posY: 48,
    definition:
      'Representación simbólica sostenida en la que personajes, objetos o hechos concretos aluden a ideas abstractas o morales.',
    contextTip:
      'A diferencia de una metáfora puntual, una alegoría se extiende por toda una obra, escena o situación cotidiana.',
    examples: [
      'Aquella fila interminable en la oficina pública terminó siendo una alegoría de la burocracia moderna.',
      'La novela utiliza un barco a la deriva como alegoría de una sociedad sin rumbo común.',
    ],
    tabooWords: ['simbolo', 'metafora', 'fabula'],
    scenarios: [
      'Convierte un lunes caótico en el transporte público en una reflexión profunda.',
      'Úsala para explicar por qué una película aparentemente infantil esconde una crítica social.',
    ],
    forcedConnections: ['impresora', 'bicicleta', 'refrigerador'],
  },
  {
    id: 'cosmovision',
    word: 'Cosmovisión',
    branch: 'narrativa',
    tier: 3,
    parentIds: ['arquetipo', 'alegoria'],
    posX: 38,
    posY: 82,
    definition:
      'Manera integral en que una persona o cultura interpreta la realidad, el tiempo, la naturaleza y su propio lugar en el mundo.',
    contextTip:
      'Ideal para elevar debates culturales o explicar por qué dos generaciones chocan ante un mismo problema.',
    examples: [
      'Cambiar de ciudad transformó su cosmovisión: pasó de medir el éxito en horas a medirlo en autonomía.',
      'La arquitectura del templo refleja una cosmovisión donde astronomía y vida diaria eran inseparables.',
    ],
    tabooWords: ['mundo', 'vision', 'cultura'],
    scenarios: [
      'Explica un choque divertido de costumbres entre dos amigos de distintos lugares.',
      'Úsala en la apertura de un ensayo sobre cómo la tecnología cambia nuestra forma de vivir.',
    ],
    forcedConnections: ['calcetín', 'teclado', 'cuchara'],
  },
  {
    id: 'catarsis',
    word: 'Catarsis',
    branch: 'narrativa',
    tier: 3,
    parentIds: ['alegoria'],
    posX: 78,
    posY: 82,
    definition:
      'Liberación intensa y purificadora de emociones acumuladas, provocada por el arte, la palabra o una experiencia límite.',
    contextTip:
      'Brilla cuando describes el alivio posterior a una gran tensión, un concierto, una charla honesta o un cierre de proyecto.',
    examples: [
      'Después de tres meses de entregas nocturnas, borrar las pestañas del navegador fue una auténtica catarsis.',
      'El último acto de la obra llevó al público del silencio tenso a una catarsis colectiva en aplausos.',
    ],
    tabooWords: ['alivio', 'emocion', 'desahogo'],
    scenarios: [
      'Describe lo que se siente al terminar un examen dificilísimo o un proyecto largo.',
      'Úsala como crítica musical tras un concierto memorable.',
    ],
    forcedConnections: ['aspiradora', 'calendario', 'engrapadora'],
  },

  // ── 2. RAMA RETÓRICA ─────────────────────────────────────────────────────────
  {
    id: 'falacia',
    word: 'Falacia',
    branch: 'retorica',
    tier: 1,
    parentIds: [],
    posX: 50,
    posY: 16,
    definition:
      'Razonamiento aparentemente válido y persuasivo, pero lógicamente incorrecto o engañoso en su estructura.',
    contextTip:
      'Úsala para señalar errores de lógica con precisión elegante, sin caer en ataques personales.',
    examples: [
      'Decir que el software es bueno solo porque nadie se quejó ayer es una falacia de supervivencia.',
      'El debate perdió rigor cuando el panelista respondió con una falacia contra el carácter de su rival.',
    ],
    tabooWords: ['mentira', 'engano', 'error'],
    scenarios: [
      'Desmonta con humor la excusa de un amigo que dice que estudiar menos da mejores notas.',
      'Úsala en una reunión para cuestionar una estadística mal interpretada.',
    ],
    forcedConnections: ['pizza', 'patineta', 'lámpara'],
  },
  {
    id: 'sofisma',
    word: 'Sofisma',
    branch: 'retorica',
    tier: 2,
    parentIds: ['falacia'],
    posX: 26,
    posY: 48,
    definition:
      'Argumento falso formulado de manera deliberada y astuta con apariencia de verdad para confundir o ganar una discusión.',
    contextTip:
      'A diferencia de una falacia involuntaria, el sofisma implica intención persuasiva o trampa retórica consciente.',
    examples: [
      'Prometer envíos gratis duplicando el precio base es un sofisma comercial disfrazado de generosidad.',
      'Su discurso sonaba impecable, pero escondía un sofisma diseñado para eludir la pregunta central.',
    ],
    tabooWords: ['trampa', 'falso', 'excusa'],
    scenarios: [
      'Exhibe un anuncio publicitario dudoso con tono irónico.',
      'Úsala para responder a una promesa política o corporativa demasiado bonita para ser verdad.',
    ],
    forcedConnections: ['reloj', 'maleta', 'espejo'],
  },
  {
    id: 'dialectica',
    word: 'Dialéctica',
    branch: 'retorica',
    tier: 2,
    parentIds: ['falacia'],
    posX: 74,
    posY: 48,
    definition:
      'Método de razonamiento y diálogo que avanza mediante el contraste entre ideas opuestas hasta alcanzar una síntesis superior.',
    contextTip:
      'Úsala para describir discusiones productivas donde dos posturas contrarias generan una solución mejor.',
    examples: [
      'La dialéctica entre diseño minimalista y necesidades técnicas produjo una interfaz mucho más clara.',
      'Más que pelear por tener razón, practicaron una dialéctica honesta para depurar la propuesta.',
    ],
    tabooWords: ['debate', 'dialogo', 'discusion'],
    scenarios: [
      'Describe una discusión sobre qué pedir para cenar como si fuera filosofía clásica.',
      'Úsala para elogiar la dinámica constructiva entre dos áreas enfrentadas.',
    ],
    forcedConnections: ['tenedor', 'audífonos', 'llave'],
  },
  {
    id: 'hegemonia',
    word: 'Hegemonía',
    branch: 'retorica',
    tier: 3,
    parentIds: ['sofisma', 'dialectica'],
    posX: 38,
    posY: 82,
    definition:
      'Supremacía o liderazgo dominante que ejerce un grupo, idea, formato o plataforma sobre los demás.',
    contextTip:
      'Muy potente para hablar de estándares tecnológicos, tendencias culturales o consensos que parecen inevitables.',
    examples: [
      'Durante una década, ese formato de video mantuvo una hegemonía indiscutible en las redes sociales.',
      'El nuevo estudio desafió la hegemonía del teclado tradicional con gestos naturales en pantalla.',
    ],
    tabooWords: ['poder', 'dominio', 'control'],
    scenarios: [
      'Habla sobre el reinado absoluto de una canción o meme que suena en todos lados.',
      'Úsala en un análisis sobre competencia entre ecosistemas digitales.',
    ],
    forcedConnections: ['taza', 'parlante', 'cepillo'],
  },
  {
    id: 'pragmatismo',
    word: 'Pragmatismo',
    branch: 'retorica',
    tier: 3,
    parentIds: ['dialectica'],
    posX: 78,
    posY: 82,
    definition:
      'Actitud o criterio que juzga ideas y decisiones por su utilidad práctica y sus resultados concretos más que por la teoría.',
    contextTip:
      'Excelente para equilibrar ideales ambiciosos con restricciones reales de tiempo, presupuesto o equipo.',
    examples: [
      'Con admirable pragmatismo, recortó tres funciones secundarias para lanzar la versión estable a tiempo.',
      'Su pragmatismo evitó dos horas de debate teórico al proponer una prueba rápida con usuarios reales.',
    ],
    tabooWords: ['practico', 'util', 'realista'],
    scenarios: [
      'Justifica por qué improvisaste una solución ingeniosa cuando falló el plan original.',
      'Úsala para aconsejar a un equipo bloqueado por el perfeccionismo.',
    ],
    forcedConnections: ['cinta', 'martillo', 'termómetro'],
  },

  // ── 3. RAMA ESTRATEGIA ───────────────────────────────────────────────────────
  {
    id: 'paradigma',
    word: 'Paradigma',
    branch: 'estrategia',
    tier: 1,
    parentIds: [],
    posX: 50,
    posY: 16,
    definition:
      'Conjunto de supuestos, reglas y modelos compartidos que definen cómo se entiende y resuelve un ámbito en una época.',
    contextTip:
      'Evita gastarla como sinónimo vago de "cosa"; úsala cuando cambian las reglas fundamentales de un sistema.',
    examples: [
      'El trabajo remoto rompió el paradigma de medir la productividad por horas sentado frente a un escritorio.',
      'Pasar de vender discos a ofrecer suscripciones supuso un cambio de paradigma para toda la industria.',
    ],
    tabooWords: ['cambio', 'modelo', 'patron'],
    scenarios: [
      'Explica cómo una nueva costumbre tuya transformó por completo tus mañanas.',
      'Úsala para resumir una disrupción tecnológica frente a un jurado.',
    ],
    forcedConnections: ['sandalia', 'licuadora', 'brújula'],
  },
  {
    id: 'heuristica',
    word: 'Heurística',
    branch: 'estrategia',
    tier: 2,
    parentIds: ['paradigma'],
    posX: 26,
    posY: 48,
    definition:
      'Regla práctica o atajo mental basado en la experiencia que permite resolver problemas rápido cuando no hay datos completos.',
    contextTip:
      'Brilla en UX, ingeniería, medicina o toma de decisiones bajo incertidumbre.',
    examples: [
      'Cuando el código falla sin pistas claras, mi primera heurística es revisar qué cambió en el último despliegue.',
      'Las heurísticas de usabilidad ayudan a detectar fricciones antes de hacer pruebas costosas.',
    ],
    tabooWords: ['atajo', 'truco', 'regla'],
    scenarios: [
      'Comparte tu regla personal infalible para elegir el mejor restaurante en una ciudad nueva.',
      'Úsala para explicar cómo priorizas tareas urgentes en una hackathon.',
    ],
    forcedConnections: ['sombrero', 'llavero', 'tijeras'],
  },
  {
    id: 'sinergia',
    word: 'Sinergia',
    branch: 'estrategia',
    tier: 2,
    parentIds: ['paradigma'],
    posX: 74,
    posY: 48,
    definition:
      'Efecto multiplicador que surge cuando dos o más elementos cooperan y logran juntos un resultado mayor que por separado.',
    contextTip:
      'Es una palabra muy abusada en jerga corporativa: dale fuerza especificando qué aporta cada parte y qué nuevo resultado nace.',
    examples: [
      'La sinergia entre el diseñador sonoro y la programadora convirtió un menú simple en una experiencia memorable.',
      'En la receta, la acidez del limón y lo tostado del ajo crean una sinergia imposible por separado.',
    ],
    tabooWords: ['equipo', 'union', 'juntos'],
    scenarios: [
      'Describe la combinación perfecta de dos ingredientes de cocina o dos talentos de tu equipo.',
      'Úsala sin sonar a discurso vacío de oficina.',
    ],
    forcedConnections: ['cargador', 'mochila', 'escalera'],
  },
  {
    id: 'resiliencia',
    word: 'Resiliencia',
    branch: 'estrategia',
    tier: 3,
    parentIds: ['heuristica', 'sinergia'],
    posX: 62,
    posY: 82,
    definition:
      'Capacidad de un sistema, persona o arquitectura para absorber fallos o golpes severos y recuperarse adaptándose sin colapsar.',
    contextTip:
      'No es solo "aguantar": implica absorber el impacto, reconfigurarse y seguir operando.',
    examples: [
      'El servidor demostró resiliencia al conmutar al respaldo local en milisegundos cuando cayó la red externa.',
      'La resiliencia del proyecto se vio cuando reescribieron la demo en dos horas tras perder la conexión.',
    ],
    tabooWords: ['fuerza', 'resistencia', 'aguante'],
    scenarios: [
      'Cuenta cómo salvaste una situación crítica cuando todo salió mal a último minuto.',
      'Úsala para defender la arquitectura de tu producto ante una pregunta difícil.',
    ],
    forcedConnections: ['maceta', 'colchón', 'paracaídas'],
  },
  {
    id: 'escalabilidad',
    word: 'Escalabilidad',
    branch: 'estrategia',
    tier: 3,
    parentIds: ['heuristica'],
    posX: 22,
    posY: 82,
    definition:
      'Propiedad de un sistema o proceso para crecer en volumen de usuarios, carga o alcance sin degradar su calidad ni disparar costos.',
    contextTip:
      'Úsala tanto en arquitectura de software como en hábitos, docencia o modelos de negocio.',
    examples: [
      'Responder mensajes uno a uno funciona al inicio, pero carece de escalabilidad cuando llegan mil alumnos.',
      'La escalabilidad del método reside en que cada mentor puede entrenar a diez guías sin perder cercanía.',
    ],
    tabooWords: ['crecer', 'grande', 'expandir'],
    scenarios: [
      'Explica por qué tu método para organizar apuntes o cocinar no sobreviviría si invitaras a 50 personas.',
      'Úsala en un pitch técnico para demostrar visión de producto.',
    ],
    forcedConnections: ['tostada', 'balcón', 'cuaderno'],
  },
];
