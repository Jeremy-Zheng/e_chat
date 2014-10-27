var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

var feedback = require("./feedback.js");
var tool = require("./tool.js");

//todo express 自带的一些东西
//var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

//todo express 自带的一些东西 设置一些参数,
//todo post过来的参数可以通过request.body.parameter
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());

//设置一个存放静态文件的目录
app.use(express.static(path.join(__dirname, 'public')));


//根目录返回一个chat.html--------------------
app.get('/', function (req, res) {
    res.sendfile('public/chat.html', function () {
        res.end();
    });

});

//设置路由,反馈页面全部交给feedback.route处理----
app.get('/feedback', feedback.route);

//设置路由,反馈页面全部交给feedback.post处理----
app.post('/feedback/*', feedback.post);
//--------------------------------------------
//------todo--这下面是socket.io----------------------
//--------------------------------------------
var pair_id = 0;

var wait_array = [];   //存放等待列表的socket

var pair_array = [];   //存放pair对象

//io 链接上
io.sockets.on('connection', function (socket) {

    console.log(io.sockets.server.eio.clientsCount);

    //与socket失去联系的触发的函数
    socket.on('disconnect', function () {

        console.log("断开："+io.sockets.server.eio.clientsCount);

        //如果没有匹配,在等待池里就把它删掉
        if (socket.pair_id == -1 || socket.pair_id == undefined || socket.pair_id == null) {
            for (var i = 0; i < wait_array.length; i++) {
                if (wait_array[i] == socket) {
                    wait_array.splice(i, 1);
                    break;
                }
            }
        }
        //如果有匹配
        else {
            //从匹配的数组中找出来，发一个消息，再把这个pair删掉
            var another_socket = find_another_socket(socket).socket;
            var index = find_another_socket(socket).index;

            pair_array.splice(index, 1);//将这个pair从数组中删除掉
            another_socket.pair_id = -1;
            wait_array.unshift(another_socket); //将另一个socket插入等待池的头部
            another_socket.emit("is_pair", false);
            another_socket.emit("sys", "sorry! " + socket.name + " 断开了连接!");
            another_socket.emit("sys", "正在为您重新匹配，请耐心等待……");

            //进行重新匹配
            create_pair(jude_pair());
        }

        //将该socket的数据删掉
        if (socket.data_id != undefined)
            tool.delete_chat_data(socket.data_id);
    });

    //接受一个名字消息
    socket.on('name', function (data) {

        //将用户信息插入数据库
        tool.insert_chat_data(socket.handshake.address, data, socket);

        socket.name = data.name;
        socket.emit("name", true);
        socket.emit("sys", "\"" + data.name + "\" 欢迎来到CooCoo!");

        wait_array.push(socket);
        socket.emit("sys", "请稍等,正在为您匹配中");

        //进行匹配
        create_pair(jude_pair());
    });

    //接受一个切换的消息
    socket.on("change", function (data) {
        //如果有匹配
        if (socket.pair_id != -1 && socket.pair_id != undefined && socket.pair_id != null) {

            var another_socket = find_another_socket(socket).socket;
            var index = find_another_socket(socket).index;

            pair_array.splice(index, 1);//将这个pair从数组中删除掉

            //对被动切换的客服端的操作
            another_socket.pair_id = -1;
            wait_array.unshift(another_socket); //将另一个socket插入等待池的头部
            another_socket.emit("is_pair", false);
            another_socket.emit("sys", "sorry! " + socket.name + " 离开了!");
            another_socket.emit("sys", "正在为您重新匹配，请耐心等待……");

            //对主动切换的客服端的操作
            socket.pair_id = -1;
            wait_array.push(socket); //将另一个socket插入等待池的尾部
            socket.emit("is_pair", false);
            socket.emit("sys", "正在为您重新匹配，请耐心等待……");

            //进行重新匹配
            create_pair(jude_pair());
        }


    });

    //接受客户端发送过来的聊天信息,再群发出去
    socket.on('msg', function (data) {
        //如果有匹配的,就把消息发送给另一个socket
        if (socket.pair_id != -1 && socket.pair_id != undefined && socket.pair_id != null) {
            find_another_socket(socket).socket.emit("msg", socket.name + "：" + data);
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

//todo 根据需要匹配的数量进行新的匹配
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
        a_socket.emit("sys", "与\"" + b_socket.name + "\"匹配成功，尽情聊天吧！");
        b_socket.emit("sys", "与\"" + a_socket.name + "\"匹配成功，尽情聊天吧！");

        //告诉客户端匹配成功
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

//todo 发送给后台，有多少人数在线
function send_people_account(socket) {

//    if (background_socket != undefined && background_socket != null)
//        background_socket.emit("background", 1);
}

http.listen(80, function () {
    console.log("聊天服务已经开启了！成功从现在开始！");
});
