const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const app = express()
const SocketIOFile = require('socket.io-file')

const server = http.createServer(app)
const io = new Server(server, {
	cors: {
		origin: 'http://localhost:3000',
		methods: ['GET', 'POST'],
	},
})

let users_arr = []
let messageHistory = []

io.on('connection', (socket) => {
	console.log('connect')

	socket.emit('message history', messageHistory)

	socket.on('login', (data) => {
		const found = users_arr.find(
			(fio) => fio.toLowerCase() === data.toLowerCase()
		)
		if (!found) {
			users_arr.push(data)
			console.log('users_arr', users_arr)
			socket.username = data
			io.sockets.emit('login', { status: 'OK', name: data })
			io.sockets.emit('users_arr', { users_arr })
		} else {
			io.sockets.emit('login', { status: 'FAILED' })
		}
	})

	socket.on('message', (data) => {
		const currentDate = new Date()
		function addLeadingZero(value) {
			return value < 10 ? `0${value}` : value
		}

		const hours = addLeadingZero(currentDate.getHours())
		const minutes = addLeadingZero(currentDate.getMinutes())
		const newMess = {
			message: data.mess,
			time: `${hours}:${minutes}`,
			nick: data.name,
		}
		messageHistory.push(newMess)
		io.sockets.emit('new message', newMess)
	})

	socket.on('disconnect', () => {
		console.log('disconnected', socket.username)
		users_arr = users_arr.filter((user) => user !== socket.username)
		io.sockets.emit('users_arr', { users_arr })
	})
})

server.listen(5000, () => {
	console.log('Server run!')
})
