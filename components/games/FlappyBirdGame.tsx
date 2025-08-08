import React, { useEffect, useRef } from 'react';

interface GameProps {
  isGameOver: boolean;
}

export const FlappyBirdGame: React.FC<GameProps> = ({ isGameOver: isAppGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birdVideoRef = useRef<HTMLVideoElement>(null);
  const gameData = useRef({
    ctx: null as CanvasRenderingContext2D | null,
    bird: { x: 60, y: 320, r: 40, vel: 0 },
    pipes: [] as { x: number; topH: number; bottomY: number; passed: boolean }[],
    score: 0,
    frame: 0,
    gameOver: false,
    animationFrameId: 0,
    GRAVITY: 0.4,
    FLAP: -8,
    PIPE_WIDTH: 60,
    PIPE_GAP: 220,
    SPEED: 2.5,
  }).current;

  useEffect(() => {
    if (isAppGameOver && gameData.animationFrameId) {
      cancelAnimationFrame(gameData.animationFrameId);
    }
  }, [isAppGameOver, gameData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const birdVid = birdVideoRef.current;
    if (!canvas || !birdVid) return;

    gameData.ctx = canvas.getContext('2d');
    if (!gameData.ctx) return;

    const reset = () => {
        gameData.bird = { x: 60, y: canvas.height / 2, r: 40, vel: 0 };
        gameData.pipes = [];
        gameData.score = 0;
        gameData.frame = 0;
        gameData.gameOver = false;
    };

    const flap = () => {
        if (gameData.gameOver) return;
        gameData.bird.vel = gameData.FLAP;
    };

    const spawnPipe = () => {
      const topH = Math.random() * (canvas.height - gameData.PIPE_GAP - 120) + 40;
      const bottomY = topH + gameData.PIPE_GAP;
      gameData.pipes.push({ x: canvas.width, topH, bottomY, passed: false });
    };

    const update = () => {
      if (gameData.gameOver || isAppGameOver) return;

      gameData.bird.vel += gameData.GRAVITY;
      gameData.bird.y += gameData.bird.vel;

      if (gameData.frame % 180 === 0) spawnPipe();

      gameData.pipes.forEach(pipe => {
        pipe.x -= gameData.SPEED;
        if (
          gameData.bird.x + gameData.bird.r/2 > pipe.x &&
          gameData.bird.x - gameData.bird.r/2 < pipe.x + gameData.PIPE_WIDTH &&
          (gameData.bird.y - gameData.bird.r/2 < pipe.topH || gameData.bird.y + gameData.bird.r/2 > pipe.bottomY)
        ) {
          gameData.gameOver = true;
        }
        if (!pipe.passed && pipe.x + gameData.PIPE_WIDTH < gameData.bird.x) {
          pipe.passed = true;
          gameData.score++;
        }
      });
      gameData.pipes = gameData.pipes.filter(p => p.x + gameData.PIPE_WIDTH > 0);

      if (gameData.bird.y + gameData.bird.r/2 > canvas.height || gameData.bird.y - gameData.bird.r/2 < 0) {
        gameData.gameOver = true;
      }
    };

    const draw = () => {
      if (!gameData.ctx) return;
      gameData.ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if(birdVid.style.visibility !== 'visible') birdVid.style.visibility = 'visible';
      const rect = canvas.getBoundingClientRect();
      birdVid.style.left = `${rect.left + gameData.bird.x}px`;
      birdVid.style.top = `${rect.top + gameData.bird.y}px`;

      gameData.ctx.fillStyle = 'green';
      gameData.pipes.forEach(p => {
        gameData.ctx.fillRect(p.x, 0, gameData.PIPE_WIDTH, p.topH);
        gameData.ctx.fillRect(p.x, p.bottomY, gameData.PIPE_WIDTH, canvas.height - p.bottomY);
      });
      
      gameData.ctx.fillStyle = '#fff';
      gameData.ctx.font = '32px Poppins, sans-serif';
      gameData.ctx.textAlign = 'center';
      gameData.ctx.textBaseline = 'top';
      gameData.ctx.fillText(`Score: ${gameData.score}`, canvas.width / 2, 20);

      if (gameData.gameOver || isAppGameOver) {
        birdVid.style.visibility = 'hidden';
        gameData.ctx.fillStyle = '#fff';
        gameData.ctx.textAlign = 'center';
        gameData.ctx.font = '48px Poppins, sans-serif';
        if (isAppGameOver && !gameData.gameOver) {
            gameData.ctx.fillText("Time's Up!", canvas.width / 2, canvas.height / 2 - 20);
        } else {
            gameData.ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
            gameData.ctx.font = '24px Poppins, sans-serif';
            gameData.ctx.fillText('Click or Space to Restart', canvas.width / 2, canvas.height / 2 + 20);
        }
      }
    };

    const loop = () => {
      update();
      draw();
      gameData.frame++;
      gameData.animationFrameId = requestAnimationFrame(loop);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameData.gameOver) reset();
        flap();
      }
    };

    const handleMouseDown = () => {
      if (gameData.gameOver) reset();
      flap();
    };

    reset();
    loop();
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('mousedown', handleMouseDown);

    return () => {
      cancelAnimationFrame(gameData.animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('mousedown', handleMouseDown);
      if(birdVid) birdVid.style.visibility = 'hidden';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAppGameOver]);

  return (
    <div className="w-full h-full bg-[#8fe6fb] flex items-center justify-center relative overflow-hidden">
        <canvas id="game" ref={canvasRef} width="480" height="640"></canvas>
        <video 
            id="birdVideo" 
            ref={birdVideoRef} 
            src="/bird.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline 
            style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                transform: 'translate(-50%, -50%)', 
                width: '80px', 
                height: '80px', 
                pointerEvents: 'none', 
                zIndex: 10,
                visibility: 'hidden' 
            }}
        />
    </div>
  );
};