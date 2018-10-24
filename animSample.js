<html>
<head>
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css">
<!-- link rel="stylesheet" type="text/css" href="reset.css" -->
<style>
	html {
		overflow:hidden;
	}
	body {
		font-family: sans-serif;
		background-image: url("image/waterBackground.jpg");
	}
	.candyButton {
		width: 81px;
		height: 81px;
		background-image: url("image/redCandy.png");
		background-size: 76px;
		background-repeat: no-repeat;
		font-size: 20px;
		top: 0px;
	}
	.candyButton img {
		display: inline-block;
		width: 50px;
		height: 50px;
	}
	#levelSelect .candyButton {
		font-size: 50px;
	}
	.layer {
		position: absolute;
		top:0px;
		left:0px;
		width:100%;
		height:100%;
	}
	.startHidden {
		display: none;
	}
	.centered {
		margin:auto;
	}
	.panel {
		vertical-align: top;
		display: inline-block;
	}
	#game canvas {
		display: block;
	}
	#game .levelNumber{
	    font-size: 40px;
	}
	.scoreBig {
		font-size: 76px;
	}
	#levelComplete {
		z-index:100;
	}
	.whiteBox {
		width: 700px;
		margin: auto;
		margin-top: 50px;
		text-align: center;
		background-color:white;
	}
	.heading {
		font-size: 80px;
	}
	#levelComplete .collected {
		margin: auto;
	}
	#levelComplete .collected span {
		display: inline-block;
		background-color: blue;
		width: 50px;
		height: 50px;
	}
	#levelComplete .collected img {
		display: inline-block;
		width: 100px;
	}
	.candyButton img.levelListStar {
	    height: 20px;
	    width: 20px;
	}
	.candyButton img.levelListLock {
	    height: 30px;
	    width: 30px;
	}
	.levelListNum {
	    font-size: 40px;
	}
    
</style>
<script src="https://code.jquery.com/jquery-2.1.4.js">
</script>
<script src="utility.js">
</script>
<script src="howler.js">
</script>
<script src="levels.js">
</script>
<script>

	var canvas;
	var context;
	var imageBank;
	var soundBank;
	var candySize = 70;
	var player;
	var screen = "game";
	var level;
	var board;
	var animation = {};
	var tile = {
	    empty: { index: 0, name: "empty"},
	    start: { index: 1, name: "start"},
	    end: { index: 2, name: "end", points: 100},
	    redMint: { index: 3, name: "red mint", points: 10},
	    greenMint: { index: 4, name: "green mint", points: 20},
	    special: { index: 5, name: "special", points: 50},
	    bridge: { index: 6, name: "bridge", points: 30}
	}
	var tileByIndex = [];
	for( var i in tile ) {
	    tileByIndex[tile[i].index] = tile[i];
	}

	function readCookie(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for( var i = 0; i < ca.length; i++ ) {
			var c = ca[i];
			while( c.charAt(0) == ' ' ) c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) == 0) return unescape( c.substring(nameEQ.length, c.length) );
		}
		return null;
	}


	var Board = function(layoutRaw){
		var layout = $.extend(true, [], layoutRaw);
		//deep copyer of layoutRaw http://stackoverflow.com/questions/565430/deep-copying-an-array-using-jquery
		this.startX = 0;
		this.startY = 0;
		var get = this.get = function (x,y){
			return layout[y][x];
		}
		var getTile = this.getTile = function (x,y){
			return tileByIndex[ layout[y][x] ];
		}
		var set = this.set = function(x,y,newValue){
			layout[y][x] = newValue
		}
        
        this.makeBridge = function(x, y, dX, dY){
            
            function onBoard(x, y){
			    return x >= 0 && y >= 0 && x <= 9 && y <= 9;
            }
            function isEmpty(x, y){
                return get(x, y) == tile.empty.index;
            }
            while(onBoard(x + dX, y + dY) && isEmpty(x + dX, y + dY)){
                x += dX;
                y += dY;
                set(x,y,tile.redMint.index);
                soundBank.play("buttonHit");
                //hack for touching global
                level.upMax(tile.redMint.points);
            }
        }

		this.init = function (){
			for(var mintY = 0; mintY < 10; mintY ++){

				for(var mintX = 0; mintX < 10; mintX ++){
					if(layout[mintY][mintX] == 1){
						this.startX = mintX;
						this.startY = mintY;
					}
				}
			}
		}
		this.findMax = function(){
			var max = 0;
			for(var mintY = 0; mintY < 10; mintY ++){
				for(var mintX = 0; mintX < 10; mintX ++){
				    max += getTile(mintX,mintY).points || 0;
				}
			}
			return max;
		}
		this.draw = function(){

			for(var mintY = 0; mintY < 10; mintY ++){

				for(var mintX = 0; mintX < 10; mintX ++){
				    var tile = getTile(mintX, mintY);
				    if( tile === undefined ) {
				        continue;
				    }
				    context.drawImage(tile.image,mintX * 76,mintY * 76,candySize,candySize)
				}
			}
		}
        
		return this;
	};
	
	var Level = function(){
		var levelNumber;
		var score = 0;
		var scoreMax = undefined;

		this.scoreAdd = function(amount){
			score += amount;
		}

		var tick = function(){
			context.clearRect(0, 0, canvas.width, canvas.height);
			board.draw();
			player.draw();
			$("#game .scoreMax").html(zeroPad(scoreMax,4));
			$("#game .levelNumber").html("Level "+(levelNumber+1))
		}

		this.select = function(){
			var x = 0;
			var y = 0;
            
            shutDown();
            
			$('#levelSelect').show();
			$('#titleScreen').hide();
			$('#game').hide();
			$('#levelComplete').hide();

			screen = "levelSelect";
			var drawLevelList = function(progressList){
			    var html = "";
    			for (i = 0; i < layoutList.length; i += 1){
    			    var progress = progressList[i];
    				if(i == 0) {
    				    progress = progress || { stars: 0 };
    				}
    				var isUnlocked = readCookie('isUnlocked') == 1 || readCookie('isAdmin') == 1;
    				
    				var playerMayEnterLevel = (progress !== undefined && progress !== null) || isUnlocked;
    				if( playerMayEnterLevel )
        				html += '<button class="candyButton" onClick="javascript: $(\'#levelSelect\').hide(); level.start('+i+');">';
        			else
        				html += '<button class="candyButton">';
    				html += "<div class='levelListNum'>"
    				html += (i + 1)
    				html += '</div>'
    				html += '<div>'
    				if(progress !== undefined && progress !== null){
        				for(j = 0 ; j < 3 ; j ++) {
            				if((j + 1) > progress.stars){
            				    html += "<img class='levelListStar' src='image/starDarkened.png'>";
            				}
            				else {
            					html += "<img class='levelListStar' src='image/star.png'>";
            				}
            			}
    				}
    				else {
    				    if( !isUnlocked ) {
        				    html += "<img class='levelListStar' src='image/lockedLevel.png'>";
    				    }
    				    else {
    				        html += "<span style='font-size:9px; font-weight:bold;'>ALLOWED</span>";
    				    }
    				}
    				html += '</div>'
    				html += '</button>'
    
    			}
    			$(".levelList").html(html);
			}
			progressGet(drawLevelList);
		}

		this.onLastLevel = function(){
			return levelNumber >= layoutList.length - 1;
		}

		this.nextLevel = function(){
			this.start(levelNumber + 1);
		}

		this.restart = function(){
			shutDown();
			this.start(levelNumber);
		}

		this.start = function(newLevelNumber){
			screen = "game";
			levelNumber = newLevelNumber;
			if (levelNumber<0 || levelNumber>=layoutList.length){
				alert("this level "+levelNumber+" does not exist")
			}
			board = new Board(layoutList[levelNumber]);
			board.init();
			score = 0;
			scoreMax = board.findMax();
			player = new Player(board.startX, board.startY);
			$("#game").show();
			$(document).on("keydown",gameControls);
			Ticker.start("tick",0.05,tick);
			animation.scoreScroll = new Animation({
                rate: 20,
                tick: NumScroll(0,function() { return score; }),
                render: function(n) {
                    $('#game .score').html(zeroPad(n,4));
                }
            });
		}

		var shutDown = function(){
			$(document).unbind("keydown");
			Ticker.stop("tick");
		}

		this.complete = function(){
			tick();
			animation.scoreScroll.complete();
			var starMax = 3;
			var stars = Math.floor((score/scoreMax)*starMax);
			progressSave(levelNumber, score, stars, function (result){
			    //alert(result);
			});

			shutDown();
			$("#levelComplete").show();

			$("#levelComplete .collected").html("");

            var starList = [];
			for(j = 0 ; j < 3 ; j ++) {
				if((j + 1) > stars){
					starList.push("<img src='image/starDarkened.png'>");
				}
				else {
					starList.push("<img src='image/star.png'>");
				}
			}
			if(stars == 0){
				soundBank.play("levelComplete0")
			};
			if(stars == 1){
				soundBank.play("levelComplete1")
			};
			if(stars == 2){
				soundBank.play("levelComplete2")
			};
			if(stars == 3){
				soundBank.play("levelComplete3")
			};
			$("#levelComplete #buttonNextLevel").toggle(!this.onLastLevel() && stars != 0);
			$("#levelComplete #buttonEndGame").toggle(this.onLastLevel() && stars != 0);
			$("#levelComplete #buttonLockedNext").toggle(stars == 0);
			
			function animateStars() {
    			new Animation({
                    rate: 1,
                    tick: Appear(starList),
                    render: function(item) {
        			    $("#levelComplete .collected").append(item);
                    },
                    isComplete: function(item) { return !item; }
                });
			}
			
			new Animation({
                rate: 20,
                tick: NumScroll(0,function() { return score; }),
                render: function(n) {
    			    $("#levelComplete .scoreBig").html(zeroPad(n,4)+"/"+zeroPad(scoreMax,4));
                },
                isComplete: function(n) { return n === scoreMax; },
                next: animateStars
            });

			screen = "levelComplete";
		}
		this.upMax = function(amount){
		    scoreMax += amount;
		    
		}
	}

	var Player = function(startX, startY){
		this.x = startX;
		this.y = startY;
		this.collected = 0;
		this.draw = function(){
			context.drawImage(imageBank.get("player"),this.x*76,this.y*76,candySize,candySize)
		}
		return this;
	}
	var gameControls = function(e){
		if (screen != "game"){
			return;
		}
		var lastX = player.x;
		var lastY = player.y;
		var legal = false;

		//right
		if (e.keyCode == 39){
			player.x += 1
			legal = true;
		}
		//left
		if (e.keyCode == 37){
			player.x += -1
			legal = true;
		}
		//up
		if (e.keyCode == 38){
			player.y += -1
			legal = true;
		}
		//down
		if (e.keyCode == 40){
			player.y += 1
			legal = true;
		}
		//reset
		if (e.keyCode == 82){
			level.restart();
			return;
		}
		if( !legal ) {
		    return;
		}

		//off board
		if (player.x < 0 || player.y < 0 || player.x > 9 || player.y > 9){
			player.x = lastX;
			player.y = lastY;
			return;
		}
		//blank
		if ( board.get(player.x,player.y)  == tile.empty.index ||board.get(player.x,player.y) == tile.start.index){
			player.x = lastX;
			player.y = lastY;
			return;
		}
		//normal
		if (board.get(player.x,player.y) == tile.redMint.index){
			board.set(player.x,player.y,0);
			level.scoreAdd(tile.redMint.points);
			soundBank.play("pointCollected");
		}
		//green
		if (board.get(player.x,player.y) == tile.greenMint.index){
			board.set(player.x,player.y,3);
			level.scoreAdd(tile.greenMint.points - tile.redMint.points);
			soundBank.play("pointCollected");
		}
		//special
		if (board.get(player.x,player.y) == tile.special.index){
			board.set(player.x,player.y,0);
			level.scoreAdd(tile.special.points);
			soundBank.play("specialCollected");
		}
		//bridge
		if (board.get(player.x,player.y) == tile.bridge.index){
			board.set(player.x,player.y,0);
			level.scoreAdd(tile.bridge.points)
			board.makeBridge(player.x, player.y, player.x-lastX,  player.y-lastY);
		}
		
		//end
		if (board.get(player.x,player.y) == tile.end.index){
			level.scoreAdd(tile.end.points)
			level.complete();
		}
	}

	var gameStart = function(gameStartLevel){
		level.start(gameStartLevel);
	}

	var gameComplete = function(){
		$("#gameComplete").show();
		$("#game").hide();
		screen = "gameComplete";
	}

	var logout = function() {
		$.ajax({
			url: '/logout',
			method: 'POST',
			contentType:"application/json; charset=utf-8",
			data: {},
			success: function() {
				window.location = 'welcome.html';
			},
			error: function(jqXHR, textStatus) {
				alert(textStatus);
			}
		});

	}
    var progressGet = function(callback) {
		$.ajax({
			url: '/progress',
			method: 'GET',
			contentType:"application/json; charset=utf-8",
			data: {},
			success: function(data) {
				callback(data);
			},
			error: function(jqXHR, textStatus) {
				alert(textStatus);
			}
		});
	}
	var progressSave = function(levelNumber,pointsCollected,stars,callback) {
		$.ajax({
			url: '/progress',
			method: 'POST',
			contentType:"application/json; charset=utf-8",
			data: JSON.stringify({
			    level: levelNumber,
			    points: pointsCollected,
			    stars: stars
			}),
			success: function(data) {
				callback(data);
			},
			error: function(jqXHR, textStatus) {
				alert(textStatus);
			}
		});

	}

	$(document).ready(function() {
		canvas = document.getElementById("board");
		context = canvas.getContext("2d");
		imageBank = new ImageBank();
		tile.empty.image = imageBank.load("empty","image/blank.png");
		tile.start.image = imageBank.load("start","http://www.karting.nl/images/vlaggen/vlag07.gif");
		tile.end.image = imageBank.load("end","image/end.png");
		tile.redMint.image = imageBank.load("red mint","image/redCandy.png");
		tile.greenMint.image = imageBank.load("green mint","http://cliparts.co/cliparts/Lcd/jL8/LcdjL8bni.png");
		tile.special.image = imageBank.load("cotton candy","http://vignette3.wikia.nocookie.net/clubpenguin/images/1/15/PinkCottonCandy.png/revision/latest?cb=20150102225153");
		tile.bridge.image = imageBank.load("candy corn","http://www.clker.com/cliparts/R/s/R/z/3/R/halloween-candy-corn-md.png");
		imageBank.load("player","image/player.png");
		imageBank.load("redo","http://simpleicon.com/wp-content/uploads/redo-5.png");
		imageBank.load("lock","image/lockedLevel.png");
		imageBank.load("play","image/iconPlay.png");
		imageBank.load("levelSelect","image/iconLevelSelect.png");
		soundBank = new SoundBank();
		soundBank.load("specialCollected","sound/star1.mp3");
		soundBank.load("pointCollected","sound/pop.mp3");
		soundBank.load("buttonHit","sound/tick2.mp3");
		soundBank.load("ambient","sound/ambient.mp3");
		soundBank.load("levelComplete0","sound/youLose.mp3");
		soundBank.load("levelComplete1","sound/success.mp3");
		soundBank.load("levelComplete2","sound/success1.mp3");
		soundBank.load("levelComplete3","sound/successbig.mp3");
		$("button").click(function(){
			soundBank.play("buttonHit");
		});
		$('.userName').html( readCookie( 'userName' ) );
		level = new Level();

		//soundBank.play("ambient").loop(true);
		var startFromTitleScreen = true;
		if(readCookie('isAdmin') == 1){
		    //startFromTitleScreen = false;
		}
		
		var startLevel = 15; // layoutList.length - 1;
		var levelFound = window.location.hash.match( /#(\d+)/ );
		if( levelFound && levelFound[1] !== undefined ) {
            var possibleStartLevel = parseInt(levelFound[1]) - 1;
            if( possibleStartLevel >= 0 && possibleStartLevel < layoutList.length ) {
                startFromTitleScreen = false;
                startLevel = possibleStartLevel;
            }
    	}
        
		if( startFromTitleScreen ) {
			$("#titleScreen").show();
		}
		else {
			gameStart(startLevel);
		}
	});
	var layoutList = createLevels();
	
</script>

</head>

<body>

	<div id="titleScreen" class="startHidden layer">
		<div class="whiteBox">
			<div class="heading">
				Candy Hop
			</div>
			<div>
				Welcome <span class='userName'></span>!
			</div>
			<div>
				<button class="candyButton" onClick="javascript: gameStart(0); $('#titleScreen').hide();">
					<img src="image/iconPlay.png">
				</button>
			</div>
			<div>
				<button class="candyButton" onClick="javascript: level.select();">
					<img src="image/iconLevelSelect.png">
				</button>
			</div>
			<div>
				<button onClick="javascript: logout();">
					Logout
				</button>
			</div>
		</div>

	</div>


	<div id="levelSelect" class="startHidden layer">
		<div class="whiteBox">
			<div class="heading">
				Choose a level to play
			</div>
			<div class="levelList">

			</div>
		</div>
	</div>
	<div id="levelComplete" class="startHidden layer">
		<div class="whiteBox">
			<div class="heading">

				Level Complete!
			</div>
			<div class="score scoreBig">

			</div>
			<div class="collected">

			</div>
			<div>
				 <!-- redo -->
				<button id="buttonRedo" class="candyButton" onClick="javascript: level.restart(); $('#levelComplete').hide();">
					<img src="image/redo.png">
				</button>

				<!-- nextLevel -->
				<button id="buttonNextLevel" class="candyButton" onClick="javascript: level.nextLevel(); $('#levelComplete').hide();">
					<img src="image/nextLevel.png">
				</button>

				<button id="buttonLockedNext" class="candyButton" onClick="javascript: alert('Sorry, not enough candies collected. Unable to proceed.');">
					<img src="image/lockedLevel.png">
				</button>

				<!-- end of game trophy -->
				<button id="buttonEndGame" class="candyButton" onClick="javascript: gameComplete(); $('#levelComplete').hide();">
					<img src="image/trophyIcon.png">
				</button>
				<button class="candyButton" onClick="javascript: level.select();">
					<img src="image/iconLevelSelect.png">
				</button>
			</div>
		</div>
	</div>

	<div id="gameComplete" class="startHidden layer">
		<div class="whiteBox">
			<div class="heading">
				Congratulations!!!
			</div>
			<img src="image/endGameTrophy.png">
			<div class="heading">
				Game Complete!!!
			</div>
		</div>

	</div>

	<div id="game" class="startHidden layer">
		<div class="centered">
			<div class="panel">
				<canvas width = "760" height = "760" id = "board">
				</canvas>
			</div>
			<div class="panel">
				<div class="scoreBig">
				<span class="score"></span> / <span class='scoreMax'></span>
				</div>
				<div class="levelNumber">
				</div>
				<div>
					<button class="candyButton" onClick="javascript: level.restart();">
						<img src="image/redo.png">
					</button>
				</div>
				<div>
					<button class="candyButton" onClick="javascript: level.select();">
						<img src="image/iconLevelSelect.png">
					</button>
				</div>
			</div>
		</div>
	</div>

</body>
</html>
<!-- file:///Users/ken/candyhop/index.html -->