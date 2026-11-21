# SUPER PROMPT — PROYECTO HACKATHON: SKILLABLE (EdTech / Gamificación)

Actúa como un **Principal Full-Stack Engineer y Creative Technologist**. Vas a diseñar, implementar y verificar una aplicación web full-stack para una hackathon de educación llamada **SKILLABLE**: un RPG competitivo de vocabulario activo donde cada palabra es una habilidad (Skill) que el usuario descubre, desbloquea en un Árbol de Skills, mejora por niveles (Upgrades) y defiende en duelos 1v1 en tiempo real arbitrados por una IA estricta.

## REGLAS DE TRABAJO Y PROTOCOLO CRÍTICO (MCP & QA)
1. **Planifica antes de codificar:** Genera primero un plan de arquitectura por fases (Fase 1: Setup + Landing futurista; Fase 2: Dataset + Árbol de Skills + Prove Skill; Fase 3: Backend Socket.IO + Árbitro IA + Arena 1v1 + Bot). Espera mi aprobación del plan o ejecuta fase por fase verificando que cada una compile sin errores.
2. **Usa tus herramientas MCP de forma crítica:**
   - Usa **Sequential Thinking** (si está disponible) antes de diseñar el estado de las salas Socket.IO y el grafo del Árbol de Skills para detectar edge cases (desconexiones, empates, palabras tabú con tildes/mayúsculas).
   - Usa **Context7** (si está disponible) para verificar las APIs actuales de `framer-motion`, `socket.io`, `qrcode.react` y `@google/genai`.
   - Usa el **navegador integrado / Playwright MCP** al finalizar cada fase para abrir la app en `localhost`, probar cada botón, verificar que no existan errores en consola y auditar críticamente el contraste, la fluidez de las animaciones y el diseño responsive (móvil y escritorio).
3. **Cero código placeholder:** Nada de "TODO", botones muertos o datos falsos sin conectar. Si falta una API key de IA en `.env`, el backend debe incluir un **Árbitro Heurístico Local (fallback inteligente)** que aplique el filtro Anti-Calzador y las reglas de Tabú para que la demo jamás se rompa.

---

## 1. ARQUITECTURA Y DEPENDENCIAS A INSTALAR

Crea un monorepo limpio en la raíz del proyecto con dos carpetas: `/client` y `/server`.

### Frontend (`/client`) — React + Vite + TypeScript
Instala exactamente:
- `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`
- `tailwindcss`, `@tailwindcss/vite` (o configuración estable de Tailwind CSS)
- `framer-motion` (transiciones de vistas, animaciones de Level Up y modales)
- `lucide-react` (iconografía técnica/futurista)
- `socket.io-client` (duelos 1v1 en tiempo real)
- `qrcode.react` (generar QR escaneable para invitar a salas 1v1 desde el celular)
- `canvas-confetti` + `@types/canvas-confetti` (celebración sutil al subir a Nv. 3 Maestría)

### Backend (`/server`) — Node.js + Express + Socket.IO + TypeScript
Instala exactamente:
- `express`, `socket.io`, `cors`, `dotenv`
- `@google/genai` (SDK oficial para el Árbitro IA y el Bot Rival; usa `gemini-2.5-flash` por baja latencia)
- `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/cors`

Crea un `package.json` en la raíz con `concurrently` para levantar ambos servidores con un solo comando `npm run dev`. Incluye un archivo `.env.example` en `/server` con `GEMINI_API_KEY=` y `PORT=3001`.

---

## 2. DIRECCIÓN VISUAL Y FRONTEND FUTURISTA (INSPIRACIÓN CYBER-CONSTELLATION)

El diseño debe sentirse como una interfaz futurista de alta precisión (estética espacial/cyber-académica oscura, inspirada en interfaces interactivas como Abstracthon):

### Paleta y Tipografía
- **Fondo base:** Obsidiana profundo (`#04060E`) con gradientes radiales muy sutiles en azul abisal (`#0B1226`).
- **Acentos por rama y nivel:**
  - Cyan eléctrico (`#00F0FF`) — Rama Narrativa / Primario
  - Violeta neural (`#9D4EDD`) — Rama Retórica y Debate
  - Esmeralda cyber (`#10B981`) — Rama Estrategia y Tech
  - Bronce (`#CD7F32`), Plata (`#E2E8F0`), Oro neón (`#F59E0B`) — Niveles de Skill 1, 2 y 3
  - Rojo alerta (`#FF2A5F`) — Filtro Anti-Calzador / Palabras Tabú infringidas
- **Tipografía:** Carga fuentes de Google Fonts: `Space Grotesk` o `Orbitron` para títulos y palabras clave, `Inter` para lectura y `JetBrains Mono` para códigos de sala, puntajes, timers y texto decodificado.
- **Superficies:** Paneles con *glassmorphism* oscuro (`bg-slate-950/65 backdrop-blur-md`), bordes finos luminosos (`border-cyan-500/20`) y micro-interacciones limpias.

### Tres Componentes Visuales Estrella (OBLIGATORIOS)
1. **`<ScrambleText text="..." />` (Efecto de letras aleatorias que forman la palabra):**
   - Al montarse o cambiar el texto (y opcionalmente al hacer hover), cicla caracteres aleatorios (`A-Z`, `0-9`, `Δ`, `Ω`, `#`, `/`) durante 500–850ms resolviendo letra por letra de izquierda a derecha hasta revelar la palabra final.
   - Úsalo en: el título hero `SKILLABLE`, al revelar cada palabra en *Expedición Aleatoria*, al abrir un nodo del árbol y al revelar la palabra de cada ronda en el *Duelo 1v1*.
2. **`<ConstellationBackground />` (Fondo interactivo de constelaciones en HTML5 Canvas 2D):**
   - Canvas fijo de pantalla completa (`pointer-events-none` pero escuchando `window.mousemove` para no bloquear clics) a 60 FPS.
   - Renderiza ~70-90 nodos estelares que flotan suavemente y trazan líneas translúcidas entre nodos cercanos.
   - **Interacción con el mouse:** Al mover el cursor, se dibujan líneas energéticas hacia los nodos cercanos al puntero y los nodos reaccionan con una ligera atracción/desplazamiento magnético.
3. **`<NeuralCore />` (Globo / Núcleo 3D interactivo central en la pantalla inicial):**
   - Construido con proyección esférica 3D matemática en HTML5 Canvas 2D (cero dependencias pesadas de WebGL que puedan fallar en laptops de hackathon) formando una esfera geodésica/nube de partículas con anillos orbitales y conexiones internas luminosas.
   - **Interacción:** Rota suavemente en 3D; al mover el mouse o arrastrar sobre él, inclina y acelera su rotación siguiendo al cursor; al hacer hover sobre los botones principales del menú, el núcleo cambia su color de energía (cyan, violeta o dorado) y emite un pulso radial.

---

## 3. DATASET INICIAL PARA LA HACKATHON (15 PALABRAS CURADAS)

Crea `/server/src/data/skills.ts` (y compártelo o sírvelo vía `GET /api/skills`) con **exactamente 15 palabras en español**, distribuidas en **3 ramas temáticas** de 5 palabras cada una, con coordenadas `(posX, posY)` en porcentaje (0-100) para que el Árbol de Skills se vea simétrico y sin solapamientos:

### Estructura por rama (Tier 1 -> Tier 2 -> Tier 3):
1. **Rama `narrativa` (Narrativa y Cultura — Cyan):**
   - Tier 1: `mitologia` (**Mitología**) — `parentIds: []`
   - Tier 2: `arquetipo` (**Arquetipo**) — `parentIds: ["mitologia"]`
   - Tier 2: `alegoria` (**Alegoría**) — `parentIds: ["mitologia"]`
   - Tier 3: `cosmovision` (**Cosmovisión**) — `parentIds: ["arquetipo", "alegoria"]`
   - Tier 3: `catarsis` (**Catarsis**) — `parentIds: ["alegoria"]`
2. **Rama `retorica` (Retórica y Debate — Violeta):**
   - Tier 1: `falacia` (**Falacia**) — `parentIds: []`
   - Tier 2: `sofisma` (**Sofisma**) — `parentIds: ["falacia"]`
   - Tier 2: `dialectica` (**Dialéctica**) — `parentIds: ["falacia"]`
   - Tier 3: `hegemonia` (**Hegemonía**) — `parentIds: ["sofisma", "dialectica"]`
   - Tier 3: `pragmatismo` (**Pragmatismo**) — `parentIds: ["dialectica"]`
3. **Rama `estrategia` (Estrategia y Tech — Esmeralda):**
   - Tier 1: `paradigma` (**Paradigma**) — `parentIds: []`
   - Tier 2: `heuristica` (**Heurística**) — `parentIds: ["paradigma"]`
   - Tier 2: `sinergia` (**Sinergia**) — `parentIds: ["paradigma"]`
   - Tier 3: `resiliencia` (**Resiliencia**) — `parentIds: ["heuristica", "sinergia"]`
   - Tier 3: `escalabilidad` (**Escalabilidad**) — `parentIds: ["heuristica"]`

### Esquema obligatorio de cada palabra:
```json
{
  "id": "mitologia",
  "word": "Mitología",
  "branch": "narrativa",
  "tier": 1,
  "parentIds": [],
  "posX": 50,
  "posY": 16,
  "definition": "Conjunto de relatos simbólicos y mitos que explican el origen, valores o creencias de una cultura o colectivo.",
  "contextTip": "Funciona genial tanto en sentido literal (Grecia, nórdica) como metafórico para hablar de relatos casi legendarios alrededor de marcas, líderes o culturas.",
  "examples": [
    "La startup construyó toda una mitología alrededor de su primer garaje para inspirar a los nuevos empleados.",
    "Sin entender la mitología andina es difícil descifrar los símbolos de esa pintura."
  ],
  "tabooWords": ["dioses", "historia", "leyenda"],
  "scenarios": [
    "Úsala para darle una excusa creativa a tu jefe por llegar 20 minutos tarde.",
    "Úsala en un titular periodístico sobre una empresa tecnológica famosa."
  ],
  "forcedConnections": ["microondas", "semáforo", "algoritmo"]
}
```
*Nota de estado inicial para demo:* Precarga en el perfil del jugador 1 palabra ya en Nv. 1 en estado **"Oxidada"** (ej. `paradigma`) opcionalmente activable con un botón discreto `"Modo Demo"` en la barra superior para enseñar al jurado cómo funciona la repetición espaciada sin tener que esperar días reales.

---

## 4. VISTAS, FLUJOS Y BOTONES EXACTOS

Implementa una barra de navegación superior fija y minimalista con: Logo `SKILLABLE`, pestañas (`Inicio`, `Árbol de Skills`, `Expedición`, `Arena 1v1`), indicador de `Nickname`, `ELO` (inicia en 1000), contador de skills (`X/15`) y botón sutil de `Demo Presets` (para resetear o cargar estado demo rápido durante el pitch).

### Vista 1: Inicio (`#inicio`)
- Fondo `<ConstellationBackground />` activo + `<NeuralCore />` interactivo en el centro/derecha.
- Título principal `SKILLABLE` con `<ScrambleText />` y subtítulo: *"Convierte tu vocabulario pasivo en habilidades activas. Desbloquea, mejora y defiende cada palabra en la Arena."*
- Campo compacto para escribir/editar **Nickname** (guardado en `localStorage`, por defecto genera uno ej. `LexiRunner_04` para entrar en 1 clic sin registro).
- **3 Botones Principales (con reacción visual en el NeuralCore al hacer hover):**
  1. `[ EXPLORAR ÁRBOL DE SKILLS ]` -> Abre la Vista 2.
  2. `[ EXPEDICIÓN ALEATORIA ]` -> Abre la Vista 3 y lanza inmediatamente una palabra random.
  3. `[ ENTRAR A ARENA 1v1 ]` -> Abre la Vista 5 (Lobby 1v1).

### Vista 2: Árbol de Skills (RPG Interactivo)
- **Controles superiores:** Tabs para cambiar de rama (`Narrativa`, `Retórica`, `Estrategia`, o vista `Todas`), barra de progreso de la rama y leyenda de niveles (`Nv.0 Bloqueada`, `Nv.1 Bronce`, `Nv.2 Plata`, `Nv.3 Oro`, `Oxidada`).
- **Lienzo del Árbol:**
  - Conectores `<svg>` entre cada `parentId` y su nodo hijo. Si el padre está en Nv. 0, línea gris punteada; si está en Nv. 1+, línea brillante animada del color de la rama.
  - Cada nodo muestra: nombre de la palabra, ícono de candado (Nv. 0) o estrellas/anillo de nivel (Bronce / Plata / Oro brillante), y badge de advertencia si está "Oxidada".
- **Panel Lateral (Drawer) al hacer clic en un nodo:**
  - Palabra con `<ScrambleText />`, Tier, nivel actual y barra de progreso de maestría.
  - Definición, tip de contexto y 2 ejemplos.
  - Si `level >= 1`: Tarjeta destacada **"Tu Mejor Frase"** mostrando la oración exacta con la que el usuario desbloqueó/subió de nivel la palabra y su puntaje récord.
  - **Botones del Panel según estado:**
    - Si está bloqueada (padre en Nv. 0): Botón deshabilitado indicando `"Desbloquea primero: [Palabra Padre]"`.
    - Si está disponible en Nv. 0: `[ PROVE SKILL — DESBLOQUEAR NV. 1 ]`.
    - Si está en Nv. 1 o Nv. 2: `[ UPGRADE SKILL (SOLO) ]` y `[ MEJORAR EN DUELO 1v1 ]` (lleva esa palabra a una sala 1v1).
    - Si está en Nv. 3 o Oxidada: `[ REPARAR / RE-ENTRENAR SKILL ]`.

### Vista 3: Expedición Aleatoria (Descubrimiento Random)
- Tarjeta holográfica central que revela una palabra aleatoria del catálogo con efecto `<ScrambleText />`, mostrando su rama, definición, tip de uso y ejemplos.
- **Botones:**
  - `[ NUEVA PALABRA RANDOM ]` (re-lanza con animación scramble/ruleta).
  - `[ PROVE SKILL ]` (abre directamente el reto Solo para esta palabra).
  - `[ LLEVAR A DUELO 1v1 ]` (crea sala o partida rápida fijando esta palabra en la Ronda 1).

### Vista 4 (o Modal Full-Screen): Prove Skill (Solo & Upgrade)
El reto cambia automáticamente según el nivel objetivo:
- **Objetivo Nv. 1 (Aprendida):** *Escenario Obligado* (ej. excusa creativa). Requiere puntaje >= 70.
- **Objetivo Nv. 2 (Afilada):** *Modo Tabú* (muestra 3 chips rojos con las palabras prohibidas; validación en tiempo real mientras escribe que resalta en rojo si teclea una palabra prohibida). Requiere puntaje >= 75.
- **Objetivo Nv. 3 (Maestría):** *Reto de Sinergia* (usar la palabra + su palabra padre en la misma frase; si es Tier 1, usa *Conexión Forzada* con una palabra absurda) con temporizador de 45s. Requiere puntaje >= 85.
- **Controles de entrada:**
  - Textarea con contador de caracteres y validador en vivo (marca en verde cuando detecta la palabra objetivo, en rojo si infringió tabú).
  - Botón `[ DICTAR POR VOZ ]` usando `window.SpeechRecognition || window.webkitSpeechRecognition` (con estado visual de onda/grabando y fallback silencioso si el navegador no lo soporta).
  - Botón `[ ENVIAR AL ÁRBITRO IA ]`.
  - Botón `[ VOLVER ]`.
- **Pantalla de Veredicto Solo:**
  - Si saltó el **Filtro Anti-Calzador**: Banner rojo de alerta explicando por qué la frase fue rechazada por uso vacío/superficial.
  - 3 barras animadas: **Precisión Semántica (40%)**, **Riqueza Contextual (35%)**, **Ingenio y Restricción (25%)** + Puntaje Total (0-100).
  - Feedback crítico y concreto del Árbitro (máx. 2 líneas).
  - Botones: `[ INTENTAR DE NUEVO ]` (si falló) o `[ RECLAMAR LEVEL UP EN EL ÁRBOL ]` (si aprobó -> navega al árbol y dispara animación de subida de nivel + desbloqueo de nodos hijos).

### Vista 5: Arena 1v1 ("Skill Arena" en Tiempo Real)
- **Lobby de Arena:**
  - Botón `[ CREAR SALA PRIVADA ]`: Genera código de 4 letras (ej. `K7X2`), enlace copiable `/?room=K7X2` y **Código QR** visible en pantalla para que otro jugador o juez se una desde su celular al instante.
  - Input de código + Botón `[ UNIRSE A SALA ]`.
  - Botón `[ DUELO RÁPIDO VS BOT ]`: Inicia inmediatamente contra un Bot IA (selector de dificultad: `Novato` / `Maestro`) para pruebas rápidas o juego en solitario.
  - *(Nota: Si un usuario entra directamente por URL `/?room=XXXX`, pedir nickname si no tiene y conectarlo directo a la sala).*
- **Sala de Espera:** Muestra ambos slots (`Jugador 1` vs `Esperando rival...`), el QR, botón `[ COPIAR ENLACE ]` y botón `[ INICIAR CONTRA BOT AHORA ]` por si nadie entra. Cuando ambos están conectados, botón `[ LISTO PARA PELEAR ]` (o inicio automático tras 3s).
- **Gameplay del Duelo (3 Rondas de 40 segundos cada una):**
  - **Ronda 1:** Escenario Obligado.
  - **Ronda 2:** Modo Tabú (con chips rojos de palabras prohibidas).
  - **Ronda 3:** Conexión Forzada (Palabra objetivo + Palabra absurda).
  - HUD superior: Marcador (`P1 vs P2`), barra de tiempo regresivo de 40s, estado del rival en tiempo real (`Rival escribiendo...` / `Rival envió respuesta`).
  - Input de respuesta + botón `[ DICTAR POR VOZ ]` + botón `[ ENVIAR RESPUESTA ]`.
- **Pantalla Cara a Cara (Veredicto de Ronda):**
  - Muestra la respuesta del Jugador 1 y del Jugador 2 lado a lado.
  - Barras de puntaje en los 3 ejes para ambos, badge rojo `"ANTI-CALZADOR"` si alguno escribió una frase floja, ganador de la ronda destacado y **veredicto comparativo de 1 línea** del Árbitro IA.
  - Botón `[ SIGUIENTE RONDA ]` (o cuenta regresiva automática de 8s).
- **Pantalla Final del Duelo:**
  - Ganador total del duelo, cambio de **ELO** (`+25` / `-10`), resumen de skills mejoradas y botón `[ VER LEVEL UP EN EL ÁRBOL ]` + `[ REVANCHA ]`.

---

## 5. ESPECIFICACIÓN DEL ÁRBITRO IA (BACKEND CRÍTICO)

En `/server/src/services/referee.ts`, implementa el evaluador con `@google/genai` (con `responseMimeType: "application/json"`) usando este comportamiento obligatorio:

### Reglas del System Prompt del Árbitro:
- Eres un árbitro lingüístico estricto, ingenioso y pedagógico de SKILLABLE.
- **REGLA ANTI-CALZADOR (CRÍTICA):** Si la oración contiene la palabra objetivo de forma gramaticalmente válida pero vacía de contexto —es decir, podrías reemplazar la palabra por cualquier otro sustantivo y la frase seguiría teniendo sentido, como *"Me gusta la mitología"* o *"Ayer estudié sobre paradigma"*— DEBES activar `antiCalzadorTriggered: true`, limitar `contextScore` a máximo 20 y `totalScore` a máximo 35, explicando con claridad y humor seco que eso no demuestra comprensión real.
- Si infringe alguna palabra prohibida del Modo Tabú (ignorando mayúsculas/tildes) o no incluye la palabra objetivo (o una flexión válida), penaliza fuertemente `constraintScore` y marca `passed: false`.
- Evalúa en 3 métricas de 0 a 100:
  - `precisionScore` (peso 40%)
  - `contextScore` (peso 35%)
  - `constraintScore` (peso 25%)
  - `totalScore = Math.round(precisionScore * 0.4 + contextScore * 0.35 + constraintScore * 0.25)`

### Esquema JSON estricto (Modo Solo):
```json
{
  "passed": true,
  "antiCalzadorTriggered": false,
  "precisionScore": 88,
  "contextScore": 92,
  "constraintScore": 85,
  "totalScore": 89,
  "feedback": "Excelente metáfora corporativa: demostraste entender mitología como relato fundador sin mencionar ninguna palabra tabú."
}
```

### Esquema JSON estricto (Modo Duelo 1v1):
```json
{
  "winner": "player1",
  "comparativeVerdict": "Jugador 1 ganó al usar 'mitología' con contexto metafórico y humor; Jugador 2 cayó en el filtro Anti-Calzador con una mención genérica.",
  "player1": { "antiCalzadorTriggered": false, "precisionScore": 90, "contextScore": 92, "constraintScore": 88, "totalScore": 90, "feedback": "..." },
  "player2": { "antiCalzadorTriggered": true, "precisionScore": 65, "contextScore": 15, "constraintScore": 40, "totalScore": 35, "feedback": "..." }
}
```

### Fallback Local Obligatorio (Resiliencia en Hackathon):
Si `GEMINI_API_KEY` no está definida o la API falla/tarda más de 8 segundos, ejecuta automáticamente un evaluador local determinista que:
1. Verifica inclusión de la palabra (normalizando acentos).
2. Verifica violación de palabras tabú o ausencia de palabra de conexión forzada.
3. Detecta patrones Anti-Calzador (frases muy cortas menores a 7 palabras o patrones como `"me gusta"`, `"estudié"`, `"leí un libro de"`, `"es una palabra"`).
4. Devuelve exactamente el mismo JSON válido para que la demo funcione al 100% incluso sin internet.

---

## 6. VERIFICACIÓN FINAL ANTES DE ENTREGAR
Antes de dar la tarea por terminada, realiza esta auditoría crítica en vivo:
1. Levanta `/server` y `/client` y comprueba cero errores de TypeScript (`tsc --noEmit`) y cero errores en consola del navegador.
2. Verifica visualmente en el navegador que `<ConstellationBackground />`, `<NeuralCore />` y `<ScrambleText />` funcionen con fluidez y respondan al mouse.
3. Prueba el flujo completo del filtro Anti-Calzador ingresando `"Me gusta mucho la mitología"` (debe ser rechazada con alerta roja) y luego una frase contextualizada (debe aprobar y subir el nodo en el árbol).
4. Prueba una partida completa en Arena 1v1 contra el Bot y verifica que el enlace QR cargue correctamente una segunda pestaña/ventana conectada a la misma sala.