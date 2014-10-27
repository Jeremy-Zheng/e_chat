/**
 * Created by Administrator on 2014/10/16.
 */
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'epoching.com',
    database: 'epoching_chat'
});

exports.insert_chat_data=insert_chat_data;
exports.delete_chat_data=delete_chat_data;

//将用户的信息插入数据库
function insert_chat_data(ip,data,socket) {

    connection = mysql.createConnection(connection.config);
    connection.connect();

    connection.query("INSERT INTO chat_data(ip,name,address,device,login_time)" +
            " VALUES('"+ip+"', '"+data.name+"','"+data.address+"','"+data.device+"','"+data.date+"')",
        function (err, result) {
            console.log("result.insertId----"+result.insertId);
            socket.data_id=result.insertId;

        });

    connection.end();
}

function delete_chat_data(id){
    connection = mysql.createConnection(connection.config);
    connection.connect();

    connection.query("delete from chat_data where id=" + id,
        function (err, result) {

        });
    connection.end();
}
