var zeroPad = function(num,length) {
    return ('00000000'+num).slice(-length);
}

var ImageBank = function() {
    var list = {};
    var loading = 0;
    function load(name,url) {
        var image = new Image();
        image.src = url;
        image.onload = function() {
            loading -= 1;
        };
        loading += 1;
        list[name] = image;
        return image;
    }
    function get(name) {
        return list[name];
    }
    return {
        load: load,
        get: get,
        ready: function() { return loading === 0; }
    };
};

var SoundBank = function() {
    var list = [];
    var handle = {};
    this.load = function(name,url) {
        list[name] = new Howl({
            urls: [url]
        });
    };
    this.play = function(name) {
        handle[name] = list[name].play();
        return handle[name];
    };
    this.stop = function(name) {
        if( handle[name] ) {
            handle[name].stop();
        }
    };
    this.stopAll = function(name) {
        for( var i in handle ) {
            handle[i].stop();
        }
    }
    return this;
}


var Ticker = function() {
    var handle = {};
    this.stop = function stop(name) {
        if( handle[name] ) {
            clearInterval(handle[name]);
        }
    }
    this.start = function(name,periodSec,fn) {
        stop(name);
        handle[name] = setInterval(fn,periodSec*1000);
        return handle[name];
    }
    return this;
}();

var Sequence = function(name,list) {
    var step = 0;
    function go() {
        if( list[step] ) {
            step = list[step]() || step+1;
            if( step === false ) {
                Ticker.stop(name);
                return;
            }
        }
        else {
            step += 1;
        }
    }
    Ticker.start(name,0.1,go);
}

var Internet = function() {
	var attempt = {};
	var counter = 0;

	function isEmpty(obj) {
	    for(var prop in obj) {
	        if(obj.hasOwnProperty(prop))
	            return false;
	    }
	    return true;
	}
	
	this.retry = function() {
		for( var handle in attempt ) {
			attempt[handle]();
		}
	}
	function clear(handle) {
		delete attempt[handle];
		if( isEmpty(attempt) ) {
			$('#internetDown').hide();
		}
	}
	function error(j, textStatus, errorThrown) {
		if( j.status == 0 ) {
			$('#internetDown').show();
		}
		else {
			alert(textStatus, errorThrown);
		}
	}
	this.ajax = function(_spec,callback) {
		var handle = counter++;
		var spec = $.extend(true,{},_spec);
		spec.timeout = 10*1000;
		spec.success = function(data) {
			clear(handle);
			callback(data);
		}
		spec.error = error;
		attempt[handle] = function() {
			$.ajax(spec);
		}
		attempt[handle]();
		return handle;
	}

	return this;
}


function Cell(x,y) {
    this.x=x;
    this.y=y;
}

function getCursorPosition(canvas,e,xSpan,ySpan,xLen,yLen) {
    var x;
    var y;
    if (e.pageX !== undefined && e.pageY !== undefined) {
        x = e.pageX;
        y = e.pageY;
    }
    else {
        x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;
    x = Math.min(x, xLen);
    y = Math.min(y, yLen);
    var cell = new Cell(Math.floor(x/xSpan), Math.floor(y/ySpan));
    return cell;
}

var NumScroll = function(n,targetFn) {
    return function(flag) {
        var t = targetFn();
        if( n !== t ) {
            n = (flag === false ? t : n);
            var r = Math.ceil(Math.abs(t-n)/10);
            n += Math.max(-r,Math.min(r,t-n));
        }
        return n;
    }
}

var Appear = function(list) {
    return function(flag) {
        if( list.length ) {
            var item = list.shift();
            return item;
        }
    };
}

// Animation
/*
To use, instantiate like this:
    animationList.scoreScroll = new Animation({
        rate: 5,
        tick: NumScroll(0,function() { return score; }),
        render: function(n) {
            $('.score').html(zeroPad4(n));
        }
    });

and when done, clean it up like this:
	animationList.scoreScroll.halt();

*/
var Animation = function(a) {
    var data = {};
	var handle = setInterval( function() {
        var n = a.tick(data);
        a.render(n);
        if( a.isComplete && a.isComplete(n,a) ) {
            a.complete();
        }
    }, 1000/a.rate);
    a.complete = function() {
        a.render(a.tick(false));
        if( a.next ) {
            a.next(a,data);
        }
        clearInterval(handle);
    }
    if( a.startNow ) { a.render(a.tick(data)); }
    return a;
}
