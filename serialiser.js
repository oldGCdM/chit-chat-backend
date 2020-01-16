// const DB = require('./db.js')

const conversation = async (conversation) => {
  const messages = await conversation.getMessages()
  const serialisedMessages = await Promise.all(messages.map(message))

  const users = await conversation.getUsers()
  const serialisedUsers = await Promise.all(users.map(user))

  return {
    id: conversation.id,
    name: conversation.name,
    users: serialisedUsers,
    messages: serialisedMessages,
  }
}

const user = async (user) => {
  return {
    id: user.id,
    username: user.username, 
  }
}

const message = async (message) => {
  const user = await message.getUser()
  
  return {
    senderUsername: user.username,
    content: message.content,
  }
}


module.exports = {
  conversation,
  user,
  message,
}