let express = require('express');
let passport = require('passport');
let Strategy = require('passport-http-bearer').Strategy;
let jwt = require('jsonwebtoken');
let md5 = require("blueimp-md5");
let bodyParser = require('body-parser');
let _ = require('lodash');
let MongoClient = require('mongodb').MongoClient;
let url = "mongodb://localhost:27017/";


const DBName = 'horse';
// Configure the Bearer strategy for use by Passport.
//
// The Bearer strategy requires a `verify` function which receives the
// credentials (`token`) contained in the request.  The function must invoke
// `cb` with a user object, which will be set at `req.user` in route handlers
// after authentication.
passport.use(new Strategy(
    function (token, cb) {
        console.log('token = ' + token);
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            let dbo = db.db(DBName);
            let whereStr = { "token": token };  // 查询条件
            dbo.collection("users").find(whereStr).toArray(function (err, result) {
                if (err) return cb(err);
                if (result && result.length > 0 && result[0]) {
                    console.log('token有效----------->');
                    console.log(result[0]);
                    return cb(null, result[0]);
                } else {
                    return cb(null, false);
                }
            });
        });
    }));

// Create a new Express application.
let app = express();
// Configure Express application.
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
app.use(require('morgan')('combined'));


// curl -v -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicGFzc3dvcmQiOiIyNWQ1NWFkMjgzYWE0MDBhZjQ2NGM3NmQ3MTNjMDdhZCIsImlhdCI6MTUyODI2ODQ3OX0.MWaLEIpRIawWrYKC4h9SpSmUG3slfP-a4Iv-uQihhVw" http://127.0.0.1:8081/profile
app.get('/profile',
    passport.authenticate('bearer', { session: false }),
    function (req, res) {
        console.log('get profile------------>>');
        res.json(req.user);
    }
);
// curl -i -H "Content-Type:application/json" -X POST -d '{"username": "admin", "password":"12345678", "confirm": "12345678"}' http://127.0.0.1:8081/createAccount
app.post('/createAccount', function (req, res) {
    let username = _.get(req.body, 'username');
    let password = _.get(req.body, 'password');
    let confirm = _.get(req.body, 'confirm');
    if (password && password === confirm) {
        if (/^[a-zA-Z0-9_-]{4,16}$/.test(username) && /^\S{6,10}$/.test(password)) {
            MongoClient.connect(url, function (err, db) {
                if (err) throw err;
                let dbo = db.db(DBName);
                new Promise((resolve, reject) => {
                    let whereStr = { "username": username };  // 查询条件
                    dbo.collection("users").find(whereStr).toArray(function (err, result) {
                        if (err) reject(new Error(err));
                        console.log('username = ' + username);
                        if (_.get(result[0], 'username') === username) {
                            console.log('用户已存在');
                            reject(new Error('用户已存在'));
                        } else {
                            console.log('用户不存在');
                            resolve();
                        }
                    });
                }).then(() => {
                    let token = jwt.sign({ username: username, password: md5(password) }, 'shhhhh');
                    let user = { username: username, password: md5(password), token: token };

                    dbo.collection("users").insertOne(user, function (err, dbRes) {
                        if (err) throw err;
                        console.log("开始创建用户---->>");
                        console.log(dbRes.ops[0]);
                        db.close();
                        res.json({ _id: dbRes.ops[0]._id, username: dbRes.ops[0].username, token: dbRes.ops[0].token });
                    });
                }).catch((err) => {
                    db.close();
                    res.status(403).json({ message: '账号创建失败' });
                });
            });
        } else {
            res.status(403).json({ message: '账号或密码不合法' });
        }
    } else {
        console.log("两次输入密码不一致---->>");
        res.status(403).json({ message: '两次输入密码不一致' });
    }
});

// curl -i -H "Content-Type:application/json" -X POST -d '{"username": "admin", "password":"12345678"}' http://127.0.0.1:8081/login
app.post('/login', function (req, res) {
    let username = _.get(req.body, 'username');
    let password = _.get(req.body, 'password');
    if (/^[a-zA-Z0-9_-]{4,16}$/.test(username) && /^\S{6,10}$/.test(password)) {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            let dbo = db.db(DBName);
            new Promise((resolve, reject) => {
                let whereStr = { "username": username };  // 查询条件
                dbo.collection("users").find(whereStr).toArray(function (err, result) {
                    if (err) reject(new Error(err));
                    console.log('username = ' + username);
                    if (_.get(result[0], 'username') === username && _.get(result[0], 'password') === md5(password)) {
                        console.log('账号密码匹配');
                        console.log(result[0]);
                        resolve(result[0]);
                    } else {
                        console.log('账号或密码不正确');
                        reject(new Error('账号或密码不正确'));

                    }
                });
            }).then((user) => {
                console.log(user);
                db.close();
                res.json({ _id: user._id, username: user.username, token: user.token });
            }).catch((err) => {
                db.close();
                res.status(403).json({ message: '登录失败' });
            });
        });
    } else {
        res.status(403).json({ message: '账号或密码不合法' });
    }
});

app.listen(8081);
