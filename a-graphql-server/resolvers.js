const jwt = require("jsonwebtoken");
const { UserInputError, AuthenticationError } = require("apollo-server");
const { PubSub } = require("graphql-subscriptions");
const User = require("./models/user");
const Book = require("./models/book");
const Author = require("./models/author");

const pubsub = new PubSub();

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
        book.author.bookCount = book.author.books.length;
      }
      return books;
    },

    allAuthors: async () => {
      const authors = await Author.find({});
      for (const author of authors) {
        author.bookCount = author.books.length;
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
      author.books.push(book);
      await author.save();

      book.author.bookCount = book.author.books.length;

      pubsub.publish("BOOK_ADDED", { bookAdded: book });

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

  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(["BOOK_ADDED"]),
    },
  },
};

module.exports = resolvers;
