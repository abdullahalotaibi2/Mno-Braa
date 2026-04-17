// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAYx8XacJeWUUhuYPVdE0IKRSsNknGQp2I",
    authDomain: "mnobraa.firebaseapp.com",
    databaseURL: "https://mnobraa-default-rtdb.firebaseio.com",
    projectId: "mnobraa",
    storageBucket: "mnobraa.firebasestorage.app",
    messagingSenderId: "424471788993",
    appId: "1:424471788993:web:4dc21987d5c83563448340",
    measurementId: "G-WKK6MNK8NH"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Game State (Local Settings)
const gameState = {
    lang: 'ar',
    theme: 'dark',
    categoryId: 'house',
};

// Multiplayer State (Synced)
let isMultiplayer = false;
let myPlayerId = null;
let currentRoomCode = null;
let roomRef = null;
let isHost = false;
let roomData = null;
let targetOnlinePlayers = 4;

// Local Play State
let localPlayersCount = 4;
let currentPlayerIndex = 1;
let currentVoterIndex = 1;
let localOutPlayer = 0;
let localCurrentWord = null;
let localCurrentHint = null;
let localVotes = {};
let lastUsedWordPerCategory = {};

// DOM Elements
const screens = document.querySelectorAll('.screen');
const modal = document.getElementById('settings-modal');

// Settings
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings');
const langBtns = document.querySelectorAll('[data-lang]');
const themeBtns = document.querySelectorAll('[data-theme]');

// Screens
const homeScreen = document.getElementById('home-screen');
const setupScreen = document.getElementById('setup-screen');
const passScreen = document.getElementById('pass-screen');
const createRoomScreen = document.getElementById('create-room-screen');
const joinRoomScreen = document.getElementById('join-room-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const revealScreen = document.getElementById('reveal-screen');
const questioningScreen = document.getElementById('questioning-screen');
const votingScreen = document.getElementById('voting-screen');
const resultsScreen = document.getElementById('results-screen');

// Navigation buttons
const backBtns = document.querySelectorAll('.back-btn');
const goHomeBtns = document.querySelectorAll('.go-home-btn');

// Home screen buttons
const btnPlayLocal = document.getElementById('play-local-btn');
const btnCreateRoom = document.getElementById('create-room-btn');
const btnJoinRoom = document.getElementById('join-room-btn');

// Local Setup elements
const countDisplay = document.getElementById('players-count-display');
const decreaseBtn = document.getElementById('decrease-players');
const increaseBtn = document.getElementById('increase-players');
const localCategoryGrid = document.getElementById('local-category-selection');
const startLocalGameBtn = document.getElementById('start-local-game-btn');

// Create Room screen elements
const categoryGrid = document.getElementById('category-selection');
const createBtn = document.getElementById('create-btn');
const onlineCountDisplay = document.getElementById('online-players-count-display');
const onlineDecreaseBtn = document.getElementById('online-decrease-players');
const onlineIncreaseBtn = document.getElementById('online-increase-players');

// Join Room screen elements
const joinBtn = document.getElementById('join-btn');

// Lobby elements
const lobbyRoomCode = document.getElementById('lobby-room-code');
const lobbyPlayersList = document.getElementById('lobby-players-list');
const lobbyCount = document.getElementById('lobby-count');
const lobbyStartBtn = document.getElementById('lobby-start-btn');
const lobbyLeaveBtn = document.getElementById('lobby-leave-btn');

// Revealing elements (Multi & Local)
const passPlayerName = document.getElementById('pass-player-name');
const passRevealBtn = document.getElementById('pass-reveal-btn');
const statusTitle = document.getElementById('status-title');
const revealLabel = document.getElementById('reveal-label');
const revealWord = document.getElementById('reveal-word');
const revealBtn = document.getElementById('reveal-btn');
const toQuestioningBtn = document.getElementById('to-questioning-btn');
const nextPlayerBtn = document.getElementById('next-player-btn');

// Questioning elements
const qAsker = document.getElementById('q-asker');
const qReceiver = document.getElementById('q-receiver');
const nextQuestionBtn = document.getElementById('next-question-btn');
const toVotingBtn = document.getElementById('to-voting-btn');
const localNextQuestionBtn = document.getElementById('local-next-question-btn');
const localToVotingBtn = document.getElementById('local-to-voting-btn');

// Voting elements
const votingGrid = document.getElementById('voting-grid');
const endVotingBtn = document.getElementById('end-voting-btn');
const votingStatusText = document.getElementById('voting-status-text');
const localConfirmVoteBtn = document.getElementById('local-confirm-vote-btn');

// Results elements
const resultOutPlayer = document.getElementById('result-out-player');
const resultWord = document.getElementById('result-word');
const voteResultMsg = document.getElementById('vote-result-msg');
const playAgainBtn = document.getElementById('play-again-btn');
const localPlayAgainBtn = document.getElementById('local-play-again-btn');

let selectedVoteId = null;

// Initialization
function init() {
    loadSettings();
    applySettings();
    renderCategories();
    attachEventListeners();
}

// ---------------- Settings & UI updates ----------------
function loadSettings() {
    const savedLang = localStorage.getItem('lang');
    const savedTheme = localStorage.getItem('theme');
    if (savedLang) gameState.lang = savedLang;
    if (savedTheme) gameState.theme = savedTheme;
}

function saveSettings() {
    localStorage.setItem('lang', gameState.lang);
    localStorage.setItem('theme', gameState.theme);
}

function applySettings() {
    document.body.setAttribute('data-theme', gameState.theme);
    themeBtns.forEach(btn => {
        if (btn.dataset.theme === gameState.theme) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    document.documentElement.lang = gameState.lang;
    document.documentElement.dir = gameState.lang === 'ar' ? 'rtl' : 'ltr';
    langBtns.forEach(btn => {
        if (btn.dataset.lang === gameState.lang) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    updateTranslations();
    renderCategories();
    if(isMultiplayer && roomData && roomData.status === 'playing') updateRevealUI();
    if(isMultiplayer && roomData && roomData.status === 'results') transitionToResults();
}

function updateTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[gameState.lang] && translations[gameState.lang][key]) {
            el.innerHTML = translations[gameState.lang][key];
        }
    });

    if (!isMultiplayer && passScreen.classList.contains('active')) {
        const playerText = translations[gameState.lang].player;
        passPlayerName.textContent = `${playerText} ${currentPlayerIndex}`;
    }
}

// ---------------- Screen Navigation ----------------
function showScreen(screen) {
    screens.forEach(s => {
        s.classList.remove('active');
        s.classList.remove('full-color', 'in-state', 'out-state');
    });
    screen.classList.add('active');
}

function renderCategories() {
    categoryGrid.innerHTML = '';
    localCategoryGrid.innerHTML = '';
    const cats = Object.values(gameData.categories);
    
    cats.forEach(cat => {
        // Multi category
        const div = document.createElement('div');
        div.className = 'category-card';
        if (cat.id === gameState.categoryId) div.classList.add('selected');
        div.innerHTML = `<h3>${cat.name[gameState.lang]}</h3>`;
        div.onclick = () => { gameState.categoryId = cat.id; renderCategories(); };
        categoryGrid.appendChild(div);

        // Local category
        const localDiv = document.createElement('div');
        localDiv.className = 'category-card';
        if (cat.id === gameState.categoryId) localDiv.classList.add('selected');
        localDiv.innerHTML = `<h3>${cat.name[gameState.lang]}</h3>`;
        localDiv.onclick = () => { gameState.categoryId = cat.id; renderCategories(); };
        localCategoryGrid.appendChild(localDiv);
    });
}

// ==========================================
// 1. LOCAL PLAY FUNCS (PASS THE PHONE)
// ==========================================

function updatePlayersCount(change) {
    let newCount = localPlayersCount + change;
    if (newCount >= 3 && newCount <= 20) {
        localPlayersCount = newCount;
        countDisplay.textContent = newCount;
    }
}

function startLocalGame() {
    isMultiplayer = false;
    const cat = gameData.categories[gameState.categoryId];
    localCurrentHint = cat.hint;
    
    let words = cat.words;
    let availableWords = words.filter(w => w.en !== lastUsedWordPerCategory[cat.id]);
    if (availableWords.length === 0) availableWords = words;
    
    const randIndex = Math.floor(Math.random() * availableWords.length);
    localCurrentWord = availableWords[randIndex];
    lastUsedWordPerCategory[cat.id] = localCurrentWord.en;
    
    localOutPlayer = Math.floor(Math.random() * localPlayersCount) + 1;
    currentPlayerIndex = 1;
    
    showPassScreenLocal();
}

function showPassScreenLocal() {
    updateTranslations();
    showScreen(passScreen);
}

function showLocalReveal() {
    document.getElementById('pre-reveal-content').style.display = 'none';
    document.getElementById('post-reveal-content').style.display = 'flex';
    
    document.getElementById('local-reveal-actions').style.display = 'flex';
    document.getElementById('host-reveal-actions').style.display = 'none';

    revealScreen.classList.remove('in-state', 'out-state');
    if (currentPlayerIndex === localOutPlayer) {
        revealScreen.classList.add('out-state');
        statusTitle.textContent = translations[gameState.lang].you_are_out;
        revealLabel.textContent = translations[gameState.lang].hint_is;
        revealWord.textContent = localCurrentHint[gameState.lang];
    } else {
        revealScreen.classList.add('in-state');
        statusTitle.textContent = translations[gameState.lang].you_are_in;
        revealLabel.textContent = translations[gameState.lang].word_is;
        revealWord.textContent = localCurrentWord[gameState.lang];
    }
    showScreen(revealScreen);
}

function handleLocalNextPlayer() {
    if (currentPlayerIndex < localPlayersCount) {
        currentPlayerIndex++;
        showPassScreenLocal();
    } else {
        transitionToQuestioning();
    }
}

function nextQuestionPairLocal() {
    let asker = Math.floor(Math.random() * localPlayersCount) + 1;
    let receiver = Math.floor(Math.random() * localPlayersCount) + 1;
    while(asker === receiver) receiver = Math.floor(Math.random() * localPlayersCount) + 1;
    
    const playerText = translations[gameState.lang].player;
    qAsker.textContent = `${playerText} ${asker}`;
    qReceiver.textContent = `${playerText} ${receiver}`;
}

function showVoterTurnLocal() {
    selectedVoteId = null;
    localConfirmVoteBtn.disabled = true;
    
    votingGrid.innerHTML = '';
    const playerText = translations[gameState.lang].player;
    votingStatusText.textContent = gameState.lang === 'ar' ? 
        `${playerText} ${currentVoterIndex}، صوّت لمين برا السالفة` : 
        `${playerText} ${currentVoterIndex}, vote who is OUT`;
    
    for (let i = 1; i <= localPlayersCount; i++) {
        if (i === currentVoterIndex) continue;
        
        const div = document.createElement('div');
        div.className = 'vote-card';
        div.textContent = `${playerText} ${i}`;
        div.onclick = () => {
            selectedVoteId = i;
            document.querySelectorAll('.vote-card').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            localConfirmVoteBtn.disabled = false;
        };
        votingGrid.appendChild(div);
    }
}

function confirmLocalVote() {
    localVotes[currentVoterIndex] = selectedVoteId;
    if (currentVoterIndex < localPlayersCount) {
        currentVoterIndex++;
        showVoterTurnLocal();
    } else {
        transitionToResults();
    }
}


// ==========================================
// 2. MULTIPLAYER ONLINE FUNCS
// ==========================================

function createRoom() {
    isMultiplayer = true;
    const hostName = document.getElementById('host-name-input').value.trim() || 'Host';
    currentRoomCode = Math.floor(1000 + Math.random() * 9000).toString();
    myPlayerId = 'p_' + Math.random().toString(36).substr(2, 9);
    isHost = true;
    
    roomRef = db.ref('rooms/' + currentRoomCode);
    roomRef.onDisconnect().remove();
    
    roomRef.set({
        status: 'lobby',
        categoryId: gameState.categoryId,
        targetPlayers: targetOnlinePlayers,
        hostId: myPlayerId,
        players: {
            [myPlayerId]: { name: hostName, isHost: true }
        }
    }).then(() => {
        listenToRoom();
        showScreen(lobbyScreen);
    }).catch(err => {
        alert("Firebase error. Ensure Realtime DB is activated.");
        console.error(err);
    });
}

function joinRoom() {
    isMultiplayer = true;
    const code = document.getElementById('room-code-input').value.trim();
    const guestName = document.getElementById('guest-name-input').value.trim() || 'Guest';
    
    if (!code || code.length !== 4) {
        alert("Please enter a 4-digit code");
        return;
    }
    
    db.ref('rooms/' + code).once('value', snapshot => {
        if (snapshot.exists()) {
            currentRoomCode = code;
            myPlayerId = 'p_' + Math.random().toString(36).substr(2, 9);
            isHost = false;
            roomRef = db.ref('rooms/' + currentRoomCode);
            
            roomRef.child('players/' + myPlayerId).onDisconnect().remove();
            
            roomRef.child('players/' + myPlayerId).set({
                name: guestName,
                isHost: false
            }).then(() => {
                listenToRoom();
                showScreen(lobbyScreen);
            });
        } else {
            alert('Room not found');
        }
    });
}

function leaveRoom() {
    if (roomRef && myPlayerId) {
        if (isHost) {
            roomRef.remove();
        } else {
            roomRef.child('players/' + myPlayerId).remove();
        }
        roomRef.off();
    }
    myPlayerId = null;
    currentRoomCode = null;
    roomRef = null;
    isHost = false;
    roomData = null;
    showScreen(homeScreen);
}

function listenToRoom() {
    roomRef.on('value', snapshot => {
        if (!snapshot.exists()) {
            if(currentRoomCode) {
                alert("Room closed");
                leaveRoom();
            }
            return;
        }
        
        const data = snapshot.val();
        const oldStatus = roomData ? roomData.status : null;
        roomData = data;
        
        updateLobbyUI();
        
        if (data.status === 'playing' && oldStatus !== 'playing') {
            transitionToReveal();
        } else if (data.status === 'questioning' && oldStatus !== 'questioning') {
            transitionToQuestioning();
        } else if (data.status === 'voting' && oldStatus !== 'voting') {
            transitionToVoting();
        } else if (data.status === 'results' && oldStatus !== 'results') {
            transitionToResults();
        }
        
        if (data.status === 'questioning') updateQuestioningUI();
        if (data.status === 'voting') updateVotingRealtime();
    });
}

function updateLobbyUI() {
    if (!roomData || roomData.status !== 'lobby') return;
    
    lobbyRoomCode.textContent = currentRoomCode;
    lobbyPlayersList.innerHTML = '';
    
    const players = roomData.players || {};
    const pKeys = Object.keys(players);
    lobbyCount.textContent = pKeys.length;
    
    pKeys.forEach(pId => {
        const p = players[pId];
        const div = document.createElement('div');
        div.className = 'player-item';
        
        let hostBadge = p.isHost ? '<span class="host-badge">Host</span>' : '';
        div.innerHTML = `<span>${p.name} ${myPlayerId === pId ? '(You)' : ''}</span>${hostBadge}`;
        
        lobbyPlayersList.appendChild(div);
    });
    
    if (isHost) {
        const target = roomData.targetPlayers || 3;
        if (pKeys.length < target) {
            lobbyStartBtn.style.display = 'inline-flex';
            lobbyStartBtn.disabled = true;
            lobbyStartBtn.innerHTML = `<span>Waiting for players (${pKeys.length}/${target})</span>`;
        } else {
            lobbyStartBtn.style.display = 'inline-flex';
            lobbyStartBtn.disabled = false;
            lobbyStartBtn.innerHTML = `<span data-i18n="start_game">${translations[gameState.lang].start_game}</span>`;
        }
    } else {
        lobbyStartBtn.style.display = 'none';
    }
}

function startGameMultiplayer() {
    if (!isHost || !roomData) return;
    const pKeys = Object.keys(roomData.players);
    const target = roomData.targetPlayers || 3;
    if (pKeys.length < target) return; 
    
    const cat = gameData.categories[roomData.categoryId];
    const words = cat.words;
    const randIndex = Math.floor(Math.random() * words.length);
    const chosenWord = words[randIndex];
    
    const outPlayerIndex = Math.floor(Math.random() * pKeys.length);
    const outPlayerId = pKeys[outPlayerIndex];
    
    roomRef.update({
        status: 'playing',
        game: {
            word: chosenWord,
            hint: cat.hint,
            outPlayerId: outPlayerId
        },
        votes: {}
    }).catch(err => {
        alert("Error starting game! " + err.message);
        console.error(err);
    });
}

// ==========================================
// 3. SHARED PHASES (BRANCHING LOGIC)
// ==========================================

function transitionToReveal() {
    document.getElementById('pre-reveal-content').style.display = 'flex';
    document.getElementById('post-reveal-content').style.display = 'none';
    
    document.getElementById('local-reveal-actions').style.display = 'none';
    if (isHost) {
        document.getElementById('host-reveal-actions').style.display = 'flex';
    } else {
        document.getElementById('host-reveal-actions').style.display = 'none';
    }
    showScreen(revealScreen);
}

function showMyRole() {
    document.getElementById('pre-reveal-content').style.display = 'none';
    document.getElementById('post-reveal-content').style.display = 'flex';
    updateRevealUI();
}

function updateRevealUI() {
    if(!roomData || !roomData.game) return;
    if (myPlayerId === roomData.game.outPlayerId) {
        revealScreen.classList.remove('in-state', 'out-state');
        revealScreen.classList.add('out-state');
        statusTitle.textContent = translations[gameState.lang].you_are_out;
        revealLabel.textContent = translations[gameState.lang].hint_is;
        revealWord.textContent = roomData.game.hint[gameState.lang];
    } else {
        revealScreen.classList.remove('out-state', 'in-state');
        revealScreen.classList.add('in-state');
        statusTitle.textContent = translations[gameState.lang].you_are_in;
        revealLabel.textContent = translations[gameState.lang].word_is;
        revealWord.textContent = roomData.game.word[gameState.lang];
    }
}

function transitionToQuestioning() {
    showScreen(questioningScreen);
    if (!isMultiplayer) {
        document.getElementById('local-questioning-actions').style.display = 'flex';
        document.getElementById('host-questioning-actions').style.display = 'none';
        document.getElementById('guest-questioning-actions').style.display = 'none';
        nextQuestionPairLocal();
    } else {
        document.getElementById('local-questioning-actions').style.display = 'none';
        if (isHost) {
            document.getElementById('host-questioning-actions').style.display = 'flex';
            document.getElementById('guest-questioning-actions').style.display = 'none';
        } else {
            document.getElementById('host-questioning-actions').style.display = 'none';
            document.getElementById('guest-questioning-actions').style.display = 'flex';
        }
        updateQuestioningUI();
    }
}

function updateQuestioningUI() {
    if (!roomData || !roomData.game || !roomData.game.askerId) return;
    const askerName = roomData.players[roomData.game.askerId] ? roomData.players[roomData.game.askerId].name : "Unknown";
    const receiverName = roomData.players[roomData.game.receiverId] ? roomData.players[roomData.game.receiverId].name : "Unknown";
    qAsker.textContent = askerName;
    qReceiver.textContent = receiverName;
}

function transitionToVoting() {
    showScreen(votingScreen);
    selectedVoteId = null;
    
    if (!isMultiplayer) {
        currentVoterIndex = 1;
        localVotes = {};
        document.getElementById('local-voting-actions').style.display = 'flex';
        document.getElementById('host-voting-actions').style.display = 'none';
        showVoterTurnLocal();
    } else {
        document.getElementById('local-voting-actions').style.display = 'none';
        if (isHost) {
            document.getElementById('host-voting-actions').style.display = 'flex';
        } else {
            document.getElementById('host-voting-actions').style.display = 'none';
        }
        renderVotingGrid();
        updateVotingRealtime();
    }
}

function renderVotingGrid() {
    votingGrid.innerHTML = '';
    Object.keys(roomData.players).forEach(pId => {
        if (pId === myPlayerId) return;
        const div = document.createElement('div');
        div.className = 'vote-card';
        div.id = 'vote-card-' + pId;
        div.innerHTML = `<span>${roomData.players[pId].name}</span>`;
        div.onclick = () => {
            selectedVoteId = pId;
            document.querySelectorAll('.vote-card').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            roomRef.child('votes/' + myPlayerId).set(pId);
        };
        votingGrid.appendChild(div);
    });
}

function updateVotingRealtime() {
    if (!roomData || roomData.status !== 'voting') return;
    const votes = roomData.votes || {};
    const totalVotes = Object.keys(votes).length;
    const expectedVotes = Object.keys(roomData.players).length; 
    
    votingStatusText.textContent = `${totalVotes} / ${expectedVotes} voted`;
    document.querySelectorAll('.vote-count-badge').forEach(b => b.remove());
    
    const voteCounts = {};
    Object.values(votes).forEach(votedId => { voteCounts[votedId] = (voteCounts[votedId] || 0) + 1; });
    
    Object.keys(voteCounts).forEach(pId => {
        const card = document.getElementById('vote-card-' + pId);
        if (card) {
            let badge = document.createElement('span');
            badge.className = 'vote-count-badge';
            badge.textContent = voteCounts[pId];
            card.appendChild(badge);
        }
    });

    if (votes[myPlayerId]) {
        selectedVoteId = votes[myPlayerId];
        document.querySelectorAll('.vote-card').forEach(el => el.classList.remove('selected'));
        const myCard = document.getElementById('vote-card-' + selectedVoteId);
        if (myCard) myCard.classList.add('selected');
    }
}

function transitionToResults() {
    showScreen(resultsScreen);
    
    if (!isMultiplayer) {
         document.getElementById('local-results-actions').style.display = 'flex';
         document.getElementById('host-results-actions').style.display = 'none';
         document.getElementById('guest-results-actions').style.display = 'none';
         
         const counts = {};
         let maxVotes = 0; let mostVotedId = -1;
         Object.values(localVotes).forEach(v => {
             counts[v] = (counts[v] || 0) + 1;
             if(counts[v] > maxVotes) { maxVotes = counts[v]; mostVotedId = v; }
         });
         
         const playerText = translations[gameState.lang].player;
         resultOutPlayer.textContent = `${playerText} ${localOutPlayer}`;
         resultWord.textContent = localCurrentWord[gameState.lang];
         
         voteResultMsg.classList.remove('vote-correct', 'vote-wrong');
         if (mostVotedId === localOutPlayer) {
             voteResultMsg.textContent = translations[gameState.lang].correct_guess;
             voteResultMsg.classList.add('vote-correct');
         } else {
             voteResultMsg.textContent = translations[gameState.lang].wrong_guess;
             voteResultMsg.classList.add('vote-wrong');
         }
         return;
    }
    
    document.getElementById('local-results-actions').style.display = 'none';
    if (isHost) {
        document.getElementById('host-results-actions').style.display = 'flex';
        document.getElementById('guest-results-actions').style.display = 'none';
    } else {
        document.getElementById('host-results-actions').style.display = 'none';
        document.getElementById('guest-results-actions').style.display = 'flex';
    }
    
    const votes = roomData.votes || {};
    const voteCounts = {};
    let maxVotes = 0; let mostVotedId = null;
    
    Object.values(votes).forEach(votedId => {
        voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
        if (voteCounts[votedId] > maxVotes) {
            maxVotes = voteCounts[votedId];
            mostVotedId = votedId;
        }
    });
    
    const outPId = roomData.game.outPlayerId;
    const outName = roomData.players[outPId] ? roomData.players[outPId].name : "Unknown";
    resultOutPlayer.textContent = outName;
    resultWord.textContent = roomData.game.word[gameState.lang];
    
    voteResultMsg.classList.remove('vote-correct', 'vote-wrong');
    if (mostVotedId === outPId) {
        voteResultMsg.textContent = translations[gameState.lang].correct_guess;
        voteResultMsg.classList.add('vote-correct');
    } else {
        voteResultMsg.textContent = translations[gameState.lang].wrong_guess;
        voteResultMsg.classList.add('vote-wrong');
    }
}

// ---------------- Multi Flow actions ----------------
document.getElementById('to-questioning-btn').addEventListener('click', () => {
    if (!isHost) return;
    const pIds = Object.keys(roomData.players);
    let asker = pIds[Math.floor(Math.random() * pIds.length)];
    let receiver = pIds[Math.floor(Math.random() * pIds.length)];
    while(asker === receiver) receiver = pIds[Math.floor(Math.random() * pIds.length)];
    
    roomRef.update({
        status: 'questioning',
        game: { ...roomData.game, askerId: asker, receiverId: receiver }
    });
});

document.getElementById('next-question-btn').addEventListener('click', () => {
    if (!isHost) return;
    const pIds = Object.keys(roomData.players);
    let asker = pIds[Math.floor(Math.random() * pIds.length)];
    let receiver = pIds[Math.floor(Math.random() * pIds.length)];
    while(asker === receiver) receiver = pIds[Math.floor(Math.random() * pIds.length)];
    
    roomRef.child('game').update({ askerId: asker, receiverId: receiver });
});

document.getElementById('to-voting-btn').addEventListener('click', () => {
    if (!isHost) return;
    roomRef.update({ status: 'voting', votes: {} });
});

function resetToLobby() {
    if(!isHost) return;
    roomRef.update({
        status: 'lobby',
        game: null,
        votes: null
    }).then(() => {
        showScreen(lobbyScreen);
    });
}

// ---------------- Event Listeners ----------------
function updateOnlinePlayersCount(change) {
    let newCount = targetOnlinePlayers + change;
    if (newCount >= 2 && newCount <= 20) {
        targetOnlinePlayers = newCount;
        onlineCountDisplay.textContent = newCount;
    }
}

function attachEventListeners() {
    settingsBtn.addEventListener('click', () => modal.classList.add('active'));
    closeSettingsBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

    langBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            gameState.lang = e.target.dataset.lang;
            saveSettings();
            applySettings();
        });
    });
    themeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            gameState.theme = e.target.dataset.theme;
            saveSettings();
            applySettings();
        });
    });

    // Navigation Home
    btnPlayLocal.addEventListener('click', () => showScreen(setupScreen));
    btnCreateRoom.addEventListener('click', () => showScreen(createRoomScreen));
    btnJoinRoom.addEventListener('click', () => showScreen(joinRoomScreen));
    
    backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if(btn.id !== 'lobby-back-btn') showScreen(homeScreen);
        });
    });
    goHomeBtns.forEach(btn => btn.addEventListener('click', () => {
        if(isMultiplayer) leaveRoom(); else showScreen(homeScreen);
    }));

    // Local Logic binds
    decreaseBtn.addEventListener('click', () => updatePlayersCount(-1));
    increaseBtn.addEventListener('click', () => updatePlayersCount(1));
    startLocalGameBtn.addEventListener('click', startLocalGame);
    passRevealBtn.addEventListener('click', showLocalReveal);
    nextPlayerBtn.addEventListener('click', handleLocalNextPlayer);
    localNextQuestionBtn.addEventListener('click', nextQuestionPairLocal);
    localToVotingBtn.addEventListener('click', transitionToVoting);
    localConfirmVoteBtn.addEventListener('click', confirmLocalVote);
    localPlayAgainBtn.addEventListener('click', () => showScreen(setupScreen));

    // Multi Logic binds
    onlineDecreaseBtn.addEventListener('click', () => updateOnlinePlayersCount(-1));
    onlineIncreaseBtn.addEventListener('click', () => updateOnlinePlayersCount(1));
    
    createBtn.addEventListener('click', createRoom);
    joinBtn.addEventListener('click', joinRoom);
    lobbyLeaveBtn.addEventListener('click', leaveRoom);
    document.getElementById('lobby-back-btn').addEventListener('click', leaveRoom);
    lobbyStartBtn.addEventListener('click', startGameMultiplayer);
    revealBtn.addEventListener('click', showMyRole);
    endVotingBtn.addEventListener('click', () => { if(isHost) roomRef.update({status: 'results'}); });
    playAgainBtn.addEventListener('click', resetToLobby);
}

// Boot up
window.addEventListener('DOMContentLoaded', init);
