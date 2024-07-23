import { init, animate } from "./game.js";
let loser = '';

const socket = io();
let backmusic = document.getElementById('backmusic');
let playerName = '';


// Function to get the value of a query parameter by name
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Function to remove a query parameter from the URL
function removeQueryParam(name) {
    const url = new URL(window.location);
    url.searchParams.delete(name);
    window.history.replaceState({}, document.title, url.toString());
}

// Extract playerName from the URL
playerName = getQueryParam('id');
if (playerName) {
    socket.emit('register', playerName);
    // Remove the id parameter from the URL
    removeQueryParam('id');
}

socket.on('registered', data => {
    console.log('Registered as', data.name);
    window.myname = data.name;
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('matchmaking').style.display = 'block';
});

document.getElementById('joinMatchmakingBtn').addEventListener('click', () => {
    backmusic.play();
    document.getElementById('matchmaking').style.display = 'none';
    document.body.style.cursor = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    socket.emit('joinMatchmaking', playerName);
});

socket.on('matchFound', data => {
    const gameId = data.gameId;
    if (window.myname == data.playerName) {
        window.enemyName = data.opponentName;
    } else {
        window.enemyName = data.playerName;
    }

    console.log(`my name is ${window.myname}`);
    console.log(`Match found! Game ID: ${gameId}, Opponent Name: ${window.enemyName}, playername: ${playerName}`);
    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('FPSCanvas').style.display = 'block';
    document.getElementById('aiming').style.display = 'block';
    document.getElementById('hp-bar-container').style.display = 'flex';

    init(window.enemyName, window.myname); 
    animate();
});

socket.on('gameOver', data => {
    console.log(`loser is ${data.loser}`);
    loser = data.loser;
    const message = data.loser === window.myname ? 'You Lose!' : 'You Win!';
    console.log("Judged");
    socket.emit('change_port_to_8080');
});

socket.on('redirect', data => {
    console.log("Redirecting to port 8080");
    const host = window.location.hostname;
    const newPort = 8080;
    window.location.href = `http://${host}:${newPort}/xammpFPS/?result=${encodeURIComponent(loser)}&playerid=${playerName}`;
});
