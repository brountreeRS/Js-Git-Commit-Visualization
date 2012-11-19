
var ShaProxy = { 
    cache:{}, 
    load:function(path, key, sha, fn) {
        var self = this;
        if (!this.cache[path]) {
            this.cache[path] = {};
        }
        if (!this.cache[path][sha]) {
            this.cache[path][sha] = {};
        }
        if (this.cache[path][sha][key]) {
            fn(this.cache[path][sha][key]);
        }
        else {
            $.getJSON(
                "/" + key + "/" + sha + "/?path=" + path,
                function(data) {
                    self.cache[path][sha][key] = data;
                    fn(data);
                }
            );
        }
    }
};


// A lazy, infinite, asynchronous list implementation.
var LazyList = function(base, gen) {
    this.base = base;
    this.gen = gen;
    this._internal = [base];
};

LazyList.prototype.get = function(idx, fn) {
    var self = this;

    if (this._internal.length > idx) {
        fn(this._internal[idx]);
    }
    else {
        this.get(idx - 1, function(pre) {
            self.gen(pre, function(next) {
                self._internal[idx] = next;
                fn(self._internal[idx]);
            });
        });
    }
};

LazyList.prototype.enumerate = function(from, to, fn) {
    var self = this;
    this.get(to, function() {
        fn(
            self._internal.slice(
                from, 
                to
            )
        )
    });
};

var MapList = function(list, wrapper) {
    this.list = list;
    this.wrapper = wrapper;
};

MapList.prototype.get = function(idx, fn) {
    var self = this;
    this.list.get(
        idx,
        function(x) {
            self.wrapper(
                x,
                fn
            );
        }
    );
};

var Repo = function(path) {
    this.path = path;
};

Repo.prototype.getFirstCommit = function(fn) {
    var self = this;
    $.getJSON(
        "/first/commit/?path=" + this.path,
        function(commit) {
            fn(
                new Repo.Commit(
                    self,
                    commit
                )
            );
        }
    );
};

Repo.prototype.getCommit = function(sha, fn) {
    var self = this;
    ShaProxy.load(
        this.path,
        "commit",
        sha,
        function(rawCommit) {
            fn(
                new Repo.Commit(
                    self,
                    rawCommit
                )
            );
        }
    );
};

Repo.prototype.loadCommits = function(shas, fn, extra) {
    var self = this;

    if (!extra) { 
        extra = []; 
    }

    if (!shas.length) {
        fn(extra);
    }
    else {
        this.getCommit(
            shas[0],
            function(c) {
                self.loadCommits(
                    shas.slice(1),
                    fn,
                    extra.concat([ c ])
                );
            }
        );
    }
};

Repo.prototype.getCommits = function(fn) {
    var self = this;

    this.getFirstCommit(
        function(commit) {
            var 
                frontier = [ commit ],
                getNext = function() { 
                    var 
                        bestD = new Date("January 1, 1970"),
                        bestI = -1,
                        bestS = "",
                        freq = 0;

                    for (var idx = 0; idx < frontier.length; ++idx) {
                        
                        window.f = frontier[idx];
                        var t = new Date(frontier[idx].getCommitter().date);

                        if (frontier[idx].getSha() == bestS) {
                            ++freq;
                        }
                        else if (t > bestD) {
                            bestD = t;
                            bestI = idx;
                            bestS = frontier[idx].getSha();
                            freq = 1;
                        }
                    }

                    return { index:bestI, freq:freq };
                };

            fn(
                new LazyList({ 
                        index:0, 
                        shift:1, 
                        removed:[],
                        commit:commit,
                        frontier:[commit]
                    },
                    function(child, fn) {
                        var
                            n = getNext(),
                            idx = n.index,
                            branch = n.freq,
                            next = frontier[idx];

                        self.loadCommits(
                            next.getParents(),
                            function(parents) {

                                frontier.splice.apply(
                                    frontier,
                                    [idx, 1].concat(parents)
                                );

                                var removed = [], counter = 0;

                                for (
                                    var fidx = 0; 
                                    fidx < frontier.length; 
                                    ++fidx) {
                                    ++counter;
                                    if (frontier[fidx].getSha() == next.getSha()) {
                                        frontier.splice(fidx, 1);
                                        --fidx;
                                        removed.push(counter);
                                    }
                                }
                                
                                fn({ 
                                    index:idx, 
                                    shift:next.getParents().length - branch, 
                                    removed:removed,
                                    commit:next,
                                    frontier:frontier.slice(0)
                                });
                            }
                        );
                    }
                )
            );
        }
    );
};

Repo.Commit = function(repo, raw) {
    this._repo = repo;
    this._raw = raw;
};

Repo.Commit.prototype.getTree      = function() { return this._raw.tree;      }
Repo.Commit.prototype.getSha       = function() { return this._raw.sha;       }
Repo.Commit.prototype.getParents   = function() { return this._raw.parents;   }
Repo.Commit.prototype.getAuthor    = function() { return this._raw.author;    }
Repo.Commit.prototype.getCommitter = function() { return this._raw.committer; }
Repo.Commit.prototype.getComment   = function() { return this._raw.comment;   }

Repo.Commit.prototype.loadTree = function(fn) {
    var self = this;
    ShaProxy.load(
        this._repo.path,
        "tree",
        this.getTree(),
        function(rawTree) {
            fn(
                new Repo.Tree(
                    self._repo, 
                    rawTree
                )
            );
        }
    );
};

Repo.Commit.prototype.loadLog = function(fn) {
    var self = this;
    ShaProxy.load(
        this._repo.path,
        "log", 
        this.getSha(),
        function(rawLog) {
            fn(
                new Repo.LogEntry(
                    self._repo,
                    rawLog
                )
            );
        }
    );
};

Repo.LogEntry = function(repo, raw) {
    this._repo = repo;
    this._raw = raw;
};

Repo.LogEntry.prototype.getFiles = function() {
    return _.map(this._raw.diffs, function(diff) {
        return diff.name;
    });
};

Repo.LogEntry.prototype.getTree = function() {
    return embed(
        _.map(this.getFiles(), function(name) { 
            return name.split("/"); 
        })
    );
    
    function embed(names) {
        var 
            res = { },
            types = _.groupBy(
                names, 
                function(name) {
                    return name.length == 1;
                }
            ),
            files = types[true] || [],
            dirPaths = types[false] || [],

            dirGroups = _.groupBy(
                dirPaths, 
                function(path) { 
                    return path[0]; 
                }
            );

        for (var dirName in dirGroups) {
            if (dirGroups.hasOwnProperty(dirName)) {
                res[dirName] = embed(
                    _.map(
                        dirGroups[dirName], 
                        function(path) {
                            return path.slice(1);
                        }
                    )
                );
            }
        }

        for (var fidx = 0; fidx < files.length; ++fidx) {
            res[files[fidx]] = files[fidx][0];
        }

        return res;
    };
};

Repo.Tree = function(repo, raw) {
    this._repo = repo;
    this._raw = raw;
};

Repo.Tree.prototype.getDirectories = function() {
    var res = { };
    for (var idx = 0; idx < this._raw.length; ++idx) {
        if (this._raw[idx].type == "tree") {
            res[this._raw[idx].path] = this._raw[idx].sha;
        }
    }
    return res;
};

Repo.Tree.prototype.getFiles = function() {
    var res = { };
    for (var idx = 0; idx < this._raw.length; ++idx) {
        if (this._raw[idx].type == "blob") {
            res[this._raw[idx].path] = this._raw[idx].sha;
        }
    }
    return res;
};

Repo.Tree.prototype.loadSubTree = function(path, fn) {
    var 
        e, 
        self = this;

    for (var idx = 0; idx < this._raw.length; ++idx) {
        e = this._raw[idx];
        if (e.type == "tree" && e.path == path) {
            ShaProxy.load(
                this._repo.path,
                "tree",
                e.sha,
                function(rawTree) {
                    fn(
                        new Repo.Tree(
                            self._repo, 
                            rawTree
                        )
                    );
                }
            );
        }
    }
};

Repo.Tree.prototype.loadFile = function(path, fn) {
    var
        self = this,
        split = path.split("/");

    find_(split, this, fn);

    function find_(p, ctx, fn) {
        if (p.length == 0) {
            fn(null);
        }
        else if (p.length == 1) {
            var files = ctx.getFiles();

            for (var name in files) {
                if (files.hasOwnProperty(name) && name == p[0]) {
                    ShaProxy.load(
                        self._repo.path,
                        "blob",
                        files[name],
                        fn
                    );

                    return;
                }
            }

            fn(null);
        }
        else {
            var dirs = ctx.getDirectories();

            for (var name in dirs) {
                if (dirs.hasOwnProperty(name) && name == p[0]) {
                    ctx.loadSubTree(
                        p[0],
                        function(sub) {
                            find_(
                                p.slice(1),
                                sub,
                                fn
                            );
                        }
                    );
                    return;
                }
            }

            fn(null);
        }
    }
};








