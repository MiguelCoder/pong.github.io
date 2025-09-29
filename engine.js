// Variáveis globais
let canvas, ctx;
let player1, player2, ball;
let player1Score = 0, player2Score = 0;
let gameRunning = false;
let againstCPU = false;
let cpuDifficulty = "Normal";
let gameTimer;
let timeLeft = 180; // 3 minutos em segundos
let leftTouchId = null;
let rightTouchId = null;
let isPaused = false;
let player1Name = "Player 1";
let player2Name = "Player 2";

// Variáveis para efeitos de colisão
let particles = [];
let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
let glowEffects = [];

// Configuração dos event listeners
function setupEventListeners() {
  // Menu principal
  document.getElementById("playButton").addEventListener("click", function() {
    showMenu('playerMenu');
  });
  
  document.getElementById("rankingButton").addEventListener("click", function() {
    showMenu('rankingMenu');
    rankingManager.loadAndShowRanking(rankingManager.currentFilter);
  });
  
  document.getElementById("helpButton").addEventListener("click", function() {
    showMenu('helpMenu');
  });
  
  // Menu de jogadores
  document.getElementById("continueButton").addEventListener("click", savePlayerNames);
  document.getElementById("backFromPlayerMenu").addEventListener("click", function() {
    showMenu('mainMenu');
  });
  
  // Menu de dificuldade
  const difficultyButtons = document.querySelectorAll("#difficultyMenu button[data-difficulty]");
  difficultyButtons.forEach(button => {
    button.addEventListener("click", function() {
      startGame(this.getAttribute('data-difficulty'));
    });
  });
  
  document.getElementById("backFromDifficultyMenu").addEventListener("click", function() {
    showMenu('playerMenu');
  });
  
  // Menu de ranking
  document.getElementById("backFromRankingMenu").addEventListener("click", function() {
    showMenu('mainMenu');
  });
  
  // Menu de ajuda
  document.getElementById("backFromHelpMenu").addEventListener("click", function() {
    showMenu('mainMenu');
  });
  
  // Tela de jogo
  document.getElementById("backToMenuButton").addEventListener("click", backToMenu);
  document.getElementById("pauseButton").addEventListener("click", togglePause);
  
  // Controles de teclado
  document.addEventListener("keydown", keyDownHandler);
  document.addEventListener("keyup", keyUpHandler);
  
  // Setup ranking event listeners
  rankingManager.setupRankingEventListeners();
}

// Sistema de Partículas
class Particle {
  constructor(x, y, color, size = 3) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = (Math.random() - 0.5) * 10;
    this.life = 1.0;
    this.decay = Math.random() * 0.03 + 0.02;
    this.color = color;
    this.size = size;
    this.initialSize = size;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life -= this.decay;
    this.size = this.initialSize * this.life;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}

// Sistema de Efeitos de Brilho
class GlowEffect {
  constructor(x, y, radius, color, duration = 300) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.maxRadius = radius;
    this.color = color;
    this.life = 1.0;
    this.duration = duration;
    this.elapsed = 0;
  }

  update(deltaTime) {
    this.elapsed += deltaTime;
    this.life = Math.max(0, 1 - (this.elapsed / this.duration));
    this.radius = this.maxRadius * (1 + (1 - this.life) * 2);
  }

  draw(ctx) {
    if (this.life <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.life * 0.5;
    
    // Cria gradiente radial
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius
    );
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}

// Função para criar explosão de partículas
function createParticleExplosion(x, y, color, count = 15) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color, Math.random() * 4 + 2));
  }
}

// Função para criar efeito de brilho
function createGlowEffect(x, y, radius, color) {
  glowEffects.push(new GlowEffect(x, y, radius, color));
}

// Função para criar screen shake
function createScreenShake(intensity = 10, duration = 200) {
  screenShake.intensity = intensity;
  screenShake.duration = duration;
}

// Função para atualizar screen shake
function updateScreenShake(deltaTime) {
  if (screenShake.duration > 0) {
    screenShake.duration -= deltaTime;
    const shakeAmount = screenShake.intensity * (screenShake.duration / 200);
    screenShake.x = (Math.random() - 0.5) * shakeAmount;
    screenShake.y = (Math.random() - 0.5) * shakeAmount;
  } else {
    screenShake.x = 0;
    screenShake.y = 0;
    screenShake.intensity = 0;
  }
}

// Função para mostrar/ocultar menus
function showMenu(menuId) {
  // Oculta todos os menus
  const menus = document.querySelectorAll('.menu-container, #gameScreen');
  menus.forEach(menu => {
    menu.classList.add('hidden');
  });
  
  // Mostra o menu solicitado
  document.getElementById(menuId).classList.remove('hidden');
}

// Salvar nomes dos jogadores
function savePlayerNames() {
  const p1Name = document.getElementById("player1Name").value;
  const p2Name = document.getElementById("player2Name").value;
  
  if (p1Name.trim() !== "") {
    player1Name = p1Name;
    document.querySelector("#player1Score .player-name").textContent = player1Name;
  }
  
  if (p2Name.trim() !== "") {
    player2Name = p2Name;
    document.querySelector("#player2Score .player-name").textContent = player2Name;
  }
  
  againstCPU = document.getElementById("cpuMode").checked;
  
  if (againstCPU) {
    showMenu('difficultyMenu');
  } else {
    startGame("Normal");
  }
}

// Iniciar o jogo
function startGame(difficulty) {
  cpuDifficulty = difficulty;
  showMenu('gameScreen');
  
  // Inicializa o canvas
  canvas = document.getElementById("pongCanvas");
  ctx = canvas.getContext("2d");
  
  // Ajusta o tamanho do canvas para dispositivos móveis
  if (window.innerWidth <= 768) {
    canvas.width = window.innerWidth * 0.95;
    canvas.height = canvas.width * 0.6;
  }
  
  // Inicializa os objetos do jogo
  initGame();
  
  // Inicia o loop do jogo
  gameRunning = true;
  isPaused = false;
  document.getElementById("pauseButton").textContent = "Pausar";
  loop();
  
  // Inicia o temporizador
  startTimer();
}

// Inicializar objetos do jogo
function initGame() {
  // Define as raquetes
  const paddleWidth = 10;
  const paddleHeight = canvas.height / 4;
  
  player1 = {
    x: 20,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    speed: 8,
    moveUp: false,
    moveDown: false,
    glowIntensity: 0
  };
  
  player2 = {
    x: canvas.width - 20 - paddleWidth,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    speed: 8,
    moveUp: false,
    moveDown: false,
    glowIntensity: 0
  };
  
  // Define a bola
  resetBall();
  
  // Reinicia os placares
  player1Score = 0;
  player2Score = 0;
  updateScore();
  
  // Reinicia o temporizador
  timeLeft = 180;
  updateTimer();
  
  // Limpa efeitos
  particles = [];
  glowEffects = [];
}

// Resetar a bola
function resetBall() {
  ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 7,
    velocityX: 5,
    velocityY: 5,
    trail: []
  };
}

// Atualizar placar
function updateScore() {
  document.querySelector("#player1Score .score-value").textContent = player1Score;
  document.querySelector("#player2Score .score-value").textContent = player2Score;
}

// Iniciar temporizador
function startTimer() {
  clearInterval(gameTimer);
  gameTimer = setInterval(function() {
    if (!isPaused && gameRunning) {
      timeLeft--;
      updateTimer();
      
      if (timeLeft <= 0) {
        endGame();
      }
    }
  }, 1000);
}

// Atualizar temporizador
function updateTimer() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  document.getElementById("gameTimer").textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

let lastTime = 0;

// Loop principal do jogo
function loop(currentTime = 0) {
  if (!gameRunning) return;
  
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  if (!isPaused) {
    // Atualiza efeitos
    updateEffects(deltaTime);
    
    // Limpa o canvas com screen shake
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);
    ctx.clearRect(-screenShake.x, -screenShake.y, canvas.width, canvas.height);
    
    // Desenha os elementos
    draw();
    
    // Atualiza as posições
    update();
    
    ctx.restore();
  }
  
  // Continua o loop
  requestAnimationFrame(loop);
}

// Atualizar efeitos
function updateEffects(deltaTime) {
  // Atualiza partículas
  particles = particles.filter(particle => {
    particle.update();
    return !particle.isDead();
  });
  
  // Atualiza efeitos de brilho
  glowEffects = glowEffects.filter(glow => {
    glow.update(deltaTime);
    return !glow.isDead();
  });
  
  // Atualiza screen shake
  updateScreenShake(deltaTime);
  
  // Diminui o brilho das raquetes
  player1.glowIntensity *= 0.95;
  player2.glowIntensity *= 0.95;
}

// Desenhar elementos
function draw() {
  // Desenha o campo
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Desenha efeitos de brilho primeiro
  glowEffects.forEach(glow => glow.draw(ctx));
  
  // Desenha a linha central com mais destaque em azul neon
  ctx.strokeStyle = "#00ddff";
  ctx.lineWidth = 3;
  ctx.setLineDash([15, 10]);
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#00ddff";
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
  
  // Desenha trail da bola
  drawBallTrail();
  
  // Desenha as raquetes com efeito de brilho
  drawPaddleWithGlow(player1, "cyan");
  drawPaddleWithGlow(player2, "#ff00ff");
  
  // Desenha a bola com efeito
  drawBallWithGlow();
  
  // Desenha partículas
  particles.forEach(particle => particle.draw(ctx));
}

// Desenhar raquete com brilho
function drawPaddleWithGlow(paddle, color) {
  ctx.save();
  
  // Efeito de brilho se a raquete foi atingida
  if (paddle.glowIntensity > 0) {
    ctx.shadowBlur = 20 + paddle.glowIntensity * 30;
    ctx.shadowColor = color;
  } else {
    ctx.shadowBlur = 5;
    ctx.shadowColor = color;
  }
  
  ctx.fillStyle = color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.restore();
}

// Desenhar bola com brilho
function drawBallWithGlow() {
  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = "white";
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Desenhar trail da bola
function drawBallTrail() {
  if (ball.trail.length > 1) {
    ctx.save();
    for (let i = 0; i < ball.trail.length - 1; i++) {
      const alpha = i / ball.trail.length;
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = "white";
      const point = ball.trail[i];
      const size = ball.radius * alpha;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Atualizar posições
function update() {
  // Atualiza trail da bola
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 8) {
    ball.trail.shift();
  }
  
  // Move o jogador 1
  if (player1.moveUp && player1.y > 0) {
    player1.y -= player1.speed;
  }
  if (player1.moveDown && player1.y + player1.height < canvas.height) {
    player1.y += player1.speed;
  }
  
  // Move o jogador 2 (ou CPU)
  if (againstCPU) {
    // IA simples baseada na dificuldade
    let cpuSpeed = player2.speed;
    
    switch(cpuDifficulty) {
      case "Muito Fácil":
        cpuSpeed = 1;
        break;
      case "Fácil":
        cpuSpeed = 4;
        break;
      case "Normal":
        cpuSpeed = 5;
        break;
      case "Médio":
        cpuSpeed = 6;
        break;
      case "Difícil":
        cpuSpeed = 7;
        break;
      case "Impossível":
        cpuSpeed = 14;
        break;
    }
    
    // Centraliza a raquete na bola com um offset baseado na dificuldade
    const centerY = player2.y + player2.height / 2;
    const ballCenterY = ball.y;
    
    if (ballCenterY - centerY > 10) {
      player2.y += cpuSpeed;
    } else if (ballCenterY - centerY < -10) {
      player2.y -= cpuSpeed;
    }
  } else {
    // Move o jogador 2
    if (player2.moveUp && player2.y > 0) {
      player2.y -= player2.speed;
    }
    if (player2.moveDown && player2.y + player2.height < canvas.height) {
      player2.y += player2.speed;
    }
  }
  
  // Limita o movimento das raquetes
  limitPaddleMovement();
  
  // Move a bola
  ball.x += ball.velocityX;
  ball.y += ball.velocityY;
  
  // Colisão com as bordas superior e inferior
  if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
    ball.velocityY = -ball.velocityY;
    
    // Efeitos de colisão com parede
    createParticleExplosion(ball.x, ball.y, "orange", 8);
    createGlowEffect(ball.x, ball.y, 30, "orange");
    createScreenShake(5, 100);
    playSound('hitSound');
  }
  
  // Verifica se a bola passou das raquetes (marcou ponto)
  if (ball.x - ball.radius < 0) {
    // Jogador 2 marca ponto
    player2Score++;
    updateScore();
    
    // Efeitos especiais de ponto
    createParticleExplosion(ball.x, ball.y, "#ff00ff", 20);
    createGlowEffect(ball.x, ball.y, 50, "#ff00ff");
    createScreenShake(15, 300);
    playSound('pointSound');
    resetBall();
  } else if (ball.x + ball.radius > canvas.width) {
    // Jogador 1 marca ponto
    player1Score++;
    updateScore();
    
    // Efeitos especiais de ponto
    createParticleExplosion(ball.x, ball.y, "cyan", 20);
    createGlowEffect(ball.x, ball.y, 50, "cyan");
    createScreenShake(15, 300);
    playSound('pointSound');
    resetBall();
  }
  
  // Colisão com as raquetes
  if (
    ball.x - ball.radius < player1.x + player1.width &&
    ball.y > player1.y &&
    ball.y < player1.y + player1.height &&
    ball.velocityX < 0
  ) {
    ball.velocityX = -ball.velocityX;
    
    // Ajusta o ângulo baseado onde a bola atingiu a raquete
    let hitPoint = (ball.y - player1.y) / player1.height;
    ball.velocityY = (hitPoint - 0.5) * 10;
    
    // Efeitos de colisão com raquete
    player1.glowIntensity = 1.0;
    createParticleExplosion(ball.x, ball.y, "cyan", 12);
    createGlowEffect(ball.x, ball.y, 40, "cyan");
    createScreenShake(8, 150);
    playSound('hitSound');
    
    // Aumenta velocidade gradualmente
    ball.velocityX *= 1.16;
    ball.velocityY *= 1.16;
  }
  
  if (
    ball.x + ball.radius > player2.x &&
    ball.y > player2.y &&
    ball.y < player2.y + player2.height &&
    ball.velocityX > 0
  ) {
    ball.velocityX = -ball.velocityX;
    
    // Ajusta o ângulo baseado onde a bola atingiu a raquete
    let hitPoint = (ball.y - player2.y) / player2.height;
    ball.velocityY = (hitPoint - 0.5) * 10;
    
    // Efeitos de colisão com raquete
    player2.glowIntensity = 1.0;
    createParticleExplosion(ball.x, ball.y, "#ff00ff", 12);
    createGlowEffect(ball.x, ball.y, 40, "#ff00ff");
    createScreenShake(8, 150);
    playSound('hitSound');
    
    // Aumenta velocidade gradualmente
    ball.velocityX *= 1.05;
    ball.velocityY *= 1.05;
  }
}

// Limitar movimento das raquetes
function limitPaddleMovement() {
  if (player1.y < 0) player1.y = 0;
  if (player1.y + player1.height > canvas.height) player1.y = canvas.height - player1.height;
  
  if (player2.y < 0) player2.y = 0;
  if (player2.y + player2.height > canvas.height) player2.y = canvas.height - player2.height;
}

// Handlers de teclado
function keyDownHandler(e) {
  if (isPaused || !gameRunning) return;
  
  switch(e.key) {
    case "w":
    case "W":
      player1.moveUp = true;
      break;
    case "s":
    case "S":
      player1.moveDown = true;
      break;
    case "ArrowUp":
      player2.moveUp = true;
      break;
    case "ArrowDown":
      player2.moveDown = true;
      break;
    case " ":
      togglePause();
      break;
  }
}

function keyUpHandler(e) {
  switch(e.key) {
    case "w":
    case "W":
      player1.moveUp = false;
      break;
    case "s":
    case "S":
      player1.moveDown = false;
      break;
    case "ArrowUp":
      player2.moveUp = false;
      break;
    case "ArrowDown":
      player2.moveDown = false;
      break;
  }
}

// Voltar ao menu
function backToMenu() {
  gameRunning = false;
  isPaused = false;
  clearInterval(gameTimer);
  showMenu('mainMenu');
}

// Pausar/jogar
function togglePause() {
  isPaused = !isPaused;
  document.getElementById("pauseButton").textContent = isPaused ? "Continuar" : "Pausar";
}

// Função para mostrar placa de vencedor
function showWinnerModal(winner, p1Score, p2Score) {
  // Cria o modal
  const modal = document.createElement('div');
  modal.className = 'winner-modal';
  
  // Determina se é empate
  const isDraw = p1Score === p2Score;
  
  modal.innerHTML = `
    <div class="winner-card">
      <div class="winner-title">GAME OVER</div>
      
      <div class="winner-scores">
        <div class="winner-player">
          <div class="winner-player-name">${player1Name}</div>
          <div class="winner-player-score">${p1Score}</div>
        </div>
        <div class="winner-player">
          <div class="winner-player-name">${player2Name}</div>
          <div class="winner-player-score">${p2Score}</div>
        </div>
      </div>
      
      <div class="winner-result ${isDraw ? 'draw' : ''}">
        ${isDraw ? 'EMPATE!' : 'VENCEDOR: ' + winner}
      </div>
      
      <div class="winner-buttons">
        <button class="winner-button" onclick="closeWinnerModal(); startGame('${cpuDifficulty}');">
          JOGAR NOVAMENTE
        </button>
        <button class="winner-button secondary" onclick="closeWinnerModal(); backToMenu();">
          MENU PRINCIPAL
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Salva resultado no ranking se não for empate
  if (!isDraw) {
    saveGameToRanking(winner, p1Score, p2Score);
  }
}

// Salva o jogo no ranking do Firebase
async function saveGameToRanking(winner, p1Score, p2Score) {
  try {
    const isPlayer1Winner = winner === player1Name;
    const playerScore = isPlayer1Winner ? p1Score : p2Score;
    const opponentScore = isPlayer1Winner ? p2Score : p1Score;
    
    const gameData = {
      winner: true,
      playerScore: playerScore,
      opponentScore: opponentScore,
      timeLeft: timeLeft,
      difficulty: cpuDifficulty,
      gameMode: againstCPU ? 'cpu' : 'multiplayer'
    };

    const result = await rankingManager.saveGameResult(winner, gameData);
    
    if (result && result.isNewRecord && result.score > 50) {
      // Mostra modal de novo recorde após um delay
      setTimeout(() => {
        showNewRecordModal(result.score);
      }, 2000);
    }
  } catch (error) {
    console.error('Erro ao salvar no ranking:', error);
  }
}

// Função para fechar placa de vencedor
function closeWinnerModal() {
  const modal = document.querySelector('.winner-modal');
  if (modal) {
    modal.remove();
  }
}

// Finalizar jogo
function endGame() {
  gameRunning = false;
  clearInterval(gameTimer);
  
  // Determina o vencedor
  let winner;
  if (player1Score > player2Score) {
    winner = player1Name;
    playSound('winSound');
  } else if (player2Score > player1Score) {
    winner = player2Name;
    playSound('winSound');
  } else {
    winner = "Empate!";
    playSound('pointSound');
  }
  
  // Mostra a placa de vencedor após um breve delay
  setTimeout(() => {
    showWinnerModal(winner, player1Score, player2Score);
  }, 800);
}

// Reproduzir som
function playSound(soundId) {
  const sound = document.getElementById(soundId);
  if (sound) {
    sound.currentTime = 0;
    sound.play();
  }
}

// Verificar se é dispositivo móvel
function checkMobile() {
  if (/Mobi|Android/i.test(navigator.userAgent)) {
    document.getElementById('touchControls').classList.remove('hidden');
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", function() {
  setupEventListeners();
  checkMobile();
  console.log("Pong Neon carregado! Todos os botões devem funcionar agora.");
});