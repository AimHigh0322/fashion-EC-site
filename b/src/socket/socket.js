const jwt = require('jsonwebtoken');

function configureSocketIo(io) {
	io.use((socket, next) => {
		try {
			const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.split(' ')[1];
			if (!token) {
				return next(new Error('Authentication required'));
			}
			const payload = jwt.verify(token, process.env.JWT_SECRET);
			socket.user = { id: payload.sub, email: payload.email };
			return next();
		} catch (error) {
			return next(new Error('Invalid token'));
		}
	});

	io.on('connection', (socket) => {
		socket.emit('welcome', { message: `Welcome user ${socket.user.id}` });

		socket.on('ping', (data) => {
			socket.emit('pong', { ...data, at: Date.now() });
		});

		socket.on('broadcast', (payload) => {
			io.emit('message', { from: socket.user.id, ...payload });
		});

		socket.on('disconnect', () => {});
	});
}

module.exports = { configureSocketIo };


