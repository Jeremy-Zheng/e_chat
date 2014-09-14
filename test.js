/**
 * Created by Administrator on 2014/9/10.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

app.use(express.static(path.join(__dirname, 'public')));  //设置一个存放静态文件的目录

app.get('/', function (req, res) {
    res.sendfile('public/chat.html');
});

var pair_id = 0;


var socket_array = [];

var pair_array = [];

//io 链接上
io.sockets.on('connection', function (socket) {

    //console.log("现在有"+io.sockets.server.eio.clientsCount+"人在线……");

    socket.emit("msg", "现在有" + io.sockets.server.eio.clientsCount + "人在线……");

    //接受一个名字消息
    socket.on('name', function (data) {
        socket.name = data;
        socket.emit("msg", data + " 欢迎你来到easy chat");


        //todo 关于配对的操作
        //todo 如果没有就把这个推进去，并返回一个等待的消息
        if (socket_array.length == 0) {
            socket_array.push(socket);
            socket.emit("msg", "请耐心等待正在配对中……");
        }
        //todo 如果有的话，就在socket_array里面选一个出来跟它配对
        else {
            //生成一个pair
            var pair = {"a": socket_array[0], "b": socket, pair_id: pair_id};
            socket_array[0].pair_id = pair_id;
            socket.pair_id = pair_id;
            pair_id++;

            //删除等待数组里面的元素
            socket_array.splice(0, 1);

            //推送进入数组
            pair_array.push(pair);

            //发送消息
            pair.a.emit("msg", "与" + socket.name + "配对成功，尽情聊天吧……");
            pair.b.emit("msg", "与" + pair.a.name + "配对成功，尽情聊天吧……");

        }







    });

    //接受客户端发送过来的聊天信息,再群发出去
    socket.on('msg', function (data) {

        //如果是没有配对的用户，就给一个提示
        if (socket.pair_id == -1 || socket.pair_id == undefined
            || socket.pair_id == null) {
            socket.emit("msg", "对不起……还没有人跟你配对……");
        }


        //找到需要转发的用户，把消息转发出去
        for (var i = 0; i < pair_array.length; i++) {
            if (socket.pair_id == pair_array[i].pair_id) {
                pair_array[i].a.emit("msg", socket.name + ":" + data);
                pair_array[i].b.emit("msg", socket.name + ":" + data);
                break;
            }
        }
    });

    //与socket失去联系的触发的函数
    socket.on('disconnect', function () {
        //console.log('操你妈 失联了。。。。。。');
        //todo 当有一个用户断开的时候
        //todo 判断是否配对

        //todo 如果没有配对
        if (socket.pair_id == -1 || socket.pair_id == undefined
            || socket.pair_id == null) {
            //暂时不做任何处理
            for (var i = 0; i < socket_array.length; i++) {
                if (socket_array[i] == socket) {
                    socket_array.splice(i, 1);
                    break;
                }

            }
        }

        //todo 如果有配对
        else {
            //从配对的数组中找出来，发一个消息，再把这个pair删掉
            for (var i = 0; i < pair_array.length; i++) {
                if (socket.pair_id == pair_array[i].pair_id) {
                    if (socket == pair_array[i].a) {
                        pair_array[i].b.pair_id = -1;
                        socket_array.push(pair_array[i].b);
                        pair_array[i].b.emit("msg", ":操……" + pair_array[i].a.name + "+对方下线了");
                        pair_array[i].b.emit("msg", "正在为您重新配对，请耐心等待……");
                    }
                    else if (socket == pair_array[i].b) {
                        pair_array[i].a.pair_id = -1;
                        socket_array.push(pair_array[i].a);
                        pair_array[i].a.emit("msg", ":操……" + pair_array[i].b.name + "+对方下线了");
                        pair_array[i].a.emit("msg", "正在为您重新配对，请耐心等待……");
                    }
                    //从配对数组中删除掉
                    pair_array.splice(i, 1);

                    if(socket_array.length>=2){
                        //生成一个pair
                        var pair = {"a": socket_array[0], "b": socket_array[1], pair_id: pair_id};
                        socket_array[0].pair_id = pair_id;
                        socket_array[1].pair_id = pair_id;
                        pair_id++;

                        //删除等待数组里面的元素
                        socket_array.splice(0, 2);

                        //推送进入数组
                        pair_array.push(pair);

                        //发送消息
                        pair.a.emit("msg", "与" + pair.b.name + "配对成功，尽情聊天吧……");
                        pair.b.emit("msg", "与" + pair.a.name + "配对成功，尽情聊天吧……");
                    }

                }

            }


        }

        console.log("socket_array----" + socket_array.length);
        console.log("pair_array------" + pair_array.length);
    });


});


http.listen(3000, function () {
    console.log("3000 端口开启了......");
});