# gpt-scroller
A simple side scroller game developed by ChatGPT4

These are the steps I took with GPT4. GPT4's responses are omitted most of the time, but the state of the source aaccurately represents the changes it asked me to do each time.

### Q: Can you create an example side scrolling game, with a ship that can shoot and drop bombs?

A: As an AI language model, I can't create a game directly, but I can provide you with a simple example of a side-scrolling game with a ship that can shoot and drop bombs using Python and the Pygame library. First, make sure you have Python and Pygame installed on your computer.

Here's a basic example of the game:
```
... a game using PyGame ...
```

Before running the script, make sure you have a ship image named 'ship.png' in the same directory as the script. This image will represent the player's ship in the game. You can create a simple image in any image editor, or you can find one online.

To run the game, save the code in a file called side_scrolling_game.py and execute it using Python:
```
python side_scrolling_game.py
```

This example demonstrates a basic side-scrolling game structure with a ship that can shoot bullets (by pressing the SPACE key) and drop bombs (by pressing the 'B' key). The ship can move in all four directions using the arrow keys. The game loop updates and renders all game objects, including the player's ship, bullets, and bombs. Bullets move upward and are removed when they reach the top of the screen, while bombs move downward and are removed when they reach the bottom.

To expand this game, you can add enemies, a scrolling background, collision detection, scoring, and other features. This example is just a starting point to help you understand the basic concepts and mechanics for a side-scrolling shooter with a ship that can shoot and drop bombs.

### Q: Can you provide the same example in JavaScript?

A: Sure, here's an example of a side-scrolling game with a ship that can shoot bullets and drop bombs using JavaScript and the HTML5 Canvas API. Create an HTML file with the following content:

```
... An HTML file with a JS game ...
```

Before running the code, make sure you have a ship image named 'ship.png' in the same directory as the HTML file. This image will represent the player's ship in the game. You can create a simple image in any image editor or find one online.

To run the game, open the HTML file in a web browser that supports the HTML5 Canvas API. The ship can move in all four directions using the arrow keys. Press the SPACE key to shoot bullets and the 'B' key to drop bombs. Bullets move upward and are removed when they reach the top of the screen, while bombs move downward and are removed when they reach the bottom.

This example demonstrates a basic side-scrolling game structure with a ship that can shoot bullets and drop bombs using JavaScript and the HTML5 Canvas API. The game loop updates and renders all game objects, including the player's ship, bullets, and bombs. To expand this game, you can add enemies, a scrolling background, collision detection, scoring, and other features. This example is just a starting point to help you understand the basic concepts and mechanics for a side-scrolling shooter with a ship that can shoot and drop bombs in JavaScript.

### Q: Can we change the bullets to shoot to the right?

A: Yes, you can change the bullets to shoot to the right by modifying the update method of the Bullet class. Here's the updated JavaScript code for the side-scrolling game with bullets shooting to the right:

...

The only change needed is to update the update method in the Bullet class. Instead of decrementing the y value, you need to increment the x value:
```javascript
update() {
  this.x += this.vel;
}
```

This change will make the bullets shoot to the right. Also, I've modified the width and height of the bullet to better match horizontal movement. Now, when you press the SPACE key, the bullets will shoot to the right.

### Q: Can we add enemies?

A: Sure! Here's an updated version of the side-scrolling game in JavaScript with enemies added. In this example, enemies will spawn at random heights on the right side of the canvas and move towards the left.

Before running the code, make sure you have an enemy image named 'enemy.png' in the same directory as the HTML file. This image will represent the enemy in the game. You can create a simple image in any image editor or find one online.

Here are the main changes to the code:

- Added an enemyImg variable to load the enemy image.
- Created an Enemy class with a constructor, draw() method, and update() method.
- Added an enemies array to store the enemy instances.
- Added a enemySpawnCounter variable to control the rate of enemy spawning.
- Updated the gameLoop() function to handle enemy spawning, updating, drawing, and removing enemies that move off the screen.

### Q: Good job! Can we kill the enemies with bullets?
> NOTE: this question was flagged as possibly violating the content policy, for obvious reasons, but the bot understood it correctly in the context.

A: Absolutely! To kill enemies with bullets, we'll need to implement collision detection between bullets and enemies. When a bullet collides with an enemy, both the bullet and enemy should be removed from the game. Here's the updated code to handle this:

...

Here are the main changes to the code:

- Added a checkCollision() function that takes two rectangular objects and checks if they are colliding.
- Updated the bullet handling code in the gameLoop() function to check for collisions between each bullet and enemy using the checkCollision() function.
- If a collision is detected, both the bullet and enemy are removed from their respective arrays using splice().
- Now, when bullets collide with enemies, they will both be removed from the game.

### Q: Good job! Can we add a background?

A: Certainly! To add a background, you'll need an image file to use as the background. In this example, I'll show you how to add a scrolling background using an image. Make sure you have a background image named 'background.png' in the same directory as the HTML file.

Here's the updated code to add a scrolling background to the side-scrolling game:

...

Here are the main changes to the code:

- Added a backgroundImg variable to load the background image.
- Added a backgroundX variable to store the current x-coordinate of the background.
- Added a backgroundSpeed variable to control the speed of the scrolling background.
- Updated the gameLoop() function to draw the background and update its position.
- Now, the game will have a scrolling background. The background will scroll to the left at a constant speed, creating a parallax effect. The scrolling will loop, creating an infinitely scrolling background.

### Q: It all works very well. I discovered one small problem. In the Ship constructor, for some reason shipImg.width and shipImg.height are always 0.

A: You're right, and that's because the shipImg.width and shipImg.height are being accessed before the image has finished loading. To fix this issue, you can either use fixed values for the ship width and height or access the image dimensions after the image has been loaded.

Here's an example with fixed width and height values:
```javascript
class Ship {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vel = 5;
    this.width = 64; // fixed width
    this.height = 64; // fixed height
  }

  // ... rest of the Ship class code
}
```
Alternatively, if you want to access the image dimensions after the image has been loaded, you can use a callback function in the Ship constructor:
```javascript
class Ship {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.vel = 5;
    this.width = width;
    this.height = height;
  }

  // ... rest of the Ship class code
}

// ... rest of the code

shipImg.onload = () => {
  const ship = new Ship(canvas.width / 2, canvas.height - 100, shipImg.width, shipImg.height);
  gameLoop(ship);
};

function gameLoop(ship) {
  // ... rest of the game loop code, using the ship object passed as a parameter
}
```
In this alternative approach, the Ship constructor takes width and height as additional parameters. We wait for the shipImg.onload event to fire, and then we create the Ship object with the correct width and height.

Make sure to update the gameLoop function to take the ship object as a parameter and use it throughout the function.

### Status

At this point I followed the first recommendation, since it was simple Full disclosure, I adjusted the bullet origination point in the ship myself. Could have asked ChatGPT to do it, but I lost patience. This is the new line:
```javascript
const bullet = new Bullet(ship.x + ship.width, ship.y + ship.height / 2);
```

Things were working pretty well now, so I published [a small video of gameplay on Twitter](https://twitter.com/tmikov/status/1636593764973285376?s=20).

Then I went back to the bot's second suggestion.

### Q: There is another problem now. When we moved the declaration of ship, it is no longer accessible to the keydown event listener

A: You're right. The ship object is now only accessible within the scope of the shipImg.onload event handler. To fix this, you can move the key event listeners inside the shipImg.onload event handler. Here's the updated code:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Side Scrolling Game</title>
  <style>
    canvas {
      display: block;
      margin: auto;
    }
  </style>
</head>
<body>
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const shipImg = new Image();
    shipImg.src = 'ship.png';

    const enemyImg = new Image();
    enemyImg.src = 'enemy.png';

    const backgroundImg = new Image();
    backgroundImg.src = 'background.png';

    // ... Rest of the Ship, Bullet, Enemy, and Bomb class code

    const bullets = [];
    const bombs = [];
    const enemies = [];

    let enemySpawnCounter = 0;
    const enemySpawnRate = 120;

    let backgroundX = 0;
    const backgroundSpeed = 1;

    shipImg.onload = () => {
      const ship = new Ship(canvas.width / 2, canvas.height - 100, shipImg.width, shipImg.height);

      const keys = {};

      document.addEventListener('keydown', (e) => {
        keys[e.code] = true;

        if (e.code === 'Space' && !keys['Space']) {
          const bullet = new Bullet(ship.x + ship.width, ship.y + ship.height / 2 - 2.5);
          bullets.push(bullet);
        }

        if (e.code === 'KeyB' && !keys['KeyB']) {
          const bomb = new Bomb(ship.x + ship.width / 2 - 5, ship.y + ship.height);
          bombs.push(bomb);
        }
      });

      document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
      });

      // ... Rest of the checkCollision() function code

      gameLoop(ship);
    };

    function gameLoop(ship) {
      // ... rest of the game loop code, using the ship object passed as a parameter
    }

  </script>
</body>
</html>
```
Now, the key event listeners are declared inside the shipImg.onload event handler, so the ship object is accessible to them. This should resolve the issue and allow the game to function correctly.

### Q: That approach wouldn't scale if we wanted to know the dimensions of more loaded images.

A: You're right. If you need to load multiple images and make sure they're all loaded before running the game loop, you can use a function to load all images and wait for all of them to load before proceeding. Here's a solution using Promises:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Side Scrolling Game</title>
  <style>
    canvas {
      display: block;
      margin: auto;
    }
  </style>
</head>
<body>
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  <script>
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

    // ... Rest of the Ship, Bullet, Enemy, and Bomb class code

    const bullets = [];
    const bombs = [];
    const enemies = [];

    let enemySpawnCounter = 0;
    const enemySpawnRate = 120;

    let backgroundX = 0;
    const backgroundSpeed = 1;

    loadImages(images).then((loadedImages) => {
      const shipImg = loadedImages.ship;
      const ship = new Ship(canvas.width / 2, canvas.height - 100, shipImg.width, shipImg.height);

      // ... Rest of the key event listeners, checkCollision(), and gameLoop() function code

      gameLoop(ship);
    });

  </script>
</body>
</html>
```
Here's what's changed:

- Created an images object to store the image paths.
- Created a loadImage function that takes a source path and returns a Promise that resolves with the loaded image.
- Created an async loadImages function that takes an object with image paths and returns an object with the same keys and loaded images as values.
- Replaced the shipImg.onload event handler with a call to loadImages that uses .then() to wait for all images to load before proceeding.

Now, the game loop will only run after all images are loaded, and you can access the dimensions of each image using the loadedImages object. This approach scales well with multiple images and makes it easy to manage and load them.

### Q: Can you print the entire source?

A: Certainly! Here's the complete source code with the improvements for loading multiple images:

...

This is the complete source code with the improved image loading mechanism and all other features included in the previous steps.

### Q: When I run it, I get an error "ReferenceError: shipImg is not defined"

A: Apologies for the oversight. I see the problem now. We need to update the draw method of the Ship class to use the loaded image. Similarly, the draw method of the Enemy class should also be updated. Here's the fix:

- Update the Ship class's draw method to take the shipImg as a parameter.
- Update the Enemy class's draw method to take the enemyImg as a parameter.
- Update the calls to the ship.draw() and enemy.draw() methods in the gameLoop function to pass the required images as arguments.

Here's the updated code:

...

By making these changes, the ReferenceError should be resolved, and the game should run without errors.

### Q: I am afraid there is another bug in the code, since you changed it a little from the previously working version. I know where the bug is, but I want to see whether you can find it. Shooting bullets and dropping bombs is not working anymore. Pressing space for bullets or 'b' for bombs has no effect.

A: My apologies for the confusion. I see the issue now. The problem is that the key event listeners are checking the keys object for truthiness rather than checking if the key is not already pressed. Here's the fix:

Update the keydown event listener to check if the key is not already pressed using the !keys[e.code] condition.
Here's the updated code for the key event listeners:
```javascript
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
```
By making this change, the shooting bullets and dropping bombs functionality should work as expected.

### Q: Nice, it is working as expected now!

A: I'm glad it's working correctly now! If you have any more questions or need further assistance, feel free to ask. I'm here to help. Enjoy your side-scrolling game!
