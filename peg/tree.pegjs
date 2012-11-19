start = entry+

entry = 
    [0-9]+
    [ \t]+
    type:type
    [ \t]+
    sha:sha
    [ \t]+
    path:path
    "\n" {
        return {
            type:type,
            sha:sha,
            path:path
        };
    }


type = "blob" / "tree"
sha = x:[a-f0-9]+ { return x.join(""); }
path = x:[^\n]+ { return x.join(""); }
