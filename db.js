require('dotenv').config()

const MongoClient = require('mongodb').MongoClient
const mongoClient = new MongoClient(
	`mongodb+srv://kamushekkamushek:${process.env.DB_PASSWORD}@chat-react.t1xyppf.mongodb.net/?retryWrites=true&w=majority`
)

async function run() {
	try {
		await mongoClient.connect()
		const db = mongoClient.db('usersdb')
		const collection = db.collection('users')
		const user = { name: 'Tom', age: 28 }
		const result = await collection.insertOne(user)
		console.log(result)
		console.log(user)
	} catch (err) {
		console.log(err)
	} finally {
		await mongoClient.close()
		console.log('Подключение закрыто')
	}
}
run().catch(console.log)
