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