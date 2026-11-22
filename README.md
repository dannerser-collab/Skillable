<div align="center">

# Skillable

**RPG competitivo de vocabulario activo: cada palabra es una habilidad que descubres, desbloqueas, mejoras y defiendes en duelos 1v1, con un árbitro de IA que evalúa cada frase.**

![Versión](https://img.shields.io/badge/versión-0.1.0-f49c3b)
![Estado](https://img.shields.io/badge/estado-prototipo%20hackathon-7b8794)
![Licencia](https://img.shields.io/badge/licencia-sin%20definir-3c4048)
<br>
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520.19-339933?logo=node.js&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-8E75B2?logo=googlegemini&logoColor=white)

</div>

---

## Índice

1. [Qué es Skillable](#qué-es-skillable)
2. [Funcionalidades](#funcionalidades)
3. [Stack tecnológico](#stack-tecnológico)
4. [Requisitos previos](#requisitos-previos)
5. [Instalación](#instalación)
6. [Variables de entorno](#variables-de-entorno)
7. [Ejecución en desarrollo](#ejecución-en-desarrollo)
8. [Acceso desde otros dispositivos (red local)](#acceso-desde-otros-dispositivos-red-local)
9. [Verificación y build de producción](#verificación-y-build-de-producción)
10. [API y eventos en tiempo real](#api-y-eventos-en-tiempo-real)
11. [Estructura de carpetas](#estructura-de-carpetas)

---

## Qué es Skillable

Muchas personas **reconocen** palabras como *paradigma*, *falacia* o *catarsis*, pero rara vez las **usan** con precisión. Ese vocabulario pasivo no se convierte en expresión real.

Skillable resuelve esto con mecánicas de RPG: cada palabra es una **Skill**. Para desbloquearla y subirla de nivel hay que usarla en retos de escritura cada vez más exigentes. Un **Árbitro IA** estricto evalúa cada frase y rechaza el uso superficial con el **Filtro Anti-Calzador**: si la palabra se puede cambiar por cualquier otro sustantivo y la frase sigue teniendo sentido, no cuenta.

### Enfoque visual e interactivo

- **Hub de inicio:** una **esfera wireframe interactiva** en Canvas 2D que rota en 3D y responde al cursor, un **título `SKILLABLE` animado con efecto scramble** (caracteres aleatorios que forman la palabra letra a letra) y un fondo de partículas interactivo.
- **Árbol de Habilidades tipo constelación:** nodos flotantes sin marco sobre el fondo animado, unidos por conexiones luminosas y organizados en tres ramas:
  - **Narrativa y Cultura:** Mitología, Arquetipo, Alegoría, Cosmovisión, Catarsis
  - **Retórica y Debate:** Falacia, Sofisma, Dialéctica, Hegemonía, Pragmatismo
  - **Estrategia y Tech:** Paradigma, Heurística, Sinergia, Resiliencia, Escalabilidad
- **Paleta:** `#14151a` (fondo) · `#3c4048` (superficies) · `#7b8794` (conexiones) · `#f49c3b` (energía/acento) · `#f7f2ec` (texto) · `#e05263` (alertas) · `#4ade80` (aprobado).

---

## Funcionalidades

### Árbol de Habilidades
- **15 skills** repartidas en 3 ramas, cada una con tres tiers (**T1 → T2 → T3**) y dependencias padre → hijo.
- **Estados de nodo:** `bloqueada` (el padre está en Nv.0), `disponible`, `desbloqueada` (Nv.1 Bronce · Nv.2 Plata · Nv.3 Oro) y `oxidada` (requiere re-entrenamiento por repetición espaciada).
- **Panel lateral** con definición, tip de contexto, ejemplos y la tarjeta **"Tu Mejor Frase"** con el puntaje récord.
- **`ProveSkillModal`:** el reto de validación cambia según el nivel objetivo:

  | Nivel objetivo | Reto | Puntaje mínimo |
  |---|---|---|
  | Nv.1 Aprendida | **Escenario Obligado**: usa la palabra en una situación dada | 70 |
  | Nv.2 Afilada | **Modo Tabú**: sin usar 3 palabras prohibidas, con validación en vivo | 75 |
  | Nv.3 Maestría | **Sinergia** (palabra + padre) o **Conexión Forzada** (T1), con un límite de 45 s | 85 |

- Entrada por teclado o **dictado por voz** (Web Speech API, si el navegador la soporta).
- **Veredicto** en 3 ejes: Precisión Semántica (40 %), Riqueza Contextual (35 %) e Ingenio y Restricción (25 %).

### Expedición Aleatoria
Tarjeta que revela una palabra al azar del catálogo con animación scramble. Desde ahí puedes **probarla en solitario** o **llevarla a un duelo 1v1** como palabra de la Ronda 1.

### Arena 1v1 en tiempo real
- **Salas privadas** con código de 4 caracteres (ej. `K7X2`), enlace copiable `/?room=K7X2` y **código QR** para unirse desde el celular.
- **Duelo rápido contra un Bot IA**, con dificultad `Novato` o `Maestro`.
- **3 rondas de 40 s:** Escenario Obligado → Modo Tabú → Conexión Forzada.
- Estado del rival en vivo (*escribiendo…* / *envió respuesta*), pantalla **Cara a Cara** con veredicto comparativo, resultado final con **cambio de ELO** (+25 / −10) y **revancha**.

### Árbitro IA con fallback local
- Evalúa con **Google Gemini** (`gemini-2.5-flash`) y respuestas JSON estrictas.
- Si no hay `GEMINI_API_KEY`, o si la API falla o tarda más de 8 s, pasa automáticamente a un **Árbitro Heurístico Local** determinista que comprueba la palabra objetivo, las palabras tabú, la conexión forzada y los patrones Anti-Calzador. **La demo funciona sin internet.**

### Arquitectura monorepo

| Carpeta | Rol |
|---|---|
| `client/` | SPA en React + Vite + Tailwind (vistas, animaciones, cliente Socket.IO) |
| `server/` | API REST en Express + Socket.IO (árbitro, bot, salas, dataset) |
| `shared/` | Contrato de tipos `types.ts` usado por ambos lados (REST + eventos Socket.IO) |

---

## Stack tecnológico

Versiones declaradas en los `package.json` del repositorio:

### Frontend (`client/`)
| Paquete | Versión |
|---|---|
| react / react-dom | ^19.3.1 |
| vite | ^8.3.8 |
| @vitejs/plugin-react | ^6.3.0 |
| typescript | ^7.0.2 |
| tailwindcss / @tailwindcss/vite | ^4.3.5 |
| framer-motion | ^14.14.0 |
| lucide-react | ^1.77.0 |
| socket.io-client | ^4.8.4 |
| qrcode.react | ^4.2.0 |
| canvas-confetti | ^1.9.4 |

### Backend (`server/`)
| Paquete | Versión |
|---|---|
| express | ^5.3.0 |
| socket.io | ^4.8.4 |
| @google/genai | ^3.6.1 |
| cors | ^2.8.6 |
| dotenv | ^18.0.10 |
| tsx | ^4.23.15 |
| typescript | ^7.0.2 |
| @types/node | ^26.6.6 |

### Raíz
| Paquete | Versión |
|---|---|
| concurrently | ^10.0.7 |

---

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| **Node.js** | `20.19+` o `22.12+` (lo exige Vite 8). Recomendado: LTS actual |
| **npm** | 10+ (incluido con Node.js) |
| **Git** | Cualquier versión reciente |

Comprueba tus versiones:

```bash
node -v
npm -v
git --version
```

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/dannerser-collab/Skillable.git
cd Skillable

# 2. Instalar dependencias en raíz, server y client (un solo comando)
npm run install:all
```

`install:all` equivale a ejecutar:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

> `shared/` no tiene dependencias propias; solo contiene tipos de TypeScript.

---

## Variables de entorno

Copia la plantilla y, si quieres, añade tu clave:

```bash
# macOS / Linux / Git Bash
cp server/.env.example server/.env

# Windows PowerShell
Copy-Item server/.env.example server/.env
```

| Variable | Archivo | Obligatoria | Por defecto | Descripción |
|---|---|---|---|---|
| `GEMINI_API_KEY` | `server/.env` | No | *(vacía)* | Clave de Google AI Studio. Si está vacía se usa el Árbitro Heurístico Local. |
| `GEMINI_MODEL` | `server/.env` | No | `gemini-2.5-flash` | Modelo de Gemini para el árbitro y el bot. |
| `PORT` | `server/.env` | No | `3001` | Puerto de Express + Socket.IO. Si lo cambias, actualiza también el proxy en `client/vite.config.ts`. |
| `VERIFY_URL` | entorno de shell | No | `http://localhost:3001` | Servidor que comprueba el script `npm run verify`. |

> **Seguridad:** `server/.env` está en `.gitignore`. Nunca subas tu clave real al repositorio; solo se versiona `server/.env.example`.

---

## Ejecución en desarrollo

Desde la raíz:

```bash
npm run dev
```

Levanta los dos procesos en paralelo con `concurrently`:

| Servicio | URL | Comando interno |
|---|---|---|
| **Frontend** (Vite) | http://localhost:5173 | `npm run dev --prefix client` |
| **Backend** (Express + Socket.IO) | http://localhost:3001 | `npm run dev --prefix server` (`tsx watch`) |

Vite redirige `/api` y `/socket.io` al backend (`localhost:3001`). Por eso basta con abrir **http://localhost:5173**.

Al arrancar, el servidor indica qué árbitro está activo:

```
[skillable] server listo en http://localhost:3001
[skillable] árbitro: Heurístico Local (sin GEMINI_API_KEY)
```

---

## Acceso desde otros dispositivos (red local)

`client/vite.config.ts` ya incluye `host: true`, así que Vite escucha en todas las interfaces de red sin flags adicionales (equivale a `vite --host`).

1. Conecta la PC y el celular (u otra PC) a la **misma red Wi-Fi**.
2. Ejecuta `npm run dev`. Vite mostrará la URL de red:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: http://192.168.1.20:5173/
   ```
3. Si no aparece, averigua la IP local:
   - Windows: `ipconfig` (busca *Dirección IPv4*)
   - macOS: `ipconfig getifaddr en0`
   - Linux: `hostname -I`
4. En el otro dispositivo, abre `http://<TU-IP-LOCAL>:5173`.

**QR de la Arena 1v1:** el QR y el enlace de sala se generan con la URL que abrió el navegador (`window.location.origin`). Para que el celular pueda escanearlo, **abre la app en la PC con la IP de red** (`http://192.168.x.x:5173`), no con `localhost`. Después crea la sala y escanea.

**Solo hace falta exponer el puerto 5173.** El celular nunca se conecta directamente a `3001`, porque el proxy de Vite reenvía la API y los WebSockets.

**Problemas frecuentes**
- **No carga desde el celular:** permite Node.js en el firewall de Windows para redes privadas, o abre el puerto `5173`.
- **Redes públicas o con aislamiento de clientes:** usa un túnel (ngrok, cloudflared). `allowedHosts: true` ya permite esos dominios.

---

## Verificación y build de producción

```bash
# Chequeo de tipos de server + client
npm run typecheck

# Por separado
npx --prefix client tsc --noEmit
npx --prefix server tsc --noEmit

# Pruebas de humo contra un servidor ya levantado
# (catálogo, Anti-Calzador, duelo completo vs Bot)
npm run verify --prefix server

# Calibración del Árbitro Heurístico Local (sin Gemini)
npm run calibrate --prefix server
```

### Build de producción (un solo puerto)

```bash
npm run build                 # tsc + vite build → client/dist
npm run start --prefix server # Express sirve client/dist + API + Socket.IO
```

Si `client/dist` existe, el servidor sirve la SPA compilada. Todo queda disponible en **http://localhost:3001**, o en `http://<TU-IP-LOCAL>:3001` desde otros dispositivos.

---

## API y eventos en tiempo real

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del servidor y del árbitro activo |
| `GET` | `/api/skills` | Catálogo completo (15 skills) |
| `GET` | `/api/skills/:id` | Una skill por su `id` |
| `GET` | `/api/branches` | Metadatos de las 3 ramas |
| `GET` | `/api/challenge/:skillId/:level` | Reto para subir una skill a un nivel |
| `POST` | `/api/judge` | Evalúa una frase (modo Solo) |

Los eventos Socket.IO (`room:create`, `room:join`, `duel:quickBot`, `duel:submit`, `duel:roundResult`, …) están tipados en [`shared/types.ts`](shared/types.ts) mediante `ClientToServerEvents` y `ServerToClientEvents`.

---

## Estructura de carpetas

```
Skillable/
├── client/                    # Frontend React + Vite
│   ├── public/                # favicon
│   ├── src/
│   │   ├── components/        # CentralSphere, InteractiveBackground, KineticTitle,
│   │   │                      # ScrambleText, ProveSkillModal, Navbar, ScoreBars…
│   │   ├── views/             # HomeView, SkillTreeView, ExpeditionView, ArenaView
│   │   ├── hooks/             # useArenaSocket, useSpeechRecognition, useUserProfile
│   │   ├── services/          # Cliente REST (api.ts)
│   │   ├── data/              # Catálogo de respaldo sin conexión
│   │   ├── utils/             # Layout del árbol, validación de texto, motion
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── vite.config.ts         # Puerto 5173, host: true, proxy → 3001
├── server/                    # Backend Express + Socket.IO
│   ├── src/
│   │   ├── data/skills.ts     # Dataset de 15 palabras
│   │   ├── services/          # referee (árbitro + fallback), gemini, bot, challenges
│   │   ├── rooms/             # ArenaManager (salas 1v1)
│   │   ├── lib/               # Normalización de texto
│   │   └── index.ts           # Entrada HTTP + Socket.IO
│   ├── scripts/               # verify.ts, calibrate.ts
│   └── .env.example
├── shared/
│   └── types.ts               # Contrato de tipos compartido
├── references/                # Referencias visuales (fondo y esfera)
├── SPEC.md                    # Especificación funcional
├── CLAUDE.md                  # Reglas del proyecto (paleta, referencias)
└── package.json               # Scripts del monorepo (concurrently)
```

---

<div align="center">

Hecho para una hackathon de EdTech · **Skillable** · Convierte tu vocabulario pasivo en habilidades activas.

</div>
