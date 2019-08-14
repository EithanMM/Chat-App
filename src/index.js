const server = require('./app');

server.listen(process.env.PORT, () => {
	console.log('Server running in port ' + process.env.PORT);
});
