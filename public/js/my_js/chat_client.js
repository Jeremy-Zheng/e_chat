/**
 * Created by Administrator on 2014/9/23.
 */
$(document).ready(function () {

    //dom jquery对象
    var $_textarea = $("#textarea");   //文本区域包括名字输入区域，和聊天信息显示区域
    var $_input_box = $("#input_box"); //发送消息的文本输入group
    var $_nick_name = $("#nick_name"); //名字输入框
    var $_chat_btn_group = $("#chat_btn_group"); //切换聊天 ，反馈界面 按钮组
    var $_submit_name = $("#submit_name");       //提交名字输入按钮
    var $_name = $("#name");                     //名字输入框
    var $_change_btn = $("#change");             //切换聊天按钮
    var $_input = $("#text");                    //发送消息的文本输入框
    var $_submit_msg_btn = $("#submit_msg");     //提交信息的按钮
    var $_content = $("#content");               //显示聊天内容的面板,是$_textarea的子元素
    var $_declare = $("#declare");               //声明模态框

    var socket = io();     //socket.io 对象

    //一些全局变量
    var name = "";       //用户的名字
    var is_pair = false; //是否配对
    var is_pc = is_pc(); //是不是采用pc访问
    var timer=0;

    //为聊天面板添加滚动条
    $_textarea.perfectScrollbar({suppressScrollX: true});

    //根据不同的屏幕选择不同的显示方式,监听屏幕尺寸变化,名字输入框获取焦点,
    screen_adapt($(window).height());
    $(window).bind("resize", function () {
        screen_adapt($(window).height());
    });

    //--显示声明---隐藏的时候让姓名输入框获取焦点
    $_declare.modal("show");
    $_declare.on("hidden.bs.modal", function () {
        $_nick_name.focus();
    });


    //隐藏消息输入框,开始聊天按钮，切换聊天按钮
    $_input_box.hide();
    $_chat_btn_group.hide();

    //点击确定按钮发送名字到后台  点击回车发送名字到后台
    $_submit_name.on("click", function () {
        send_name();
    });
    $_nick_name.keypress(function (event) {
        if (event.which == 13)
            send_name();
    });

    //点击发送消息,按回车键发送消息
    $_submit_msg_btn.on("click", function () {
        $_input.focus();
        send_msg()
    });
    $_input.keypress(function (event) {
        if (event.which == 13)
            send_msg()
    });

    //点击切换聊天
    $_change_btn.on("click", function () {
        if (is_pair) {
            socket.emit("change", "true");
        }
        else {
            //显示消息到面板上
            notice_modal("你还没有匹配成功，请耐心等待。");
        }
    });

    //todo 接受一个后台返回的关于名字是否发送成功的参数
    socket.on("name", function (data) {
        if (data) {//名字发送成功，隐藏名字输入框，显示聊天输入框
            $_input_box.fadeIn(1000);
            $_name.slideUp(400);
            $_chat_btn_group.fadeIn(1000);
            $_input.focus();
        }
    });

    //todo 接受并显示系统消息
    socket.on("sys", function (data) {
        content_append("center", data);
    });

    //todo 接受后台给的信号表示现在处于配对状态
    socket.on("is_pair", function (data) {
        is_pair = data;

        //如果配对成功就播放提示音
        if (data)
            $("#audio")[0].play();
    });

    //todo 接受聊天消息,显示到消息面板上
    socket.on('msg', function (data) {
        content_append("left", data);

        //浏览器闪烁
        message.show();
    });

    //todo 接受聊天消息,显示到消息面板上
    socket.on('disconnect', function () {
        //任何情况下，连接断开就刷新页面
        console.log("客户端打印，连接断开了……");

        window.location.reload();
    });

    //绑定document,点击浏览器，取消闪烁
    document.onclick = function () {
        message.clear();
        timer=0;
    };

    //文本输入框获取焦点的时候就取消闪烁，计时器清零
    $_input.on("focus",function(){
        message.clear();
        timer=0;
    });

    //一个计时器,长时间页面待机就刷新一下
    setInterval(function(){
        timer++;
        if(timer>300)//长时间待机就刷新
            window.location.reload();
    },1000);

    //当用户离开此页面时，给用户一个提醒
    window.onbeforeunload = function(event) {
        socket.disconnect();
    };

    //发送姓名到后台,先判断字符串是否合理，再发送到后台
    function send_name() {
        //判断字符不能为空
        if ($_nick_name.val() == "" || $_name.val() == null) {
            notice_modal("对不起，昵称不能为空。");
            $_nick_name.focus();
            return false;
        }

        //字符串不能超过16个字节
        if ($_nick_name.val().length > 16) {
            notice_modal("对不起，您输入的名字过长。");
            $_nick_name.val("");
            $_nick_name.focus();
            return false;
        }

        //需要发送过去的数据
        var chat_name = replace_str($_nick_name.val());
        var address = '省:' + remote_ip_info.province + '，市:' + remote_ip_info.city + '，街道:' + remote_ip_info.district;
        var date = new Date().toLocaleString();
        var device = navigator.platform + "---" + navigator.appName;
        var data = {name: chat_name, address: address, date: date, device: device};

        //提交到后台
        socket.emit('name', data);

        //定义好自己的名字
        name = chat_name;
    }

    //根据屏幕高度选择显示方式的函数，主要是输入框，和显示面板的位置，大小
    function screen_adapt(height) {
        //这个表示手机屏幕
        if (height < 600) {
            //显示面板的高
            $_textarea.height($(window).height() - 110);
            $("body").css("paddingTop", "0px");

            //滚动条滚到底部
            scorll_to_bottom()
        }
        //电脑或者平板屏幕
        else {
            //显示面板的高,上面下面各留100px
            $_textarea.height($(window).height() - 250);
            $_input_box.css("bottom", "100px");
            $("body").css("paddingTop", "50px");
        }

        //输入框的宽和margin-left
        $_input_box.width($_textarea.width() + "px");
        $_input_box.css("marginLeft", -$_textarea.width() / 2 + "px");
    }

    //发送聊天消息的函数
    function send_msg() {
        //判断字数长度的函数
        if ($_input.val() == "" || $_input.val() == null) {
            notice_modal("对不起，发送信息不能为空。");
            $_input.focus();
            return false;
        }
        if ($_input.val().length > 140) {
            notice_modal("对不起，发送信息不能超过140个字。");
            $_input.focus();
            return false;
        }
        if (!is_pair) {
            notice_modal("对不起，正在为您匹配中，请耐心等待。");
            $_input.val("");
            return false;
        }


        //发送消息
        socket.emit('msg', replace_str($_input.val()));

        //把自己发的消息显示到消息面板上
        content_append("right", name + "：" + replace_str($_input.val()));

        //输入框清空，获取焦点
        $_input.val("");
        $_input.focus();
    }

    //将输入的字符替换过掉，避免xss攻击
    function replace_str(str) {
        str = str.replace(/&/g, "&amp;"); //替换&号
        str = str.replace(/\"/g, "&quot;"); //" 替换双引号
        str = str.replace(/\'/g, "&apos;"); //" 替换单引号
        str = str.replace(/\t/g, "&nbsp;&nbsp;");// 替换跳格
        str = str.replace(/</g, "&lt;");    //替换左尖括号
        str = str.replace(/>/g, "&gt;");    //替换右尖括号
        return str;
    }

    //弹出一个提示框的函数
    function notice_modal(content, title, end_button) {

        //如果是在电脑上
        if (is_pc) {
            if (title == "" || title == undefined) {
                title = "CooCoo提示！"
            }
            if (end_button == "" || end_button == undefined) {
                end_button = "确定"
            }
            $("#notice .modal-header h4").html(title);
            $("#notice .modal-body").html(content);
            $("#notice .modal-footer button").html(end_button);
            $("#notice").modal("show");
        }
        //如果是在手机上
        else {
            alert(content);
        }


    }

    //todo-----这段代码是在网上抄的------判断客户端是电脑还是手机-------------
    function is_pc() {
        var userAgentInfo = navigator.userAgent;
        var Agents = ["Android", "iPhone",
            "SymbianOS", "Windows Phone",
            "iPad", "iPod"];
        var flag = true;
        for (var v = 0; v < Agents.length; v++) {
            if (userAgentInfo.indexOf(Agents[v]) > 0) {
                flag = false;
                break;
            }
        }
        return flag;
    }

    //个方法用于将消息，显示到消息面板上并，滑动滚动条到底部
    function content_append(position, content) {
        $_content.append("<span class='" + position + "'>" + content + "</span>");
        scorll_to_bottom();
    }

    //滚动条位置
    function scorll_to_bottom() {
        $_textarea.scrollTop($_textarea[0].scrollHeight);
        $_textarea.perfectScrollbar('update');
    }

    //todo 这段代码 也是网上抄袭的,messsge是一个对象
    var message = {
        time: 0,
        title: document.title,
        timer: null,

        // 显示新消息提示
        show: function () {
            var title = message.title.replace("【　　　 】", "").replace("【CooCoo】", "");
            // 定时器，设置消息切换频率闪烁效果就此产生
            message.timer = setTimeout(function () {
                    message.time++;
                    message.show();

                    if (message.time % 2 == 0) {
                        document.title = "【CooCoo】" + title
                    }
                    else {
                        document.title = "【　　　 】" + title
                    }
                    ;
                }
                , 600 // 闪烁时间差
            );
            return [message.timer, message.title];
        },

        // 取消新消息提示
        clear: function () {
            clearTimeout(message.timer);
            document.title = message.title;
        }
    };
    //todo 还没搞懂是什么意思,messsge是一个对象



    //-----------
//    $("#test").on("click",function(){
//        socket.disconnect();
//    });

//    $("#test1").on("click",function(){
//        socket.connect();
//    });

});