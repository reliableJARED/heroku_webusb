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
const remoteVideo = document.querySelector('#remoteVideo');

/* PREPARE localPeerConnection */
const constraints = {
    video: true,
    audio:true
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
  ).then(
  //SIXTH - Send msg to server to join a room
  joinARoom
  );
  
function setLocalVideo(stream){
  let localVideo = document.querySelector('#localVideo');
  localVideo.srcObject = stream;
}


//Done preparing local peerconnection for now

function joinARoom(){
  //response back if client joined an existing room called 'chatRoom'
  socket.on('joined',  (room, socketID,isInitiatorClient)=> {
  localSocketID = socketID;
  isInitiator = isInitiatorClient;//if Flase, then start handshake.  Means others are in the room
  console.log('Client joined '+room+' Client socketID is: ' + socketID+' Client created room: '+isInitiator);
  
  //need to ask for the other room members ID if you didn't create the room
  /*if(!isInitiator){
    socket.emit('askForOtherRoomMembers', room);
  }*/
  });
}



console.log(localPeerConnection);

/*********** SOCKET FUNCTIONS
 */

socket.on('connect',(msg)=>{
	    console.log("CONNECTED");
			
      //room is hardcoded atm, so this should always run
      //TODO - add a user input for room to join existing room
      if (room !== '') {
        socket.emit('create or join', room);
        console.log('Asking server to create or join room: ', room);
        }
		});

//response back if Client joined a room with other clients
socket.on("newRoomMember", (room,id) => {
  //id an array of socket.IDs of other members
  console.log(id.length+' other members in room: '+room);
  console.log(id[0]);
  
 // change '0' holder in id[0] when for loop completed
  
  //TODO - Eventually this will loop the Array of ALL member Socket.IDs in the room
  //will need to create a RTCpc for each.
  const remotePeerConnection = new RTCPeerConnection(iceConfig);
  
  allPeerConnections[id[0]] = remotePeerConnection;

 //IMPORTANT - everything has to wait for userMedia, so it's all chained to that promise .then()
 //https://stackoverflow.com/questions/38036552/rtcpeerconnection-onicecandidate-not-fire
 navigator.mediaDevices.getUserMedia(constraints)
 .then(
   (stream)=>{
     stream.getTracks().forEach(track => remotePeerConnection.addTrack(track, stream));
     return remotePeerConnection
   })
 .then((rpc) =>{
   rpc.createOffer()
    .then(sdp => {
      rpc.setLocalDescription(sdp);
      //there was an issue with the set completion and the emit, bubble the sdp through .then()
      return sdp;
    })
    .then((sdp) => {
        console.log('sending offer to: '+id[0]);
        console.log('localDescription: ');
        console.log(sdp);
        socket.emit("offer", id[0], sdp);
      })
    });

  //create handler for the .onicecandidate method of RTCPeerConnection instance localPeerConnection
  remotePeerConnection.onicecandidate = event => {
        if (event.candidate) {
          console.log('event candidate received, send back to id: '+id[0]);
          socket.emit("candidate", id[0], event.candidate);
        }
      };
});

socket.on("offer", (id, description) => {
  console.log('offer: '+description+' from: '+id);
  const remotePeerConnection = new RTCPeerConnection(iceConfig);
  
  allPeerConnections[id] = remotePeerConnection;
  
  remotePeerConnection.setRemoteDescription(description)
    .then(() => remotePeerConnection.createAnswer())
    .then(sdp => remotePeerConnection.setLocalDescription(sdp))
    .then(() => {
      console.log('sending answer to id: '+id);
      socket.emit("answer", id, remotePeerConnection.localDescription);
    });
  remotePeerConnection.ontrack = event => {
    console.log('event');
    console.log(event);
    remoteVideo.srcObject = event.streams[0];
  };
  remotePeerConnection.onicecandidate = event => {
    console.log('received event');
    console.log(event);
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };
});

socket.on("answer", (id, description) => {
  /***** FIX THIS ASAP
   * doesn't handle an answer, so the second connecting client can't see remote video
   */
  console.log('received answer from: '+id);
  allPeerConnections[id].setRemoteDescription(description);
  allPeerConnections[id].ontrack = event => {
    console.log('answer event');
    console.log(event);
    remoteVideo.srcObject = event.streams[0];
  };
});


socket.on("candidate", (id, candidate) => {
  console.log('received candidate from: '+id);
  allPeerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("disconnectPeer", id => {
  allPeerConnections[id].close();
  delete allPeerConnections[id];
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