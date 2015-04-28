function ColorDict() {
	var brackets = ["[", "]", "(", ")", "{", "}", "\\"];
	var quotes = ["\"", "'", "`"];
	var keywords = ["done", "do", "if", "then", "else", "fi", "while", "for", "until", "export", "function", "print"];
	var meta = [";", "|", "&", ">", "<"];
	var colorDict = {};
	var inComment = false;
	var inQuote = [];
	for (var k = 0; k < brackets.length; k++) {
		colorDict[brackets[k]] = "yellow";
		brackets[k] = brackets[k].regexEscape();
	}
	for (var k = 0; k < quotes.length; k++) {
		colorDict[quotes[k]] = "gray";
	}
	for (var k = 0; k < keywords.length; k++) {
		colorDict[keywords[k]] = "blue";
		keywords[k] = "\b" + keywords[k] + "\b";
	}
	for (var k = 0; k < meta.length; k++) {
		colorDict[meta[k]] = "red";
		meta[k] = meta[k].regexEscape();
	}
	this.getFormattedText = function(token) {
		if (inComment === true) {
			if (token.indexOf("\n") > -1) {
				inComment = false;
			}
			return token.fontcolor("green");
		}
		if (token[0] === "$") {
			return token.fontcolor("orange");
		}
		if (inQuote.length != 0) {
			var q = inQuote.getTop();
			if (q === token) {
				inQuote.pop();
			}
			return token.fontcolor(colorDict[q]);
		}
		if ((index = quotes.indexOf(token)) > -1) {
			inQuote.push(quotes[index]);
		}
		if (token[0] === "#") {
			inComment = true;
			return token.fontcolor("green");
		}
		if (token in colorDict) {
			return token.fontcolor(colorDict[token]);
		}
		return token;
	};
	this.getRegexMatch = function() {
		var text = brackets.concat(quotes).concat(keywords).concat(meta);
		text.push("\\n");
		text.push(" +");
		text.push("[a-zA-Z0-9_/\.\\-=$#]+");
		text.push("[^a-zA-Z0-9_;/\\-=$#\n]+");
		return new RegExp("(" + text.join(")|(") + ")", "g");
	};
}

function Displayer(element) {
	var displayStack = [];
	
	var newOutput = function(text) {
		return "<p class=\"output\">" + text + "</p>";
	};
	var newError = function(text) {
		return "<p class=\"error\">" + text + "</p>";
	};
	
	this.reset = function(){
		element.html("");
	};
	this.display = function(type, text) {
		console.log(type + ": " + text);
		switch (type) {
			case "OUTPUT":
				displayStack.push(text);
				element.append(newOutput(text));
				break;
			case "ERROR":
				element.append(newError(text));
				break;
		}
	};
	this.getLatest = function() {
		return displayStack.pop();
	}
	this.getLength = function() {
		return displayStack.length;
	};
	this.toString = function() {
		return displayStack.join(",");
	};
	this.resetStack = function() {
		displayStack = [];
	};
}

function InputConsole(element, type) {
	var element = element;
	var type = type;
	this.setConsole = function(text) {
		switch (type) {
			case "commandFile":
				setCommandFile(text);
				break;
			case "directoryFile":
				setDirectoryFile(text);
				break;
			default:
				console.log("Wrong console type.");
				break;
		}
	};

	function formatCommand(text) {
		var regexMatch = TERP_VAR.colorDict.getRegexMatch();
		console.log(regexMatch);
		var tokens = text.match(regexMatch);
		var formatted = [];
		for (var k = 0; k < tokens.length; k++) {
			formatted.push(TERP_VAR.colorDict.getFormattedText(tokens[k]));
		}
		return formatted.join("").replace(/\n/g, "<br/>");
	}
	this.append = function(text) {
		element.append(formatCommand(text));
	};
			
	function setCommandFile(text) {
		TERP_VAR[type] = text;

		element.html(formatCommand(text));
	}

	function setDirectoryFile(text) {
		element.html(text);
		var directoryFileParser = new DirectoryFileParser(text);
		directoryFileParser.parse();
	};
}
