import {ApolloServer, AuthenticationError, gql, UserInputError} from 'apollo-server'
import {v1 as uuid} from 'uuid'
import jwt from 'jsonwebtoken'


const JWT_SECRET = 'ESTA_ES_UNA_PALABRA_SECRETA_PARA_LOS_TOKENS'

import './db.js'
import Person from './models/Person.js'
import User from './models/User.js'


// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  enum YesNo {
    YES
    NO
  }

  type Address {
    street: String!
    city: String!
  }

  type Person {
    name: String!
    phone: String
    address: Address!
    id: ID!
  }

  type User {
    username: String!
    friends: [Person]!
    id: ID!
  }

  type Token {
    value: String!
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  type Query {
    personCount: Int!
    allPersons(phone: YesNo): [Person]!
    findPerson(name: String!): Person
    me: User
  }

  type Mutation {
    addPerson(
      name: String!
      phone: String
      street: String!
      city: String!
    ): Person
    editNumber(
      name: String!
      phone: String!
    ): Person
    createUser(
      username: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
    addAsFriend(
      name: String!
    ): User
  }
`

const resolvers = {
  Query: {
    personCount: async() => await Person.countDocuments(),
    allPersons: async(root, args) => {
      if (!args.phone) return Person.find({})

      return Person.find().where('phone').exists(args.phone === 'YES')
    },
    findPerson: async(root, args) => {
      const {name} = args
      return await Person.findOne({name})
    },
    me: (root, args, context) => {
      return context.currentUser
    }
  },
  Mutation: {
    addPerson: async(root, args, context) => {

      const {currentUser} = context
      if (!currentUser) throw new AuthenticationError('not authenticated')

      const person = new Person(args)
      try {
        await person.save()
        currentUser.friends = currentUser.friends.concat(person)
        await currentUser.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }

      return person
    },
    editNumber: async(root, args) => {
      const person = await Person.findOne({name: args.name})
      if (!person) return

      person.phone = args.phone

      try {
        await person.save( )
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }

      return person
    },
    createUser: async(root, args) => {
      const user = new User({username: args.username})

      try {
        await user.save( )
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }

      return user
    },
    login: async(root, args) => {
      const user = await User.findOne({username: args.username})

      if (!user || args.password !== 'secret') throw new UserInputError('Wrong credentials')

      const userForToken = {
        username: user.username,
        id: user._id
      }

      return {
        value: jwt.sign(userForToken, JWT_SECRET)
      }
    },
    addAsFriend: async(root, args, {currentUser}) => {
      if (!currentUser) throw new AuthenticationError('not authenticated')

      const person = await Person.findOne({name: args.name})

      const notFriendAlready = person => !currentUser.friends
        .map(p => p.id)
        .includes(person.id)

      if (notFriendAlready(person)) {
        currentUser.friends = currentUser.friends.concat(person)
        await currentUser.save()
      }

      return currentUser
    }
  },
  Person: {
    address: (root) => ({
      street: root.street,
      city: root.city
    })
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async({req}) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.substring(7)
      const {id} = jwt.verify(token, JWT_SECRET)
      const currentUser = await User.findById(id).populate('friends')

      return {currentUser}
    }
  }
})

server.listen().then(({url}) => {
  console.log(`Server ready at ${url}`)
})