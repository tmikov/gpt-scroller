"use strict";
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const images = {
    ship: 'ship.png',
    enemy: 'enemy.png',
    background: 'background.png',
};
function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
    });
}
async function loadImages(imagePaths) {
    const imagePromises = Object.entries(imagePaths).map(async ([name, path]) => {
        const img = await loadImage(path);
        return [name, img];
    });
    const loadedImages = await Promise.all(imagePromises);
    return Object.fromEntries(loadedImages);
}
class Ship {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.vel = 5;
        this.width = width;
        this.height = height;
    }
    update(keys) {
        if (keys['ArrowLeft'])
            this.x -= this.vel;
        if (keys['ArrowRight'])
            this.x += this.vel;
        if (keys['ArrowUp'])
            this.y -= this.vel;
        if (keys['ArrowDown'])
            this.y += this.vel;
    }
    draw(shipImg) {
        ctx.drawImage(shipImg, this.x, this.y, this.width, this.height);
    }
}
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 5;
        this.vel = 8;
    }
    update() {
        this.x += this.vel;
    }
    draw() {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
class Bomb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.vel = 5;
    }
    update() {
        this.y += this.vel;
    }
    draw() {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 64;
        this.height = 64;
        this.vel = 2;
    }
    update() {
        this.x -= this.vel;
    }
    draw(enemyImg) {
        ctx.drawImage(enemyImg, this.x, this.y, this.width, this.height);
    }
}
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 4 - 2;
        this.life = 0;
        this.maxLife = Math.random() * 30 + 50;
        this.alpha = 1;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life++;
        this.alpha = 1 - (this.life / this.maxLife);
    }
    draw() {
        // ctx.fillStyle = "orange";
        ctx.fillStyle = `rgba(255, 128, 0, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    isAlive() {
        return this.life < this.maxLife;
    }
}
class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        for (let i = 0; i < 50; i++) {
            this.particles.push(new Particle(x, y));
        }
    }
    update() {
        this.particles = this.particles.filter(particle => {
            particle.update();
            return particle.isAlive();
        });
    }
    draw() {
        this.particles.forEach(particle => particle.draw());
    }
    isAlive() {
        return this.particles.length > 0;
    }
}
const bullets = [];
const bombs = [];
const enemies = [];
let explosions = [];
let enemySpawnCounter = 0;
const enemySpawnRate = 120;
let backgroundX = 0;
const backgroundSpeed = 1;
function checkCollision(rect1, rect2) {
    return (rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y);
}
loadImages(images).then((loadedImages) => {
    const shipImg = loadedImages.ship;
    const enemyImg = loadedImages.enemy;
    const backgroundImg = loadedImages.background;
    const ship = new Ship(canvas.width / 2, canvas.height - 100, shipImg.width, shipImg.height);
    const keys = {};
    document.addEventListener('keydown', (e) => {
        if (!keys[e.code]) {
            keys[e.code] = true;
            if (e.code === 'Space') {
                const bullet = new Bullet(ship.x + ship.width, ship.y + ship.height / 2 - 2.5);
                bullets.push(bullet);
            }
            if (e.code === 'KeyB') {
                const bomb = new Bomb(ship.x + ship.width / 2 - 5, ship.y + ship.height);
                bombs.push(bomb);
            }
        }
    });
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    function gameLoop() {
        ctx.fillStyle = 'rgba(0, 0, 30, 1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(backgroundImg, backgroundX, 0);
        ctx.drawImage(backgroundImg, backgroundX + backgroundImg.width, 0);
        backgroundX -= backgroundSpeed;
        if (backgroundX <= -backgroundImg.width) {
            backgroundX = 0;
        }
        ship.update(keys);
        ship.draw(shipImg);
        bullets.forEach((bullet, i) => {
            bullet.update();
            bullet.draw();
            if (bullet.x > canvas.width) {
                bullets.splice(i, 1);
            }
        });
        bombs.forEach((bomb, i) => {
            bomb.update();
            bomb.draw();
            if (bomb.y > canvas.height) {
                bombs.splice(i, 1);
            }
        });
        enemySpawnCounter++;
        if (enemySpawnCounter >= enemySpawnRate) {
            const y = Math.random() * (canvas.height - 64);
            const enemy = new Enemy(canvas.width, y);
            enemies.push(enemy);
            enemySpawnCounter = 0;
        }
        enemies.forEach((enemy, i) => {
            enemy.update();
            enemy.draw(enemyImg);
            if (enemy.x < -enemy.width) {
                enemies.splice(i, 1);
            }
            bullets.forEach((bullet, j) => {
                if (checkCollision(bullet, enemy)) {
                    const explosion = new Explosion(enemy.x, enemy.y);
                    explosions.push(explosion);
                    bullets.splice(j, 1);
                    enemies.splice(i, 1);
                }
            });
        });
        for (const explosion of explosions) {
            explosion.update();
            explosion.draw();
        }
        explosions = explosions.filter(explosion => explosion.isAlive());
        requestAnimationFrame(gameLoop);
    }
    gameLoop();
});
