define([
    "underscore",
    "jquery",
    
    "text!./styles.css"
], function (
    _,
    $,
    
    styles
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
        
        className: function(index) {
            var colors = [ 'master', 'branch1', 'branch2', 'branch3', 'master', 'branch1', 'branch2', 'branch3', 'master', 'branch1', 'branch2', 'branch3', 'master', 'branch1', 'branch2', 'branch3', 'master', 'branch1', 'branch2', 'branch3', 'master', 'branch1', 'branch2', 'branch3' ];
            return index > 22 ? 'unknown' : colors[index];
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
                class: this.className(laneIndex),
                
                // if the lane has assign label, it is a root lane, all others
                // are merged lanes
                rootLane: function() {
                    return this.label;
                }
            };
            
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
    svgViewGenerate(model);
    
    /// old stuff ///
    var m = {};
    m.roots = branches;
    m.log = log;
    m.line = $.proxy(line, m);
    m.lines = [ m.log[0].commitId ];
    //dump(m);
    dump2(model);
    
    
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

var RENDER_CONSTANTS = {
    circle_radius: 15,
    circle_centre_x: 35,
    circle_centre_y: 35,
    step_y: 60,
    step_x: 60
};

getSvg = function() {
    return $("svg#esvegecko");
};

generateStyle = function(model) {
    // generate class style!
};

var svgns   = "http://www.w3.org/2000/svg";
var svg = getSvg();

svgViewGenerate = function(model) {
    createStyleDefs();
    
    _.each(model.lanes, function(lane) {
        var from = lane.start.next.seq;
        var to = lane.end.seq;
        
        var line = document.createElementNS(svgns, "line"); 
        line.setAttribute("class", model.className(lane.laneIndex));
        
        var x1 = lane.laneIndex * RENDER_CONSTANTS.step_x + RENDER_CONSTANTS.circle_centre_x;
        var y1 = from * RENDER_CONSTANTS.step_y + RENDER_CONSTANTS.circle_centre_y;
        var y2 = to * RENDER_CONSTANTS.step_y + RENDER_CONSTANTS.circle_centre_y;
        line.setAttribute("x1", x1);
        line.setAttribute("x2", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("y2", y2);
        $(line).appendTo(svg);
        
        if (lane.laneIndex) {
            // merge point!!!
            var path = document.createElementNS(svgns, "path");
            path.setAttribute("d", "M " + x1 + " " + y1 + " v -15 q 0 -15 -15 -15 h -" + (lane.laneIndex * RENDER_CONSTANTS.step_x - 30 + lane.start.lane * RENDER_CONSTANTS.step_x) + " 0 q -15 0 -15 -15");
            path.setAttribute("class", model.className(lane.laneIndex));
            $(path).appendTo(svg);
            if (lane.end.fork) {
                path = document.createElementNS(svgns, "path");
                path.setAttribute("d", "M " + x1 + " " + y2 + " v " + (((lane.end.fork.seq - lane.end.seq) * 60) - 45) +
                        "q 0 15 -15 15" + 
                        " H " + (lane.end.fork.lane * RENDER_CONSTANTS.step_x + RENDER_CONSTANTS.circle_centre_x + 15) + 
                        " q -15 0 -15 15");
                path.setAttribute("class", model.className(lane.laneIndex));
                $(path).appendTo(svg);
            }
        }
        
        
    });
    _.each(model.log, function(commit) {
        var commitElement = createCommitElement(commit, model);
        
        if (commit.parents && commit.parents.length > 1) {
            var secondParent =  findCommit(model.log, commit.parents[1]);
            var sx = secondParent.lane * RENDER_CONSTANTS.step_x + RENDER_CONSTANTS.circle_centre_x;
            var sy = secondParent.seq * RENDER_CONSTANTS.step_y + RENDER_CONSTANTS.circle_centre_y;
            
            var cx = commit.lane * RENDER_CONSTANTS.step_x + RENDER_CONSTANTS.circle_centre_x;
            var cy = commit.seq * RENDER_CONSTANTS.step_y + RENDER_CONSTANTS.circle_centre_y;

            path = document.createElementNS(svgns, "path");
            path.setAttribute("d", "M " + cx + " " + cy + " L " + sx + " " + sy); // + (((commit.seq - secondParent.seq) * 60) - 45) +
                    // "q 0 15 -15 15" + 
                    //" H " + (lane.end.fork.lane * RENDER_CONSTANTS.step_x + RENDER_CONSTANTS.circle_centre_x + 15) + 
                    //" q -15 0 -15 15");
            path.setAttribute("class", model.className(lane.laneIndex));
            $(path).appendTo(svg);
            
        }
        $(commitElement).appendTo(svg);
    });
};


/**
 * Creates a commit point in graph based on provided commit
 * 
 * @param {type} commit      commit to show
 * @param {type} model       log model
 * @returns {element}  svg commit element circle
 */
function createCommitElement(commit, model) {
    var element = document.createElementNS(svgns, "circle");
    
    var cx = commit.lane * RENDER_CONSTANTS.step_x + RENDER_CONSTANTS.circle_centre_x;
    var cy = commit.seq * RENDER_CONSTANTS.step_y + RENDER_CONSTANTS.circle_centre_y;
    element.setAttribute("cx", cx);
    element.setAttribute("cy", cy);
    element.setAttribute("class", model.className(commit.lane));
    element.setAttribute("id", commit.seq);
    element.setAttribute("commit", commit.minimizedCommitId);
    
    return element;
}


function createStyleDefs(count) {
    // TODO pf: shouldn't be in ![CDATA[ ]]>
    var defs = document.createElementNS(svgns, "defs");
    var element = document.createElementNS(svgns, "style");
    element.type = "text/css";
    element.textContent = styles;
    getSvg().append(defs);
    $(defs).append(element);
}
function createLineElement(commit, model) {
}
function findCommit(log, commitId) {
    var result = _.find(log, function(commit) {
        return commit.commitId === commitId;
    });
    console.log(result);
    return result;
}

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
    class: "", /* lane styling, i.e. color etc. */
    laneIndex: 0, /* current lane index */
    last_oid: 0, /* last rendered commit */
    visible: true, /* lane visible? */
    label: '' /* ref name, represents item from roots */
};

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
