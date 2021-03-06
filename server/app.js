var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./database.sqlite');
var PORT = 3000;
var rooms = {};


server.listen(PORT);

app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/rooms', function(req, res) {
  db.all('SELECT * FROM rooms', function(err,rows){
    if (err) {
      console.log('rooms error:');
      console.log(err);
      return res.status(400).end();
    }

    res.send(rows);
  });

  // var roomList = Object.keys(rooms).map(function(key) {
  //   // return rooms[key];
  //   return rooms;
  // });
  //
  // res.send(roomList);
});

io.on('connection', function(socket) {

  socket.on('create_room', function(room) {
    if (!room.key) {
      return
    }
    console.log('create room:', room);
    var roomKey = room.key;
    rooms[roomKey] = room;

    db.run('INSERT INTO rooms(key, title, radius, country, fillKey, date, latitude, longitude, isLive) VALUES ($key, $title, $radius, $country, $fillKey, $date, $latitude, $longitude, $isLive)', {
      $key: room.key,
      $title: room.title,
      $radius: room.radius,
      $country: room.country,
      $fillKey: room.fillKey,
      $date: room.date,
      $latitude: room.latitude,
      $longitude: room.longitude,
      $isLive: 1
    });

    socket.roomKey = roomKey;
    socket.join(roomKey);

    io.sockets.emit('room-created', room);
  });

  socket.on('close_room', function(roomKey) {
    console.log('close room:', roomKey);

    onStremStop(socket.roomKey);
    delete rooms[roomKey];
    io.sockets.emit('room-closed', { room: roomKey });
  });

  socket.on('disconnect', function() {
    console.log('disconnect:', socket.roomKey);
    if (socket.roomKey) {
      onStremStop(socket.roomKey);
      delete rooms[socket.roomKey];
      io.sockets.emit('room-closed', { room: socket.roomKey });
    }
  });

  socket.on('join_room', function(roomKey) {
    console.log('join room:', roomKey);
    socket.join(roomKey)
  });

  socket.on('comment', function(data) {
    console.log('comment:', data);
    io.to(data.roomKey).emit('comment', data);
  });
});

console.log('listening on port ' + PORT + '...');

function onStremStop(key) {
  db.run("UPDATE rooms SET isLive = ? WHERE key = ?", [ 0, key ]);
}