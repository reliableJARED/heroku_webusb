/************** RESOURCES

Google Code Labs
https://github.com/googlecodelabs/webrtc-web/blob/c96ce33e3567b40cd4a5d005186554e33fb8418c/step-05/js/main.js

Mozilla Developer Network
https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling

WebRTC Github - example
https://github.com/webrtc/apprtc

Sam Dutton
https://www.html5rocks.com/en/tutorials/webrtc/basics/

Gabriel Tanner
https://gabrieltanner.org/blog/webrtc-video-broadcast

COR errors
https://stackoverflow.com/questions/57181851/how-to-make-webrtc-application-works-on-the-internet
*/

'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStreamReady;
var localStream;
var localPeerConnection;
var remoteStream;
var turnReady;

var pcConfig = {
  'iceServers':[
    {
      'urls': 'stun:stun.l.google.com:19302'
    },
    {
      'urls': 'turn:192.158.29.39:3478?transport=udp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
  },
  {
      'urls': 'turn:192.158.29.39:3478?transport=tcp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
   }
  ]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: false,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

// Could prompt for room name:
var room = 'foo';
// room = prompt('Enter room name:');

var socket = io.connect();


/*************** connection containers*/
//Private variable Javascript closure to keep socketIDs of peers
//https://www.w3schools.com/js/js_function_closures.asp
function remotePeerconnection_maker(ID){
  
  console.log('loco stream ready '+localStreamReady);

  const peerConnection = new RTCPeerConnection(pcConfig);

        // add the local stream to the connection using the addTrack()
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            
        //https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onicecandidate
        //specify onicecandidate event handler, gets called when local ICE needs to deliver msg
        peerConnection.onicecandidate = event => {
                if (event.candidate) {
                  socket.emit("candidate", ID, event.candidate);
                }
              };
            
        //creation of an SDP offer for the purpose of starting a new WebRTC connection to a remote peer
        peerConnection.createOffer()
                .then(sdp => peerConnection.setLocalDescription(sdp))
                .then(() => {
                  socket.emit("offer", ID, peerConnection.localDescription);
                });
        
        //make record in remote connection holder
        remoteSocketPeerconnection(ID,peerConnection);

}


const remoteSocketPeerconnection = (function(ID,peerConnectionObj){
  //consider making a {key:value} not array, and id is peerconnection obj
  var ids = {};
  return function(ID,peerConnectionObj){
    let returnvalue = null;
    //Use as a maker, no return
    if(ID && peerConnectionObj){
      ids[ID] = peerConnectionObj;
    }
    //Use as a finder, return found object
    if(ID){
      returnvalue = ids[ID];
    }
    //Use as a dumper, return all objects
    else{
      returnvalue = ids;
    }
    return returnvalue;
    };
 
})();

const localSocketID = (function(ID){
  //consider making a {key:value} not array, and id is peerconnection obj
  var id = null;
  return function(ID){
    if(ID){
      id = ID;
    }
    return id;
    };
 
})();

/*************** private scope end *************/
//STEP 1
socket.on('connect',function(msg){
	    console.log("CONNECTED");
			console.log(msg);
			
			//STEP 2
      //room is hardcoded atm, so this should always run
      if (room !== '') {
        socket.emit('create or join', room);
        console.log('Asking server to create or join room: ', room);
        }
		});


socket.on('newRoomMember', function(room,id) {
  console.log(id+' joind room: '+room);
 //create a new member object
 const waitLocalStreamReady = new Promise((resolve,reject)=>{
    resolve(remotePeerconnection_maker);
  });
  waitLocalStreamReady.then((localStreamReady)=>{
    remotePeerconnection_maker(id);
  });
});


//response back if client created room
socket.on('created', function(room,socketID) {
  localSocketID(socketID);
  //STEP 3 - IF this client created the room
  console.log('Created room ' + room + ' with socketID: '+socketID);
  isInitiator = true;
  isStarted = true;
  isChannelReady = false;
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

/*
socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});
*/


//response back if client joined an existing room called 'room'
socket.on('joined', function (room, socketID) {
  localSocketID(socketID);
  //STEP 3 - IF this client joined the room (see 'created')
  console.log('client '+socketID+' joined: ' + room);
  isInitiator = false;
  isStarted = true;
  isChannelReady = true;
});

//STEP 4 - two clients have joined 'room'
socket.on('ready',function(room){
  console.log("room "+room+ " is ready");
  isChannelReady = true;
  isStarted = true;
  
  maybeStart();
  
});


//STEP 5 (if !isInitiator)
socket.on("offer", (id, description) => {
  console.log("RECEIVED AN offer");
  let pc = remotePeerconnection_maker(id);
  pc.setRemoteDescription(description);
  maybeStart();
});

//STEP 6 (if !isInitiator)
socket.on("answer", (id, description) => {
  let pc = remotePeerconnection_maker(id);
  pc.setRemoteDescription(description);
});

socket.on("candidate", (id, candidate) => {
  let pc = remotePeerconnection_maker();
  pc[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('log', function(msg) {
  //receive console.log() server messages - debug feature
  console.log('FROM SERVER LOG: '+msg);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', room, message);
  //socket.emit('join',room);
}


//// socket.on('message' NOT USED
socket.on('message', function(message,senderSocketID) {
  /*
  consider changing setup to switch
  switch(message){
    case 'got user media':
      break;
    case 'offer':
      break;
    case 'answer':
    default;
  }
  */
  // HANDLE EXIT -'bye' message should be removed
  console.log('Client received message:', message);
  console.log('from: '+senderSocketID);
});

//////////////////////GET MEDIA ELEMENTS////////////////////////
var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
///////////////////////ACCESS CAMERA/////////////////////////////
var constraints = {
  video: true
};

navigator.mediaDevices.getUserMedia(constraints)
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

function gotStream(stream) {
  console.log('adding user media with constraints', constraints);
  localStream = stream;
  localVideo.srcObject = stream;
  localStreamReady = true;
  maybeStart();
  /*
  if (isInitiator) {
    console.log("isInitiator trigger");
    isStarted = true;
    //isChannelReady = true;
    maybeStart();
  }
  */
}
///////////////////////END MEDIA ACCESS/////////////////////////////






/*
***
requestTurn
**
^^THIS WILL NOT WORK!!!

CORS error being thrown when deployed on Heroku
TODO: try and fix using -
https://elements.heroku.com/buttons/hashobject/twilio-stun-turn
*/


function maybeStart() {
  
  console.log('>>>>>>> maybeStart() ');
  console.log('isStarted=',isStarted);
  console.log('isInitiator',isInitiator);
  console.log('localStream=',localStream);
  console.log('isChannelReady',isChannelReady);
  console.log('type of localStream: '+typeof localStream);
  
  // CHECK - Then launch RTCPeerConnection steps
  //local media accessed,
  //client started,
  //connection live,
  //localStream assigned,
  //another client is on the channel
  /*** isInitiator - IMPORTANT - the client that starts the call/response handshake for RTCpeerconnection****/
  
  if (localStreamReady && isInitiator && isStarted && typeof localStream === 'object' && isChannelReady) {
    console.log('>>>>>> creating peer connection offer');
    localPeerConnection = createPeerConnection();
    console.log('localPeerConnection >>>>>>>>');
    console.log(localPeerConnection);
  }
  else{
    console.log('not ready to start, or ready to start but youre not the initiator');
    
  }
  
}

window.onbeforeunload = function() {
  console.log('sending message bye');
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

//STEP 5 (if isInitiator)
//*** FIX - this function is nearly identical to remotePeerconnection_maker
//create a single 'peerconnection' maker
function createPeerConnection() {
    let peerConnection;
    if (location.hostname !== 'localhost') {
      peerConnection = new RTCPeerConnection(pcConfig);
    }
    else {
      peerConnection = new RTCPeerConnection(null);
    }
    
    let id = localSocketID();
    
    console.log("****localPeerconnection id****"+id);
    
    // add the local stream to the connection using the addTrack()
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    
    //https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/onicecandidate
    //specify onicecandidate event handler, gets called when local ICE needs to deliver msg
    peerConnection.onicecandidate = event => {
    if (event.candidate) {
      console.log('SENDING FROM HERE');
      socket.emit("candidate", id, event.candidate);
    }};
    
   peerConnection.createOffer()
    .then(sdp => peerConnection.setLocalDescription(sdp))
    .then(() => {socket.emit("offer", id, peerConnection.localDescription)});
    
    return peerConnection;
}

function handleIceCandidate(event) {
 
}

function handleCreateOfferError(event) {
 
}

