if (process.env.NODE_ENV !== 'production') require('dotenv').config()

// const pg = require('pg')
// const pgStore = require('pg-hstore')

const Sequelize = require('sequelize')

const sequelize = new Sequelize(
  process.env['SEQUELIZE_DB_NAME'],
  process.env['SEQUELIZE_DB_USERNAME'],
  process.env['SEQUELIZE_DB_PASSWORD'],
  { dialect: 'postgres' }
)

// refactor to NOT allowNull by default

class User extends Sequelize.Model {}
User.init({
  username: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      // -------------------------------------------
      // custom unique validator, to control message
      isUnique: async (value) => {
        const exists = await User.findOne({
          where: { username: value }
        })
        
        if (exists) throw new Error('That username is already in use')
      },
      // -------------------------------------------
    },
  },
  passwordDigest: {
    type: Sequelize.STRING,
    allowNull: false,
  },
}, {
  sequelize,
  indexes: [{
    unique: true,
    fields: ['username'],
  }]
})

class Message extends Sequelize.Model {}
Message.init({
  senderId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  content: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
}, {
  sequelize,
})

class Conversation extends Sequelize.Model {}
Conversation.init({
  name: {
    type: Sequelize.STRING,
    allowNull: true,
  },
}, {
  sequelize,
})

// class ConversationUser extends Sequelize.Model {}
// ConversationUser.init//({ ... })

User.hasMany(Message, { foreignKey: 'senderId' })
Message.belongsTo(User, { foreignKey: 'senderId' })

Conversation.hasMany(Message)

Conversation.belongsToMany(User, { through: 'ConversationUser' })
User.belongsToMany(Conversation, { through: 'ConversationUser' })


sequelize.authenticate()
.then(() => {
  console.log("Connected to database!")
  sequelize.sync()
})
.catch((err) => {
  console.log("ERROR: Could not connect to database:\n", err)
})


module.exports = {
  User,
  Message,
  Conversation,
}