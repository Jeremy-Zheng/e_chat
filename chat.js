
var express = require('express');
var app=express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');



//设置一些参数
app.set('views', path.join(__dirname, 'views')); //设置视图目录
app.set('view engine', 'ejs');                   //设置解析视图的引擎

//---这中间的我也不晓得是啥子鸡巴---------------------------
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
//---这中间的我也不晓得是啥子鸡巴---------------------------


app.use(express.static(path.join(__dirname, 'public')));  //设置一个存放静态文件的目录

//这里没有写任何的路由 就是一个接受请求 发送一个静态文件
app.get('/', function (req, res) {

    console.log("/////////");

    res.sendfile('./public/chat.html', function () {

        //res.end();
    });


    //res.render('index', { title: 'caonima', name: 'zhengjie' });

});

var msg = [];

app.post('/talk', function (req, res) {

    msg.push(req.body.content);
    console.log(msg);

    res.write(msg.join(), function () {
        res.end();
    });


});

app.post('/polling', function (req, res) {

    var index = req.body.index;

    var tick = setInterval(function () {
        if (msg[index] != '' && msg[index] != null && msg[index] != undefined) {
            res.end(msg[index]);
            clearInterval(tick);
        }
    }, 1000);


});


http.listen(1028, function(){
    console.log('listening on *:3000');
});


//下面就是关于socket.io的一切
io.on('connection', function(socket){
    console.log('a user connected');
});
//下面就是关于socket.io的一切



app.listen(1028);




