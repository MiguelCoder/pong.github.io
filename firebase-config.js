// firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyAKjag2rw3voWirlb4AWiCyxUS96GvOWWE",
  authDomain: "pong-f7b21.firebaseapp.com",
  projectId: "pong-f7b21",
  storageBucket: "pong-f7b21.firebasestorage.app",
  messagingSenderId: "395706083073",
  appId: "1:395706083073:web:60c55375dcf2f3f44b9d00"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

console.log('Firebase inicializado');

class RankingManager {
  constructor() {
    this.currentFilter = 'singlePlayer';
    this.rankings = { singlePlayer: [], multiplayer: [] };
  }

  calculateScore(gameData) {
    const { winner, playerScore, opponentScore, timeLeft, difficulty, gameMode } = gameData;
    let baseScore = 0;
    
    if (winner) {
      baseScore = 100;
      const scoreDiff = playerScore - opponentScore;
      baseScore += scoreDiff * 10;
      const timeBonus = Math.floor((timeLeft / 180) * 50);
      baseScore += timeBonus;
      
      if (gameMode === 'cpu') {
        const multipliers = {
          'Muito Fácil': 1.0, 'Fácil': 1.2, 'Normal': 1.5,
          'Médio': 1.8, 'Difícil': 2.2, 'Impossível': 3.0
        };
        baseScore *= (multipliers[difficulty] || 1.0);
      }
    } else {
      baseScore = 25 + (playerScore * 5);
    }
    
    return Math.floor(Math.max(0, baseScore));
  }

  async saveGameResult(playerName, gameData) {
    try {
      const score = this.calculateScore(gameData);
      if (score <= 0) return null;

      const result = {
        playerName: playerName,
        score: score,
        playerScore: gameData.playerScore,
        opponentScore: gameData.opponentScore,
        difficulty: gameData.difficulty,
        gameMode: gameData.gameMode,
        timeLeft: gameData.timeLeft,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        date: new Date().toISOString().split('T')[0]
      };

      const docRef = await db.collection('rankings').add(result);
      console.log('Resultado salvo:', docRef.id);

      const isNewRecord = await this.checkIfNewRecord(playerName, score, gameData.gameMode);
      
      return { score: score, isNewRecord: isNewRecord, docId: docRef.id };
    } catch (error) {
      console.error('Erro ao salvar:', error);
      return null;
    }
  }

  async checkIfNewRecord(playerName, newScore, gameMode) {
    try {
      const query = await db.collection('rankings')
        .where('playerName', '==', playerName)
        .where('gameMode', '==', gameMode)
        .get();

      if (query.empty) return true;

      let bestScore = 0;
      query.forEach(doc => {
        const score = doc.data().score;
        if (score > bestScore) bestScore = score;
      });

      return newScore > bestScore;
    } catch (error) {
      console.error('Erro ao verificar recorde:', error);
      return false;
    }
  }

  async loadRanking(gameMode = 'singlePlayer', limit = 10) {
    try {
      const modeFilter = gameMode === 'singlePlayer' ? 'cpu' : 'multiplayer';
      
      const query = await db.collection('rankings')
        .where('gameMode', '==', modeFilter)
        .get();

      const rankings = [];
      query.forEach(doc => {
        const data = doc.data();
        rankings.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        });
      });

      rankings.sort((a, b) => b.score - a.score);
      const limitedRankings = rankings.slice(0, limit);

      this.rankings[gameMode] = limitedRankings;
      console.log('Carregados', limitedRankings.length, 'rankings');
      return limitedRankings;
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
      return [];
    }
  }

  renderRanking(rankings, containerId = 'rankingList') {
    const container = document.getElementById(containerId);
    const noRanking = document.getElementById('noRanking');
    
    if (!container) return;

    container.innerHTML = '';

    if (rankings.length === 0) {
      container.classList.add('hidden');
      if (noRanking) noRanking.classList.remove('hidden');
      return;
    }

    container.classList.remove('hidden');
    if (noRanking) noRanking.classList.add('hidden');

    rankings.forEach((entry, index) => {
      const li = document.createElement('li');
      li.className = 'ranking-item';
      
      const position = index + 1;
      const medals = ['🥇', '🥈', '🥉'];
      const medal = position <= 3 ? medals[position - 1] : '#' + position;
      
      li.innerHTML = `
        <div class="ranking-position">${medal}</div>
        <div class="ranking-info">
          <div class="ranking-name">${entry.playerName}</div>
          <div class="ranking-details">
            ${entry.playerScore}-${entry.opponentScore} • 
            ${entry.difficulty || 'Normal'} • 
            ${this.formatDate(entry.timestamp)}
          </div>
        </div>
        <div class="ranking-score">${entry.score}pts</div>
      `;

      if (position <= 3) {
        li.classList.add('position-' + position);
      }

      container.appendChild(li);
    });
  }

  formatDate(date) {
    if (!date) return 'Hoje';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hoje';
    if (diffDays === 2) return 'Ontem';
    if (diffDays <= 7) return (diffDays - 1) + ' dias atrás';
    
    return date.toLocaleDateString('pt-BR');
  }

  setupRankingEventListeners() {
    const filterSingle = document.getElementById('filterSinglePlayer');
    const filterMulti = document.getElementById('filterMultiplayer');
    
    if (filterSingle) {
      filterSingle.addEventListener('click', () => {
        this.switchFilter('singlePlayer');
      });
    }
    
    if (filterMulti) {
      filterMulti.addEventListener('click', () => {
        this.switchFilter('multiplayer');
      });
    }
  }

  async switchFilter(filterType) {
    this.currentFilter = filterType;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const activeBtn = filterType === 'singlePlayer' ? 
      document.getElementById('filterSinglePlayer') : 
      document.getElementById('filterMultiplayer');
    
    if (activeBtn) activeBtn.classList.add('active');

    await this.loadAndShowRanking(filterType);
  }

  async loadAndShowRanking(gameMode) {
    const loading = document.getElementById('rankingLoading');
    const container = document.getElementById('rankingContainer');
    
    if (loading) loading.classList.remove('hidden');
    if (container) container.classList.add('hidden');

    try {
      const rankings = await this.loadRanking(gameMode);
      this.renderRanking(rankings);
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
    }

    if (loading) loading.classList.add('hidden');
    if (container) container.classList.remove('hidden');
  }
}

const rankingManager = new RankingManager();

function showNewRecordModal(score) {
  const modal = document.getElementById('newRecordModal');
  const scoreElement = document.getElementById('recordPoints');
  
  if (modal && scoreElement) {
    scoreElement.textContent = score;
    modal.classList.remove('hidden');
    
    if (typeof playSound === 'function') {
      playSound('winSound');
    }
  }
}

function closeNewRecordModal() {
  const modal = document.getElementById('newRecordModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

console.log('RankingManager carregado');