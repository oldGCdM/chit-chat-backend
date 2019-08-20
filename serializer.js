// const DB = require('./db.js')

const conversation = async (conversation) => {
  const messages = await conversation.getMessages()
  const serialisedMessages = await Promise.all(messages.map(message))

  return {
    id: conversation.id,
    name: conversation.name,
    messages: serialisedMessages,
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
  message,
}