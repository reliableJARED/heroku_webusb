/*
Configuration of peer to peer
https://codelabs.developers.google.com/codelabs/webrtc-web#0
*/
const peerConnections = {};

const config = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302"]
    }
  ]
};

//window.location.origin will obtain the current url/domain in browser
const socket = io.connect(window.location.origin);

//get the video element from the HTML
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// hold local media stream tracks.
var localTracks;

//connection referrence
var localPeerConnection;
var remotePeerConnection;

// Media constraints - allows you to specify what media to get
//https://webrtc.github.io/samples/src/content/peerconnection/constraints/
const mediaStreamConstraints = {
  video: { facingMode: "user" },
  audio: false //without audio buffer may get feedback
};

// SUCCESS the video stream from the webcam is set as the source of the video element:
function successLocalMediaStream(mediaStream){
  localVideo.srcObject = mediaStream;
  localTracks = mediaStream.getTracks();
  //remoteVideo.srcObject = localVideo.srcObject;
}

// FAILURE error logging to console
function failLocalMediaStream(error) {
  console.log('navigator.getUserMedia error: ', error);
}

//get Camera media
navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
  //SUCCESS
  .then(successLocalMediaStream)
  //FAILURE
  .catch(failLocalMediaStream);
  
  
  
/***** socket handle section for stream connection *****/
// Handles remote MediaStream success by adding it as the remoteVideo src.
function gotRemoteMediaStream(event) {
  remoteVideo.srcObject =  event.stream;
}

// Define RTC peer connection behavior.

// Connects with new peer candidate.
//https://github.com/googlecodelabs/webrtc-web/blob/c96ce33e3567b40cd4a5d005186554e33fb8418c/step-02/js/main.js#L83
function handleConnection(event) {
  const peerConnection = event.target;
  const iceCandidate = event.candidate;

  if (iceCandidate) {
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    const otherPeer = getOtherPeer(peerConnection);

    otherPeer.addIceCandidate(newIceCandidate)
      .then(peerConnection)
      .catch(error);
  }
}

const servers = null;  // Allows for RTC server configuration.

// Logs offer creation and sets peer connection session descriptions.
function createdOffer(description) {
//https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setLocalDescription
  localPeerConnection.setLocalDescription(description)
    .then(() => {
      setLocalDescriptionSuccess(localPeerConnection);
    })

//https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/setRemoteDescription
  remotePeerConnection.setRemoteDescription(description)
    .then(() => {
      setRemoteDescriptionSuccess(remotePeerConnection);
    })

  remotePeerConnection.createAnswer()
    .then(createdAnswer)
    
}

function connectThePeople(){
// Create peer connections and add behavior.
localPeerConnection = new RTCPeerConnection(servers);

localPeerConnection.addEventListener('icecandidate', handleConnection);

remotePeerConnection = new RTCPeerConnection(servers);
remotePeerConnection.addEventListener('icecandidate', handleConnection);

// Add local stream to connection
localPeerConnection.addTrack(localTracks);

// create offer to connect.
//https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
localPeerConnection.createOffer(offerOptions)
    .then(createdOffer)
}
    
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