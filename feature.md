KNUCKLEBONES — ROADMAP DE MEJORAS
======================================


## FÁCIL — IMPACTO ALTO, POCO TIEMPO
[x] Música generativa ambiental
    Drone oscuro + campanillas medievales reactivos al gameplay. Todo Web Audio API, sin archivos externos.
    HECHO — AudioEngine.js: 3 capas (sawtooth drone 55Hz + reverb, campanillas pentatónicas 3-7s, percusión bandpass).
    Reactividad: score diff >20 → pitch raise + volumen, combos → arpegio, destrucción → acorde descendente.
[x] Pantalla de pausa (ESC)
    Overlay con Reanudar / Ajustes / Rendirse / Menú. Pausa el timer del bot durante la espera.
    HECHO — PauseOverlay.jsx + useBotPlayer acepta isPaused.
[x] PWA instalable (app en móvil/desktop)
    vite-plugin-pwa: manifest + service worker. Funciona offline. Se instala desde el browser como app nativa.
    HECHO — vite-plugin-pwa v1.2.0: manifest.webmanifest + sw.js (Workbox generateSW). Precachea JS/CSS/HTML/SVG.
    Fonts de Google en CacheFirst (1 año). Meta tags PWA en index.html (theme-color, apple-mobile-web-app).
[x] Texto flotante 3D en combos y destrucciones
    THREE.Sprite con CanvasTexture: "+18 pts" dorado / "DESTRUIDO" rojo. Sube y desvanece sobre el tablero.
    ~2h · añadir en SceneManager
[x] Contador de victorias por sesión
    localStorage: wins/losses vs bot (por dificultad) y local. Mostrar en StartScreen y GameOverScreen.
    HECHO — statsStore.js integrado en GameOverScreen; historial W/L/D por modo.
[x] Highlight de columna peligrosa del oponente
    Si el oponente tiene doble o triple en una columna, marcarla con borde rojo pulsante como advertencia táctica.
    HECHO — Board2D.jsx: getDangerCols + gridColDanger CSS animation.
[ ] Animación de victoria/derrota más dramática
    GameOverScreen: confetti CSS keyframes al ganar, pantalla temblorosa al perder. Flash de partículas en 3D.
    ~2h
[x] Easter egg: Konami code
    ↑↑↓↓←→←→BA activa modo "calaveras danzantes" o cambia la música a algo absurdo. Fan service puro.
    HECHO — App.jsx detecta secuencia, toggle body.konami + konamiDance CSS animation.

## MEDIO — NUEVAS FUNCIONALIDADES
[ ] Modo torneo best-of-3 / best-of-5
    seriesScore en gameReducer. GameOverScreen muestra resultado de serie. Muy fiel al juego original donde se apuesta por rondas.
    ~1 día · afecta GameOverScreen + StartScreen
[ ] Sistema de apuestas (monedas) local
    Cada jugador empieza con N monedas. Apuesta antes de cada partida. Sin lógica nueva, solo estado + UI. Añade tensión real.
    ~1 día
[ ] Replay de partida
    Guardar moves en array. En GameOverScreen: "Ver replay" reproduce la partida move a move. Útil para aprender estrategia.
    ~1-2 días
[ ] Estadísticas post-partida ampliadas
    Dado más tirado, destrucciones hechas/recibidas, mejor combo, gráfico de evolución de puntuación por turno.
    ~1 día · datos ya disponibles en gameReducer
[x] Emotes en modo online
    Canal PeerJS ya existe. 4-6 emotes predefinidos: ¡Buena jugada! / ¡Maldición! / ¡Revancha! Overlay discreto, sin chat libre.
    ~1 día · canal WebRTC ya disponible
[x] Reconexión automática en modo online
    Si cae WebRTC, mostrar "Reconectando..." y reintentar. Guardar game state para restaurar la partida al reconectar.
    HECHO — networkInterface: startReconnect (5 intentos × 3s), host reclama mismo peer ID, guest redisca.
    STATE_SYNC_REQUEST / STATE_SYNC sincronizan el tablero completo. ReconnectOverlay con spinner y botón abandonar.

## NICE TO HAVE — POLISH VISUAL
[ ] Skins de tablero y dados (3-4 temas)
    Oscuro (actual) / Madera clara / Piedra rúnica / Dorado. Solo cambio de materiales Three.js y colores CSS. Persistir en settings.
    ~1 día · puro cosmético
[ ] Física real de dados con Rapier.js (WebAssembly)
    Dados que rebotan y asientan con física real. Cambio más espectacular posible visualmente. Requiere refactorizar SceneManager.
    ~3 días · cambio profundo
[ ] Pantalla de créditos / about
    Stack técnico, disclaimer completo, enlace al repo si es open source, créditos del fan project.
    ~1h
