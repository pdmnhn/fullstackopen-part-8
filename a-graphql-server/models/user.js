const mongoose = require("mongoose");

const user = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 4,
    unique: true,
  },
  favoriteGenre: {
    type: String,
  },
});

module.exports = mongoose.model("User", user);
