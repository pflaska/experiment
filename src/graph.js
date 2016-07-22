define([
    "underscore"
], function (
    _
) {


init = function(log, branches) {
    var metroGraph = {};
    
    metroGraph.log = log;
    metroGraph.line = $.proxy(line, metroGraph);
//    console.log(branches);
    metroGraph.lines = [ metroGraph.log[0].commitId ];
    
    return {
        'print': $.proxy(print, metroGraph)
    };
};

function print() {

    _(this.log).each(function (commit) {
        var title = commit.comment.split('\n')[0];
        var index = _(this.lines).indexOf(commit.commitId);
        commit = this.line(commit, commit.parents);
        console.log("line " + commit.line + " (" + commit.kind + "): " + commit.minimizedCommitId + " " + title);
    }, this);
};
 
function line(commit, parents) {
    if (!parents.length) {
        commit.kind = "initial";
        commit.line = 0;
        return commit;
    }
    var sha1 = commit.commitId;
    commit.kind = "normal";
    _(parents).each(function (p) {
        var replace = sha1;
        _(this.lines).each(function(l, i) {
            if (l === sha1) {
                if (replace) {
                    commit.line = i;
                } else {
                    commit.kind += " fork " + i;
                }
                this.lines[i] = replace;
                replace = null;
            }
        }, this); 
        var index = _(this.lines).indexOf(sha1);
        if (index !== -1) {
            this.lines[index] = p;
        } else {
            var index =  _(this.lines).indexOf(null);
            if (index === -1) {
                this.lines.push(p);
                index = this.lines.length-1;
            } else {
                this.lines[index] = p;
            }
            //commit.line = index;
            commit.kind = "merge " + index;
        }
    }, this);
    return commit;
};

return init;

});
