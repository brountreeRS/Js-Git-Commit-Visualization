
var repo, commits;

function displayCommitGraph(cutoff, fn) {
    var 
        colors = [ 
            // "AntiqueWhite", "Bisque", "Blue", "BlueViolet", 
            // "Brown", "BurlyWood", "Chartreuse", "Chocolate", 
            // "Coral", "Crimson", 
            // "DarkBlue", "DarkCyan", "DarkGoldenRod", "DarkGray", "DarkGrey", 
            // "DarkGreen", "DarkKhaki", "DarkMagenta", "DarkOliveGreen", 
            // "Darkorange", "DarkOrchid", "DarkRed", "DarkSalmon", 
            // "DarkSeaGreen", "DarkSlateBlue", "DarkSlateGray", "DarkSlateGrey", 
            // "DarkTurquoise", "DarkViolet", "DeepPink", "DeepSkyBlue", 
            // "DimGray", "DimGrey", "DodgerBlue", "FireBrick", 
            // "ForestGreen", "GhostWhite", "Green", "GreenYellow", 
            // "HotPink", "IndianRed", "Indigo", 
            // "LawnGreen", "Lime", 
            // "LimeGreen", "Magenta", "Maroon", "MediumAquaMarine", 
            // "MediumBlue", "MediumOrchid", "MediumPurple", "MediumSeaGreen", 
            // "MediumSlateBlue", "MediumSpringGreen", "MediumTurquoise", 
            // "MediumVioletRed", "MidnightBlue", "MistyRose", 
            // "Moccasin", "Navy", "Olive", "OliveDrab", 
            // "Orange", "OrangeRed", "Orchid", "PapayaWhip", 
            // "Peru", "Plum", "PowderBlue", "Purple", "Red", "RosyBrown", 
            // "RoyalBlue", "SaddleBrown", "Salmon", "SandyBrown", "SeaGreen", 
            // "Sienna", "Silver", "SkyBlue", 
            // "SlateGray", "SlateGrey", "SpringGreen", "SteelBlue", 
            // "Teal", "Thistle", "Tomato", "Turquoise", "Violet", 
            // "YellowGreen"
            "Red", "Blue", "Green", "Orange", "Purple"
        ],
        
        colorMap = [];

    disp(cutoff);

    function disp(n) {
        var idx = cutoff - n;

        if (n == -1) { 
            if ($.isFunction(fn)) { fn(); }
            return; 
        }

        commits.get(
            idx,
            function(node) {
                var li = $("<li><canvas/><span/></li>")
                    .attr("data-index", idx)
                    .find("span")
                        .html(
                            node.commit.getComment() + "..."
                        )
                        .end()
                    .find("canvas")
                        .attr({
                            width:150,
                            height:12
                        })
                        .end()
                    .appendTo("#commits");

                illustrate(node, li.find("canvas"));

                disp(n - 1)
            }
        );
    }

    function illustrate(node, canvas) {
        var 
            sep = 4, 
            width = 150,
            height = 12,
            ctx = canvas[0].getContext("2d");

        if (!colorMap[node.index]) {
            colorMap[node.index] = colors[
                Math.floor(
                    Math.random() * colors.length
                )
            ];
        }

        ctx.lineWidth = 1;
        
        for (var idx = 0; idx < node.frontier.length; ++idx) {
            ctx.fillStyle = ctx.strokeStyle = colorMap[idx];

            if (node.removed.length) {
                for (var idx2 = 0; idx2 < node.removed.length; ++idx2) {
                    ctx.beginPath();
                    ctx.moveTo(node.removed[idx2] * sep + 2, 0);
                    ctx.lineTo(idx * sep + 2, Math.floor(height / 2));
                    ctx.stroke();
                }
            }
            else {
                ctx.beginPath();
                ctx.moveTo(idx * sep + 2, 0);
                ctx.lineTo(idx * sep + 2, Math.floor(height / 2));
                ctx.stroke();
            }

            if (node.shift >= 0) {
                for (var idx2 = 0; idx2 < node.shift + 1; ++idx2) {
                    ctx.beginPath();
                    ctx.moveTo(idx * sep + 2, Math.floor(height / 2));
                    ctx.lineTo((idx + idx2) * sep + 2, height);
                    ctx.stroke();
                }
            }
        }

        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(
            node.index * sep + 2,
            Math.floor(height / 2),
            2,
            0,
            2 * Math.PI
        );
        ctx.fill();

        if (node.removed.length) {
            for (var idx = 0; idx < node.removed.length; ++idx) {
                colorMap.splice(
                    node.removed[idx], 
                    1
                );
            }
        }
        else if (node.shift > 1) {
            var insert = [];
            for (var idx = 0; idx < node.shift - 1; ++idx) {
                insert[idx] = colors[
                    Math.floor(
                        Math.random() * colors.length
                    )
                ];
            }
            colorMap.splice(
                node.idx, 
                0, 
                insert
            );
        }
    }
}

function setupCommitEvents() {
    $(document).on("hover", "#commits li", function(evt) {
        var idx = $(this).data("index"); 

        commits.get(idx, function(node) { 
            $("#commit-tooltip")
                .css({ 
                    display:"block",
                    top:evt.clientY - 20
                });

            $("#tooltip-date").text(
                new Date(
                    node.commit.getCommitter().date
                )
                .toString("yyyy-MM-dd HH:mm:ssZ") + " "
            );

            $("#tooltip-name").text(node.commit.getCommitter().name + " ");
            $("#tooltip-sha").text(node.commit.getSha());
            $("#tooltip-comment").text(node.commit.getComment());
        });
    });

    $("#commits-container, #commit-tooltip").on("mouseleave", function() { 
        $("#commit-tooltip").css({ display:"none" });
    });

    $(document).on("click", "#commits li", function(evt) {
        var idx = $(this).data("index"); 

        $("#commit-tooltip").fadeOut();

        commits.get(idx, function(node) {
            $("#commit-name").text(node.commit.getCommitter().name + " ");
            $("#commit-date").text(
                new Date(
                    node.commit.getCommitter().date
                )
                .toString("yyyy-MM-dd HH:mm:ssZ") + " "
            );
            $("#commit-sha").text(node.commit.getSha());
            $("#commit-comment").text(node.commit.getComment());


            $("#commit-display-header").css("background-image", "none");
            $.getJSON(
                "http://en.gravatar.com/" + 
                    md5(node.commit.getCommitter().email) +
                    ".json?callback=?",
                null,
                function(gravatar) {
                    $("#commit-display-header").css(
                        "background-image",
                        "url(" + gravatar.entry[0].thumbnailUrl + ")"
                    );
                }
            );

            node.commit.loadTree(function(tree) { 
                $("#files-tabs .ui-tabs-nav li").each(function() {
                    var t = $(this);

                    tree.loadFile(
                        $.trim(t.find("span").text()),
                        function(text) {
                            $(t.find("a").attr("href") + " pre").text(
                                JSON.parse(text)
                            );
                        }
                    );
                });
            });

            $("#commit-tree").html("");
            node.commit.loadLog(function(log) {
                renderTree(
                    $("#commit-tree"), 
                    log.getTree()
                );

                function renderTree(ctx, tree) {


                    for (var name in tree) {
                        if (tree.hasOwnProperty(name)) {
                            var val = tree[name];
                            if (val.substring) {
                                $("<li/>")
                                    .addClass("log-file")
                                    .text(name)
                                    .appendTo(ctx);
                            }
                            else {
                                var 
                                    li = $("<li/>")
                                        .addClass("log-dir")
                                        .text(name)
                                        .appendTo(ctx);
                                    sub = $("<ul/>")
                                        .appendTo(li);

                                renderTree(sub, val);
                            }
                        }
                    }
                }
            });
        });
    });
}

function setupFilters() {
    $("#filter-by-open")
        .attr("disabled", false)
        .on("click", function() {
            if ($(this).is(":checked")) {
                var open = $("#files-tabs .ui-tabs-active span").text();

                $("#commits li").each(function() {
                    var elem = $(this);
                    commits.get(
                        parseInt(
                            $(this).data("index"), 
                            10
                        ), 
                        function(node){
                            node.commit.loadLog(function(log) {
                                if (log.getFiles().indexOf(open) == -1) {
                                    elem.addClass("filtered-out");
                                }
                            });
                        }
                    );
                });
            }
            else {
                $("#commits li.filtered-out")
                    .removeClass("filtered-out");
            }
        });
}

var Workspace = Backbone.Router.extend({
    routes:{
        "":             "index",
        "repo/*path":   "repo"
    },

    index:function() {
        $(".view").hide();
        $("#splash-view").show();
    },
    repo:function(path) {
        $(".view").hide();
        $("#repo-view").show();

        repo = new Repo("/" + path),

        repo.getCommits(function(commits) {
            window.commits = commits;

            displayCommitGraph(500, function() {
                setupCommitEvents();
            });

        });

        setupFilters();

        $("#files-tabs").tabs();
    }
});


var router;
$(function(){
    router = new Workspace();
    Backbone.history.start({ 
        pushState:false 
    });
});





function show(x) {
    console.log(
        JSON.stringify(x)
    );
}

