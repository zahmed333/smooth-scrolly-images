var canvasWidth = window.innerWidth;
var canvasHeight = window.innerHeight;
var canvas = document.getElementById('canvas');

canvas.width = canvasWidth;
canvas.height = canvasHeight;

var ctx = canvas.getContext('2d'); 

var Rainbow = {
    a: 80,
    h: 150,
    alpha: 4 * Math.PI / 6,
    beta: Math.PI / 2.5,
    lasersCount: 200,
    maxIntersections: 200,
    showNormals: false,
    color: true,
    dynamicRefractiveIndex: true,
    refractiveIndex: 2
};

var Single = {
    a: 80,
    h: 150,
    alpha: 4 * Math.PI / 6,
    beta: Math.PI / 2.5,
    lasersCount: 1,
    maxIntersections: 200,
    showNormals: true,
    color: false,
    dynamicRefractiveIndex: false,
    refractiveIndex: 4
};

var Settings = Object.assign({}, Rainbow);


var Prism = function(options) {

    /*         a
    (x, y)* ---------- ---        |
        / alpha       \ beta      |
       /               \          |  h
      -----------------           | 
    */

    this.x = options.x;
    this.y = options.y;

    this.alpha = options.alpha;
    this.beta = options.beta;
    this.a = options.a;
    this.h = options.h;

    this.refractiveIndex = options.refractiveIndex;

    this.bottomLeftX = this.x + this.h / Math.tan(this.alpha);
    this.bottomLeftY = this.y + this.h;

    this.rightX = this.x + this.a;
    this.rightY = this.y;

    this.bottomRightX = this.rightX + this.h / Math.tan(this.beta);
    this.bottomRightY = this.rightY + this.h;

    this.lines = [
        {
            x: this.bottomLeftX,
            y: this.bottomLeftY,
            angle: Math.atan2(this.y - this.bottomLeftY, this.x - this.bottomLeftX),
            stopX: this.x,
            stopY: this.y            
        },
        {
            x: this.bottomRightX,
            y: this.bottomRightY,
            angle: Math.PI,
            stopX: this.bottomLeftX,
            stopY: this.bottomLeftY
        },
        {
            x: this.rightX,
            y: this.rightY,
            angle: this.beta,
            stopX: this.bottomRightX,
            stopY: this.bottomRightY
        },
        {
            x: this.x,
            y: this.y,
            angle: 0,
            stopX: this.rightX,
            stopY: this.rightY
        }
    ];      
};

Prism.prototype.render = function() {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(this.x), Math.round(this.y));
    ctx.lineTo(Math.round(this.rightX), Math.round(this.rightY));
    ctx.lineTo(Math.round(this.bottomRightX), Math.round(this.bottomRightY));
    ctx.lineTo(Math.round(this.bottomLeftX), Math.round(this.bottomLeftY));
    ctx.lineTo(Math.round(this.x), Math.round(this.y));
    ctx.stroke();
};

Prism.prototype.renderCollision = function(collision) {
    if (collision) {
        var sign = collision.internal ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(collision.x - sign * 25 * Math.sin(collision.line.angle)), Math.round(collision.y + sign *  25 * Math.cos(collision.line.angle)));
        ctx.lineTo(Math.round(collision.x + sign * 25 * Math.sin(collision.line.angle)), Math.round(collision.y - sign *  25 * Math.cos(collision.line.angle)));
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(Math.round(collision.x + sign *  25 * Math.sin(collision.line.angle)), Math.round(collision.y - sign * 25 * Math.cos(collision.line.angle)), 2, 0, 2 * Math.PI);
        ctx.stroke();
    }
};

Prism.prototype.getIntersectionWithLaser = function(laser) {
    return this.lines.map(function(line) {
        var t2 = ((line.y - laser.y) * Math.cos(line.angle) + (laser.x - line.x) * Math.sin(line.angle)) / Math.sin(laser.angle - line.angle);
        
        var x = laser.x + t2 * Math.cos(laser.angle);
        var y = laser.y + t2 * Math.sin(laser.angle);

        var internal = this.isPointIn(laser);

        return {
            x: x,
            y: y,
            fallAngle: -Math.atan2(Math.sin(-line.angle), Math.cos(-line.angle)) + Math.atan2(Math.cos(laser.angle), Math.sin(laser.angle)),  //Math.acos(Math.sin(-line.angle) * Math.cos(laser.angle) + Math.cos(-line.angle) * Math.sin(laser.angle)),
            line: line,
            laser: laser,
            internal: internal,
            t2: t2,
            distance: Math.sqrt((laser.x - x) * (laser.x - x) + (laser.y - y) * (laser.y - y))
        };
    }.bind(this));
};
    
Prism.prototype.isBetweenPoints = function(line, point) {
    return (line.x - point.x) * (line.stopX - point.x) < 0 || (line.y - point.y) * (line.stopY - point.y) < 0;
};

Prism.prototype.checkCollision = function(laser) {
    
    return this
        .getIntersectionWithLaser(laser)
        .filter(function(intersection) {
            return intersection.t2 > 0.1;
        })    
        .filter(function(result) {
            return this.isBetweenPoints(result.line, result);
        }.bind(this))
        .reduce(function(max, item) {
            return max ? (item.distance < max.distance ? item : max) : item;
        }.bind(this), undefined);
};


Prism.prototype.isPointIn = function(point) { 
    return this.lines.every(function(line) {
        var sign = (line.stopX - line.x) / Math.abs(line.stopX - line.x);
        
        if (Math.abs(point.y - (line.y + (point.x - line.x) * Math.tan(line.angle))) < 0.01) {
            return true;
        }

        if (sign > 0) {
            return point.y > (line.y + (point.x - line.x) * Math.tan(line.angle));    
        } else {
            return point.y < (line.y + (point.x - line.x) * Math.tan(line.angle));    
        }
        
    }.bind(this));
};

Prism.prototype.getReflectedAngle = function(laser, collision) {
    var refractedAngle;

    var refractiveIndex = function(laser) {
        if (Settings.dynamicRefractiveIndex) {
            return 0.3 * laser.len / (400) + 1;    
        } else {
            return this.refractiveIndex;
        };
    }.bind(this);

    if (this.isPointIn(laser) && this.isPointIn(collision)) {

        if (Math.abs(Math.sin(collision.fallAngle) * refractiveIndex(laser)) > 1) {
            refractedAngle = -collision.fallAngle;
            return collision.line.angle - Math.PI / 2 - refractedAngle; 
        }

        refractedAngle = Math.asin(Math.sin(collision.fallAngle) * refractiveIndex(laser));
        return -Math.PI / 2 + collision.line.angle + refractedAngle;
    } else {
        if (Math.sin(collision.fallAngle) > refractiveIndex(laser)) {
            refractedAngle = -collision.fallAngle;
            return collision.line.angle - Math.PI / 2 - refractedAngle; 
        }

        refractedAngle = Math.asin(Math.sin(collision.fallAngle) / refractiveIndex(laser));
    }

    return Math.PI / 2 + collision.line.angle - refractedAngle;
};

var Box = function() {
    Prism.call(this, {
        x: 0,
        y: 0,
        h: canvasHeight,
        a: canvasWidth,
        alpha: -Math.PI / 2,
        beta: Math.PI / 2
    });
};

Box.prototype = Prism.prototype;

var Laser = function(options) {
    this.x = options.x;
    this.y = options.y;

    this.angle = options.angle || -Math.PI / 3;
    this.len = options.len; 
};

// takes wavelength in nm and returns an rgba value
// This function code based on: http://scienceprimer.com/javascript-code-convert-light-wavelength-color
function wavelengthToColor(wavelength) {
    var r;
    var g;
    var b;
    var alpha;
    var colorSpace;
    var wl = wavelength;
    var gamma = 1;

    if (wl >= 380 && wl < 440) {
        R = -1 * (wl - 440) / (440 - 380);
        G = 0;
        B = 1;
    } else if (wl >= 440 && wl < 490) {
       R = 0;
       G = (wl - 440) / (490 - 440);
       B = 1;  
    } else if (wl >= 490 && wl < 510) {
        R = 0;
        G = 1;
        B = -1 * (wl - 510) / (510 - 490);
    } else if (wl >= 510 && wl < 580) {
        R = (wl - 510) / (580 - 510);
        G = 1;
        B = 0;
    } else if (wl >= 580 && wl < 645) {
        R = 1;
        G = -1 * (wl - 645) / (645 - 580);
        B = 0.0;
    } else if (wl >= 645 && wl <= 780) {
        R = 1;
        G = 0;
        B = 0;
    } else {
        R = 0;
        G = 0;
        B = 0;
    }

    // intensty is lower at the edges of the visible spectrum.
    if (wl > 780 || wl < 380) {
        alpha = 0;
    } else if (wl > 700) {
        alpha = (780 - wl) / (780 - 700);
    } else if (wl < 420) {
        alpha = (wl - 380) / (420 - 380);
    } else {
        alpha = 1;
    }

    return "rgba(" + Math.round(R * 255) + "," + Math.round(G * 255) + "," + Math.round(B * 255) + ", " + alpha + ")";
};    

Laser.prototype.render = function(collision) {
    ctx.strokeStyle = Settings.color ? wavelengthToColor(this.len) : '#fff';
    ctx.lineWidth = 1;

    if (Settings.showNormals) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, 2 * Math.PI);
        ctx.stroke();        
    }

    if (collision) {
        ctx.beginPath();
        ctx.moveTo(Math.round(this.x), Math.round(this.y));
        ctx.lineTo(Math.round(collision.x), Math.round(collision.y));
        ctx.stroke();       
    } else {
        ctx.beginPath();
        ctx.moveTo(Math.round(this.x), Math.round(this.y));
        ctx.lineTo( Math.round(this.x + 50 * Math.cos(this.angle)), Math.round(this.y + 50 * Math.sin(this.angle)));
        ctx.stroke();
    }
};

var prism;
var box;
var lasers = [];
var box;

var mouseX = 50;
var mouseY = canvasHeight / 2;

var initializeFromSettings = function() {
    prism = new Prism({
        x: canvasWidth / 2 - Settings.a /2,
        y: canvasHeight / 2 - Settings.h / 2,
        a: Settings.a,
        h: Settings.h,
        alpha: Settings.alpha,
        beta: Settings.beta,
        refractiveIndex: Settings.refractiveIndex
    });

    lasers = [];

    for (var i = 0; i < Settings.lasersCount; i++) {
        lasers.push(new Laser({
            x: mouseX,
            y: mouseY,
            angle: 2 * Math.PI,//Math.atan2(prism.y + Settings.h / 2 - mouseY, prism.x + Settings.a - mouseX),
            len: 380 + (780 - 380) * i / Settings.lasersCount 
        }));
    }

    box = new Box();
};


window.onload = function () {
    initializeFromSettings();

    var render = function() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        
        lasers.forEach(function(laser) {
            var nLaser = laser;

            var collision = prism.checkCollision(nLaser);

            var intersectionCount = 0;
            while (collision && intersectionCount < Settings.maxIntersections) {
                
                if (Settings.showNormals) {
                    prism.renderCollision(collision);
                }

                nLaser.render(collision);

                nLaser = new Laser({
                    x: collision.x,
                    y: collision.y,
                    angle: prism.getReflectedAngle(nLaser, collision),
                    len: nLaser.len
                });

                collision = prism.checkCollision(nLaser);
            
                intersectionCount++;
            }

            collision = box.checkCollision(nLaser);

            nLaser.render(collision);
            box.render(collision);
        });

        prism.render(); 

        ctx.beginPath();
        ctx.arc(Math.round(mouseX), Math.round(mouseY), 2, 0, 2 * Math.PI);
        ctx.stroke();
        drawText();
    };

    canvas.onmousemove = function(event) {
        lasers.forEach(function(laser) {
            laser.angle = Math.atan2(event.clientY - laser.y, event.clientX - laser.x);
        });

        render();
    }; 
    // Function to display an image on the canvas
    function displayImageOnCanvas(imageSrc) {
        var img = new Image(); // Create new img element
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Draw the image to the canvas
        };
        img.src = imageSrc; // Set source path
    }


    canvas.onclick = function(event) {
        lasers.forEach(function(laser) {
            laser.x = event.clientX;
            laser.y = event.clientY;
        });

        mouseX = event.clientX;
        mouseY = event.clientY;
       
        setTimeout(function() {
            displayImageOnCanvas('PRISM.png'); // Call to display image function after 7 seconds
        }, 7000);

        render();
    };

    window.onresize = function() {
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        initializeFromSettings();
        render();
    };


    var onChange = function(value) {
        initializeFromSettings();
        render();
    };

    var onRaysCountChange = function(value) {
        Settings.color = value !== 1;
        onChange();
    }

    var prismFolder = gui.addFolder('Prism');
    var raysFolder = gui.addFolder('Rays');

    raysFolder.add(Settings, 'lasersCount', 1, 3000).onFinishChange(onRaysCountChange);
    raysFolder.add(Settings, 'maxIntersections', 1, 200).step(10);

    prismFolder.add(Settings, 'a', 0, canvasWidth).onFinishChange(onChange);
    prismFolder.add(Settings, 'h', 0, canvasHeight / 2).onFinishChange(onChange);
    prismFolder.add(Settings, 'alpha', 0, Math.PI).step(Math.PI / 12).onFinishChange(onChange);
    prismFolder.add(Settings, 'beta', 0, Math.PI).step(Math.PI / 12).onFinishChange(onChange);



    render();
};
function drawText() {
    ctx.fillStyle = 'white'; // Set text color
    ctx.font = '24px Arial'; // Set font style and size
    ctx.textAlign = 'center'; // Align text to be centered
    ctx.fillText('click and WAIT for project PRISM to uhNveil', canvas.width / 2, 50); // Position and draw text
}