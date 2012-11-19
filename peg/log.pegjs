start = log

log = 
    commit
    merge:merge?
    author
    date 
    comment 
    diffs:diff* { 
    return { 
        merge:merge,
        diffs:diffs
    }; 
}

commit = "commit " sha:sha "\n" { return sha; }
author = "Author: " person:person { return person; }
date = "Date:" [^\n]+
merge = "Merge: " shas:msha+ "\n" { return shas; }

msha = sha:sha " "? { return sha; }

person =
    name:[^<]+ 
    "<" 
    email:[^>]+
    ">"
    "\n" {
        return {
            name:name.join(""),
            email:email.join("")
        }
    }


sha = x:[a-f0-9]+ { return x.join(""); }

comment = commentLine+
commentLine = 
    "\n" / 
    [ \t] [^\n]+ "\n"

diff = 
    "diff --git "
    prename:dname
    " "
    postname:dname
    "\n"
    deleted?
    "index" [^\n]+ "\n"
    "---" [^\n]+ "\n"
    "+++" [^\n]+ "\n"
    hunks:hunk+ { 
        return {
            name:prename,
            hunks:hunks
        };
    }

deleted = "deleted" [^\n]+ "\n"
dname = [a-z] "/" n:[^ \n]+ { return n.join(""); }

hunk =
    range:range 
    lines:line+ {
        return {
            range:range,
            lines:lines
        };
    }

range = 
    "@@ -" 
    preStart:int 
    "," 
    preLen:int 
    " +" 
    postStart:int 
    "," 
    postLen:int 
    " @@"
    heading:heading? "\n" {
        return {
            preStart:preStart,
            preLen:preLen,
            postStart:postStart,
            postLen:postLen
        }
    }

line = 
    removal /
    addition /
    context

removal = 
    "-"
    data:[^\n]*
    "\n" {
        return {
            type:-1,
            data:data.join("")
        }
    }

addition = 
    "+"
    data:[^\n]* 
    "\n" {
        return {
            type:1,
            data:data.join("")
        }
    }

context = 
    " "
    data:[^\n]* 
    "\n"? {
        return {
            type:0,
            data:data.join("")
        }
    }

heading = [^\n]+

int = ds:[0-9]+ { 
        return parseInt(ds.join(""), 10); 
    }
