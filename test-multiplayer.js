// test-multiplayer.js
// Script para probar estabilidad con múltiples jugadores

const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const NUM_PLAYERS = 10;
const DISCONNECT_PROBABILITY = 0.15; // 15% probabilidad de desconexión cada 10s
const RECONNECT_DELAY = 3000; // 3 segundos para reconectar

class TestPlayer {
    constructor(id) {
        this.id = id;
        this.name = `Jugador${id}`;
        this.socket = null;
        this.connected = false;
        this.gameCode = null;
        this.isHost = false;
        this.score = 0;
        this.reconnecting = false;
    }

    connect() {
        console.log(`[${new Date().toLocaleTimeString()}] ${this.name}: Conectando...`);
        
        this.socket = io(SERVER_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            this.connected = true;
            console.log(`[${new Date().toLocaleTimeString()}] ${this.name}: ✓ Conectado (${this.socket.id})`);
            
            if (this.reconnecting && this.gameCode) {
                setTimeout(() => {
                    console.log(`[${new Date().toLocaleTimeString()}] ${this.name}: Intentando reconectar a [${this.gameCode}]`);
                    this.socket.emit('join_game', { name: this.name, code: this.gameCode });
                    this.reconnecting = false;
                }, 500);
            }
        });

        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.log(`[${new Date().toLocaleTimeString()}] ${this.name}: ✗ Desconectado (${reason})`);
        });

        this.socket.on('rejoined_game', (data) => {
            console.log(`[${new Date().toLocaleTimeString()}] ${this.name}: ✓ Reconectado exitosamente! Puntos: ${this.score}`);
        });

        this.socket.on('join_failed', (message) => {
            console.log(`[${new Date().toLocaleTimeString()}] ${this.name}: ✗ Fallo al unirse: ${message}`);
        });

        this.socket.on('player_joined', (players) => {
            const myPlayer = players.find(p => p.name === this.name);
            if (myPlayer) {
                this.score = myPlayer.score;
            }
        });

        this.socket.on('players_updated', (players) => {
            const myPlayer = players.find(p => p.name === this.name);
            if (myPlayer) {
                this.score = myPlayer.score;
            }
        });

        this.socket.on('pong', () => {
            // Responder a heartbeat
        });

        // Iniciar heartbeat
        setInterval(() => {
            if (this.connected) {
                this.socket.emit('ping');
            }
        }, 15000);
    }

    joinGame(code) {
        if (!this.connected) {
            console.log(`[${new Date().toLocaleTimeString()}] ${this.name}: No puede unirse, no está conectado`);
            return;
        }

        this.gameCode = code;
        console.log(`[${new Date().toLocaleTimeString()}] ${this.name}: Uniéndose a [${code}]`);
        this.socket.emit('join_game', { name: this.name, code: code });
    }

    simulateDisconnect() {
        if (this.connected && !this.reconnecting) {
            console.log(`[${new Date().toLocaleTimeString()}] ${this.name}: Simulando desconexión...`);
            this.reconnecting = true;
            this.socket.disconnect();
            
            // Reconectar después de un delay
            setTimeout(() => {
                this.connect();
            }, RECONNECT_DELAY);
        }
    }
}

async function runTest() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST DE ESTABILIDAD MULTIJUGADOR');
    console.log('='.repeat(60));
    console.log(`Jugadores: ${NUM_PLAYERS}`);
    console.log(`Probabilidad de desconexión: ${DISCONNECT_PROBABILITY * 100}%`);
    console.log(`Delay de reconexión: ${RECONNECT_DELAY}ms`);
    console.log('='.repeat(60) + '\n');

    // Crear jugadores
    const players = [];
    for (let i = 1; i <= NUM_PLAYERS; i++) {
        players.push(new TestPlayer(i));
    }

    // Conectar todos
    console.log('Fase 1: Conectando todos los jugadores...\n');
    players.forEach(player => player.connect());

    // Esperar a que se conecten
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Simular que todos se unen al mismo juego
    console.log('\nFase 2: Uniéndose a la partida [1234]...\n');
    const gameCode = '1234';
    
    for (let i = 0; i < players.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300)); // Delay entre joins
        players[i].joinGame(gameCode);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simular desconexiones aleatorias
    console.log('\nFase 3: Simulando desconexiones aleatorias...\n');
    console.log('Presiona Ctrl+C para detener el test\n');

    setInterval(() => {
        players.forEach(player => {
            if (Math.random() < DISCONNECT_PROBABILITY) {
                player.simulateDisconnect();
            }
        });
    }, 10000); // Cada 10 segundos

    // Mostrar estadísticas cada 30 segundos
    setInterval(() => {
        const connected = players.filter(p => p.connected).length;
        const disconnected = players.filter(p => !p.connected).length;
        const reconnecting = players.filter(p => p.reconnecting).length;
        
        console.log('\n' + '-'.repeat(60));
        console.log(`[${new Date().toLocaleTimeString()}] ESTADÍSTICAS:`);
        console.log(`  Conectados: ${connected}`);
        console.log(`  Desconectados: ${disconnected}`);
        console.log(`  Reconectando: ${reconnecting}`);
        console.log('-'.repeat(60) + '\n');
    }, 30000);
}

// Ejecutar test
runTest().catch(console.error);

// Manejar Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\n' + '='.repeat(60));
    console.log('Test finalizado por el usuario');
    console.log('='.repeat(60));
    process.exit(0);
});
