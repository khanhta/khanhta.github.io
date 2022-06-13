function FileManager() {
	this.readFile = function(file, callback, opt_startByte, opt_stopByte) {
		var startByte = parseInt(opt_startByte) || 0;
		var stopByte = parseInt(opt_stopByte) || file.size - 1;
		var reader = new FileReader();
		reader.onloadend = function(evt) {
			if (evt.target.readyState === FileReader.DONE) { /* DONE === 2 */
				if (callback && typeof(callback) === "function") {
					callback(evt.target.result);
				}
			}
		};
		var blob = file.slice(startByte, stopByte + 1);
		reader.readAsBinaryString(blob);
	}
}