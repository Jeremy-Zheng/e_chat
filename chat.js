/**
 * Created by Administrator on 2014/9/10.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

//设置一个存放静态文件的目录
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendfile('public/chat.html');
    //res.sendfile('public/test.html');
});

var pair_id = 0;

var wait_array = [];   //存放等待列表的socket

var pair_array = [];   //存放pair对象

//io 链接上
io.sockets.on('connection', function (socket) {

    //接受一个名字消息
    socket.on('name', function (data) {
        socket.name = data;
        socket.emit("name", true);
        socket.emit("sys", data + " 欢迎来到 Easy Chat......");
        socket.emit("sys", "现在有 " + io.sockets.server.eio.clientsCount + " 人在线……");

        wait_array.push(socket);
        socket.emit("sys", "请稍等……正在为您配对中……");

        //进行配对
        create_pair(jude_pair());
    });

    //接受一个切换的消息
    socket.on("change", function (data) {
        //如果有配对
        if (socket.pair_id != -1 && socket.pair_id != undefined && socket.pair_id != null) {

            var another_socket = find_another_socket(socket).socket;
            var index = find_another_socket(socket).index;

            pair_array.splice(index, 1);//将这个pair从数组中删除掉

            //对被动切换的客服端的操作
            another_socket.pair_id = -1;
            wait_array.unshift(another_socket); //将另一个socket插入等待池的头部
            another_socket.emit("is_pair", false);
            another_socket.emit("sys", ":操……" + socket.name + " 选择了切换……");
            another_socket.emit("sys", "正在为您重新配对，请耐心等待……");

            //对主动切换的客服端的操作
            socket.pair_id = -1;
            wait_array.push(socket); //将另一个socket插入等待池的尾部
            socket.emit("is_pair", false);
            socket.emit("sys", "正在为您重新配对，请耐心等待……");

            //进行重新配对
            create_pair(jude_pair());
        }


    });

    //接受客户端发送过来的聊天信息,再群发出去
    socket.on('msg', function (data) {
        //如果有配对的,就把消息发送给另一个socket
        if (socket.pair_id != -1 && socket.pair_id != undefined && socket.pair_id != null) {
            find_another_socket(socket).socket.emit("msg", socket.name + "-->" + data);
        }
    });

    //与socket失去联系的触发的函数
    socket.on('disconnect', function () {

        //如果没有配对,在等待池里就把它删掉
        if (socket.pair_id == -1 || socket.pair_id == undefined || socket.pair_id == null) {
            for (var i = 0; i < wait_array.length; i++) {
                if (wait_array[i] == socket) {
                    wait_array.splice(i, 1);
                    break;
                }
            }
        }
        //如果有配对
        else {
            //从配对的数组中找出来，发一个消息，再把这个pair删掉
            var another_socket = find_another_socket(socket).socket;
            var index = find_another_socket(socket).index;

            pair_array.splice(index, 1);//将这个pair从数组中删除掉
            another_socket.pair_id = -1;
            wait_array.unshift(another_socket); //将另一个socket插入等待池的头部
            another_socket.emit("is_pair", false);
            another_socket.emit("sys", "操……" + socket.name + " 下线了");
            another_socket.emit("sys", "正在为您重新配对，请耐心等待……");

            //进行重新配对
            create_pair(jude_pair());
        }


    });

});

//todo 判断是否需要生成新的pair,返回一个整数,表示需要生成多少个pair
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
        a_socket.emit("sys", "与" + b_socket.name + "配对成功，尽情聊天吧……");
        b_socket.emit("sys", "与" + a_socket.name + "配对成功，尽情聊天吧……");

        //告诉客户端配对成功
        a_socket.emit("is_pair", true);
        b_socket.emit("is_pair", true);
    }

    //删除等待数组里面的元素
    wait_array.splice(0, account * 2);
}

//todo 在pair中找到另一个socket和连接池中的索引
function find_another_socket(socket) {

    for (var i = 0; i < pair_array.length; i++) {
        if (socket.pair_id == pair_array[i].pair_id) {
            if (socket == pair_array[i].a) {
                return {socket: pair_array[i].b, index: i};
            }
            else {
                return {socket: pair_array[i].a, index: i};
            }
        }
    }
    return null;
}


http.listen(80, function () {
    console.log("聊天服务已经开启了......");
});