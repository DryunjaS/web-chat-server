const express = require('express')
const http = require('http')
const { Server } = require('socket.io')

const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const secretKey = 'your-secret-key'

const MongoClient = require('mongodb').MongoClient
const assert = require('assert')

const app = express()

const fs = require('fs')
const path = require('path')
const server = http.createServer(app)

const IP_ADRESS = 'localhost'
const PORT = 5000

const io = new Server(server, {
	maxHttpBufferSize: 1e8,
	cors: {
		origin: `*`,
		methods: ['GET', 'POST'],
	},
})

let userArrServer = []
let userArrClient = []
let messageHistory = []
let fileHistory = [] // Создаем массив для хранения истории файлов
let chatsArr = ['Основной', 'Крутой', 'Ровный']

const uploadPath = path.join(__dirname, 'uploads')

if (!fs.existsSync(uploadPath)) {
	fs.mkdirSync(uploadPath)
}

// app.use(express.static(path.resolve(__dirname, './build')))

// app.get('/', function (req, res) {
// 	res.sendFile(path.resolve(__dirname, './build', 'index.html'))
// })
app.use('/uploads', express.static(uploadPath)) // Serve uploaded files
app.get('/uploads/:fileName', (req, res) => {
	const fileName = req.params.fileName
	const filePath = path.join(uploadPath, fileName)

	if (fs.existsSync(filePath)) {
		res.sendFile(filePath)
	} else {
		res.status(404).send('File not found')
	}
})

io.on('connection', (socket) => {
	console.log('connect')

	socket.emit('message history', messageHistory)
	socket.emit('file-history', fileHistory)
	socket.emit('chatsHistory', chatsArr)
	socket.emit(
		'listRegUsers',
		userArrServer.map((user) => user.name)
	)
	const regUser = (user) => {
		const newUserr = {
			name: user.name,
			pass: user.pass,
			token: jwt.sign({ username: user.name }, secretKey, {
				expiresIn: '1h',
			}),
		}
		userArrServer.push(newUserr)
		console.log('userArrServer', userArrServer)
		socket.username = user.name
		io.sockets.emit('login', { status: 'OK', name: user.name })
		userArrClient.push(user.name)
		io.sockets.emit('users_arr', userArrClient)
		io.sockets.emit(
			'listRegUsers',
			userArrServer.map((user) => user.name)
		)
	}
	const loginUser = (user) => {
		socket.username = user.name
		userArrClient.push(user.name)
		io.sockets.emit('users_arr', userArrClient)
	}
	socket.on('login', (data) => {
		console.log('data auth', data)
		if (data.SessionStore) {
			loginUser(data)
		}
		const found = userArrServer.find(
			(user) => user.name.toLowerCase() === data.name.toLowerCase()
		)
		if (!found) {
			regUser(data)
		} else {
			if (data.pass === found.pass) {
				loginUser(data)
			} else {
				io.sockets.emit('login', { status: 'FAILED' })
			}
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
			room: data.room,
		}
		messageHistory.push(newMess)
		io.sockets.emit('new message', newMess)
	})
	socket.on('file-upload', ({ fileData, fileType, fileName, nick, room }) => {
		const filePath = path.join(uploadPath, fileName)
		const stream = fs.createWriteStream(filePath)

		stream.write(Buffer.from(fileData))

		stream.on('finish', () => {
			const fileDataWithSender = {
				fileName,
				fileType,
				downloadLink: `uploads/${fileName}`,
				nick,
				room,
			}
			fileHistory.push(fileDataWithSender)
			io.emit('file-uploaded', fileDataWithSender)
		})

		stream.on('error', (err) => {
			console.error('Error in write stream:', err)
		})

		stream.end()
	})
	socket.on('chats new', (chats) => {
		console.log('chats', chats)
		chatsArr = chats
		io.sockets.emit('chats new', chatsArr)
	})
	socket.on('disconnect', () => {
		console.log('disconnected', socket.username)
		userArrClient = userArrClient.filter((user) => user !== socket.username)
		io.sockets.emit('users_arr', userArrClient)
	})
})

server.listen(PORT, IP_ADRESS, () => {
	console.log(`Server is running on http://${IP_ADRESS}:${PORT}`)
})
