// public/script.js

const socket = io();

let isHost = false;
let myGameCode = null;
let playerName = null;
let pingInterval = null;
let lastPongTime = Date.now();
let reconnectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 5;

// Elementos de la interfaz de usuario
const passwordScreen = document.getElementById('password-screen');
const welcomeScreen = document.getElementById('welcome-screen');
const hostCreationScreen = document.getElementById('host-creation-screen');
const playerScreen = document.getElementById('player-screen');
const gameLobby = document.getElementById('game-lobby');
const gameScreen = document.getElementById('game-screen');

const feedbackMessage = document.getElementById('feedback-message');
const finalScoresModal = document.getElementById('final-scores-modal');
const finalScoresList = document.getElementById('final-scores-list');
const closeFinalScoresBtn = document.querySelector('.close-button');
const endGameReturnBtn = document.getElementById('end-game-return-btn');

const hostPasswordInput = document.getElementById('host-password-input');
const submitPasswordBtn = document.getElementById('submit-password-btn');
const togglePasswordBtn = document.getElementById('toggle-password');

const hostBtn = document.getElementById('host-btn');
const playerBtn = document.getElementById('player-btn');
const endSessionBtn = document.getElementById('end-session-btn');

const fragmentsBtn = document.getElementById('fragments-btn');
const instrumentsBtn = document.getElementById('instruments-btn');

const nameInput = document.getElementById('name-input');
const codeInput = document.getElementById('code-input');
const joinBtn = document.getElementById('join-btn');
const joinStatus = document.getElementById('join-status');

const gameCodeDisplay = document.getElementById('game-code');
const playersList = document.getElementById('players-list');

const startBtn = document.getElementById('start-game-btn');
const roundControlButtons = document.getElementById('round-control-buttons');
const nextRoundBtn = document.getElementById('next-round-btn');
const endGameBtn = document.getElementById('end-game-btn');

const hostLobbyControls = document.getElementById('host-lobby-controls');
const playerLobbyMessage = document.getElementById('player-lobby-message');

const hostControls = document.getElementById('host-controls');
const play3sBtn = document.getElementById('play-3s-btn');
const play5sBtn = document.getElementById('play-5s-btn');
const play7sBtn = document.getElementById('play-7s-btn');
const playFullBtn = document.getElementById('play-full-btn');
const endRoundBtn = document.getElementById('end-round-btn');
const hostAudioPlayer = document.getElementById('audio-player-host');
const hostAudioContainer = document.getElementById('host-audio-container');
const hostTimerBar = document.getElementById('host-timer-bar');

const playerAudioContainer = document.getElementById('player-audio-container');
const audioPlayerPlayer = document.getElementById('audio-player-player');
const timerBar = document.getElementById('timer-bar');
const answerInput = document.getElementById('answer-input');
const submitBtn = document.getElementById('submit-answer-btn');

const equalizer = document.getElementById('equalizer');

function showScreen(screen) {
    passwordScreen.style.display = 'none';
    welcomeScreen.style.display = 'none';
    hostCreationScreen.style.display = 'none';
    playerScreen.style.display = 'none';
    gameLobby.style.display = 'none';
    gameScreen.style.display = 'none';
    if (screen) {
        screen.style.display = 'block';
    }
}

function showFeedback(message) {
    feedbackMessage.textContent = message;
    feedbackMessage.style.display = 'block';
    feedbackMessage.style.position = 'fixed';
    feedbackMessage.style.top = '20px';
    feedbackMessage.style.left = '50%';
    feedbackMessage.style.transform = 'translateX(-50%)';
    feedbackMessage.style.padding = '10px 20px';
    feedbackMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    feedbackMessage.style.color = 'white';
    feedbackMessage.style.borderRadius = '5px';
    feedbackMessage.style.zIndex = '1000';
    setTimeout(() => {
        feedbackMessage.style.display = 'none';
    }, 4000);
}

function updatePlayersList(players) {
    if (playersList) {
        playersList.innerHTML = '';
        const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
        sortedPlayers.forEach(player => {
            const li = document.createElement('li');
            li.textContent = `${player.name} - ${player.score} puntos`;
            playersList.appendChild(li);
        });
    }
}

submitPasswordBtn.addEventListener('click', () => {
    const password = hostPasswordInput.value;
    socket.emit('submit_host_password', password);
});

if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
        const type = hostPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        hostPasswordInput.setAttribute('type', type);
        const icon = togglePasswordBtn.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
}

endSessionBtn.addEventListener('click', () => {
    socket.emit('end_host_session');
});

hostBtn.addEventListener('click', () => {
    isHost = true;
    showScreen(hostCreationScreen);
});

playerBtn.addEventListener('click', () => {
    isHost = false;
    showScreen(playerScreen);
});

if (fragmentsBtn) {
    fragmentsBtn.addEventListener('click', () => {
        socket.emit('create_game', { mode: 'fragments' });
    });
}
if (instrumentsBtn) {
    instrumentsBtn.addEventListener('click', () => {
        socket.emit('create_game', { mode: 'instruments' });
    });
}

if (startBtn) {
    startBtn.addEventListener('click', () => {
        socket.emit('start_game');
    });
}

if (nextRoundBtn) {
    nextRoundBtn.addEventListener('click', () => {
        socket.emit('start_next_round');
    });
}
if (endGameBtn) {
    endGameBtn.addEventListener('click', () => {
        socket.emit('end_game');
    });
}

if (play3sBtn) {
    play3sBtn.addEventListener('click', () => {
        socket.emit('play_fragment', { duration: 3 });
    });
}
if (play5sBtn) {
    play5sBtn.addEventListener('click', () => {
        socket.emit('play_fragment', { duration: 5 });
    });
}
if (play7sBtn) {
    play7sBtn.addEventListener('click', () => {
        socket.emit('play_fragment', { duration: 7 });
    });
}
if (playFullBtn) {
    playFullBtn.addEventListener('click', () => {
        socket.emit('play_fragment', { duration: 'full' });
    });
}
if (endRoundBtn) {
    endRoundBtn.addEventListener('click', () => {
        socket.emit('end_round');
    });
}


if (joinBtn) {
    joinBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const code = codeInput.value.trim().toUpperCase();
        if (name && code) {
            playerName = name; // Guardar el nombre para posibles reconexiones
            socket.emit('join_game', { name, code });
        } else {
            if (joinStatus) joinStatus.textContent = 'Por favor, ingresa tu nombre y el código de la partida.';
        }
    });
}
if (submitBtn) {
    submitBtn.addEventListener('click', () => {
        const answer = answerInput.value;
        if (answer.trim() !== '') {
            socket.emit('submit_answer', answer);
            answerInput.value = '';
        }
    });
}

if (closeFinalScoresBtn) {
    closeFinalScoresBtn.addEventListener('click', () => {
        finalScoresModal.style.display = 'none';
        window.location.reload();
    });
}

if (endGameReturnBtn) {
    endGameReturnBtn.addEventListener('click', () => {
        finalScoresModal.style.display = 'none';
        window.location.reload();
    });
}


// Eventos del servidor
socket.on('session_status', (data) => {
    if (data.isActive) {
        showScreen(welcomeScreen);
        if (isHost) {
            endSessionBtn.style.display = 'block';
        }
    } else {
        showScreen(passwordScreen);
        endSessionBtn.style.display = 'none';
    }
});

socket.on('password_incorrect', () => {
    showFeedback('Contraseña incorrecta.');
});

socket.on('creation_failed', (message) => {
    showFeedback(message);
    showScreen(welcomeScreen);
});

socket.on('game_created', (data) => {
    isHost = true;
    myGameCode = data.code;
    showScreen(gameLobby);
    gameCodeDisplay.textContent = `Código de la partida: ${data.code}`;
    hostLobbyControls.style.display = 'block';
    playerLobbyMessage.style.display = 'none';
    startBtn.style.display = 'block';
    roundControlButtons.style.display = 'none';
});

// NUEVO EVENTO PARA MANEJAR RECONEXIÓN
socket.on('rejoined_game', (data) => {
    myGameCode = data.code;
    isHost = data.isHost || false;
    
    // Si la partida ya ha comenzado
    if (data.state === 'playing') {
        showScreen(gameScreen);
        
        if (isHost) {
            hostControls.style.display = 'flex';
            hostAudioContainer.style.display = 'block';
            playerAudioContainer.style.display = 'none';
            answerInput.style.display = 'none';
            submitBtn.style.display = 'none';
            showFeedback(`Te has reconectado como anfitrión a la partida ${myGameCode}.`);
        } else {
            hostControls.style.display = 'none';
            hostAudioContainer.style.display = 'none';
            playerAudioContainer.style.display = 'block';
            answerInput.style.display = 'block';
            submitBtn.style.display = 'block';
            answerInput.disabled = false;
            submitBtn.disabled = false;
            showFeedback(`Te has reconectado a la partida ${myGameCode}.`);
        }
    } else { // Si la partida aún está en el lobby
        showScreen(gameLobby);
        gameCodeDisplay.textContent = `Código de la partida: ${myGameCode}`;
        
        if (isHost) {
            hostLobbyControls.style.display = 'block';
            playerLobbyMessage.style.display = 'none';
            startBtn.style.display = 'block';
            roundControlButtons.style.display = 'none';
            showFeedback(`Te has reconectado como anfitrión a la partida ${myGameCode}.`);
        } else {
            hostLobbyControls.style.display = 'none';
            playerLobbyMessage.style.display = 'block';
            showFeedback(`Te has reconectado a la sala de espera de la partida ${myGameCode}.`);
        }
    }

    updatePlayersList(data.players);
});

socket.on('player_joined', (players) => {
    if (!isHost) {
        showScreen(gameLobby);
        hostLobbyControls.style.display = 'none';
        playerLobbyMessage.style.display = 'block';
    }
    updatePlayersList(players);
});

// Nuevo evento: solo actualizar lista de jugadores sin cambiar pantallas
socket.on('players_updated', (players) => {
    updatePlayersList(players);
});

socket.on('join_failed', (message) => {
    if (joinStatus) {
        joinStatus.textContent = message;
    }
});

socket.on('game_started', () => {
    showScreen(gameScreen);
    if(isHost) {
        hostControls.style.display = 'flex';
        hostAudioContainer.style.display = 'block';
        playerAudioContainer.style.display = 'none';
        answerInput.style.display = 'none';
        submitBtn.style.display = 'none';
    } else {
        hostControls.style.display = 'none';
        hostAudioContainer.style.display = 'none';
        playerAudioContainer.style.display = 'block';
        answerInput.style.display = 'block';
        submitBtn.style.display = 'block';
        answerInput.disabled = false;
        submitBtn.disabled = false;
    }
});

socket.on('play_audio', (data) => {
    // Este evento solo lo recibe el anfitrión
    if (!isHost) return;
    
    const audioFilePath = `/audio/${data.file}`;
    const duration = data.duration === 'full' ? 9999 : data.duration;

    hostAudioPlayer.src = audioFilePath;
    hostAudioPlayer.play();
    
    if (data.duration !== 'full') {
        setTimeout(() => {
            hostAudioPlayer.pause();
        }, duration * 1000);
    }
    
    hostTimerBar.style.transition = 'width 0s';
    hostTimerBar.style.width = '100%';
    setTimeout(() => {
        hostTimerBar.style.transition = `width ${duration}s linear`;
        hostTimerBar.style.width = '0%';
    }, 100);
});

// Nuevo evento para jugadores: mostrar que se está reproduciendo audio
socket.on('audio_playing', (data) => {
    // Este evento solo lo reciben los jugadores (no el anfitrión)
    if (isHost) return;
    
    const duration = data.duration === 'full' ? 9999 : data.duration;
    
    // Mostrar ecualizador
    equalizer.style.display = 'flex';
    
    // Animar barra de tiempo
    if (timerBar) {
        timerBar.style.transition = 'width 0s';
        timerBar.style.width = '100%';
        setTimeout(() => {
            timerBar.style.transition = `width ${duration}s linear`;
            timerBar.style.width = '0%';
        }, 100);
    }
    
    // Ocultar ecualizador después de la duración
    setTimeout(() => {
        equalizer.style.display = 'none';
    }, duration * 1000);
});

socket.on('correct_answer', (data) => {
    if (!isHost) {
        showFeedback(`¡${data.player} adivinó la canción!`);
    }
    updatePlayersList(data.players);
});

socket.on('round_ended', (data) => {
    if (isHost) {
        showFeedback(`Nadie adivinó. La canción era: "${data.answer}"`);
        startBtn.style.display = 'none';
        roundControlButtons.style.display = 'flex';
    } else {
        showFeedback(`La ronda ha terminado. La canción era: "${data.answer}"`);
        equalizer.style.display = 'none';
    }
    
    showScreen(gameLobby);
    hostLobbyControls.style.display = isHost ? 'block' : 'none';
    playerLobbyMessage.style.display = isHost ? 'none' : 'block';
    updatePlayersList(data.players);
});

socket.on('round_summary', (data) => {
    if (isHost) {
        showFeedback(`¡Alguien adivinó! La canción era: "${data.answer}"`);
        startBtn.style.display = 'none';
        roundControlButtons.style.display = 'flex';
    } else {
        equalizer.style.display = 'none';
    }
    
    showScreen(gameLobby);
    hostLobbyControls.style.display = isHost ? 'block' : 'none';
    playerLobbyMessage.style.display = isHost ? 'none' : 'block';
    updatePlayersList(data.players);
});

socket.on('player_guessed_correctly', (data) => {
    if (!isHost) {
        showFeedback(`¡Acertaste! La canción era: "${data.answer}" y ganaste ${data.points} puntos.`);
        answerInput.disabled = true;
        submitBtn.disabled = true;
    }
});

socket.on('wrong_answer', () => {
    showFeedback('Respuesta incorrecta. Intenta de nuevo.');
});

socket.on('already_answered', () => {
    showFeedback('Ya has adivinado la canción en esta ronda.');
});

socket.on('game_ended', (data) => {
    showFeedback('¡La partida ha terminado!');
    const sortedPlayers = data.players.sort((a, b) => b.score - a.score);
    finalScoresList.innerHTML = '';
    sortedPlayers.slice(0, 3).forEach((player, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${index + 1}. ${player.name}</span> <span>${player.score} puntos</span>`;
        finalScoresList.appendChild(li);
    });

    finalScoresModal.style.display = 'flex';
});

socket.on('game_ended_by_host', () => {
    if (!isHost) {
        showFeedback('El anfitrión ha terminado la partida o se ha desconectado. Saliendo en 3 segundos.');
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }
});

socket.on('player_left', (data) => {
    updatePlayersList(data.players);
});

window.addEventListener('DOMContentLoaded', () => {
    showScreen(passwordScreen);
    initializeHeartbeat();
    initializeVisibilityHandler();
});

// Sistema de heartbeat para mantener la conexión activa
function initializeHeartbeat() {
    // Enviar ping cada 15 segundos (más espaciado)
    pingInterval = setInterval(() => {
        socket.emit('ping');
        
        // Verificar si han pasado más de 60 segundos sin pong
        if (Date.now() - lastPongTime > 60000) {
            console.log('Conexión perdida, intentando reconectar...');
            handleReconnection();
        }
    }, 15000); // Cambiar de 5s a 15s
}

// Responder a pongs del servidor
socket.on('pong', () => {
    lastPongTime = Date.now();
    reconnectionAttempts = 0;
});

// Manejar cambios de visibilidad de la página
function initializeVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('Página oculta, manteniendo conexión...');
        } else {
            console.log('Página visible, verificando conexión...');
            // Enviar un ping inmediatamente al volver
            socket.emit('ping');
            
            // Si hay un juego activo, verificar el estado
            if (myGameCode) {
                if (isHost) {
                    console.log(`Anfitrión volviendo, reconectando a partida ${myGameCode}`);
                    socket.emit('rejoin_as_host', { code: myGameCode });
                } else if (playerName) {
                    console.log(`Jugador volviendo, reconectando a partida ${myGameCode}`);
                    socket.emit('join_game', { name: playerName, code: myGameCode });
                }
            }
        }
    });
}

// Función para manejar reconexión
function handleReconnection() {
    if (reconnectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
        showFeedback('No se pudo reconectar. Por favor, recarga la página.');
        return;
    }
    
    reconnectionAttempts++;
    
    if (myGameCode) {
        if (isHost) {
            socket.emit('rejoin_as_host', { code: myGameCode });
        } else if (playerName) {
            socket.emit('join_game', { name: playerName, code: myGameCode });
        }
    }
}