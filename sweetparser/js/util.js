Function.prototype.method = function(name, func) {
	if (this.prototype[name]) {
		console.log("Can't augment " + typeof(this) + " with function" + name);
	} else {
		this.prototype[name] = func;
	}
	return this;
};
Array.method("getTop", function() {
	return this[this.length - 1];
});
String.method("regexEscape", function() {
	var regexSet = ["[", "]", "(", ")", "{", "}", "\\", "|"].join("");
	if ((matchedIndex = regexSet.indexOf(this)) > -1) {
		return this.replace(regexSet[matchedIndex], "\\" + regexSet[matchedIndex]);
	}
	return this;
});

