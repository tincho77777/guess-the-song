// server.js
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
const songs = require('./songs.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const HOST_PASSWORD = process.env.HOST_PASSWORD;

console.log('Valor de HOST_PASSWORD desde .env:', HOST_PASSWORD);

const games = {};
let isHostSessionActive = false;
let currentHostId = null;
const disconnectedPlayers = {}; // {gameCode: {playerId: {player, timeout}}}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/audio', express.static(path.join(__dirname, 'audio')));

// Configurar Socket.IO con timeouts más largos
io.engine.on("connection", (rawSocket) => {
    rawSocket.pingInterval = 10000; // 10 segundos
    rawSocket.pingTimeout = 60000;  // 60 segundos
});

io.on('connection', (socket) => {
    const connectionTime = new Date().toLocaleTimeString();
    console.log(`[${connectionTime}] ✓ Jugador conectado: ${socket.id}`);

    // Al conectarse, notificar el estado de la sesión de anfitrión
    socket.emit('session_status', { isActive: isHostSessionActive });

    // Responder a pings del cliente para mantener conexión viva
    socket.on('ping', () => {
        socket.emit('pong');
        console.log(`[${new Date().toLocaleTimeString()}] ♥ Ping recibido de ${socket.id}`);
    });

    socket.on('submit_host_password', (password) => {
        if (HOST_PASSWORD && password.trim() === HOST_PASSWORD.trim()) {
            isHostSessionActive = true;
            currentHostId = socket.id;
            io.emit('session_status', { isActive: true });
            console.log(`[${new Date().toLocaleTimeString()}] 🔑 Sesión de anfitrión abierta por ${socket.id}`);
        } else {
            console.log(`[${new Date().toLocaleTimeString()}] ❌ Contraseña incorrecta intentada por ${socket.id}`);
            io.to(socket.id).emit('password_incorrect');
        }
    });

    socket.on('end_host_session', () => {
        if (socket.id === currentHostId) {
            isHostSessionActive = false;
            currentHostId = null;
            io.emit('session_status', { isActive: false });
            console.log(`Sesión de anfitrión cerrada por ${socket.id}`);
        }
    });

    socket.on('create_game', (data) => {
        if (!isHostSessionActive || socket.id !== currentHostId) {
            io.to(socket.id).emit('creation_failed', 'La sesión de anfitrión no está activa.');
            return;
        }

        const gameCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        games[gameCode] = {
            state: 'waiting',
            code: gameCode,
            hostId: socket.id,
            players: {},
            currentSong: null,
            correctAnswer: '',
            correctTitle: '',
            correctArtist: '',
            answeredCorrectly: new Set(),
            mode: data.mode,
            unplayedSongs: songs.slice(),
            playedSongs: [],
            lastDuration: 0
        };
        socket.join(gameCode);
        console.log(`[${new Date().toLocaleTimeString()}] 🎮 Partida creada - Código: ${gameCode} | Modo: ${games[gameCode].mode} | Anfitrión: ${socket.id}`);
        io.to(socket.id).emit('game_created', { code: gameCode });
    });

    socket.on('join_game', ({ name, code }) => {
        const game = games[code];
        if (!game) {
            io.to(socket.id).emit('join_failed', 'Código de partida incorrecto.');
            return;
        }
    
        // Lógica para permitir la reconexión
        const existingPlayer = Object.values(game.players).find(p => p.name.toLowerCase() === name.toLowerCase());
    
        if (existingPlayer) {
            console.log(`[${new Date().toLocaleTimeString()}] 🔄 RECONEXIÓN: ${name} (${existingPlayer.id} → ${socket.id}) | Partida: ${code} | Puntaje: ${existingPlayer.score}`);
            
            // Limpiar timeout de desconexión si existe
            if (disconnectedPlayers[code] && disconnectedPlayers[code][existingPlayer.id]) {
                clearTimeout(disconnectedPlayers[code][existingPlayer.id].timeout);
                delete disconnectedPlayers[code][existingPlayer.id];
                console.log(`[${new Date().toLocaleTimeString()}] ⏰ Timeout de desconexión cancelado para ${name}`);
            }
            
            // Asignar el nuevo socket ID al jugador existente
            game.players[socket.id] = { 
                ...existingPlayer, 
                id: socket.id 
            };
            // Eliminar la entrada antigua con el ID anterior
            delete game.players[existingPlayer.id];
    
            socket.join(game.code);
            io.to(socket.id).emit('rejoined_game', { 
                code: game.code, 
                players: Object.values(game.players),
                state: game.state,
                isHost: false
            });
            io.to(game.code).emit('player_joined', Object.values(game.players));
            return;
        }
    
        // Si la partida ya comenzó y no es una reconexión, no permitir la entrada
        if (game.state !== 'waiting') {
            io.to(socket.id).emit('join_failed', 'La partida ya ha comenzado.');
            return;
        }
    
        // Lógica para unirse a una partida nueva
        const newPlayer = { name: name, id: socket.id, score: 0 };
        game.players[socket.id] = newPlayer;
    
        socket.join(game.code);
        console.log(`[${new Date().toLocaleTimeString()}] ➕ NUEVO JUGADOR: ${name} (${socket.id}) | Partida: ${code} | Total jugadores: ${Object.keys(game.players).length}`);
        io.to(game.code).emit('player_joined', Object.values(game.players));
    });

    // Manejo de reconexión del anfitrión
    socket.on('rejoin_as_host', ({ code }) => {
        const game = games[code];
        if (!game) {
            io.to(socket.id).emit('rejoin_failed', 'Código de partida incorrecto.');
            return;
        }
        
        // Cancelar timeout de reconexión si existe
        if (game.hostReconnectionTimeout) {
            clearTimeout(game.hostReconnectionTimeout);
            delete game.hostReconnectionTimeout;
        }
        
        if (game.hostId && game.hostId !== socket.id) {
            // Verificar si el anfitrión anterior se desconectó
            console.log(`Anfitrión reconectándose a partida ${code}`);
            game.hostId = socket.id;
            socket.join(game.code);
            
            io.to(socket.id).emit('rejoined_game', { 
                code: game.code, 
                players: Object.values(game.players),
                state: game.state,
                isHost: true
            });
            
            console.log(`Anfitrión reconectado a partida ${code}`);
        }
    });

    socket.on('start_game', () => {
        const game = findGameByHostId(socket.id);
        if (game && game.state === 'waiting' && Object.keys(game.players).length > 0) {
            game.state = 'playing';
            console.log(`[${new Date().toLocaleTimeString()}] 🎬 JUEGO INICIADO | Partida: ${game.code} | Jugadores: ${Object.keys(game.players).length}`);
            selectNewSong(game);
            io.to(game.code).emit('game_started');
        } else {
            console.log(`[${new Date().toLocaleTimeString()}] ⚠️ No se pudo iniciar juego | Estado: ${game?.state} | Jugadores: ${game ? Object.keys(game.players).length : 0}`);
        }
    });

    socket.on('start_next_round', () => {
        const game = findGameByHostId(socket.id);
        if (game && game.state === 'playing') {
            selectNewSong(game);
            io.to(game.code).emit('game_started');
        }
    });

    socket.on('play_fragment', (data) => {
        const game = findGameByHostId(socket.id);
        if (game && game.state === 'playing' && game.currentSong) {
            game.lastDuration = data.duration;
            const duration = data.duration === 'full' ? 9999 : data.duration;
            // Solo enviar al anfitrión para que reproduzca el audio
            io.to(socket.id).emit('play_audio', {
                file: game.currentSong.file,
                duration: duration
            });
            // Notificar a los jugadores que se está reproduciendo (para mostrar ecualizador)
            socket.to(game.code).emit('audio_playing', {
                duration: duration
            });
        }
    });

    socket.on('end_round', () => {
        const game = findGameByHostId(socket.id);
        if (game) {
            const roundData = { answer: game.correctAnswer, players: Object.values(game.players) };
            if (game.answeredCorrectly.size > 0) {
                io.to(game.code).emit('round_summary', roundData);
            } else {
                io.to(game.code).emit('round_ended', roundData);
            }
        }
    });
    
    socket.on('end_game', () => {
        const game = findGameByHostId(socket.id);
        if (game) {
            io.to(game.code).emit('game_ended', { players: Object.values(game.players) });
            delete games[game.code];
        }
    });

    socket.on('submit_answer', (answer) => {
        const game = findGameByPlayerId(socket.id);
        if (game && game.currentSong) {
            const player = game.players[socket.id];
            if (!player) return;

            if (game.answeredCorrectly.has(socket.id)) {
                io.to(socket.id).emit('already_answered'); 
                return;
            }

            const pointsToAdd = calculatePoints(answer, game);
            
            if (pointsToAdd > 0) {
                player.score += pointsToAdd;
                game.answeredCorrectly.add(socket.id);
                
                io.to(socket.id).emit('player_guessed_correctly', {
                    answer: game.correctAnswer,
                    points: pointsToAdd
                });

                io.to(game.code).emit('correct_answer', {
                    player: player.name,
                    answer: game.correctAnswer,
                    score: player.score,
                    players: Object.values(game.players)
                });
            } else {
                io.to(socket.id).emit('wrong_answer');
            }
        }
    });

    socket.on('disconnect', (reason) => {
        const disconnectTime = new Date().toLocaleTimeString();
        console.log(`[${disconnectTime}] 🔌 DESCONEXIÓN: ${socket.id} | Razón: ${reason}`);
        
        // Manejar desconexión del anfitrión
        const hostGame = findGameByHostId(socket.id);
        if (hostGame) {
            console.log(`[${disconnectTime}] 👑 ANFITRIÓN DESCONECTADO | Partida: ${hostGame.code} | Jugadores: ${Object.keys(hostGame.players).length} | Esperando 30s para reconexión...`);
            
            // Dar 30 segundos para que el anfitrión se reconecte
            const reconnectionTimeout = setTimeout(() => {
                if (games[hostGame.code] && games[hostGame.code].hostId === socket.id) {
                    console.log(`[${new Date().toLocaleTimeString()}] ⏰ TIMEOUT: Anfitrión no se reconectó | Finalizando partida ${hostGame.code}`);
                    io.to(hostGame.code).emit('game_ended_by_host');
                    delete games[hostGame.code];
                    
                    if (socket.id === currentHostId) {
                        isHostSessionActive = false;
                        currentHostId = null;
                        io.emit('session_status', { isActive: false });
                    }
                }
            }, 30000); // 30 segundos
            
            // Guardar referencia del timeout para cancelarlo si se reconecta
            hostGame.hostReconnectionTimeout = reconnectionTimeout;
            return;
        }
        
        // Manejar desconexión de jugadores
        const game = findGameByPlayerId(socket.id);
        if (game && game.players[socket.id]) {
            const player = game.players[socket.id];
            console.log(`[${disconnectTime}] 👤 JUGADOR DESCONECTADO | Nombre: ${player.name} | Partida: ${game.code} | Puntaje: ${player.score} | Esperando 2min para reconexión...`);
            
            // Guardar jugador desconectado y dar 2 minutos para reconectar
            if (!disconnectedPlayers[game.code]) {
                disconnectedPlayers[game.code] = {};
            }
            
            const reconnectionTimeout = setTimeout(() => {
                if (game.players[socket.id]) {
                    console.log(`[${new Date().toLocaleTimeString()}] ⏰ TIMEOUT: ${player.name} no se reconectó | Eliminando de partida ${game.code}`);
                    delete game.players[socket.id];
                    io.to(game.code).emit('player_left', { players: Object.values(game.players) });
                }
                if (disconnectedPlayers[game.code]) {
                    delete disconnectedPlayers[game.code][socket.id];
                }
            }, 120000); // 2 minutos
            
            disconnectedPlayers[game.code][socket.id] = {
                player: player,
                timeout: reconnectionTimeout
            };
        } else {
            console.log(`[${disconnectTime}] ℹ️ Desconexión de socket sin juego activo`);
        }
    });
});

function findGameByHostId(hostId) {
    for (const code in games) {
        if (games[code].hostId === hostId) {
            return games[code];
        }
    }
    return null;
}

function findGameByPlayerId(socketId) {
    for (const code in games) {
        if (games[code].players[socketId]) {
            return games[code];
        }
    }
    return null;
}

function selectNewSong(game) {
    game.answeredCorrectly.clear();
    game.lastDuration = 0;

    if (game.unplayedSongs.length === 0) {
        game.unplayedSongs = songs.slice(); 
        game.playedSongs = [];
        console.log("Todas las canciones han sido jugadas. Reiniciando la lista de canciones.");
    }
    
    const randomIndex = Math.floor(Math.random() * game.unplayedSongs.length);
    game.currentSong = game.unplayedSongs[randomIndex];
    
    game.correctTitle = game.currentSong.title;
    game.correctArtist = game.currentSong.artist;
    game.correctAnswer = `${game.correctTitle} - ${game.correctArtist}`;

    game.playedSongs.push(game.unplayedSongs[randomIndex]);
    game.unplayedSongs.splice(randomIndex, 1);
    
    console.log(`Nueva canción seleccionada: ${game.correctAnswer}`);
}

function normalizeString(text) {
    if (!text) return '';
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "");
}

function containsAllWords(haystack, needle) {
    const haystackWords = new Set(normalizeString(haystack).split(' ').filter(word => word.length > 0));
    const needleWords = normalizeString(needle).split(' ').filter(word => word.length > 0);
    return needleWords.every(word => haystackWords.has(word));
}

function calculatePoints(playerAnswer, game) {
    const titleIsCorrect = containsAllWords(playerAnswer, game.correctTitle);
    const artistIsCorrect = containsAllWords(playerAnswer, game.correctArtist);

    let basePoints = 0;
    switch (game.lastDuration) {
        case 3:
            basePoints = 100;
            break;
        case 5:
            basePoints = 70;
            break;
        case 7:
            basePoints = 50;
            break;
        case 'full':
            basePoints = 30;
            break;
        default:
            basePoints = 20;
            break;
    }

    if (titleIsCorrect && artistIsCorrect) {
        return basePoints;
    } else if (titleIsCorrect) {
        return Math.round(basePoints * 0.75);
    } else if (artistIsCorrect) {
        return Math.round(basePoints * 0.5);
    } else {
        return 0;
    }
}

server.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🎵  GUESS THE SONG - SERVIDOR INICIADO  🎵');
    console.log('='.repeat(60));
    console.log(`📡 Servidor: http://localhost:${PORT}`);
    console.log(`🔑 Contraseña anfitrión: ${HOST_PASSWORD ? '✓ Configurada' : '✗ No configurada'}`);
    console.log(`🔧 Configuración Socket.IO:`);
    console.log(`   - Ping Interval: 10s`);
    console.log(`   - Ping Timeout: 60s`);
    console.log(`   - Reconexión Anfitrión: 30s`);
    console.log(`   - Reconexión Jugadores: 2min`);
    console.log('='.repeat(60));
    console.log('📊 Logs activos:');
    console.log('   ✓ Conexiones      🔌 Desconexiones');
    console.log('   🎮 Partidas       👥 Jugadores');
    console.log('   🔄 Reconexiones   ⚠️  Errores');
    console.log('='.repeat(60) + '\n');
});