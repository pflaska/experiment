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
    // console.profile("metro-graph-profile");
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
        
        runningLanes: [],
        
        /**
         * Get the next lane index
         * 
         * @returns {Number}
         */
        nextLane: function() {
            return this.currentLane++;
        },
        
        className: function(index) {
            var colors = [ 'master', 'branch1', 'branch2', 'branch3', 'master',
                'branch1', 'branch2', 'branch3', 'master', 'branch1', 'branch2',
                'branch3', 'master', 'branch1', 'branch2', 'branch3', 'master',
                'branch1', 'branch2', 'branch3', 'master', 'branch1', 'branch2',
                'branch3' ];
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
    
    // console.profileEnd("metro-graph-profile");
};

function isRoot(commit, roots) {
    return _.find(roots, function(root) {
       return root.sha === commit.sha; 
    });
}

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
        var groupElement = createGroupElement(lane, model);
        $(groupElement).appendTo(svg);
        
        var lineElement = createLineElement(lane, model);
        $(lineElement).appendTo(groupElement);
        
        if (lane.laneIndex && lane.end.fork) {
            var path = createForkPath(lane, model);
            $(path).appendTo(svg);
        }
    });
    _.each(model.log, function(commit) {
        if (commit.ref) {
            model.runningLanes.push(model.lanes[commit.lane]);
        }
        
        var lane = isMergeLaneStart(commit, model);
        if (lane) {
            model.runningLanes.push(lane);
            console.log("Commit %s is a merge, lane started %s.", commit.minimizedCommitId, lane.laneIndex);
        }

        lane = isFork(commit, model);
        if (lane) {
            console.log("Commit %s is a fork, lane stopped %s", commit.minimizedCommitId, lane.laneIndex);
            var index = model.runningLanes.indexOf(lane);
            if (index) {
                model.runningLanes.splice(index, 1);
            }
        }
        var commitElement = createCommitElement(commit, model);
        // TODO pf: not supporting third and more parents now in prototype!
        // This has to be finished for release version!
        if (commit.parents && commit.parents.length > 1) {
            // merge point!!!
            var mergePath = createMergePath(commit, model);
            $(mergePath).appendTo($("g." + model.className(commit.lane)));
        }
        $(commitElement).appendTo($("g." + model.className(commit.lane)));
    });
    
    generateLabel();
};

function isMergeLaneStart(commit, model) {
    return _.find(model.lanes, function(lane) {
        return lane.start.commitId === commit.commitId;
    });
}

function generateLabel() {
    var g = document.createElementNS(svgns, "g");
    g.setAttribute("transform", "translate(" + 55 + "," + 20 + ")");
    var rect = document.createElementNS(svgns, "rect");
    rect.setAttribute("rx", 15);
    rect.setAttribute("ry", 15);
//    rect.setAttribute("width", 100);
    rect.setAttribute("height", 30);
    rect.setAttribute("class", "master");
    // <text x="0" y="10" font-family="Verdana" font-size="55" fill="blue" > Hello </text>
    var text = document.createElementNS(svgns, "text");
    text.setAttribute("x", 15);
    text.setAttribute("y", 15);
    text.setAttribute("alignment-baseline", "middle"); // text-anchor="middle"
    //text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-family", "Verdana");
    text.setAttribute("font-size", "20");
    text.setAttribute("fill", "white");
    text.appendChild(document.createTextNode("master"));
    g.appendChild(rect);
    g.appendChild(text);
    getSvg().append(g);
    rect.setAttribute("width", text.getBBox().width + 30);
    console.log();


}
function isFork(commit, model) {
    return _.find(model.lanes, function(lane) {
        return lane.end.fork && lane.end.fork.commitId === commit.commitId;
    });
}

function createMergePath(commit, model) {
    var secondParent = findCommit(model.log, commit.parents[1]);

    var cx = commit.lane * RENDER_CONSTANTS.step_x + RENDER_CONSTANTS.circle_centre_x;
    var cy = commit.seq * RENDER_CONSTANTS.step_y + RENDER_CONSTANTS.circle_centre_y;

    var path = document.createElementNS(svgns, "path");

    var pm = secondParent.lane > commit.lane ? "+" : "-";
    var hstep = Math.abs(commit.lane * RENDER_CONSTANTS.step_x - 30 + secondParent.lane * RENDER_CONSTANTS.step_x);
    path.setAttribute("d", "M " + cx + " " + (cy + 15) +
        " q 0 15 " + pm + "15 15 h " + pm + hstep +  " q " + pm + "15 0 " + pm + "15 15 v 15");

    var cls = model.className(secondParent.lane);
    path.setAttribute("class", cls);

    return path;
};

function rL(index, model) {
    var l = model.lanes;
    var renderl = model.runningLanes.indexOf(l[index]);
    console.log(renderl);
    return renderl;
}

function createForkPath(lane, model) {
    var path = document.createElementNS(svgns, "path");

    var to = lane.end.seq;
    var x1 = lane.laneIndex * RENDER_CONSTANTS.step_x + RENDER_CONSTANTS.circle_centre_x;
    var y2 = to * RENDER_CONSTANTS.step_y + RENDER_CONSTANTS.circle_centre_y;

    path.setAttribute("d", "M " + x1 + " " + y2 + " v " + (((lane.end.fork.seq - lane.end.seq) * 60) - 45) +
            "q 0 15 -15 15" +
            " H " + (lane.end.fork.lane * RENDER_CONSTANTS.step_x + RENDER_CONSTANTS.circle_centre_x + 15) +
            " q -15 0 -15 15");
    path.setAttribute("class", model.className(lane.laneIndex));

    return path;

}
/**
 * Creates a commit point in graph based on provided commit
 * 
 * @param {type} commit      commit to show
 * @param {type} model       log model
 * @returns {element}  svg commit element circle
 */
function createCommitElement(commit, model) {
    var element = document.createElementNS(svgns, "circle");
    if (isFork(commit, model) || isMergeLaneStart(commit, model)) {
    }
    var cx = rL(commit.lane, model) * RENDER_CONSTANTS.step_x + RENDER_CONSTANTS.circle_centre_x;
    var cy = commit.seq * RENDER_CONSTANTS.step_y + RENDER_CONSTANTS.circle_centre_y;
    element.setAttribute("cx", cx);
    element.setAttribute("cy", cy);
    element.setAttribute("class", model.className(commit.lane));
    element.setAttribute("id", commit.seq);
    element.setAttribute("commit", commit.minimizedCommitId);
    
    var t = document.createElementNS(svgns, "title");
    t.appendChild(document.createTextNode(commit.minimizedCommitId));
    element.appendChild(t);
    
    return element;
}

function createGroupElement(lane, model) {
    var element = document.createElementNS(svgns, "g");
    element.setAttribute("class", model.className(lane.laneIndex));

    return element;
}

function createStyleDefs() {
    // TODO pf: shouldn't be in ![CDATA[ ]]>
    var defs = document.createElementNS(svgns, "defs");
    var element = document.createElementNS(svgns, "style");
    element.type = "text/css";
    element.textContent = styles;
    getSvg().append(defs);
    $(defs).append(element);
}

function createLineElement(lane, model) {
    var element = document.createElementNS(svgns, "line");
    element.setAttribute("class", model.className(lane.laneIndex));

    var from = lane.start.next.seq;
    var to = lane.end.seq;

    var x = lane.laneIndex * RENDER_CONSTANTS.step_x + RENDER_CONSTANTS.circle_centre_x;
    var y1 = from * RENDER_CONSTANTS.step_y + RENDER_CONSTANTS.circle_centre_y;
    var y2 = to * RENDER_CONSTANTS.step_y + RENDER_CONSTANTS.circle_centre_y;

    element.setAttribute("x1", x);
    element.setAttribute("x2", x);
    element.setAttribute("y1", y1);
    element.setAttribute("y2", y2);

    return element;
}

function findCommit(log, commitId) {
    var result = _.find(log, function(commit) {
        return commit.commitId === commitId;
    });
    return result;
}

return init;

});
