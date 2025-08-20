// public/script.js

const socket = io();

let isHost = false;

const welcomeScreen = document.getElementById('welcome-screen');
const hostScreen = document.getElementById('host-screen');
const playerScreen = document.getElementById('player-screen');
const gameLobby = document.getElementById('game-lobby');
const gameScreen = document.getElementById('game-screen');

const feedbackMessage = document.getElementById('feedback-message');
const finalScoresModal = document.getElementById('final-scores-modal');
const finalScoresList = document.getElementById('final-scores-list');
const closeFinalScoresBtn = document.querySelector('.close-button');
const endGameReturnBtn = document.getElementById('end-game-return-btn');

const hostBtn = document.getElementById('host-btn');
const playerBtn = document.getElementById('player-btn');

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

function showScreen(screen) {
    welcomeScreen.style.display = 'none';
    hostScreen.style.display = 'none';
    playerScreen.style.display = 'none';
    gameLobby.style.display = 'none';
    gameScreen.style.display = 'none';
    screen.style.display = 'block';
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

if (hostBtn) {
    hostBtn.addEventListener('click', () => {
        isHost = true;
        showScreen(hostScreen);
    });
}
if (playerBtn) {
    playerBtn.addEventListener('click', () => {
        isHost = false;
        showScreen(playerScreen);
    });
}

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


socket.on('game_created', (data) => {
    isHost = true;
    showScreen(gameLobby);
    gameCodeDisplay.textContent = `Código de la partida: ${data.code}`;
    hostLobbyControls.style.display = 'block';
    playerLobbyMessage.style.display = 'none';
    startBtn.style.display = 'block';
    roundControlButtons.style.display = 'none';
});

socket.on('player_joined', (players) => {
    if (!isHost) {
        showScreen(gameLobby);
        hostLobbyControls.style.display = 'none';
        playerLobbyMessage.style.display = 'block';
    }
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
    const audioFilePath = `/audio/${data.file}`;
    const duration = data.duration === 'full' ? 9999 : data.duration;
    
    if (isHost) {
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
    } else {
        // Para jugadores, solo actualiza la barra de progreso sin reproducir sonido
        if (timerBar) {
            timerBar.style.transition = 'width 0s';
            timerBar.style.width = '100%';
            setTimeout(() => {
                timerBar.style.transition = `width ${duration}s linear`;
                timerBar.style.width = '0%';
            }, 100);
        }
    }
});

socket.on('correct_answer', (data) => {
    if (!isHost) {
        showFeedback(`¡Alguien adivinó la canción!`);
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
    const sortedPlayers = Object.values(data.players).sort((a, b) => b.score - a.score);
    finalScoresList.innerHTML = '';
    sortedPlayers.slice(0, 3).forEach((player, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${index + 1}. ${player.name}</span> <span>${player.score} puntos</span>`;
        finalScoresList.appendChild(li);
    });

    finalScoresModal.style.display = 'flex';
    socket.disconnect();
});