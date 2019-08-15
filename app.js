if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const ENV = process.env
const workFactor = parseInt(ENV.BCRYPT_WORK_FACTOR)

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const sessions = require('client-sessions')
const bcrypt = require('bcryptjs')

const DB = require('./db.js')

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000')  
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Credentials', 'true')

  next()
})

// SESSION COOKIE MANAGER
app.use(sessions({
  cookieName: 'session',
  secret: process.env['CHITCHAT_SESSION_SECRET'],
  duration: 60 * 60 * 1000, // 1h
}))

// SMART USER MIDDLEWARE
app.use((req, res, next) => {
  if ( !(req.session && req.session.userId) ) return next()

  DB.User.findOne({ where: { id: req.session.userId } })
  .then((user) => {
    req.user = user.get({ plain: true })
    req.user.passwordDigest = undefined
    next()
  })
  .catch((err) => {
    req.session.userId = undefined

    console.log("111111111111111111111111111111111111111111\n------------------------------------------\n111111111111111111111111111111111111111111")
    console.log(err)
    console.log("111111111111111111111111111111111111111111\n------------------------------------------\n111111111111111111111111111111111111111111")

    next(err)
  })
})

// JSON PARSER FOR REQ.BODY
app.use( bodyParser.json() )

// AUTHORIZATION CHECKER
const requireLogin = (req, res, next) => {
  if (req.user) return next()

  res.json({ error: "You are not authorised to access this data" })
}

app.post('/register', (req, res) => {

  const newUser = {
    username: req.body.username,
    passwordDigest: bcrypt.hashSync(req.body.password, workFactor),
  }

  DB.User.create(newUser)
  .then((newUser) => {
    const userInfo = newUser.get({ plain: true })

    req.session.userId = userInfo.id
    res.json({ username: userInfo.username })
  })
  .catch((err) => {
    res.json({ error: err.message })
  })
})

app.post('/login', (req, res) => {

  DB.User.findOne({ where: { username: req.body.username } })
  .then((user) => {
    const userInfo = user.get({ plain: true })

    if (bcrypt.compareSync(req.body.password, userInfo.passwordDigest)) {
      req.session.userId = userInfo.id
      res.json({ username: userInfo.username })
    } else {
      res.json({ error: "Invalid username / password" })
    }
  })
  .catch((err) => {
    res.json({ error: "Invalid username / password" })
  })
})

app.get('/validate', requireLogin, (req, res) => {
  res.json({ username: req.user.username })
})

// app.get('/dashboard', (req, res) => {
//   req.user
// })

app.listen(process.env['CHITCHAT_BACKEND_PORT'], () => 
  console.log(`Listening on port ${process.env['CHITCHAT_BACKEND_PORT']}`)
)