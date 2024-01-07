const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const app = express()
const fs = require('fs')
const path = require('path')
const mime = require('mime-types')
const server = http.createServer(app)

const io = new Server(server, {
	cors: {
		origin: 'http://localhost:3000',
		methods: ['GET', 'POST'],
	},
})

let users_arr = []
let messageHistory = []
const uploadPath = path.join(__dirname, 'uploads')

if (!fs.existsSync(uploadPath)) {
	fs.mkdirSync(uploadPath)
}

app.use('/uploads', express.static(uploadPath)) // Serve uploaded files

app.get('/uploads/:fileName', (req, res) => {
	const fileName = req.params.fileName
	const filePath = path.join(uploadPath, fileName)

	// Проверяем, существует ли файл
	if (fs.existsSync(filePath)) {
		// Отправляем файл на клиент
		res.sendFile(filePath)
	} else {
		res.status(404).send('File not found')
	}
})
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
	socket.on('file-upload', ({ fileData, fileName, nick }) => {
		const filePath = path.join(uploadPath, fileName)

		fs.writeFile(filePath, Buffer.from(fileData, 'base64'), (err) => {
			if (err) {
				console.error(err)
			} else {
				console.log('File saved:', filePath)

				const fileType = mime.lookup(filePath) || 'application/octet-stream'

				console.log('fileType', fileType)

				const fileDataWithSender = {
					fileName,
					fileType,
					downloadLink: `/uploads/${fileName}`,
					nick, // Добавляем информацию о пользователе, отправившем файл
				}

				io.emit('file-uploaded', fileDataWithSender)
			}
		})
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
