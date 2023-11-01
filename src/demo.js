const _scroller_run = $SHBuiltin.extern_c({passRuntime: true}, function scroller_run(shr: c_ptr, width: c_int, height: c_int): void {
});
const _get_bg_color = $SHBuiltin.extern_c({}, function get_bg_color(): c_ptr {
    throw 0;
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
const _image_simgui_image = $SHBuiltin.extern_c({}, function image_simgui_image(image: c_int): c_ptr {
    throw 0;
});

class Image {
    handle: number;
    width: number;
    height: number;
    simguiImage: c_ptr;

    constructor(path: string) {
        let path_z = stringToAsciiz(path);
        try {
            this.handle = _load_image(path_z);
        } finally {
            _free(path_z);
        }
        this.width = _image_width(this.handle);
        this.height = _image_height(this.handle);
        this.simguiImage = _image_simgui_image(this.handle);
    }
}

const PHYS_FPS = 60;
const PHYS_DT = 1.0 / PHYS_FPS;
const ASSUMED_W = 800;
const INV_ASSUMED_W = 1.0 / ASSUMED_W;
const ASSUMED_H = 600;
const INV_ASSUMED_H = 1.0 / ASSUMED_H;

const keys = new Uint8Array(_SAPP_MAX_KEYCODES);
let s_pause = false;

let shipImage: Image;
let enemyImage: Image;
let backgroundImage: Image;

let s_winOrg_x = 0;
let s_winOrg_y = 0;
let s_winSize_x = 0;
let s_winSize_y = 0;
let s_scale_x = 0;
let s_scale_y = 0;

function mathRandom(range: number): number {
    "inline";
    return Math.random() * range;
}

function IM_COL32(r, g, b, a) {
    "inline";
    return ((a & 0xFF) << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF);
}

const s_vecs = calloc(_sizeof_ImVec2 * 4);

function pushRectImage(x: number, y: number, w: number, h: number, img: c_ptr): void {
    x = x * s_scale_x + s_winOrg_x;
    y = y * s_scale_y + s_winOrg_y;
    w *= s_scale_x;
    h *= s_scale_y;

    // min
    set_ImVec2_x(s_vecs, x);
    set_ImVec2_y(s_vecs, y);
    // max
    set_ImVec2_x(_sh_ptr_add(s_vecs, _sizeof_ImVec2), x + w);
    set_ImVec2_y(_sh_ptr_add(s_vecs, _sizeof_ImVec2), y + h);
    // uv_min
    set_ImVec2_x(_sh_ptr_add(s_vecs, 2 * _sizeof_ImVec2), 0);
    set_ImVec2_y(_sh_ptr_add(s_vecs, 2 * _sizeof_ImVec2), 0);
    // uv_max
    set_ImVec2_x(_sh_ptr_add(s_vecs, 3 * _sizeof_ImVec2), 1);
    set_ImVec2_y(_sh_ptr_add(s_vecs, 3 * _sizeof_ImVec2), 1);

    _ImDrawList_AddImage(
        _igGetWindowDrawList(),
        _simgui_imtextureid(img),
        s_vecs,
        _sh_ptr_add(s_vecs, _sizeof_ImVec2),
        _sh_ptr_add(s_vecs, _sizeof_ImVec2 * 2),
        _sh_ptr_add(s_vecs, _sizeof_ImVec2 * 3),
        IM_COL32(255, 255, 255, 255)
    );
}

function pushRectWithColor(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void {
    x = x * s_scale_x + s_winOrg_x;
    y = y * s_scale_y + s_winOrg_y;
    w *= s_scale_x;
    h *= s_scale_y;

    // min
    set_ImVec2_x(s_vecs, x);
    set_ImVec2_y(s_vecs, y);
    // max
    set_ImVec2_x(_sh_ptr_add(s_vecs, _sizeof_ImVec2), x + w);
    set_ImVec2_y(_sh_ptr_add(s_vecs, _sizeof_ImVec2), y + h);

    _ImDrawList_AddRectFilled(
        _igGetWindowDrawList(),
        s_vecs,
        _sh_ptr_add(s_vecs, _sizeof_ImVec2),
        IM_COL32(255 * r, 255 * g, 255 * b, 255 * a),
        0.0,
        0
    );
}

function drawFillPx(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void {
    "inline";
    pushRectWithColor(x, y, w, h, r, g, b, a);
}

function drawBlitPx(image: Image, x: number, y: number, w: number, h: number): void {
    "inline";
    pushRectImage(x, y, w, h, image.simguiImage);
}

class Actor {
    oldX: number;
    oldY: number;
    x: number;
    y: number;
    width: number;
    height: number;
    velX: number;
    velY: number;

    constructor(x: number, y: number, width: number, height: number, velX: number, velY: number) {
        this.oldX = x;
        this.oldY = y;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velX = velX;
        this.velY = velY;
    }

    _superUpdate(save: boolean): void {
        if (save) {
            this.oldX = this.x;
            this.oldY = this.y;
        }
        this.x += this.velX;
        this.y += this.velY;
    }

    update(save: boolean): void {
        this._superUpdate(save);
    }

    curX(dt: number): number {
        return this.x + (this.x - this.oldX) * dt;
    }

    curY(dt: number): number {
        return this.y + (this.y - this.oldY) * dt;
    }
}

class Ship extends Actor {
    speed: number;

    constructor(x: number, y: number) {
        super(x, y, shipImage.width, shipImage.height, 0, 0);
        this.speed = 5 * 2;
    }

    update(save: boolean): void {
        if (keys[_SAPP_KEYCODE_LEFT]) {
            this.velX = -this.speed;
        } else if (keys[_SAPP_KEYCODE_RIGHT]) {
            this.velX = this.speed;
        } else {
            this.velX = 0;
        }

        if (keys[_SAPP_KEYCODE_UP]) {
            this.velY = -this.speed;
        } else if (keys[_SAPP_KEYCODE_DOWN]) {
            this.velY = this.speed;
        } else {
            this.velY = 0;
        }

        this._superUpdate(save);
    }

    draw(dt: number): void {
        drawBlitPx(shipImage, this.curX(dt), this.curY(dt), this.width, this.height);
    }
}

class Enemy extends Actor {
    constructor(x: number, y: number) {
        super(x, y, 64, 64, -2 * 2, 0);
    }

    draw(dt: number): void {
        drawBlitPx(enemyImage, this.curX(dt), this.curY(dt), this.width, this.height);
    }
}

class Bullet extends Actor {
    constructor(x: number, y: number) {
        super(x, y, 5, 5, 8 * 2, 0);
    }

    draw(dt: number): void {
        drawFillPx(this.curX(dt), this.curY(dt), this.width, this.height, 1, 1, 0, 1);
    }
}

class Particle extends Actor {
    life: number;
    maxLife: number;
    alpha: number;

    constructor(x: number, y: number) {
        super(x, y, 0, 0, (mathRandom(4) - 2) * 2, (mathRandom(4) - 2) * 2);
        this.life = 0;
        this.maxLife = (mathRandom(30) + 50) / 2;
        this.alpha = 1;
        this.width = this.height = mathRandom(2) + 1;
    }

    update(save: boolean): void {
        this._superUpdate(save);
        this.life++;
        this.alpha = 1 - (this.life / this.maxLife);
    }

    draw(dt: number): void {
        drawFillPx(this.curX(dt) - this.width / 2, this.curY(dt) - this.height / 2, this.width, this.height, 1, 0.5, 0, this.alpha);
    }

    isAlive(): boolean {
        return this.life < this.maxLife;
    }
}

class Explosion {
    x: number;
    y: number;
    particles: Particle[];
    alive: boolean;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        let tmp: Particle[] = [];
        this.particles = tmp;
        for (let i = 0; i < 50; ++i) {
            this.particles.push(new Particle(x, y));
        }
        this.alive = true;
    }

    update(save: boolean): void {
        let alive = false;
        for (let i = 0; i < this.particles.length; ++i) {
            if (this.particles[i].isAlive()) {
                this.particles[i].update(save);
                // This crashes the compiler:
                //alive |= this.particles[i].isAlive();
                alive = alive || this.particles[i].isAlive();
            }
        }
        this.alive = alive;
    }

    draw(dt: number): void {
        for (let i = 0, e = this.particles.length; i < e; ++i) {
            let particle: Particle = this.particles[i];
            if (particle.isAlive())
                particle.draw(dt);
        }
    }

    isAlive(): boolean {
        return this.alive;
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

function checkCollision(a: Actor, b: Actor): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function createExplosion(x: number, y: number): void {
    explosions.push(new Explosion(x, y));
}

globalThis.on_init = function on_init(): void {
    shipImage = new Image("../ship.png");
    enemyImage = new Image("../enemy.png");
    backgroundImage = new Image("../background.png");
    ship = new Ship(ASSUMED_W / 2, ASSUMED_H / 2);
}

let s_oldBackgroundX: number = 0;
let s_backgroundX: number = 0;
let s_backgroundSpeed: number = 2;
let s_enemySpawnCounter: number = 0;
let s_enemySpawnRate: number = 120;

function update_game_state(save: boolean): void {
    if (save) {
        s_oldBackgroundX = s_backgroundX;
    }
    s_backgroundX -= s_backgroundSpeed;
    if (s_backgroundX <= -backgroundImage.width) {
        s_backgroundX += backgroundImage.width;
        s_oldBackgroundX += backgroundImage.width;
    }

    ship.update(save);

    for (let i = 0; i < bullets.length;) {
        bullets[i].update(save);
        if (bullets[i].x > ASSUMED_W) {
            bullets.splice(i, 1);
            continue;
        }
        i++;
    }

    s_enemySpawnCounter++;
    if (s_enemySpawnCounter >= s_enemySpawnRate) {
        const y = mathRandom(ASSUMED_H - 64);
        enemies.push(new Enemy(ASSUMED_W, y));
        s_enemySpawnCounter = 0;
    }

    for (let i = 0; i < enemies.length;) {
        enemies[i].update(save);

        if (enemies[i].x < -enemies[i].width) {
            enemies.splice(i, 1);
            continue;
        }

        let destroy = false;
        if (checkCollision(ship, enemies[i])) {
            createExplosion(enemies[i].x + enemies[i].width / 2, enemies[i].y + enemies[i].height / 2);
            destroy = true;
        } else {
            for (let j = 0; j < bullets.length;) {
                if (checkCollision(bullets[j], enemies[i])) {
                    if (!destroy) {
                        createExplosion(enemies[i].x + enemies[i].width / 2, enemies[i].y + enemies[i].height / 2);
                    }
                    bullets.splice(j, 1);
                    destroy = true;
                    continue;
                }
                j++;
            }
        }
        if (destroy) {
            enemies.splice(i, 1);
            continue;
        }
        i++;
    }

    for (let i = 0; i < explosions.length;) {
        explosions[i].update(save);
        if (!explosions[i].isAlive()) {
            explosions.splice(i, 1);
            continue;
        }
        i++;
    }
}

function render_game_frame(dt: number): void {
    const bkgX = s_oldBackgroundX + (s_backgroundX - s_oldBackgroundX) * dt;
    drawBlitPx(backgroundImage, bkgX, 0, backgroundImage.width, ASSUMED_H);
    drawBlitPx(
        backgroundImage,
        bkgX + backgroundImage.width,
        0,
        backgroundImage.width,
        ASSUMED_H
    );

    ship.draw(dt);

    for (const bullet of bullets) {
        bullet.draw(dt);
    }

    for (const enemy of enemies) {
        enemy.draw(dt);
    }

    for (const explosion of explosions) {
        explosion.draw(dt);
    }
}

let s_last_game_time = 0.0;
let s_game_time = 0.0;

function gameWindow(app_w: number, app_h: number, render_time: number): void {
    let save = true;
    while (s_game_time <= render_time) {
        if (save)
            s_last_game_time = s_game_time;
        s_game_time += PHYS_DT;
        if (!s_pause)
            update_game_state(save);
        save = false;
    }

    const renderDT = render_time >= s_last_game_time && s_game_time > s_last_game_time
        ? (render_time - s_last_game_time) / (s_game_time - s_last_game_time)
        : 0;

    let tmpVec = allocTmp(_sizeof_ImVec2 * 2);
    set_ImVec2_x(tmpVec, app_w * 0.55);
    set_ImVec2_y(tmpVec, app_h * 0.6);
    _igSetNextWindowPos(tmpVec, _ImGuiCond_Once, _sh_ptr_add(tmpVec, _sizeof_ImVec2));
    set_ImVec2_x(tmpVec, app_w * 0.35);
    set_ImVec2_y(tmpVec, app_h * 0.35);
    _igSetNextWindowSize(tmpVec, _ImGuiCond_Once);

    if (_igBegin(tmpAsciiz("Game"), c_null, 0)) {
        // Get the top-left corner and size of the window
        _igGetCursorScreenPos(tmpVec);
        s_winOrg_x = get_ImVec2_x(tmpVec);
        s_winOrg_y = get_ImVec2_y(tmpVec);
        _igGetContentRegionAvail(tmpVec);
        s_winSize_x = get_ImVec2_x(tmpVec);
        s_winSize_y = get_ImVec2_y(tmpVec);

        s_scale_x = s_winSize_x * INV_ASSUMED_W;
        s_scale_y = s_winSize_y * INV_ASSUMED_H;

        render_game_frame(renderDT);
    }
    _igEnd();
}

const s_text_size = 1024;
const s_text = calloc(s_text_size);
copyToAsciiz("This is some text for editing.\nAnd more.", s_text, s_text_size);

function chooseColorWindow() {
    // Create ImVec2 buffer for window position and size
    const vec2Buffer = allocTmp(_sizeof_ImVec2);

    // Setup and use as pos
    set_ImVec2_x(vec2Buffer, 10);
    set_ImVec2_y(vec2Buffer, 10);
    _igSetNextWindowPos(vec2Buffer, _ImGuiCond_Once, allocTmp(_sizeof_ImVec2));

    // Setup and use as size
    set_ImVec2_x(vec2Buffer, 400);
    set_ImVec2_y(vec2Buffer, 200);
    _igSetNextWindowSize(vec2Buffer, _ImGuiCond_Once);

    _igBegin(tmpAsciiz("Settings"), c_null, _ImGuiWindowFlags_None);
    _igColorEdit3(tmpAsciiz("Bg"), _get_bg_color(), _ImGuiColorEditFlags_None);
    _igInputTextMultiline(tmpAsciiz("Text"), s_text, s_text_size, allocTmp(_sizeof_ImVec2), 0, c_null, c_null);
    _igEnd();
}

let ball_x = 0.0;
let ball_y = 0.0;
let velocity_x = 2.0;
let velocity_y = 1.5;

function bouncingBallWindow(app_w: number, app_h: number) {
    // Window Position and Size
    const vec2Buffer = allocTmp(_sizeof_ImVec2);

    // Set next window pos
    set_ImVec2_x(vec2Buffer, app_w * 0.7);
    set_ImVec2_y(vec2Buffer, app_h * 0.05);
    _igSetNextWindowPos(vec2Buffer, _ImGuiCond_Once, allocTmp(_sizeof_ImVec2));

    // Set next window size
    set_ImVec2_x(vec2Buffer, app_w * 0.3);
    set_ImVec2_y(vec2Buffer, app_h * 0.3);
    _igSetNextWindowSize(vec2Buffer, _ImGuiCond_Once);

    if (_igBegin(tmpAsciiz("Bouncing Ball"), c_null, 0)) {
        // Draw List
        const draw_list = _igGetWindowDrawList();

        // Get position & win_size
        const p = allocTmp(_sizeof_ImVec2);
        const win_size = allocTmp(_sizeof_ImVec2);
        _igGetCursorScreenPos(p);
        _igGetContentRegionAvail(win_size);

        // Draw borders
        const white = IM_COL32(255, 255, 255, 255);
        const border_thickness = 4.0;

        _ImDrawList_AddRectFilled(draw_list, p, addVectors(p, get_ImVec2_x(win_size), border_thickness), white, 0, 0);
        _ImDrawList_AddRectFilled(draw_list, p, addVectors(p, border_thickness, get_ImVec2_y(win_size)), white, 0, 0);
        _ImDrawList_AddRectFilled(draw_list, addVectors(p, 0, get_ImVec2_y(win_size) - border_thickness), addVectors2(p, win_size), white, 0, 0);
        _ImDrawList_AddRectFilled(draw_list, addVectors(p, get_ImVec2_x(win_size) - border_thickness, 0), addVectors2(p, win_size), white, 0, 0);

        // Update ball
        ball_x += velocity_x;
        ball_y += velocity_y;

        const radius = 10.0;

        // Bounce X
        if (ball_x - radius <= 0 || ball_x + radius >= get_ImVec2_x(win_size)) {
            velocity_x *= -1;
            ball_x = (ball_x - radius <= 0) ? radius : get_ImVec2_x(win_size) - radius;
        }

        // Bounce Y
        if (ball_y - radius <= 0 || ball_y + radius >= get_ImVec2_y(win_size)) {
            velocity_y *= -1;
            ball_y = (ball_y - radius <= 0) ? radius : get_ImVec2_y(win_size) - radius;
        }

        // Draw ball
        _ImDrawList_AddCircleFilled(draw_list, addVectors(p, ball_x, ball_y), radius, IM_COL32(0, 255, 0, 255), 12);
    }
    _igEnd();
}

// Helper function for adding vectors
function addVectors(v1: c_ptr, x: number, y: number): c_ptr {
    const newVec = allocTmp(_sizeof_ImVec2);
    set_ImVec2_x(newVec, get_ImVec2_x(v1) + x);
    set_ImVec2_y(newVec, get_ImVec2_y(v1) + y);
    return newVec;
}

function addVectors2(v1: c_ptr, v2: c_ptr): c_ptr {
    const newVec = allocTmp(_sizeof_ImVec2);
    set_ImVec2_x(newVec, get_ImVec2_x(v1) + get_ImVec2_x(v2));
    set_ImVec2_y(newVec, get_ImVec2_y(v1) + get_ImVec2_y(v2));
    return newVec;
}

const NUM_ROWS = 40;
const NUM_COLS = 8;
let s_numbers = Array.from({length: NUM_ROWS}, () => new Float32Array(NUM_COLS));

const s_capitals = [
    "Tokyo", "Delhi", "Shanghai", "Sao Paulo", "Mumbai", "Mexico City",
    "Beijing", "Osaka", "Cairo", "New York", "Dhaka", "Karachi",
    "Buenos Aires", "Kolkata", "Istanbul", "Rio de Janeiro", "Manila",
    "Tianjin", "Kinshasa", "Lahore", "Jakarta", "Seoul", "Wenzhou",
    "Shenzhen", "Chengdu", "Lima", "Bangkok", "London", "Hong Kong",
    "Chongqing", "Hangzhou", "Ho Chi Minh City", "Ahmedabad", "Kuala Lumpur",
    "Pune", "Riyadh", "Miami", "Santiago", "Alexandria", "Saint Petersburg"];

// Initialize colors
const s_colors = [
    IM_COL32(255, 0, 0, 255),
    IM_COL32(0, 255, 0, 255),
    IM_COL32(255, 255, 255, 255)
];

function getColor(num) {
    if (num < 33.0) return s_colors[0];
    if (num < 66.0) return s_colors[1];
    return s_colors[2];
}

function randomizeNumbers() {
    for (let i = 0; i < NUM_ROWS; ++i) {
        for (let j = 0; j < NUM_COLS; ++j) {
            s_numbers[i][j] += (Math.random() - 0.5) * 2;
            s_numbers[i][j] = Math.min(100, Math.max(0, s_numbers[i][j]));
        }
    }
}

let inited = false;
let lastTime = 0;

function renderSpreadsheet(name: string, app_w: number, app_h: number, curTime: number) {
    if (!inited) {
        inited = true;
        for (let i = 0; i < NUM_ROWS; ++i) {
            for (let j = 0; j < NUM_COLS; ++j) {
                s_numbers[i][j] = Math.random() * 100;
            }
        }
    }

    if (curTime - lastTime >= 1) {
        lastTime = curTime;
        randomizeNumbers();
    }

    // Window Position and Size
    const vec2Buffer = allocTmp(_sizeof_ImVec2);

    set_ImVec2_x(vec2Buffer, 100);
    set_ImVec2_y(vec2Buffer, 150);
    _igSetNextWindowPos(vec2Buffer, _ImGuiCond_Once, allocTmp(_sizeof_ImVec2));

    // Set next window size
    set_ImVec2_x(vec2Buffer, 512);
    set_ImVec2_y(vec2Buffer, 540);
    _igSetNextWindowSize(vec2Buffer, _ImGuiCond_Once);

    if (_igBegin(tmpAsciiz(name), c_null, 0)) {
        if (_igBeginTable(tmpAsciiz("spreadsheet"), NUM_COLS + 1, _ImGuiTableFlags_Resizable, allocTmp(_sizeof_ImVec2), 0)) {
            _igTableSetupColumn(tmpAsciiz("Labels"), _ImGuiTableColumnFlags_WidthFixed, 0, 0);
            for (let i = 0; i < NUM_COLS; ++i) {
                _igTableSetupColumn(tmpAsciiz("Column"), _ImGuiTableColumnFlags_WidthStretch, 0, 0);
            }
            _igTableHeadersRow();

            for (let row = 0; row < NUM_ROWS; ++row) {
                _igTableNextRow(_ImGuiTableRowFlags_None, 0);
                _igTableSetColumnIndex(0);
                _igText(tmpAsciiz(s_capitals[row % s_capitals.length]));

                for (let col = 0; col < NUM_COLS; ++col) {
                    _igTableSetColumnIndex(col + 1);

                    let color = getColor(s_numbers[row][col]);
                    _igPushStyleColor_U32(_ImGuiCol_Text, color);
                    _igText(tmpAsciiz(s_numbers[row][col].toFixed(2)));
                    _igPopStyleColor(1);
                }
            }
            _igEndTable();
        }
        _igEnd();
    }
}

let nbody_advance = nbodyRunner();

function nbodyWindow(app_w: number, app_h: number) {
    // Window Position and Size
    const vec2Buffer = allocTmp(_sizeof_ImVec2);

    // Set next window pos
    set_ImVec2_x(vec2Buffer, app_w * 0.05);
    set_ImVec2_y(vec2Buffer, app_h * 0.50);
    _igSetNextWindowPos(vec2Buffer, _ImGuiCond_Once, allocTmp(_sizeof_ImVec2));

    // Set next window size
    set_ImVec2_x(vec2Buffer, app_w * 0.45);
    set_ImVec2_y(vec2Buffer, app_h * 0.45);
    _igSetNextWindowSize(vec2Buffer, _ImGuiCond_Once);

    if (_igBegin(tmpAsciiz("nbody"), c_null, 0)) {
        // Draw List
        const draw_list = _igGetWindowDrawList();

        // Get position & win_size
        const p = allocTmp(_sizeof_ImVec2);
        const win_size = allocTmp(_sizeof_ImVec2);
        _igGetCursorScreenPos(p);
        _igGetContentRegionAvail(win_size);

        // Draw borders
        const white = IM_COL32(255, 255, 255, 255);
        const border_thickness = 4.0;

        _ImDrawList_AddRectFilled(draw_list, p, addVectors(p, get_ImVec2_x(win_size), border_thickness), white, 0, 0);
        _ImDrawList_AddRectFilled(draw_list, p, addVectors(p, border_thickness, get_ImVec2_y(win_size)), white, 0, 0);
        _ImDrawList_AddRectFilled(draw_list, addVectors(p, 0, get_ImVec2_y(win_size) - border_thickness), addVectors2(p, win_size), white, 0, 0);
        _ImDrawList_AddRectFilled(draw_list, addVectors(p, get_ImVec2_x(win_size) - border_thickness, 0), addVectors2(p, win_size), white, 0, 0);

        // Update bodies.
        const dt = 0.01;
        const bodies: Body[] = nbody_advance(dt);


        // Calculate bounds.
        const win_x = get_ImVec2_x(win_size);
        const win_y = get_ImVec2_y(win_size);

        let max_x = bodies[0].x;
        let max_y = bodies[0].y;
        let min_x = max_x;
        let min_y = max_y;

        for (let i = 0; i < bodies.length; ++i) {
            const body = bodies[i];
            max_x = body.x > max_x ? body.x : max_x;
            max_y = body.y > max_y ? body.y : max_y;
            min_x = body.x < min_x ? body.x : min_x;
            min_y = body.y < min_y ? body.y : min_y;
        }

        // Add padding so the bodies aren't right at the edge.
        const padding = 10.0;
        max_x += padding;
        max_y += padding;
        min_x -= padding;
        min_y -= padding;

        // Render bodies.
        for (let i = 0; i < bodies.length; ++i) {
            const body = bodies[i];
            const x = (body.x - min_x) / (max_x - min_x) * win_x;
            const y = (body.y - min_y) / (max_y - min_y) * win_y;
            // Detect the sun and render it specially.
            const radius = body.name === "Sun" ? 7.0 : 3.0;
            _ImDrawList_AddCircleFilled(draw_list, addVectors(p, x, y), radius, body.color, 12);
        }
    }
    _igEnd();
}

globalThis.on_frame = function on_frame(width: number, height: number, curTime: number): void {
    flushAllocTmp();
    gameWindow(width, height, curTime);
    renderSpreadsheet("Cities", width, height, curTime);
    chooseColorWindow();
    bouncingBallWindow(width, height);
    nbodyWindow(width, height);
}

globalThis.on_event = function on_event(type: number, key_code: number, modifiers: number): void {
    flushAllocTmp();
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

_scroller_run(c_null, 1024, 768);
