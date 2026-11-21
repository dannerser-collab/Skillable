import type { Branch, BranchMeta, Skill } from '../../../shared/types.ts';

/**
 * Catálogo curado: 15 palabras · 3 ramas · 5 por rama.
 *
 * Coordenadas (posX, posY en %) relativas al lienzo DE CADA RAMA (todas las ramas
 * comparten la misma forma, centrada en x=50, como el ejemplo de SPEC `mitologia: 50,16`):
 *
 *              T1 (50,16)
 *             /          \
 *      T2a (26,50)    T2b (74,50)
 *            \       /       \
 *          T3a (38,84)    T3b (62,84)
 *
 * Para la vista "Todas" el cliente puede colocar cada rama en un tercio del ancho:
 *   x_global = (BRANCH_INDEX[branch] * 100 + posX) / 3
 */
export const BRANCHES: BranchMeta[] = [
  { id: 'narrativa', label: 'Narrativa y Cultura' },
  { id: 'retorica', label: 'Retórica y Debate' },
  { id: 'estrategia', label: 'Estrategia y Tech' },
];

export const BRANCH_INDEX: Record<Branch, number> = { narrativa: 0, retorica: 1, estrategia: 2 };

export const SKILLS: Skill[] = [
  /* ─────────────────────────── NARRATIVA ─────────────────────────── */
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
    posY: 50,
    definition:
      'Modelo original o patrón ejemplar que se repite en relatos, culturas o personas; un tipo universal de personaje o situación.',
    contextTip:
      'Úsala cuando reconozcas un patrón universal: el mentor sabio, el rebelde, el héroe reacio. Brilla al analizar personajes, marcas o roles dentro de un grupo.',
    examples: [
      'Mi abuela encarna el arquetipo de la sabia que siempre sabe cuándo callar y cuándo dar el consejo exacto.',
      'La marca se posicionó con el arquetipo del explorador: aventura, libertad y mochilas embarradas.',
    ],
    tabooWords: ['modelo', 'personaje', 'patrón'],
    scenarios: [
      'Úsala para describir a un compañero de clase que todos conocen.',
      'Úsala para explicar por qué una película de superhéroes se siente predecible.',
    ],
    forcedConnections: ['tostadora', 'pingüino', 'contraseña'],
  },
  {
    id: 'alegoria',
    word: 'Alegoría',
    branch: 'narrativa',
    tier: 2,
    parentIds: ['mitologia'],
    posX: 74,
    posY: 50,
    definition:
      'Representación en la que objetos, personajes o situaciones simbolizan ideas abstractas, construyendo un sentido figurado completo a lo largo de una obra.',
    contextTip:
      'Va más allá de una metáfora suelta: es una metáfora sostenida. Úsala para obras, discursos o situaciones donde todo funciona como imagen de otra cosa.',
    examples: [
      'La película es una alegoría de la crisis climática: la ciudad que se derrite representa nuestra indiferencia.',
      'Su discurso fue una alegoría del barco a la deriva para hablar de la empresa sin nombrarla.',
    ],
    tabooWords: ['metáfora', 'símbolo', 'comparación'],
    scenarios: [
      'Úsala para explicar a un amigo de qué trata realmente su serie favorita.',
      'Úsala para criticar sutilmente una reunión de trabajo interminable.',
    ],
    forcedConnections: ['lavadora', 'cactus', 'ascensor'],
  },
  {
    id: 'cosmovision',
    word: 'Cosmovisión',
    branch: 'narrativa',
    tier: 3,
    parentIds: ['arquetipo', 'alegoria'],
    posX: 38,
    posY: 84,
    definition:
      'Manera integral de interpretar el mundo, la vida y el lugar del ser humano en él, propia de una persona, cultura o época.',
    contextTip:
      'Úsala para hablar de sistemas completos de valores y supuestos, no de opiniones sueltas. Ideal para contrastar generaciones, culturas o filosofías.',
    examples: [
      'La cosmovisión andina entiende la tierra como un ser vivo con el que se negocia, no como un recurso que se explota.',
      'Mudarme a Japón me obligó a revisar mi cosmovisión sobre el tiempo, la puntualidad y el respeto.',
    ],
    tabooWords: ['mundo', 'visión', 'creencias'],
    scenarios: [
      'Úsala para explicar por qué discutes tanto con tus padres sobre el trabajo.',
      'Úsala para presentar una app que cambia cómo la gente organiza su día.',
    ],
    forcedConnections: ['chancla', 'karaoke', 'microondas'],
  },
  {
    id: 'catarsis',
    word: 'Catarsis',
    branch: 'narrativa',
    tier: 3,
    parentIds: ['alegoria'],
    posX: 62,
    posY: 84,
    definition:
      'Liberación o purificación emocional intensa que se produce al expresar, presenciar o revivir algo, dejando una sensación de alivio.',
    contextTip:
      'Viene de la tragedia griega: el público se purifica al ver sufrir a otros. Úsala para descargas que transforman, no para cualquier desahogo leve.',
    examples: [
      'Gritar el gol del campeonato después de diez años de derrotas fue una catarsis colectiva para todo el barrio.',
      'Escribir la carta que nunca envió le produjo una catarsis que meses de silencio no habían logrado.',
    ],
    tabooWords: ['desahogo', 'liberación', 'emoción'],
    scenarios: [
      'Úsala para describir el final de la semana de exámenes.',
      'Úsala para reseñar un concierto al que fuiste.',
    ],
    forcedConnections: ['brócoli', 'grapadora', 'tobogán'],
  },

  /* ─────────────────────────── RETÓRICA ─────────────────────────── */
  {
    id: 'falacia',
    word: 'Falacia',
    branch: 'retorica',
    tier: 1,
    parentIds: [],
    posX: 50,
    posY: 16,
    definition:
      'Razonamiento que parece válido pero contiene un error lógico, usado a veces para engañar o persuadir sin fundamento.',
    contextTip:
      'Ideal para desarmar argumentos tramposos: ataques personales, generalizaciones o falsos dilemas. Nómbrala cuando detectes la trampa, no cuando simplemente no estés de acuerdo.',
    examples: [
      'Decir que el proyecto es malo porque lo propuso alguien joven es una falacia contra la persona, no un argumento técnico.',
      'Su campaña se sostenía en la falacia de que si algo es popular, entonces tiene que ser correcto.',
    ],
    tabooWords: ['mentira', 'error', 'engaño'],
    scenarios: [
      'Úsala para responder a alguien que dice que los videojuegos vuelven violentos a los jóvenes.',
      'Úsala para explicarle a tu hermano menor por qué perdió una discusión.',
    ],
    forcedConnections: ['pizza', 'calcetín', 'dinosaurio'],
  },
  {
    id: 'sofisma',
    word: 'Sofisma',
    branch: 'retorica',
    tier: 2,
    parentIds: ['falacia'],
    posX: 26,
    posY: 50,
    definition:
      'Argumento aparentemente sólido pero construido de forma deliberada para confundir o defender algo falso.',
    contextTip:
      'A diferencia de la falacia, el sofisma suele ser intencional y elaborado. Úsala para retóricas brillantes pero tramposas, típicas de vendedores o políticos hábiles.',
    examples: [
      'El vendedor nos envolvió con un sofisma impecable: si no compras el seguro, estás apostando contra tu propia familia.',
      'Desmontar ese sofisma requirió más tiempo que escucharlo, porque cada premisa sonaba razonable por separado.',
    ],
    tabooWords: ['trampa', 'mentira', 'falso'],
    scenarios: [
      'Úsala para describir la publicidad de un producto milagroso.',
      'Úsala para pedir que te suban la mensualidad de forma muy convincente.',
    ],
    forcedConnections: ['aguacate', 'escalera', 'pijama'],
  },
  {
    id: 'dialectica',
    word: 'Dialéctica',
    branch: 'retorica',
    tier: 2,
    parentIds: ['falacia'],
    posX: 74,
    posY: 50,
    definition:
      'Arte de razonar mediante el diálogo y la confrontación de ideas opuestas para llegar a una síntesis o verdad más completa.',
    contextTip:
      'Úsala cuando dos posturas chocan y de ese choque sale algo mejor. Sirve para debates, negociaciones y hasta para procesos internos de cambio.',
    examples: [
      'La dialéctica entre el equipo de diseño y el de ingeniería produjo un producto que ninguno habría imaginado solo.',
      'Su ensayo avanza con una dialéctica clara: plantea una tesis, la ataca sin piedad y termina en una síntesis honesta.',
    ],
    tabooWords: ['debate', 'discusión', 'diálogo'],
    scenarios: [
      'Úsala para explicar cómo resolvieron un conflicto en tu grupo de trabajo.',
      'Úsala para describir una relación de pareja que funciona a pesar de las diferencias.',
    ],
    forcedConnections: ['ventilador', 'sushi', 'trampolín'],
  },
  {
    id: 'hegemonia',
    word: 'Hegemonía',
    branch: 'retorica',
    tier: 3,
    parentIds: ['sofisma', 'dialectica'],
    posX: 38,
    posY: 84,
    definition:
      'Supremacía que un grupo, país o idea ejerce sobre otros, muchas veces sostenida por consenso cultural más que por la fuerza.',
    contextTip:
      'Úsala para hablar de dominios que parecen naturales: una plataforma, una moda, una potencia. Su fuerza está en mostrar cómo esa supremacía se vuelve sentido común.',
    examples: [
      'La hegemonía de una sola red social hizo que muchas marcas olvidaran cómo hablar con sus clientes sin algoritmos.',
      'Durante décadas, la hegemonía del inglés en la ciencia dejó fuera investigaciones valiosas escritas en otros idiomas.',
    ],
    tabooWords: ['poder', 'dominio', 'control'],
    scenarios: [
      'Úsala para explicar por qué todos en tu clase usan la misma marca de celular.',
      'Úsala para analizar quién decide qué música suena en las fiestas.',
    ],
    forcedConnections: ['pantufla', 'semáforo', 'croqueta'],
  },
  {
    id: 'pragmatismo',
    word: 'Pragmatismo',
    branch: 'retorica',
    tier: 3,
    parentIds: ['dialectica'],
    posX: 62,
    posY: 84,
    definition:
      'Actitud o corriente que valora las ideas y decisiones por sus consecuencias prácticas y su utilidad real, más que por su pureza teórica.',
    contextTip:
      'Úsala para elogiar o criticar decisiones que priorizan lo que funciona. Matiza: puede ser virtud (eficacia) o defecto (renunciar a principios).',
    examples: [
      'Con pragmatismo, la alcaldesa dejó de discutir el diseño ideal del parque y abrió primero la zona que los vecinos ya usaban.',
      'Su pragmatismo a veces raya en el cinismo: si algo sirve hoy, no le importa si contradice lo que defendió ayer.',
    ],
    tabooWords: ['práctico', 'útil', 'realista'],
    scenarios: [
      'Úsala para justificar por qué cenaste cereal tres noches seguidas.',
      'Úsala para aconsejar a un equipo que lleva semanas planificando sin lanzar nada.',
    ],
    forcedConnections: ['unicornio', 'martillo', 'karaoke'],
  },

  /* ─────────────────────────── ESTRATEGIA ─────────────────────────── */
  {
    id: 'paradigma',
    word: 'Paradigma',
    branch: 'estrategia',
    tier: 1,
    parentIds: [],
    posX: 50,
    posY: 16,
    definition:
      'Modelo o marco de referencia que define cómo se entiende y se aborda un problema en una época, disciplina o comunidad.',
    contextTip:
      "Úsala para giros profundos de enfoque (un 'cambio de paradigma'), no para cualquier novedad. Funciona en ciencia, negocios, educación y tecnología.",
    examples: [
      'El trabajo remoto rompió el paradigma de que la productividad se mide por horas sentado en una oficina.',
      'Copérnico no corrigió un dato: derribó todo un paradigma sobre el lugar de la Tierra en el cosmos.',
    ],
    tabooWords: ['modelo', 'ejemplo', 'cambio'],
    scenarios: [
      'Úsala para convencer a tu profesor de que los exámenes orales son mejores.',
      'Úsala en el pitch de una startup que reinventa el transporte público.',
    ],
    forcedConnections: ['microondas', 'bigote', 'lavavajillas'],
  },
  {
    id: 'heuristica',
    word: 'Heurística',
    branch: 'estrategia',
    tier: 2,
    parentIds: ['paradigma'],
    posX: 26,
    posY: 50,
    definition:
      'Regla práctica o atajo mental que permite tomar decisiones o resolver problemas rápidamente sin garantizar la solución óptima.',
    contextTip:
      'Úsala para reglas de dedo útiles en situaciones con poca información. En tech y psicología es clave: los sesgos cognitivos nacen de heurísticas.',
    examples: [
      'Mi heurística para elegir restaurante en un viaje es simple: si hay fila de locales y menú corto, entro.',
      'El algoritmo usa una heurística que descarta rutas largas antes de calcularlas, sacrificando precisión por velocidad.',
    ],
    tabooWords: ['regla', 'atajo', 'truco'],
    scenarios: [
      'Úsala para explicar cómo eliges qué serie ver un domingo.',
      'Úsala para dar un consejo a alguien que va a su primera entrevista de trabajo.',
    ],
    forcedConnections: ['pingüino', 'tostadora', 'maracas'],
  },
  {
    id: 'sinergia',
    word: 'Sinergia',
    branch: 'estrategia',
    tier: 2,
    parentIds: ['paradigma'],
    posX: 74,
    posY: 50,
    definition:
      'Acción conjunta de varios elementos o personas que produce un resultado mayor que la suma de sus efectos individuales.',
    contextTip:
      'Úsala cuando la combinación multiplica, no solo suma. Ojo: en el mundo corporativo está gastada; demuestra el efecto concreto para que no suene a frase vacía.',
    examples: [
      'Entre la bajista que compone y el baterista que arregla hay una sinergia que convierte ideas sueltas en canciones completas.',
      'La sinergia entre la biblioteca y el club de robótica llenó los talleres de sábado como nunca antes.',
    ],
    tabooWords: ['equipo', 'colaboración', 'juntos'],
    scenarios: [
      'Úsala para describir el mejor dúo de comida que conoces.',
      'Úsala para pedirle a tu jefe que te deje trabajar con otra área.',
    ],
    forcedConnections: ['pantufla', 'volcán', 'mostaza'],
  },
  {
    id: 'resiliencia',
    word: 'Resiliencia',
    branch: 'estrategia',
    tier: 3,
    parentIds: ['heuristica', 'sinergia'],
    posX: 38,
    posY: 84,
    definition:
      'Capacidad de una persona, comunidad o sistema para adaptarse a una adversidad, recuperarse y salir fortalecido.',
    contextTip:
      'No es solo resistir: implica adaptarse y transformarse. En tech se usa para sistemas que siguen funcionando cuando algo falla.',
    examples: [
      'La resiliencia del barrio se notó tras la inundación: en una semana armaron cocinas comunitarias y un censo de daños.',
      'Diseñamos la app con resiliencia: si cae un servidor, otro toma el tráfico sin que el usuario note nada.',
    ],
    tabooWords: ['fuerza', 'superar', 'aguantar'],
    scenarios: [
      'Úsala para contar cómo sobreviviste a la peor semana de tu año.',
      'Úsala para presentar una infraestructura de servidores ante inversionistas.',
    ],
    forcedConnections: ['chicle', 'flamenco', 'tostadora'],
  },
  {
    id: 'escalabilidad',
    word: 'Escalabilidad',
    branch: 'estrategia',
    tier: 3,
    parentIds: ['heuristica'],
    posX: 62,
    posY: 84,
    definition:
      'Capacidad de un sistema, negocio o proceso para crecer y atender más demanda sin perder calidad ni disparar sus costos.',
    contextTip:
      'Pregúntate: ¿funciona igual con 10 que con 10.000? Úsala en negocios, software y proyectos sociales, idealmente mostrando el límite o el cuello de botella.',
    examples: [
      'La panadería tenía clientes de sobra, pero cero escalabilidad: todo dependía de que la dueña amasara cada pan a mano.',
      'Antes de invertir, quieren pruebas de escalabilidad: que la plataforma soporte cien mil usuarios sin caerse en hora pico.',
    ],
    tabooWords: ['crecer', 'tamaño', 'grande'],
    scenarios: [
      'Úsala para explicar por qué tu negocio de postres caseros no puede abrir diez sucursales mañana.',
      'Úsala para criticar el sistema de inscripciones de tu universidad.',
    ],
    forcedConnections: ['piñata', 'bufanda', 'hamaca'],
  },
];

/* ═══════════════ Datos solo-servidor (no viajan al cliente) ═══════════════ */

/**
 * Campo semántico por skill (raíces normalizadas, sin tildes). El Árbitro Heurístico
 * Local lo usa como proxy de "precisión semántica" cuando no hay Gemini.
 */
export const SEMANTIC_FIELD: Record<string, string[]> = {
  mitologia: ['relato', 'mito', 'origen', 'simbol', 'creenc', 'cultur', 'fundad', 'fundacion', 'heroe', 'ritual', 'epic', 'culto', 'narrativ', 'sagrad', 'ancestr', 'olimp', 'inspir', 'descifr'],
  arquetipo: ['heroe', 'mentor', 'rebeld', 'universal', 'repit', 'tipo', 'encarn', 'rol', 'sabi', 'villan', 'explorador', 'figura', 'jung', 'clasic', 'predecib', 'eterno'],
  alegoria: ['represent', 'figurad', 'abstract', 'sentido', 'sostenid', 'encarn', 'obra', 'imagen', 'idea', 'critic', 'ocult', 'alud', 'parabola', 'fondo', 'realmente', 'retrat', 'discurso', 'nombrar'],
  cosmovision: ['interpret', 'integral', 'vida', 'valor', 'cultur', 'filosof', 'epoca', 'generacion', 'existen', 'sentido', 'univers', 'espiritu', 'sociedad', 'naturaleza', 'tiempo', 'entender', 'entiend'],
  catarsis: ['alivi', 'purific', 'llor', 'llant', 'grit', 'descarg', 'tension', 'intens', 'tragedi', 'transform', 'sanar', 'solt', 'purga', 'publico', 'acumulad', 'explot'],
  falacia: ['razonamiento', 'logic', 'argument', 'valid', 'premisa', 'conclusion', 'persuad', 'trampa', 'hominem', 'generaliz', 'dilema', 'sesg', 'popular', 'prueba', 'demuestr'],
  sofisma: ['argument', 'intencion', 'deliberad', 'confund', 'persuad', 'retoric', 'premisa', 'aparent', 'habil', 'brillante', 'manipul', 'desmont', 'convenc', 'impecable', 'razonable'],
  dialectica: ['tesis', 'antitesis', 'sintesis', 'opuest', 'confront', 'contrari', 'postura', 'razon', 'choque', 'tension', 'idea', 'argument', 'hegel', 'contradic', 'diferencia', 'entre', 'ninguno'],
  hegemonia: ['supremac', 'potenci', 'consenso', 'cultur', 'influen', 'impon', 'grupo', 'comun', 'monopol', 'lider', 'imperi', 'mercado', 'predomin', 'natural', 'decide', 'todos'],
  pragmatismo: ['consecuenc', 'eficac', 'funcion', 'resultado', 'decision', 'teori', 'ideal', 'principi', 'prioriz', 'concret', 'solucion', 'cinism', 'flexib', 'sirve', 'lanz'],
  paradigma: ['marco', 'enfoque', 'referencia', 'ruptura', 'romp', 'revolucion', 'cienci', 'disciplina', 'supuesto', 'transform', 'mentalidad', 'epoca', 'derrib', 'kuhn', 'reinvent', 'tradicion'],
  heuristica: ['decision', 'decid', 'rapid', 'aproxim', 'optim', 'sesg', 'intuic', 'problema', 'estim', 'mental', 'probab', 'busqueda', 'algoritm', 'criterio', 'elijo', 'elegir', 'simple'],
  sinergia: ['conjunt', 'combin', 'multiplic', 'suma', 'resultado', 'complement', 'potenci', 'integr', 'aliad', 'cooper', 'efecto', 'mayor', 'individual', 'duo', 'mezcl', 'entre', 'nunca'],
  resiliencia: ['adapt', 'adversidad', 'recuper', 'crisis', 'fortalec', 'sistema', 'fall', 'golpe', 'sobrepon', 'reconstru', 'flexib', 'persever', 'trauma', 'transform', 'cae', 'sobreviv'],
  escalabilidad: ['demanda', 'usuario', 'sistema', 'costo', 'cuello', 'botella', 'capacidad', 'volumen', 'infraestructura', 'replic', 'automatiz', 'millon', 'carga', 'servidor', 'negocio', 'limite', 'sucursal', 'pedido'],
};

/**
 * Plantillas de Conexión Forzada para el Bot Maestro en fallback.
 * `{X}` = palabra absurda (se usa siempre sin artículo de género).
 */
export const BOT_CONEXION_TEMPLATES: Record<string, string> = {
  mitologia:
    'Hasta mi {X} tiene su propia mitología familiar: todos juran que el día que llegó a casa nació el ritual sagrado de los domingos.',
  arquetipo:
    'Mi {X} encarna el arquetipo del mentor cansado: falla justo cuando más falta me hace, pero siempre me enseña algo de paciencia.',
  alegoria:
    'Mi {X} sin usar en la esquina es una alegoría perfecta de la oficina: todos saben que está ahí, nadie le presta atención y aun así representa nuestras buenas intenciones.',
  cosmovision:
    'Hasta cómo trato mi {X} revela mi cosmovisión: creo que lo viejo merece segunda vida y que nada se tira mientras funcione.',
  catarsis:
    'Destrozar a martillazos mi {X} después del último examen fue pura catarsis: cada golpe soltaba un mes entero de tensión acumulada.',
  falacia:
    'Decir que mi {X} funciona mejor porque costó una fortuna es una falacia clásica: el precio no prueba nada sobre su calidad.',
  sofisma:
    'El anuncio de {X} inteligente era un sofisma brillante: te convencía de que sin esa compra estabas desperdiciando tu vida, cuando nadie la necesitaba.',
  dialectica:
    'Entre mi {X} y el aire acondicionado hay una dialéctica de oficina: uno empuja, el otro resiste, y la síntesis es una temperatura que nadie odia.',
  hegemonia:
    'En mi casa, mi {X} ejerce una hegemonía silenciosa: nadie votó por esa cosa, pero toda la rutina familiar gira a su alrededor sin cuestionarla.',
  pragmatismo:
    'Arreglar la puerta con mi {X} fue puro pragmatismo: no era elegante ni ideal, pero funcionó y nos ahorró una semana esperando al técnico.',
  paradigma:
    'Mi {X} rompió el paradigma de mi abuela: pasó de desconfiar de cualquier novedad a planear su rutina entera alrededor de esa cosa.',
  heuristica:
    'Mi heurística con mi {X} es infalible para lo que necesito: si hace un ruido raro, desenchufo todo y vuelvo a empezar, aunque nunca sepa la causa exacta.',
  sinergia:
    'Combinar {X} con papas fritas genera una sinergia injusta: por separado son normales, pero en combinación multiplican el antojo de cualquiera.',
  resiliencia:
    'Mi {X} es un monumento a la resiliencia: sobrevivió a tres caídas, una mudanza y mi hermano, y sigue funcionando como el primer día.',
  escalabilidad:
    'Mi negocio de pintar cada {X} a mano no tiene escalabilidad: con cinco pedidos voy bien, pero con quinientos necesitaría clonarme.',
};

const SKILL_MAP = new Map(SKILLS.map((s) => [s.id, s]));

export function getSkill(id: string): Skill | undefined {
  return SKILL_MAP.get(id);
}
