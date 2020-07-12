$(function () {
    var default_error_message = 'Server error, please try again later.';

    $.ajaxSetup({
        beforeSend: function (xhr, settings) { //xhr是XMLHttpRequest的意思
            if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) { //发出去的方法不是get head option trace而且没有跨站点
                xhr.setRequestHeader('X-CSRFToken', csrf_token); //在request的header里加一个X-CSRFToken字段，用来验证CSRF
            }
        }
    });

    $(document).ajaxError(function (event, request, settings) { //三个参数，第一个是jQuery XMLHttpRequest对象，
        //服务端的错误消息可以从这里获取；第二个是纯文本格式的错误状态，比如error，timeout等等，第三个是与HTTP错误相对应的原因短语比如Not Found
        var message = null;
        if (request.responseJSON && request.responseJSON.hasOwnProperty('message')) { //如果request的响应里面本来就是Json，而且Json里面由property这个值，就拿来用
            message = request.responseJSON.message;
        } else if (request.responseText) { //响应里没有json就看看有没有Text类型
            var IS_JSON = true;
            try {
                var data = JSON.parse(request.responseText); //看看这个text能不能解析成json
            }
            catch (err) {
                IS_JSON = false;
            }
            if (IS_JSON && data !== undefined && data.hasOwnProperty('message')) {
                message = JSON.parse(request.responseText).message; 
            } else {
                message = default_error_message;
            }
        } else {
            message = default_error_message;
        }
        toast(message, 'error'); //toast的第二个函数用来定义category类型。
    });

    var flash = null;

    function toast(body, category) { //定义toast函数
        clearTimeout(flash); //清除未完成的计时
        var $toast = $('#toast'); //toast变量等于页面上id是toast的元素
        if (category === 'error') { 
            $toast.css('background-color', 'red')
        } else {
            $toast.css('background-color', '#333')
        }
        $toast.text(body).fadeIn(); //淡入
        flash = setTimeout(function () {
            $toast.fadeOut();// 3秒（3000ms）后淡出
        }, 3000);
    }

    var hover_timer = null;

    function show_profile_popover(e) {
        var $el = $(e.target);

        hover_timer = setTimeout(function () {
            hover_timer = null;
            $.ajax({
                type: 'GET',
                url: $el.data('href'),
                success: function (data) {
                    $el.popover({
                        html: true,
                        content: data,
                        trigger: 'manual',
                        animation: false
                    });
                    $el.popover('show'); //显示弹窗
                    $('.popover').on('mouseleave', function () {
                        setTimeout(function () {
                            $el.popover('hide'); //隐藏弹窗
                        }, 200); //等待200ms之后隐藏弹窗
                    });
                }
            });
        }, 500);
    }

    function hide_profile_popover(e) {
        var $el = $(e.target);

        if (hover_timer) { //通过hover_timer判断弹窗是否已经显示；为NULL说明已经显示，否则就是没有显示；在已经显示且鼠标离开的情况下，200ms后隐藏弹窗
            clearTimeout(hover_timer); //取消计时
            hover_timer = null;
        } else {
            setTimeout(function () {
                if (!$('.popover:hover').length) {
                    $el.popover('hide');
                }
            }, 200);
        }
    }

    function update_followers_count(id) {
        var $el = $('#followers-count-' + id); //拼一个id出来，获取这个id所指向的元素
        $.ajax({
            type: 'GET',
            url: $el.data('href'),
            success: function (data) {
                $el.text(data.count); //更新数字
            }
        });
    }

    function update_collectors_count(id) {
        $.ajax({
            type: 'GET',
            url: $('#collectors-count-' + id).data('href'),
            success: function (data) {
                console.log(data);
                $('#collectors-count-' + id).text(data.count);
            }
        });
    }

    function update_notifications_count() {
        var $el = $('#notification-badge');
        $.ajax({
            type: 'GET',
            url: $el.data('href'),
            success: function (data) {
                if (data.count === 0) {
                    $('#notification-badge').hide();
                } else {
                    $el.show();
                    $el.text(data.count)
                }
            }
        });
    }

    function follow(e) {
        var $el = $(e.target);
        var id = $el.data('id');

        $.ajax({
            type: 'POST', //定义http方法
            url: $el.data('href'), //传入http的目标地址
            success: function (data) { //success回调函数
                $el.prev().show(); //因为关注和取消关注两个按钮市相邻的，取消关注在前，关注灾后，所以$el.prev()获取取消关注按钮，并用show展示出来
                $el.hide(); //将关注按钮隐藏掉
                update_followers_count(id); //调用update函数
                toast(data.message); //显示提示消息。message内容由服务端定义，js这百年用toast把内容接住
            }
        });
    }

    function unfollow(e) {
        var $el = $(e.target);
        var id = $el.data('id');

        $.ajax({
            type: 'POST',
            url: $el.data('href'),
            success: function (data) {
                $el.next().show();
                $el.hide();
                update_followers_count(id);
                toast(data.message);
            }
        });
    }

    function collect(e) {
        var $el = $(e.target).data('href') ? $(e.target) : $(e.target).parent('.collect-btn');
        var id = $el.data('id');

        $.ajax({
            type: 'POST',
            url: $el.data('href'),
            success: function (data) {
                $el.prev().show();
                $el.hide();
                update_collectors_count(id);
                toast(data.message);
            }
        });
    }

    function uncollect(e) {
        var $el = $(e.target).data('href') ? $(e.target) : $(e.target).parent('.uncollect-btn');
        var id = $el.data('id');
        $.ajax({
            type: 'POST',
            url: $el.data('href'),
            success: function (data) {
                $el.next().show();
                $el.hide();
                update_collectors_count(id);
                toast(data.message);
            }
        });
    }

    $('.profile-popover').hover(show_profile_popover.bind(this), hide_profile_popover.bind(this)); //this变量用于传入上下文
    $(document).on('click', '.follow-btn', follow.bind(this)); //第一个参数是事件，第二个参数是选择器（即在哪个东西上触发事件），第三个参数是一旦触发传入的回调函数
    $(document).on('click', '.unfollow-btn', unfollow.bind(this)); //我们不能直接$(.follow-btn).on(...)因为jQuery中快捷方法只能绑定到已经存在的元素上，而follow-btn是需要触发才会插入的东西
    $(document).on('click', '.collect-btn', collect.bind(this));
    $(document).on('click', '.uncollect-btn', uncollect.bind(this));

    // hide or show tag edit form
    $('#tag-btn').click(function () {
        $('#tags').hide();
        $('#tag-form').show();
    });
    $('#cancel-tag').click(function () {
        $('#tag-form').hide();
        $('#tags').show();
    });
    // hide or show description edit form
    $('#description-btn').click(function () {
        $('#description').hide();
        $('#description-form').show();
    });
    $('#cancel-description').click(function () {
        $('#description-form').hide();
        $('#description').show();
    });
    // delete confirm modal
    $('#confirm-delete').on('show.bs.modal', function (e) {
        $('.delete-form').attr('action', $(e.relatedTarget).data('href'));
    });

    if (is_authenticated) {
        setInterval(update_notifications_count, 30000);
    }

    $("[data-toggle='tooltip']").tooltip({title: moment($(this).data('timestamp')).format('lll')})

});
