const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocalMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
/* Must be call with the raw http server. */
const io = socketio(server);

const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

app.use(express.json());

/* Function that triggers when a new connection occurs. */
io.on('connection', (socket) => {
	console.log('New Webconnection socket');

	/* Send an event from server to client. */
	//socket.emit('message', generateMessage('Welcome!'));

	/* Send a message to everybody, except tthis particular socket. */
	//socket.broadcast.emit('message', generateMessage('A new user has entered the room!'));

	socket.on('sendMessage', (message, callback) => {
		const user = getUser(socket.id);
		if (!user) return callback(undefined);

		/* Filter to check for some profanity. */
		const filter = new Filter();
		if (filter.isProfane(message)) {
			return callback('profanity is not allowed...');
		}

		/* Send a message to everyone. */
		io.to(user.room).emit('message', generateMessage(user.username, message));
		callback();
	});

	socket.on('join', ({ username, room }, callback) => {
		const { error, user } = addUser({ id: socket.id, username, room });

		if (error) return callback(error);

		/* Method only available on server side */
		socket.join(user.room);

		socket.emit('message', generateMessage('Server bot', 'Welcome!'));

		/* io.to.emit - sends a message to everybody in a specific room. */
		/* socket.broadcast.to.emit - sends a message to everybody expect for a specific client in a room. */
		socket.broadcast
			.to(user.room)
			.emit('message', generateMessage('Server bot', `${user.username} has joined the room!`));

		io.to(user.room).emit('roomData', {
			room: user.room,
			users: getUsersInRoom(user.room)
		});
		callback();
	});

	socket.on('sendLocation', (object, callback) => {
		const user = getUser(socket.id);
		if (!user) return callback(undefined);

		io
			.to(user.room)
			.emit(
				'locationMessage',
				generateLocalMessage(user.username, `https://google.com/maps?q=${object.latitude},${object.longitude}`)
			);
		callback();
	});

	/* Function that triggers when the user disconnects. */
	socket.on('disconnect', () => {
		const user = removeUser(socket.id);

		if (user) {
			io.to(user.room).emit('message', generateMessage(`${user.username} has left the room...`));
			io.to(user.room).emit('roomData', {
				room: user.room,
				users: getUsersInRoom(user.room)
			});
		}
	});
});

module.exports = server;
