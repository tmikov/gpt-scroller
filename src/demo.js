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
        // _draw_blit_px(shipImage.handle, this.x, this.y, this.width, this.height);
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
        // _draw_fill_px(this.x, this.y, this.width, this.height, 1, 1, 0, 1);
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
        // _draw_blit_px(enemyImage.handle, this.x, this.y, this.width, this.height);
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
        // _draw_fill_px(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size, 1, 0.5, 0, this.alpha);
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
    return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y);
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

function IM_COL32(r, g, b, a) {
    "inline";
    return ((a & 0xFF) << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF);
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

function renderSpreadsheet(name, curTime) {
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

globalThis.on_frame = function on_frame(width: number, height: number, curTime: number): void {
    flushAllocTmp();
    chooseColorWindow();
    bouncingBallWindow(width, height);
    renderSpreadsheet("Cities", curTime);
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

_scroller_run(c_null, CANVAS_WIDTH, CANVAS_HEIGHT);
