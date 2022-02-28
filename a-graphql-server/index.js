require("dotenv").config();
const {
  ApolloServer,
  UserInputError,
  AuthenticationError,
  gql,
} = require("apollo-server");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Book = require("./models/book");
const Author = require("./models/author");
const User = require("./models/user");

const MONGODB_URI = process.env.MONGODB_URI;
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connecting to MongoDB:", error.message);
  });

const typeDefs = gql`
  type Author {
    name: String!
    born: Int
    bookCount: Int!
    id: ID!
  }

  type Book {
    title: String!
    author: Author!
    published: Int
    genres: [String!]!
    id: ID!
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int
      genres: [String!]!
    ): Book!

    editAuthor(name: String!, born: Int!): Author

    createUser(username: String!, favoriteGenre: String!): User

    login(username: String!, password: String!): Token
  }
`;

const resolvePromise = async ({ promise, errorType, message, args }) => {
  try {
    await promise;
  } catch (error) {
    if (!message) {
      message = error.message;
    }
    options = args ? { invalidArgs: args } : undefined;
    throw new errorType(message, options);
  }
};

const resolvers = {
  Query: {
    bookCount: async () => {
      return await Book.collection.countDocuments();
    },
    authorCount: async () => {
      return await Author.collection.countDocuments();
    },
    allBooks: async (root, args) => {
      const filter = {};
      if (args.genre) {
        filter.genres = args.genre;
      }
      if (args.author) {
        const author = await Author.findOne({ name: args.author });
        filter.author = author ? author._id.toString() : null;
      }

      const books = await Book.find(filter).populate("author");

      for (const book of books) {
        book.author.bookCount = await Book.find({
          author: { $in: book.author._id.toString() },
        }).count();
      }

      return books;
    },
    allAuthors: async () => {
      const authors = await Author.find({});
      for (const author of authors) {
        author.bookCount = await Book.find({
          author: { $in: author._id.toString() },
        }).count();
      }
      return authors;
    },
    me: (root, args, { currentUser }) => {
      return currentUser;
    },
  },

  Mutation: {
    addBook: async (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError("User not signed in");
      }
      const book = new Book({ ...args });
      let author = await Author.findOne({ name: args.author });
      if (!author) {
        author = new Author({ name: args.author });
        await resolvePromise({
          promise: author.save(),
          errorType: UserInputError,
          args,
          message: "Invalid name",
        });
      }
      book.author = author;
      await resolvePromise({
        promise: book.save(),
        errorType: UserInputError,
        args,
        message: "Invalid title",
      });
      return book;
    },

    editAuthor: async (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError("User not signed in");
      }
      const author = await Author.findOne({ name: args.name });
      if (!author) {
        throw new UserInputError("Author doesn't exist", { invalidArgs: args });
      }
      author.born = args.born;
      await resolvePromise({
        promise: author.save(),
        errorType: UserInputError,
        args,
      });

      const count = await Book.find({
        author: { $in: author._id.toString() },
      }).count();
      author.bookCount = count;

      return author;
    },
    createUser: async (root, args) => {
      const user = new User({ ...args });
      await resolvePromise({
        promise: user.save(),
        errorType: UserInputError,
        message: "Invalid username",
        args,
      });
      return user;
    },

    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });
      if (!user) {
        throw new UserInputError("No user with the username exists", {
          invalidArgs: arg,
        });
      }
      if (args.password != process.env.PASSWORD) {
        throw new AuthenticationError("Invalid password");
      }
      return {
        value: jwt.sign(
          {
            id: user._id,
            username: user.username,
            favoriteGenre: user.favoriteGenre,
          },
          process.env.JWT_SECRET
        ),
      };
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req?.headers.authorization;
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const decodedToken = jwt.verify(
        auth.substring(7),
        process.env.JWT_SECRET
      );
      const currentUser = await User.findById(decodedToken.id);
      return { currentUser };
    }
  },
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
