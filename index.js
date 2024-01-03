const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const app = express()
const path = require('path')

const server = http.createServer(app)
const io = new Server(server, {
	cors: {
		origin: 'http://localhost:3000',
		methods: ['GET', 'POST'],
	},
})
app.use(express.static(path.join(__dirname, '../client/public')))
app.get('/', (req, res) => {
	res.sendFile(path.resolve(__dirname, '../client/public/index.html'))
})

let users_arr = []

io.on('connection', (socket) => {
	console.log('connect')

	socket.on('login', (data) => {
		console.log('login', data)
		const found = users_arr.find((fio) => {
			return fio === data
		})
		if (!found) {
			users_arr.push(data)
			socket.nick = data
			io.sockets.emit('login', { status: 'OK', data })
			io.sockets.emit('users_arr', { users_arr })
		} else {
			io.sockets.emit('login', { status: 'FAILED' })
			console.log(io.sockets.status)
		}
	})

	socket.on('message', (data) => {
		console.log('message')

		io.sockets.emit('new message', {
			message: data,
			time: new Date(),
			nick: socket.nick,
		})
	})

	socket.on('disconnect', (data) => {
		console.log('disconneckt')
		for (let index = 0; index < users_arr.length; index++) {
			if (users_arr[index] === socket.nick) {
				users_arr.splice(index, 1)
			}
		}
		io.sockets.emit('users_arr', { users_arr })
	})
})

server.listen(5000, () => {
	console.log('Server run!')
})
