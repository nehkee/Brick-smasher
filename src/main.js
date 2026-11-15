// Brick Smasher entry point. The game loop will go here.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#e6e6f0';
ctx.font = '32px sans-serif';
ctx.textAlign = 'center';
ctx.fillText('Brick Smasher', canvas.width / 2, canvas.height / 2);
