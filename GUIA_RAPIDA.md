# Guía Rápida - Guess the Song

## 🚀 Inicio Rápido

### 1. Iniciar el servidor
```bash
npm start
```

### 2. Ejecutar tests (recomendado antes de jugar)
```bash
# En otra terminal
npm test
```

## 🎮 Cómo Jugar

### Anfitrión (Host)

1. **Abrir el juego** en tu navegador: `http://localhost:3000`
2. **Ingresar contraseña** de anfitrión (configurada en `.env`)
3. **Crear Partida** - Elegir modo de juego:
   - Fragmentos de Canción
   - Instrumentos
4. **Compartir código** de la partida con los jugadores
5. **Comenzar juego** cuando todos estén listos
6. **Reproducir fragmentos**:
   - 3s = 100 puntos
   - 5s = 70 puntos
   - 7s = 50 puntos
   - Completa = 30 puntos
7. **Terminar ronda** cuando alguien adivine o quieras revelar
8. **Siguiente ronda** o **Terminar juego**

### Jugadores

1. **Abrir el juego**: `http://localhost:3000` (o IP del anfitrión)
2. **Ingresar nombre** y **código de partida**
3. **Esperar** a que el anfitrión inicie
4. **Escuchar** (solo el anfitrión reproduce audio, tú ves animación)
5. **Adivinar**: Escribir título y artista
6. **Ganar puntos** por respuestas correctas

## ⚠️ Puntos Importantes

### ✅ Audio Solo en Anfitrión
- **Solo el anfitrión** escucha el audio
- Los jugadores **solo ven el ecualizador animado**
- Esto es intencional y correcto

### ✅ Reconexión Automática
- Si pierdes conexión, puedes volver a unirte
- Usa el **mismo nombre** para mantener tu puntaje
- Tienes **2 minutos** (jugadores) o **30 segundos** (anfitrión)

### ✅ Cambiar de Pestaña/App
- Ahora puedes cambiar de pestaña sin problemas
- Recibir notificaciones no te desconectará
- El sistema mantiene la conexión automáticamente

## 🧪 Verificar que Todo Funciona

### Test Rápido (5 minutos)

```bash
# Terminal 1
npm start

# Terminal 2
npm test
```

**Resultado esperado**: ✓ Tests exitosos: 7/7

### Test Manual con Amigos

1. **Anfitrión**: Abre en tu PC/celular
2. **Jugadores**: Abren en sus dispositivos
3. **Durante el juego**:
   - Cambia de pestaña ✓
   - Minimiza la app ✓
   - Revisa notificaciones ✓
   - Solo el anfitrión escucha audio ✓

## 🔧 Solución de Problemas

### "No se puede conectar"
```bash
# Verificar que el servidor esté corriendo
npm start

# Verificar el puerto
# Debe mostrar: "Servidor escuchando en http://localhost:3000"
```

### "Contraseña incorrecta"
- Revisa el archivo `.env`
- Verifica que `HOST_PASSWORD` esté configurado
- Usa la misma contraseña en el navegador

### "Audio no se reproduce"
- **Anfitrión**: Verifica que los archivos de audio estén en `/audio`
- **Jugadores**: Es normal, el audio SOLO se reproduce en el anfitrión

### "Me sigue desconectando"
- Ejecuta los tests: `npm test`
- Verifica que el test de heartbeat pase
- Revisa la consola del navegador para errores

## 📱 Jugar en Red Local

Para que otros dispositivos se conecten:

1. **Encuentra tu IP local**:
   ```bash
   # Windows
   ipconfig
   # Buscar "IPv4 Address"
   
   # Mac/Linux
   ifconfig
   # o
   ip addr
   ```

2. **Compartir URL**:
   - En lugar de `localhost:3000`
   - Usa: `http://TU_IP:3000`
   - Ejemplo: `http://192.168.1.100:3000`

3. **Firewall**:
   - Asegúrate de que el puerto 3000 esté abierto
   - En Windows: Permitir node.js en el firewall

## 📊 Puntuación

### Puntos por Velocidad
- **3 segundos**: 100 puntos (título + artista)
- **5 segundos**: 70 puntos (título + artista)
- **7 segundos**: 50 puntos (título + artista)
- **Canción completa**: 30 puntos (título + artista)

### Puntos Parciales
- **Solo título**: 75% de los puntos
- **Solo artista**: 50% de los puntos
- **Incorrecto**: 0 puntos

## 🎯 Mejores Prácticas

### Para el Anfitrión
- ✓ Mantén tu dispositivo conectado y con batería
- ✓ Usa un dispositivo con buenos altavoces
- ✓ No cierres la pestaña del navegador
- ✓ Ten el volumen adecuado

### Para los Jugadores
- ✓ Usa el **mismo nombre** si necesitas reconectar
- ✓ Escribe tanto **título como artista** para máximo puntaje
- ✓ Responde rápido para más puntos
- ✓ Si te desconectas, vuelve a unirte rápidamente

## 🐛 Reportar Problemas

Si encuentras un error:

1. **Reproduce el error**
2. **Revisa los logs** del servidor (terminal)
3. **Revisa la consola** del navegador (F12)
4. **Ejecuta los tests**: `npm test`
5. **Documenta** qué estabas haciendo cuando ocurrió

## 📖 Más Información

- [CAMBIOS.md](CAMBIOS.md) - Detalles técnicos de las correcciones
- [TEST_README.md](TEST_README.md) - Documentación completa de tests
- [instrucciones.txt](instrucciones.txt) - Instrucciones originales

## 🎉 Disfruta el Juego!

Todas las correcciones implementadas garantizan:
- ✅ Sin desconexiones inesperadas
- ✅ Audio correcto (solo anfitrión)
- ✅ Reconexión automática
- ✅ Partidas estables con muchos jugadores

¡A adivinar canciones! 🎵🎶
