const _scroller_run = $SHBuiltin.extern_c({passRuntime: true}, function scroller_run(shr: c_ptr): void {
});

const _load_image = $SHBuiltin.extern_c({}, function load_image(path: c_ptr): c_int {
    return 0;
});
const _image_width = $SHBuiltin.extern_c({}, function image_width(image: c_int): c_int {
    return 0;
});
const _image_height = $SHBuiltin.extern_c({}, function image_height(image: c_int): c_int {
    return 0;
});
const _draw_blit_px = $SHBuiltin.extern_c({}, function draw_blit_px(
    image: c_int,
    x: c_float, y: c_float, w: c_float, h: c_float): void {});
const _draw_fill_px = $SHBuiltin.extern_c({}, function draw_fill_px(
    x: c_float, y: c_float, w: c_float, h: c_float, r: c_float, g: c_float, b: c_float, a: c_float): void {
});

class Image {
    handle: number;
    width: number;
    height: number;

    constructor(path: string) {
        let path_z = stringToAsciiz(path);
        try {
            this.handle = _load_image(path_z);
        } finally {
            _free(path_z);
        }
        this.width = _image_width(this.handle);
        this.height = _image_height(this.handle);
    }
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const keys = new Uint8Array(_SAPP_MAX_KEYCODES);

let shipImage: Image;
let enemyImage: Image;
let backgroundImage: Image;

class Actor {
    x: number;
    y: number;
    width: number;
    height: number;
    vel: number;

    constructor(x: number, y: number, width: number, height: number, vel: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.vel = vel;
    }
}

class Ship extends Actor {
    constructor(x: number, y: number) {
        super(x, y, shipImage.width, shipImage.height, 5);
    }

    update(): void {
        if (keys[_SAPP_KEYCODE_LEFT]) this.x -= this.vel;
        if (keys[_SAPP_KEYCODE_RIGHT]) this.x += this.vel;
        if (keys[_SAPP_KEYCODE_UP]) this.y -= this.vel;
        if (keys[_SAPP_KEYCODE_DOWN]) this.y += this.vel;
    }

    draw(): void {
        // _draw_fill_px(this.x, this.y, this.width, this.height, 1, 0, 0, 1);
        _draw_blit_px(shipImage.handle, this.x, this.y, this.width, this.height);
    }
}

class Bullet extends Actor {
    constructor(x: number, y: number) {
        super(x, y, 5, 5, 8);
    }

    update(): void {
        this.x += this.vel;
    }

    draw(): void {
        _draw_fill_px(this.x, this.y, this.width, this.height, 1, 1, 0, 1);
    }
}

class Enemy extends Actor {
    constructor(x: number, y: number) {
        super(x, y, 64, 64, 2);
    }

    update(): void {
        this.x -= this.vel;
    }

    draw(): void {
        //_draw_fill_px(this.x, this.y, this.width, this.height, 0, 0, 1, 1);
        _draw_blit_px(enemyImage.handle, this.x, this.y, this.width, this.height);
    }
}

class Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    life: number;
    maxLife: number;
    alpha: number;

    constructor(x: number, y: number) {
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
        _draw_fill_px(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size, 1, 0.5, 0, this.alpha);
    }

    isAlive() {
        return this.life < this.maxLife;
    }
}

class Explosion {
    x: number;
    y: number;
    particles: any;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.particles = Array();

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

let ship: Ship;
const bullets = Array();
const enemies = Array();
let explosions = Array();

let enemySpawnCounter = 0;
const enemySpawnRate = 120;

let backgroundX = 0;
const backgroundSpeed = 1;

function checkCollision(rect1: Actor, rect2: Actor): boolean {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function createExplosion(x: number, y: number) {
    const explosion = new Explosion(x, y);
    explosions.push(explosion);
    // playSound(explosionSound);
}

globalThis.on_init = function on_init(): void {
    shipImage = new Image("../ship.png");
    enemyImage = new Image("../enemy.png");
    backgroundImage = new Image("../background.png");
    ship = new Ship(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

globalThis.on_frame = function on_frame() {
    _draw_blit_px(backgroundImage.handle, backgroundX, 0, backgroundImage.width, backgroundImage.height);
    _draw_blit_px(backgroundImage.handle, backgroundX + backgroundImage.width, 0, backgroundImage.width, backgroundImage.height);
    backgroundX -= backgroundSpeed;

    if (backgroundX <= -backgroundImage.width) {
        backgroundX = 0;
    }

    ship.update();
    ship.draw();

    bullets.forEach((bullet, i) => {
        bullet.update();
        bullet.draw();

        if (bullet.x > CANVAS_WIDTH) {
            bullets.splice(i, 1);
        }
    });

    enemySpawnCounter++;

    if (enemySpawnCounter >= enemySpawnRate) {
        const y = Math.random() * (CANVAS_HEIGHT - 64);
        const enemy = new Enemy(CANVAS_WIDTH, y);
        enemies.push(enemy);
        enemySpawnCounter = 0;
    }

    enemies.forEach((enemy, i) => {
        enemy.update();
        if (enemy.x < -enemy.width) {
            enemies.splice(i, 1);
            return;
        }
        enemy.draw();

        bullets.forEach((bullet, j) => {
            if (checkCollision(bullet, enemy)) {
                createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);

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

}

globalThis.on_event = function on_event(type: number, key_code: number, modifiers: number): void {
    if (type === _SAPP_EVENTTYPE_KEY_DOWN) {
        if (!keys[key_code]) {
            keys[key_code] = 1;
            if (key_code === _SAPP_KEYCODE_SPACE) {
                bullets.push(new Bullet(ship.x + ship.width, ship.y + ship.height / 2 - 2.5));
            }
        }
    } else if (type === _SAPP_EVENTTYPE_KEY_UP) {
        keys[key_code] = 0;
    }
}

_scroller_run(c_null);
