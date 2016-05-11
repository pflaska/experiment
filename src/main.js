requirejs.config({
    baseUrl: 'libs',
    paths: {
        graph: '../graph',
        jquery: 'jquery/dist/jquery',
        underscore: 'underscore/underscore'
    }
});

// Start loading the main app file. Put all of
// your application logic in there.
//requirejs(['graph']);

main();

function main() {
      require(["jquery", "graph"], function($, metroGraph) {

        $.getJSON("data/demodata3.json", {
        tags: "mount rainier", 
        tagmode: "any",
        format: "json"
      }).done(function(data) {
          var list = data.commitList;
          metroGraph.init(list);
          metroGraph.print();
      }); 
    });

}
 