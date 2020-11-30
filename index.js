//This is a github repo that controls a Heroku deployed app.  see below:
//https://devcenter.heroku.com/articles/github-integration

/*
video code from
https://gabrieltanner.org/blog/webrtc-video-broadcast

https://github.com/googlecodelabs/webrtc-web/blob/master/step-05/index.js

*/
var os = require('os');

const express = require("express");

const app = express();

//Express initializes app to be a function handler that you can supply to an HTTP server
const http = require('http').Server(app);

//A server that integrates with (or mounts on) the Node.JS HTTP Server: socket.io
const io = require('socket.io')(http);

const port = process.env.PORT || 1;

const roomPasswordLocker =( ()=>{
  //key:value where key=room name, value=room password
  const room_pw = {};
  
  return (room,pass)=>{
    room = room || false;
  	pass = pass || false;
    if(room && pass){
       //SET PW - if room and password arg sent
        console.log('setting room: '+room+" to pw: "+pass);
        room_pw[room]=pass;
        }
    return room_pw;
    };
    
})();
  
  
function set_roomPasswordLocker(room,pw){
  console.log('try to set room: '+room+" to pw: "+pw);
  roomPasswordLocker(room,pw);
}

function getPassword_roomPasswordLocker(room){
  allPWs = roomPasswordLocker();
  console.log('all PWs: '+allPWs);
  roomPW = allPWs[room];
  console.log('accessed password for room: '+room);
  console.log('current pw is:' + roomPW);
  return roomPW;
}


//cheat sheet
//https://socket.io/docs/v3/emit-cheatsheet/index.html
io.sockets.on("connection", socket => {
  

  // convenience function to log server messages on the client
  function log(stringMsg) {
    socket.emit('log', stringMsg);
  }
  
  socket.on('message', (room,message)=> {
    log('Client said: '+ message);
    io.to(room).emit('message', message,socket.id);
  });


function createNewRoom(soc,room,password){
  console.log("createNewRoom() socket with ID: "+soc.id);
  console.log("createNewRoom() "+room+" _ "+password);
}

function joinRoom(soc,room,password){
  console.log("joinRoom() socket with ID: "+soc.id);
  console.log("joinRoom() "+room+" _ "+password);
}

socket.on('create or join', (room,password) =>{
    //MAXIMUM Room Members
    const maxRoomMembers = 2;
    
    //eventually use ONLY auto-generated room names.  Would also have to check against all current room names.
    //something like randomMath or better.  Socket.io may already have function i just don't know atm
    room = room || 'room_'+Math.floor(Math.random() * Math.floor(1000));
    
    /*SECURITY
      'create or join' should handle a password
      room creator sets, joiner has a check.
    */
    password = password || '1234'; //evenutally use pw from connecting client
    
    //This isn't used, but at some point need to check if user supplied room name exists
    //OR just use auto generated room names, prob a better solution :)
    const AllRoomNames = io.sockets.adapter.rooms;
    
    //console.log('Received request to create or join room '+room);
    log('Received request to create or join room ' + room);
    
    //first check if room already exists, if no room then it has 0 clients
    let clientsInRoom = io.sockets.adapter.rooms.get(room) ? io.sockets.adapter.rooms.get(room).size : 0;
    let isInitiatorClient;//flag to see if first attendee
    
    //first check if room already exists
    if(clientsInRoom === 0){
      //PLACE HOLDER - eventually move this workflow to function
      createNewRoom(socket,room,password);
      
      //set room password
      set_roomPasswordLocker(room,password);
      
      log('room '+room+' not found, making room ' +room);
      //add client to the new room
      socket.join(room);
      //update room member count after join
      clientsInRoom = io.sockets.adapter.rooms.get(room).size;
      //flag client as first attendee in room
      isInitiatorClient = true;
      //tell cleint room joined
      socket.emit('joined',room,socket.id,isInitiatorClient);
      //debug logs
      log('Client ID ' + socket.id + ' created room ' + room);
      log('Room: ' + room + ' now has ' + clientsInRoom + ' client(s)');
    }
    else if(getPassword_roomPasswordLocker(room) === password){
      console.log('correct password for '+ room+ ' supplied');
      log('correct password for '+ room+ ' supplied');
      log('Room ' + room + ' currently has ' + clientsInRoom + ' client(s)');
      
       //if room exists, find out if it's too full to join
      if (clientsInRoom < maxRoomMembers) {
        //PLACE HOLDER - eventually move this workflow to function
        joinRoom(socket,room,password);
      
        //join room
        socket.join(room);
        //update room member count after join
        clientsInRoom = io.sockets.adapter.rooms.get(room).size;
        //flag client as NOT first attendee in room
        isInitiatorClient = false;
        //debug log
        log('Client ID ' + socket.id + ' joined room ' + room);
        
        //tell cleint, they joined
        socket.emit('joined', room, socket.id,isInitiatorClient);
        
        //DROP THIS - newMember is only one who knows who is in room, starts the connection handshake
        //tell all clients, except sender, a new member joinded the room
        //socket.to(room).emit('newRoomMember',room,socket.id);
        
        //get all room members
        let allRoomMembers = io.sockets.adapter.rooms.get(room);
        //remove self from Set
        allRoomMembers.delete(socket.id);
        //convert Set object to Array
        let allRoomMembers_array = Array.from(allRoomMembers);
        //tell sender who is in the room, excluding self
        socket.emit('newRoomMember',room,allRoomMembers_array);

        //debug log
        log('Room ' + room + ' now has ' + clientsInRoom + ' client(s)');
      }
      else{ // maximum occupancy
        socket.emit('full', room);
      }
    }
    
  });


//This is probably going to be dropped, each time someone connects, they reach out to the other clients
//may not be a need to 'ask' for other connected members
socket.on('askForOtherRoomMembers',room=>{
  //get all room members
  let allRoomMembers = io.sockets.adapter.rooms.get(room);
  //remove self from list
  allRoomMembers.delete(socket.id);
  //convert Set object to Array
  let allRoomMembers_array = Array.from(allRoomMembers);
  console.log('client: '+ allRoomMembers_array);
  
  //return a list of ALL socketIDs in the room
  log('all clients in room: '+ allRoomMembers_array);
  socket.emit('newRoomMember',room,allRoomMembers_array);
});

socket.on('offer',(id,offer)=>{
    //relay offer from Alice to Bob
    console.log(socket.id+" sent offer "+offer);
    log('client ' + socket.id + ' sent an offer '+ offer +' to ' + id);
    socket.to(id).emit("offer", socket.id, offer);
  });
  
socket.on('answer',(id,answer)=>{
    //relay response from Bob to Alice
    console.log(socket.id+" sent answer to "+id);
    socket.to(id).emit("answer", socket.id, answer);
  });
  
socket.on('candidate',(id,candidate)=>{
    //relay response
     console.log(socket.id+" sent candidate to: "+id);
     socket.to(id).emit("candidate", socket.id, candidate);
  });
  
  socket.on('bye', room=>{
    log('received bye from '+socket.id);
    //tell everyone they left
    socket.to(room).emit('bye',socket.id)
  });
  
});

//required for serving locally when testing
const serveStatic = require('serve-static');

app.use('/',express.static(__dirname));//serve the main dir so the /public dir will work
app.use(serveStatic(__dirname + '/public/css'));
app.use(serveStatic(__dirname + '/public/js'));
app.use(serveStatic(__dirname + '/public/html'));
app.use(serveStatic(__dirname + '/node_modules'));
console.log('server directory: ' +__dirname);

app.get('/', (request, response) => {
  //use .sendFile NOT .send
  response.sendFile(__dirname+'/public/html/home.html');
});

//must listen on HTTP - see this SO error post
//https://stackoverflow.com/questions/24793255/socket-io-cant-get-it-to-work-having-404s-on-some-kind-of-polling-call
http.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
