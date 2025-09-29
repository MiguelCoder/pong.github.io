// firebase-config.js
// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyAKjag2rw3voWirlb4AWiCyxUS96GvOWWE",
    authDomain: "pong-f7b21.firebaseapp.com",
    projectId: "pong-f7b21",
    storageBucket: "pong-f7b21.firebasestorage.app",
    messagingSenderId: "395706083073",
    appId: "1:395706083073:web:60c55375dcf2f3f44b9d00"
  };

  // Initialize Firebase
  const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

console.log('🔥 Firebase inicializado!');


// Classe para gerenciar o ranking
class RankingManager {
  constructor() {
    this.currentFilter = 'singlePlayer';
    this.rankings = {
      singlePlayer: [],
      multiplayer: []
    };
  }

  // Calcula pontuação baseada em performance
  calculateScore(gameData) {
    const {
      winner,
      playerScore,
      opponentScore,
      timeLeft,
      difficulty,
      gameMode
    } = gameData;

    let baseScore = 0;
    
    // Pontos base por vitória
    if (winner) {
      baseScore = 100;
      
      // Bônus por diferença de pontos
      const scoreDiff = playerScore - opponentScore;
      baseScore += scoreDiff * 10;
      
      // Bônus por tempo restante (max 50 pontos)
      const timeBonus = Math.floor((timeLeft / 180) * 50);
      baseScore += timeBonus;
      
      // Bônus por dificuldade (apenas CPU)
      if (gameMode === 'cpu') {
        const difficultyMultipliers = {
          'Muito Fácil': 1.0,
          'Fácil': 1.2,
          'Normal': 1.5,
          'Médio': 1.8,
          'Difícil': 2.2,
          'Impossível': 3.0
        };
        baseScore *= (difficultyMultipliers[difficulty] || 1.0);
      }
    } else {
      // Pontos por participação mesmo perdendo
      baseScore = 25 + (playerScore * 5);
    }

    return Math.floor(Math.max(0, baseScore));
  }

  // Salva resultado no Firebase
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

      // Salva no Firestore
      const docRef = await db.collection('rankings').add(result);
      console.log('Resultado salvo:', docRef.id);

      // Verifica se é um novo recorde para mostrar modal
      const isNewRecord = await this.checkIfNewRecord(playerName, score, gameData.gameMode);
      
      return {
        score: score,
        isNewRecord: isNewRecord,
        docId: docRef.id
      };
    } catch (error) {
      console.error('Erro ao salvar resultado:', error);
      return null;
    }
  }

  // Verifica se é um novo recorde pessoal
  async checkIfNewRecord(playerName, newScore, gameMode) {
    try {
      const query = await db.collection('rankings')
        .where('playerName', '==', playerName)
        .where('gameMode', '==', gameMode)
        .orderBy('score', 'desc')
        .limit(1)
        .get();

      if (query.empty) {
        return true; // Primeiro jogo é sempre recorde
      }

      const bestScore = query.docs[0].data().score;
      return newScore > bestScore;
    } catch (error) {
      console.error('Erro ao verificar recorde:', error);
      return false;
    }
  }

  // Carrega ranking do Firebase
  async loadRanking(gameMode = 'singlePlayer', limit = 10) {
    try {
      const modeFilter = gameMode === 'singlePlayer' ? 'cpu' : 'multiplayer';
      
      const query = await db.collection('rankings')
        .where('gameMode', '==', modeFilter)
        .orderBy('score', 'desc')
        .limit(limit)
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

      this.rankings[gameMode] = rankings;
      return rankings;
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
      return [];
    }
  }

  // Renderiza a lista de ranking
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
      const medal = position <= 3 ? ['🥇', '🥈', '🥉'][position - 1] : `#${position}`;
      
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

      // Adiciona classe especial para top 3
      if (position <= 3) {
        li.classList.add(`position-${position}`);
      }

      container.appendChild(li);
    });
  }

  // Formata data para exibição
  formatDate(date) {
    if (!date) return 'Hoje';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hoje';
    if (diffDays === 2) return 'Ontem';
    if (diffDays <= 7) return `${diffDays-1} dias atrás`;
    
    return date.toLocaleDateString('pt-BR');
  }

  // Inicializa os event listeners do ranking
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

  // Muda filtro do ranking
  async switchFilter(filterType) {
    this.currentFilter = filterType;
    
    // Atualiza botões visuais
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const activeBtn = filterType === 'singlePlayer' ? 
      document.getElementById('filterSinglePlayer') : 
      document.getElementById('filterMultiplayer');
    
    if (activeBtn) activeBtn.classList.add('active');

    // Mostra loading e carrega dados
    await this.loadAndShowRanking(filterType);
  }

  // Carrega e mostra ranking com loading
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

// Instância global do gerenciador de ranking
const rankingManager = new RankingManager();

// Função para mostrar modal de novo recorde
function showNewRecordModal(score) {
  const modal = document.getElementById('newRecordModal');
  const scoreElement = document.getElementById('recordPoints');
  
  if (modal && scoreElement) {
    scoreElement.textContent = score;
    modal.classList.remove('hidden');
    
    // Adiciona efeito sonoro se disponível
    playSound('winSound');
  }
}

// Função para fechar modal de novo recorde
function closeNewRecordModal() {
  const modal = document.getElementById('newRecordModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}