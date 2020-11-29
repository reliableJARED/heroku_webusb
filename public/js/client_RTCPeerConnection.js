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


/////////////////////////////////////////////

// Could prompt for room name:
var room = 'chatRoom';
// room = prompt('Enter room name:');

var socket = io.connect();

//create the bilateral communication object, RTCpeerconnection
//will have the local and remote connection information, will need to get info from
//handshake on the socket to use

//first, make the connection objects
var iceConfig = {
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
      
//const remotePeerConnection = new RTCPeerConnection(iceConfig);
const localPeerConnection = new RTCPeerConnection(iceConfig);
const allPeerConnections = {};
var localSocketID;
var isInitiator = false; //flag to determine who starts RTC connection handshake
var LocalMediaStreamReady = false; //flag if media is ready
//////////////////////GET MEDIA ELEMENTS////////////////////////
var remoteVideo = document.querySelector('#remoteVideo');

/* PREPARE localPeerConnection */
const constraints = {
    video: true,
    audio:false
    };
//FIRST - get local media stream
const localStream = navigator.mediaDevices.getUserMedia(constraints);
localStream.then(
  //SECOND - get the media stream tracks and add to the localPeerConnection, return stream for next .then()
  (stream)=>{
    stream.getTracks().forEach(track =>localPeerConnection.addTrack(track, stream));
    return stream;
    }
  )
  .then(
  //THIRD - set localPeerConnection description, return stream for next .then()
    (stream)=>{localPeerConnection.setLocalDescription();
      return stream;
    }
  )
  .then(
  //FOURTH - set localVideo as localStream
    setLocalVideo
  )
  .then(
  //FIFTH - indicate local media stream is ready;
    ()=>{LocalMediaStreamReady = true}
  );
  
function setLocalVideo(stream){
  let localVideo = document.querySelector('#localVideo');
  localVideo.srcObject = stream
};

function getLocalVideo_fromHTML(){
  return document.querySelector('#localVideo').srcObject;
}
//Done preparing local peerconnection for now





console.log(localPeerConnection)

/*********** SOCKET FUNCTIONS
 */

socket.on('connect',(msg)=>{
	    console.log("CONNECTED");
			
      //room is hardcoded atm, so this should always run
      if (room !== '') {
        socket.emit('create or join', room);
        console.log('Asking server to create or join room: ', room);
        };
		});

//response back if client created room called 'chatRoom'
socket.on('created', (room,socketID)=> {
  localSocketID = socketID;
  console.log('Created room ' + room + ' ,your socketID is: '+socketID);
  isInitiator = true;
});

//response back if client joined an existing room called 'chatRoom'
socket.on('joined',  (room, socketID)=> {
  localSocketID = socketID;
  console.log('Client joined '+room+' your socketID is: ' + socketID);
  isInitiator = false;
  //need to ask for the other room members ID
  socket.emit('askForOtherRoomMembers', room);
});

//response back if a new client joined the room OR if 'askForOtherRoomMember' is sent.
socket.on("newRoomMember", (room,id) => {
  console.log('new member in room')
  console.log(id.entries());
  //TODO - Eventually this will receive a JSON of ALL members in the room
  //will need to loop this next section to create a RTCpc for each.
  const remotePeerConnection = new RTCPeerConnection(iceConfig);
  allPeerConnections[id] = remotePeerConnection;

 //add the local media tracks to the RTCpc
 let stream = getLocalVideo_fromHTML();
 stream.getTracks().forEach(track => remotePeerConnection.addTrack(track, stream));

  //create handler for the .onicecandidate method of RTCPeerConnection instance localPeerConnection
  localPeerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket.emit("candidate", id, event.candidate);
        }
      }

  remotePeerConnection
    .createOffer()
    .then(
      sdp => remotePeerConnection.setLocalDescription(sdp)
      )
    .then(
      () => {socket.emit("offer", id, remotePeerConnection.localDescription);}
      );
});

socket.on("answer", (id, description) => {
  allPeerConnections[id].setRemoteDescription(description);
});

socket.on("candidate", (id, candidate) => {
  allPeerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("disconnectPeer", id => {
  peerConnections[id].close();
  delete peerConnections[id];
});

//debug helper
socket.on('log', function(msg) {
  //receive console.log() server messages - debug feature
  console.log('FROM SERVER LOG: '+msg);
});

window.onbeforeunload = function() {
  console.log('sending message bye');
  socket.emit('bye',room);
};