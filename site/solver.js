var Solver = function(selector) {
	var dir = [[0,-1],[1,0],[0,1],[-1,0]];
	var paused = true;
	
	function legal(map,x,y,count) {
		if( !(x>=0 && x<=9 && y>=0 && y<=9) ) {
			return false;
		}
		var n = map[y][x];
		return n!=tile.empty.index && n!=tile.start.index && (count==0 || n!=tile.end.index);
	}

	function blank(map,x,y) {
		if( !(x>=0 && x<=9 && y>=0 && y<=9) ) {
			return false;
		}
		var n = map[y][x];
		return n==tile.empty.index;
	}
	
	function rand(max) {
	    return Math.floor(Math.random() * max);
	}
	
	function solverMove(tx,ty) {
		var lastX = player.x;
		var lastY = player.y;
		player.x = tx;
		player.y = ty;
		var c = level.complete;
		level.complete = function() {
			//level.nextLevel();
			paused = true;
			$("#gameNextLevel").show();
		}
		move(lastX,lastY);
		level.complete = c;
	}

	
	function pick(x,y) {
		var choices = [];
		for( var i=0 ; i<dir.length ; ++i ) {
			if( legal(board.getLayout(),x+dir[i][0],y+dir[i][1]) ) {
				choices.push(i);
			}
		}
		if( choices.length == 0 ) {
			level.restart();
			return;
		}
		var d = choices[ rand(choices.length) ];
		delete choices;
		return d;
	}
	
	function wander() {
		var d = pick(player.x,player.y);
		solverMove(player.x+dir[d][0], player.y+dir[d][1])
	}
	
// =========================
// ====== START SLOW =======
// =========================

	function solve(layoutRaw) {
		var map = $.extend(true, [], layoutRaw);
		
		function moveAdd(x,y,m,g) {
			// We do it this way to avoid garbage collecting.
			moves[mLen] = x;
			moves[mLen+1] = y;
			moves[mLen+2] = m;
			moves[mLen+3] = g;
			mLen += 4;
		}
		
		function stepTo(x,y,dx,dy) {
			x += dx;
			y += dy;
			var m = map[y][x];
			var t = m;
			moveAdd(x,y,m,false);
			if( m == tile.bridge.index ) {
				var extra = [];
				var bx = x+dx;
				var by = y+dy;
				while( blank(map,bx,by) ) {
					moveAdd(bx,by,map[by][bx],true);
					map[by][bx] = tile.redMint.index;
					count += 1;
					bx += dx;
					by += dy;
				}
			}
			if(m==tile.redMint.index || m==tile.special.index || m==tile.bridge.index ) {
				t = tile.empty.index;
				count -= 1;
			}
			if(m==tile.greenMint.index) {
				t = tile.redMint.index;
				count -= 1;
			}
			map[y][x] = t;
			solved = t == tile.end.index;
		}
		
		function step(x,y) {
			plies += 1;
// for debugging
//				context.clearRect(0, 0, canvas.width, canvas.height);
//				board.draw(map);
			if( !solved && legal(map,x,y-1,count) ) {
				stepTo(x,y,0,-1);
				step(x,y-1);
			}
			if( !solved && legal(map,x+1,y,count) ) {
				stepTo(x,y,1,0);
				step(x+1,y);
			}
			if( !solved && legal(map,x,y+1,count) ) {
				stepTo(x,y,0,1);
				step(x,y+1);
			}
			if( !solved && legal(map,x-1,y,count) ) {
				stepTo(x,y,-1,0);
				step(x-1,y);
			}
			if( !solved ) {
				if( mLen == 0 ) {
					solved = true;
					failed = true;
					return;
				}
				function undo(x,y,m) {
					map[y][x] = m;
					if(m==tile.redMint.index || m==tile.special.index || m==tile.bridge.index ) {
						count += 1;
					}
					if(m==tile.greenMint.index) {
						count += 1;
					}
					if(m==tile.empty.index) {
						// HACK! The only time you restore blank is undoing a bridge...
						count -= 1;
					}
				}
				var group = true;
				while( group ) {
					undo( moves[mLen-4], moves[mLen-3], moves[mLen-2] );
					group = moves[mLen-1];
					mLen -= 4;
				}
			}
		}
	}
		
// ===== END SLOW ==============
		
// =========================
// ===== OPTIMIZED =========
// =========================

	function solveOpt(layoutRaw) {
		var map = $.extend(true, [], layoutRaw);
		var fmap = [];
		for( var fy=0 ; fy<10 ; ++fy ) {
			for( var fx=0 ; fx<10 ; ++fx ) {
				fmap[fy*10+fx] = map[fy][fx];
			}
		}

		function legal(x,y) {
			if( x<0 || x>9 || y<0 || y>9 ) {
				return false;
			}
			var n = fmap[y*10+x];
			return n!=0 && n!=1 && (count==0 || n!=2);
		}
		
		function legalFast(x,y) {
			var n = fmap[y*10+x];
			return n!=0 && n!=1 && (count==0 || n!=2);
		}
	
		function blank(x,y) {
			if( x<0 || x>9 || y<0 || y>9 ) {
				return false;
			}
			return fmap[y*10+x] == 0;
		}


		function stepTo(x,y,dx,dy) {
			x += dx;
			y += dy;
			var m = fmap[y*10+x];
			var t = m;
			
			///moveAdd(x,y,m,false);
			moves[mLen++] = x;
			moves[mLen++] = y;
			moves[mLen++] = m;
			moves[mLen++] = false;

			if( m == tile.bridge.index ) {
				var extra = [];
				var bx = x+dx;
				var by = y+dy;
				while( blank(bx,by) ) {
					///moveAdd(bx,by,map[by][bx],true);
					moves[mLen++] = bx;
					moves[mLen++] = by;
					moves[mLen++] = fmap[by*10+bx];
					moves[mLen++] = true;

					fmap[by*10+bx] = tile.redMint.index;
					count += 1;
					bx += dx;
					by += dy;
				}
			}
			if(m==3 || m==5 || m==6 ) {
				t = 0;
				count -= 1;
			}
			if(m==4) {
				t = 3;
				count -= 1;
			}
			fmap[y*10+x] = t;
			solved = t == 2;
		}
		
		function step(x,y) {
			plies += 1;
// for debugging
//				context.clearRect(0, 0, canvas.width, canvas.height);
//				board.draw(map);
			if( solved ) return;
			//var legalFn = ( x>0 && x<9 && y>0 && y<9 ) ? legalFast : legal;
			if( legal(x,y-1) ) {
				stepTo(x,y,0,-1);
				step(x,y-1);
			}
			if( solved ) return;
			if( legal(x+1,y) ) {
				stepTo(x,y,1,0);
				step(x+1,y);
			}
			if( solved ) return;
			if( legal(x,y+1) ) {
				stepTo(x,y,0,1);
				step(x,y+1);
			}
			if( solved ) return;
			if( legal(x-1,y) ) {
				stepTo(x,y,-1,0);
				step(x-1,y);
			}
			if( solved ) return;
			if( mLen == 0 ) {
				solved = true;
				failed = true;
				return;
			}
			var group = true;
			while( group ) {
				group = moves[--mLen];
				var m = moves[--mLen];
				var y = moves[--mLen];
				var x = moves[--mLen];
				fmap[y*10+x] = m;
				if(m>=3 && m<=6 ) {
					count += 1;
				}
				if(m==0) {
					count -= 1;
				}
			}
		}

// ====== END OPTIMIZED ===========

		function tileCount() {
			var c = 0;
			for( var y=0 ; y<10 ; ++y ) {
				for( var x=0 ; x<10 ; ++x ) {
					var m = map[y][x];
					if(m==tile.redMint.index || m==tile.special.index || m==tile.bridge.index ) c += 1;
					if(m==tile.greenMint.index) c += 2;
				}
			}
			return c;
		}
		
		var plies = 0;
		var x = board.startX;
		var y = board.startY;
		var solved = false;
		var failed = false;
		var moves = new Array(1000*4);
		var mLen = 0;
		var count = tileCount();
		step(x,y);
		
		var final = [];
		if( failed ) {
			alert('No solution after '+plies+' plies');
			paused = true;
		}
		else {
			for( var i=0 ; i<mLen ; i+=4 ) {
				if( moves[i+3] ) continue;	// skip grouped operations
				final.push( { x:moves[i], y:moves[i+1], m:moves[i+2] } );
			}
		}
		return {
			moves: final,
			plies: plies
		};
	}
	
	function nextStep(solution) {
		if( !solution || !solution.length ) return;
		var m = solution.shift();
		solverMove(m.x,m.y);
	}
	
	var solution = null;
	var running = false;
	this.togglePause = function() {
		paused = !paused;
		running = false;
		if( !paused ) {
			$(selector).html('solving...');
			setTimeout(function() {
				var timeStartMilli = (new Date()).getTime();
				var r = solveOpt(level.getLayout());
				solution = r.moves;
				var t = ((new Date()).getTime() - timeStartMilli) / 1000;
				$(selector).html(r.plies+' plies in '+t+'.<br />Click to Run.').on('click',function() {
					running = true;
				});
			},10);
		}
	}
	
	this.reset = function() {
		paused = true;
		solution = null;
		running = false;
		$(selector).html('');
	}
	
	this.tick = function() {
		if( paused ) {
			return;
		}
		//wander();
		if( running ) {
			nextStep(solution);
		}
		if( board.get(player.x,player.y) == tile.end.index ) {
			paused = true;
			running = false;
		}
	}
	
	return this;
}
