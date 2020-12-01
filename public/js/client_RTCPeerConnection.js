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

Shane Tully
https://shanetully.com/2014/09/a-dead-simple-webrtc-example/
*/

'use strict';


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
/////////////////////// CONSTRAINTS FOR getUserMedia //////////////////////////
// https://developer.mozilla.org/en-US/docs/Web/API/Media_Streams_API/Constraints

/* *******  iPhone issue ********* 
https://bugs.webkit.org/show_bug.cgi?id=208667
https://stackoverflow.com/questions/63084076/ios13-getusermedia-not-working-on-chrome-and-edge

when constraints has audio:false, iphone can connect
to the app when it's on heroku.  Else, it can't.  Suspect it's related
to only allowing video? idk, but it's annoying 30nov2020
*/

//if iPhone user agent, ONLY set video constraint, else include audio and width/height
const constraints = navigator.userAgent.includes("iPhone") ? {video:true} : {
    audio:true,
      video: {
          width: { ideal: 640 },
          height: {ideal: 400 }
          }    
    };

////////////////////// GLOBAL TO HOLD CONNECTIONS ////////////////////////////////
/*move this to a closure at some point*/
const allPeerConnections = {};

//////////////////////////  GET USER MEDIA //////////////////////////
navigator.mediaDevices.getUserMedia(constraints).then(setLocalVideo);
/* best is use an arrow function for setLocalVideo stream, done this way to make reading easier*/
//////////////////////////  DISPLAY USER MEDIA for LOCAL //////////////////////////
function setLocalVideo(stream){
  let localVideo = document.querySelector('#localVideo');
  localVideo.srcObject = stream;
}



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
socket.on("newRoomMember", (room,ids) => {
  //id an array of socket.IDs of other members
  console.log(ids.length+' other members in room: '+room);
  console.log(ids);

  //loop through all the room members and send offer to connect
  for (var socketID of ids){
    console.log('for loop '+ socketID)
  const remotePeerConnection = createPeerConnectionOffer(socketID);
  
  allPeerConnections[socketID] = remotePeerConnection;

  //create handler for the .onicecandidate method of RTCPeerConnection instance 
  remotePeerConnection.onicecandidate = event => {
        if (event.candidate) {
          console.log('event candidate received, send back to id: '+socketID);
          socket.emit("candidate", socketID, event.candidate);
        }
      };
    }
});

function addMediaTrackToRemotePeerConnection(remotePeerConnection){
  //const remotePeerConnection = new RTCPeerConnection(iceConfig);
//IMPORTANT - everything has to wait for userMedia, so it's all chained to that promise .then()
 //https://stackoverflow.com/questions/38036552/rtcpeerconnection-onicecandidate-not-fire
 navigator.mediaDevices.getUserMedia(constraints)
 .then(
   (stream)=>{
     //Add our local media tracks (audio/video) to the rPC object we are connecting through
     stream.getTracks().forEach(track => remotePeerConnection.addTrack(track, stream));
     //return remotePeerConnection // returned so it can flow through the .then() chain
   });
   return remotePeerConnection;
}

function createPeerConnectionOffer (RemoteSocketID){
  //iceConfig global 
  const remotePeerConnection = new RTCPeerConnection(iceConfig);
//IMPORTANT - everything has to wait for userMedia, so it's all chained to that promise .then()
 //https://stackoverflow.com/questions/38036552/rtcpeerconnection-onicecandidate-not-fire
 navigator.mediaDevices.getUserMedia(constraints)
 .then(
   (stream)=>{
     //Add our local media tracks (audio/video) to the rPC object we are connecting through
     stream.getTracks().forEach(track => remotePeerConnection.addTrack(track, stream));
     return remotePeerConnection // returned so it can flow through the .then() chain
   })
 .then((rpc) =>{
   //Now that the rPC has our media tracks associated, we can start the offer process.
   rpc.createOffer()
    .then(sdp => {
      rpc.setLocalDescription(sdp);
      //there was an issue with the set completion and the emit, bubble the sdp through .then()
      return sdp;
    })
    .then((sdp) => {
        console.log('sending offer to: '+RemoteSocketID);
        console.log(sdp);
        socket.emit("offer", RemoteSocketID, sdp);
      })
    });


    return remotePeerConnection;
}

function createRemoteVideoHTMLNode (id){

  //*create a new video element to show our remote video
  const remoteVideo = document.createElement("video");
  //set it to autoplay video
  remoteVideo.autoplay = true;
  //give it the socket id as an id so we can reference easily
  remoteVideo.setAttribute("id",id);
  //attach our remote video element to container, 
  document.getElementById('remoteVideoContainer').appendChild(remoteVideo)
  return;
}
socket.on("offer", (id, description) => {
  //////// SO Similar to the createPeerConnectionOffer flow, should really combine in to a few single working functions

  console.log('offer: '+description+' from: '+id);

  //create a video element to hold the remote stream
  createRemoteVideoHTMLNode (id);

  //create a new RTCPeerConnection object to be associated with this offer
  const remotePeerConnection = new RTCPeerConnection(iceConfig);
  
  allPeerConnections[id] = remotePeerConnection;
  navigator.mediaDevices.getUserMedia(constraints)
 .then(
   (stream)=>{
     stream.getTracks().forEach(track => remotePeerConnection.addTrack(track, stream));
     return remotePeerConnection
   })
   .then(
  remotePeerConnection.setRemoteDescription(description)
    ).then(
      () => remotePeerConnection.createAnswer()
      )
    .then(sdp => remotePeerConnection.setLocalDescription(sdp))
    .then(() => {
      console.log('sending answer: '+ remotePeerConnection.localDescription+ 'to id: '+id);
      socket.emit("answer", id, remotePeerConnection.localDescription);
    });
  remotePeerConnection.ontrack = event => {
    console.log('event');
    console.log(event);
    console.log(event.streams[0]);
    let remoteVideoElement = document.getElementById(id);
    //set the remote stream to our video html element
    remoteVideoElement.srcObject = event.streams[0];
  };
  remotePeerConnection.onicecandidate = event=>{
    console.log('received event');
    console.log(event);
    if (event.candidate) {
       socket.emit("candidate", id, event.candidate);
    }
  }
});



socket.on("answer", (id, description) => {
   //create a video element to hold the remote stream
   createRemoteVideoHTMLNode (id);

  //console.log( allPeerConnections[id]);
   allPeerConnections[id].setRemoteDescription(description)

  allPeerConnections[id].ontrack = event => {
    //const remoteVideo = document.querySelector('#remoteVideo');
    let remoteVideoElement = document.getElementById(id);
    console.log('event');
    console.log(event);
    remoteVideoElement.srcObject = event.streams[0];
  };
  allPeerConnections[id].onicecandidate = event => {
    console.log('received event');
    console.log(event);
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };
});


socket.on("candidate", (id, candidate) => {
  console.log('received candidate from: '+id);
  allPeerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});


//debug helper
socket.on('log', function(msg) {
  //receive console.log() server messages - debug feature
  console.log('FROM SERVER LOG: '+msg);
});

socket.on('bye',(id)=>{
  let remoteVideoElement = document.getElementById(id);
  remoteVideoElement.remove();
  delete allPeerConnections[id];
});


window.onbeforeunload = function() {
  console.log('sending message bye');
  socket.emit('bye',room);
};