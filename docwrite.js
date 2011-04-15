(function(win){
	var doc = win.document,
		docWrite = doc.write, // TODO: Figure out when to give back the write function??
		buffer = [],
		dependencies = [],
		isLoaded = false,
		orphanText = false;
	
	function objectKeys(obj) {
		var key,
			keys = [];
		
		if (Object.keys) {
			keys = Object.keys(obj);
		} else {
			for (key in obj) {
				if (obj.hasOwnProperty(key)) {
					keys.push(key);
				}
			}
		}
		
		return keys;
	}
	
	function bindLoad(el, fn) {
		if (el.addEventListener) {
			el.addEventListener('load', fn, false);
		//} else if (el.attachEvent) {
		//	el.attachEvent('onload', fn);
		} else {
			el.onreadystatechange = function() {
				var state = el.readyState;
				if (state === 'loaded' || state === 'complete') {
					fn();
				}
			};
		}
	}
	
	function unbindLoad(el, fn) {
		if (el.removeEventListener) {
			el.removeEventListener('load', fn, false);
		//} else if (el.detachEvent) {
		//	el.detachEvent('onload', fn);
		} else {
			el.onreadystatechange = null;
		}
	}
	
	function createLoadableElement(tagName, fn, keepInDOM) {
		var el = doc.createElement(tagName),
			handler = function() {
				
				// Unbind event handlers
				unbindLoad(el, handler);
				
				// Remove from the DOM
				if (!keepInDOM) {
					el.parentNode.removeChild(el);
				}
				
				if (fn) {
					fn.apply(el, arguments);
				}
			};
			
		// Bind listen to the load event
		bindLoad(el, handler);
		
		return el;
	}
	
	function createWrapper(text) {
		var el = doc.createElement('div'),
			scripts,
			script,
			newScript,
			len,
			i;
		
		el.innerHTML = '<span>IE is dumb</span>' + text;
		
		scripts = el.getElementsByTagName('script');
		
		if (scripts.length !== 0) {
			for (i=0, len=scripts.length; i < len; i++) {
				script = scripts[i];
				
				newScript = createLoadableElement('script', function(){
					
					if (orphanText) {
						buffer.push({
							text: orphanText,
							el: newScript
						});
						orphanText = null;
					}
					
					processBuffer();
					
				}, true);
				newScript.src = script.src;
				
				script.parentNode.replaceChild(newScript, script);
			}
		}
		
		el.removeChild(el.getElementsByTagName('span')[0]);
		
		return el;
	}
	
	function processBuffer(){
		
		var item = buffer.shift(),
			wrapper;
		
		if (item) {
			wrapper = createWrapper(item.text);
			
			item.el.parentNode.replaceChild(wrapper, item.el);
		}
		
		if (buffer.length !== 0) {
			setTimeout(processBuffer, 0);
		}
	}
	
	
	
	function counter(max, fn) {
		var i = 0;
		return function counting() {
			i++;
			if (i === max) {
				fn();
			}
		};
	}
	
	function processDependencies() {
		var deps = dependencies.concat(),
			len = deps.length,
			i,
			whenAllIsSadAndDone = counter(len, processBuffer);
		
		for (i=0; i < len; i++) {
			load(deps[i], whenAllIsSadAndDone);
		}
	}
	
	function proxyDocWrite(text) {
		
		var scripts,
			el,
			obj,
			len = buffer.length,
			i;
		
		if (isLoaded) {
			orphanText = (orphanText || '') + text;
		} else {
			scripts = doc.getElementsByTagName('script'),
			el = scripts[scripts.length - 1];
			
			for (i=0; i < len; i++) {
				if (buffer[i].el === el) {
					obj = buffer[i];
					obj.text += text;
					break;
				}
			}
			
			if (obj) {
				buffer[i] = obj;
			} else {
				buffer.push({
					text: text,
					el: el
				});
			}
		}
	};
	proxyDocWrite.dependency = proxyDocWrite.dep = proxyDocWrite.require = function dependency(deps, fn) {
		var args = Array.prototype.slice.call(arguments);
		dependencies.push({
			deps: deps,
			fn: fn
		});
	};
	
	doc.write = proxyDocWrite;
	
	if (win.addEventListener) {
		win.addEventListener('load', function onload(){
			isLoaded = true;
			processBuffer();
		}, false);
	} else if (win.attachEvent) {
		win.attachEvent('onload', function onload(){
			isLoaded = true;
			processBuffer();
		}, false);
	}
}(this));