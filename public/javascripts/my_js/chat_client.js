/**
 * Created by Administrator on 2014/9/23.
 */
$(document).ready(function () {

    var socket = io();     //socket.io 对象

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
    var $_declare = $("#declare");                 //声明模态框


    //一些全局变量
    var name = "";       //用户的名字
    var is_pair = false; //是否配对
    var is_pc = is_pc(); //是不是采用pc访问
    var timer = 0;         //计时器


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

    //计时器，要是超过30分钟 都没有获取输入框焦点，就刷新页面---监听消息输入框获取焦点,计时器清零
    setInterval(function () {
        timer++;
        console.log("timer----" + timer);
        if (timer > 30) {
            //超过30分钟刷新页面
            location.reload();
        }
    }, 60000);
    $_input.on("focus", function () {
        timer = 0;
    });


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
            content_append("center","对不起……你还没有配对……");
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
        content_append("center",data);
    });

    //todo 接受后台给的信号表示现在处于配对状态
    socket.on("is_pair", function (data) {
        is_pair = data;
    });

    //todo 接受聊天消息,显示到消息面板上
    socket.on('msg', function (data) {
        content_append("left",data);
    });

    //todo 接受聊天消息,显示到消息面板上
    socket.on('disconnect', function () {
        content_append("center","fuck……服务器挂掉了……");
    });

    //发送姓名到后台
    function send_name() {
        //判断字符不能为空
        if ($_nick_name.val() == "" || $_name.val() == null) {
            notice_modal("对不起，您的姓名不能为空……");
            $_nick_name.focus();
            return false;
        }

        //字符串不能超过16个字节
        if ($_nick_name.val().length > 16) {
            notice_modal("对不起，您输入的名字过长……");
            $_nick_name.val("");
            $_nick_name.focus();
            return false;
        }

        //提交到后台
        socket.emit('name', replace_str($_nick_name.val()));

        //定义好自己的名字
        name = $_nick_name.val();
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
            notice_modal("对不起，信息不能为空……");
            $_input.focus();
            return false;
        }
        if ($_input.val().length > 140) {
            notice_modal("对不起，信息不能超过140个字……");
            $_input.focus();
            return false;
        }
        if (!is_pair) {
            notice_modal("对不起，正在为您配对，请耐心一点……");
            $_input.val("");
            return false;
        }


        //发送消息
        socket.emit('msg', replace_str($_input.val()));

        //把自己发的消息显示到消息面板上
        content_append("right",name + "--->" + replace_str($_input.val()));

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
                title = "温馨提示！！！"
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
    function content_append(position,content){
        $_content.append("<span class='"+position+"'>"+content+"</span>");
        scorll_to_bottom();
    }

    //滚动条位置
    function scorll_to_bottom() {
        $_textarea.scrollTop($_textarea[0].scrollHeight);
        $_textarea.perfectScrollbar('update');
    }

});