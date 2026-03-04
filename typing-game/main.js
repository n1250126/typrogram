const bgm = new Audio('sound/bgm.mp3');
bgm.loop = true;
bgm.volume = 0.3;
const soundCorrect = new Audio('sound/correct.mp3');
const soundWrong = new Audio('sound/wrong.mp3');
const soundClear = new Audio('sound/clear.mp3');

let questionsData = null;

async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) throw new Error('ネットワークエラー');
        questionsData = await response.json();
    } catch (error) {
        alert('エラー: 問題データが読み込めません。');
    }
}
loadQuestions();

// 状態管理
let availableQuestions = [];
let currentQuestion = null;
let score = 0;
let correctCount = 0;
let timeLeft = 100;
let timerInterval;
let isPlaying = false;
let currentLimitMs = 10000;
let currentLevel = '';

// ★追加: ライフの変数
let lives = 2;
const maxLives = 2;

// HTML要素の取得
const titleScreen = document.getElementById('title-screen');
const gameScreen = document.getElementById('game-screen');
const codeTextDisplay = document.getElementById('code-text');
const languageHintDisplay = document.getElementById('language-hint');
const typeInput = document.getElementById('type-input');
const scoreDisplay = document.getElementById('score');
const correctCountDisplay = document.getElementById('correct-count');
const timerBar = document.getElementById('timer-bar');
const backBtn = document.getElementById('back-btn');
const diffButtons = document.querySelectorAll('.diff-btn');
const bestEasyDisplay = document.getElementById('best-easy');
const bestNormalDisplay = document.getElementById('best-normal');
const bestHardDisplay = document.getElementById('best-hard');
const livesDisplay = document.getElementById('lives-display'); // ★追加

function loadBestScores() {
    bestEasyDisplay.innerText = localStorage.getItem('bestScore_easy') || 0;
    bestNormalDisplay.innerText = localStorage.getItem('bestScore_normal') || 0;
    bestHardDisplay.innerText = localStorage.getItem('bestScore_hard') || 0;
}
loadBestScores();

function checkAndSaveBestScore() {
    const currentBest = parseInt(localStorage.getItem(`bestScore_${currentLevel}`)) || 0;
    if (score > currentBest) {
        localStorage.setItem(`bestScore_${currentLevel}`, score);
        return true;
    }
    return false;
}

// ★追加: ライフ表示を更新する関数
function updateLivesDisplay() {
    let hearts = '';
    for (let i = 0; i < lives; i++) hearts += '❤️';
    for (let i = lives; i < maxLives; i++) hearts += '🖤'; // 減った分は黒ハートに
    livesDisplay.innerText = hearts;
}

diffButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (!questionsData) return alert('読み込み中です...');
        const level = e.target.getAttribute('data-level');
        setupGame(level);
    });
});

function setupGame(level) {
    currentLevel = level;
    
    if (level === 'easy') currentLimitMs = 30000;
    if (level === 'normal') currentLimitMs = 30000;
    if (level === 'hard') currentLimitMs = 30000;

    availableQuestions = [...questionsData[level]].sort(() => Math.random() - 0.5);

    titleScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    backBtn.style.display = 'none';
    
    startGame();
}

function startGame() {
    score = 0;
    correctCount = 0;
    lives = maxLives; // ★追加: ライフを全回復
    
    updateScoreBoard();
    updateLivesDisplay(); // ★追加: 表示を更新
    
    languageHintDisplay.style.color = "#bdc3c7"; 
    
    typeInput.disabled = false;
    typeInput.value = '';
    typeInput.focus();
    isPlaying = true;
    
    bgm.currentTime = 0;
    bgm.play().catch(e => console.log("BGM再生不可"));

    nextQuestion();
}

function nextQuestion() {
    if (availableQuestions.length === 0) {
        const allLevels = [].concat(questionsData.easy, questionsData.normal, questionsData.hard);
        availableQuestions = allLevels.sort(() => Math.random() - 0.5);
    }

    currentQuestion = availableQuestions.pop();
    languageHintDisplay.innerText = `言語: ${currentQuestion.language}`;
    codeTextDisplay.innerText = currentQuestion.code;
    typeInput.value = '';
    
    startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 100;
    timerBar.style.width = '100%';
    timerBar.style.backgroundColor = '#2ecc71';
    
    const tickRate = 50;
    const decreaseAmount = 100 / (currentLimitMs / tickRate);

    timerInterval = setInterval(() => {
        timeLeft -= decreaseAmount;
        timerBar.style.width = timeLeft + '%';
        
        if (timeLeft < 30) timerBar.style.backgroundColor = '#e74c3c';
        
        // ★変更: 時間切れになったらミス処理へ
        if (timeLeft <= 0) {
            handleMistake();
        }
    }, tickRate);
}

// ★追加: ミスした時の処理（時間切れ or 誤答）
function handleMistake() {
    lives--; // ライフを1減らす
    updateLivesDisplay();

    if (lives <= 0) {
        // ライフが0になったらゲームオーバー
        gameOver();
    } else {
        // まだライフがある場合は復活！
        soundWrong.currentTime = 0;
        soundWrong.play().catch(e => {});

        typeInput.value = '';
        
        // ミスしたことがわかりやすいよう、入力欄を一瞬赤くする演出
        const originalBg = typeInput.style.backgroundColor || '';
        typeInput.style.backgroundColor = '#ffcccc';
        setTimeout(() => {
            typeInput.style.backgroundColor = originalBg;
        }, 300);

        // 時間をリセットして同じ問題から再スタート
        startTimer();
    }
}

function gameClear() {
    clearInterval(timerInterval);
    isPlaying = false;
    typeInput.disabled = true;
    
    bgm.pause();
    soundClear.currentTime = 0;
    soundClear.play().catch(e => {});

    const isNewRecord = checkAndSaveBestScore();
    let resultText = `おめでとうございます！15問達成です！\n\n最終スコア: ${score}点\n残機ボーナス: ${lives * 500}点`; // ライフが残っているとスコアアップ！
    
    score += (lives * 500); // 実際にスコアにも足す
    updateScoreBoard();

    if (isNewRecord) resultText += "\n\n🌟 NEW RECORD! 🌟";

    languageHintDisplay.innerText = "🎉 GAME CLEAR! 🎉";
    languageHintDisplay.style.color = "#f1c40f"; 
    codeTextDisplay.innerText = resultText;
    backBtn.style.display = 'inline-block';
}

function gameOver() {
    clearInterval(timerInterval);
    isPlaying = false;
    typeInput.disabled = true;
    
    bgm.pause();
    soundWrong.currentTime = 0;
    soundWrong.play().catch(e => {});

    const isNewRecord = checkAndSaveBestScore();
    let resultText = `正解した数: ${correctCount}問\n最終スコア: ${score}点\n\n答え合わせ:\n前回の答えは「${currentQuestion.answer}」でした！`;
    if (isNewRecord) resultText += "\n\n🌟 NEW RECORD! 🌟";

    languageHintDisplay.innerText = "GAME OVER";
    languageHintDisplay.style.color = "#e74c3c"; 
    codeTextDisplay.innerText = resultText;
    backBtn.style.display = 'inline-block';
}

function updateScoreBoard() {
    scoreDisplay.innerText = score;
    correctCountDisplay.innerText = correctCount;
}

typeInput.addEventListener('keydown', (e) => {
    if (isPlaying && e.key === 'Enter') {
        const inputText = e.target.value.trim();
        
        if (inputText === currentQuestion.answer) {
            soundCorrect.currentTime = 0;
            soundCorrect.play().catch(e => {});

            const timeBonus = Math.floor(timeLeft);
            score += (100 + timeBonus);
            correctCount++;
            
            updateScoreBoard();
            
            if (correctCount >= 15) {
                gameClear();
            } else {
                nextQuestion();
            }
        } else {
            // ★変更: 誤答した時は時間を減らすペナルティ（ゲージを15%減少）
            timeLeft -= 15; 
            
            typeInput.value = '';
            
            // 誤答演出（一瞬赤く光る）
            const originalBg = typeInput.style.backgroundColor || '';
            typeInput.style.backgroundColor = '#ffcccc';
            setTimeout(() => {
                typeInput.style.backgroundColor = originalBg;
            }, 300);
            
            // ペナルティによって時間が0以下になった場合は、時間切れ処理（ライフ減少）へ
            if (timeLeft <= 0) {
                timeLeft = 0;
                handleMistake();
            } else {
                // ゲージの表示を即座に更新して減ったことを視覚的に伝える
                timerBar.style.width = timeLeft + '%';
                if (timeLeft < 30) {
                    timerBar.style.backgroundColor = '#e74c3c';
                }
            }
        }
    }
});

backBtn.addEventListener('click', () => {
    loadBestScores();
    gameScreen.style.display = 'none';
    titleScreen.style.display = 'block';
});