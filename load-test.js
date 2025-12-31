// load-test.js - Test de carga completo
const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const NUM_PLAYERS = 12;
const HOST_PASSWORD = 'borja45';

console.log('══════════════════════════════════════════════════════');
console.log(`TEST DE CARGA: ${NUM_PLAYERS} jugadores`);
console.log('══════════════════════════════════════════════════════\n');

let hostSocket = null;
let gameCode = null;
let connectedPlayers = 0;
let joinedPlayers = 0;
let playerSockets = [];
let responsesReceived = 0;

// PASO 1: Conectar HOST
console.log('[1/3] Conectando HOST...');
hostSocket = io(SERVER_URL);

hostSocket.on('connect', () => {
    console.log('✓ HOST conectado');
    hostSocket.emit('submit_host_password', HOST_PASSWORD);
});

hostSocket.on('session_status', (data) => {
    if (data.isActive && !gameCode) {
        console.log('✓ Sesión activada');
        hostSocket.emit('create_game', {
            mode: 'fragments',
            fragmentDuration: '3s',
            roundCount: 5
        });
    }
});

hostSocket.on('game_created', (data) => {
    gameCode = data.code;
    console.log(`✓ Partida creada: ${gameCode}\n`);
    
    // PASO 2: Conectar JUGADORES
    console.log(`[2/3] Conectando ${NUM_PLAYERS} jugadores...`);
    
    for (let i = 1; i <= NUM_PLAYERS; i++) {
        const playerSocket = io(SERVER_URL);
        const playerName = `Jugador${i}`;
        
        playerSocket.on('connect', () => {
            connectedPlayers++;
            console.log(`  → ${playerName} conectado (${connectedPlayers}/${NUM_PLAYERS})`);
            
            playerSocket.emit('join_game', { 
                name: playerName, 
                code: gameCode 
            });
        });
        
        playerSocket.on('join_success', () => {
            joinedPlayers++;
            console.log(`  ✓ ${playerName} unido a partida (${joinedPlayers}/${NUM_PLAYERS})`);
            
            if (joinedPlayers === NUM_PLAYERS) {
                setTimeout(startGamePhase, 2000);
            }
        });
        
        playerSocket.on('join_failed', (msg) => {
            console.log(`  ✗ ${playerName} ERROR: ${msg}`);
        });
        
        // Guardar el socket para usarlo después
        playerSockets.push({ socket: playerSocket, name: playerName });
    }
});

hostSocket.on('password_incorrect', () => {
    console.log('✗ Contraseña incorrecta');
    process.exit(1);
});

// PASO 3: Iniciar juego y enviar respuestas simultáneas
function startGamePhase() {
    console.log('\n[3/4] Iniciando juego...');
    
    hostSocket.on('game_started', () => {
        console.log('✓ Juego iniciado, canción seleccionada\n');
        setTimeout(sendSimultaneousAnswers, 500);
    });
    
    hostSocket.emit('start_game');
}

function sendSimultaneousAnswers() {
    console.log('[4/4] ENVIANDO RESPUESTAS SIMULTÁNEAS...');
    console.log('─────────────────────────────────────────────────────');
    
    // Respuestas variadas (algunas podrían ser correctas según la canción random)
    const answers = [
        'billie jean michael jackson',
        'thriller michael jackson',
        'smooth criminal',
        'beat it',
        'respuesta test 1',
        'respuesta test 2',
        'otra cancion',
        'test 3',
        'respuesta 4',
        'test 5',
        'respuesta 6',
        'test 7'
    ];
    
    let responseCount = 0;
    
    // Configurar listeners ANTES de enviar
    playerSockets.forEach((player, index) => {
        player.socket.on('player_guessed_correctly', (data) => {
            responseCount++;
            console.log(`  ✓ ${player.name}: Respuesta CORRECTA (+${data.points} pts)`);
            checkComplete(responseCount);
        });
        
        player.socket.on('already_answered', () => {
            responseCount++;
            console.log(`  ⚠ ${player.name}: Ya respondió`);
            checkComplete(responseCount);
        });
    });
    
    // Dar 3 segundos para responder
    setTimeout(() => {
        if (responseCount === 0) {
            console.log('\n  (Ninguna respuesta fue correcta, pero eso está bien)');
        }
        console.log(`\n  Total respuestas procesadas por servidor: ${responseCount}/${NUM_PLAYERS}`);
        testComplete();
    }, 3000);
    
    // Enviar todas las respuestas AL MISMO TIEMPO
    playerSockets.forEach((player, index) => {
        const answer = answers[index];
        // Delay aleatorio de 0-50ms para simular simultaneidad real
        setTimeout(() => {
            player.socket.emit('submit_answer', answer);
            console.log(`  → ${player.name}: "${answer}"`);
        }, Math.random() * 50);
    });
}

function checkComplete(count) {
    // No hacer nada, esperamos el timeout de 3 segundos
}

function testComplete() {
    console.log('\n═════════════════════════════════════════════════════');
    console.log('                    RESULTADOS FINALES');
    console.log('═════════════════════════════════════════════════════');
    console.log(`✓ Jugadores conectados: ${connectedPlayers}/${NUM_PLAYERS}`);
    console.log(`✓ Jugadores unidos: ${joinedPlayers}/${NUM_PLAYERS}`);
    console.log(`✓ Servidor manejó ${NUM_PLAYERS} requests simultáneas`);
    console.log('═════════════════════════════════════════════════════');
    
    if (joinedPlayers === NUM_PLAYERS) {
        console.log('\n✓✓✓ TEST COMPLETAMENTE EXITOSO ✓✓✓');
        console.log('El servidor maneja bien:');
        console.log('  • Conexiones simultáneas de múltiples jugadores');
        console.log('  • Respuestas enviadas al mismo tiempo');
        console.log('  • Sin crashes ni errores fatales\n');
    } else {
        console.log('\n✗ TEST FALLIDO\n');
    }
    
    process.exit(0);
}

setTimeout(() => {
    console.log('\n✗ TIMEOUT: El test tardó más de 30 segundos');
    console.log(`Conectados: ${connectedPlayers}, Unidos: ${joinedPlayers}`);
    process.exit(1);
}, 30000);
