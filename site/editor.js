var Editor = function() {
	var active = false;
	var curTile = null;
	var layout = null;
	function start() {
		$('.editor').show();
		Ticker.start("editorDraw",0.1,draw);
		layout = level.getLayout();
		board = new Board(layout);
		active = true;
	}
	function stop() {
		$('.editor').hide();
		Ticker.stop("editorDraw");
		active = false;
		level.restart();
	}
	function draw() {
		if( screen != 'game' ) { return; }
		$('.editor img').attr('src',(curTile || tile.empty).image.src);
	}
	this.isActive = function() {
		return !!active;
	}
	this.showLevelCode = function() {
		if( !$('.editor-layout').is(':visible') ) {
			var s = 'toLayout([\n';
			for( var y=0 ; y<layout.length ; y++ ) {
				s += '\t"';
				for( var x=0 ; x<layout[y].length ; x++ ) {
					s += tileByIndex[layout[y][x]].letter;
				}
				s += '"'+(y<layout.length-1 ? ',' : '')+'\n';
			}
			s += '])\n';
			$('.editor-layout').text(s).show();
		}
		else {
			$('.editor-layout').hide();
		}
	}
	
	$(document).on("keydown",function(e) {
		if( screen != 'game' ) { return; }
		if( e.keyCode == 69 /* e */ ) {
			if( active ) stop(); else start();
		}
		if( active ) {
			var numKey = e.keyCode - 48;
			if( numKey >= 0 && numKey <= 9 ) {
				curTile = tileByIndex[numKey] || curTile;
			}
		}
	});
	
	$(canvas).on("click", function(e) {
		if( !active || screen != 'game' ) { return; }

		var cell = getCursorPosition(canvas,e,76,76,76*10,76*10);
		board.set(cell.x,cell.y,(curTile || tile.empty).index);
		layout[cell.y][cell.x] = (curTile || tile.empty).index;
		$('.editor-layout').hide();
		e.stopPropagation();
		return false;
	});

	return this;
	
}
