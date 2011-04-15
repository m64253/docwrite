(function(win){
	var doc = win.document,
		isReady = false,
		listeners = [];
	
	function ready() {
		var fns = listeners.concat(), 
			len = fns.length,
			i;
		
		listeners = [];
		
		if (isReady === false) {
			if (doc.removeEventListener) {
				win.removeEventListener('load', ready, false );
			} else if (doc.detachEvent) {
				win.detachEvent("onload", ready);
			}
			isReady = true;
		}
		
		for (i=0; i < len; i++) {
			fns[i]();
		}
	}
	
	function preReady() {
		if (doc.removeEventListener) {
			doc.removeEventListener('DOMContentLoaded', preReady, false);
			ready();
		} else if (doc.detachEvent) {
			if (doc.readyState === 'complete') {
				doc.detachEvent('onreadystatechange', preReady);
				ready();
			}
		}
	}
	
	win.DOMReady = function DOMReady(fn) {
		if (isReady || doc.readyState === "complete") {
			setTimeout(ready, 0);
		} else if (doc.addEventListener) {
			doc.addEventListener('DOMContentLoaded', preReady, false );
			win.addEventListener('load', ready, false);
		} else if (doc.attachEvent) {
			doc.attachEvent('onreadystatechange', preReady);
			win.attachEvent('onload', ready);
		}
		listeners.push(fn);
	};
}(this));