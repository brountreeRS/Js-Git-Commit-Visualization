start = commit

commit = 
    tree:tree 
    parents:parent* 
    author:author
    committer:committer
    mergetag? "\n"
    comment:.+ { 
    return { 
        tree:tree, 
        parents:parents,
        author:author,
        committer:committer,
        comment:comment.join("")
    }; 
}

tree = "tree " sha:sha "\n" { return sha; }
parent = "parent " sha:sha "\n" { return sha; }
author = "author " person:person { return person; }
committer = "committer " person:person { return person; }

person =
    name:[^<]+ 
    "<" 
    email:[^>]+
    "> "
    date:date
    "\n" {
        return {
            name:name.join(""),
            email:email.join(""),
            date:date
        }
    }


sha = x:[a-f0-9]+ { return x.join(""); }
date = x:[0-9]+ " " [-+] [0-9]+ { 
        return new Date(1000 * parseInt(x.join(""), 10)); 
    }

mergetag = "mergetag" mergeline+ 
mergeline = " " [^\n]* "\n"
