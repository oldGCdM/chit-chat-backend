if (process.env.NODE_ENV !== 'production') require('dotenv').config()
const ENV = process.env

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const sessions = require('client-sessions')

const DB = require('./db.js')

// app.use(sessions({
//   cookieName: 'session',
//   secret: process.env['CHIT_CHAT_SESSION_SECRET'],
//   duration: 60 * 60 * 1000, // 1h
// }))


// // SMART USER MIDDLEWARE
// app.use((req, res, next) => {
//   if ( !(req.session && req.session.userId) ) return next()

//   // Look for user in database and add them to the req object
//   // NOTE remove password hash (= undefined)
// })

// app.post('/register', (req, res) => {
//   const newUser = {
//     username: req.body.username,
//     password: req.body.password,
//   }

//   // FAKE PLACEHOLDER vv change to postgres functions
//   DB.createUser(newUser, (err) => {
//     if (err) {
      
//     }
//   })
// })

// app.post('/login', (req, res) => {
//   // FAKE PLACEHOLDER vv change to postgres functions
//   DB.findUser({ email: req.body.email }, (err, user) => {
//     if (!user || password_auth() ) {
//       return res.render('login', { error: "Incorrect email / password"})
//     }
//   })
//   // set the session cookie info, which will be encrypted
//   req.session.userId = user.id
//   res.redirect('/mainPage')
// })

// app.get('/dashboard', (req, res) => {
//   req.user
// })