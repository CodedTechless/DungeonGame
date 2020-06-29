
/////////////////////////////////
//    ######~ MISC ~######     //
/////////////////////////////////

function clamp(x,a,b) {
    return Math.min(Math.max(x,a),b);
}
/* clamp function from: 
   https://codepen.io/tomhodgins/post/number-clamps-in-javascript*/

function approach(val,amount) {
	if (val < 0) {
		val += amount
		
		val = Math.min(val,0)
	} else if (val > 0) {
		val -= amount
		
		val = Math.max(val,0)
	}
	
	return val
}

function getMousePos(event) {
    var bounds = Game.canvas.getBoundingClientRect();

    var mousePos = {
        x : Math.ceil(clamp(event.clientX,bounds.left,bounds.right) - bounds.left),
        y : Math.ceil(clamp(event.clientY,bounds.top,bounds.bottom) - bounds.top)
    }

    return mousePos;
}

/////////////////////////////////
//   ######~ CLASSES ~######   //
/////////////////////////////////

class AssetManager {
    constructor() {
        this.Queue = [];
        this.Cache = [];
    }

    AssetForceDownloadAll() {
        return new Promise((resolve,reject) => {
            if (this.Queue.length === 0) {
                reject("asset queue was empty")
            }
            
            var Successes = 0;
            var Failures = 0;
            var QueueLength = this.Queue.Length

            var QueueFinished = () => {
                if (Successes + Failures == QueueLength) {
                    resolve({Successes : Successes,Failures : Failures})
                }
            }

            for (var x in this.Queue) {
                // all of the assets in the queue will be downloaded here
                var Path = this.Queue.pop()
                var Img = new Image()
                
                var that = this
                Img.addEventListener("load",() => {
                    Successes++
                    console.log(`Downloaded ${Path}`)
                    QueueFinished()
                })

                Img.addEventListener("error",() => {
                    Failures++
                    console.log(`Download failed for ${Path}, placed it back in the queue.`)
                    that.AssetPush(Path);
                    QueueFinished()
                })

                Img.src = Path
                this.Cache[Path] = Img
            }
        })
    }

    AssetPush(Path) {
        this.Queue.push(Path)
        console.log(`Added ${Path} to asset download queue.`)
    }

    AssetGet(Path) {
        return (this.Cache[Path])
    }

    AssetExists(Path) {
        return (this.Cache[Path] != undefined)
    }
}

var AssetHandler = new AssetManager()

class entity {
    constructor(x = 0, y = 0,id,_create,_step,_draw) {
        this.x = x;
        this.y = y;
        this.id = id;

        this.create = _create;
        this.step = _step;
        this.draw = _draw;

        _create(this)
    }
}

class block {
    constructor(x = 0, y = 0,imageId,_properties = {}) {
        this.x = x;
        this.y = y;

        this.properties = {
            imageId : imageId,

            width  : 32,
            height : 32,
            tilesX : 1,
            tilesY : 1,

            canCollide : false // for the future
        }// default properties

        if (_properties != undefined) {
            for (var property in _properties) {
                this.properties[property] = _properties[property]
            } 
        }
    }

    draw() {
        let ctx = Game.context
        ctx.fillStyle = "#ff0000";

        var ScreenPosition = WorldToScreenPosition(this.x,this.y)
        var ScreenScale = WorldToScreenSize(this.properties.width,this.properties.height)
        
        for (var iX = 0; iX < this.properties.tilesX;iX++) {
            for (var iY = 0; iY < this.properties.tilesY;iY++) {
                ctx.fillRect(ScreenPosition.x + (ScreenScale.w * iX),ScreenPosition.y + (ScreenScale.h * iY),ScreenScale.w,ScreenScale.h)
            }
        }
    }
}

//////////////////////////////////
//    ######~ CAMERA ~######    //
//////////////////////////////////

function WorldToScreenPosition(xWorld = 0, yWorld = 0) {
    var Camera = Game.camera

    var WidthScale = Camera.scale.w / Camera.scale.default.w 
    var HeightScale = Camera.scale.h / Camera.scale.default.h

    var xScreen = (xWorld - (Camera.position.x + (Camera.offset.x * (1/WidthScale)))) * WidthScale
    var yScreen = (yWorld - (Camera.position.y + (Camera.offset.y * (1/HeightScale)))) * HeightScale

    return {
        x: xScreen,
        y: yScreen
    }
}

function WorldToScreenSize(wWorld = 0, hWorld = 0) {
    var Camera = Game.camera

    var WidthScale = Camera.scale.w / Camera.scale.default.w 
    var HeightScale = Camera.scale.h / Camera.scale.default.h

    var wScreen = wWorld * WidthScale
    var hScreen = hWorld * HeightScale

    return {
        w: wScreen,
        h: hScreen
    }
}

////////////////////////////////
//    ######~ CORE ~######    //
////////////////////////////////

var Game = {
    initialize : function() {
        this.canvas = document.createElement("canvas") // creating the canvas as an object so it's easier to get/manipulate

        this.canvas.width = 1280;
        this.canvas.height = 720; // default 720p resolution

        this.context = this.canvas.getContext("2d"); // ensuring that any part of the script can get the context without having to spam getContext

        document.body.insertBefore(this.canvas,document.body.childNodes[0]) // inserts it *before* the script element (so its the first element on the webpage)
        
        // activates the step loop
        this.secUpdate = setInterval(second_loop,1000)

        draw_loop()
        step_loop()

        // #### INPUT #### \\

        document.addEventListener('keydown',(keyevent) => {
            const keyName = keyevent.key // gets the keys name

            if (this.input.keys[keyName] == undefined) {
                this.input.keys[keyName] = 0 // 0 means that it's been pressed this frame
            }
        })

        document.addEventListener("keyup",(keyevent) => {
            const keyName = keyevent.key

            this.input.keys[keyName] = 2 // 2 means released
        })

		document.addEventListener('mousemove', (mouseevent) => {
            mousePos = getMousePos(mouseevent);
            
            this.input.mouse.position = mousePos;
        });
        
        document.addEventListener("mouseup",(mouseevent) => {
            this.input.mouse.states[mouseevent.button] = 2 // mouse has been released
        })

        document.addEventListener("mousedown",(mouseevent) => {
            this.input.mouse.states[mouseevent.button] = 0 // mouse has been pressed
        })

        this.events.start()
    },

    input : {
        keys : {},
        mouse : {
            position : {x : 0, y : 0}, // the x and y coordinates on the screen
            states : {}
        },

        MousePressed : function(buttonId) {return Game.input.mouse.states[buttonId] == 0},
        MouseReleased : function(buttonId) {return Game.input.mouse.states[buttonId] == 2},
        MouseHeld : function(buttonId) {return Game.input.mouse.states[buttonId] != undefined},

        KeyPressed : function(keyId) {return Game.input.keys[keyId] == 0},
        KeyReleased : function(keyId) {return Game.input.keys[keyId] == 2},
        KeyHeld : function(keyId) {return Game.input.keys[keyId] != undefined}
    },

    EntityCreate : function(x = 0, y = 0, id = "ent_dummy") {
        let ent

        switch(id) {
            case "ent_dummy" : 
                ent = new entity(x,y,id,
                    (self) => {
                                             
                    },
                    (self) => {
                        
                    },
                    (self) => {
                        let ctx = Game.context
                        ctx.fillStyle = "#00ff00";

                        var ScreenPosition = WorldToScreenPosition(self.x,self.y)
                        var ScreenScale = WorldToScreenSize(32,32)
                        ctx.fillRect(ScreenPosition.x,ScreenPosition.y,ScreenScale.w,ScreenScale.h)
                    }
                );break;
            case "ent_player" : 
                ent = new entity(x,y,id,
                    (self) => { 
                        // ######################
                        // #### create event ####
                        // ######################

                        self.hsp = 0; // horizontal speed
                        self.vsp = 0; // vertical speed

                        self.MoveAccel = 1; // movement acceleration
                        self.MoveSpeedMax = 4;
                        self.MoveFric = 3; // movement friction

                        Game.camera.subject = self
                    },
                    (self) => {
                        // ####################
                        // #### step event ####
                        // ####################
                        
                        var keyUp = Game.input.KeyHeld("w")
                        var keyDown = Game.input.KeyHeld("s")
                        var keyLeft = Game.input.KeyHeld("a")
                        var keyRight = Game.input.KeyHeld("d")
                        
                        var moveH = keyRight - keyLeft
                        var moveV = keyDown - keyUp

                        if (moveH == 0) {self.hsp = approach(self.hsp,self.MoveAccel)}
                        if (moveV == 0) {self.vsp = approach(self.vsp,self.MoveAccel)}
                
                        self.hsp += self.MoveAccel * moveH
                        self.vsp += self.MoveAccel * moveV

                        self.hsp = clamp(self.hsp,-self.MoveSpeedMax,self.MoveSpeedMax) 
                        self.vsp = clamp(self.vsp,-self.MoveSpeedMax,self.MoveSpeedMax)
                        
                        self.x += self.hsp
                        self.y += self.vsp
                    },
                    (self) => { 
                        // ####################
                        // #### draw event ####
                        // ####################
                        let ctx = Game.context
                        ctx.fillStyle = "#00ff00";
                        
                        var ScreenPosition = WorldToScreenPosition(self.x,self.y)
                        var ScreenScale = WorldToScreenSize(32,32)
                        ctx.fillRect(ScreenPosition.x,ScreenPosition.y,ScreenScale.w,ScreenScale.h)
                    }
                );break;
        }



        Game.entities.push(ent)
        return ent;
    },

    BlockCreate : function(x, y, imageId,_properties) {
        let blk = new block(x,y,imageId,_properties)
        
        Game.blocks.push(blk)
        return blk
    },

    camera : {
        subject : null,
        position : {
            x   : 0, y   : 0,
            xTo : 0, yTo : 0,
            smoothen : 5
        },

        offset : {x : -624, y : -344},

        scale : {
            default : {w : 1280,h : 720},
            
            w   : 1280,h   : 720,
            
            zoomLevel : 1,
            zoomLevelTo : 0.8,

            smoothen : 5
        }
    },

    entities : [],
    blocks : [],

    events : {
        start: function() {
            Game.EntityCreate(0,0,"ent_dummy")
            Game.EntityCreate(0,0,"ent_player")
            Game.BlockCreate(64,64,"",{tilesX : 5})
        },
        draw : function() {

        },
        step : function() {
            if (Game.camera.subject) {
                Game.camera.position.xTo = Game.camera.subject.x
                Game.camera.position.yTo = Game.camera.subject.y

                Game.camera.position.x += (Game.camera.position.xTo - Game.camera.position.x) / Game.camera.position.smoothen
                Game.camera.position.y += (Game.camera.position.yTo - Game.camera.position.y) / Game.camera.position.smoothen

                Game.camera.scale.zoomLevel += ((1/Game.camera.scale.zoomLevelTo) - Game.camera.scale.zoomLevel) / Game.camera.scale.smoothen

                Game.camera.scale.w = Game.camera.scale.default.w * Game.camera.scale.zoomLevel
                Game.camera.scale.h = Game.camera.scale.default.h * Game.camera.scale.zoomLevel

                
            }
        },
        endstep : function() {
            var k = Object.entries(Game.input.keys)
            // keys returns an array with the key name in the first element and the state in the second

            if (k.length > 0) {
                for (var key of k) {
                    let keyName = key[0]
                    let state = key[1]
                    
                    if (state == 2) {
                        Game.input.keys[keyName] = undefined;
                    } else if (state == 0) {
                        Game.input.keys[keyName] = 1; // 1 means held
                    }
                }
            }

            var m = Object.entries(Game.input.mouse.states)
            for (var button of m) {
                let buttonName = button[0]
                let state = button[1]
                
                if (state == 0) {
                    Game.input.mouse.states[buttonName] = 1 // mouse is being held
                } else if (state == 2) {
                    Game.input.mouse.states[buttonName] = undefined // mouse is no longer active
                }
            }
        }
    }
}

var RedrawsPerSecond = 0
var StepsPerSecond = 0
var AverageRedrawsPerSecond = 0
var AverageStepsPerSecond = 0
var TotalRuntime = 0

function step_loop() {
    // steps through all of the entities

    Game.events.step()

    for (let i in Game.entities) {
        var entity = Game.entities[i]

        entity.step(entity)
    }
    // "this" is defined by invocation so i hve to pass in the entity

    Game.events.endstep()

    StepsPerSecond++

    setTimeout(step_loop,1000/60)
}

function draw_loop() {

    // clears the screen ready for the next animation frame to be drawn
    var ctx = Game.context

    ctx.clearRect(0,0,Game.canvas.width,Game.canvas.height)
    ctx.fillStyle = "#000000"
    ctx.fillRect(0,0,Game.canvas.width,Game.canvas.height)

    // draws all the blocks in the world
    for (let b in Game.blocks) {
        var block = Game.blocks[b]

        block.draw()
    }

    // draws all the entities in the world
    for (let i in Game.entities) {
        var entity = Game.entities[i]

        entity.draw(entity)
    }

    RedrawsPerSecond++

    // waits for the next frame
    window.requestAnimationFrame(draw_loop)
}

function second_loop() {
    // https://math.stackexchange.com/questions/22348/how-to-add-and-subtract-values-from-an-average
    TotalRuntime++

    AverageRedrawsPerSecond = AverageRedrawsPerSecond + (RedrawsPerSecond - AverageRedrawsPerSecond)/TotalRuntime
    AverageStepsPerSecond = AverageStepsPerSecond + (StepsPerSecond - AverageStepsPerSecond)/TotalRuntime

    console.log(`\nRedraws Last Frame : ${RedrawsPerSecond.toString()} (Average : ${Math.floor(AverageRedrawsPerSecond*100)/100})\nStep Last Frame    : ${StepsPerSecond.toString()} (Average : ${Math.floor(AverageStepsPerSecond*100)/100})`)

    RedrawsPerSecond = 0
    StepsPerSecond = 0
}

Game.initialize()

