// Required packages
require("dotenv").config();
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const session = require("cookie-session");
const express = require("express");
const createError = require("http-errors");
const _ = require("lodash");
const mongoose = require("mongoose");
const logger = require("morgan");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const path = require("path");

// Routes
const indexRouter = require("./routes/index");

// Express Initialization
const app = express();

// Lodash in EJS
app.locals._ = _;

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Mongoose logger
mongoose.set("debug", true);

// Express logger
app.use(logger("dev"));

// Parse forms
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Parse cookies
app.use(cookieParser());

// Cookie Sessions
app.use(session({ name: "tecnodum", secret: "tecnodum", keys: ["tecnodum"] }));

// Added flash messages
app.use(flash());

// Use static files
app.use(express.static(path.join(__dirname, "public")));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Initialize User model and passport local strategy
const User = require("./models/user");
passport.use(new LocalStrategy(User.authenticate()));

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://tecnodum.herokuapp.com:443/auth/google/tecnodum",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOne({ googleId: profile.id }, function (err, user) {
        if (err) {
          console.log(err);
          return cb(err);
        } else {
          if (!user) {
            user = new User({
              googleId: profile.id,
              name: profile.displayName,
              username: profile.emails[0].value,
            });
            user.save(function (err) {
              if (err) {
                console.log(err);
              } else {
                return cb(err, user);
              }
            });
          } else {
            return cb(err, user);
          }
        }
      });
    }
  )
);

// Serialize User data for session
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Mongoose connect
mongoose.connect(
  "mongodb+srv://" +
    process.env.MONGO_USER +
    ":" +
    process.env.MONGO_PWD +
    "@tecnodum.jcmga.mongodb.net/tecnodumDB?retryWrites=true&w=majority"
);

// Use routes
app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
