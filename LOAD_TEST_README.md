# TEST DE CARGA - Guess The Song 🎵

## ¿Qué protecciones se agregaron?

### 1. **Validación de nombres** ✓
   - Longitud: entre 2 y 20 caracteres
   - Sanitización: elimina `<>'"` para prevenir inyecciones
   - Auto-trim de espacios

### 2. **Rate Limiting** ✓
   - Máximo 1 respuesta cada 500ms por jugador
   - Previene spam de respuestas
   - Se ignora silenciosamente (sin errores molestos)

### 3. **Códigos únicos** ✓
   - Genera códigos de partida sin duplicados
   - Máximo 100 intentos para encontrar código libre

---

## Cómo ejecutar el test

### 1. Inicia el servidor (terminal 1):
```bash
npm start
```

### 2. Ejecuta el test de carga (terminal 2):
```bash
npm run load-test
```

---

## ¿Qué prueba el test?

El test simula **10 jugadores simultáneos** que:

1. ✅ Se conectan al servidor
2. ✅ Se unen a la misma partida
3. ✅ Reciben la canción
4. ✅ Envían respuestas al mismo tiempo
5. ✅ Prueban el rate limiting (anti-spam)

### Respuestas que prueba:
- `billie jean michael jackson` → ✓ Correcta (100%)
- `michael jackson billie jean` → ✓ Correcta (100%)
- `billie jean` → ✓ Parcial - solo título (75%)
- `michael jackson` → ✓ Parcial - solo artista (50%)
- `thriller michael jackson` → ✗ Incorrecta
- `jean billie michael jackson` → ✗ Incorrecta (orden erróneo)

---

## Resultados esperados

```
✓ Jugadores conectados: 10/10
✓ Jugadores unidos: 10/10
✓ Respuestas enviadas: 10
✓ Respuestas procesadas: 4-6 (las correctas/parciales)
✓ Rate limiting funcionando: 9/10 bloqueados

📊 Tasa de éxito: 100%
```

---

## Si algo falla...

### Error: "connect_error" o "timeout"
- ✓ Verifica que el servidor esté corriendo
- ✓ Confirma que el puerto 3000 está libre
- ✓ Chequea que .env tenga `HOST_PASSWORD=borja45`

### Error: "join_failed"
- ✓ Códigos duplicados (muy raro con la protección nueva)
- ✓ Problema con el rate limiting

### Respuestas no llegan
- ✓ Verifica la validación de palabras consecutivas
- ✓ Chequea que la canción "Billie Jean" esté en songs.js

---

## Modificar el test

Puedes ajustar estas variables en [load-test.js](load-test.js):

```javascript
const NUM_PLAYERS = 10;    // Cambiar cantidad de jugadores
const HOST_PASSWORD = 'borja45';  // Tu password
```

---

## Pruebas adicionales recomendadas

### Antes del juego de esta noche:

1. ✅ Ejecuta el test 2-3 veces consecutivas
2. ✅ Prueba con tus amigos (2-3 personas) desde sus celulares
3. ✅ Verifica que el audio se reproduzca correctamente
4. ✅ Prueba el botón de reconexión del anfitrión
5. ✅ Simula desconexiones: cierra/abre la app en el celular

---

## ¿Listo para jugar? 🎮

Si el test pasa con **Tasa de éxito ≥ 90%**, estás listo para esta noche.

**¡Que te diviertas con tus amigos! 🎉**
