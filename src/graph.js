define([
    "underscore",
    "jquery"
], function (
    _,
    $
) {

init = function(log, branches) {
    var model = {
        
        /**
         * list of existing lanes
         */
        lanes: [],
        
        /**
         * index of lanes in use
         */
        
        currentLane: 0,
        /**
         * Commit index
         */
        
        commitIndex: 0,
        
        log: log,
        
        /**
         * Get the next lane index
         * 
         * @returns {Number}
         */
        nextLane: function() {
            return this.currentLane++;
        },
        
        commitExt: function(commit, laneIndex) {
            var index = this.commitIndex++;
            commit.seq = index;
            commit.lane = laneIndex;
            
            return commit;
        },
        
        /**
         * Create the new lane, identified by root commit and reference label
         *  
         * @param {type} commit    lane's root
         * @returns {newLane}
         */
        createLane: function(commit) {
            var laneIndex = this.nextLane();
            this.commitExt(commit, laneIndex);
            
            var ref = isRoot(commit, branches);
            var startCommit = { "next": commit };
            if (ref) {
                commit.ref = ref.ref;
            } else {
                var merge = _.find(log, function(entry) {
                    return entry.parents.length > 1 && _.contains(entry.parents, commit.sha, 1);
                });
                $.extend(startCommit, merge);
                if (!merge.mergeLanes) {
                    merge.mergeLanes = [];
                }
                merge.mergeLanes.push(laneIndex);
            }
            
            var newLane = {
                laneIndex: laneIndex,
                label: ref,
                start: startCommit,
                end: commit,
                color: 'red',
                
                // if the lane has assign label, it is a root lane, all others
                // are merged lanes
                rootLane: function() {
                    return this.label;
                }
            };
            
//            if (!ref) {
//                _.findIndex(this.lanes, function(lane) {
///                    _.(lane.parents, function() {
//                        
//                    })
//                });
//            }
            this.lanes.push(newLane);
            
            return newLane;
        },
        /**
         * 
         * @param {type} commit
         * @returns {undefined}
         */        
        update: function(commit) {
            var lane = this.getLane(commit);
            if (!lane) {
                this.createLane(commit);
            } else {
                lane.end.next = this.commitExt(commit, lane.laneIndex);
                lane.end = commit;
            }
        },
        
        
        // utilities
        getLane: function(commit) {
            return _.find(this.lanes, function(lane) {
                var c = lane.end; // commit
                return c.parents.length && c.parents[0] === commit.sha;
            });
        }
        
    };

    _.each(log, function(commit) {
        model.update(commit);
    });
    
    _.each(model.lanes, function(lane) {
        var found = _.find(log, function(commit) {
           return lane.end.parents.length > 0 && commit.sha === lane.end.parents[0]; 
        });
        if (found) {
            lane.end.fork = found;
        }
    });
    
    /// old stuff ///
    var m = {};
    m.roots = branches;
    m.log = log;
    m.line = $.proxy(line, m);
    m.lines = [ m.log[0].commitId ];
    //dump(m);
    dump2(model);
    generateDom(model);
    
    return {
        'print': $.proxy(print, m)
    };
    /// old stuff ///
};

function isRoot(commit, roots) {
    return _.find(roots, function(root) {
       return root.sha === commit.sha; 
    });
}

dump2 = function(model) {
    console.group("metro-graph-model");
    _.each(model.log, function(c) {
        var item = " " + c.minimizedCommitId + " " + c.comment.split('\n')[0];
        if (c.mergeLanes) item = " (merge " + c.mergeLanes.toString() + ")" + item;
        if (c.ref) item = " (" + c.ref + ")" + item;
        if (c.fork) item = " (fork " + c.fork.lane + " " + c.fork.minimizedCommitId + ")" + item;
        item = "l " + c.lane + item;
        console.log(item /* , c */);
    });
    console.groupEnd("metro-graph-model");
};

generateDom = function(model) {
    _.each(model.lanes, function(lane) {
        console.log(lane);
    });
    _.each(model.log, function(c) {
    });
};

dump = function(model) {
    console.groupCollapsed("metro-graph-model");
    if (model.roots) {
        _.each(model.roots, function(ref) {
            console.log("reference '%s' points to '%s'", ref.ref, ref.sha);
        });
    }
    if (model.log) {
        console.log("model contains %s commits.", model.log.length);
    }
    console.groupEnd("metro-graph-model");
};
 
var lane = {
    color: 0, /* drawing color */
    index: 0, /* current lane index */
    last_oid: 0, /* last rendered commit */
    visible: true, /* lane visible? */
    label: '' /* ref name, represents item from roots */
};

//init = function(log, branches) {
//    var metroGraph = {};
//
//    metroGraph.model = {
//        roots: branches, // array of { 'ref' 'sha' } objects
//        lanes: {
//            
//        }
//    };
//    
//    metroGraph.log = log;
//    metroGraph.line = $.proxy(line, metroGraph);
////    console.log(branches);
//    metroGraph.lines = [ metroGraph.log[0].commitId ];
//    return {
//        'print': $.proxy(print, metroGraph)
//    };
//};

function print() {
    console.group("metro-graph-old");
    _(this.log).each(function (commit) {
        var title = commit.comment.split('\n')[0];
        var index = _(this.lines).indexOf(commit.commitId);
        commit = this.line(commit, commit.parents);
        console.log("l " + commit.line + " (" + commit.kind + "): " + commit.minimizedCommitId + " " + title);
    }, this);
    console.groupEnd("metro-graph-old");

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
