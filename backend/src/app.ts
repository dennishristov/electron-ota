import bluebird from 'bluebird'
import bodyParser from 'body-parser'
import compression from 'compression'
import errorHandler from 'errorhandler'
import express from 'express'
import lusca from 'lusca'
import mongoose from 'mongoose'
import path from 'path'
import socketio from 'socket.io'
import { EventTypes } from 'shared'

import { UserDocument } from './models/User'

import { MONGODB_URI } from './util/env'
import ClientSocket from './util/ClientSocket';
import UserService from './services/UserService';
import ApplicationService from './services/ApplicationService';
import Mediator from './handlers/Mediator';
import UserLoginHandler from './handlers/user/UserLoginHandler';
import UserAuthenticationHandler from './handlers/user/UserAuthenticationHandler';


// Create Express server
const app = express()

// Connect to MongoDB
const mongoUrl = MONGODB_URI;
mongoose.Promise = bluebird
mongoose.connect(mongoUrl, { useNewUrlParser: true })
	.catch(err => {
	console.log('MongoDB connection error. Please make sure MongoDB is running. ' + err)
	// process.exit();
})

// const db = mongoose.connection

// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function() {
// 	console.log(db)
	
// });

// Express configuration
app.set('port', process.env.PORT || 4000)
// app.set('views', path.join(__dirname, '../views'))
app.use(compression())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(lusca.xframe('SAMEORIGIN'))
app.use(lusca.xssProtection(true))

/**
 * Primary app routes.
 */
app.get('/', (_, res) => {
	res.sendStatus(204)
})


/**
 * Error Handler. Provides full stack - remove for production
 */
process.env.NODE_ENV !== 'production' && app.use(errorHandler())

const server = require('http').createServer(app)

/**
 * Start Express server.
 */
server.listen(app.get('port'), () => {
	console.log(
		'App is running at http://localhost:%d in %s mode',
		app.get('port'),
		app.get('env')
	)
})


const io = socketio(server)
const admins = io.of('/admins')

const userService = new UserService()
const applicationService = new ApplicationService()

const adminsMediator = new Mediator(admins)

adminsMediator.registerHandler(new UserLoginHandler(EventTypes.Login, userService))
adminsMediator.registerHandler(new UserAuthenticationHandler(EventTypes.Authentication, userService))

require('./util/extensions')


export default app