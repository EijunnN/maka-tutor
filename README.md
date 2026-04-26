# Maka Tutor

> Overlay de escritorio que **enseña lo que tienes en pantalla**.
> Atajo, captura, pregunta. El tutor responde con visión multimodal y aprende de ti turno a turno.

<p align="center">
  <a href="#-instalación-windows"><img alt="Windows" src="https://img.shields.io/badge/Windows-10%2F11-0078D6?logo=windows&logoColor=white"></a>
  <img alt="Electron" src="https://img.shields.io/badge/Electron-41-47848F?logo=electron&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="Bun" src="https://img.shields.io/badge/Bun-1.x-FBF0DF?logo=bun&logoColor=black">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

---

## ¿Qué es?

**Maka Tutor** es un overlay siempre-encima que te deja preguntar sobre lo que estás viendo —código, un PDF, un error, un diagrama, lo que sea— sin salir de la app en la que estás. Pulsas un atajo, capturas la pantalla (entera o una región), escribes y obtienes una explicación al instante con streaming.

A diferencia de un chat normal, Maka **te conoce**: construye un perfil aprendido de tu nivel, los dominios que estudias y las habilidades que vas dominando. Al final de cada turno actualiza esa memoria en background y te sugiere *nudges* para continuar, repasar o practicar.

## ✨ Features

- **Overlay no intrusivo** — ventana transparente, click-through opcional, no aparece en capturas (`setContentProtection`).
- **Captura por hotkey** — pantalla completa o selección de región, sin abrir nada extra.
- **Visión multimodal** — las imágenes se comprimen a JPEG (máx. 1568 px) y se envían como contexto al modelo.
- **Streaming en vivo** — los deltas del modelo aparecen mientras se generan.
- **Memoria que aprende sola** — perfil del usuario, dominios y skills se actualizan después de cada turno.
- **Nudges proactivos** — en el empty state, el tutor te propone qué seguir estudiando basándose en tu historial.
- **Conversaciones persistidas** — todas las sesiones quedan indexadas y se pueden retomar.
- **Configurable** — eliges el modelo de Anthropic desde Ajustes.

## ⌨️ Atajos globales

| Atajo | Acción |
|---|---|
| `Ctrl` + `Shift` + `Space` | Capturar el monitor donde está el cursor |
| `Ctrl` + `Shift` + `A` | Capturar una región de la pantalla |
| `Ctrl` + `Shift` + `H` | Mostrar / ocultar el overlay |

## 📦 Instalación (Windows)

1. Descarga el último `Maka-Tutor-x.y.z-Setup-x64.exe` desde [Releases](https://github.com/EijunnN/maka-tutor/releases).
2. Ejecuta el instalador (NSIS, sin firma — Windows SmartScreen pedirá confirmación: *Más información → Ejecutar de todas formas*).
3. Abre **Maka Tutor** desde el menú Inicio o el acceso directo del escritorio.
4. En **Ajustes**, pega tu **API key de Anthropic** y elige el modelo (`claude-sonnet-4-6` por defecto).

> Tu API key se guarda localmente con `electron-store`. Nunca sale de tu máquina más allá de la propia llamada a la API de Anthropic.

## 🛠️ Desarrollo

Maka Tutor usa **Bun** como runtime de scripts y **electron-vite** como bundler.

### Requisitos

- [Bun](https://bun.sh/) ≥ 1.0
- Node.js ≥ 20 (lo trae Electron internamente, pero `node-gyp` puede pedirlo)
- Windows 10/11 (las builds nativas son Win-only por ahora)

### Setup

```bash
git clone https://github.com/EijunnN/maka-tutor.git
cd maka-tutor
bun install
bun run dev
```

### Scripts

```bash
bun run dev          # arranca electron-vite en modo desarrollo (HMR + DevTools)
bun run build        # compila main + preload + renderer a out/
bun run build:win    # build + empaquetado .exe en release/ (NSIS)
bun run typecheck    # tsc en los tres tsconfigs
```

### Estructura

```
src/
├─ main/              # proceso principal de Electron
│  ├─ index.ts        # entry, IPC handlers, ciclo de vida
│  ├─ window.ts       # overlay transparente always-on-top
│  ├─ hotkeys.ts      # globalShortcut: full / región / toggle
│  ├─ capture.ts      # captura de pantalla + monitor del cursor
│  ├─ selectionWindow.ts
│  ├─ protocol.ts     # esquema custom para servir screenshots
│  ├─ agent.ts        # bridge con @anthropic-ai/claude-agent-sdk
│  ├─ conversations.ts# persistencia de chats
│  ├─ settings.ts     # API key + modelo (electron-store)
│  └─ harness/        # memoria que aprende: perfil, dominios, skills, nudges
├─ preload/           # bridge contextIsolated
├─ renderer/          # UI React 19 + Tailwind v4
└─ shared/types.ts    # tipos compartidos main ↔ renderer
```

### Stack

- **Electron 41** + **electron-vite 5** + **electron-builder 26**
- **React 19** + **Tailwind CSS v4** + **react-markdown** + **remark-gfm**
- **Anthropic Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`)
- **electron-store 10** para persistencia local
- **TypeScript 5.6** estricto, tres tsconfigs (node / web / root)

## 🧠 El "harness" pedagógico

El cerebro de Maka vive en `src/main/harness/`. Cada turno:

1. **`orchestrator`** monta un `systemPrompt` con perfil + dominio activo + skills relevantes.
2. El modelo responde (streaming).
3. **`updater`** corre en background al cerrar el turno: re-lee el intercambio, actualiza perfil, deduce el dominio, descubre o promociona skills.
4. **`nudges`** rankea qué retomar la próxima vez que abras el overlay vacío.

Es una arquitectura ligera de Zettelkasten + spaced-repetition implícita, sin bases de datos vectoriales — solo JSON local.

## 🔒 Privacidad

- Las screenshots se guardan en `userData/screenshots/` y solo se sirven al renderer mediante un protocolo custom (`shot://`).
- Se envían a la API de Anthropic como parte del turno y no se persisten en ningún servidor adicional.
- La API key vive en `electron-store` (cifrado a nivel de SO en Windows).
- `setContentProtection(true)` evita que el overlay aparezca en capturas o grabaciones de pantalla.

## 📜 Licencia

MIT © 2026 — [Eijunn](https://github.com/EijunnN)
