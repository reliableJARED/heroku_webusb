/*Configuration of peer to peer

*/
const peerConnections = {};
const config = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"]
    }
  ]
};

const socket = io.connect(window.location.origin);
const video = document.querySelector("video");

// Media constraints
const constraints = {
  video: { facingMode: "user" },
  audio: false //without audio buffer may get feedback
};

//get camera
navigator.mediaDevices.getUserMedia(constraints).then(stream => {
    
    video.srcObject = stream;
    socket.emit("emitter");
  
  }).catch(error => console.error(error));
  
/***** socket handle section for video connection *****/
socket.on("receiver", id => {
  const peerConnection = new RTCPeerConnection(config);
  peerConnections[id] = peerConnection;

  //add the local stream to the connection using the addTrack() method and passing our stream and track data
  let stream = video.srcObject;
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };

  peerConnection.createOffer().then(sdp => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("offer", id, peerConnection.localDescription);
    });
    
    peerConnection.ontrack = event => {
    video.srcObject = event.streams[0];
    };
    
});

socket.on("answer", (id, description) => {
  peerConnections[id].setRemoteDescription(description);
});

socket.on("candidate", (id, candidate) => {
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("disconnectPeer", id => {
  peerConnections[id].close();
  delete peerConnections[id];
});
 
//close the socket connection if the user closes the window.
window.onunload = window.onbeforeunload = () => {
  socket.close();
};

/***********/
  
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