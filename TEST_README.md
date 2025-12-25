# Tests para Guess the Song

Este archivo contiene información sobre los tests implementados y cómo ejecutarlos.

## Tests Implementados

### 1. Test de Conexión al Servidor
Verifica que el servidor Socket.IO esté corriendo y aceptando conexiones.

### 2. Test de Autenticación de Anfitrión
Verifica que el sistema de contraseña para anfitriones funciona correctamente.

### 3. Test de Creación de Partida y Unión de Jugadores
- Crea una partida con un anfitrión
- Une 5 jugadores de prueba
- Verifica que todos se unan correctamente

### 4. Test de Sistema de Heartbeat (Ping/Pong)
Verifica que el sistema de ping/pong mantiene las conexiones activas y previene desconexiones.

### 5. Test de Reconexión de Jugadores
- Crea una partida y une un jugador
- Simula desconexión del jugador
- Verifica que el jugador puede reconectarse sin perder su progreso

### 6. Test de Audio Solo en Anfitrión ⭐
**Test crítico**: Verifica que:
- El anfitrión recibe el evento `play_audio` para reproducir audio
- Los jugadores NO reciben el evento `play_audio`
- Los jugadores reciben el evento `audio_playing` para mostrar efectos visuales (ecualizador)

### 7. Test de Reconexión de Anfitrión
Verifica que el anfitrión puede desconectarse temporalmente y reconectarse sin perder la partida.

## Cómo Ejecutar los Tests

### Requisitos Previos
1. Tener Node.js instalado
2. Tener todas las dependencias instaladas (`npm install`)
3. El servidor debe estar corriendo

### Paso 1: Iniciar el Servidor
```bash
npm start
```
O si estás en desarrollo:
```bash
node server.js
```

### Paso 2: En otra terminal, ejecutar los tests
```bash
node test-connection.js
```

## Interpretación de Resultados

Los tests mostrarán:
- ✓ en verde: Test exitoso
- ✗ en rojo: Test fallido
- ℹ en cyan: Información
- ⚠ en amarillo: Advertencia

### Resultado Esperado
```
========================================
  SUITE DE TESTS - GUESS THE SONG
========================================

ℹ Test 1: Verificando conexión al servidor...
✓ Servidor conectado correctamente

ℹ Test 2: Verificando autenticación de anfitrión...
✓ Anfitrión autenticado correctamente

...

========================================
  RESULTADOS FINALES
========================================
✓ Tests exitosos: 7/7
========================================
```

## Problemas Corregidos

### 1. Desconexiones Frecuentes
**Problema**: El anfitrión y los jugadores se desconectaban al cambiar de pestaña, recibir notificaciones, etc.

**Solución**: 
- Implementado sistema de ping/pong que mantiene la conexión activa
- Configurado `pingInterval: 10000` y `pingTimeout: 60000` en Socket.IO
- Añadida Page Visibility API para detectar cuando la página se oculta/muestra

### 2. Audio Reproduciéndose en Todos los Dispositivos
**Problema**: La música se reproducía tanto en el dispositivo del anfitrión como en el de los jugadores.

**Solución**:
- Modificado `play_fragment` en el servidor para enviar `play_audio` SOLO al anfitrión
- Creado nuevo evento `audio_playing` para jugadores que solo muestra efectos visuales
- Los jugadores ahora solo ven el ecualizador animado, sin reproducir audio

### 3. Reconexión Deficiente
**Problema**: Si un jugador o anfitrión se desconectaba, no podía volver a unirse.

**Solución**:
- Implementado sistema de reconexión con timeout de 2 minutos para jugadores
- Implementado sistema de reconexión con timeout de 30 segundos para anfitriones
- Los jugadores mantienen su puntaje al reconectarse
- El anfitrión puede reconectarse y continuar la partida

## Tests de Carga (Opcional)

Para probar con más usuarios simultáneos, puedes modificar el Test 3 en el archivo `test-connection.js` y cambiar el número de jugadores:

```javascript
// Línea ~150 en test-connection.js
for (let i = 1; i <= 15; i++) {  // Cambiar 5 a 15 o más
    // ...
}
```

## Notas Importantes

1. **Contraseña**: Asegúrate de que la contraseña en el archivo `.env` coincida con la usada en los tests.
2. **Puerto**: Los tests asumen que el servidor corre en `http://localhost:3000`. Si usas otro puerto, modifica `SERVER_URL` en el archivo de tests.
3. **Timeouts**: Los tests tienen timeouts configurados. Si tu servidor es lento, puede que necesites aumentarlos.

## Debugging

Si un test falla, revisa:
1. Que el servidor esté corriendo
2. Los logs del servidor para ver qué eventos se están emitiendo
3. Los logs de la consola de los tests
4. La consola del navegador si estás probando manualmente

## Tests Manuales Recomendados

Además de estos tests automatizados, se recomienda probar manualmente:
1. Abrir el juego en múltiples pestañas/dispositivos
2. Cambiar entre pestañas activamente durante el juego
3. Minimizar la app y recibir notificaciones
4. Verificar que SOLO el anfitrión escucha el audio
5. Desconectar y reconectar en diferentes momentos del juego
