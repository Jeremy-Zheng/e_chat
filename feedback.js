var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'epoching.com',
    database: 'epoching_chat'
});

//路径路由
exports.route = function (req, res) {

    //返回用户反馈页面
    res.sendfile('public/feedback.html', function () {
        res.end();
    });

};

//响应post请求
exports.post = function (req, res) {

    //创建链接
    connection = mysql.createConnection(connection.config);
    connection.connect();

    //添加意见
    if (req.params[0] == "insert") {

        var advice = req.body.advice;
        var qq = req.body.qq;
        var e_mail = req.body.e_mail;
        var date = req.body.date;

        //判断qq是否为正整数,不是的话 就取0
        var re = /^[1-9]+[0-9]*]*$/;
        if (!re.test(qq))
            qq = 0;


        connection.query("INSERT INTO feedback (advice,qq,date,e_mail)" +
                " VALUES('" + advice + "', '" + qq + "','" + date + "','" + e_mail + "')",
            function (err, result) {

                //fixme 我不晓得为什么不能直接传数字,可以传字符串和数组对象
                res.send(result.affectedRows + "");

                //关闭链接
                connection.end();

                res.end();
            });
    }

    //返回一个错误
    else {
        res.send("路径错误......");

        res.end();

        //关闭链接
        connection.end();
    }


};
