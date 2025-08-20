// server.js

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");
const songs = require('./songs.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let game = {
    state: 'waiting',
    code: null,
    players: {},
    currentSong: null,
    correctAnswer: '',
    correctTitle: '',
    correctArtist: '',
    answeredCorrectly: new Set(),
    mode: 'fragments',
    unplayedSongs: [],
    playedSongs: [],
    lastDuration: 0
};

app.use(express.static(path.join(__dirname, 'public')));
app.use('/audio', express.static(path.join(__dirname, 'audio')));

io.on('connection', (socket) => {
    console.log(`Jugador conectado: ${socket.id}`);

    socket.on('create_game', (data) => {
        game.code = Math.random().toString(36).substring(2, 6).toUpperCase();
        game.state = 'waiting';
        game.players = {};
        game.mode = data.mode;
        game.unplayedSongs = songs.slice(); 
        game.playedSongs = [];
        socket.join(game.code);
        console.log(`Partida creada con código: ${game.code} en modo ${game.mode}`);
        io.to(socket.id).emit('game_created', { code: game.code });
    });

    socket.on('join_game', ({ name, code }) => {
        if (code === game.code && game.state === 'waiting') {
            game.players[socket.id] = { name: name, score: 0 };
            socket.join(game.code);
            console.log(`Jugador ${name} se unió a la partida ${code}`);
            io.to(game.code).emit('player_joined', game.players);
        } else {
            io.to(socket.id).emit('join_failed', 'Código de partida incorrecto o partida ya iniciada.');
        }
    });

    socket.on('start_game', () => {
        if (game.state === 'waiting' && Object.keys(game.players).length > 0) {
            game.state = 'playing';
            selectNewSong();
            io.to(game.code).emit('game_started');
        }
    });
    
    socket.on('start_next_round', () => {
        if (game.state === 'playing') {
            selectNewSong();
            io.to(game.code).emit('game_started');
        }
    });

    socket.on('play_fragment', (data) => {
        if (game.state === 'playing' && game.currentSong) {
            game.lastDuration = data.duration;
            const duration = data.duration === 'full' ? 9999 : data.duration;
            io.to(game.code).emit('play_audio', {
                file: game.currentSong.file,
                duration: duration,
                mode: game.mode,
            });
        }
    });

    socket.on('end_round', () => {
        const roundData = { answer: game.correctAnswer, players: game.players };
        if (game.answeredCorrectly.size > 0) {
            io.to(game.code).emit('round_summary', roundData);
        } else {
            io.to(game.code).emit('round_ended', roundData);
        }
    });
    
    socket.on('end_game', () => {
        io.to(game.code).emit('game_ended', { players: game.players });
        game = {
            state: 'waiting',
            code: null,
            players: {},
            currentSong: null,
            correctAnswer: '',
            correctTitle: '',
            correctArtist: '',
            answeredCorrectly: new Set(),
            mode: 'fragments',
            unplayedSongs: [],
            playedSongs: [],
            lastDuration: 0
        };
    });

    socket.on('submit_answer', (answer) => {
        const player = game.players[socket.id];
        
        if (game.answeredCorrectly.has(socket.id)) {
            io.to(socket.id).emit('already_answered'); 
            return;
        }

        const pointsToAdd = calculatePoints(answer);

        if (pointsToAdd > 0) {
            player.score += pointsToAdd;
            game.answeredCorrectly.add(socket.id);
            
            io.to(socket.id).emit('player_guessed_correctly', {
                answer: game.correctAnswer,
                points: pointsToAdd
            });

            socket.broadcast.to(game.code).emit('correct_answer', {
                player: player.name,
                answer: game.correctAnswer,
                score: player.score,
                players: game.players
            });

        } else {
            io.to(socket.id).emit('wrong_answer');
        }
    });

    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        if (game.players[socket.id]) {
            delete game.players[socket.id];
            io.to(game.code).emit('player_joined', game.players);
        }
    });
});

function selectNewSong() {
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

function calculatePoints(playerAnswer) {
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

    if (titleIsCorrect) {
        return basePoints;
    } else if (artistIsCorrect) {
        return Math.round(basePoints / 2);
    } else {
        return 0;
    }
}

server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});