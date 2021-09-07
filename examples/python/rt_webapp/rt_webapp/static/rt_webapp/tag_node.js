/*

Owen Gallagher
2021-09-03

rt webapp tag node for visualizer

*/

function TagNode(visualizer, tag_name) {
    let paper = visualizer.paper
    
    this.v = visualizer
    this.name = tag_name
    
    this.frozen = false
    
    this.graphic = undefined
    this.graphic_circle = undefined
    this.color = new paper.Color(
        Math.max(0.25,Math.random()),
        Math.max(0.25,Math.random()),
        Math.max(0.25,Math.random())
    )
    this.create_graphic()
    
    this.handle_gui_events()
    
    this.acceleration = new paper.Point(0,0)
    this.velocity = new paper.Point(0,0)
}

TagNode.radius = 5
TagNode.mass = 1
TagNode.friction = 0.95
TagNode.repulsion = 2
TagNode.conn_length = TagNode.radius * 10

TagNode.prototype.create_graphic = function() {
    let paper = this.v.paper
    
    let circle = new paper.Path.Circle({
		center: [0,0],
		radius: TagNode.radius,
		fillColor: this.color
    })
    this.graphic_circle = circle
    
    let label = new paper.PointText({
        position: [0,-TagNode.radius*2],
        fontFamily: 'monospace',
        justification: 'center',
        fillColor: this.color,
        content: this.name
    })
    
    this.graphic = new paper.Group({
        children: [
            circle,
            label
        ],
        position: [
            Math.random()*(this.v.view_dims.width-TagNode.radius*2) + TagNode.radius,
            Math.random()*(this.v.view_dims.height-TagNode.radius*2) + TagNode.radius
        ]
    })
}

TagNode.prototype.handle_gui_events = function() {
    let paper = this.v.paper
    let self = this
    
    // disable movement on mouse down
    this.graphic.onMouseDown = function(event) {
        self.frozen = true
    }
    
    // enable movement on mouse up
    this.graphic.onMouseUp = function(event) {
        self.frozen = false
    }
    
    // handle mouse drag to reposition
    this.graphic.onMouseDrag = function(event) {
        self.graphic.position = self.graphic.position.add(event.delta)
    }
}

TagNode.prototype.attract_bidirect = function(other, gravity) {
    let diff = other.graphic.position.subtract(this.graphic.position)
    let d = diff.length
    
    if (d > TagNode.radius*2 + TagNode.conn_length) {
        diff = diff
            .normalize()
            .multiply(TagNode.mass*TagNode.mass*gravity*d)
        
        this.acceleration = this.acceleration.add(diff)
        other.acceleration = other.acceleration.add(diff.multiply(-1))  
    }
    
}

TagNode.prototype.repel_bidirect = function(other) {
    let diff = other.graphic.position.subtract(this.graphic.position)
    let d = diff.length
    
    if (d < TagNode.radius*2 + TagNode.conn_length) {
        diff = diff
            .normalize()
            .multiply(TagNode.mass*TagNode.mass*TagNode.repulsion)
            .divide(d*d)
        
        this.acceleration = this.acceleration.add(diff.multiply(-1))
        other.acceleration = other.acceleration.add(diff)
    }
}

TagNode.prototype.collide = function(other) {
    let diff = other.graphic.position.subtract(this.graphic.position)
    let d = diff.length
    let min_d = TagNode.radius + TagNode.radius
    
    if (d < min_d) {
        this.graphic.position.set(other.graphic.position.add(diff.normalize().multiply(-min_d)))
    }
}

TagNode.prototype.move = function() {
    if (!this.frozen) {
        this.velocity = this.velocity.add(this.acceleration).multiply(TagNode.friction)
        this.graphic.position.set(this.graphic.position.add(this.velocity))
    }
    
    this.acceleration.set(0,0)
}
