requirejs.config({
    baseUrl: '.',
    paths: {
        graph: 'graph',
        jquery: 'libs/jquery/dist/jquery',
        underscore: 'libs/underscore/underscore',
        model: 'model'
    }
});

// Start loading the main app file. Put all of
// your application logic in there.
//requirejs(['graph']);

main();

function main() {
    require(["jquery", "graph"], function ($, metroGraph) {

        $.getJSON("data/demodata3.json", {
            tags: "mount rainier",
            tagmode: "any",
            format: "json"
        }).done(function (data) {
            var list = data.commitList;
            var model = metroGraph(list, [{'ref': 'master', 'sha': list[0].sha}]);
            console.log(model);
            model.print();
        });
    });

}
 