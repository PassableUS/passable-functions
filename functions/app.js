const express = require('express')
const bodyParser = require('body-parser')
const middleware = require('./utils/middleware')

const app = express()
const cors = require('cors')

const usersRouter = require('./controllers/users')

// Middleware
app.use(cors())
app.use(bodyParser.json())

// Routers
app.use('/users', usersRouter)

// After router middleware
app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)



module.exports = app