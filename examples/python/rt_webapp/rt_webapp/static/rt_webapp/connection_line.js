/*

Owen Gallagher
2021-09-03

rt webapp connection node for visualizer

*/

function ConnectionLine(visualizer, conn) {
    this.v = visualizer
    this.source = conn.source
    this.type = conn.type
    this.target = conn.target
    console.log(`${this.source.name}=${this.target.name}`)
    
    this.graphic = undefined
    this.graphic_line = undefined
    this.color = 'white'
    this.create_graphic()
}

ConnectionLine.prototype.create_graphic = function() {
    let paper = this.v.paper
    
    let line = new paper.Path.Line({
        from: [0,0],
        to: [0,0],
        strokeColor: this.color
    })
    this.graphic_line = line
    
    this.graphic = new paper.Group({
        children: [line]
    })
    
    this.graphic.sendToBack()
}

ConnectionLine.prototype.move = function() {
    this.graphic_line.firstSegment.point = this.source.graphic_circle.position
    this.graphic_line.lastSegment.point = this.target.graphic_circle.position
}
