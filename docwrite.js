(function(win){
	var doc = win.document,
		originalDocWrite = doc.write, // TODO: Figure out when to give back the write function??
		buffer = [],
		dependencies = [],
		isLoaded = false,
		orphanText = false;
	
	function logger() {
		if (!logger.el) {
			logger.el = doc.createElement('ul');
			logger.el.style.position = 'absolute';
			logger.el.style.top = '0';
			logger.el.style.left = '0';
			logger.el.style.width = '200px';
			logger.el.style.margin = '0';
			logger.el.style.fontFamily = 'monospace';
			logger.el.style.fontSize = '10px';
			doc.body.appendChild(logger.el);
		}
		
		var args = Array.prototype.slice.call(arguments),
			text,
			li,
			match = (args[1] || '').match(/(multi|echo).php\?t=dependency-text-([0-9])/);
		
		for (var i=0; i < args.length; i++) {
			args[i] = args[i].replace(/</g, '&lt;').replace(/>/g, '&gt;');
		}
		
		if (match) {
			args[0] += ' - ' + match[1] + ' ' + match[2];
		}
		
		text = args.join('<br />') + '<hr />';
		
		if (text.match('dependency')) {
			li = doc.createElement('li');
			li.style.paddingBottom = '5px';
			li.innerHTML = text;
			logger.el.appendChild(li);
		}
		
	}
	
	function counter(max, fn) {
		var i = 0;
		return function counting() {
			i++;
			if (i >= max) {
				fn();
			}
		};
	}
	
	function bindLoad(el, fn) {
		if (el.addEventListener) {
			el.addEventListener('load', fn, false);
		} else if (el.tagName !== 'SCRIPT' && el.attachEvent) {
			el.attachEvent('onload', fn);
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
		} else if (el.tagName !== 'SCRIPT' && el.detachEvent) {
			el.detachEvent('onload', fn);
		} else {
			el.onreadystatechange = null;
		}
	}
	
	// Create A DOM element and bind some load event listeners
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
	
	// Load file
	function loadFile(files, fn) {
		var len = files.length,
			i,
			doneFn = counter(len, fn);
		
		if (len === 0) {
			fn();
		} else {
			for (i=0; i < len; i++) {
				loadFile.js(files[i], doneFn);
			}
		}
	}
	loadFile.pre = function loadFilePre(data, fn) {
		var el = createLoadableElement('object', fn);
		
		el.data = data;
		el.type = "text/plain"; // Needed for IE
		el.width = 1; // Needed for IE
		el.height = 1; // Needed for IE
		
		// Styles
		el.style.visibility = "hidden";
		el.style.position = 'absolute';
		el.style.top = '-1000px';
		el.style.left = '-1000px';
		
		body.appendChild(el);
	};
	loadFile.js = function loadFileJS(src, fn) {
		var el = createLoadableElement('script', fn);
		el.src =  src;
		doc.body.appendChild(el);
	};
	loadFile.css = function loadFileCSS(href, fn) {
		loadFile.pre(href, function(){
			var el = doc.createElement('link');
			
			el.rel = 'stylesheet';
			el.type = 'text/css';
			el.href = href;
			
			doc.body.appendChild(el);
			
			fn.apply(el, arguments);
		});
	};
	
	// Create wrapping DOM element to innerHTML
	// the document.write content
	var pp = 0
	function createWrapper(text) {
		var el = doc.createElement('div'),
			scripts,
			script,
			newScript,
			len,
			i;
		
		// IE seems reluctant to create the DOM if text is just a script tag
		el.innerHTML = '<span>IE is the awesomest browser evar!</span>' + text;
				
		scripts = el.getElementsByTagName('script');
		
		for (i=0, len=scripts.length; i < len; i++) {
			script = scripts[i];
			
			newScript = createLoadableElement('script', function(el) {
				
				logger('LOADED', this.src);
				
				if (orphanText) {
					
					//logger('TEXT', orphanText);
					
					buffer.push({
						text: orphanText,
						el: this
					});
					orphanText = null;
					
					processBuffer();
				}
				
			}, true);
			newScript.defer = true;
			newScript.src = script.src;
			
			script.parentNode.replaceChild(newScript, script);
		}
		
		// Remove IE fix span
		el.removeChild(el.getElementsByTagName('span')[0]);
		
		return el;
	}
	
	// Process Buffer
	function processBuffer(){
		
		var	item = buffer.shift(),
			wrapper;
		
		if (item) {
			
			logger('PROCESS BUFFER', item.text);
			
			wrapper = createWrapper(item.text);
			item.el.parentNode.replaceChild(wrapper, item.el);
		}
		
		//if (buffer.length !== 0) {
			setTimeout(processBuffer, 0);
		//}
	}
		
	function processDependencies() {
		var deps = dependencies.concat(),
			dep,
			len = deps.length,
			i,
			doneFn;
		
		if (len === 0) {
			processBuffer();
		} else {
			doneFn = counter(len, function(){
				processBuffer();
			});
			
			for (i=0; i < len; i++) {
				dep = deps[i];
				loadFile(dep.files, (function(fn){
					return function() {
						fn();
						doneFn();
					};
				}(dep.fn)));
			}
		}
	}
	
	// So this is it?
	function docWrite(text) {
		
		var scripts,
			el,
			obj,
			len = buffer.length,
			i;
		
		if (isLoaded) {
			
			logger('WRITE', text)
			
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
	
	// Dear child has many names
	docWrite.dependency = docWrite.dep = docWrite.require = function dependency() {
		var args = Array.prototype.slice.call(arguments);
			fn = args.pop(),
			files = args.shift() || [];
		
		if (typeof(fn) !== 'function') {
			files = fn;
			fn = function(){};
		}
		
		dependencies.push({
			files: files,
			fn: fn
		});
	};
	
	// Overwrite the global document write
	doc.write = docWrite;
	
	// Bing a listener to window load event
	if (win.addEventListener) {
		win.addEventListener('load', function onload(){
			isLoaded = true;
			processDependencies();
		}, false);
	} else if (win.attachEvent) {
		win.attachEvent('onload', function onload(){
			isLoaded = true;
			processDependencies();
		}, false);
	}
}(this));