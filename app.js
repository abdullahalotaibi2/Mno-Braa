// Game State
const gameState = {
    lang: 'ar',
    theme: 'dark',
    playersCount: 4,
    categoryId: 'house',
    
    // Round specific
    outPlayer: 0,
    currentWord: null,
    currentHint: null,
    currentPlayerIndex: 1,
    currentVoterIndex: 1,
    selectedVote: null,
    votes: {},
    
    // History
    lastUsedWordPerCategory: {}
};

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
const revealScreen = document.getElementById('reveal-screen');
const questioningScreen = document.getElementById('questioning-screen');
const votingScreen = document.getElementById('voting-screen');
const resultsScreen = document.getElementById('results-screen');

// Navigation buttons
const playBtn = document.getElementById('play-btn');
const backBtns = document.querySelectorAll('.back-btn');
const goHomeBtns = document.querySelectorAll('.go-home-btn');
const playAgainBtn = document.getElementById('play-again-btn');

// Setup screen elements
const decreaseBtn = document.getElementById('decrease-players');
const increaseBtn = document.getElementById('increase-players');
const countDisplay = document.getElementById('players-count-display');
const categoryGrid = document.getElementById('category-selection');
const startGameBtn = document.getElementById('start-game-btn');

// Game elements
const passPlayerName = document.getElementById('pass-player-name');
const revealBtn = document.getElementById('reveal-btn');
const statusTitle = document.getElementById('status-title');
const revealLabel = document.getElementById('reveal-label');
const revealWord = document.getElementById('reveal-word');
const nextPlayerBtn = document.getElementById('next-player-btn');

// Questioning elements
const qAsker = document.getElementById('q-asker');
const qReceiver = document.getElementById('q-receiver');
const nextQuestionBtn = document.getElementById('next-question-btn');
const toVotingBtn = document.getElementById('to-voting-btn');

// Voting elements
const votingGrid = document.getElementById('voting-grid');
const confirmVoteBtn = document.getElementById('confirm-vote-btn');

// Results elements
const resultOutPlayer = document.getElementById('result-out-player');
const resultWord = document.getElementById('result-word');
const voteResultMsg = document.getElementById('vote-result-msg');

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
    // Theme
    document.body.setAttribute('data-theme', gameState.theme);
    themeBtns.forEach(btn => {
        if (btn.dataset.theme === gameState.theme) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Language
    document.documentElement.lang = gameState.lang;
    document.documentElement.dir = gameState.lang === 'ar' ? 'rtl' : 'ltr';
    langBtns.forEach(btn => {
        if (btn.dataset.lang === gameState.lang) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    updateTranslations();
    renderCategories(); // Re-render to update text
}

function updateTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[gameState.lang] && translations[gameState.lang][key]) {
            el.innerHTML = translations[gameState.lang][key];
        }
    });

    // Update dynamic texts if we are in specific screens
    if (passScreen.classList.contains('active')) {
        updatePassScreenText();
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

// ---------------- Setup Logic ----------------
function renderCategories() {
    categoryGrid.innerHTML = '';
    const cats = Object.values(gameData.categories);
    
    cats.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'category-card';
        if (cat.id === gameState.categoryId) div.classList.add('selected');
        
        div.innerHTML = `<h3>${cat.name[gameState.lang]}</h3>`;
        div.onclick = () => selectCategory(cat.id);
        
        categoryGrid.appendChild(div);
    });
    
    checkStartGameEligibility();
}

function selectCategory(id) {
    gameState.categoryId = id;
    renderCategories();
}

function updatePlayersCount(change) {
    let newCount = gameState.playersCount + change;
    if (newCount >= 3 && newCount <= 20) {
        gameState.playersCount = newCount;
        countDisplay.textContent = newCount;
    }
}

function checkStartGameEligibility() {
    if (gameState.categoryId && gameState.playersCount >= 3) {
        startGameBtn.disabled = false;
    } else {
        startGameBtn.disabled = true;
    }
}

// ---------------- Game Logic ----------------
function startGame() {
    // Select category and word
    const cat = gameData.categories[gameState.categoryId];
    gameState.currentHint = cat.hint;
    
    let words = cat.words;
    let availableWords = words.filter(w => w.en !== gameState.lastUsedWordPerCategory[cat.id]);
    
    if (availableWords.length === 0) availableWords = words; // Fallback if 1 word in cat
    
    // Random word
    const randIndex = Math.floor(Math.random() * availableWords.length);
    gameState.currentWord = availableWords[randIndex];
    gameState.lastUsedWordPerCategory[cat.id] = gameState.currentWord.en;
    
    // Select random out player
    gameState.outPlayer = Math.floor(Math.random() * gameState.playersCount) + 1;
    gameState.currentPlayerIndex = 1;
    
    startRound();
}

function startRound() {
    updatePassScreenText();
    showScreen(passScreen);
}

function updatePassScreenText() {
    const playerText = translations[gameState.lang].player;
    passPlayerName.textContent = `${playerText} ${gameState.currentPlayerIndex}`;
}

function showReveal() {
    showScreen(revealScreen);
    revealScreen.classList.remove('in-state', 'out-state');
    
    if (gameState.currentPlayerIndex === gameState.outPlayer) {
        revealScreen.classList.add('out-state');
        statusTitle.textContent = translations[gameState.lang].you_are_out;
        revealLabel.textContent = translations[gameState.lang].hint_is;
        revealWord.textContent = gameState.currentHint[gameState.lang];
    } else {
        revealScreen.classList.add('in-state');
        statusTitle.textContent = translations[gameState.lang].you_are_in;
        revealLabel.textContent = translations[gameState.lang].word_is;
        revealWord.textContent = gameState.currentWord[gameState.lang];
    }
}

function handleNextPlayer() {
    if (gameState.currentPlayerIndex < gameState.playersCount) {
        gameState.currentPlayerIndex++;
        updatePassScreenText();
        showScreen(passScreen);
    } else {
        startQuestioningPhase();
    }
}

// ---------------- Questioning Logic ----------------
function startQuestioningPhase() {
    showScreen(questioningScreen);
    generateNextQuestionPair();
}

function generateNextQuestionPair() {
    let asker = Math.floor(Math.random() * gameState.playersCount) + 1;
    let receiver = Math.floor(Math.random() * gameState.playersCount) + 1;
    
    while (asker === receiver) {
        receiver = Math.floor(Math.random() * gameState.playersCount) + 1;
    }
    
    const playerText = translations[gameState.lang].player;
    qAsker.textContent = `${playerText} ${asker}`;
    qReceiver.textContent = `${playerText} ${receiver}`;
}

// ---------------- Voting Logic ----------------
function startVotingPhase() {
    gameState.currentVoterIndex = 1;
    gameState.votes = {};
    showVoterTurn();
}

function showVoterTurn() {
    gameState.selectedVote = null;
    confirmVoteBtn.disabled = true;
    
    votingGrid.innerHTML = '';
    const playerText = translations[gameState.lang].player;
    
    const subtitle = document.querySelector('#voting-screen p');
    if (gameState.lang === 'ar') {
        subtitle.textContent = `${playerText} ${gameState.currentVoterIndex}، صوّت لمين برا السالفة`;
    } else {
        subtitle.textContent = `${playerText} ${gameState.currentVoterIndex}, vote who is OUT`;
    }
    
    for (let i = 1; i <= gameState.playersCount; i++) {
        if (i === gameState.currentVoterIndex) continue; // Can't vote for yourself
        
        const div = document.createElement('div');
        div.className = 'vote-card';
        div.textContent = `${playerText} ${i}`;
        div.onclick = () => selectVote(i, div);
        votingGrid.appendChild(div);
    }
    
    showScreen(votingScreen);
}

function selectVote(playerIndex, element) {
    gameState.selectedVote = playerIndex;
    
    // Update UI
    document.querySelectorAll('.vote-card').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    
    confirmVoteBtn.disabled = false;
}

function confirmVoteEntry() {
    gameState.votes[gameState.currentVoterIndex] = gameState.selectedVote;
    
    if (gameState.currentVoterIndex < gameState.playersCount) {
        gameState.currentVoterIndex++;
        showVoterTurn();
    } else {
        verifyFinalVotes();
    }
}

function verifyFinalVotes() {
    const counts = {};
    let maxVotes = 0;
    let mostVotedPlayer = -1;
    
    Object.values(gameState.votes).forEach(votedId => {
        counts[votedId] = (counts[votedId] || 0) + 1;
        if (counts[votedId] > maxVotes) {
            maxVotes = counts[votedId];
            mostVotedPlayer = votedId;
        }
    });

    const playerText = translations[gameState.lang].player;
    resultOutPlayer.textContent = `${playerText} ${gameState.outPlayer}`;
    resultWord.textContent = gameState.currentWord[gameState.lang];
    
    voteResultMsg.classList.remove('vote-correct', 'vote-wrong');
    if (mostVotedPlayer === gameState.outPlayer) {
        voteResultMsg.textContent = translations[gameState.lang].correct_guess;
        voteResultMsg.classList.add('vote-correct');
    } else {
        voteResultMsg.textContent = translations[gameState.lang].wrong_guess;
        voteResultMsg.classList.add('vote-wrong');
    }
    
    showScreen(resultsScreen);
}

// ---------------- Event Listeners ----------------
function attachEventListeners() {
    // Settings Modals
    settingsBtn.addEventListener('click', () => modal.classList.add('active'));
    closeSettingsBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

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

    // Navigation
    playBtn.addEventListener('click', () => showScreen(setupScreen));
    
    backBtns.forEach(btn => {
        btn.addEventListener('click', () => showScreen(homeScreen));
    });

    goHomeBtns.forEach(btn => {
        btn.addEventListener('click', () => showScreen(homeScreen));
    });

    playAgainBtn.addEventListener('click', () => showScreen(setupScreen));

    // Setup Setup
    decreaseBtn.addEventListener('click', () => updatePlayersCount(-1));
    increaseBtn.addEventListener('click', () => updatePlayersCount(1));
    startGameBtn.addEventListener('click', startGame);

    // Gameplay flow
    revealBtn.addEventListener('click', showReveal);
    nextPlayerBtn.addEventListener('click', handleNextPlayer);

    // Questioning
    nextQuestionBtn.addEventListener('click', generateNextQuestionPair);
    toVotingBtn.addEventListener('click', startVotingPhase);

    // Voting
    confirmVoteBtn.addEventListener('click', confirmVoteEntry);
}

// Boot up
window.addEventListener('DOMContentLoaded', init);
