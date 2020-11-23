

// Get the canvas element form the page
const canvas = document.getElementById("canvas");
 
/* resize the canvas to occupy the full page, by getting the widow width and height and setting it to canvas*/
 
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext('2d');

ctx.fillRect(10,10,100,100);