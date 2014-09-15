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


var wait_array = [];   //存放等待列表的socket

var pair_array = [];  //存放pair对象

//io 链接上
io.sockets.on('connection', function (socket) {

    //console.log("现在有"+io.sockets.server.eio.clientsCount+"人在线……");

    socket.emit("msg", "现在有" + io.sockets.server.eio.clientsCount + "人在线……");

    //接受一个名字消息
    socket.on('name', function (data) {
        socket.name = data;
        socket.emit("msg", data + " 欢迎你来到easy chat");
    });

    //接受一个对方已经准备好要开始聊天的消息
    socket.on("is_ready", function (data) {
        if (data == true) {
            //将这个socket 推入wait_array
            wait_array.push(socket);
            socket.emit("msg", "正在等待配对中……");
            create_pair(jude_pair());
        }
    });

    //接受一个切换的消息
    socket.on("change", function (data) {
        //如果没有配对
        if (socket.pair_id == -1 || socket.pair_id == undefined
            || socket.pair_id == null) {
            //暂时不做任何处理
        }

        //有配对
        else {
            for (var i = 0; i < pair_array.length; i++) {
                if (socket.pair_id == pair_array[i].pair_id) {
                    var another_socket;
                    if (socket == pair_array[i].a)
                        another_socket = pair_array[i].b;
                    else if (socket == pair_array[i].b)
                        another_socket = pair_array[i].a;

                    pair_array.splice(i, 1);//将这个pair从数组中删除掉

                    //对被动切换的客服端的操作
                    another_socket.pair_id = -1;
                    wait_array.unshift(another_socket); //将另一个socket插入等待池的头部
                    another_socket.emit("is_pair", false);
                    another_socket.emit("msg", ":操……" + socket.name + "+选择了切换……");
                    another_socket.emit("msg", "正在为您重新配对，请耐心等待……");

                    //对主动切换的客服端的操作
                    socket.pair_id = -1;
                    wait_array.push(socket); //将另一个socket插入等待池的尾部
                    socket.emit("is_pair", false);
                    socket.emit("msg", "正在为您重新配对，请耐心等待……");

                    //进行重新配对
                    create_pair(jude_pair());
                    break;
                }

            }
        }


    });

    //接受客户端发送过来的聊天信息,再群发出去
    socket.on('msg', function (data) {

        console.log(socket.pair_id);

        //如果是没有配对的用户，就给一个提示
        if (socket.pair_id == -1 || socket.pair_id == undefined
            || socket.pair_id == null) {
            socket.emit("msg", "对不起……还没有人跟你配对……");
        }

        // todo 这个地方存在重大效率问题，必须必须要改,room
        // todo 找到需要转发的用户，把消息转发出去
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

        //todo 如果没有配对
        if (socket.pair_id == -1 || socket.pair_id == undefined
            || socket.pair_id == null) {
            //暂时不做任何处理
            for (var i = 0; i < wait_array.length; i++) {
                if (wait_array[i] == socket) {
                    wait_array.splice(i, 1);
                    break;
                }

            }
        }

        //todo 如果有配对
        else {
            //从配对的数组中找出来，发一个消息，再把这个pair删掉
            for (var i = 0; i < pair_array.length; i++) {
                if (socket.pair_id == pair_array[i].pair_id) {
                    var another_socket;
                    if (socket == pair_array[i].a)
                        another_socket = pair_array[i].b;
                    else if (socket == pair_array[i].b)
                        another_socket = pair_array[i].a;


                    pair_array.splice(i, 1);//将这个pair从数组中删除掉
                    another_socket.pair_id = -1;
                    wait_array.unshift(another_socket); //将另一个socket插入等待池的头部
                    another_socket.emit("is_pair", false);
                    another_socket.emit("msg", ":操……" + socket.name + "+对方下线了");
                    another_socket.emit("msg", "正在为您重新配对，请耐心等待……");

                    //进行重新配对
                    create_pair(jude_pair());
                    break;
                }

            }
        }

    });

});


//todo 判断是否需要生成新的pair
//todo 根据等待池里的socket来判断需要生成多少个pair,返回一个整数
function jude_pair() {

    var account = parseInt(wait_array.length / 2);

    if (wait_array.length % 2 == 0)
        return account - 1;

    return account;

}


//todo 根据需要配对的数量进行新的配对
function create_pair(account) {

    for (var i = 0; i < account; i++) {
        var a_socket = wait_array[i * 2];
        var b_socket = wait_array[i * 2 + 1];
        pair_id++;
        var pair = {"a": a_socket, "b": b_socket, pair_id: pair_id};
        a_socket.pair_id = pair_id;
        b_socket.pair_id = pair_id;
        pair_array.push(pair);

        //发送消息
        a_socket.emit("msg", "与" + b_socket.name + "配对成功，尽情聊天吧……");
        b_socket.emit("msg", "与" + a_socket.name + "配对成功，尽情聊天吧……");

        //告诉客户端配对成功
        a_socket.emit("is_pair", true);
        b_socket.emit("is_pair", true);
    }

    //删除等待数组里面的元素
    wait_array.splice(0, account * 2);
}


http.listen(3000, function () {
    console.log("3000 端口开启了......");
});