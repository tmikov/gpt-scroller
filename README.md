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