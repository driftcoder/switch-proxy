const path = require('path');

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.sendFile(path.resolve('./server.html'));
})

const server = app.listen(80);

server.on('error', (error) => {
  console.log(error.message);
});
