define([
    "underscore"
], function (
    _
) {

var metroGraph = {};

metroGraph.init = function(log) {
    this.log = log;
    lines.push(this.log[0].commitId);
};

var lines = [];

metroGraph.print = function() {

    _(this.log).each(function (commit) {
        var title = commit.comment.split('\n')[0];
        var index = _(lines).indexOf(commit.commitId);
        commit = this.line(commit, commit.parents);
        console.log("line " + commit.line + " (" + commit.kind + "): " + commit.minimizedCommitId + " " + title);
    }, this);
};
 
metroGraph.line = function(commit, parents) {
    if (!parents.length) {
        commit.kind = "initial";
        commit.line = 0;
        return commit;
    }
    var sha1 = commit.commitId;
    commit.kind = "normal"; 
    _(parents).each(function (p) {
        var replace = sha1;
        _(lines).each(function(l, i) {
            if (l === sha1) {
                if (replace) {
                    commit.line = i;
                } else {
                    commit.kind += " fork " + i;
                }
                lines[i] = replace;
                replace = null;
            }
        }); 
        var index = _(lines).indexOf(sha1);
        if (index !== -1) {
            lines[index] = p;
        } else {
            var index =  _(lines).indexOf(null);
            if (index === -1) {
                lines.push(p);
                index = lines.length-1;
            } else {
                lines[index] = p;
            }
            //commit.line = index;
            commit.kind = "merge " + index;
        }
    });
    return commit;
};

return metroGraph;

});
