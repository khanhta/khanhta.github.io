const canvas = document.getElementById("snake")
const context = canvas.getContext("2d")

const unit = 32
const width = 17
const height = 17
const center = (width + height) / 2

const ground = new Image()
ground.src = "img/ground.png"

const foodImage = new Image()
foodImage.src = "img/food.png"

const head = "green"
const body = "white"

let snake = []
snake[0] = {
	x : center * unit,
	y : center * unit
}

let food = {
		x : Math.floor(Math.random() * width + 1) * unit,
		y : Math.floor(Math.random() * height + 1) * unit 
	}

let score = 0

let direction

function move(event) {
	let key = event.keyCode;
	if (key == 37 && direction != "RIGHT") direction = "LEFT"
	if (key == 38 && direction != "DOWN") direction = "UP"
	if (key == 39 && direction != "LEFT") direction = "RIGHT"
	if (key == 40 && direction != "UP") direction = "DOWN"
	
}

document.addEventListener("keydown", move)

function getNewFood() {
	food = {
		x : Math.floor(Math.random() * width + 1) * unit,
		y : Math.floor(Math.random() * height + 1) * unit 
	}
	context.drawImage(foodImage, food.x, food.y);
}	

function draw() {
	context.drawImage(ground,0,0);
	for (let i=0; i < snake.length; i++) {
		context.fillStyle = (i == 0) ? head : body;
		context.fillRect(snake[i].x, snake[i].y, unit, unit);
		
		context.strokeStyle = "red";
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
	
	snake.unshift(newHead);
	
	// snake eats the food
	if (newHead.x == food.x && newHead.y == food.y) {
		score += 1
		// remove the food
		getNewFood()
	} else {
		// remove the tail because the snake length doesn't change
		snake.pop()
	}
	
	// draw score
	context.fillStyle = "white"
	context.font = "45px Sans serif"
	context.fillText(score, 3 * unit, 3 * unit)
}

let game = setInterval(draw, 100)