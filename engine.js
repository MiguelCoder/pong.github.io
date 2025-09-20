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

// Configuração dos event listeners
function setupEventListeners() {
  // Menu principal
  document.getElementById("playButton").addEventListener("click", function() {
    showMenu('playerMenu');
  });
  
  document.getElementById("rankingButton").addEventListener("click", function() {
    showMenu('rankingMenu');
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
    moveDown: false
  };
  
  player2 = {
    x: canvas.width - 20 - paddleWidth,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    speed: 8,
    moveUp: false,
    moveDown: false
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
}

// Resetar a bola
function resetBall() {
  ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 7,
    velocityX: 5,
    velocityY: 5
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

// Loop principal do jogo
function loop() {
  if (!gameRunning) return;
  
  if (!isPaused) {
    // Limpa o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenha os elementos
    draw();
    
    // Atualiza as posições
    update();
  }
  
  // Continua o loop
  requestAnimationFrame(loop);
}

// Desenhar elementos
function draw() {
  // Desenha o campo
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Desenha a linha central
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.setLineDash([10, 15]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Desenha as raquetes
  ctx.fillStyle = "cyan";
  ctx.fillRect(player1.x, player1.y, player1.width, player1.height);
  
  ctx.fillStyle = "#ff00ff";
  ctx.fillRect(player2.x, player2.y, player2.width, player2.height);
  
  // Desenha a bola
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

// Atualizar posições
function update() {
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
        cpuSpeed = 3;
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
        cpuSpeed = 9;
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
    playSound('hitSound');
  }
  
  // Verifica se a bola passou das raquetes (marcou ponto)
  if (ball.x - ball.radius < 0) {
    // Jogador 2 marca ponto
    player2Score++;
    updateScore();
    playSound('pointSound');
    resetBall();
  } else if (ball.x + ball.radius > canvas.width) {
    // Jogador 1 marca ponto
    player1Score++;
    updateScore();
    playSound('pointSound');
    resetBall();
  }
  
  // Colisão com as raquetes
  if (
    ball.x - ball.radius < player1.x + player1.width &&
    ball.y > player1.y &&
    ball.y < player1.y + player1.height
  ) {
    ball.velocityX = -ball.velocityX;
    // Ajusta o ângulo baseado onde a bola atingiu a raquete
    let hitPoint = (ball.y - player1.y) / player1.height;
    ball.velocityY = (hitPoint - 0.5) * 10;
    playSound('hitSound');
  }
  
  if (
    ball.x + ball.radius > player2.x &&
    ball.y > player2.y &&
    ball.y < player2.y + player2.height
  ) {
    ball.velocityX = -ball.velocityX;
    // Ajusta o ângulo baseado onde a bola atingiu a raquete
    let hitPoint = (ball.y - player2.y) / player2.height;
    ball.velocityY = (hitPoint - 0.5) * 10;
    playSound('hitSound');
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
  
  // Exibe alerta com o resultado
  setTimeout(() => {
    alert(`Fim de jogo!\n\n${player1Name}: ${player1Score}\n${player2Name}: ${player2Score}\n\nVencedor: ${winner}`);
    backToMenu();
  }, 500);
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