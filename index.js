const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const DBURI = process.env.MONGO_URI;

mongoose.connect(DBURI, {autoIndex: true});

const userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  count: Number, // Number of exercises
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
});

const User = mongoose.model("User", userSchema);

const createAndSaveUser = (username,done) => {
  let newUser = new User({
    username: username,
    count: 0,
    log: []
  });

  newUser.save((err,data) => {
    if(err){
      console.error(err);
    }
    done(null,data);
  });
};

const getUserById = (id,done) => {
  User.findById(id, (err,data) => {
    if(err){
      console.error(err);
    }

    done(null,data);
  });
}

const getAllUsers = (done) => {
  User.find({},(err,data) =>{
    if(err){
      console.error(err);
    }

    done(null,data);
  })
}

const addExercises = (id,description,duration,date,done) => {
  getUserById(id, (err,data) => {
    if(err){
      console.error(err);
    }

    let newExercise = {
      description: description,
      duration: duration,
      date: date
    };

    data.log = [...data.log, newExercise];
    data.count++;

    data.save((err,data) => {
      if(err){
        console.error(err);
      }
      done(null,data);
    });
  })
};

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Create new user
app.post("/api/users", (req, res) => {
  const body = req.body;
  const username = body.username;

  createAndSaveUser(username,(err,data) => {
    res.json({username: data.username, _id: data._id});
  });
});

// Get all users
app.get("/api/users", (req,res) => {
  getAllUsers((err,data) => {
    if(err){
      console.error(err);
    }
    const users = data.map(i => {
      return {_id: i._id, username: i.username}
    });
    res.json(users);
  });
});

// Add exercises
app.post("/api/users/:_id/exercises", (req,res) => {
  const body = req.body;
  const id = req.params._id;
  const date = body.date ? new Date(body.date) : new Date();

  if(!id){
    return res.status(400).end()
  }

  addExercises(id,body.description,body.duration,date.toDateString(),(err,data) => {
    if(err){
      console.error(err);
    }

    res.json({_id: data._id, username: data.username, date: data.log[data.count - 1].date, duration: data.log[data.count - 1].duration, description: data.log[ data.count - 1].description});
  });
});

// Get user exercise log
app.get("/api/users/:id/logs", (req,res) => {
  const id = req.params.id;
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);
  const limit = Number(req.query.limit);

  getUserById(id,(err,data) => {
    if(err){
      console.error(err);
    }

    let logs = data.log;

    if(req.query.from && req.query.to){
      logs = logs.filter(log => {
        let toDate = new Date(log.date);
        if(toDate > from && toDate < to){
          return log;
        }
      });
    }else{
      logs = logs.filter(log => {
        let toDate = new Date(log.date);
        if(toDate < Date.now()){
          return log;
        }
      });
    }

    if(limit){
      logs = logs.splice(0,limit);
    }

    const toObject = {
      _id: data.id,
      username: data.username,
    }

    if(req.query.from){
      toObject["from"] = from.toDateString();
    }

    if(req.query.to){
      toObject["to"] = to.toDateString();
    }

    toObject["count"] = data.count;
    toObject["log"] = logs;

    res.json(toObject);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
