/*

Owen Gallagher
2021-09-03

rt webapp index page js

DEPENDENCIES

jquery

rt_webapp/visualizer

*/

$(document).ready(() => {
    // index_context should be defined in caller page
    let visualizer = new Visualizer(index_context.tags_object, $('#visualizer-canvas'))
})
