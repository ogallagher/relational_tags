/*

Owen Gallagher
2021-09-03

rt webapp visualizer

DEPENDENCIES

paperjs graphics library

rt_webapp/TagNode

*/

function Visualizer(rtags_object, jcanvas) {
    this.paper = new paper.PaperScope()
    this.paper.setup(jcanvas[0])
    this.view_dims = this.paper.view.size
    
    this.tag_nodes = []
    this.conn_lines = []
    
    let tag_map = new Map() // name -> tag
    let conn_tags = new Set() // connection src/target names
    let conn_objs = []
    
    for (let tag of rtags_object) {
        let tag_name = Object.keys(tag)[0]
        let tag_conns = tag[tag_name]
        
        let tag_node = new TagNode(this, tag_name, tag_conns)
        tag_map.set(tag_name, tag_node)
        this.tag_nodes.push(tag_node)
        
        for (let conn of tag_conns) {
            // conn = [source, type, target]
            let s_t = `${conn[0]}-${conn[2]}`
            let t_s = `${conn[2]}-${conn[0]}`
            if (!(conn_tags.has(s_t) || conn_tags.has(t_s))) {
                conn_tags.add(s_t)
                conn_tags.add(t_s)
                conn_objs.push({
                    source: conn[0],
                    type: conn[1],
                    target: conn[2]
                })
            }
        }
    }
    
    for (let conn_obj of conn_objs) {
        this.conn_lines.push(new ConnectionLine(this, {
            source: tag_map.get(conn_obj.source),
            type: conn_obj.type,
            target: tag_map.get(conn_obj.target)
        }))
    }
    
    this.paper.view.onFrame = (event) => {
        this.on_frame()
    }
}

Visualizer.gravity = 0.001

Visualizer.prototype.on_frame = function(event) {
    for (let i=0; i < this.tag_nodes.length; i++) {    
        for (let j=i+1; j < this.tag_nodes.length; j++) {
            this.tag_nodes[i].repel_bidirect(this.tag_nodes[j])
            this.tag_nodes[i].collide(this.tag_nodes[j])
        }
        
        this.tag_nodes[i].move()
    }
    
    for (let conn_line of this.conn_lines) {
        conn_line.source.attract_bidirect(conn_line.target, Visualizer.gravity)
        conn_line.move()
    }
}
