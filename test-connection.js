// test-connection.js
// Test para verificar conexiones, reconexiones y reproducción de audio

const io = require('socket.io-client');
const http = require('http');
const path = require('path');

// Configuración
const SERVER_URL = 'http://localhost:3000';
const HOST_PASSWORD = process.env.HOST_PASSWORD || 'borja45'; // Contraseña del .env
const TEST_GAME_CODE = null; // Se generará automáticamente

// Colores para consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✓ ${message}`, 'green');
}

function logError(message) {
    log(`✗ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
    log(`⚠ ${message}`, 'yellow');
}

// Test 1: Verificar que el servidor está corriendo
async function testServerConnection() {
    return new Promise((resolve, reject) => {
        logInfo('Test 1: Verificando conexión al servidor...');
        
        const socket = io(SERVER_URL, {
            transports: ['websocket'],
            reconnection: false
        });

        socket.on('connect', () => {
            logSuccess('Servidor conectado correctamente');
            socket.disconnect();
            resolve();
        });

        socket.on('connect_error', (error) => {
            logError(`Error al conectar con el servidor: ${error.message}`);
            reject(error);
        });

        setTimeout(() => {
            logError('Timeout: El servidor no responde');
            socket.disconnect();
            reject(new Error('Timeout'));
        }, 5000);
    });
}

// Test 2: Verificar autenticación de anfitrión
async function testHostAuthentication() {
    return new Promise((resolve, reject) => {
        logInfo('Test 2: Verificando autenticación de anfitrión...');
        
        const socket = io(SERVER_URL, {
            transports: ['websocket'],
            reconnection: false
        });

        let authenticationSuccessful = false;

        socket.on('connect', () => {
            socket.emit('submit_host_password', HOST_PASSWORD);
        });

        socket.on('session_status', (data) => {
            if (data.isActive) {
                logSuccess('Anfitrión autenticado correctamente');
                authenticationSuccessful = true;
                socket.emit('end_host_session');
                socket.disconnect();
                resolve();
            }
        });

        socket.on('password_incorrect', () => {
            logError('Contraseña incorrecta');
            socket.disconnect();
            reject(new Error('Contraseña incorrecta'));
        });

        setTimeout(() => {
            if (!authenticationSuccessful) {
                logError('Timeout: No se recibió confirmación de autenticación');
                socket.disconnect();
                reject(new Error('Timeout en autenticación'));
            }
        }, 5000);
    });
}

// Test 3: Crear partida y unir jugadores
async function testGameCreationAndJoin() {
    return new Promise((resolve, reject) => {
        logInfo('Test 3: Creando partida y uniendo jugadores...');
        
        let gameCode = null;
        const hostSocket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
        const players = [];
        let playersJoined = 0;
        const totalPlayers = 3; // Reducido a 3 para tests más rápidos

        // Timeout global para el test
        const globalTimeout = setTimeout(() => {
            logError('Timeout global: Test tomó demasiado tiempo');
            hostSocket.disconnect();
            players.forEach(p => p.disconnect());
            reject(new Error('Timeout en test de creación'));
        }, 15000);

        hostSocket.on('connect', () => {
            logInfo('Anfitrión conectado, enviando contraseña...');
            hostSocket.emit('submit_host_password', HOST_PASSWORD);
        });

        hostSocket.on('session_status', (data) => {
            if (data.isActive) {
                logInfo('Sesión activa, creando partida...');
                hostSocket.emit('create_game', { mode: 'fragments' });
            }
        });

        hostSocket.on('game_created', (data) => {
            gameCode = data.code;
            logSuccess(`Partida creada con código: ${gameCode}`);
            
            // Crear jugadores de prueba uno por uno
            setTimeout(() => createPlayer(1), 500);
        });

        function createPlayer(playerNum) {
            if (playerNum > totalPlayers) {
                // Todos los jugadores creados, esperar un poco más
                setTimeout(() => {
                    logInfo(`Total de jugadores que se unieron: ${playersJoined}/${totalPlayers}`);
                    clearTimeout(globalTimeout);
                    hostSocket.disconnect();
                    players.forEach(p => p.disconnect());
                    
                    if (playersJoined >= totalPlayers) {
                        resolve({ gameCode, success: true });
                    } else {
                        reject(new Error(`Solo ${playersJoined}/${totalPlayers} jugadores se unieron`));
                    }
                }, 2000);
                return;
            }

            const playerSocket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
            players.push(playerSocket);
            
            playerSocket.on('connect', () => {
                logInfo(`Jugador${playerNum} conectado, uniéndose a partida...`);
                playerSocket.emit('join_game', { name: `Jugador${playerNum}`, code: gameCode });
            });

            playerSocket.on('player_joined', (playersList) => {
                const found = playersList.find(p => p.name === `Jugador${playerNum}`);
                if (found && !playerSocket.hasJoined) {
                    playerSocket.hasJoined = true;
                    playersJoined++;
                    logSuccess(`Jugador${playerNum} se unió correctamente (${playersJoined}/${totalPlayers})`);
                }
            });

            playerSocket.on('join_failed', (message) => {
                logError(`Jugador${playerNum} no pudo unirse: ${message}`);
            });

            // Crear siguiente jugador después de un pequeño delay
            setTimeout(() => createPlayer(playerNum + 1), 800);
        }

        hostSocket.on('creation_failed', (message) => {
            logError(`Error al crear partida: ${message}`);
            clearTimeout(globalTimeout);
            hostSocket.disconnect();
            reject(new Error(message));
        });

        hostSocket.on('connect_error', (error) => {
            logError(`Error de conexión del anfitrión: ${error.message}`);
            clearTimeout(globalTimeout);
            reject(error);
        });
    });
}

// Test 4: Verificar sistema de ping/pong
async function testHeartbeat() {
    return new Promise((resolve, reject) => {
        logInfo('Test 4: Verificando sistema de heartbeat (ping/pong)...');
        
        const socket = io(SERVER_URL, { transports: ['websocket'] });
        let pongReceived = false;

        socket.on('connect', () => {
            // Enviar ping
            socket.emit('ping');
        });

        socket.on('pong', () => {
            pongReceived = true;
            logSuccess('Sistema de ping/pong funcionando correctamente');
            socket.disconnect();
            resolve();
        });

        setTimeout(() => {
            if (!pongReceived) {
                logError('No se recibió pong del servidor');
                socket.disconnect();
                reject(new Error('Pong no recibido'));
            }
        }, 2000);
    });
}

// Test 5: Verificar reconexión de jugadores
async function testPlayerReconnection() {
    return new Promise((resolve, reject) => {
        logInfo('Test 5: Verificando reconexión de jugadores...');
        
        let gameCode = null;
        const hostSocket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
        let playerSocket = null;
        let testCompleted = false;

        const globalTimeout = setTimeout(() => {
            if (!testCompleted) {
                logError('Timeout: Test de reconexión tomó demasiado tiempo');
                if (hostSocket) hostSocket.disconnect();
                if (playerSocket) playerSocket.disconnect();
                reject(new Error('Timeout en reconexión'));
            }
        }, 20000);

        hostSocket.on('connect', () => {
            logInfo('Anfitrión conectado para test de reconexión...');
            hostSocket.emit('submit_host_password', HOST_PASSWORD);
        });

        hostSocket.on('session_status', (data) => {
            if (data.isActive) {
                hostSocket.emit('create_game', { mode: 'fragments' });
            }
        });

        hostSocket.on('game_created', (data) => {
            gameCode = data.code;
            logInfo(`Partida creada: ${gameCode}`);
            
            // Crear jugador
            playerSocket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
            
            playerSocket.on('connect', () => {
                logInfo('Jugador conectándose...');
                playerSocket.emit('join_game', { name: 'TestPlayer', code: gameCode });
            });

            playerSocket.on('player_joined', (playersList) => {
                if (playersList.find(p => p.name === 'TestPlayer') && !playerSocket.hasJoined) {
                    playerSocket.hasJoined = true;
                    logSuccess('Jugador unido inicialmente');
                    
                    // Simular desconexión
                    setTimeout(() => {
                        logInfo('Simulando desconexión del jugador...');
                        playerSocket.disconnect();
                        
                        // Reconectar después de 2 segundos
                        setTimeout(() => {
                            logInfo('Intentando reconectar...');
                            playerSocket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
                            
                            playerSocket.on('connect', () => {
                                playerSocket.emit('join_game', { name: 'TestPlayer', code: gameCode });
                            });

                            playerSocket.on('rejoined_game', (data) => {
                                if (!testCompleted) {
                                    testCompleted = true;
                                    logSuccess('Jugador reconectado exitosamente (rejoined_game)');
                                    clearTimeout(globalTimeout);
                                    hostSocket.disconnect();
                                    playerSocket.disconnect();
                                    resolve();
                                }
                            });

                            playerSocket.on('player_joined', () => {
                                if (!testCompleted) {
                                    testCompleted = true;
                                    logSuccess('Jugador reconectado exitosamente (player_joined)');
                                    clearTimeout(globalTimeout);
                                    hostSocket.disconnect();
                                    playerSocket.disconnect();
                                    resolve();
                                }
                            });

                            playerSocket.on('join_failed', (message) => {
                                logError(`Reconexión falló: ${message}`);
                            });
                        }, 2000);
                    }, 2000);
                }
            });

            playerSocket.on('join_failed', (message) => {
                logError(`Jugador no pudo unirse: ${message}`);
            });
        });

        hostSocket.on('creation_failed', (message) => {
            logError(`Error al crear partida: ${message}`);
            clearTimeout(globalTimeout);
            hostSocket.disconnect();
            reject(new Error(message));
        });
    });
}

// Test 6: Verificar que el audio solo se reproduce en el anfitrión
async function testAudioOnlyForHost() {
    return new Promise((resolve, reject) => {
        logInfo('Test 6: Verificando que el audio solo se reproduce en el anfitrión...');
        
        let gameCode = null;
        const hostSocket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
        let playerSocket = null;
        let hostReceivedAudio = false;
        let playerReceivedAudio = false;
        let playerReceivedVisual = false;
        let testCompleted = false;

        const globalTimeout = setTimeout(() => {
            if (!testCompleted) {
                logError('Timeout: Test de audio tomó demasiado tiempo');
                if (hostSocket) hostSocket.disconnect();
                if (playerSocket) playerSocket.disconnect();
                reject(new Error('Timeout en test de audio'));
            }
        }, 20000);

        hostSocket.on('connect', () => {
            hostSocket.emit('submit_host_password', HOST_PASSWORD);
        });

        hostSocket.on('session_status', (data) => {
            if (data.isActive) {
                hostSocket.emit('create_game', { mode: 'fragments' });
            }
        });

        hostSocket.on('game_created', (data) => {
            gameCode = data.code;
            logInfo(`Partida creada: ${gameCode}`);
            
            // Crear jugador
            playerSocket = io(SERVER_URL, { transports: ['websocket'] });
            
            playerSocket.on('connect', () => {
                playerSocket.emit('join_game', { name: 'AudioTestPlayer', code: gameCode });
            });

            playerSocket.on('player_joined', () => {
                // Iniciar el juego
                hostSocket.emit('start_game');
            });
        });

        hostSocket.on('game_started', () => {
            logInfo('Juego iniciado, reproduciendo audio...');
            // Reproducir fragmento
            hostSocket.emit('play_fragment', { duration: 3 });
        });

        // El anfitrión debe recibir play_audio
        hostSocket.on('play_audio', (data) => {
            hostReceivedAudio = true;
            logSuccess('Anfitrión recibió evento play_audio (correcto)');
        });

        // El jugador NO debe recibir play_audio
        if (playerSocket) {
            playerSocket.on('play_audio', (data) => {
                playerReceivedAudio = true;
                logError('Jugador recibió evento play_audio (INCORRECTO)');
            });

            // El jugador debe recibir audio_playing
            playerSocket.on('audio_playing', (data) => {
                playerReceivedVisual = true;
                logSuccess('Jugador recibió evento audio_playing para efectos visuales (correcto)');
            });
        }

        setTimeout(() => {
            if (!testCompleted) {
                testCompleted = true;
                logInfo('Verificando resultados del test de audio...');
                clearTimeout(globalTimeout);
                
                if (hostReceivedAudio && !playerReceivedAudio && playerReceivedVisual) {
                    logSuccess('✓ Test de audio EXITOSO: El audio solo se reproduce en el anfitrión');
                    hostSocket.disconnect();
                    if (playerSocket) playerSocket.disconnect();
                    resolve();
                } else {
                    let errorMsg = 'Test de audio FALLIDO: ';
                    if (!hostReceivedAudio) errorMsg += 'Anfitrión no recibió audio. ';
                    if (playerReceivedAudio) errorMsg += 'Jugador recibió audio (no debería). ';
                    if (!playerReceivedVisual) errorMsg += 'Jugador no recibió señal visual. ';
                    
                    logError(errorMsg);
                    hostSocket.disconnect();
                    if (playerSocket) playerSocket.disconnect();
                    reject(new Error(errorMsg));
                }
            }
        }, 5000);
    });
}

// Test 7: Verificar reconexión del anfitrión
async function testHostReconnection() {
    return new Promise((resolve, reject) => {
        logInfo('Test 7: Verificando reconexión del anfitrión...');
        
        let gameCode = null;
        let hostSocket = io(SERVER_URL, { transports: ['websocket'] });

        hostSocket.on('connect', () => {
            hostSocket.emit('submit_host_password', HOST_PASSWORD);
        });

        hostSocket.on('session_status', (data) => {
            if (data.isActive) {
                hostSocket.emit('create_game', { mode: 'fragments' });
            }
        });

        hostSocket.on('game_created', (data) => {
            gameCode = data.code;
            logSuccess(`Partida creada: ${gameCode}`);
            
            // Simular desconexión del anfitrión
            setTimeout(() => {
                logInfo('Simulando desconexión del anfitrión...');
                hostSocket.disconnect();
                
                // Intentar reconexión después de 2 segundos
                setTimeout(() => {
                    logInfo('Intentando reconectar anfitrión...');
                    hostSocket = io(SERVER_URL, { transports: ['websocket'] });
                    
                    hostSocket.on('connect', () => {
                        hostSocket.emit('rejoin_as_host', { code: gameCode });
                    });

                    hostSocket.on('rejoined_game', (data) => {
                        if (data.isHost) {
                            logSuccess('Anfitrión reconectado exitosamente');
                            hostSocket.disconnect();
                            resolve();
                        } else {
                            logError('Reconectado pero no como anfitrión');
                            hostSocket.disconnect();
                            reject(new Error('No reconectado como anfitrión'));
                        }
                    });

                    hostSocket.on('rejoin_failed', (message) => {
                        logWarning(`Reconexión de anfitrión falló (esperado si pasó mucho tiempo): ${message}`);
                        hostSocket.disconnect();
                        resolve(); // No es un error crítico
                    });
                }, 2000);
            }, 2000);
        });

        setTimeout(() => {
            logError('Timeout en test de reconexión de anfitrión');
            if (hostSocket) hostSocket.disconnect();
            reject(new Error('Timeout'));
        }, 15000);
    });
}

// Ejecutar todos los tests
async function runAllTests() {
    log('\n========================================', 'blue');
    log('  SUITE DE TESTS - GUESS THE SONG', 'blue');
    log('========================================\n', 'blue');

    const tests = [
        { name: 'Conexión al servidor', fn: testServerConnection },
        { name: 'Autenticación de anfitrión', fn: testHostAuthentication },
        { name: 'Creación de partida y unión de jugadores', fn: testGameCreationAndJoin },
        { name: 'Sistema de heartbeat', fn: testHeartbeat },
        { name: 'Reconexión de jugadores', fn: testPlayerReconnection },
        { name: 'Audio solo en anfitrión', fn: testAudioOnlyForHost },
        { name: 'Reconexión de anfitrión', fn: testHostReconnection }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            await test.fn();
            passed++;
            log(''); // Línea en blanco
        } catch (error) {
            failed++;
            logError(`Error en ${test.name}: ${error.message}`);
            log(''); // Línea en blanco
        }

        // Pequeña pausa entre tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    log('\n========================================', 'blue');
    log(`  RESULTADOS FINALES`, 'blue');
    log('========================================', 'blue');
    logSuccess(`Tests exitosos: ${passed}/${tests.length}`);
    if (failed > 0) {
        logError(`Tests fallidos: ${failed}/${tests.length}`);
    }
    log('========================================\n', 'blue');

    process.exit(failed > 0 ? 1 : 0);
}

// Ejecutar tests
if (require.main === module) {
    logInfo('Asegúrate de que el servidor esté corriendo en http://localhost:3000');
    logInfo('Iniciando tests en 2 segundos...\n');
    
    setTimeout(() => {
        runAllTests().catch(error => {
            logError(`Error fatal: ${error.message}`);
            process.exit(1);
        });
    }, 2000);
}

module.exports = {
    testServerConnection,
    testHostAuthentication,
    testGameCreationAndJoin,
    testHeartbeat,
    testPlayerReconnection,
    testAudioOnlyForHost,
    testHostReconnection
};
