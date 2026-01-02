# Test de Estabilidad Multijugador

Este script simula múltiples jugadores conectándose y desconectándose aleatoriamente para probar la estabilidad del sistema de reconexión.

## Cómo usar

### 1. Iniciar el servidor
```bash
node server.js
```

### 2. En otra terminal, ejecutar el test
```bash
node test-multiplayer.js
```

## Qué hace el test

1. **Conecta 10 jugadores** al servidor
2. **Todos se unen a la misma partida** (código 1234)
3. **Simula desconexiones aleatorias** (15% de probabilidad cada 10 segundos)
4. **Intenta reconectar automáticamente** después de 3 segundos
5. **Muestra estadísticas** cada 30 segundos

## Parámetros configurables

Puedes modificar estas constantes al inicio de `test-multiplayer.js`:

- `NUM_PLAYERS`: Cantidad de jugadores (default: 10)
- `DISCONNECT_PROBABILITY`: Probabilidad de desconexión (default: 0.15 = 15%)
- `RECONNECT_DELAY`: Tiempo en ms antes de reconectar (default: 3000)

## Ejemplo de salida

```
============================================================
TEST DE ESTABILIDAD MULTIJUGADOR
============================================================
Jugadores: 10
Probabilidad de desconexión: 15%
Delay de reconexión: 3000ms
============================================================

Fase 1: Conectando todos los jugadores...

[8:27:13 AM] Jugador1: Conectando...
[8:27:13 AM] Jugador1: ✓ Conectado (abc123)
[8:27:14 AM] Jugador2: Conectando...
[8:27:14 AM] Jugador2: ✓ Conectado (def456)
...

Fase 2: Uniéndose a la partida [1234]...

[8:27:16 AM] Jugador1: Uniéndose a [1234]
[8:27:17 AM] Jugador2: Uniéndose a [1234]
...

Fase 3: Simulando desconexiones aleatorias...

[8:27:30 AM] Jugador3: Simulando desconexión...
[8:27:30 AM] Jugador3: ✗ Desconectado (client namespace disconnect)
[8:27:33 AM] Jugador3: Conectando...
[8:27:33 AM] Jugador3: ✓ Conectado (ghi789)
[8:27:34 AM] Jugador3: Intentando reconectar a [1234]
[8:27:34 AM] Jugador3: ✓ Reconectado exitosamente! Puntos: 0

------------------------------------------------------------
[8:28:00 AM] ESTADÍSTICAS:
  Conectados: 9
  Desconectados: 0
  Reconectando: 1
------------------------------------------------------------
```

## Detener el test

Presiona `Ctrl+C` para detener el test en cualquier momento.

## Notas

- El test no crea la partida automáticamente, solo intenta unirse al código 1234
- Si quieres probar con una partida real, créala manualmente antes de ejecutar el test
- Los logs del servidor mostrarán las reconexiones en tiempo real
