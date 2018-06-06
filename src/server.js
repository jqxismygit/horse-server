//express_demo.js 文件
let express = require('express');
let app = express();

app.get('/', function (req, res) {
    res.send('Hello World');
})

app.get('/test', function (req, res) {
    res.send('Hello World test');
})

let server = app.listen(8081, function () {

    let host = server.address().address
    let port = server.address().port

    console.log("应用实例，访问地址为 http://%s:%s", host, port)

})



