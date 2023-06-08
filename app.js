require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;
mongoose.connect("mongodb://localhost:27017/userDB");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  bcrypt.hash(req.body.password, 10).then((hash) => {
    const newUser = new User({
      email: req.body.username,
      password: hash,
    });

    newUser.save().then(() => {
      res.render("secrets");
    });
  });
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({ email: username })
    .then((data) => {
      bcrypt.compare(password, data.password).then((resp) => {
        if (resp) {
          res.render("secrets");
        } else {
          res.send("Wrong password");
        }
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

app.listen(3000, () => {
  console.log("Server Started at " + new Date().getSeconds());
});
