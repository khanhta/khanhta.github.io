var TERP_CONST = {};

function Lexer(text) { 
	var listRegex = /(?:(?:['`"])(?:\\.|[^"'`])*['`"]|(?:\s[<>])|[^;<>])+|([;<>])/g; /* split by unquoted semicolon */
	var list = text.replace(/\n/g, ";").match(listRegex);
	var next = -1;
	var listIndex = -1;
	var words = nextList();

	function nextList() {
		if (listIndex < list.length - 1) {
			listIndex++;
			var newList = list[listIndex].split(/\s+/);
			return newList;
		} else {
			return null;
		}
	}
	this.nextWord = function() {
		if (next < words.length - 1) {
			next++;
			if ((words[next] === null) || (words[next] === "")) {
				return this.nextWord();
			}
			return words[next];
		} else if (appendWords = nextList()) {
			words = words.concat(appendWords);
			next++;
			if ((words[next] === null) || (words[next] === "")) {
				return this.nextWord();
			}
			return words[next];
		} else {
			return null;
		}
	};
	this.moveBack = function(index) {
		if (typeof(index) === "number") {
			if (index === -1) {
				next = words.length;
				listIndex = list.length;
			} else {
				next = index;
			}
		} else {
			next--;
		}
	};
	this.currentIndex = function() {
		return next;
	};
	this.splitWord = function(splitIndex, delimiter) {
		var currentWord = words[next];
		var curIndex = next + 1;
		var tokens;
		if (splitIndex === -1) {
			tokens = currentWord.split(delimiter);
			for (var k = 0; k < tokens.length; k++) {
				if (tokens[k].length != 0) {
					words.splice(curIndex++, 0, tokens[k]);
				}
			}
			words.splice(next, 1);
		} else {
			words[next] = currentWord.slice(0, splitIndex);
			var rest = currentWord.slice(splitIndex + delimiter);
			tokens = [words[next], rest];
			if (rest.length != 0) {
				words.splice(next + 1, 0, rest);
			}
		}
		return tokens;
	};
	this.getTokens = function(startIndex, endIndex) {
		return words.slice(startIndex, endIndex).join(" ");
	};
}

function getKeyWordDict() {
	var keyWordDict = {};

	function addKeyWord(newdict) {
		for (var word in newdict) {
			if (word in keyWordDict) {
				displayer.display("INFO", "Existing keyword. Not add again.");
			} else {
				keyWordDict[word] = newdict[word];
			}
		}
	};
	addKeyWord(TERP_CONST["print_dict"]);
	addKeyWord(TERP_CONST["math_dict"]);
	addKeyWord(TERP_CONST["comment_words_dict"]);
	addKeyWord(TERP_CONST["variable_dict"]);
	addKeyWord(TERP_CONST["logic_exp_dict"]);
	addKeyWord(TERP_CONST["control_dict"]);
	addKeyWord(TERP_CONST["function_dict"]);
	addKeyWord(TERP_CONST["metacharacter"]);
	addKeyWord(TERP_CONST["file"]);
	return keyWordDict;
}

function Action(terp, name, start, end) {
	this.terp = terp;
	this.name = name;
	this.start = start;
	this.end = end;
}

function Parser(displayer, new_keyWordDict, shellName) {
	this.keyWordDict = new_keyWordDict;
	this.variable = {};
	this.posParams = {};
	this.posParams["$0"] = shellName;
	this.posParams["$?"] = 0;
	this.posParams["$!"] = "Process ID of last background job";
	this.stack = [];
	this.localStack = [];
	this.lexer;
	this.displayer = displayer;
	var ended = false;
	this.initWithParentVar = function(parentVar) {
		for (var word in parentVar) {
			this.variable[word] = parentVar[word];
		}
	};
	this.setPositionalParam = function(params) {
		this.posParams["$#"] = params.length;
		this.posParams["$@"] = params;
		this.posParams["$*"] = params.join(" ");
		for (var k = 0; k < params.length; k++) {
			this.posParams["$" + (k + 1)] = params[k];
		}
	};
	this.setLatestExitCode = function(code) {
		this.posParams["$?"] = code;
	};
	this.updateWithChildVar = function(childVar) {
		for (var word in childVar) {
			if (word in this.variable) {
				this.variable[word] = childVar[word];
			}
		}
	};
	this.break = function() {
		ended = true;
	};
	this.continue = function() {
		this.lexer.moveBack(-1);
	};
	this.exit = function() {
		ended = true;
	};
	this.isEnd = function() {
		return ended;
	};
	this.define = function(name, val) {
		if (typeof(val) != "function") {
			name = "$" + name;
			if (name in this.variable) {
				displayer.display("INFO", 
				"Variable " + name + " has already been defined! Old value: " + this.keyWordDict[name] + ", new value: " + val);
			}
			this.variable[name] = val;
		} else {
			if (name in this.keyWordDict) {
				displayer.display("ERROR", "Function " + name + " has already been defined!");
			}
			this.keyWordDict[name] = val;
		}
	};

	function getNumOrString(name, value) {
		if (typeof(value) === "undefined") {
			displayer.display("WARNING", "Variable " + name + " has not been defined.");
			return "";
		}
		if ((!isNaN(num = parseFloat(value))) && (num == value)) { /* check num == value to confirm that the string representation is same as parsed*/
			return num;
		} else {
			return value;
		}
	}
	this.fetch = function(name) {
		var prefix = name.slice(0, 1);
		if ("$" === prefix) {
			if ((!isNaN(index = name.slice(1))) || (["*", "#", "@", "?", "!"].indexOf(index) > -1)) {
				return getNumOrString(name, this.posParams[name]);
			} else {
				return getNumOrString(name, this.variable[name]);
			}
		} else {
			return getNumOrString(name, name);
		}
	};
	this.run = function(text, test_func, test_name, expected) {
		this.lexer = new Lexer(text);
		var word;
		var num;
		while ((word = this.lexer.nextWord()) && !ended) {
			if (this.keyWordDict[word]) {
				this.keyWordDict[word](this);
			} else if (num = parseFloat(word)) {
				this.stack.push(num);
			} else if (word.search(/=/) > -1) { /*check if this is variable assignment */
				this.lexer.moveBack();
				this.keyWordDict["export"](this);
			} else {
				this.displayer.display("ERROR", "Unknown token " + word);
			}
		}
		if (test_func) {
			if (TERP_VAR.actionStack.length != 0) {
				this.displayer.display("ERROR", "Statements unclosed " + TERP_VAR.actionStack.pop().name);
			}
			test_func(test_name, this, expected);
		}
	};
	this.splitTokens = function(splitIndex, delimiter) {
		var tokens = this.lexer.splitWord(splitIndex, delimiter);
		for (var k = 0; k < tokens.length; k++) {
			if (num = parseFloat(tokens[k])) {
				this.stack.push(num);
			}
		}
	};
}

function string_resolve(terp, delimiter, next_word) {
	if ((typeof(next_word) === "number") || (typeof(next_word) === "object") || (next_word.search(/["`'\$]/) === -1)) {
		return next_word;
	}
	if ("'".search(delimiter) > -1) {
		terp.displayer.display("INFO", 
		"variable is not resolved due to '. ' escapes all variable inside. If you intend to resolve the variable, use \" instead");
		return next_word;
	}
	if (["\"", "'", "`"].indexOf(next_word.slice(0, 1)) > -1) {
		string_word_func(terp);
		return terp.stack.getTop();
	}
	var collector = "";
	var vars = next_word.split(/(\$[a-zA-Z0-9_]+)/);
	for (var k = 0; k < vars.length; k++) {
		if (vars[k].length != 0) {
			collector += string_resolve(terp, delimiter, terp.fetch(vars[k]));
		}
	}
	return collector; /* TODO: resolve inner shell i.e. `date` */
}

function string_word_func(terp, continuedDelimiter, midWord) {
	var collector = "";
	var done = false;
	var next_word;
	if (typeof(continuedDelimiter) != "undefined" && midWord) {
		delimiter = new RegExp(continuedDelimiter);
		next_word = midWord;
	} else {
		next_word = terp.lexer.nextWord();
		var delimiter = next_word.slice(0, 1);
		if (["\"", "'", "`"].indexOf(delimiter) < 0) {
			delimiter = /[;\n]/; /* read till the end */
		} else {
			delimiter = new RegExp(delimiter);
			next_word = next_word.slice(1);
		}
	}
	do {
		if (next_word === null) {
			terp.displayer.display("ERROR", "Unexpected end of input");
		}
		var delimiterIndex = next_word.search(delimiter);
		if (delimiterIndex > -1) {
			next_word = next_word.slice(0, delimiterIndex);
			collector += string_resolve(terp, delimiter, next_word);
			done = true;
		} else { /* analyze if next_word need to be resolved */
			collector += string_resolve(terp, delimiter, next_word);
			collector += " ";
		}
		if (!done) {
			var next_word = terp.lexer.nextWord();
		}
	} while (!done);
	terp.stack.push(collector);
}
TERP_CONST["comment_words_dict"] = {
	"#": function(terp) {
		do {
			var next_word = terp.lexer.nextWord();
			if (next_word === null) {
				terp.displayer.display("ERROR", "Unexpected end of input");
			}
		} while (next_word.substr(-1, 1) != "\n" && next_word.substr(-1, 1) != ";");
	},
	";": function(terp) {
		return;
	}
};
TERP_CONST["print_dict"] = {
	"print": function(terp) {
		string_word_func(terp);
		terp.displayer.display("OUTPUT", terp.stack.pop().trim());
	},
	"echo": function(terp) {
		string_word_func(terp);
		terp.displayer.display("OUTPUT", terp.stack.pop().trim());
	}
};
TERP_CONST["metacharacter"] = {
	">": function(terp) {},
	"<": function(terp) {},
	"|": function(terp) {},
	"&": function(terp) {}
};
TERP_CONST["file"] = {
	"ls": function(terp) {}
};

function let (terp) { 
/* inside trivial calculation, $ is optional */ 
/* assumption: space between '((' and expression, and expression and '))' i.e. (( expression ));  */
	var next_word = terp.lexer.nextWord();
	var delimiter = /([a-zA-Z0-9_$]+)/;
	var tokens = next_word.split(delimiter);
	terp.stack.push(tokens[1]);
	terp.stack.push("((");
	var curr = terp.fetch("$" + tokens[1]);
	if (typeof(curr) != "number") {
		terp.fetch(tokens[1]);
	}
	terp.stack.push(curr);
	terp.splitTokens(-1, delimiter);
}
TERP_CONST["math_dict"] = { /* TODO: handle parenthenses, order multiplication/division higher than addition/subtraction */
	"+": function(terp) {
		terp.stack.push(parseFloat(terp.lexer.nextWord()));
		if (terp.stack.length < 2) {
			terp.displayer.display("ERROR", "Not enough numbers");
		}
		var top_arg1 = terp.stack.pop();
		var top_arg2 = terp.stack.pop();
		terp.stack.push(top_arg2 + top_arg1);
	},
	"-": function(terp) {
		terp.stack.push(parseFloat(terp.lexer.nextWord()));
		if (terp.stack.length < 2) {
			terp.displayer.display("ERROR", "Not enough numbers");
		}
		var top_arg1 = terp.stack.pop();
		var top_arg2 = terp.stack.pop();
		terp.stack.push(top_arg2 - top_arg1);
	},
	"*": function(terp) {
		terp.stack.push(parseFloat(terp.lexer.nextWord()));
		if (terp.stack.length < 2) {
			terp.displayer.display("ERROR", "Not enough numbers");
		}
		var top_arg1 = terp.stack.pop();
		var top_arg2 = terp.stack.pop();
		terp.stack.push(top_arg2 * top_arg1);
	},
	"/": function(terp) {
		terp.stack.push(parseFloat(terp.lexer.nextWord()));
		if (terp.stack.length < 2) {
			terp.displayer.display("ERROR", "Not enough numbers");
		}
		var top_arg1 = terp.stack.pop();
		var top_arg2 = terp.stack.pop();
		terp.stack.push(top_arg2 / top_arg1);
	},
	"++": function(terp) {
		terp.displayer.display("INFO", "++ is not available in KSH. Make sure you use /usr/bin/ksh93");
		var top_arg1 = terp.stack.pop();
		terp.stack.push(parseInt(top_arg1) + 1);
	},
	"--": function(terp) {
		terp.displayer.display("INFO", "-- is not available in KSH. Make sure you use /usr/bin/ksh93");
		var top_arg1 = terp.stack.pop();
		terp.stack.push(parseInt(top_arg1) - 1);
	},
	"+=": function(terp) {
		var top_arg1 = terp.stack.pop();
		var top_arg2 = terp.lexer.nextWord();
		terp.stack.push(parseInt(top_arg1) + parseInt(top_arg2));
	},
	"-=": function(terp) {
		var top_arg1 = terp.stack.pop();
		var top_arg2 = terp.lexer.nextWord();
		terp.stack.push(parseInt(top_arg1) - parseInt(top_arg2));
	},
	"((": let,
	"$((": let,
	"))": function(terp) {
		var val = terp.stack.pop();
		while ((tos = terp.stack.pop()) != "((") {
			if (terp.stack.length === 0) {
				terp.displayer.display("ERROR", "Can't find '((' that matched with '))'");
			}
		}
		var var1 = terp.stack.pop();
		terp.define(var1, val);
	},
	"let": let
};

function compare(terp, operator, var1, var2) {
	var1 = terp.fetch(var1);
	var2 = terp.fetch(var2);
	switch (operator) {
		case "-eq":
			if (isNaN(var1) || isNaN(var2)) {
				terp.displayer.display("ERROR", "Invalid comparison. -eq can only compare number. Got " + var1 + " " + var2);
				break;
			}
		case "=":
			terp.stack.push(var1 === var2);
			break;
		case "-ne":
			if (isNaN(var1) || isNaN(var2)) {
				terp.displayer.display("ERROR", "Invalid comparison. -ne can only compare number. Got " + var1 + " " + var2);
				break;
			}
		case "!=":
			terp.stack.push(var1 != var2);
			break;
		case "-gt":
			if (isNaN(var1) || isNaN(var2)) {
				terp.displayer.display("ERROR", "Invalid comparison. -gt can only compare number. Got " + var1 + " " + var2);
				break;
			}
		case ">":
			terp.stack.push(var1 > var2);
			break;
		case "-lt":
			if (isNaN(var1) || isNaN(var2)) {
				terp.displayer.display("ERROR", "Invalid comparison. -lt can only compare number. Got " + var1 + " " + var2);
				break;
			}
		case "<":
			terp.stack.push(var1 < var2);
			break;
		default:
			terp.displayer.display("ERROR", "Invalid operator " + operator);
			break;
	}
}

function doubleSquareBrackets(terp) {
	var var1, operator, var2;
	if (((var1 = terp.lexer.nextWord()) === null) || ((operator = terp.lexer.nextWord()) === null) || ((var2 = terp.lexer.nextWord()) === null)) {
		terp.displayer.display("ERROR", "Invalid logical expression. Expected format: var1 op var2.");
	} else {
		compare(terp, operator, var1, var2);
		var next_word = terp.lexer.nextWord();
		if (next_word === "]]") {
			return;
		}
		if (next_word === "||") {
			return terp.stack.getTop() || doubleSquareBrackets(terp);
		}
		if (next_word === "&&") {
			return terp.stack.getTop() && doubleSquareBrackets(terp);
		}
		terp.displayer.display("ERROR", "Unexpected end of logical expression " + next_word);
	}
}
TERP_CONST["logic_exp_dict"] = {
	"[[": doubleSquareBrackets,
	"test": function(terp) {},
	"[": function(terp) {},
	"||": function(terp) {
		if (terp.stack.pop()) {}
	}
};
TERP_CONST["variable_dict"] = {
	"export": function(terp) {
		var assignment = terp.lexer.nextWord();
		var tokens = assignment.split("=");
		if (tokens.length < 2) {
			terp.displayer.display("ERROR", "Invalid syntax. Syntax must be varname=varvalue (no space in between)");
		}
		var delimiterIndex = tokens[1].search(/["`"]/);
		var endStatementIndex = tokens[1].indexOf(";"); /* this is not the confirmed end semicolon, have to check below */
		var val = tokens[1];
		if (delimiterIndex > -1) {
			val = val.slice(0, delimiterIndex);
			var delimiter = tokens[1].slice(delimiterIndex, 1);
			var endDelimiterIndex = tokens[1].indexOf(delimiter, delimiterIndex + 1);
			var restOfVal = tokens[1].slice(delimiterIndex + 1);
			if (endDelimiterIndex > -1 && endDelimiterIndex < endStatementIndex) { /* semicolon is after closing quote -> split statement at semicolon */
				restOfVal = tokens[1].slice(delimiterIndex + 1, endStatementIndex - delimiterIndex);
				terp.splitTokens(tokens[0].length + "=".length + endStatementIndex, ";".length);
			}
			string_word_func(terp, tokens[1].charAt(delimiterIndex), restOfVal);
			val += terp.stack.getTop();
		} else if (endStatementIndex > -1) {
			val = val.slice(0, endStatementIndex);
			terp.splitTokens(tokens[0].length + "=".length + endStatementIndex, ";".length);
		}
		terp.define(tokens[0], val);
	}
};

function iterate(terp) {
	var list = [];
	while ([";", "do"].indexOf(next = terp.lexer.nextWord()) < 0) {
		if (typeof(l = terp.fetch(next)) === "object") {
			list = list.concat(l);
		} else {
			list.push(next);
		}
	}
	return list;
}

function getDoDoneStatements(terp) {
	while ((next = terp.lexer.nextWord()) != "do") {
		if (next === null) {
			terp.displayer.display("ERROR", "Missing DO keyword after loop condition");
		}
	}
	var startStatementIndex = terp.lexer.currentIndex();
	var do_done_count = 1;
	while (true) {
		var next = terp.lexer.nextWord();
		if (next === "do") {
			do_done_count++;
		} else if (next === "done") {
			do_done_count--;
		}
		if (do_done_count === 0) {
			break;
		}
	}
	var endStatementIndex = terp.lexer.currentIndex();
	return terp.lexer.getTokens(startStatementIndex + 1, endStatementIndex);
}

function conditionalLoop(terp, type) {
	var openBracket = terp.lexer.nextWord();
	var loopStartIndex = terp.lexer.currentIndex();
	if (openBracket in terp.keyWordDict) {
		terp.keyWordDict[openBracket](terp);
	} else {
		terp.displayer.display("ERROR", "Expect logical expression " + openBracket);
	}
	var condition = terp.lexer.getTokens(loopStartIndex, terp.lexer.currentIndex() + 1);
	var doDoneStatements = getDoDoneStatements(terp);
	var loopEndIndex = terp.lexer.currentIndex();
	var stopCondition;
	switch (type) {
		case "WHILE":
			stopCondition = true;
			TERP_VAR.actionStack.push(new Action(terp, "WHILE", loopStartIndex, loopEndIndex));
			break;
		case "UNTIL":
			stopCondition = false;
			TERP_VAR.actionStack.push(new Action(terp, "UNTIL", loopStartIndex, loopEndIndex));
			break;
	}
	var childTerp = new Parser(terp.displayer, terp.keyWordDict);
	childTerp.initWithParentVar(terp.variable);
	childTerp.run(condition);
	while (childTerp.stack.pop() === stopCondition) {
		childTerp.run(doDoneStatements);
		childTerp.run(condition);
	}
	terp.updateWithChildVar(childTerp.variable);
	TERP_VAR.actionStack.pop();
}

function doBranch(terp, condition, expectedEnd) {
	var curIndex;
	if (terp.stack.getTop() === condition) {
		curIndex = terp.lexer.currentIndex();
	}
	while ((next_word = terp.lexer.nextWord()) != null) {
		if (expectedEnd.indexOf(next_word) > -1) {
			terp.lexer.moveBack(curIndex);
			return;
		}
	}
	terp.displayer.display("ERROR", "Expect " + expectedEnd.join("/"));
}
TERP_CONST["control_dict"] = {
	"if": function(terp) {
		terp.stack.push("IF");
		TERP_VAR.actionStack.push(new Action(terp, "IF"));
	},
	"then": function(terp) {
		if (TERP_VAR.actionStack.getTop().name === "IF") {
			doBranch(terp, true, ["else", "fi"]);
		} else {
			terp.displayer.display
		}
	},
	"else": function(terp) {
		doBranch(terp, false, ["fi"]);
	},
	"fi": function(terp) {
		while ((tos = terp.stack.pop()) != "IF") {
			if (terp.stack.length === 0) {
				terp.displayer.display("ERROR", "Unexpected 'fi' found");
			}
		}
		TERP_VAR.actionStack.pop();
	},
	"while": function(terp) {
		conditionalLoop(terp, "WHILE");
	},
	"until": function(terp) {
		conditionalLoop(terp, "UNTIL");
	},
	"for": function(terp) { /* for foo in list ; do */
		var counter = terp.lexer.nextWord();
		if (terp.lexer.nextWord() != "in") {
			terp.displayer.display("ERROR", "Invalid 'for var in list' syntax");
		}
		var iterateList = iterate(terp);
		var loopStartIndex = terp.lexer.currentIndex();
		var doStatements = getDoDoneStatements(terp);
		var loopEndIndex = terp.lexer.currentIndex();
		var childTerp = new Parser(terp.displayer, terp.keyWordDict);
		childTerp.initWithParentVar(terp.keyWordDict);
		TERP_VAR.actionStack.push(new Action(terp, "FOR", loopStartIndex, loopEndIndex));
		for (var k = 0; k < iterateList.length; k++) {
			childTerp.define(counter, iterateList[k]);
			childTerp.run(doStatements);
		}
		TERP_VAR.actionStack.pop();
	},
	"done": function(terp) {
		terp.displayer.display("ERROR", "Unexpected 'done' found");
	},
	"exit": function(terp) {
		terp.displayer.display("INFO", "Program exit now"); /* TODO: how to actually exit the shell? */
		throw "Exit";
	},
	"break": function(terp) {
		while ((tos = TERP_VAR.actionStack.pop()) && (tos.name != "FUNCTION")) {
			if (["WHILE", "FOR", "UNTIL"].indexOf(tos.name) > -1) { /* can't break or continue from inside a function */
				terp.break();
				return;
			}
		}
		terp.displayer.display("ERROR", "Invalid 'break'. No loop found");
	},
	"continue": function(terp) {
		while ((tos = TERP_VAR.actionStack.pop()) && (tos.name != "FUNCTION")) {
			if (["WHILE", "FOR", "UNTIL"].indexOf(tos.name) > -1) {
				terp.continue();
				return;
			}
		}
		terp.displayer.display("ERROR", "Invalid 'continue'. No loop found");
	}
};
TERP_CONST["function_dict"] = {
	"function": function(terp) {
		var func_name = terp.lexer.nextWord();
		var countBrackets = 1;
		var bracket = terp.lexer.nextWord();
		var funcStartIndex = terp.lexer.currentIndex() + "{".length;
		while (true) {
			var word = terp.lexer.nextWord();
			if (word === null) {
				terp.displayer.display("ERROR", "Unexpected end of input");
			}
			if (word === "}") {
				countBrackets--;
				if (countBrackets === 0) {
					var finished = true;
					break;
				}
			} else if (word === "{") {
				countBrackets++;
			}
		}
		var funcEndIndex = terp.lexer.currentIndex();
		var code = terp.lexer.getTokens(funcStartIndex, funcEndIndex);
		terp.define(func_name, function(terp) {
			var content = code; /* collect positional parameter */
			var parameters = [];
			while (true) {
				if (((next = terp.lexer.nextWord()) === "") || (next === ";") || (next === null)) {
					break;
				} else {
					parameters.push(next);
				}
			}
			var childTerp = new Parser(terp.displayer, terp.keyWordDict, func_name);
			childTerp.initWithParentVar(terp.variable);
			childTerp.setPositionalParam(parameters);
			TERP_VAR.actionStack.push(new Action(terp, "FUNCTION", funcStartIndex, funcEndIndex));
			childTerp.run(content); 
			/*  all variables are SHARED between the same ksh process!              
			If you change a variable name inside a function....              
			that variable's value will still be changed after you have left the function!  */
			terp.updateWithChildVar(childTerp.variable);
			TERP_VAR.actionStack.pop();
		});
	},
	"return": function(terp) {
		while ((tos = TERP_VAR.actionStack.pop()) && (tos.name != "FUNCTION")) {
			if (!isNaN(exitCode = terp.lexer.nextWord())) {
				tos.terp.setLatestExitCode(parseInt(exitCode));
			} else {
				tos.terp.setLatestExitCode(0);
			}
			terp.exit();
			return;
		}
		terp.displayer.display("ERROR", "Invalid 'return'. No function found");
	},
	"typeset": function(terp) {}
};
