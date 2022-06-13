
function Test(displayer) {
	var numTests = 0;
	var passTests = 0;
	var failTests = 0;
	pass = function(test_name) {
		displayer.display("TEST PASSED", test_name);
		numTests++;
		passTests++;
	};
	fail = function(test_name, expected, got) {
		displayer.display("TEST FAILED", test_name + " Expected: " + expected + "-got: " + got);
		numTests++;
		failTests++;
	};
	this.statistic = function() {
		displayer.display("OUTPUT", "Number of fail tests " + failTests + "/" + numTests);
	}
	this.cases = { /* need test case to catch exception hahaha */
		"test_equal_top_display_stack": function(test_name, terp, expected) {
			var testPass = true;
			var displayRes = displayer.toString();
			if (displayer.getLength() != expected.length) {
				displayer.resetStack();
				testPass = false;
			} else {
				for (var k = displayer.getLength() - 1; k > -1; k--) {
					if ((tos = displayer.getLatest()) != expected[k]) {
						testPass = false;
					}
				}
			}
			if (testPass === true) {
				pass(test_name);
			} else {
				fail(test_name, expected, displayRes);
			}
		},
		"test_equal_top_stack": function(test_name, terp, expected) {
			if (terp.stack.length >= 1 && typeof(expected) != "undefined" && expected === terp.stack.getTop()) {
				pass(test_name);
			} else {
				fail(test_name, expected, terp.stack.getTop());
			}
		}
	};
}