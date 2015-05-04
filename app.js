var express = require('express');
var app = express();
var cons = require('consolidate');
var request = require('request'),
    cheerio = require('cheerio'),
    Handlebars = require('handlebars'),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser');

Handlebars.registerHelper('ifCond', function(v1, v2, options) {
    if(v1 == v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

// assign the swig engine to .html files
app.engine('html', cons.handlebars);

// set .html as the default extension
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());

//Настройки
var parsingUrls = ['http://www.webdesignernews.com/', 'http://frontendfront.com/']
var cheerioTpl = {
    "http://www.webdesignernews.com/" : function( $ ){
        var news = [];
        $('div.post').each(function () {
            var newNews = {};
            newNews["title"] = null || $(this).find('a.post-title').text();
            newNews["date"] = null || $(this).find('span.p-time-label').attr('data-time');
            newNews["link"] = null || $(this).find('a.post-title').attr('href');
            news.push(newNews);
        });
        return news;
    },
    "http://frontendfront.com/" : function( $ ){
        var news = [];
        $('.stories li').each(function () {
            var newNews = {};
            newNews["title"] = $(this).find('h2 a').text()  || null;
            newNews["date"] =  $(this).find('.meta time').attr('datatime') || null;
            newNews["link"] =  $(this).find('h2 a').attr('href') || null;
            news.push(newNews);
        });
        return news;
    }
};
var parser = function (url, callback) {
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var $ = cheerio.load(body, {normalizeWhitespace: true})
            var news = cheerioTpl[url]($);
            callback(news);
        }
    });
};
var renderHtml = function(data, count){
    var resultData = (count) ? data.slice(0 , count) : data,
        tpl = '<ul>{{#news}}<li><b>{{date}}</b> <a href="{{link}}">{{title}}</a></li>{{/news}}</ul>';
        return Handlebars.compile(tpl)({ "news": resultData });
}


app.route('/')
.get(function (req, res) {
        console.log(req.cookies);
        var url = req.query.url;
        if (url && cheerioTpl[url]) {
            parser(url, function (data) {
                var result = renderHtml(data, req.query.count);
                res.cookie('url', url);
                res.cookie('count', req.query.count || 2);
                res.render('index', {
                    title: 'Consolidate.js',
                    sites: cheerioTpl,
                    query : req.query,
                    news :  '<h2>'+url+'</h2>' +result
                });
            });
        } else {
            res.render('index', {
                title: 'Consolidate.js',
                sites: cheerioTpl,
                query : req.cookies
            });
        }


})
.post(function (req, res) {
        var url = req.body.url;
        if (url && cheerioTpl[url]) {
            parser(url, function (data) {
                var result = renderHtml(data, req.body.count);
                res.cookie('url', url);
                res.cookie('count', req.body.count || 2  );
                res.send( '<h2>'+url+'</h2>' +result);
            });
        } else {
            res.end('error');
        }
    });



app.listen(3000);

