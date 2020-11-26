   
/*******************************************************/
/*******************************************************/
/*******************************************************/
  
  
/*
USB Controller and Canvas
*/
// Get the canvas element form the page
const canvas = document.getElementById("canvas");
 
/* resize the canvas to occupy the full page, by getting the widow width and height and setting it to canvas*/
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

//get the canvas context, canvas context is an object with properties and methods that you can use to render graphics inside the canvas element
const ctx = canvas.getContext('2d');

ctx.fillText("connect a gamepad to USB port, then press any button to start.  ONLY the d-pad will control",10,50);

//default size for the box to be controlled on the screen
const boxSize = 10;


function animate(posX,posY){
  
  //poll controller state
  move = controller();
  posX += move[0];
  posY += move[1];
  
  //clear the canvas each frame, draw on a fresh canvas
  ctx.clearRect(0,0,canvas.width, canvas.height);
  
  ctx.fillRect(posX,posY, boxSize,boxSize);
  
  //loop
  //https://stackoverflow.com/questions/19893336/how-can-i-pass-argument-with-requestanimationframe
  window.requestAnimationFrame(function() {
        animate(posX,posY)
    });
  //requestAnimationFrame(animate(posX,posY)); -- THIS WONT WORK
}

function controller(){
  //This really should be a const
  var gamepad = navigator.getGamepads()[0];
  let left = -gamepad.buttons[14].value;
  let right = gamepad.buttons[15].value;
  let down = gamepad.buttons[13].value;
  let up = -gamepad.buttons[12].value;
  
  return [left+right,up+down];
}

window.addEventListener("gamepadconnected", function(e){
  console.log('gamepad connected: %s',e.gamepad.id);
  
  //starting point of the box
  let posX = 0;
  let posY = 0;
  
  animate(posX,posY);
});