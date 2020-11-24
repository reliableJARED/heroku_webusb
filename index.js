//This is a github repo that controls a Heroku deployed app.  see below:
//https://devcenter.heroku.com/articles/github-integration

/*
video code from
https://gabrieltanner.org/blog/webrtc-video-broadcast
*/
const express = require("express");
const app = express();

//Express initializes app to be a function handler that you can supply to an HTTP server
const http = require('http').Server(app);

//A server that integrates with (or mounts on) the Node.JS HTTP Server: socket.io
const io = require('socket.io')(http);

const port = process.env.PORT || 5000;


//required for serving locally when testing
const serveStatic = require('serve-static');

app.use('/',express.static(__dirname));//serve the main dir so the /public dir will work
app.use(serveStatic(__dirname + '/public/css'));
app.use(serveStatic(__dirname + '/public/js'));
app.use(serveStatic(__dirname + '/public/html'));
console.log('server directory: ' +__dirname);

app.get('/', (request, response) => {
  //use .sendFile NOT .send
  response.sendFile(__dirname+'/public/html/home.html');
});

//var ip = '192.168.1.131';

//add ip arg to serve on local host
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

let emitter;

io.sockets.on("connection", socket => {
  
  socket.on("emitter", () => {
    emitter = socket.id;
    socket.broadcast.emit("emitter");
  });
  
  socket.on("receiver", () => {
    socket.to(broadcaster).emit("receiver", socket.id);
  });
  
  socket.on("disconnect", () => {
    socket.to(emitter).emit("disconnectPeer", socket.id);
  });
  
  socket.on("offer", (id, message) => {
    socket.to(id).emit("offer", socket.id, message);
  });
  
  socket.on("answer", (id, message) => {
    socket.to(id).emit("answer", socket.id, message);
  });
  
  socket.on("candidate", (id, message) => {
    socket.to(id).emit("candidate", socket.id, message);
  });
  
});