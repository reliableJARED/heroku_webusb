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

const port = process.env.PORT || 5000;

//cheat sheet
//https://socket.io/docs/v3/emit-cheatsheet/index.html

function roomIDlocker(id,room){
  const ids_room = {};
  if(id && room){
  (id,room)=>{ids_room[id]=room;};
  }
  else if(id && room === 'undefined'){
    delete ids_room[id];
  }
  return ids_room;
}

function get_roomIDlocker(room){
 const allclients = roomIDlocker();
 const roomclients = Object.keys(allclients).find(key => allclients[key] === room);
 //below is faster?
 //const roomclients = Object.keys(allclients).filter(key => allclients[key] === room);
 
 return roomclients;
}

function add_roomIDlocker(id,room){
 roomIDlocker(id,room);
}

function remove_roomIDlocker(id){
  roomIDlocker(id);
}

//remove the 'receiver concept'
io.sockets.on("connection", socket => {
  

  // convenience function to log server messages on the client
  function log(stringMsg) {
    socket.emit('log', stringMsg);
  }
  
  socket.on('message', function(room,message) {
    log('Client said: '+ message);
    io.to(room).emit('message', message,socket.id);
  });

  socket.on('create or join', function(room) {
    
    //console.log('Received request to create or join room '+room);
    log('Received request to create or join room ' + room);
    
    let clientsInRoom;
    
    //first check if room already exists
    if(!io.sockets.adapter.rooms.get(room)){
      log('making room ' +room);
      clientsInRoom = 0;
    }
    else{
      //if room exists, find out how many people are in it
      clientsInRoom = io.sockets.adapter.rooms.get(room).size;
      console.log(io.sockets.adapter.rooms.get(room))
      console.log('room ' +room+' already exists');
      log('Room ' + room + 'currently has ' + clientsInRoom + ' client(s)');
    }
    

    if (clientsInRoom === 0) {
      socket.join(room);
      add_roomIDlocker(socket.id,room);
      
      clientsInRoom = io.sockets.adapter.rooms.get(room).size;
      //console.log(io.sockets.adapter.rooms);
      //console.log(typeof(io.sockets.adapter.rooms.get(room)));
      socket.emit('created',room,socket.id);
      //io.to(room).emit('created', room, socket.id);
      log('Client ID ' + socket.id + ' created room ' + room);
      log('Room ' + room + ' now has ' + clientsInRoom + ' client(s)');
      //socket.emit('created', room, socket.id);
      //clientsInRoom = io.sockets.adapter.rooms[room];
      //console.log("room clients: "+clientsInRoom);

    }
    else if (clientsInRoom === 1) {
      socket.join(room);
      add_roomIDlocker(socket.id,room);
      
      clientsInRoom = io.sockets.adapter.rooms.get(room).size;
      log('Client ID ' + socket.id + ' joined room ' + room);
      //tell cleint, they joined
      socket.emit('joined', room, socket.id);
      //tell all clients, except sender, a new member joinded the room
      socket.to(room).emit('newRoomMember',room,socket.id);
      //tell all clients in room, room is ready
      io.sockets.in(room).emit('ready',room);
      log('Room ' + room + ' now has ' + clientsInRoom + ' client(s)');
    }
    else { // max two clients
      socket.emit('full', room);
    }
  });


//TODO - find a way to get all members of a room
socket.on('askForOtherRoomMembers',room=>{
  //let allRoomMembers = get_roomIDlocker(room);
  let allRoomMembers = io.sockets.adapter.rooms.get(room);
  //remove self from list
  allRoomMembers.delete(socket.id);
  let scroll = allRoomMembers.values();

    console.log('client: '+scroll[0]);
  
  //eventually change this to return a list of ALL socketIDs in the room
  //var AllClients = Object.keys(io.sockets.in(room).connected)
  console.log('all clients in room: '+allRoomMembers.entries());
  log('all clients in room: '+ allRoomMembers);
  socket.emit('newRoomMember',room,allRoomMembers);
});

  socket.on('offer',(id,offer)=>{
    //relay offer from Alice to Bob
    console.log(id+" sent offer");
    log('client ' + socket.id + ' sent an offer to ' + id);
    socket.to(id).emit("offer", socket.id, offer);
  });
  
  socket.on('answer',(id,answer)=>{
    //relay response from Bob to Alice
     console.log(id+" sent answer");
  });
  
 socket.on('candidate',(id,candidate)=>{
    //relay response from Bob to Alice
     console.log(id+" sent candidate");
    
  });
  
  socket.on('bye', room=>{
    remove_roomIDlocker(socket.id,room);
    console.log('received bye from '+socket.id);
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
