import React, { useState, useEffect, useCallback, KeyboardEvent } from 'react';

const GAME_HEIGHT = 600;
const GAME_WIDTH = 400;
const MID = 200;
const PLAYER_SIZE = 60; // Increased size for the dinosaur
const PLATFORM_HEIGHT = 50;
const INITIAL_PLATFORM_WIDTH = 80; 
const MIN_PLATFORM_WIDTH = 40;
const JUMP_VELOCITY = 16;
const GRAVITY = 0.6;
const MOVE_SPEED = 6;
const PLATFORM_SPACING = 160;
const MIN_HORIZONTAL_GAP = 50;
const MAX_HORIZONTAL_GAP = 130;
const DIFFICUTLY_INCREASE_INTERVAL = 10;

interface Platform {
  x: number;
  y: number;
  width: number;
  active: boolean;
  isGround?: boolean;
}

interface Player {
  x: number;
  y: number;
  vy: number;
}

interface GameState {
  player: Player;
  platforms: Platform[];
  score: number;
  highScore: number;
  gameOver: boolean;
  gameStarted: boolean;
}

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

// Add a new Background component
const Background: React.FC = () => (
  <div 
    className="absolute inset-0 z-0"
    style={{
      backgroundImage: 'url(/background.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}
  />
);

const Button: React.FC<ButtonProps> = ({ onClick, children, className }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-600 transition-colors ${className || ''}`}
  >
    {children}
  </button>
);

const ReadyJump: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    player: { x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT - PLAYER_SIZE, vy: 0 },
    platforms: [],
    score: 0,
    highScore: 0,
    gameOver: false,
    gameStarted: false
  });

  const [keys, setKeys] = useState({ left: false, right: false });

  const calculatePlatformWidth = useCallback((score: number) => {
    const shrinkFactor = Math.min(1, 1 - (Math.floor(score / DIFFICUTLY_INCREASE_INTERVAL) * 0.1));
    return Math.max(MIN_PLATFORM_WIDTH, INITIAL_PLATFORM_WIDTH * shrinkFactor);
  }, []);

  const calculateHorizontalGap = useCallback((score: number) => {
    const baseGap = Math.min(MAX_HORIZONTAL_GAP, MIN_HORIZONTAL_GAP + Math.floor(score / DIFFICUTLY_INCREASE_INTERVAL) * 20);
    return baseGap;
  }, []);

  const generatePlatform = useCallback((y: number, score: number) => {
    const width = calculatePlatformWidth(score);
    const gap = calculateHorizontalGap(score);
    const baseX = MID - width - gap;
    const x = baseX + Math.random() * (gap * 2);
    return { x, y, width, active: true };
  }, [calculatePlatformWidth, calculateHorizontalGap]);

  const initGame = useCallback(() => {
    const groundPlatform = { x: 0, y: GAME_HEIGHT - PLATFORM_HEIGHT, width: GAME_WIDTH, active: false, isGround: true};
    const initialPlatforms: Platform[] = [
      groundPlatform,
      ...Array.from({ length: 5 }, (_, i) => generatePlatform(GAME_HEIGHT - PLATFORM_HEIGHT - (i + 1) * PLATFORM_SPACING, 0))
    ];  
    
    setGameState(prev => ({
      ...prev,
      player: { x: GAME_WIDTH / 2 - PLAYER_SIZE / 2, y: GAME_HEIGHT - PLAYER_SIZE - PLATFORM_HEIGHT, vy: 0 },
      platforms: initialPlatforms,
      score: 0,
      gameOver: false,
      gameStarted: false
    }));
  }, [generatePlatform]);

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      player: { ...prev.player, vy: -JUMP_VELOCITY },
      gameStarted: true
    }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: any) => {
      if (e.code === 'ArrowLeft') setKeys(prev => ({ ...prev, left: true }));
      if (e.code === 'ArrowRight') setKeys(prev => ({ ...prev, right: true }));
      if (e.code === 'Space') {
        if (gameState.gameOver) initGame();
        else if (!gameState.gameStarted) startGame();
      }
    };

    const handleKeyUp = (e: any) => {
      if (e.code === 'ArrowLeft') setKeys(prev => ({ ...prev, left: false }));
      if (e.code === 'ArrowRight') setKeys(prev => ({ ...prev, right: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameOver, gameState.gameStarted, initGame, startGame]);

  useEffect(() => {
    if (gameState.gameOver || !gameState.gameStarted) return;

    const gameLoop = setInterval(() => {
      setGameState(prev => {
        let { player, platforms, score, highScore } = prev;
        let { x, y, vy } = player;

        if (keys.left) x -= MOVE_SPEED;
        if (keys.right) x += MOVE_SPEED;
        x = Math.max(0, Math.min(x, GAME_WIDTH - PLAYER_SIZE));

        vy += GRAVITY;
        y += vy;

        let jumpedOnPlatform = false;
        platforms = platforms.map(platform => {
          if (y + PLAYER_SIZE >= platform.y && 
              y + PLAYER_SIZE <= platform.y + PLATFORM_HEIGHT &&
              x < platform.x + platform.width && 
              x + PLAYER_SIZE > platform.x && 
              vy >= 0 &&
              platform.active) {
            y = platform.y - PLAYER_SIZE;
            vy = -JUMP_VELOCITY;
            jumpedOnPlatform = true;
            return { ...platform, active: false };
          }
          return platform;
        });

        if (jumpedOnPlatform) {
          score++;
        }

        if (platforms[platforms.length - 1].y > 0) {
          platforms.push(generatePlatform(platforms[platforms.length - 1].y - PLATFORM_SPACING, score));
        }
        platforms = platforms.filter(p => p.y < GAME_HEIGHT);

        if (y >= GAME_HEIGHT - PLAYER_SIZE) {
          return {
            ...prev,
            gameOver: true,
            highScore: Math.max(highScore, score),
          };
        }

        const cameraY = GAME_HEIGHT / 2 - y;
        if (cameraY > 0) {
          y += cameraY;
          platforms = platforms.map(p => ({ ...p, y: p.y + cameraY }));
        }

        return { ...prev, player: { x, y, vy }, platforms, score };
      });
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameState.gameOver, gameState.gameStarted, keys, generatePlatform]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  return (
    <div className="relative w-[400px] h-[600px] bg-sky-300 overflow-hidden">

      <Background />

      {/* Platforms (Clouds and Ground) */}
      {gameState.platforms.map((platform, index) => (
        <div 
          key={index} 
          className="absolute"
          style={{
            left: platform.x,
            top: platform.y,
            width: platform.isGround ? GAME_WIDTH : platform.width,
            height: PLATFORM_HEIGHT,
            backgroundImage: `url(${platform.isGround ? '/ground.png' : (platform.active ? '/cloud.png' : '/cloud-dark.png')})`,
            backgroundSize: platform.isGround ? 'repeat-x' : 'contain',
            backgroundRepeat: platform.isGround ? 'repeat-x' : 'no-repeat',
            backgroundPosition: 'center'
          }}
        />
      ))}

      {/* Player (Dinosaur) */}
      <div 
        className="absolute"
        style={{
          left: gameState.player.x,
          top: gameState.player.y,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
          backgroundImage: 'url(/dinosaur.png)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      />

      {/* Game Title and Start Screen */}
      {!gameState.gameStarted && !gameState.gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-200 bg-opacity-60 z-10">
          <h1 className="text-4xl font-bold mb-8 text-sky-800">Dino Jump</h1>
          <Button 
            onClick={startGame}
            className="px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            Start Game
          </Button>
          <p className="mt-4 text-sky-700">or press "Spacebar" to start</p>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState.gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-sky-200 bg-opacity-60 z-10">
          <h2 className="text-3xl font-bold mb-4 text-sky-800">Game Over</h2>
          <p className="text-xl mb-2 text-sky-700">Score: {gameState.score}</p>
          <p className="text-xl mb-6 text-sky-700">High Score: {gameState.highScore}</p>
          <Button 
            onClick={initGame}
            className="px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
          >
            Try Again
          </Button>
          <p className="mt-4 text-sky-700">or press "Spacebar" to restart</p>
        </div>
      )}

      {/* Score Display */}
      <div className="absolute top-4 right-4 text-2xl font-bold text-white z-10">
        Score: {gameState.score}
      </div>
    </div>
  );
};

export default ReadyJump;