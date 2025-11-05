// ! VARIABLES DECLARATIONS
const winningMessageElement = document.getElementById('winningMessage');
const winningMessageTextElement = document.querySelector('[data-winning-message-text]');
const board = document.getElementById('board');
const roomName = document.getElementById('gameRoom');
const playerName = document.getElementById('playerName');
const cellElements = document.querySelectorAll('[data-cell]');
const restartButton = document.getElementById('restartButton');
const joinButton = document.getElementById('joinRoom');

// Lobby UI elements
const lobbyContainer = document.getElementById('lobbyContainer');
const gameBoardArea = document.getElementById('gameBoardArea');
const player1NameElement = document.getElementById('player1Name');
const player2NameElement = document.getElementById('player2Name');
const gameStatusIndicator = document.getElementById('gameStatusIndicator');
const lobbyStartButton = document.getElementById('lobbyStartButton');

// Game board UI elements
const gamePlayer1NameElement = document.getElementById('gamePlayer1Name');
const gamePlayer2NameElement = document.getElementById('gamePlayer2Name');
const currentTurnIndicator = document.getElementById('currentTurnIndicator');
const currentTurnText = document.getElementById('currentTurnText');

const X_CLASS = 'x';
const CIRCLE_CLASS = 'circle';
const WINNING_COMBINATIONS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

// Lobby state
let currentPlayerNames = [];
let currentPlayerCount = 0;
let hasClickedStart = false; // Track if this player has clicked start

document.addEventListener("DOMContentLoaded", function(event) { 

var clientId = '';
var activeId = '';

// ! SERVER-CLIENT COMMUNICATION
// SOCKET.IO
var socket = null

joinButton.addEventListener('click', async function(event) {
  event.preventDefault();
  
  const connectionEstablished = await connectUser();
  let result;
  if (connectionEstablished) {
    if (playerName.value == '' || roomName.value == '') {
      setTimeout(() => {
        alert('Please fill out Room Name and Player Name fields!');
      }, "700")  
      return;
    } else {
      result = await roomAvalability(); 
    };
  };

  
  if (result == 'tooCrowdy'){
    // disconnect the socket
    socket.disconnect();
    alert('too many players in this Gaming Room!');
    return;
  } else {
    socket.emit('readyToStart');

    userConnectedHandlers();
    document.getElementById('greetingsBackground').classList.remove('show');
    // Show lobby UI and set initial player name
    lobbyContainer.classList.remove('hidden');
    // Set initial player 1 name from input
    player1NameElement.textContent = playerName.value || 'X';
    // Initialize to state 1 (waiting for opponent)
    setLobbyState1();
  }; 
});

function connectUser() {
  return new Promise(function (resolve, reject) {
    socket = io()
    socket.on('connection-established', result => {
      socket.off('connection-established');
      resolve(result);
    });
    setTimeout(reject, "700");
  });
};


function roomAvalability() {
  return new Promise(function (resolve, reject) {
    socket.emit('check-game-room', { username: playerName.value, room : roomName.value});
    
    socket.on('tooManyPlayers', result => {
      socket.off('tooManyPlayers');
      resolve(result);
    });
    setTimeout(reject, "700");
  });
};


// ! user pushed the StartGame button
// todo: handler for .close 
// document.querySelector('.close').addEventListener('click', function() {
//   document.getElementById('greetingsBackground').classList.remove('show')
// })

// emit(1): Event handler for new connections is established.
function userConnectedHandlers() {
// socket.on('user-connected', function() {
  console.log('Connection established!');

  // hadler (1.2): Event handler for server sent data // get client id
  socket.on('clientId', setClientId)
  
  // hadler (1.2'): Event handler for server sent data // get connected-Players
  socket.on('connected-Players', getConnectedPlayers);

  // hadler (1.3): Event handler for server sent data
  socket.on('status', function(msg) {
    console.log (`Last joined: ${msg['clientId']} || Clients Nbr.:${msg['clientsNbs']}`);
    updateLobbyState(msg['clientsNbs']);
  });

    // hadler (1.3): Event handler for server sent data
  socket.on('disconnect-status', function(msg) {
    console.log (`Player: ${msg['clientId']} left the room. || Clients Nbr.:${msg['clientsNbs']}`);
    updateLobbyState(msg['clientsNbs']);
  });


  // event(2.1): get the active player id and set up html for game
  socket.on('start', (data) => {
    activeId = data['activePlayer'];
    let readyToStart = data['started'];
    console.log('Start event received - Active user: ', activeId, 'Started:', readyToStart);
    console.log('Full data received:', JSON.stringify(data));
    
    // Server only sends 'start' event when both players are ready (started = True)
    // So if we receive this event, we should always transition to game board
    console.log('Transitioning to game board...');
    hideLobbyAndShowGame();
    
    // Small delay to ensure UI transition completes before initializing game
    setTimeout(() => {
      startGame();
      // Update turn indicator after game starts
      updateCurrentTurnIndicator();
    }, 100);
  });

  // event(2.2): Server Event: waiting for second player start
  socket.on('waiting second player start', (data) => {
    console.log('Waiting for second player\'s Start...');
    // Only disable button if THIS player already clicked
    // If this player hasn't clicked yet, keep button enabled (State 2)
    if (hasClickedStart) {
      setLobbyState3(); // Game initializing state - this player already clicked
    } else {
      // This player hasn't clicked yet, keep button enabled
      setLobbyState2(); // Keep ready to start
      console.log('Other player is waiting, but you can still click Start Game');
    }
  });


  // handler(3) & event(3): update field with turn information received from server
  // emited events (if Win OR Draw): game_status(msg)
  socket.on('turn', (turn) => {
    // let {recentPlayer, position, next} = turn;
    let currentMark = (turn['recentPlayer'] == 0) ? CIRCLE_CLASS : X_CLASS;
    console.log(`Last Position by ${turn['recentPlayer']}, is ${turn['lastPos']}`);
    placeMark(cellElements[turn['lastPos']], currentMark);

    if (checkWin(currentMark)) {
      endGame(false, currentMark);
      socket.emit('game_status', {'status': 'Win' , 'player':turn['recentPlayer']});
    } else if (isDraw()) {
      endGame(true);
      socket.emit('game_status', {'status': 'Draw' , 'player':turn['recentPlayer']});

    }
    activeId = turn['next'];
    // Update current turn indicator after turn change
    updateCurrentTurnIndicator();
  });


//});  // END of event.on('user-connected')

}; // END of function userConnected

// ! LOBBY STATE MANAGEMENT

// Lobby State 1: Waiting for Opponent (1 player)
function setLobbyState1() {
  // Player 1 name is visible (already set)
  player2NameElement.textContent = 'Waiting...';
  player2NameElement.classList.add('waiting');
  gameStatusIndicator.textContent = 'Waiting for opponent to join...';
  gameStatusIndicator.classList.remove('hidden');
  lobbyStartButton.disabled = true;
  lobbyStartButton.textContent = 'Start Game';
  lobbyStartButton.classList.remove('starting');
}

// Lobby State 2: Lobby Full / Ready to Start (2 players)
function setLobbyState2() {
  // Both player names visible
  player2NameElement.classList.remove('waiting');
  gameStatusIndicator.classList.add('hidden');
  lobbyStartButton.disabled = false;
  lobbyStartButton.textContent = 'Start Game';
  lobbyStartButton.classList.remove('starting');
  // Reset hasClickedStart when going back to state 2 (if needed)
  // hasClickedStart = false; // Don't reset here, only reset on restart
}

// Lobby State 3: Game Initializing (button clicked)
function setLobbyState3() {
  lobbyStartButton.textContent = 'Ready';
  lobbyStartButton.disabled = true;
  lobbyStartButton.classList.add('starting');
}

// Update lobby state based on player count
function updateLobbyState(playerCount) {
  currentPlayerCount = playerCount;
  if (playerCount === 1) {
    setLobbyState1();
  } else if (playerCount === 2) {
    setLobbyState2();
  }
}

// Update player names in lobby
function updatePlayerNames(playerNames) {
  currentPlayerNames = playerNames;
  if (playerNames.length >= 1) {
    player1NameElement.textContent = playerNames[0] || 'X';
  }
  if (playerNames.length >= 2) {
    player2NameElement.textContent = playerNames[1] || 'O';
    player2NameElement.classList.remove('waiting');
  } else {
    // Only one player, show waiting state
    player2NameElement.textContent = 'Waiting...';
    player2NameElement.classList.add('waiting');
  }
}

// Hide lobby and show game board
function hideLobbyAndShowGame() {
  console.log('hideLobbyAndShowGame called');
  console.log('Lobby container exists:', !!lobbyContainer);
  console.log('Game board area exists:', !!gameBoardArea);
  
  if (lobbyContainer) {
    lobbyContainer.classList.add('hidden');
    console.log('Lobby hidden - classList:', lobbyContainer.classList.toString());
  }
  
  if (gameBoardArea) {
    gameBoardArea.classList.remove('hidden');
    console.log('Game board shown - classList:', gameBoardArea.classList.toString());
  }
}

// Show lobby and hide game board (for restart)
function showLobbyAndHideGame() {
  lobbyContainer.classList.remove('hidden');
  gameBoardArea.classList.add('hidden');
  // Reset lobby to state 1 and reset click tracking
  hasClickedStart = false;
  setLobbyState1();
}

// Lobby Start Button Event Listener
lobbyStartButton.addEventListener('click', function() {
  if (!lobbyStartButton.disabled && currentPlayerCount === 2) {
    hasClickedStart = true; // Mark that this player has clicked
    setLobbyState3(); // Immediately change button state
    socket.emit('startGame', {'clientId':clientId});
  }
});

// event(4): send restart intention to server
// emited events: restartGame(msg) intention
restartButton.addEventListener('click', function() {
  // Show lobby again and reset game
  showLobbyAndHideGame();
  socket.emit('startGame', {'clientId':clientId});
});

// ! GAME LOGIC

function startGame() {
  cellElements.forEach(cell => {
    cell.classList.remove(X_CLASS);
    cell.classList.remove(CIRCLE_CLASS);
    
    cell.removeEventListener('click', handleClick);
    cell.addEventListener('click', handleClick);
  })
  let playerMark = (clientId == 0) ?  true : false;
  setBoardHoverClass(playerMark);
  winningMessageElement.classList.remove('show');
  
  // Update player names on game board
  updateGameBoardPlayerNames();
  // Update current turn indicator
  updateCurrentTurnIndicator();
}

function handleClick(e) {
  let cell = e.target;
  let currentMark = (clientId == 0) ? CIRCLE_CLASS : X_CLASS;
  if (activeId == clientId){
    placeMark(cell, currentMark);
    turn(e);
  }
  if (checkWin(currentMark)) {
    endGame(false, currentMark);
  } else if (isDraw()) {
    endGame(true);
  }  
  console.log('clicked index: ', getIdx(e));
  
}

// HELPERS

function placeMark(cell, currentClass) {
  cell.classList.add(currentClass)};

// event(3): startGame() -> at player click -> <turn> event
// send turn event to server // emited events: turn(msg)
function turn(e) {
  let pos = getIdx(e);
  console.log('send');
  socket.emit("turn", {"pos": pos, "player": activeId});
}

function setBoardHoverClass(clientIdClass) {
  board.classList.remove(X_CLASS);
  board.classList.remove(CIRCLE_CLASS);
  if (clientIdClass) {
    board.classList.add(CIRCLE_CLASS);
  } else {
    board.classList.add(X_CLASS);
  }
};

function getIdx(e){
  let clickedtargetParent = e.target.parentElement;
  let idx = Array.prototype.indexOf.call(clickedtargetParent.children, e.target);
  return idx;
}


function endGame(draw, currentMark) {
  if (draw) {
    winningMessageTextElement.innerText = 'Draw!';
  } else {
    winningMessageTextElement.innerText = `${(currentMark == 'circle') ? "O's" : "X's"} Wins!`;
  }
  winningMessageElement.classList.add('show');
}

function isDraw() {
  return [...cellElements].every(cell => {
    return cell.classList.contains(X_CLASS) || cell.classList.contains(CIRCLE_CLASS);
  });
};

function checkWin(currentClass) {
  return WINNING_COMBINATIONS.some(combination => {
    return combination.every(index => {
      return cellElements[index].classList.contains(currentClass);
    });
  });
};



function setClientId(id, room) {
  // hadler (1.2): Event handler for server sent data // get client id
  clientId = id;
  let mark = (clientId == 0) ? CIRCLE_CLASS : X_CLASS;
  console.log('Received playerId: ', id);
  
  // Note: Player names are updated by getConnectedPlayers() handler
  // which receives the 'connected-Players' event. This ensures names
  // are set after the server has the complete list of connected players.
};


function getConnectedPlayers(players) {
    // hadler (1.2'): Event handler for server sent data // get connected-Players
    let connectedPlayers = [];
    for (var i = 0; i < players[0].length; i++) {
      connectedPlayers.push(players[0][i]);
    };
    console.log('Connected players: ', connectedPlayers);
    
    // Update lobby with player names
    updatePlayerNames(connectedPlayers);
    updateLobbyState(connectedPlayers.length);
};

// Update player names on game board
function updateGameBoardPlayerNames() {
  if (currentPlayerNames.length >= 1 && gamePlayer1NameElement) {
    gamePlayer1NameElement.textContent = currentPlayerNames[0] || 'X';
  }
  if (currentPlayerNames.length >= 2 && gamePlayer2NameElement) {
    gamePlayer2NameElement.textContent = currentPlayerNames[1] || 'O';
  } else if (gamePlayer2NameElement) {
    gamePlayer2NameElement.textContent = 'O';
  }
}

// Update current turn indicator
function updateCurrentTurnIndicator() {
  if (!currentTurnText) return;
  
  let currentPlayerName = '';
  if (activeId === 0 && currentPlayerNames.length > 0) {
    currentPlayerName = currentPlayerNames[0] || 'Player 1';
  } else if (activeId === 1 && currentPlayerNames.length > 1) {
    currentPlayerName = currentPlayerNames[1] || 'Player 2';
  } else {
    currentPlayerName = `Player ${activeId + 1}`;
  }
  
  // Check if it's the current player's turn
  if (activeId == clientId) {
    currentTurnText.textContent = `${currentPlayerName}'s Turn (You)`;
    currentTurnIndicator.classList.add('your-turn');
  } else {
    currentTurnText.textContent = `${currentPlayerName}'s Turn`;
    currentTurnIndicator.classList.remove('your-turn');
  }
}

});