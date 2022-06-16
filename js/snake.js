const container = document.getElementById("canvas-container"); // to get the screen size
const canvas = document.getElementById("snake");
const context = canvas.getContext("2d");

const unit = 32;
const width = Math.floor(container.offsetWidth / unit);
const height = Math.floor(container.offsetHeight / unit);
canvas.width = width * unit;
canvas.height = height * unit;

const centerX = Math.floor(width / 2);
const centerY = Math.floor(height / 2);

const foodImage = new Image();
foodImage.src = "img/food.png";

const head = "orange";
const body = "white";

let snake = [];
let food;

let score;

let direction;

let gameOver = false;
let speed = 8;

function clearScreen() {
	context.fillStyle = "black";
	context.fillRect(0,0, width * unit, height * unit);
}

function setupGame() {

	snake = [];
	snake[0] = {
		x : centerX * unit,
		y : centerY * unit
	};
	score = 0;
	food = getNewFood();
	document.addEventListener("keydown", move);
	setTimeout(draw, speed);
}


function move(event) {
	let key = event.keyCode;
	if (key == 37 && direction != "RIGHT") direction = "LEFT"
	if (key == 38 && direction != "DOWN") direction = "UP"
	if (key == 39 && direction != "LEFT") direction = "RIGHT"
	if (key == 40 && direction != "UP") direction = "DOWN"
	if (key == 13 && gameOver) {
		gameOver = false;
		setupGame();
	}
}


function isDeadYet(snakeHead) {
	if (snakeHead.x < 0 || snakeHead.x == width * unit || snakeHead.y < 0 || snakeHead.y == height * unit) {
		return true;
	}
	for (let i=1; i<snake.length; i++) {
		if (snakeHead.x == snake[i].x && snakeHead.y == snake[i].y) {
			return true;
		}
	}
	return false;
}

function getNewFood() {
	return {
		x : Math.floor(Math.random() * width) * unit,
		y : Math.floor(Math.random() * height) * unit 
	}
}	

function draw() {
	clearScreen();
	for (let i=0; i < snake.length; i++) {
		context.fillStyle = (i == 0) ? head : body;
		context.fillRect(snake[i].x, snake[i].y, unit, unit);
		
		context.strokeStyle = "black";
		context.strokeRect(snake[i].x, snake[i].y, unit, unit);
	}
	
	context.drawImage(foodImage, food.x, food.y);
	
	let oldHeadX = snake[0].x;
	let oldHeadY = snake[0].y;
	
	if (direction == "UP") oldHeadY -= unit;
	if (direction == "DOWN") oldHeadY += unit;
	if (direction == "LEFT") oldHeadX -= unit;
	if (direction == "RIGHT") oldHeadX += unit;
	
	let newHead = {
		x : oldHeadX,
		y : oldHeadY
	}
	
	if (isDeadYet(newHead)) {
		gameOver = true;
		context.fillText("Game over. Press Enter to play again", 3 * unit, 3 * unit);
		return;
	}
	
	snake.unshift(newHead);
	
	// snake eats the food
	if (newHead.x == food.x && newHead.y == food.y) {
		score += 1;
		// remove the food
		food = getNewFood();
		context.drawImage(foodImage, food.x, food.y);
		if (score > 3) speed+=1;
	} else {
		// remove the tail because the snake length doesn't change
		snake.pop();
	}
	
	// draw score
	context.fillStyle = "white"
	context.font = "10px Sans serif"
	context.fillText("Score " + score, 3 * unit, 3 * unit)
	setTimeout(draw, 1000/speed);
}


setupGame();