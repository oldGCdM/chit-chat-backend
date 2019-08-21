if (process.env.NODE_ENV !== 'production') require('dotenv').config()

const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const bodyParser = require('body-parser')
const cookieParser = require('cookie')
const sessions = require('client-sessions')
const bcrypt = require('bcryptjs')

const DB = require('./db')
const serialise = require('./serializer')

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
    passwordDigest: bcrypt.hashSync(req.body.password, parseInt(process.env.BCRYPT_WORK_FACTOR)),
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

app.get('/logout', requireLogin, (req, res) => {
  req.session.destroy()
  res.json({ logout: true })
})

const onlineUsers = {

}

io.on('connection', (socket) => {
  const userId = getUserIdFromCookies(socket.handshake.headers.cookie)
  console.log("\n( ---- | New connection | ---- )\n")
  // set socket.user and emit initial data (i.e. all conversations as they currently are)
  DB.User.findOne({ where: { id: userId } })
  .then(async (user) => {
    socket.user = user.get({ plain: true })
    socket.user.passwordDigest = undefined

    const conversations = await user.getConversations()
    const conversationPromises = conversations.map(serialise.conversation)
    const serialisedConversations = await Promise.all(conversationPromises)
    serialisedConversations.forEach(convo => socket.join('conversation' + convo.id))
    socket.emit('initial-conversations', serialisedConversations)
  })

  socket.on('new-message', ({ content, conversationId }) => {
    DB.Message.create({
      content,
      senderId: socket.user.id,
    })
    .then( async newMessage => {
      const conversation = await DB.Conversation.findByPk(conversationId)
      await conversation.addMessage(newMessage)
      io.to('conversation' + conversation.id).emit('new-message', await serialise.message(newMessage), conversationId)
    })
  })

  socket.on('disconnect', () => console.log("\n( XXXX | Connection closed | XXXX )\n"))
})

server.listen(process.env['CHITCHAT_BACKEND_PORT'], () => 
  console.log(`Listening on port ${process.env['CHITCHAT_BACKEND_PORT']}`)
)

const getUserIdFromCookies = (cookies) => {
  const cookiesObj = cookieParser.parse(cookies)

  if (cookiesObj.session) {
    const decodedCookie = sessions.util.decode({
      cookieName: 'session',
      secret: process.env['CHITCHAT_SESSION_SECRET'],
      duration: 60 * 60 * 1000,
    }, cookiesObj.session)

    return decodedCookie.content.userId
  }
}
