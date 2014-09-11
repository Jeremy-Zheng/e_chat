/**
 * Created by Administrator on 2014/9/10.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

//app.set('views', path.join(__dirname, 'views')); //设置视图目录

app.use(express.static(path.join(__dirname, 'public')));  //设置一个存放静态文件的目录

app.get('/', function (req, res) {
    res.sendfile('public/chat.html');
});


io.on('connection', function (socket) {

    //接受一个名字消息
    socket.on('name', function (data) {
        socket.name=data;
        socket.emit('name', data);
        io.emit('msg', socket.name+" 加入聊天室......");
    });


    //接受客户端发送过来的聊天信息,再群发出去
    socket.on('msg', function (msg) {
        io.emit('msg',  socket.name+": "+msg);
    });


    //与socket失去联系的触发的函数
    socket.on('disconnect', function () {
        //console.log('操你妈 失联了。。。。。。');
    });




});





http.listen(3000, function () {
    console.log("3000 端口开启了......");
});