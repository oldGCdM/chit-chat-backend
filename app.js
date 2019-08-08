if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const ENV = process.env

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const sessions = require('client-sessions')
const bcrypt = require('bcryptjs')

const DB = require('./db.js')

// app.use(sessions({
//   cookieName: 'session',
//   secret: process.env['CHITCHAT_SESSION_SECRET'],
//   duration: 60 * 60 * 1000, // 1h
// }))


// // SMART USER MIDDLEWARE
// app.use((req, res, next) => {
//   if ( !(req.session && req.session.userId) ) return next()

//   // Look for user in database and add them to the req object
//   // NOTE remove password hash (= undefined)
// })

// Parse JSON from requests and put result in req.body
app.use( bodyParser.json() )

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000')  
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')

  next()
})

app.post('/register', (req, res) => {
  const newUser = {
    username: req.body.username,
    passwordDigest: bcrypt.hashSync(req.body.password),
  }

  DB.User.create(newUser)
  .then((newUser) => {
    const userInfo = newUser.get({ plain: true })
    res.json({ username: userInfo.username })
  })
  .catch((err) => {
    res.json({ error: err.message })
  })
})

app.post('/login', (req, res) => {
  // // FAKE PLACEHOLDER vv change to postgres functions
  // DB.findUser({ email: req.body.email }, (err, user) => {
  //   if (!user || password_auth() ) {
  //     return res.render('login', { error: "Incorrect email / password"})
  //   }
  // })
  // // set the session cookie info, which will be encrypted
  // req.session.userId = user.id
  // res.redirect('/mainPage')

  console.log(req.body)
  res.json({ error: "Could not log you in" })
})

// app.get('/dashboard', (req, res) => {
//   req.user
// })

app.listen(process.env['CHITCHAT_BACKEND_PORT'], () => 
  console.log(`Listening on port ${process.env['CHITCHAT_BACKEND_PORT']}`)
)