var i = 0; // counter to use in loops
var TICKS = 60; // per second

var	WHITE = [255,255,255,255];
var GRAY = [127,127,127,255];
var	BLACK = [0,0,0,255];
var	TRANSPARENT = [0,0,0,0];
var	BLUE = [0,0,255,255];

var SCORE = 0;

var defaults = {
	RED : [255,0,0,255],
	BLACKISH : [0,0,0,255],

	PURPLE : [127,0,127,255],
	TEAL : [0,127,127,255],

	PALETTE : "REDBLUE", // can be REDBLUE, PURPTEAL
	LENS : "BOTH", // can be BOTH, RED, BLUE
	LENGTH : 120, // in seconds
	SPEED : 5,
	SOUND : "ON",
};

var storage = {
	set : function(key,value) {
		value = JSON.stringify(value);
		window.localStorage.setItem(key, value);
	},
	get : function(key) {
		var value = window.localStorage.getItem(key);
		return JSON.parse(value);
	},
};

validate_storage:
for (i in defaults) {
	if (typeof(window.localStorage[i]) === 'undefined' || window.localStorage[i] === null) {
	window.localStorage.clear();		
		for (i in defaults) {
			storage.set(i,defaults[i]);
		}
		break validate_storage;
	}
}

var utilities = {};

utilities.recolor = function (canvas, context, color1, color2) {
	var data = context.getImageData(0,0,canvas.width,canvas.height);
	for (var i=0; i < data.data.length; i +=4) {
		if ( data.data[i]   === color1[0] &&
			data.data[i+1] === color1[1] &&
			data.data[i+2] === color1[2] &&
			data.data[i+3] === color1[3]) {
				data.data[i]   = color2[0];
				data.data[i+1] = color2[1];
				data.data[i+2] = color2[2];
				data.data[i+3] = color2[3];
				}
	}
	context.putImageData(data,0,0);
};

utilities.randInt = function (min,max) {
	return Math.floor(Math.random()*(max-min+1)+min);
};

utilities.Key = function() {};
utilities.Key.prototype = {

	down : {},
	
	SPACE: 32,
	LEFT: 37,
	RIGHT: 39,
	UP: 38,
	DOWN: 40,
	ESC: 27,
	
	pressed: function(keyCode) {
		return this.down[keyCode];
	},
  
	on_down: function(event) {
		event.preventDefault();
		this.down[event.keyCode] = true;
	},
  
	on_up: function(event) {
		delete this.down[event.keyCode];
	},
	
	clear : function() {
		this.down = {};
	}
};

utilities.collision = function(circle1, circle2) {
  var dx = circle1.center_x - circle2.center_x;
  var dy = circle1.center_y - circle2.center_y;
  var radii = circle1.radius + circle2.radius;
 
  return (dx * dx + dy * dy <= radii * radii)
}

var graphics = {
	
	load : function() {
		this.sprite_sheet = new Image();
		this.screens = {};
		this.screens.hidden = {};
		this.screens.hidden.rb = {};
		this.screens.hidden.pt = {};
		this.screens.hidden.rb.canvas = {
			canvas1 : document.createElement("canvas"), //red
			canvas2 : document.createElement("canvas"), //blue
			canvas3 : document.createElement("canvas")	//white		
		};
		
		this.screens.hidden.pt.canvas = {
			canvas1 : document.createElement("canvas"), //teal
			canvas2 : document.createElement("canvas"), //purple
			canvas3 : document.createElement("canvas")  //black
		};
		
		this.screens.hidden.rb.context = {
			context1 : this.screens.hidden.rb.canvas.canvas1.getContext("2d"), //red
			context2 : this.screens.hidden.rb.canvas.canvas2.getContext("2d"),//blue
			context3 : this.screens.hidden.rb.canvas.canvas3.getContext("2d")//white
		};
		
		this.screens.hidden.pt.context = {
			context1 : this.screens.hidden.pt.canvas.canvas1.getContext("2d"),//teal
			context2 : this.screens.hidden.pt.canvas.canvas2.getContext("2d"),//purple
			context3 : this.screens.hidden.pt.canvas.canvas3.getContext("2d")//black
		};	
		
		this.screens.layers = {};
		this.screens.layers.canvas = {
			canvas0 : document.getElementById("canvas0"),
			canvas1 : document.getElementById("canvas1"),
			canvas2 : document.getElementById("canvas2"),
			canvas3 : document.getElementById("canvas3")
		};
		this.screens.layers.context = {
			ctx0 : this.screens.layers.canvas.canvas0.getContext("2d"),
			ctx1 : this.screens.layers.canvas.canvas1.getContext("2d"),
			ctx2 : this.screens.layers.canvas.canvas2.getContext("2d"),
			ctx3 : this.screens.layers.canvas.canvas3.getContext("2d")
		};
	},
	
	load_assets : function(callback) {
		this.callback = callback;
		this.sprite_sheet.src = "images/spritesheet.png";
		this.sprite_sheet.onload = this.on_load_callback.bind(this);
	},	
	
	on_load_callback : function () {
		this.set_size();
		this.draw("REDBLUE");
		this.draw("PURPTEAL");
		this.colorize("REDBLUE");
		this.colorize("PURPTEAL");
		this.load_sounds();
	},
	
	load_sounds : function() {
		this.sounds = {};
		this.load_countdown = 6;
		
		this.sounds.combo1 = AudioFX('sounds/combo1', { formats: ['ogg','mp3'], pool: 2 }, this.load_sounds_callback.bind(this));
		this.sounds.combo2 = AudioFX('sounds/combo2', { formats: ['ogg','mp3'], pool: 2 }, this.load_sounds_callback.bind(this));
		this.sounds.combo3 = AudioFX('sounds/combo3', { formats: ['ogg','mp3'], pool: 2 }, this.load_sounds_callback.bind(this));
		this.sounds.combo4 = AudioFX('sounds/combo4', { formats: ['ogg','mp3'], pool: 2 }, this.load_sounds_callback.bind(this));
		this.sounds.ouch   = AudioFX('sounds/ouch'  , { formats: ['ogg','mp3'], pool: 2 }, this.load_sounds_callback.bind(this));	
		this.sounds.gem    = AudioFX('sounds/gem'   , { formats: ['ogg','mp3'], pool: 2 }, this.load_sounds_callback.bind(this));
	},

	sound_volume : function(onoff) {
		var mute;
		if (onoff === "ON") {
			mute = false;
		} else {
			mute = true;
		}		
		for (i in this.sounds) {
			this.sounds[i].mute = mute;
		}
	},
		
	load_sounds_callback : function() {
		this.load_countdown -= 1;
		if (this.load_countdown === 0) {
			this.sound_volume(storage.get("SOUND"));			
			this.callback();
		}
	},
	
	set_size : function() {
		for (i in this.screens.hidden.rb.canvas) {
			this.screens.hidden.rb.canvas[i].width = this.sprite_sheet.width;
			this.screens.hidden.rb.canvas[i].height = this.sprite_sheet.height;
		}

		for (i in this.screens.hidden.pt.canvas) {
			this.screens.hidden.pt.canvas[i].width = this.sprite_sheet.width;
			this.screens.hidden.pt.canvas[i].height = this.sprite_sheet.height;
		}
	},
	
	draw : function(what) {
		if (what === "REDBLUE") {
			for	(i in this.screens.hidden.rb.context) {
				this.screens.hidden.rb.context[i].drawImage(this.sprite_sheet, 0, 0);
			}
		} else if (what === "PURPTEAL") {
			for	(i in this.screens.hidden.pt.context) {
				this.screens.hidden.pt.context[i].drawImage(this.sprite_sheet, 0, 0);
			}
		}
	},
	
	colorize : function(what) {
		if (what === "REDBLUE") {
			utilities.recolor(this.screens.hidden.rb.canvas.canvas1, this.screens.hidden.rb.context.context1, WHITE, storage.get("RED"));
			utilities.recolor(this.screens.hidden.rb.canvas.canvas1, this.screens.hidden.rb.context.context1, BLACK, storage.get("BLACKISH"));

			utilities.recolor(this.screens.hidden.rb.canvas.canvas2, this.screens.hidden.rb.context.context2, WHITE, BLUE);
			utilities.recolor(this.screens.hidden.rb.canvas.canvas2, this.screens.hidden.rb.context.context2, BLACK, storage.get("BLACKISH"));
		
		} else if (what === "PURPTEAL") {
			utilities.recolor(this.screens.hidden.pt.canvas.canvas1, this.screens.hidden.pt.context.context1, WHITE, storage.get("TEAL"));
			utilities.recolor(this.screens.hidden.pt.canvas.canvas1, this.screens.hidden.pt.context.context1, BLACK, GRAY);

			utilities.recolor(this.screens.hidden.pt.canvas.canvas2, this.screens.hidden.pt.context.context2, WHITE, storage.get("PURPLE"));
			utilities.recolor(this.screens.hidden.pt.canvas.canvas2, this.screens.hidden.pt.context.context2, BLACK, GRAY);
			
			utilities.recolor(this.screens.hidden.pt.canvas.canvas3, this.screens.hidden.pt.context.context3, BLACK, GRAY);
			utilities.recolor(this.screens.hidden.pt.canvas.canvas3, this.screens.hidden.pt.context.context3, WHITE, BLACK);
		}
	}
};

var game = {};

game.state_manager = {
	state_stack : [],
	push_state : function(state) {
		if (this.state_stack.length > 0) {
			this.state_stack[this.state_stack.length-1].obscuring();
		}
		this.state_stack.push(game.create_state(state));
		this.state_stack[this.state_stack.length-1].entered();
	},
	pop_state : function() {
		this.state_stack[this.state_stack.length-1].exiting();		
		this.state_stack.pop();
		this.state_stack[this.state_stack.length-1].revealed();
	}
};

game.update = function () {
	game.state_manager.state_stack[game.state_manager.state_stack.length-1].update(TICKS);
};

game.draw = function () {
		requestAnimationFrame(game.draw);	
		game.state_manager.state_stack[game.state_manager.state_stack.length-1].draw();
};

game.settings = { load         : function(){ return {background : BLACK}; },

				  main_menu    : function(){ return {background : BLACK}; },
				  
				  options_menu : function(){ return {background : BLACK}; },
				  
				  calibrate_menu: function(){ return {background : BLACK}; },
				  
				  calibrate_rb : function(){ return {background : BLACK}; },
				  
				  calibrate_pt : function(){ return {background : BLACK}; },
				  
				  instructions : function(){ return {background : BLACK}; },
				  
				  level : {  settings : function(speed) {
											var BASE_PLAYER_SPEED = 150;
											var CHANGE_ENEMY = 4;
											var ENEMIESONSCREEN = 8;
											
											var enemy_speed = speed * 20 + 30; // lowest speed is 50, increases by 20
											var player_speed;
												if (BASE_PLAYER_SPEED > enemy_speed) {
													player_speed = BASE_PLAYER_SPEED;
												} else {
													player_speed = enemy_speed;
												}
											var enemy_fall_change_rate = 600/enemy_speed*CHANGE_ENEMY;
											var enemy_create_rate = ENEMIESONSCREEN / (600 / enemy_speed);
											
											return {
												enemy_speed : enemy_speed,								
												player_speed : player_speed,											    
											    enemy_fall_change_rate : enemy_fall_change_rate,							   
											    enemy_create_rate : enemy_create_rate,
												gem_speed : enemy_speed,
											    gem_create_rate : enemy_create_rate/2,
											    gem_fall_change_rate : enemy_fall_change_rate,
												 
											    blink_duration         : 1   , // seconds
											    blink_rate             : 10  , // blinks per second
												 
											    combo_initial          : 10  , // squares
											};
										},
						   palette : { REDBLUE : function(){
												return {
												 images                 : graphics.screens.hidden.rb,
												 bg_color               : storage.get("BLACKISH"),
											     menu_color             : WHITE,
												 };
												},
									   PURPTEAL : function(){
												return {
												 images                 : graphics.screens.hidden.pt,
												 bg_color               : GRAY,
												 menu_color             : BLACK,											 
												 };
												},
									 },
								
						   lens : { BOTH : function(){ return ["canvas1", "canvas2", "canvas3"]; },
						            RED  : function(){ return ["canvas1", "canvas1", "canvas3"]; },
									BLUE : function(){ return ["canvas2", "canvas2", "canvas3"]; },
						          },						  
						  
						   length : function(){ return storage.get("LENGTH");}
				  },
};
game.create_state = function(state) {
	switch (state) {
		case "load":
			return new load.Load(graphics.screens.layers, game.settings.load() );
		case "main_menu":
			return new menu.MainMenu(graphics.screens.layers, game.settings.main_menu() );
		case "options_menu":
			return new optionsmenu.OptionsMenu(graphics.screens.layers, game.settings.options_menu() );
		case "calibrate_menu":
			return new calibratemenu.CalibrateMenu(graphics.screens.layers, game.settings.calibrate_menu() );
		case "calibrate_rb":
			return new calibraterb.CalibrateRB(graphics.screens.layers, game.settings.calibrate_rb() );
		case "calibrate_pt":
			return new calibratept.CalibratePT(graphics.screens.layers, game.settings.calibrate_pt() );
		case "level":
			return new level.Level(graphics.screens.layers, game.settings.level.palette[storage.get("PALETTE")](),
								   game.settings.level.lens[storage.get("LENS")](),
								   game.settings.level.length(), game.settings.level.settings(storage.get("SPEED")) );
		case "pause":
			return new pause.Pause(graphics.screens.layers);
		case "end":
			return new end.End(graphics.screens.layers);
		case "instructions":
			return new instructions.Instructions(graphics.screens.layers, game.settings.instructions() );
	}
};

game.start = function () {
	graphics.load();
	game.state_manager.push_state("load");
	setInterval(game.update, 1000.0 / TICKS);
	requestAnimationFrame(game.draw);	
};

var level = {};

level.Level = function (layers, palette, lens, time_limit, settings) {
	//layers
	this.layer_canvas = layers.canvas;
	this.layer_context = layers.context;
	
	//background color
	this.bg_color = palette.bg_color;	
	
	//hidden canvases and contexts
	this.canvas1  = palette.images.canvas[lens[0]];
	this.context1 = palette.images.context[lens[0]];
	this.canvas2  = palette.images.canvas[lens[1]];
	this.context2 = palette.images.context[lens[1]];
	this.canvas3  = palette.images.canvas[lens[2]];
	this.context3 = palette.images.context[lens[2]];
		
	//player
	this.player_speed = settings.player_speed;
	this.blink_duration = settings.blink_duration;
	this.blink_rate = settings.blink_rate;	
	
	//enemies
	this.enemy_speed = settings.enemy_speed;
	this.enemy_create_rate = settings.enemy_create_rate; 
	this.enemy_fall_change_rate = settings.enemy_fall_change_rate; 
	
	//gems
	this.gem_speed = settings.gem_speed;
	this.gem_create_rate = settings.gem_create_rate;
	this.gem_fall_change_rate = settings.gem_fall_change_rate;

	//combo and score bar and effects
	this.menu_color = palette.menu_color;
	this.combo_initial = settings.combo_initial;
	this.combo_list = [];
	
	//time limit
	this.time_limit = time_limit;
	
	this.combo1_sound = graphics.sounds.combo1;
	this.combo2_sound = graphics.sounds.combo2;
	this.combo3_sound = graphics.sounds.combo3;
	this.combo4_sound = graphics.sounds.combo4;
	this.ouch_sound = graphics.sounds.ouch;
	this.gem_sound = graphics.sounds.gem;
};

level.Level.prototype = {
	blink_index : 0,
	blinking : false,
				
	entered : function() {
		this._random_palette();
		this._add_listeners();
		this._clear_layers();
		this._set_background();
		this._create_player();	
		this._create_enemies();
		this._create_gems();
		this._create_combo_meter();
		this._create_countdown();
		this._show_menus();
		KEY.clear();
	},
	
	obscuring : function() {
		this._remove_listeners();
	},
	
	revealed : function() {
		this._add_listeners();
	},
	
	exiting : function() {
		this._remove_listeners();
		this._hide_menus();
		this.combo_meter.remove_all_squares();
	},
	
	update : function() {
		// process keydown for player movement
		this._process_keydown();
		
		// tell the player to update (animation)
		this.player.update(TICKS);
		
		// tell the enemy manager to update (create enemies, change fall pattern)
		this.enemy_manager.update(TICKS);
		
		// tell the enemies to update (animation, movement, check bounds)
		for (i=0; i<this.enemy_manager.enemy_list.length; i++) {
			this.enemy_manager.enemy_list[i].update(TICKS);
		}
		
		// tell the gems manager to update (create enemies, change fall pattern)
		this.gems_manager.update(TICKS);
		
		// tell the gems to update (movement, check bounds)
		for (i=0; i<this.gems_manager.gems_list.length; i++) {
			this.gems_manager.gems_list[i].update(TICKS);
		}		
		
		this._check_collisions();
		
		if (this.blinking) {this._blink();}
		
		this.countdown.update(TICKS);
	},

	draw : function() {
		this.layer_context.ctx1.clearRect(0,0, this.layer_canvas.canvas1.width, this.layer_canvas.canvas1.height);
		this.player.draw(this.layer_context.ctx1);
		for (i=0; i<this.gems_manager.gems_list.length; i++) {
			this.gems_manager.gems_list[i].draw(this.layer_context.ctx1);
		}		
		for (i=0; i<this.enemy_manager.enemy_list.length; i++) {
			this.enemy_manager.enemy_list[i].draw(this.layer_context.ctx1);
		}
	},	

	process_keyup_callback : function(event) {
		if (event.keyCode === 27) { // ESC
			game.state_manager.push_state("pause");
		}
	},

	activate_combo : function(points) {
 		var rand = utilities.randInt(1,12);
		
		// 6/12
		// 2/12
		// 2/12
		// 2/12
		
		switch(true) {
			case (rand<=6):
				this._combo1();
				break;
			case (rand === 7 || rand === 8):
				this._combo2();
				break;
			case (rand === 9 || rand === 10):
				this._combo3();
				break;
			case (rand>10):
				this._combo4();
				break; 
		}
	},
	
	_combo1 : function() { //enemy dies by laser	
		this.combo1_sound.play();
		
		var context = this.layer_context.ctx2;
		context.beginPath();
		for (i=0; i<this.enemy_manager.enemy_list.length; i++) {
			context.moveTo(Math.round(this.player.center_x), Math.round(this.player.center_y));
			context.lineTo(Math.round(this.enemy_manager.enemy_list[i].center_x), Math.round(this.enemy_manager.enemy_list[i].center_y));
		
			this.enemy_manager.enemy_list[i].stopped = true;
			this.enemy_manager.enemy_list[i].img = this.canvas3;
		
		}
		context.lineWidth = 3;
		context.strokeStyle = "rgb("+this.menu_color[0]+","+this.menu_color[1]+","+this.menu_color[2]+")";
		context.stroke();		
		
		setTimeout( (function(){this._kill_all_enemies(); this.layer_canvas.canvas2.width = this.layer_canvas.canvas2.width;}).bind(this), 300 );	
	},

	_combo2 : function() { //enemy gets circled, turned into stationary gem
		this.combo2_sound.play();
		
		var context = this.layer_context.ctx2;
		context.lineWidth = 2;
		context.strokeStyle = "rgb("+this.menu_color[0]+","+this.menu_color[1]+","+this.menu_color[2]+")";
		for (i=0; i<this.enemy_manager.enemy_list.length; i++) {
			context.beginPath();			
			context.arc(Math.round(this.enemy_manager.enemy_list[i].center_x), Math.round(this.enemy_manager.enemy_list[i].center_y), 60, 0, 2*Math.PI);
			context.stroke();
		}
		
		for (i=this.enemy_manager.enemy_list.length-1; i >= 0; i--) {
			this.gems_manager.create_gem(this.enemy_manager.enemy_list[i].x, this.enemy_manager.enemy_list[i].y, [0,0], 0);
			this.enemy_manager.enemy_list[i].kill();
		}

		setTimeout( (function(){this.layer_canvas.canvas2.width = this.layer_canvas.canvas2.width;}).bind(this), 500 );			
		
	},

	_combo3 : function() { //wall of gems comes from a random direction		
		this.combo3_sound.play();
		
		var gem = new gems.Gems(0,0,[0,0],0, this.gem_speed);
		var space = 3;
		var rand = utilities.randInt(1,4);
		
		switch(rand) {
			case 1: //vertical wall, starting right, going left
				for ( i=0; i<600; i+=gem.size[1]+space ) {
					this.gems_manager.create_gem(0-gem.size[0]-1, i, [1,0], gem.speed);			
				}
				break;
			
			case 2: //vertical wall, starting left, going right
				for ( i=0; i<600; i+=gem.size[1]+space ) {
					this.gems_manager.create_gem(800+gem.size[0]+1, i, [-1,0], gem.speed);				
				}
				break;
				
			case 3: //horizontal wall, starting top, going bottom
				for ( i=0; i<800; i+=gem.size[0]+space ) {
					this.gems_manager.create_gem(i, 0-gem.size[1]-1, [0,1], gem.speed);
				}
				break;
				
			case 4: //horizontal wall, starting bottom, going top
				for ( i=0; i<800; i+=gem.size[0]+space ) {
					this.gems_manager.create_gem(i, 600+gem.size[1]+1, [0,-1], gem.speed);
				}
				break;
		}
	},

	_combo4 : function() { //screen flashes, enemies replaced by moving gems		
		this.combo4_sound.play();		
		
		this.layer_context.ctx0.fillStyle = "rgb("+this.menu_color[0]+","+this.menu_color[1]+","+this.menu_color[2]+")";
		this.layer_context.ctx0.fillRect(0,0,800,600);		
		
		for (i=this.enemy_manager.enemy_list.length-1; i >= 0; i--) {
			this.gems_manager.create_gem(this.enemy_manager.enemy_list[i].x, this.enemy_manager.enemy_list[i].y,
										 this.enemy_manager.enemy_list[i].ratio, this.enemy_manager.enemy_list[i].speed);
			this.enemy_manager.enemy_list[i].kill();
		}

		setTimeout( this._set_background.bind(this), 100 );		
	},
		
	_kill_all_enemies : function() {
		for (i=this.enemy_manager.enemy_list.length-1; i >= 0; i--) {
			this.enemy_manager.enemy_list[i].kill();
		}
	},
		
	_create_combo_meter : function() {
		combo_container = document.getElementById("combocontainer");
		combo_meter = document.getElementById("combometer");
		combo_score = document.getElementById("score");
		
		this.combo_meter = new level.ComboMeter(this, combo_container, combo_meter, combo_score, this.menu_color, this.bg_color);
		
		for(i=0; i<this.combo_initial; i++) {
			this.combo_meter.add_square();
		}
	},
	
	_create_countdown : function() {
		countdown = document.getElementById("countdown");
		
		this.countdown = new level.Countdown(this, countdown, this.time_limit, this.menu_color, this.bg_color);
	},
	
	_check_collisions : function() {
		
		// player and enemy
		if (!this.blinking) {		
			player_and_enemy:			
			for (i=0; i<this.enemy_manager.enemy_list.length; i++) {
				if (utilities.collision(this.player, this.enemy_manager.enemy_list[i])) {
					this.ouch_sound.play();
					this.blinking = true;
					this.combo_meter.unlight_square();
					break player_and_enemy;
				}
			}
		}
		
		// player and gems
		for (i=0; i<this.gems_manager.gems_list.length; i++) {
			if (utilities.collision(this.player, this.gems_manager.gems_list[i])) {
				this.gems_manager.remove(this.gems_manager.gems_list[i]);
				this.combo_meter.light_square();
			}
		}		
		
	},
	
	_clear_layers : function() {
		for (i in this.layer_context) {
			this.layer_context[i].clearRect(0,0, this.layer_canvas.canvas0.width, this.layer_canvas.canvas0.height);
		}		
	},

	_set_background : function() {
		this.layer_context.ctx0.fillStyle = "rgb("+this.bg_color[0]+","+this.bg_color[1]+","+this.bg_color[2]+")";
		this.layer_context.ctx0.fillRect(0,0,800,600);	
	},
	
	_create_player : function() {
		this.player = new player.Player(this.canvas1);
		this.player.x = 400-Math.round(this.player.size[0]/2);
		this.player.y = 300-Math.round(this.player.size[1]/2);
	},

	_create_enemies : function() {
		this.enemy_manager = new enemy.EnemyManager(this.canvas2, this.enemy_speed, this.enemy_create_rate, this.enemy_fall_change_rate);
	},

	_create_gems : function() {
		this.gems_manager = new gems.GemsManager(this.canvas1, this.canvas2, this.canvas3,
												 this.gem_speed, this.gem_create_rate, this.gem_fall_change_rate);
	},
	
	_process_keydown : function() {

		if ((KEY.pressed(KEY.UP)) &&
		   ((this.player.y - (this.player_speed/TICKS))>0)) {
			this.player.move("y", (-this.player_speed)/TICKS);
		}
		if ((KEY.pressed(KEY.DOWN)) &&
		   ((this.player.y + this.player.size[1] + (this.player_speed/TICKS))<600)) {
			this.player.move("y", this.player_speed/TICKS);
		}
		if ((KEY.pressed(KEY.LEFT)) &&
		   ((this.player.x + (this.player_speed/TICKS))>0)) {
			this.player.move("x", (-this.player_speed)/TICKS, true);
		}
		if ((KEY.pressed(KEY.RIGHT)) &&
		   ((this.player.x+this.player.size[0]+(this.player_speed/TICKS))<800)) {		
			this.player.move("x", this.player_speed/TICKS, true);
		}		
	},
		
	_add_listeners : function() {
		window.addEventListener('keyup', this.process_keyup_callback, false);
	},
	
	_remove_listeners : function() {
		window.removeEventListener('keyup', this.process_keyup_callback, false);
	},
	
	_blink : function () {
		this.blink_index += 1;
		
		// turn white at the beginning
		if (this.blink_index === 1) {
			this._white_player();
			this._white_enemies();
		}
		
		// blink player
		if (this.blink_index % (Math.floor(1/this.blink_rate*TICKS)) === 0) {
			if (this.player.img === this.canvas3) {
				this._color_player();
			} else {
				this._white_player();
			}
		}
		
		// turn color at the end
		if (this.blink_index > this.blink_duration*TICKS) {
			this._random_palette();			
			this._color_player();
			this._color_enemies();
			this.blinking = false;
			this.blink_index = 0;
			return;
		}
	},

	_random_palette : function () {
		if (utilities.randInt(1,10) % 2 === 0) {
			var old1 = this.canvas1;
			var old2 = this.canvas2;
			this.canvas1 = old2;
			this.canvas2 = old1;			
		}
	},

	_white_player : function () {
		this.player.img = this.canvas3;	
	},
	
	_white_enemies : function () {
		this.enemy_manager.img = this.canvas3;
		for (i=0; i<this.enemy_manager.enemy_list.length; i++) {
			this.enemy_manager.enemy_list[i].img = this.canvas3;
		}
	},
	
	_color_player : function () {
		this.player.img = this.canvas1;	
	},
	
	_color_enemies : function () {
		this.enemy_manager.img = this.canvas2;
		for (i=0; i<this.enemy_manager.enemy_list.length; i++) {
			this.enemy_manager.enemy_list[i].img = this.canvas2;
		}	
	},
	
	_show_menus : function() {
		this.combo_meter.show();
		this.countdown.show();
	},
	
	_hide_menus : function() {
		this.combo_meter.hide();
		this.countdown.hide();
	}
};

level.ComboMeter = function(parent, container, bar, score, menu_color, bg_color) {
	this.parent = parent;
	this.container = container;
	this.bar = bar;
	this.score = score;
	this.menu_color = menu_color;
	this.bg_color = bg_color;
	
	this.bar.style.backgroundColor = "rgb("+this.bg_color[0]+","+this.bg_color[1]+","+this.bg_color[2]+")";
	this.bar.style.borderColor = "rgb("+this.menu_color[0]+","+this.menu_color[1]+","+this.menu_color[2]+")";
	
	this.score.style.backgroundColor = "rgb("+this.bg_color[0]+","+this.bg_color[1]+","+this.bg_color[2]+")";
	this.score.style.borderColor = "rgb("+this.menu_color[0]+","+this.menu_color[1]+","+this.menu_color[2]+")";
	this.score.style.color = "rgb("+this.menu_color[0]+","+this.menu_color[1]+","+this.menu_color[2]+")";
	
	this.square_list = [];
};

level.ComboMeter.prototype = {

	lit_squares : 0,
	points : 0,

	show : function() {
		this.container.style.display = "block";
		this.score.innerHTML = ("0"+this.points).slice(-3);
	},
	
	hide : function() {
		this.container.style.display = "none";
	},

	add_point : function() {
		this.points += 1;
		this.score.innerHTML = ("0"+this.points).slice(-3);
	},
	
	add_square : function () {
		this.square_list.push(new level.ComboSquare(this.bar, this.menu_color, this.bg_color));
	},
	
	light_square : function () {
		this.lit_squares += 1;
		
		light_next_square:
		for (i=0; i < this.square_list.length; i++) {
			if (!this.square_list[i].lit) {
				this.square_list[i].on();
				break light_next_square;
			}
		}
		
		if (this.lit_squares >= this.square_list.length) {
			this.parent.activate_combo();
			this.add_point();
			this.reset_squares();
			return;
		}

		this.parent.gem_sound.play();
	},
	
	unlight_square : function () {
		if (this.lit_squares > 0) {
			this.lit_squares -= 1;
			unlight_next_square:
			for (i=this.square_list.length-1; i >= 0; i--) {
				if (this.square_list[i].lit) {
					this.square_list[i].off();
					break unlight_next_square;
				}
			}
		}
	},
	
	reset_squares : function () {
		this.lit_squares = 0;
		for (i=0; i < this.square_list.length; i++) {
			this.square_list[i].off();
		}
	},
	
	remove_all_squares : function () {
		for (i=0; i < this.square_list.length; i++) {
			this.square_list[i].remove();
		}
	}
};

level.ComboSquare = function(node, on_color, off_color) {
	this.on_color = on_color;
	this.off_color = off_color;
	
	this.square = document.createElement('div');
	this.square.className = 'combodiv';
	this.square.style.borderColor = "rgb("+this.on_color[0]+","+this.on_color[1]+","+this.on_color[2]+")";
	this.square.style.backgroundColor = "rgb("+this.off_color[0]+","+this.off_color[1]+","+this.off_color[2]+")";
	node.appendChild(this.square);
	
	this.lit = false;
	
};

level.ComboSquare.prototype = {
	
	on : function() {
		this.square.style.backgroundColor = "rgb("+this.on_color[0]+","+this.on_color[1]+","+this.on_color[2]+")";
		this.lit = true;
	},
	
	off : function() {
		this.square.style.backgroundColor = "rgb("+this.off_color[0]+","+this.off_color[1]+","+this.off_color[2]+")";
		this.lit = false;
	},
	
	remove : function() {
		this.square.parentNode.removeChild(this.square);
	}
};

level.Countdown = function(parent, container, limit, menu_color, bg_color) { // give end time in seconds
	this.parent = parent;
	this.container = container;
	this.limit = limit;

	
	this.container.style.backgroundColor = "rgb("+bg_color[0]+","+bg_color[1]+","+bg_color[2]+")";
	this.container.style.borderColor = "rgb("+menu_color[0]+","+menu_color[1]+","+menu_color[2]+")";
	this.container.style.color = "rgb("+menu_color[0]+","+menu_color[1]+","+menu_color[2]+")";	
};

level.Countdown.prototype = {

	elapsed : 0,

	show : function() {
		this.container.style.display = "inline-block";
	},
	
	hide : function() {
		this.container.style.display = "none";
	},

	update : function(ticks) {
		this.elapsed += 1;

		var remaining = this.limit - (this.elapsed/ticks);
		
		var minutes = Math.floor(remaining/60);
		var seconds = Math.floor(remaining%60);
		this.container.innerHTML = minutes + ":" + ("0"+seconds).slice(-2);		
		
		if (this.elapsed/ticks >= this.limit) {
			SCORE = this.parent.combo_meter.points;
			game.state_manager.push_state("end");
		}
	}
};

var player = {};

player.Player = function (img) {
				this.img = img;        
				};
				
player.Player.prototype = {
    size : [72,66],
	radius : 36,
	left_pos : [288,0],
	right_pos : [0,0],
	frame_speed : 12,
	frame_order : [0,1,2,3,2,1],
	
	x : 0,
	y : 0,
	center_x : 0,
	center_y : 0,
	current_frame : 0,
	_index : 0,
	orientation : "left",
	
	move : function(axis, amount, affect_orientation) {
		if (axis === "x" || axis === "y") {
			this[axis] += amount;
			if (axis === "x"){
				if (affect_orientation) {
					if (amount > 0) {
						this.orientation = "right";
					} else if (amount < 0) {
						this.orientation = "left";
					}				
				}
			}
		}
	},
	
	update: function(ticks) {
		this._index += this.frame_speed / ticks;
		if(this.frame_speed > 0) {
            var max = this.frame_order.length;
            var idx = Math.floor(this._index);
            this.current_frame = this.frame_order[idx % max];
        } else {
            this.current_frame = 0;
        }
		
	this.set_center_xy();
	},

    draw: function(ctx) {
        var x = 0;
		var y = 0;
		if (this.orientation === "right") {
			x = this.right_pos[0];
			y = this.right_pos[1];
		} else if (this.orientation === "left") {
			x = this.left_pos[0];
			y = this.left_pos[1];			
		}
		x += this.current_frame * this.size[0];
		ctx.drawImage(this.img,
                      x, y,
                      this.size[0], this.size[1],
					  Math.round(this.x), Math.round(this.y),
                      this.size[0], this.size[1]);
	},
	
	set_center_xy : function() {
		this.center_x = this.x + Math.round(this.size[0]/2);
		this.center_y = this.y + Math.round(this.size[1]/2);
	}
};

var enemy = {};

enemy.Enemy = function (parent, img, coords, ratio, speed) {
	this.parent = parent;
	this.img = img;
	this.x = coords[0];
	this.y = coords[1];
	this.ratio = ratio;
	this.speed = speed; // pixels per second
	
	this.stopped = false;
};

enemy.Enemy.prototype = {
	center_x : 0,
	center_y :0,
	radius : 27,
	size : [54,54],
	pos : [610,0],
	frame_speed : 2,
	frame_order : [0,1],
	current_frame: 0,
	_index : 0,
	
	update : function(ticks) {
		this.update_animation(ticks);
		this.move(ticks);
		this.check_bounds();
		this.set_center_xy();
	},	

	move : function(ticks) {
		if (!this.stopped) {
			this.x += (this.ratio[0]*this.speed)/ticks;
			this.y += (this.ratio[1]*this.speed)/ticks;
		}
	},

	update_animation: function(ticks) {
		this._index += this.frame_speed / ticks;
		var max = this.frame_order.length;
		var idx = Math.floor(this._index);
		this.current_frame = this.frame_order[idx % max];
	},

	check_bounds : function() {
		if (this.ratio[0] > 0) {			 	// if you're going right, don't go over the edge
			if (this.x > 851) {this.kill();}  
		} else {								// if you're going left, don't go over the other edge
			if (this.x < -51) {this.kill();}
		}
		
		if (this.ratio[1] > 0) {				// if you're going up, don't go too high
			if (this.y > 651) {this.kill();} 
		} else {								// if you're going down, don't go too low
			if (this.y < -51) {this.kill();}
		}
	},

	kill : function() {
		this.parent.remove(this);
	},
	
    draw: function(ctx) {
        var x = this.pos[0];
        var y = this.pos[1];
		x += this.current_frame * this.size[0];
		ctx.drawImage(this.img,
                      x, y,
                      this.size[0], this.size[1],
                      Math.round(this.x), Math.round(this.y),
                      this.size[0], this.size[1]);
	},
	
	set_center_xy : function() {
		this.center_x = this.x + Math.round(this.size[0]/2);
		this.center_y = this.y + Math.round(this.size[1]/2);
	}
};

enemy.EnemyManager = function (img, enemy_speed, create_rate, change_rate) {
	this.img = img;
	this.enemy_speed = enemy_speed;
	this.base_create_rate = create_rate;
	this.create_rate = create_rate;
	this.change_rate = change_rate;
	
	this.direction = utilities.randInt(1,4);
	this.enemy_list = [];
};

enemy.EnemyManager.prototype = {
	create_index: 0,
	change_index: 0,
	
	update : function (ticks) {
		this.create_index += this.create_rate/ticks;
		if (this.create_index >= 1) {
			this.create_index = 0;
			this.create_enemy();
		}
		
		this.change_index += 1;
		if (this.change_index >= ticks*this.change_rate) {
			this.change_index = 0;
			this.randomize_direction();
		}
	},
	
	create_enemy : function() {
		var example = new enemy.Enemy(0,0,[0,0],0,0);
		var width = example.size[0];
		var height = example.size[1];
		var halfwidth = Math.round(width/2);
		var halfheight = Math.round(height/2);
		
		switch (this.direction) {
			case 1:
				this.enemy_list.push( new enemy.Enemy(this, this.img,
													  [utilities.randInt(0-halfwidth, 800-halfwidth), 0-(height+1)], 
													  [0,1], this.enemy_speed ) );
				this.create_rate = this.base_create_rate;
				break;
			case 2:
				this.enemy_list.push( new enemy.Enemy(this, this.img,
													  [801, utilities.randInt(0-halfheight, 600-halfheight)],
													  [-1,0], this.enemy_speed ) );
				this.create_rate = this.base_create_rate;
				break;
			case 3:
				this.enemy_list.push( new enemy.Enemy(this, this.img,
													  [utilities.randInt(0-halfwidth, 800-halfwidth), 601],
													  [0,-1], this.enemy_speed ) );
				this.create_rate = this.base_create_rate;
				break;
			case 4:
				this.enemy_list.push( new enemy.Enemy(this, this.img,
													  [0-(width+1), utilities.randInt(0-halfheight, 600-halfheight)],
													  [1,0], this.enemy_speed ) );
				this.create_rate = this.base_create_rate;
				break;
		} 
	},

	randomize_direction : function() {
		this.direction = utilities.randInt(1,4);
	},
	
	remove : function (who) {
		this.enemy_list.splice(this.enemy_list.indexOf(who),1);
	}
};

var gems = {};

gems.Gems = function (parent, img, coords, ratio, speed) {
	this.parent = parent;
	this.img = img;
	this.x = coords[0];
	this.y = coords[1];
	this.ratio = ratio;
	this.speed = speed; // pixels per second
	
	this.radius = 17;
	this.size = [34,54];
	this.pos = [576,0];			
};

gems.Gems.prototype = {
	center_x : 0,
	center_y :0,


	update : function(ticks) {
		this.move(ticks);
		this.check_bounds();
		this.set_center_xy();
	},	

	move : function(ticks) {
		this.x += (this.ratio[0]*this.speed)/ticks;
		this.y += (this.ratio[1]*this.speed)/ticks;
	},

	check_bounds : function() {
		if (this.ratio[0] > 0) {			 	// if you're going right, don't go over the edge
			if (this.x > 833) {this.kill();}  
		} else {								// if you're going left, don't go over the other edge
			if (this.x < -33) {this.kill();}
		}
		
		if (this.ratio[1] > 0) {				// if you're going up, don't go too high
			if (this.y > 651) {this.kill();} 
		} else {								// if you're going down, don't go too low
			if (this.y < -51) {this.kill();}
		}
	},

	kill : function() {
		this.parent.remove(this);
	},
	
    draw: function(ctx) {
        var x = this.pos[0];
        var y = this.pos[1];
		ctx.drawImage(this.img,
                      x, y,
                      this.size[0], this.size[1],
                      Math.round(this.x), Math.round(this.y),
                      this.size[0], this.size[1]);
	},
	
	set_center_xy : function() {
		this.center_x = this.x + Math.round(this.size[0]/2);
		this.center_y = this.y + Math.round(this.size[1]/2);
	}
};

gems.GemsManager = function (img1, img2, img3, gems_speed, create_rate, change_rate) {
	this.img1 = img1;
	this.img2 = img2;
	this.img3 = img3;
	this.gems_speed = gems_speed;
	this.base_create_rate = create_rate;
	this.create_rate = create_rate;
	this.change_rate = change_rate;
	
	this.direction = utilities.randInt(1,4);
	this.gems_list = [];
};

gems.GemsManager.prototype = {
	create_index: 0,
	change_index: 0,
	
	update : function (ticks) {
		this.create_index += this.create_rate/ticks;
		if (this.create_index >= 1) {
			this.create_index = 0;
			this.create_random_gem();
		}
		
		this.change_index += 1;
		if (this.change_index >= ticks*this.change_rate) {
			this.change_index = 0;
			this.randomize_direction();
		}
	},
	
	create_gem : function(x,y,ratio,speed) {
		rand_number = utilities.randInt(1,30);
		if (rand_number <= 10) {
			img = this.img1;
		} else if (rand_number > 10 && rand_number <= 20) {
			img = this.img2;
		} else if (rand_number > 20) {
			img = this.img3;
		}	

		this.gems_list.push( new gems.Gems(this, img, [x, y], ratio, speed));
	
	},
	
	create_random_gem : function() {
		rand_number = utilities.randInt(1,30);
		if (rand_number <= 10) {
			img = this.img1;
		} else if (rand_number > 10 && rand_number <= 20) {
			img = this.img2;
		} else if (rand_number > 20) {
			img = this.img3;
		}

		var example = new gems.Gems(0,0,[0,0],0,0);
		var width = example.size[0];
		var height = example.size[1];
		var halfwidth = Math.round(width/2);
		var halfheight = Math.round(height/2);
		
		switch (this.direction) {
			case 1:
				this.gems_list.push( new gems.Gems(this, img,
													  [utilities.randInt(0-halfwidth, 800-halfwidth), 0-(height+1)],
													  [0,1], this.rand_speed() ) );
				this.create_rate = this.base_create_rate;
				break;
			case 2:
				this.gems_list.push( new gems.Gems(this, img,
													  [801, utilities.randInt(0-halfheight, 600-halfheight)],
													  [-1,0], this.rand_speed() ) );
				this.create_rate = this.base_create_rate;
				break;
			case 3:
				this.gems_list.push( new gems.Gems(this, img,
													  [utilities.randInt(0-halfwidth, 800-halfwidth), 601],
													  [0,-1], this.rand_speed() ) );
				this.create_rate = this.base_create_rate;
				break;
			case 4:
				this.gems_list.push( new gems.Gems(this, img,
													  [0-(width+1), utilities.randInt(0-halfheight, 600-halfheight)],
													  [1,0], this.rand_speed() ) );
				this.create_rate = this.base_create_rate;
				break;
		} 
	},
	
	rand_speed : function() {
		return utilities.randInt( this.gems_speed*0.75, this.gems_speed*1.25 );
	},

	randomize_direction : function() {
		this.direction = utilities.randInt(1,4);
	},
	
	remove : function (who) {
		this.gems_list.splice(this.gems_list.indexOf(who),1);
	}
};

var menu = {};

menu.MainMenu = function(layers, settings) {
	this.layer_canvas = layers.canvas;
	this.layer_context = layers.context;
	this.background = settings.background;
};

menu.MainMenu.prototype = {

	entered : function() {
		this._get_html_elements();
		this._assign_events_to_elements();
		this._clear_layers();
		this._set_background();
		this._show_menu();
	},
	
	obscuring : function() {
		this._hide_menu();
	},

	revealed : function() {
		this._clear_layers();
		this._set_background();
		this._show_menu();
	},
	
	exiting : function() {},
	
	update : function(ticks) {},
	
	draw : function() {},

	_get_html_elements : function() {
		this.main_menu_container = document.getElementById("main_menu");
		this.strt_button = document.getElementById('startbutton');
		this.options_button = document.getElementById('optionsbutton');
		this.calibrate_button = document.getElementById('calibratebutton');
		this.instructions_button = document.getElementById('instructionsbutton');
	},
	
	_assign_events_to_elements : function() {
		this.strt_button.onclick = function() {game.state_manager.push_state("level");};
		this.options_button.onclick = function () {game.state_manager.push_state("options_menu");};
		this.calibrate_button.onclick = function () {game.state_manager.push_state("calibrate_menu");};
		this.instructions_button.onclick = function () {game.state_manager.push_state("instructions");};
	},
	
	_clear_layers : function() {
		for (i in this.layer_context) {
			this.layer_context[i].clearRect(0,0, this.layer_canvas.canvas0.width, this.layer_canvas.canvas0.height);
		}
	},
	
	_set_background : function() {
		this.layer_context.ctx0.fillStyle = "rgb("+this.background[0]+","+this.background[1]+","+this.background[2]+")";
		this.layer_context.ctx0.fillRect(0,0,800,600);
	},
	
	_show_menu : function() {
		this.main_menu_container.style.display = "block";
	},
	
	_hide_menu : function() {
		this.main_menu_container.style.display = "none";
	}
};

var optionsmenu = {};

optionsmenu.OptionsMenu = function(layers, options) {	
	this.layer_canvas = layers.canvas;
	this.layer_context = layers.context;
	this.background = options.background;
};

optionsmenu.OptionsMenu.prototype = {

	entered : function() {
		this._get_html_elements();
		this._assign_events_to_elements();
		this._add_listeners();
		this._clear_layers();
		this._set_background();
		this._update_form();
		this._show_menu();
	},
	
	obscuring : function() {},

	revealed : function() {},
	
	exiting : function() {
		this._hide_menu();
		this._remove_listeners();
		graphics.sound_volume(storage.get("SOUND"));
	},
	
	update : function(ticks) {},
		
	draw : function() {},

	process_keyup_callback : function(event) {
		if (event.keyCode === 27) { // ESC
			game.state_manager.pop_state();
		}
	},

	palette_click_callback : function() {
		if (this.radio_palette_rb.checked) {storage.set("PALETTE", this.radio_palette_rb.value);}
		if (this.radio_palette_pt.checked) {storage.set("PALETTE", this.radio_palette_pt.value);}
	},

	lens_click_callback : function() {
		if (this.radio_lens_both.checked) {storage.set("LENS", this.radio_lens_both.value);}
		if (this.radio_lens_red.checked) {storage.set("LENS", this.radio_lens_red.value);}
		if (this.radio_lens_blue.checked) {storage.set("LENS", this.radio_lens_blue.value);}
	},

	sound_click_callback : function() {
		if (this.radio_sound_on.checked) {storage.set("SOUND", this.radio_sound_on.value);}
		if (this.radio_sound_off.checked) {storage.set("SOUND", this.radio_sound_off.value);}
	},
	
	length_change_callback : function() {
		storage.set("LENGTH", parseInt(this.length_dropdown.value, 10));
	},
	
	speed_change_callback : function() {
		storage.set("SPEED", parseInt(this.speed_dropdown.value, 10));
	},
	
	_get_html_elements : function() {
		this.options_menu = document.getElementById("options_menu");
		this.radio_palette_rb = document.getElementById("radio_palette_rb");
		this.radio_palette_pt = document.getElementById("radio_palette_pt");
		this.radio_lens_both = document.getElementById("radio_lens_both");
		this.radio_lens_red = document.getElementById("radio_lens_red");
		this.radio_lens_blue = document.getElementById("radio_lens_blue");
		this.radio_sound_on = document.getElementById("radio_sound_on");
		this.radio_sound_off = document.getElementById("radio_sound_off");
		this.length_dropdown = document.getElementById("lengthdropdown");
		this.speed_dropdown = document.getElementById("speeddropdown");
		this.back_button = document.getElementById("backmenu");
	},

	_assign_events_to_elements : function() {
		this.radio_palette_rb.onclick = this.palette_click_callback.bind(this);
		this.radio_palette_pt.onclick = this.palette_click_callback.bind(this);
		this.radio_lens_both.onclick = this.lens_click_callback.bind(this);
		this.radio_lens_blue.onclick = this.lens_click_callback.bind(this);
		this.radio_lens_red.onclick = this.lens_click_callback.bind(this);
		this.radio_sound_on.onclick = this.sound_click_callback.bind(this);
		this.radio_sound_off.onclick = this.sound_click_callback.bind(this);
		this.length_dropdown.onchange = this.length_change_callback.bind(this);
		this.speed_dropdown.onchange = this.speed_change_callback.bind(this);
		this.back_button.onclick = function() {game.state_manager.pop_state();};
	},
	
	_add_listeners : function() {
		window.addEventListener('keyup', this.process_keyup_callback, false);
	},
	
	_remove_listeners : function() {
		window.removeEventListener('keyup', this.process_keyup_callback, false);
	},
		
	_clear_layers : function() {
		for (i in this.layer_context) {
			this.layer_context[i].clearRect(0,0, this.layer_canvas.canvas0.width, this.layer_canvas.canvas0.height);
		}
	},
	
	_set_background : function() {
		this.layer_context.ctx0.fillStyle = "rgb("+this.background[0]+","+this.background[1]+","+this.background[2]+")";
		this.layer_context.ctx0.fillRect(0,0,800,600);
	},
	
	_update_form : function () {
		switch(storage.get("PALETTE")) {
			case "REDBLUE":
				this.radio_palette_rb.checked = true;
				break;
			case "PURPTEAL":
				this.radio_palette_pt.checked = true;
				break;
		}
		
		switch(storage.get("LENS")) {
			case "BOTH":
				this.radio_lens_both.checked = true;
				break;
			case "RED":
				this.radio_lens_red.checked = true;
				break;
			case "BLUE":
				this.radio_lens_blue.checked = true;
				break;
		}
		
		switch(storage.get("SOUND")) {
			case "ON":
				this.radio_sound_on.checked = true;
				break;
			case "OFF":
				this.radio_sound_off.checked = true;
				break;
		}
		
		this.length_dropdown.value = (storage.get("LENGTH")).toString();
		this.speed_dropdown.value = (storage.get("SPEED")).toString();
	},
	
	_show_menu : function() {
		this.options_menu.style.display = "block";
	},
	
	_hide_menu : function() {
		this.options_menu.style.display = "none";
	}
	
};

var calibratemenu = {};

calibratemenu.CalibrateMenu = function(layers, options) {
	this.layer_canvas = layers.canvas;
	this.layer_context = layers.context;
	this.bg_color = options.background;
};

calibratemenu.CalibrateMenu.prototype = {
	
	entered : function() {
		this._get_html_elements();
		this._assign_events_to_elements();
		this._add_listeners();
		this._clear_layers();
		this._set_background();
		this._show_menu();
	},
	
	obscuring : function() {
		this._hide_menu();
		this._remove_listeners();
	},

	revealed : function() {
		this._add_listeners();
		this._clear_layers();
		this._set_background();
		this._show_menu();
	},
	
	exiting : function() {
		this._hide_menu();
		this._remove_listeners();
	},
	
	update : function(ticks) {},
		
	draw : function() {},

	process_keyup_callback : function(event) {
		if (event.keyCode === 27) { // ESC
			game.state_manager.pop_state();
		}
	},
	
	_get_html_elements : function() {
		this.calibrate_menu = document.getElementById("calibrate_menu");
		this.rb_button = document.getElementById("calrb");
		this.pt_button = document.getElementById("calpt");
		this.back_button = document.getElementById("backmenu2");
	},
	
	_assign_events_to_elements : function() {
		this.rb_button.onclick = function() {game.state_manager.push_state("calibrate_rb")}
		this.pt_button.onclick = function() {game.state_manager.push_state("calibrate_pt")}		
		this.back_button.onclick = function() {game.state_manager.pop_state();};
	},
	
	_add_listeners : function() {
		window.addEventListener('keyup', this.process_keyup_callback, false);
	},
	
	_remove_listeners : function() {
		window.removeEventListener('keyup', this.process_keyup_callback, false);
	},
		
	_clear_layers : function() {
		for (i in this.layer_context) {
			this.layer_context[i].clearRect(0,0, this.layer_canvas.canvas0.width, this.layer_canvas.canvas0.height);
		}
	},
	
	_set_background : function() {
		this.layer_context.ctx0.fillStyle = "rgb("+this.bg_color[0]+","+this.bg_color[1]+","+this.bg_color[2]+")";
		this.layer_context.ctx0.fillRect(0,0,800,600);
	},

	_show_menu : function() {
		this.calibrate_menu.style.display = "block";
	},
	
	_hide_menu : function() {
		this.calibrate_menu.style.display = "none";
	},
};

var calibratept = {};

calibratept.CalibratePT = function(layers, options) {
	this.layer_canvas = layers.canvas;
	this.layer_context = layers.context;
	this.bg_color = options.background;
};

calibratept.CalibratePT.prototype = {
	
	entered : function() {
		this._get_html_elements();
		this._assign_events_to_elements();
		this._clear_layers();
		this._set_background();
		this._show_menu(1);
		this._hide_menu(2);
		this._reset_values();
	},
	
	obscuring : function() {},

	revealed : function() {},
	
	exiting : function() {
		this._set_globals();
		this._redraw_graphics();	
		this._hide_menu(1);
		this._hide_menu(2);
	},
	
	update : function(ticks) {},
		
	draw : function() {
		var vlu1 = this.pt1_slider.value;
		var vlu2 = this.pt2_slider.value;
		
		this.pt1_context.clearRect(0,0, this.pt1_canvas.width, this.pt1_canvas.height);
		this.pt1_context.fillStyle = "rgb(127,127,127)";
		this.pt1_context.fillRect(0,0, this.pt1_canvas.width, this.pt1_canvas.height);
		this._draw_squares(this.pt1_context, "rgb("+vlu1+",0,"+vlu1+")");
		
		this.pt2_context.clearRect(0,0, this.pt2_canvas.width, this.pt2_canvas.height);
		this.pt2_context.fillStyle = "rgb(127,127,127)";
		this.pt2_context.fillRect(0,0, this.pt2_canvas.width, this.pt2_canvas.height);
		this._draw_squares(this.pt2_context, "rgb(0,"+vlu2+","+vlu2+")");
	},

	_draw_squares : function(context, stroke_style) {
		context.strokeStyle = stroke_style;		

		context.beginPath();		
		context.lineWidth = "4";		
		context.rect(35,20,30,30);
		context.rect(335,20,30,30);		
		context.stroke();		
		
		context.beginPath();
		context.lineWidth = "6";	
		context.rect(95,20,30,30);
		context.rect(275,20,30,30);
		context.stroke();	

		context.beginPath();		
		context.lineWidth = "8";		
		context.rect(155,20,30,30);	
		context.rect(215,20,30,30);		
		context.stroke();
	},
	
	_get_html_elements : function() {
		this.pt_step1 = document.getElementById("pt1");
		this.pt1_slider = document.getElementById("pt1slider");
		this.pt1_canvas = document.getElementById("pt1sq");
		this.pt1_context = this.pt1_canvas.getContext("2d");
		this.next1_button = document.getElementById("pt1next");		
		
		this.pt_step2 = document.getElementById("pt2");
		this.pt2_slider = document.getElementById("pt2slider");
		this.pt2_canvas = document.getElementById("pt2sq");
		this.pt2_context = this.pt2_canvas.getContext("2d");
		this.finished_button = document.getElementById("ptfinished");
	},
	
	_assign_events_to_elements : function() {	
		this.next1_button.onclick = (function() {this._hide_menu(1); this._show_menu(2);}).bind(this);		
		this.finished_button.onclick = function() {game.state_manager.pop_state();};
	},
	
	_clear_layers : function() {
		for (i in this.layer_context) {
			this.layer_context[i].clearRect(0,0, this.layer_canvas.canvas0.width, this.layer_canvas.canvas0.height);
		}
	},
	
	_set_background : function() {
		this.layer_context.ctx0.fillStyle = "rgb("+this.bg_color[0]+","+this.bg_color[1]+","+this.bg_color[2]+")";
		this.layer_context.ctx0.fillRect(0,0,800,600);
	},

	_show_menu : function(number) {
		switch(number) {
			case 1:
				this.pt_step1.style.display = "block";
				break;
			case 2:
				this.pt_step2.style.display = "block";
				break;
		}
	},

	_hide_menu : function(number) {
		switch(number) {
			case 1:
				this.pt_step1.style.display = "none";
				break;
			case 2:
				this.pt_step2.style.display = "none";
				break;
		}
	},	

	_reset_values : function() {
		this.pt1_slider.value = 255;
		this.pt2_slider.value = 255;
	},

	_set_globals : function() {
		var vlu1 = this.pt1_slider.value;
		var vlu2 = this.pt2_slider.value;
		storage.set("PURPLE", [vlu1,0,vlu1,255]);		
		storage.set("TEAL", [0,vlu2,vlu2,255]);
	},
	
	_redraw_graphics : function() {
		graphics.draw("PURPTEAL");
		graphics.colorize("PURPTEAL");
	}
};

var calibraterb = {};

calibraterb.CalibrateRB = function(layers, options) {
	this.layer_canvas = layers.canvas;
	this.layer_context = layers.context;
	this.bg_color = options.background;
};

calibraterb.CalibrateRB.prototype = {
	
	entered : function() {
		this._get_html_elements();
		this._assign_events_to_elements();
		this._clear_layers();
		this._set_background();
		this._show_menu1();
		this._hide_menu2();
		this._reset_values();
	},
	
	obscuring : function() {},

	revealed : function() {},
	
	exiting : function() {
		this._set_globals();
		this._redraw_graphics();
		this._hide_menu1();
		this._hide_menu2();
	},
	
	update : function(ticks) {},
		
	draw : function() {
		var vlu1 = this.rb1_slider.value;
		var vlu2 = this.rb2_slider.value;
		
		this.rb1_context.clearRect(0,0, this.rb1_canvas.width, this.rb1_canvas.height);
		this.rb1_context.fillStyle = "rgb(0,0,255)";
		this.rb1_context.fillRect(0,0, this.rb1_canvas.width, this.rb1_canvas.height);
		this._draw_squares(this.rb1_context, "rgb("+vlu1+","+vlu1+","+vlu1+")");
		
		this.rb2_context.clearRect(0,0, this.rb2_canvas.width, this.rb2_canvas.height);
		this.rb2_context.fillStyle = "rgb("+vlu1+","+vlu1+","+vlu1+")";
		this.rb2_context.fillRect(0,0, this.rb2_canvas.width, this.rb2_canvas.height);
		this._draw_squares(this.rb2_context, "rgb("+vlu2+",0,0)");
	},
	
	_draw_squares : function(context, stroke_style) {
		context.strokeStyle = stroke_style;		

		context.beginPath();		
		context.lineWidth = "4";		
		context.rect(35,20,30,30);
		context.rect(335,20,30,30);		
		context.stroke();		
		
		context.beginPath();
		context.lineWidth = "6";	
		context.rect(95,20,30,30);
		context.rect(275,20,30,30);
		context.stroke();	

		context.beginPath();		
		context.lineWidth = "8";		
		context.rect(155,20,30,30);	
		context.rect(215,20,30,30);		
		context.stroke();
	},
	
	_get_html_elements : function() {
		this.rb_step1 = document.getElementById("rb1");
		this.rb1_slider = document.getElementById("rb1slider");
		this.rb1_canvas = document.getElementById("rb1sq");
		this.rb1_context = this.rb1_canvas.getContext("2d");
		this.next_button = document.getElementById("rbnext");
		
		this.rb_step2 = document.getElementById("rb2");
		this.rb2_slider = document.getElementById("rb2slider");
		this.rb2_canvas = document.getElementById("rb2sq");
		this.rb2_context = this.rb2_canvas.getContext("2d");
		this.finished_button = document.getElementById("rbfinished");
	},
	
	_assign_events_to_elements : function() {
		this.next_button.onclick = (function() {this._hide_menu1(); this._show_menu2();}).bind(this);	
		this.finished_button.onclick = function() {game.state_manager.pop_state();};
	},
	
	_clear_layers : function() {
		for (i in this.layer_context) {
			this.layer_context[i].clearRect(0,0, this.layer_canvas.canvas0.width, this.layer_canvas.canvas0.height);
		}
	},
	
	_set_background : function() {
		this.layer_context.ctx0.fillStyle = "rgb("+this.bg_color[0]+","+this.bg_color[1]+","+this.bg_color[2]+")";
		this.layer_context.ctx0.fillRect(0,0,800,600);
	},

	_show_menu1 : function() {
		this.rb_step1.style.display = "block";
	},
	
	_show_menu2 : function() {
		this.rb_step2.style.display = "block";
	},
	
	_hide_menu1 : function() {
		this.rb_step1.style.display = "none";
	},

	_hide_menu2 : function() {
		this.rb_step2.style.display = "none";
	},
	
	_reset_values : function() {
		this.rb1_slider.value = 127;
		this.rb2_slider.value = 255;
	},
	
	_set_globals : function() {
		var vlu1 = this.rb1_slider.value;
		var vlu2 = this.rb2_slider.value;
		storage.set("BLACKISH", [vlu1, vlu1, vlu1, 255]);
		storage.set("RED", [vlu2, 0, 0, 255]);
	},
	
	_redraw_graphics : function() {
		graphics.draw("REDBLUE");
		graphics.colorize("REDBLUE");
	}
};

var instructions = {};

instructions.Instructions = function(layers, options) {
	this.layer_canvas = layers.canvas;
	this.layer_context = layers.context;
	this.bg_color = options.background;
};

instructions.Instructions.prototype = {
	
	entered : function() {
		this._get_html_elements();
		this._assign_events_to_elements();
		this._add_listeners();
		this._clear_layers();
		this._set_background();
		this._show_menu();
	},
	
	obscuring : function() {
		this._hide_menu();
		this._remove_listeners();
	},

	revealed : function() {
		this._add_listeners();
		this._clear_layers();
		this._set_background();
		this._show_menu();
	},
	
	exiting : function() {
		this._hide_menu();
		this._remove_listeners();
	},
	
	update : function(ticks) {},
		
	draw : function() {},

	process_keyup_callback : function(event) {
		if (event.keyCode === 27) { // ESC
			game.state_manager.pop_state();
		}
	},
	
	_get_html_elements : function() {
		this.instructions_menu = document.getElementById("instructions");
		this.back_button = document.getElementById("backmenu3");
	},
	
	_assign_events_to_elements : function() {	
		this.back_button.onclick = function() {game.state_manager.pop_state();};
	},
	
	_add_listeners : function() {
		window.addEventListener('keyup', this.process_keyup_callback, false);
	},
	
	_remove_listeners : function() {
		window.removeEventListener('keyup', this.process_keyup_callback, false);
	},
		
	_clear_layers : function() {
		for (i in this.layer_context) {
			this.layer_context[i].clearRect(0,0, this.layer_canvas.canvas0.width, this.layer_canvas.canvas0.height);
		}
	},
	
	_set_background : function() {
		this.layer_context.ctx0.fillStyle = "rgb("+this.bg_color[0]+","+this.bg_color[1]+","+this.bg_color[2]+")";
		this.layer_context.ctx0.fillRect(0,0,800,600);
	},

	_show_menu : function() {
		this.instructions_menu.style.display = "block";
	},
	
	_hide_menu : function() {
		this.instructions_menu.style.display = "none";
	},
};

var load = {};

load.Load = function(layers, options) {
	this.layer_canvas = layers.canvas;
	this.layer_context = layers.context;
	this.bg_color = options.background;
};

load.Load.prototype = {
	
	entered : function() {
		this._get_html_elements();
		this._clear_layers();
		this._set_background();
		this._show_menu();
		graphics.load_assets( function(){game.state_manager.push_state("main_menu");} );
	},
	
	obscuring : function() {
		this._hide_menu();
	},
		
	update : function(ticks) {},
		
	draw : function() {},
	
	_get_html_elements : function() {
		this.load_menu = document.getElementById("loading");
	},
				
	_clear_layers : function() {
		for (i in this.layer_context) {
			this.layer_context[i].clearRect(0,0, this.layer_canvas.canvas0.width, this.layer_canvas.canvas0.height);
		}
	},
	
	_set_background : function() {
		this.layer_context.ctx0.fillStyle = "rgb("+this.bg_color[0]+","+this.bg_color[1]+","+this.bg_color[2]+")";
		this.layer_context.ctx0.fillRect(0,0,800,600);
	},

	_show_menu : function() {
		this.load_menu.style.display = "block";
	},
	
	_hide_menu : function() {
		this.load_menu.style.display = "none";
	},
};

var pause = {};

pause.Pause = function(layers) {	
	this.layer_canvas = layers.canvas;
	this.layer_context = layers.context;
};

pause.Pause.prototype = {

	bg_color : [192,192,192,0.5],

	entered : function() {
		this._get_html_elements();
		this._assign_events_to_elements();
		this._add_listeners();
		//this._set_background();
		this._show_menu();
	},
	
	obscuring : function() {},

	revealed : function() {},
	
	exiting : function() {
		this._hide_menu();
		this._remove_listeners();
		this._clear_layer();
	},
	
	update : function(ticks) {},
		
	draw : function() {},

	process_keyup_callback : function(event) {
		if (event.keyCode === 27) { // ESC
			game.state_manager.pop_state();
		}
	},
	
	_get_html_elements : function() {
		this.pause_menu = document.getElementById("pause_menu");
		this.continue_button = document.getElementById("continuebutton");
		this.quit_button = document.getElementById("quitbutton");
	},

	_assign_events_to_elements : function() {
		this.continue_button.onclick = function() {game.state_manager.pop_state();};
		this.quit_button.onclick = function() {game.state_manager.pop_state(); game.state_manager.pop_state();};	
	},
	
	_add_listeners : function() {
		window.addEventListener('keyup', this.process_keyup_callback, false);
	},
	
	_remove_listeners : function() {
		window.removeEventListener('keyup', this.process_keyup_callback, false);
	},

	_set_background : function() {
		this.layer_context.ctx3.fillStyle = "rgba("+this.bg_color[0]+","+this.bg_color[1]+","+this.bg_color[2]+","+this.bg_color[3]+")";
		this.layer_context.ctx3.fillRect(0,0,800,600);
	},
	
	_show_menu : function() {
		this.pause_menu.style.display = "block";	
	},
	
	_hide_menu : function() {
		this.pause_menu.style.display = "none";
	},
	
	_clear_layer : function() {
		this.layer_context.ctx3.clearRect(0,0, this.layer_canvas.canvas3.width, this.layer_canvas.canvas3.height);
	}
};

var end = {};

end.End = function(layers) {	
	this.layer_canvas = layers.canvas;
	this.layer_context = layers.context;
};

end.End.prototype = {

	bg_color : [192,192,192,0.5],

	entered : function() {
		this._get_html_elements();
		this._assign_events_to_elements();
		this._add_listeners();
		//this._set_background();
		this._update_info();
		this._show_menu();
	},
	
	obscuring : function() {},

	revealed : function() {},
	
	exiting : function() {
		this._hide_menu();
		this._remove_listeners();
		this._clear_layer();
	},
	
	update : function(ticks) {},
		
	draw : function() {},

	process_keyup_callback : function(event) {
		if (event.keyCode === 27) { // ESC
			game.state_manager.pop_state();
			game.state_manager.pop_state();
		}
	},
	
	_get_html_elements : function() {
		this.end_menu = document.getElementById("end_menu");
		this.again_button = document.getElementById("againbutton");
		this.quit_button = document.getElementById("quit2button");
	},

	_assign_events_to_elements : function() {
		this.again_button.onclick = function() {game.state_manager.pop_state(); game.state_manager.pop_state(); game.state_manager.push_state("level")};
		this.quit_button.onclick = function() {game.state_manager.pop_state(); game.state_manager.pop_state();};	
	},
	
	_update_info : function() {
		document.getElementById("finalspeed").innerHTML = storage.get("SPEED");
		document.getElementById("finallength").innerHTML = Math.floor(storage.get("LENGTH")/60) + " min";
		document.getElementById("finalscore").innerHTML = SCORE;
	},
	
	_add_listeners : function() {
		window.addEventListener('keyup', this.process_keyup_callback, false);
	},
	
	_remove_listeners : function() {
		window.removeEventListener('keyup', this.process_keyup_callback, false);
	},

	_set_background : function() {
		this.layer_context.ctx3.fillStyle = "rgba("+this.bg_color[0]+","+this.bg_color[1]+","+this.bg_color[2]+","+this.bg_color[3]+")";
		this.layer_context.ctx3.fillRect(0,0,800,600);
	},
	
	_show_menu : function() {
		this.end_menu.style.display = "block";	
	},
	
	_hide_menu : function() {
		this.end_menu.style.display = "none";
	},
	
	_clear_layer : function() {
		this.layer_context.ctx3.clearRect(0,0, this.layer_canvas.canvas3.width, this.layer_canvas.canvas3.height);
	}
};

