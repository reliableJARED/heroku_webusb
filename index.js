//This is a github repo that controls a Heroku deployed app.  see below:
//https://devcenter.heroku.com/articles/github-integration

const express = require('express');
const app = express();

const port = process.env.PORT || 5000;

//required for serving locally when testing
const serveStatic = require('serve-static');
app.use('/',express.static(__dirname));//serve the main dir so the /public dir will work
app.use(serveStatic(__dirname + '/public/css'));
app.use(serveStatic(__dirname + '/public/js'));
app.use(serveStatic(__dirname + '/public/html'));

console.log('server director' +__dirname);

app.get('/', (request, response) => {
  //use .sendFile NOT .send
  response.sendFile(__dirname+'/public/html/home.html');
  
})

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
})