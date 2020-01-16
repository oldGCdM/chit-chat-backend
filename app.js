if (process.env.NODE_ENV !== 'production') require('dotenv').config()

const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const bodyParser = require('body-parser')
const cookieParser = require('cookie')
const sessions = require('client-sessions')
const bcrypt = require('bcryptjs')

const DB = require('./db')
const serialise = require('./serialiser')

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

  req.session.destroy()
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

app.post('/users', requireLogin, async (req, res) => {
  const users = await DB.User.findAll()
  const conversation = await DB.Conversation.findByPk(req.body.conversationId)
  const conversationUsers = await conversation.getUsers()
  const conversationUsersIds = conversationUsers.map( u => u.id )
  const usersNotInConversation = users.filter( u => !conversationUsersIds.includes(u.id) )

  const usersInfo = await Promise.all(usersNotInConversation.map(serialise.user))

  res.json(usersInfo)
})

io.on('connection', (socket) => {
  const userId = getUserIdFromCookies(socket.handshake.headers.cookie)
  console.log("\n( ---- | New connection | ---- )\n")

  // set socket.user and emit initial data (i.e. all conversations as they currently are, and all users)
  DB.User.findByPk(userId)
  .then(async (user) => {
    socket.user = user
    socket.user.passwordDigest = undefined

    const conversations = await user.getConversations()
    conversations.sort((a, b) => b.createdAt - a.createdAt)
    const conversationPromises = conversations.map(serialise.conversation)
    const serialisedConversations = await Promise.all(conversationPromises)
    serialisedConversations.forEach(convo => socket.join('conversation' + convo.id))
    // const users = await DB.User.findAll()
    // const usersInfo = await Promise.all(users.map(serialise.user))
    socket.emit('initial-conversations', serialisedConversations)
  })

  socket.on('create-message', ({ content, conversationId }) => {
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

  socket.on('create-conversation', () => {
    DB.Conversation.create({ name: null })
    .then( async newConversation => {
      await newConversation.addUser(socket.user)
      socket.join('conversation' + newConversation.id)
      socket.emit('new-conversation', await serialise.conversation(newConversation))
    })
  })

  socket.on('add-user-to-conversation', async (username, conversationId) => {
    const user = await DB.User.findOne({ where: { username: username } })
    const conversation = await DB.Conversation.findByPk(conversationId)

    conversation.addUser(user)

    const userInfo = await serialise.user(user)
    socket.emit('new-user-in-conversation', userInfo, conversationId)
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
