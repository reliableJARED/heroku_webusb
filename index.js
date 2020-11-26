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

let emitter;

//cheat sheet
//https://socket.io/docs/v3/emit-cheatsheet/index.html

//remove the 'receiver concept'
io.sockets.on("connection", socket => {
  
    socket.on('message', function(message) {
    log('Client said: ', message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function(room) {
    log('Received request to create or join room ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);

    } else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });
  
});

//required for serving locally when testing
const serveStatic = require('serve-static');

app.use('/',express.static(__dirname));//serve the main dir so the /public dir will work
app.use(serveStatic(__dirname + '/public/css'));
app.use(serveStatic(__dirname + '/public/js'));
app.use(serveStatic(__dirname + '/public/html'));
app.use(serveStatic(__dirname + '/node_modules/socket.io/client-dist/'));
console.log('server directory: ' +__dirname);

app.get('/', (request, response) => {
  //use .sendFile NOT .send
  response.sendFile(__dirname+'/public/html/home.html');
});


app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
