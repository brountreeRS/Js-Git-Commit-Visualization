
/**
 * Module dependencies.
 */

var 
    express = require('express'), 
    cp = require("child_process"),
    routes = require('./routes');


var parsers = { 
    commit:require("./peg/commit.js").parse,
    tree:require("./peg/tree.js").parse,
    log:require("./peg/log.js").parse,
    blob:JSON.stringify
};

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
    app.use(
        express.errorHandler({ 
            dumpExceptions:true, 
            showStack:true 
        })
    );
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);

app.get("/first/commit/", function(req, res) {
    var 
        buff = "",
        obj = cp.spawn(
            "./firstcommit.sh", [ 
                req.param("path")
            ]
        );

    obj.stdout.on('data', function(data) {
        buff += data;
    });

    obj.stderr.on('data', function(data) {
        console.log(data);
    });

    obj.on('exit', function(code) {
        var msg = parsers["commit"](buff);
        msg.sha = "TODO: find sha of first commit";

        res.write(
            JSON.stringify(
                msg
            )
        );

        res.end();
    });
});

app.get("/log/:sha", function(req, res) {
    var 
        buff = "",
        obj = cp.spawn(
        "./logentry.sh", [ 
            req.param("path"), 
            req.params.sha 
        ]
    );

    obj.stdout.on('data', function(data) {
        buff += data;
    });

    obj.stderr.on('data', function(data) {
        console.log(data);
    });

    obj.on('exit', function(code) { 
        try {
            res.write(
                JSON.stringify(
                    parsers.log(
                        buff
                    )
                )
            );
        }
        catch (exc) {
            console.log(buff);
            res.write(
                JSON.stringify({
                    merge:[],
                    diffs:[]
                })
            );
        }


        res.end();
    });
});

app.get("/:type/:sha/", function(req, res) {
    var 
        buff = "",
        obj = cp.spawn(
        "./extract.sh", [ 
            req.param("path"), 
            req.params.sha 
        ]
    );

    obj.stdout.on('data', function(data) {
        buff += data;
    });

    obj.stderr.on('data', function(data) {
        console.log(data);
    });

    obj.on('exit', function(code) { 
        
        var msg;

        
        msg = parsers[req.params.type](buff);
        
        if (req.params.type == "commit") {
            msg.sha = req.params.sha;
        }

        res.write(
            JSON.stringify(msg)
        );

        res.end();
    });
});

app.listen(
    3000, 
    function(){
        console.log(
            "Express server listening on port %d in %s mode", 
            app.address().port, 
            app.settings.env
        );
    }
);
