require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "myLittleSecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  secret: String,
  // googleId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ username: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", (req, res) => {
  User.findById(req.user.id)
    .then((foundUser) => {
      if (foundUser) {
        foundUser.secret = req.body.secret;
        foundUser.save().then(() => {
          res.redirect("/secrets");
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/secrets", (req, res) => {
  User.find({ secret: { $ne: null } }).then((foundUser) => {
    if (foundUser) {
      res.render("secrets", { usersWithSecrets: foundUser });
    }
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

// app.get("/secrets", (req, res) => {
//   if (req.isAuthenticated()) {
//     res.render("secrets");
//   } else {
//     res.redirect("/login");
//   }
// });

app.post("/register", (req, res) => {
  User.register({ username: req.body.username }, req.body.password)
    .then((user) => {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    })
    .catch((err) => {
      console.log(err);
      res.render("/register");
    });
});

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (!err) {
      passport.authenticate("local")(req, res, function (data) {
        console.log(data);
        res.redirect("/secrets");
      });
    } else {
      res.redirect("/register");
    }
  });
});

app.listen(3000, () => {
  console.log("Server Started at " + new Date().getSeconds());
});
