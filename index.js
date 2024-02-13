require('dotenv').config()

const express = require('express')
const http = require('http')
const https = require('https')
const { Server } = require('socket.io')
const helmet = require('helmet')
const fs = require('fs')
const path = require('path')

const app = express()
app.use(helmet())

// Загрузка файлов SSL-сертификата
const privateKey = fs.readFileSync(
	'/etc/letsencrypt/live/chat304.ru/privkey.pem',
	'utf8'
)
const certificate = fs.readFileSync(
	'/etc/letsencrypt/live/chat304.ru/cert.pem',
	'utf8'
)
const ca = fs.readFileSync(
	'/etc/letsencrypt/live/chat304.ru/fullchain.pem',
	'utf8'
)

const credentials = { key: privateKey, cert: certificate, ca: ca }

const httpServer = http.createServer(app)
const httpsServer = https.createServer(credentials, app)

const IP_ADDRESS = process.env.IP_ADDRESS || '193.187.172.3'
const HTTP_PORT = process.env.HTTP_PORT || 80
const HTTPS_PORT = process.env.HTTPS_PORT || 443

const io = new Server(httpsServer, {
	maxHttpBufferSize: 1e8,
	cors: {
		origin: '*',
		methods: ['GET', 'POST'],
	},
})

let users_arr = []
let messageHistory = []
let fileHistory = []
let chatsArr = ['Основной', 'Крутой', 'Ровный']

const uploadPath = path.join(__dirname, 'uploads')

if (!fs.existsSync(uploadPath)) {
	fs.mkdirSync(uploadPath)
}

app.use(express.static(path.resolve(__dirname, './build')))

app.get('/', (req, res) => {
	res.sendFile(path.resolve(__dirname, './build', 'index.html'))
})

app.use('/uploads', express.static(uploadPath))

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
				downloadLink: `/uploads/${fileName}`,
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
		users_arr = users_arr.filter((user) => user !== socket.username)
		io.sockets.emit('users_arr', { users_arr })
	})
})
httpServer.listen(HTTP_PORT, IP_ADDRESS, () => {
	console.log(`HTTP сервер запущен на http://${IP_ADDRESS}:${HTTP_PORT}`)
})

httpsServer.listen(HTTPS_PORT, IP_ADDRESS, () => {
	console.log(`HTTPS сервер запущен на https://${IP_ADDRESS}:${HTTPS_PORT}`)
})
