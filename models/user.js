// Required packages
const mongoose = require("mongoose"),
  passportMongoose = require("passport-local-mongoose");

// Schema definition
const usersSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: String,
  role: { type: String, default: "user" },
  shoppingCart: {},
});

// Add plugin to Schema
usersSchema.plugin(passportMongoose, {
  errorMessages: {
    IncorrectPasswordError: "Contraseña incorrecta",
    IncorrectUsernameError: "Nombre de usuario o contraseña incorrecta",
  },
});

// Model definition and export
const User = mongoose.model("User", usersSchema);
module.exports = User;
